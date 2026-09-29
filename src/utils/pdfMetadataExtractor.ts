/**
 * pdfMetadataExtractor.ts
 * Extracts Supplier Name, Submission Date, and Experience Rating from PDF/text document content
 * when not explicitly provided by the user.
 */

export interface ExtractedSupplierMeta {
  supplier_name: string;
  submission_date: string;
  experience_rating: number;
  extractedFromText: boolean;
}

export function extractSupplierMetadata(text: string, filename?: string): ExtractedSupplierMeta {
  let name = '';
  let date = '';
  let experience = 4.0;
  let foundInText = false;

  if (text && text.trim().length > 0) {
    // 1. Supplier Name Regex
    const nameMatch = text.match(/(?:Supplier|Vendor|Company|Bidder)\s*[:\-–]\s*([^\n\r\|\,\;]+)/i);
    if (nameMatch && nameMatch[1].trim()) {
      name = nameMatch[1].trim();
      foundInText = true;
    } else {
      const titleMatch = text.match(/SUPPLIER\s+RFP\s+PROPOSAL:\s*([^\n\r\|]+)/i);
      if (titleMatch && titleMatch[1].trim()) {
        const rawTitle = titleMatch[1].trim();
        // If like "APEX SYSTEMS PROCUREMENT PLATFORM PROPOSAL", take company name if formatted
        name = rawTitle.replace(/\s+(?:Procurement|Platform|Enterprise|Proposal|Modernization).*/i, '').trim();
        if (!name) name = rawTitle;
        foundInText = true;
      }
    }

    // 2. Submission Date Regex (ISO YYYY-MM-DD or formatted)
    const dateMatch = text.match(/(?:Date|Submission Date|Submitted on)\s*[:\-–]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    if (dateMatch) {
      date = dateMatch[1];
      foundInText = true;
    } else {
      const anyIsoMatch = text.match(/\b(20[2-3][0-9]-[0-1][0-9]-[0-3][0-9])\b/);
      if (anyIsoMatch) {
        date = anyIsoMatch[1];
        foundInText = true;
      }
    }

    // 3. Historical Experience Rating Regex (0.0 to 5.0)
    const expMatch = text.match(/(?:Experience Rating|Experience|Rating)\s*[:\-–]?\s*([0-5](?:\.\d+)?)\s*(?:\/\s*5(?:\.0)?)?/i);
    if (expMatch) {
      const parsed = parseFloat(expMatch[1]);
      if (!isNaN(parsed) && parsed >= 1.0 && parsed <= 5.0) {
        experience = Math.round(parsed * 10) / 10;
        foundInText = true;
      }
    }
  }

  // Fallback to filename if name not found in text
  if (!name && filename) {
    name = filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_\-]?RFP[_\-]?Proposal/i, '')
      .replace(/[_\-]/g, ' ')
      .trim();
  }

  if (!name) {
    name = 'Unknown Supplier';
  }

  if (!date) {
    date = '2026-03-01';
  }

  return {
    supplier_name: name,
    submission_date: date,
    experience_rating: experience,
    extractedFromText: foundInText
  };
}
