"""Pydantic models for the AI Analysis Schema per Data Schema Document Section 5."""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.job_description import JobDescriptionAnalysis


class ActionType(str, Enum):
    generate_summary = "generate_summary"
    rewrite_summary = "rewrite_summary"
    rewrite_experience_bullets = "rewrite_experience_bullets"
    rewrite_project_description = "rewrite_project_description"
    suggest_achievement_phrasing = "suggest_achievement_phrasing"


class RecommendationPriority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class RelatedSection(str, Enum):
    personal_details = "personal_details"
    professional_summary = "professional_summary"
    experience = "experience"
    education = "education"
    projects = "projects"
    skills = "skills"
    certifications = "certifications"
    achievements = "achievements"
    references = "references"


class SubScores(BaseModel):
    keyword_coverage: float = Field(..., ge=0, le=100)
    skills_alignment: float = Field(..., ge=0, le=100)
    experience_relevance: float = Field(..., ge=0, le=100)
    formatting_compatibility: float = Field(..., ge=0, le=100)


class Recommendation(BaseModel):
    priority: RecommendationPriority
    message: str = Field(..., max_length=300)
    related_section: Optional[RelatedSection] = None


class ATSScoreResult(BaseModel):
    overall_score: float = Field(..., ge=0, le=100)
    sub_scores: SubScores
    matched_keywords: List[str] = Field(default_factory=list)
    missing_required_keywords: List[str] = Field(default_factory=list)
    missing_preferred_keywords: List[str] = Field(default_factory=list)
    recommendations: List[Recommendation] = Field(default_factory=list)
    computed_at: str
    resume_snapshot_hash: str


class AIGenerationRequest(BaseModel):
    action_type: ActionType
    source_content: Optional[str] = None
    source_bullets: Optional[List[str]] = None
    job_description_analysis: Optional[JobDescriptionAnalysis] = None


class AIGenerationResult(BaseModel):
    generated_content: Optional[str] = None
    generated_bullets: Optional[List[str]] = None
    guardrail_validated: bool = True
    warning_message: Optional[str] = None
