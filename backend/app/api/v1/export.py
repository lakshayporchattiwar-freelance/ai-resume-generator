"""Export API routes per TRD Section 9 and Data Schema Document Section 6."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.models.resume import Resume
from app.services.export_service import export_service

logger = logging.getLogger(__name__)

router = APIRouter()


class ExportRequest(BaseModel):
    resume: Resume
    template_id: str = "modern"


def _validate_export(resume: Resume) -> None:
    if not resume.personal_details.full_name or not resume.personal_details.full_name.strip():
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": "Full name is required for export", "details": {"missing": ["personal_details.full_name"]}}},
        )
    has_content = (
        (resume.experience and len(resume.experience) > 0)
        or (resume.education and len(resume.education) > 0)
        or (resume.projects and len(resume.projects) > 0)
    )
    if not has_content:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": "At least one of experience, education, or projects is required", "details": {"missing": ["experience/education/projects"]}}},
        )


@router.post("/export/pdf")
async def export_pdf(request: ExportRequest):
    _validate_export(request.resume)
    try:
        pdf_bytes = export_service.generate_pdf(request.resume, request.template_id)
        filename = export_service.get_filename(request.resume, "pdf")
        logger.info("pdf_exported", extra={"detail": f"filename={filename}, size={len(pdf_bytes)}"})
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.error("pdf_export_error", extra={"detail": str(e)[:200]})
        raise HTTPException(status_code=500, detail={"error": {"code": "EXPORT_ERROR", "message": "Failed to generate PDF"}})


@router.post("/export/docx")
async def export_docx(request: ExportRequest):
    _validate_export(request.resume)
    try:
        docx_bytes = export_service.generate_docx(request.resume, request.template_id)
        filename = export_service.get_filename(request.resume, "docx")
        logger.info("docx_exported", extra={"detail": f"filename={filename}, size={len(docx_bytes)}"})
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.error("docx_export_error", extra={"detail": str(e)[:200]})
        raise HTTPException(status_code=500, detail={"error": {"code": "EXPORT_ERROR", "message": "Failed to generate DOCX"}})
