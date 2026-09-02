"""Supabase client integration for persistent data storage with user auth."""

import logging
from typing import Any, Dict, List, Optional

from supabase import create_client, Client

from app.core.config import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            logger.warning("supabase_not_configured")
            raise RuntimeError("Supabase URL and Key must be configured")
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client


class SupabaseService:
    def save_resume(self, user_id: str, resume_data: Dict[str, Any]) -> str:
        sb = get_supabase()
        row = {
            "user_id": user_id,
            "personal_details": resume_data.get("personal_details", {}),
            "professional_summary": resume_data.get("professional_summary"),
            "experience": resume_data.get("experience", []),
            "education": resume_data.get("education", []),
            "projects": resume_data.get("projects", []),
            "skills": resume_data.get("skills", []),
            "certifications": resume_data.get("certifications", []),
            "achievements": resume_data.get("achievements", []),
            "references_data": resume_data.get("references"),
            "meta": resume_data.get("meta", {}),
            "source": resume_data.get("meta", {}).get("source", "created"),
        }
        result = sb.table("resumes").insert(row).execute()
        return result.data[0]["id"]

    def update_resume(self, resume_id: str, resume_data: Dict[str, Any]) -> None:
        sb = get_supabase()
        row = {
            "personal_details": resume_data.get("personal_details", {}),
            "professional_summary": resume_data.get("professional_summary"),
            "experience": resume_data.get("experience", []),
            "education": resume_data.get("education", []),
            "projects": resume_data.get("projects", []),
            "skills": resume_data.get("skills", []),
            "certifications": resume_data.get("certifications", []),
            "achievements": resume_data.get("achievements", []),
            "references_data": resume_data.get("references"),
            "meta": resume_data.get("meta", {}),
            "source": resume_data.get("meta", {}).get("source", "created"),
            "updated_at": "now()",
        }
        sb.table("resumes").update(row).eq("id", resume_id).execute()

    def get_resume(self, resume_id: str) -> Optional[Dict[str, Any]]:
        sb = get_supabase()
        result = sb.table("resumes").select("*").eq("id", resume_id).execute()
        if result.data:
            return result.data[0]
        return None

    def list_resumes_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        sb = get_supabase()
        result = sb.table("resumes").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
        return result.data

    def delete_resume(self, resume_id: str) -> None:
        sb = get_supabase()
        sb.table("resumes").delete().eq("id", resume_id).execute()

    def save_job_description(
        self, user_id: str, resume_id: str, jd_data: Dict[str, Any]
    ) -> str:
        sb = get_supabase()
        row = {
            "user_id": user_id,
            "resume_id": resume_id,
            "source_type": jd_data.get("source_type", "pasted_text"),
            "raw_text": jd_data.get("raw_text"),
            "job_title": jd_data.get("job_title"),
            "company_name": jd_data.get("company_name"),
            "analysis": jd_data.get("analysis"),
        }
        result = sb.table("job_descriptions").insert(row).execute()
        return result.data[0]["id"]

    def get_job_description(self, jd_id: str) -> Optional[Dict[str, Any]]:
        sb = get_supabase()
        result = sb.table("job_descriptions").select("*").eq("id", jd_id).execute()
        if result.data:
            return result.data[0]
        return None

    def list_job_descriptions_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        sb = get_supabase()
        result = sb.table("job_descriptions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data

    def save_ats_score(self, user_id: str, resume_id: str, jd_id: str, score_data: Dict[str, Any]) -> str:
        sb = get_supabase()
        row = {
            "user_id": user_id,
            "resume_id": resume_id,
            "job_description_id": jd_id,
            "overall_score": score_data.get("overall_score", 0),
            "sub_scores": score_data.get("sub_scores", {}),
            "matched_keywords": score_data.get("matched_keywords", []),
            "missing_required_keywords": score_data.get("missing_required_keywords", []),
            "missing_preferred_keywords": score_data.get("missing_preferred_keywords", []),
            "recommendations": score_data.get("recommendations", []),
            "resume_snapshot_hash": score_data.get("resume_snapshot_hash", ""),
        }
        result = sb.table("ats_scores").insert(row).execute()
        return result.data[0]["id"]

    def get_latest_ats_score(self, resume_id: str) -> Optional[Dict[str, Any]]:
        sb = get_supabase()
        result = sb.table("ats_scores").select("*").eq("resume_id", resume_id).order("computed_at", desc=True).limit(1).execute()
        if result.data:
            return result.data[0]
        return None

    def log_ai_generation(self, user_id: str, action_type: str, guardrail_validated: bool) -> None:
        sb = get_supabase()
        sb.table("ai_generation_logs").insert({
            "user_id": user_id,
            "action_type": action_type,
            "guardrail_validated": guardrail_validated,
        }).execute()


supabase_service = SupabaseService()
