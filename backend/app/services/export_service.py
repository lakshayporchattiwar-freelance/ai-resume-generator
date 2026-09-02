"""Export service per TRD Section 5.1. Generates PDF and DOCX from structured resume."""

import logging

from app.integrations.docx_generator import docx_generator
from app.integrations.pdf_generator import pdf_generator
from app.models.resume import Resume

logger = logging.getLogger(__name__)


class ExportService:
    def generate_pdf(self, resume: Resume, template_id: str = "modern") -> bytes:
        return pdf_generator.generate(resume, template_id)

    def generate_docx(self, resume: Resume, template_id: str = "modern") -> bytes:
        return docx_generator.generate(resume, template_id)

    def get_filename(self, resume: Resume, extension: str) -> str:
        name = resume.personal_details.full_name.strip()
        safe_name = "".join(c if c.isalnum() or c in " -_" else "" for c in name)
        safe_name = safe_name.replace(" ", "_")[:50]
        return f"{safe_name}_Resume.{extension}"


export_service = ExportService()
