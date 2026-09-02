"""Resume parsing service per TRD Section 5.1. Extracts text from PDF/DOCX and structures via AI."""

import json
import logging
import re
import uuid
from typing import Dict, Tuple

from app.core.exceptions import ParsingError
from app.integrations.docx_parser import docx_parser
from app.integrations.groq_client import groq_client
from app.integrations.pdf_parser import pdf_parser
from app.models.resume import Resume, ResumeSource, ResumeMeta, PersonalDetails
from app.models.responses import ParsedResumeResult, SectionConfidence
from app.prompts.resume_structuring_prompt import (
    RESUME_STRUCTURING_SYSTEM_PROMPT,
    RESUME_STRUCTURING_USER_TEMPLATE,
)

logger = logging.getLogger(__name__)

ALLOWED_MIME_RESUME = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
MIME_SIGNATURES = {
    b"%PDF": "application/pdf",
    b"PK\x03\x04": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def detect_mime_by_signature(file_bytes: bytes) -> str | None:
    for sig, mime in MIME_SIGNATURES.items():
        if file_bytes[:len(sig)] == sig:
            return mime
    return None


class ResumeParserService:
    async def parse(self, file_bytes: bytes, filename: str, content_type: str) -> ParsedResumeResult:
        actual_mime = detect_mime_by_signature(file_bytes[:16])
        if actual_mime is None:
            if filename.lower().endswith(".pdf"):
                actual_mime = "application/pdf"
            elif filename.lower().endswith(".docx"):
                actual_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        if actual_mime not in ALLOWED_MIME_RESUME:
            raise ParsingError(f"Unsupported file type detected: {actual_mime}")

        try:
            raw_text = self._extract_text(file_bytes, actual_mime)
        except Exception as e:
            logger.error("text_extraction_failed", extra={"detail": str(e)[:200]})
            raise ParsingError("Failed to extract text from the uploaded file")

        if not raw_text.strip():
            raise ParsingError("No text content could be extracted from the file")

        try:
            structured = await self._structure_with_ai(raw_text)
        except Exception as e:
            logger.error("ai_structuring_failed", extra={"detail": str(e)[:200]})
            structured = self._fallback_structure(raw_text)

        structured.meta = ResumeMeta(source=ResumeSource.uploaded)

        confidence = self._compute_confidence(structured, raw_text)

        return ParsedResumeResult(resume=structured, section_confidence=confidence)

    def _extract_text(self, file_bytes: bytes, mime_type: str) -> str:
        if mime_type == "application/pdf":
            return pdf_parser.extract_text(file_bytes)
        else:
            return docx_parser.extract_text(file_bytes)

    async def _structure_with_ai(self, raw_text: str) -> Resume:
        user_prompt = RESUME_STRUCTURING_USER_TEMPLATE.format(resume_text=raw_text[:15000])
        response = await groq_client.chat_completion(
            system_prompt=RESUME_STRUCTURING_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        parsed = self._parse_ai_response(response)
        if parsed is None:
            raise ParsingError("AI structuring returned invalid data")
        return parsed

    def _parse_ai_response(self, response: str) -> Resume | None:
        try:
            data = json.loads(response)
            section_confidence = data.pop("section_confidence", None)
            resume = Resume(**data)
            return resume
        except Exception as e:
            logger.warning("ai_response_parse_failed", extra={"detail": str(e)[:200]})
            return None

    def _fallback_structure(self, raw_text: str) -> Resume:
        lines = raw_text.split("\n")
        name = lines[0].strip() if lines else "Unknown"
        return Resume(
            personal_details=PersonalDetails(full_name=name[:120]),
            professional_summary=raw_text[:800] if len(raw_text) > 50 else None,
            meta=ResumeMeta(source=ResumeSource.uploaded),
        )

    def _compute_confidence(self, resume: Resume, raw_text: str) -> Dict[str, SectionConfidence]:
        confidence: Dict[str, SectionConfidence] = {}
        pd = resume.personal_details
        if pd and pd.full_name and len(pd.full_name) > 1:
            confidence["personal_details"] = SectionConfidence.high
        elif pd and pd.full_name:
            confidence["personal_details"] = SectionConfidence.needs_review
        else:
            confidence["personal_details"] = SectionConfidence.not_found

        confidence["professional_summary"] = (
            SectionConfidence.high if resume.professional_summary
            else SectionConfidence.not_found
        )
        confidence["experience"] = (
            SectionConfidence.high if resume.experience and len(resume.experience) > 0
            else SectionConfidence.not_found
        )
        confidence["education"] = (
            SectionConfidence.high if resume.education and len(resume.education) > 0
            else SectionConfidence.not_found
        )
        confidence["projects"] = (
            SectionConfidence.high if resume.projects and len(resume.projects) > 0
            else SectionConfidence.not_found
        )
        confidence["skills"] = (
            SectionConfidence.high if resume.skills and len(resume.skills) > 0
            else SectionConfidence.not_found
        )
        confidence["certifications"] = (
            SectionConfidence.high if resume.certifications and len(resume.certifications) > 0
            else SectionConfidence.not_found
        )
        confidence["achievements"] = (
            SectionConfidence.high if resume.achievements and len(resume.achievements) > 0
            else SectionConfidence.not_found
        )
        confidence["references"] = (
            SectionConfidence.needs_review if resume.references
            else SectionConfidence.not_found
        )
        return confidence


resume_parser_service = ResumeParserService()
