"""Analysis API routes per TRD Section 9 and Data Schema Document Section 6."""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.models.analysis import ATSScoreResult, AIGenerationRequest, AIGenerationResult
from app.models.job_description import JobDescriptionAnalysis
from app.models.resume import Resume
from app.services.scoring_service import scoring_service
from app.services.pattern_learning_service import pattern_learning_service

logger = logging.getLogger(__name__)

router = APIRouter()


class ScoreRequest(BaseModel):
    resume: Resume
    job_description_analysis: JobDescriptionAnalysis


@router.post("/analysis/score", response_model=ATSScoreResult)
async def score_resume(request: ScoreRequest):
    result = await scoring_service.score(request.resume, request.job_description_analysis)

    try:
        pattern_learning_service.learn_from_ats_score(result)
    except Exception as e:
        logger.warning("ats_pattern_learning_failed", extra={"detail": str(e)[:100]})

    logger.info("ats_score_computed", extra={"detail": f"score={result.overall_score}"})
    return result
