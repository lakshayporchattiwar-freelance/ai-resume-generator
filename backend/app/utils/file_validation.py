"""File validation utilities per Security Document Section 3. MIME validation by file signature."""

import os
import logging
import time
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

MIME_SIGNATURES = {
    b"%PDF": "application/pdf",
    b"PK\x03\x04": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

ALLOWED_RESUME_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

ALLOWED_JD_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


def validate_file_signature(file_bytes: bytes, allowed_mimes: set) -> str | None:
    header = file_bytes[:16]
    for sig, mime in MIME_SIGNATURES.items():
        if header[:len(sig)] == sig:
            if mime in allowed_mimes:
                return mime
            return None
    if b"\n" in file_bytes[:500] or all(32 <= b < 127 or b in (9, 10, 13) for b in file_bytes[:500]):
        if "text/plain" in allowed_mimes:
            return "text/plain"
    return None


def validate_file_size(file_bytes: bytes) -> bool:
    return len(file_bytes) <= settings.max_upload_size_bytes


def generate_safe_filename(extension: str) -> str:
    import uuid
    return f"{uuid.uuid4().hex[:12]}_{int(time.time())}{extension}"


def cleanup_temp_files(max_age_minutes: int = None):
    age = max_age_minutes or settings.TEMP_FILE_CLEANUP_MINUTES
    temp_dir = Path(tempfile.gettempdir())
    now = time.time()
    cleaned = 0
    try:
        for f in temp_dir.glob("resume_*"):
            if f.is_file() and (now - f.stat().st_mtime) > age * 60:
                f.unlink(missing_ok=True)
                cleaned += 1
        for f in temp_dir.glob("jd_*"):
            if f.is_file() and (now - f.stat().st_mtime) > age * 60:
                f.unlink(missing_ok=True)
                cleaned += 1
    except Exception as e:
        logger.warning("temp_cleanup_error", extra={"detail": str(e)[:200]})
    if cleaned:
        logger.info("temp_cleanup", extra={"detail": f"cleaned={cleaned}"})


import tempfile
