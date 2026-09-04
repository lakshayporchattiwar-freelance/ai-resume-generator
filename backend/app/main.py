"""FastAPI application entry point per TRD Section 7."""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1 import resume, job_description, analysis, ai, export
from app.core.config import settings
from app.core.exceptions import AppException, error_envelope
from app.core.logging import new_correlation_id, setup_logging

logger = logging.getLogger(__name__)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        new_correlation_id()
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = request.state.correlation_id if hasattr(request.state, "correlation_id") else ""
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("application_startup", extra={"detail": "AI Resume Generator backend started"})
    yield
    logger.info("application_shutdown", extra={"detail": "AI Resume Generator backend shutting down"})


app = FastAPI(
    title="AI Resume Generator & ATS Optimizer",
    version="1.0.0",
    description="Backend API for AI Resume Generator & ATS Resume Optimizer",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(CorrelationIdMiddleware)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_envelope(exc.code, exc.message, exc.details),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    detail = {"fields": [f"{'.'.join(str(l) for l in e['loc'])}: {e['msg']}" for e in errors]}
    return JSONResponse(
        status_code=422,
        content=error_envelope("VALIDATION_ERROR", "Request validation failed", detail),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", extra={"detail": str(exc)[:200]})
    return JSONResponse(
        status_code=500,
        content=error_envelope("INTERNAL_ERROR", "An unexpected error occurred"),
    )


app.include_router(resume.router, prefix="/api/v1", tags=["resume"])
app.include_router(job_description.router, prefix="/api/v1", tags=["job-description"])
app.include_router(analysis.router, prefix="/api/v1", tags=["analysis"])
app.include_router(ai.router, prefix="/api/v1", tags=["ai"])
app.include_router(export.router, prefix="/api/v1", tags=["export"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ai-resume-generator",
        "version": "1.0.0",
    }


@app.get("/ping")
@app.head("/ping")
async def ping():
    return "pong"
