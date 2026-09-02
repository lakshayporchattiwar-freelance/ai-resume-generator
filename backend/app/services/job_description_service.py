"""Job description analysis service per TRD Section 5.1."""

import json
import logging
from typing import Optional

from app.core.exceptions import AIProviderError, ParsingError
from app.integrations.docx_parser import docx_parser
from app.integrations.groq_client import groq_client
from app.integrations.pdf_parser import pdf_parser
from app.models.job_description import (
    JobDescriptionAnalysis, JobDescriptionInput, JDSourceType,
    AnalysisConfidence, KeywordItem, KeywordImportance,
)
from app.prompts.job_description_prompt import (
    JD_ANALYSIS_SYSTEM_PROMPT,
    JD_ANALYSIS_USER_TEMPLATE,
)

logger = logging.getLogger(__name__)

ALLOWED_MIME_JD = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


class JobDescriptionAnalysisService:
    async def analyze(self, jd_input: JobDescriptionInput, file_bytes: Optional[bytes] = None, filename: Optional[str] = None) -> JobDescriptionAnalysis:
        raw_text = jd_input.raw_text

        if jd_input.source_type == JDSourceType.uploaded_file and file_bytes:
            raw_text = self._extract_text(file_bytes, filename or "")

        if not raw_text or not raw_text.strip():
            raise ParsingError("No job description text provided")

        if len(raw_text) > 20000:
            raw_text = raw_text[:20000]

        try:
            analysis = await self._analyze_with_ai(raw_text, jd_input.job_title)
        except Exception as e:
            logger.error("jd_analysis_failed", extra={"detail": str(e)[:200]})
            analysis = self._fallback_analysis(raw_text)

        return analysis

    def _extract_text(self, file_bytes: bytes, filename: str) -> str:
        lower = filename.lower()
        if lower.endswith(".pdf"):
            return pdf_parser.extract_text(file_bytes)
        elif lower.endswith(".docx"):
            return docx_parser.extract_text(file_bytes)
        elif lower.endswith(".txt"):
            return file_bytes.decode("utf-8", errors="replace")
        else:
            return file_bytes.decode("utf-8", errors="replace")

    async def _analyze_with_ai(self, raw_text: str, job_title: Optional[str]) -> JobDescriptionAnalysis:
        optional_title = f"Target job title: {job_title}" if job_title else ""
        user_prompt = JD_ANALYSIS_USER_TEMPLATE.format(
            job_description_text=raw_text,
            optional_job_title=optional_title,
        )
        response = await groq_client.chat_completion(
            system_prompt=JD_ANALYSIS_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        try:
            data = json.loads(response)
            return JobDescriptionAnalysis(**data)
        except Exception as e:
            logger.warning("jd_ai_parse_failed", extra={"detail": str(e)[:200]})
            raise AIProviderError("Failed to parse job description analysis result")

    def _fallback_analysis(self, raw_text: str) -> JobDescriptionAnalysis:
        words = raw_text.split()
        keywords = [KeywordItem(term=w.lower(), importance=KeywordImportance.required) for w in words[:20] if len(w) > 4]
        return JobDescriptionAnalysis(
            required_skills=[],
            preferred_skills=[],
            responsibilities=[raw_text[:300]] if raw_text else [],
            keywords=keywords[:10],
            analysis_confidence=AnalysisConfidence.low,
        )


job_description_service = JobDescriptionAnalysisService()
