"""Resume API routes per TRD Section 9 and Data Schema Document Section 6."""

import logging
import os
import tempfile
import uuid

from fastapi import APIRouter, File, UploadFile

from app.core.config import settings
from app.core.exceptions import FileTooLargeError, UnsupportedFileTypeError, ParsingError
from app.models.resume import Resume
from app.models.responses import ParsedResumeResult, ResumeValidationResult
from app.services.resume_parser_service import resume_parser_service

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


@router.post("/resume/parse", response_model=ParsedResumeResult)
async def parse_resume(file: UploadFile = File(...)):
    if not file.filename:
        raise UnsupportedFileTypeError()

    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise UnsupportedFileTypeError()

    contents = await file.read()

    if len(contents) > settings.max_upload_size_bytes:
        raise FileTooLargeError(settings.MAX_UPLOAD_SIZE_MB)

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext, prefix=f"resume_{uuid.uuid4().hex[:8]}_") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        result = await resume_parser_service.parse(contents, file.filename, file.content_type or "")
        logger.info("resume_parsed", extra={"detail": f"filename={file.filename}, size={len(contents)}"})
        return result
    except (FileTooLargeError, UnsupportedFileTypeError, ParsingError):
        raise
    except Exception as e:
        logger.error("resume_parse_error", extra={"detail": str(e)[:200]})
        raise ParsingError("Failed to parse the uploaded resume")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@router.post("/resume/validate", response_model=ResumeValidationResult)
async def validate_resume(resume: Resume):
    missing = []
    if not resume.personal_details.full_name or not resume.personal_details.full_name.strip():
        missing.append("personal_details.full_name")

    has_content = (
        (resume.experience and len(resume.experience) > 0)
        or (resume.education and len(resume.education) > 0)
        or (resume.projects and len(resume.projects) > 0)
    )
    if not has_content:
        missing.append("At least one of: experience, education, or projects")

    return ResumeValidationResult(
        is_export_ready=len(missing) == 0,
        missing_required_fields=missing,
    )
