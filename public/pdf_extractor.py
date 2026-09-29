"""
pdf_extractor.py: Document Tool for extracting clean text from uploaded supplier PDFs.
Tries PyMuPDF (fitz), pypdf, pdfplumber in order, and includes a fallback PDF stream reader.
"""

import os
import re
from typing import Dict, Any, Optional

def extract_metadata_from_text(full_text: str, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Extracts Supplier Name, Submission Date, and Experience Rating from PDF text
    when not explicitly provided by the user.
    """
    extracted_name = None
    extracted_date = None
    extracted_rating = None

    # 1. Extract Supplier Name
    # Matches "Supplier: <Name> | Date: ..." or "Supplier: <Name>" or "SUPPLIER RFP PROPOSAL: <Name>"
    m_name = re.search(r'(?:Supplier|Vendor|Company|Bidder)\s*[:\-–]\s*([^\n\r\|\,\;]+)', full_text, re.IGNORECASE)
    if m_name and m_name.group(1).strip():
        extracted_name = m_name.group(1).strip()
    else:
        m_title = re.search(r'SUPPLIER RFP PROPOSAL:\s*([^\n\r\|]+)', full_text, re.IGNORECASE)
        if m_title and m_title.group(1).strip():
            candidate = m_title.group(1).strip()
            # If title is like "APEX SYSTEMS PROCUREMENT PLATFORM PROPOSAL", take leading company name or whole title
            extracted_name = candidate.title()

    if not extracted_name and filename:
        clean_fn = os.path.splitext(os.path.basename(filename))[0]
        clean_fn = re.sub(r'[_\-]?RFP[_\-]?Proposal', '', clean_fn, flags=re.IGNORECASE)
        extracted_name = clean_fn.replace('_', ' ').replace('-', ' ').strip().title()

    if not extracted_name:
        extracted_name = "Unknown Supplier"

    # 2. Extract Submission Date (ISO YYYY-MM-DD)
    m_date = re.search(r'(?:Date|Submission Date|Submitted on)\s*[:\-–]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})', full_text, re.IGNORECASE)
    if m_date:
        extracted_date = m_date.group(1)
    else:
        m_iso = re.search(r'\b(20[2-3][0-9]-[0-1][0-9]-[0-3][0-9])\b', full_text)
        if m_iso:
            extracted_date = m_iso.group(1)
        else:
            extracted_date = "2026-03-01"

    # 3. Extract Experience Rating (0.0 to 5.0)
    m_exp = re.search(r'(?:Experience Rating|Experience|Rating)\s*[:\-–]?\s*([0-5](?:\.\d+)?)\s*(?:\/\s*5(?:\.0)?)?', full_text, re.IGNORECASE)
    if m_exp:
        try:
            val = float(m_exp.group(1))
            extracted_rating = round(min(max(1.0, val), 5.0), 1)
        except ValueError:
            extracted_rating = 4.0
    else:
        extracted_rating = 4.0

    return {
        "supplier_name": extracted_name,
        "submission_date": extracted_date,
        "experience_rating": extracted_rating
    }


def extract_text_from_pdf(file_path_or_bytes, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Extracts text and metadata from a PDF file path or file-like / byte object.
    
    Returns:
        dict: {
            "filename": str,
            "page_count": int,
            "full_text": str,
            "pages": list of str,
            "extraction_method": str,
            "extracted_metadata": dict (supplier_name, submission_date, experience_rating)
        }
    """
    fname = filename or (os.path.basename(file_path_or_bytes) if isinstance(file_path_or_bytes, str) else "uploaded_proposal.pdf")
    
    # Check if input is path or bytes
    pdf_bytes = None
    if isinstance(file_path_or_bytes, str):
        if not os.path.exists(file_path_or_bytes):
            raise FileNotFoundError(f"File not found: {file_path_or_bytes}")
        with open(file_path_or_bytes, "rb") as f:
            pdf_bytes = f.read()
    elif hasattr(file_path_or_bytes, "read"):
        pdf_bytes = file_path_or_bytes.read()
    elif isinstance(file_path_or_bytes, (bytes, bytearray)):
        pdf_bytes = bytes(file_path_or_bytes)
    else:
        raise ValueError("Unsupported input format for PDF extraction")

    extracted_result = None

    # Strategy 1: PyMuPDF (fitz)
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text("text").strip())
        doc.close()
        full_text = "\n\n".join([p for p in pages_text if p])
        cleaned = clean_extracted_text(full_text)
        meta = extract_metadata_from_text(cleaned, fname)
        return {
            "filename": fname,
            "page_count": len(pages_text),
            "full_text": cleaned,
            "pages": pages_text,
            "extraction_method": "PyMuPDF (fitz)",
            "extracted_metadata": meta
        }
    except ImportError:
        pass
    except Exception as e:
        print(f"[pdf_extractor] PyMuPDF failed: {e}. Falling back...")

    # Strategy 2: pypdf
    try:
        import pypdf
        import io
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for page in reader.pages:
            t = page.extract_text() or ""
            pages_text.append(t.strip())
        full_text = "\n\n".join([p for p in pages_text if p])
        cleaned = clean_extracted_text(full_text)
        meta = extract_metadata_from_text(cleaned, fname)
        return {
            "filename": fname,
            "page_count": len(pages_text),
            "full_text": cleaned,
            "pages": pages_text,
            "extraction_method": "pypdf",
            "extracted_metadata": meta
        }
    except ImportError:
        pass
    except Exception as e:
        print(f"[pdf_extractor] pypdf failed: {e}. Falling back...")

    # Strategy 3: Pure Python PDF Text Stream Extractor (Zero-dependency fallback)
    try:
        pages_text = extract_text_from_pdf_stream_fallback(pdf_bytes)
        full_text = "\n\n".join([p for p in pages_text if p])
        cleaned = clean_extracted_text(full_text)
        meta = extract_metadata_from_text(cleaned, fname)
        return {
            "filename": fname,
            "page_count": max(1, len(pages_text)),
            "full_text": cleaned,
            "pages": pages_text,
            "extraction_method": "native_stream_parser",
            "extracted_metadata": meta
        }
    except Exception as e:
        raise RuntimeError(f"All PDF extraction strategies failed for {fname}: {e}")


