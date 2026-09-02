"""Structured, correlation-ID-based logging per TRD Section 18 and Security Document Section 17."""

import json
import logging
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")

SANITIZED_KEYS = {
    "full_name", "email", "phone", "location", "company_name",
    "institution_name", "certification_name", "raw_text",
    "professional_summary", "description_bullets", "statement",
    "contact_info", "name", "url",
}


def _sanitize_record(record: logging.LogRecord) -> dict:
    body = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": record.levelname,
        "logger": record.name,
        "message": record.getMessage(),
        "correlation_id": correlation_id_var.get(""),
    }
    if record.exc_info and record.exc_info[1]:
        body["exception_type"] = type(record.exc_info[1]).__name__
        exc_msg = str(record.exc_info[1])
        for key in SANITIZED_KEYS:
            if key in exc_msg:
                exc_msg = "[REDACTED]"
                break
        body["exception_message"] = exc_msg[:500]
    if hasattr(record, "detail"):
        body["detail"] = record.detail
    return body


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(_sanitize_record(record))


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    from app.core.config import settings
    root.setLevel(getattr(logging, settings.LOG_LEVEL, logging.INFO))


def new_correlation_id() -> str:
    cid = str(uuid.uuid4())
    correlation_id_var.set(cid)
    return cid
