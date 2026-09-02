"""Job description API routes per TRD Section 9 and Data Schema Document Section 6."""

import logging
import os
import tempfile
import uuid

from fastapi import APIRouter, File, Form, UploadFile, UploadFile
from typing import Optional

from app.core.config import settings
from app.core.exceptions import FileTooLargeError, UnsupportedFileTypeError, ParsingError
from app.models.job_description import JobDescriptionAnalysis, JobDescriptionInput, JDSourceType
from app.services.job_description_service import job_description_service

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_JD_EXTENSIONS = {".pdf", ".docx", ".txt"}


@router.post("/job-description/analyze", response_model=JobDescriptionAnalysis)
async def analyze_job_description(
    text: Optional[str] = Form(None),
    job_title: Optional[str] = Form(None),
    company_name: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    if file:
        ext = os.path.splitext((file.filename or "").lower())[1]
        if ext not in ALLOWED_JD_EXTENSIONS:
            raise UnsupportedFileTypeError("PDF, DOCX, or TXT")

        contents = await file.read()
        if len(contents) > settings.max_upload_size_bytes:
            raise FileTooLargeError(settings.MAX_UPLOAD_SIZE_MB)

        jd_input = JobDescriptionInput(
            source_type=JDSourceType.uploaded_file,
            job_title=job_title,
            company_name=company_name,
        )

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext, prefix=f"jd_{uuid.uuid4().hex[:8]}_") as tmp:
                tmp.write(contents)
                tmp_path = tmp.name
            result = await job_description_service.analyze(jd_input, contents, file.filename)
            logger.info("jd_analyzed_upload", extra={"detail": f"filename={file.filename}, size={len(contents)}"})
            return result
        except (FileTooLargeError, UnsupportedFileTypeError, ParsingError):
            raise
        except Exception as e:
            logger.error("jd_analysis_error", extra={"detail": str(e)[:200]})
            raise
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

    elif text and text.strip():
        jd_input = JobDescriptionInput(
            source_type=JDSourceType.pasted_text,
            raw_text=text[:20000],
            job_title=job_title,
            company_name=company_name,
        )
        result = await job_description_service.analyze(jd_input)
        logger.info("jd_analyzed_text", extra={"detail": f"text_len={len(text)}"})
        return result
    else:
        from app.core.exceptions import ValidationError
        raise ValidationError("Either text or file must be provided")
