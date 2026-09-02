"""Response models per Data Schema Document Section 7."""

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, RootModel

from app.models.analysis import ATSScoreResult, AIGenerationResult
from app.models.job_description import JobDescriptionAnalysis
from app.models.resume import Resume


class SectionConfidence(str, Enum):
    high = "high"
    needs_review = "needs_review"
    not_found = "not_found"


class ParsedResumeResult(BaseModel):
    resume: Resume
    section_confidence: Dict[str, SectionConfidence]


class ResumeValidationResult(BaseModel):
    is_export_ready: bool
    missing_required_fields: List[str]


class JobDescriptionAnalysisResponse(RootModel[JobDescriptionAnalysis]):
    pass


class AIGenerationResponse(RootModel[AIGenerationResult]):
    pass


class ATSScoreResponse(RootModel[ATSScoreResult]):
    pass