def extract_text_from_pdf_stream_fallback(pdf_bytes: bytes) -> list:
    """
    Lightweight zero-dependency extractor that decodes standard PDF streams
    and extracts text within BT ... ET blocks and parenthesized strings.
    """
    raw_text = pdf_bytes.decode('latin-1', errors='ignore')
    
    # Extract streams
    stream_pattern = re.compile(r'stream\r?\n(.*?)\r?\nendstream', re.DOTALL)
    matches = stream_pattern.findall(raw_text)
    
    extracted_pages = []
    
    for stream_content in matches:
        # Check if stream contains PDF text operators
        if 'BT' in stream_content and 'ET' in stream_content:
            # Extract parenthesized strings: (text) Tj or '
            # Handles escaped parentheses \( and \)
            text_tokens = []
            tokens = re.findall(r'\((.*?)(?<!\\)\)\s*(?:Tj|TJ|\'|\")', stream_content, re.DOTALL)
            for tok in tokens:
                # Unescape \( and \) and \\
                clean_tok = tok.replace('\\(', '(').replace('\\)', ')').replace('\\\\', '\\')
                if clean_tok.strip():
                    text_tokens.append(clean_tok.strip())
            if text_tokens:
                extracted_pages.append("\n".join(text_tokens))

    if not extracted_pages:
        # Fallback to general printable characters if standard streams weren't found
        cleaned = re.sub(r'[^\x20-\x7E\n\t]', ' ', raw_text)
        extracted_pages = [cleaned[:4000]]
        
    return extracted_pages


def clean_extracted_text(text: str) -> str:
    """Removes excessive whitespace and standardizes newlines."""
    # Normalize multiple line breaks to maximum two
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Normalize spaces
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()


if __name__ == "__main__":
    sample_file = "input/Apex_Systems_RFP_Proposal.pdf"
    if os.path.exists(sample_file):
        res = extract_text_from_pdf(sample_file)
        print(f"Extracted {len(res['full_text'])} chars using {res['extraction_method']}:")
        print(res["full_text"][:300] + "...")
