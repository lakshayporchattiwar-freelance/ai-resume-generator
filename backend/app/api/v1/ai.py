"""AI generation API routes per TRD Section 9 and Data Schema Document Section 6."""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.exceptions import ValidationError
from app.models.analysis import AIGenerationRequest, AIGenerationResult
from app.services.ai_orchestration_service import ai_orchestration_service
from app.services.pattern_learning_service import pattern_learning_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/ai/generate", response_model=AIGenerationResult)
async def ai_generate(request: AIGenerationRequest):
    result = await ai_orchestration_service.generate(request)
    logger.info("ai_generated", extra={"detail": f"action={request.action_type}, validated={result.guardrail_validated}"})
    return result


@router.post("/ai/tailor-resume", response_model=AIGenerationResult)
async def ai_tailor_resume(request: AIGenerationRequest):
    if request.action_type != "tailor_resume":
        raise ValidationError("This endpoint only supports tailor_resume action type")
    result = await ai_orchestration_service.generate(request)
    logger.info("resume_tailored", extra={"detail": f"validated={result.guardrail_validated}"})
    return result


class TailoringInsightsRequest(BaseModel):
    target_skills: List[str] = []
    target_jd_keywords: List[str] = []


@router.get("/ai/learning-insights")
async def get_learning_insights():
    insights = pattern_learning_service.get_learning_context()
    pattern = pattern_learning_service.pattern
    return {
        "total_resumes_analyzed": pattern.total_resumes_analyzed,
        "learning_available": pattern.total_resumes_analyzed > 0,
        "insights": insights,
        "top_skills": dict(sorted(pattern.skill_frequency.items(), key=lambda x: x[1], reverse=True)[:20]),
        "top_action_verbs": dict(sorted(pattern.action_verbs.items(), key=lambda x: x[1], reverse=True)[:15]),
        "optimal_bullet_length": pattern.experience_bullet_avg_length,
        "optimal_summary_length": pattern.summary_avg_length,
    }


@router.post("/ai/tailoring-insights")
async def get_tailoring_insights(request: TailoringInsightsRequest):
    return pattern_learning_service.get_tailoring_insights(
        request.target_skills, request.target_jd_keywords
    )
