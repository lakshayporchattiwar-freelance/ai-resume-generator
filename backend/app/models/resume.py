"""Pydantic models for the Resume Schema per Data Schema Document Section 3."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator


class ResumeSource(str, Enum):
    created = "created"
    uploaded = "uploaded"


class ReferencesMode(str, Enum):
    available_upon_request = "available_upon_request"


class LinkEntry(BaseModel):
    label: str = Field(..., max_length=40)
    url: str = Field(..., max_length=500)


class PersonalDetails(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    professional_title: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    location: Optional[str] = Field(None, max_length=150)
    links: Optional[List[LinkEntry]] = None


class ExperienceEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str = Field(..., max_length=150)
    job_title: str = Field(..., max_length=150)
    location: Optional[str] = Field(None, max_length=150)
    start_date: str = Field(..., max_length=10)
    end_date: str = Field(..., max_length=10)
    description_bullets: Optional[List[str]] = Field(None, max_length=20)
    order_index: int = 0

    @field_validator("description_bullets", mode="before")
    @classmethod
    def validate_bullet_length(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            return [b[:400] for b in v]
        return v


class EducationEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    institution_name: str = Field(..., max_length=150)
    degree: str = Field(..., max_length=150)
    start_date: Optional[str] = Field(None, max_length=10)
    end_date: Optional[str] = Field(None, max_length=10)
    details: Optional[str] = Field(None, max_length=300)
    order_index: int = 0


class ProjectEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_name: str = Field(..., max_length=150)
    link: Optional[str] = Field(None, max_length=500)
    timeframe: Optional[str] = Field(None, max_length=60)
    description_bullets: Optional[List[str]] = Field(None, max_length=20)
    order_index: int = 0

    @field_validator("description_bullets", mode="before")
    @classmethod
    def validate_bullet_length(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            return [b[:400] for b in v]
        return v


class SkillGroup(BaseModel):
    category_label: Optional[str] = Field(None, max_length=60)
    skills: List[str] = Field(..., min_length=1)

    @field_validator("skills", mode="before")
    @classmethod
    def validate_skill_length(cls, v: List[str]) -> List[str]:
        return [s[:60] for s in v]


class CertificationEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    certification_name: str = Field(..., max_length=150)
    issuing_organization: Optional[str] = Field(None, max_length=150)
    date_obtained: Optional[str] = Field(None, max_length=10)
    expiration_date: Optional[str] = Field(None, max_length=10)


class AchievementEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    statement: str = Field(..., max_length=300)
    order_index: int = 0


class ReferenceEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., max_length=120)
    relationship: Optional[str] = Field(None, max_length=100)
    contact_info: Optional[str] = Field(None, max_length=150)


class ResumeMeta(BaseModel):
    source: ResumeSource
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Resume(BaseModel):
    personal_details: PersonalDetails
    professional_summary: Optional[str] = Field(None, max_length=800)
    experience: Optional[List[ExperienceEntry]] = None
    education: Optional[List[EducationEntry]] = None
    projects: Optional[List[ProjectEntry]] = None
    skills: Optional[List[SkillGroup]] = None
    certifications: Optional[List[CertificationEntry]] = None
    achievements: Optional[List[AchievementEntry]] = None
    references: Optional[Union[List[ReferenceEntry], ReferencesMode]] = None
    meta: ResumeMeta
