"""Pydantic models for the Job Description Schema per Data Schema Document Section 4."""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class JDSourceType(str, Enum):
    pasted_text = "pasted_text"
    uploaded_file = "uploaded_file"


class KeywordImportance(str, Enum):
    required = "required"
    preferred = "preferred"


class AnalysisConfidence(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class KeywordItem(BaseModel):
    term: str = Field(..., max_length=80)
    importance: KeywordImportance
    source_context: Optional[str] = Field(None, max_length=200)


class JobDescriptionInput(BaseModel):
    source_type: JDSourceType
    raw_text: Optional[str] = Field(None, max_length=20000)
    job_title: Optional[str] = Field(None, max_length=150)
    company_name: Optional[str] = Field(None, max_length=150)


class JobDescriptionAnalysis(BaseModel):
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    keywords: List[KeywordItem] = Field(default_factory=list)
    analysis_confidence: AnalysisConfidence = AnalysisConfidence.medium
