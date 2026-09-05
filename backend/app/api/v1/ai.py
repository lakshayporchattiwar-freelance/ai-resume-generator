"""AI generation API routes per TRD Section 9 and Data Schema Document Section 6."""

import json
import logging
from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.exceptions import ValidationError
from app.models.analysis import AIGenerationRequest, AIGenerationResult, FixItem
from app.models.job_description import JobDescriptionAnalysis
from app.models.resume import Resume
from app.services.ai_orchestration_service import ai_orchestration_service
from app.services.pattern_learning_service import pattern_learning_service
from app.services.scoring_service import scoring_service

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


class TransformResumeRequest(BaseModel):
    resume: Resume
    job_description_analysis: JobDescriptionAnalysis


@router.post("/ai/transform-resume")
async def ai_transform_resume(request: TransformResumeRequest):
    before_score = await scoring_service.score(request.resume, request.job_description_analysis)

    try:
        pattern_learning_service.learn_from_ats_score(before_score)
    except Exception:
        pass

    resume_dict = request.resume.dict()
    resume_json = json.dumps(resume_dict)

    ai_result = await ai_orchestration_service.generate(AIGenerationRequest(
        action_type="transform_resume",
        source_content=resume_json,
        job_description_analysis=request.job_description_analysis,
    ))

    if not ai_result.generated_content:
        return {
            "original_resume": resume_dict,
            "transformed_resume": None,
            "before_score": before_score.dict(),
            "after_score": None,
            "fixes": [],
            "score_improvement": 0.0,
            "adaptive_insights_used": pattern_learning_service.pattern.total_resumes_analyzed > 0,
            "error": ai_result.warning_message or "AI transformation failed",
        }

    transform_data = json.loads(ai_result.generated_content)
    transformed_resume_dict = transform_data.get("transformed_resume", {})
    fixes_raw = transform_data.get("fixes", [])

    fixes = []
    for f in fixes_raw:
        fixes.append(FixItem(
            section=f.get("section", ""),
            original=f.get("original", ""),
            fixed=f.get("fixed", ""),
            reason=f.get("reason", ""),
        ))

    after_score = None
    score_improvement = 0.0

    if transformed_resume_dict:
        try:
            transformed_resume = Resume(**transformed_resume_dict)
            after_score = await scoring_service.score(transformed_resume, request.job_description_analysis)
            score_improvement = round(after_score.overall_score - before_score.overall_score, 1)

            try:
                pattern_learning_service.learn_from_ats_score(after_score)
            except Exception:
                pass

            transformed_resume_dict = transformed_resume.dict()
        except Exception as e:
            logger.warning("transformed_resume_parse_failed", extra={"detail": str(e)[:200]})
            after_score = None

    return {
        "original_resume": resume_dict,
        "transformed_resume": transformed_resume_dict or None,
        "before_score": before_score.dict(),
        "after_score": after_score.dict() if after_score else None,
        "fixes": [f.dict() for f in fixes],
        "score_improvement": score_improvement,
        "adaptive_insights_used": pattern_learning_service.pattern.total_resumes_analyzed > 0,
    }


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
