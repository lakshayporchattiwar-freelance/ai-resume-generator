"""AI generation API routes per TRD Section 9 and Data Schema Document Section 6."""

import logging

from fastapi import APIRouter

from app.models.analysis import AIGenerationRequest, AIGenerationResult
from app.services.ai_orchestration_service import ai_orchestration_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/ai/generate", response_model=AIGenerationResult)
async def ai_generate(request: AIGenerationRequest):
    result = await ai_orchestration_service.generate(request)
    logger.info("ai_generated", extra={"detail": f"action={request.action_type}, validated={result.guardrail_validated}"})
    return result
