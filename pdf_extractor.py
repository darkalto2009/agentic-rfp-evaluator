"""
pdf_extractor.py
-----------------
Document Tool: extracts clean text from an uploaded supplier RFP PDF.

Tries PyMuPDF (fitz) first (better layout handling), and transparently
falls back to `pypdf` if PyMuPDF is not installed in the environment.
Accepts either a filesystem path or an in-memory bytes/BytesIO object
(Streamlit's `st.file_uploader` returns the latter).
"""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Union

PathOrBytes = Union[str, Path, bytes, io.BytesIO]

try:
    import fitz  # PyMuPDF
    _BACKEND = "pymupdf"
except ImportError:  # pragma: no cover
    fitz = None
    _BACKEND = "pypdf"

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None


class PDFExtractionError(RuntimeError):
    """Raised when no usable text can be extracted from a PDF."""


def _to_stream(source: PathOrBytes) -> tuple[io.BytesIO, str]:
    """Normalize any accepted input into a BytesIO stream + a display name."""
    if isinstance(source, (str, Path)):
        p = Path(source)
        return io.BytesIO(p.read_bytes()), p.name
    if isinstance(source, io.BytesIO):
        source.seek(0)
        name = getattr(source, "name", "uploaded.pdf")
        return source, name
    if isinstance(source, bytes):
        return io.BytesIO(source), "uploaded.pdf"
    # Streamlit's UploadedFile behaves like a file-like object
    if hasattr(source, "read"):
        data = source.read()
        name = getattr(source, "name", "uploaded.pdf")
        return io.BytesIO(data), name
    raise TypeError(f"Unsupported PDF source type: {type(source)}")


def _extract_with_pymupdf(stream: io.BytesIO) -> str:
    doc = fitz.open(stream=stream.read(), filetype="pdf")
    try:
        pages = [page.get_text("text") for page in doc]
    finally:
        doc.close()
    return "\n\n".join(pages)


def _extract_with_pypdf(stream: io.BytesIO) -> str:
    if PdfReader is None:
        raise PDFExtractionError(
            "Neither PyMuPDF nor pypdf is installed. Install one of them "
            "(see requirements.txt) to enable PDF text extraction."
        )
    reader = PdfReader(stream)
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages)


def clean_text(raw_text: str) -> str:
    """Light normalization: collapse excess whitespace, drop empty lines."""
    text = raw_text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text_from_pdf(source: PathOrBytes) -> dict:
    """
    Extract and clean text from a supplier proposal PDF.

    Returns
    -------
    dict with keys:
        file_name : str
        backend   : "pymupdf" | "pypdf"
        char_count: int
        text      : str (cleaned, extracted text)
    """
    stream, name = _to_stream(source)

    backend_used = _BACKEND
    try:
        if _BACKEND == "pymupdf":
            raw = _extract_with_pymupdf(stream)
        else:
            raw = _extract_with_pypdf(stream)
    except Exception as primary_err:  # pragma: no cover - defensive fallback
        # If the preferred backend fails for any reason, try the other one.
        stream.seek(0)
        try:
            if backend_used == "pymupdf":
                raw = _extract_with_pypdf(stream)
                backend_used = "pypdf"
            else:
                raw = _extract_with_pymupdf(stream)
                backend_used = "pymupdf"
        except Exception:
            raise PDFExtractionError(
                f"Failed to extract text from '{name}': {primary_err}"
            ) from primary_err

    cleaned = clean_text(raw)
    if not cleaned:
        raise PDFExtractionError(f"No extractable text found in '{name}'. Is it a scanned/image PDF?")

    return {
        "file_name": name,
        "backend": backend_used,
        "char_count": len(cleaned),
        "text": cleaned,
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python pdf_extractor.py <path_to_pdf>")
        sys.exit(1)
    result = extract_text_from_pdf(sys.argv[1])
    print(f"[{result['backend']}] {result['file_name']} -> {result['char_count']} chars")
    print(result["text"][:800], "...")
