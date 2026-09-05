"""PDF parser integration using PyMuPDF per TRD Section 5."""

import logging
from typing import Optional

import fitz

logger = logging.getLogger(__name__)


class PDFParser:
    def extract_text(self, file_bytes: bytes) -> str:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text_parts = []
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                page_text = page.get_text("text")
                if page_text.strip():
                    text_parts.append(page_text)

                if not page_text.strip():
                    try:
                        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
                        for block in blocks:
                            if block.get("type") == 0:
                                for line in block.get("lines", []):
                                    for span in line.get("spans", []):
                                        t = span.get("text", "").strip()
                                        if t:
                                            text_parts.append(t)
                    except Exception:
                        pass
            doc.close()
            full_text = "\n".join(text_parts)

            if not full_text.strip():
                logger.warning("pdf_no_text_extracted", extra={"detail": "PDF may be image-based/scanned"})

            logger.info("pdf_parsed", extra={"detail": f"Extracted {len(full_text)} chars"})
            return full_text
        except Exception as e:
            logger.error("pdf_parse_error", extra={"detail": str(e)[:200]})
            raise

    def validate_pdf(self, file_bytes: bytes) -> bool:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            is_valid = not doc.is_encrypted and len(doc) > 0
            doc.close()
            return is_valid
        except Exception:
            return False


pdf_parser = PDFParser()
