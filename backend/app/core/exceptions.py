"""Centralized exception types and error envelope per TRD Section 17 and Security Document Section 18."""

from typing import Any, Dict, Optional


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class ValidationError(AppException):
    def __init__(self, message: str = "Validation error", details: Optional[Dict[str, Any]] = None):
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=400, details=details)


class FileTooLargeError(AppException):
    def __init__(self, max_size_mb: int):
        super().__init__(
            code="FILE_TOO_LARGE",
            message=f"File exceeds maximum size of {max_size_mb}MB",
            status_code=413,
        )


class UnsupportedFileTypeError(AppException):
    def __init__(self, allowed: str = "PDF, DOCX"):
        super().__init__(
            code="UNSUPPORTED_FILE_TYPE",
            message=f"Unsupported file type. Allowed: {allowed}",
            status_code=415,
        )


class AIProviderError(AppException):
    def __init__(self, message: str = "AI provider error"):
        super().__init__(code="AI_PROVIDER_ERROR", message=message, status_code=502)


class AITimeoutError(AppException):
    def __init__(self, message: str = "AI request timed out"):
        super().__init__(code="AI_TIMEOUT", message=message, status_code=504)


class GuardrailValidationError(AppException):
    def __init__(self, message: str = "AI output failed guardrail validation"):
        super().__init__(code="GUARDRAIL_VALIDATION_FAILED", message=message, status_code=502)


class ParsingError(AppException):
    def __init__(self, message: str = "Failed to parse resume"):
        super().__init__(code="PARSING_ERROR", message=message, status_code=422)


def error_envelope(code: str, message: str, details: Optional[Any] = None) -> Dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details}}
