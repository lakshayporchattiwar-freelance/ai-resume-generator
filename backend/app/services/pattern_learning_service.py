"""Adaptive Pattern Learning Service - learns resume patterns and improves AI output over time.

Stores patterns from parsed resumes (structure, phrasing, skill distributions, formatting)
and uses them to enhance AI generation with real-world resume insights.

Uses Supabase for persistent storage when available, falls back to local JSON file.
"""

import hashlib
import json
import logging
import os
import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.integrations.groq_client import groq_client
from app.models.resume import Resume

logger = logging.getLogger(__name__)

PATTERN_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "learned_patterns.json")

SUPABASE_TABLE = "ai_learning_patterns"


class ResumePattern:
    def __init__(self):
        self.total_resumes_analyzed: int = 0
        self.skill_frequency: Dict[str, int] = {}
        self.bullet_point_patterns: List[str] = []
        self.summary_patterns: List[str] = []
        self.section_order_frequency: Dict[str, int] = {}
        self.experience_bullet_avg_length: float = 0.0
        self.summary_avg_length: float = 0.0
        self.action_verbs: Dict[str, int] = {}
        self.industry_keywords: Dict[str, int] = {}
        self.common_jd_skills: Dict[str, int] = {}
        self.ats_score_patterns: Dict[str, Any] = {}
        self.last_updated: str = ""

    def to_dict(self) -> dict:
        return {
            "total_resumes_analyzed": self.total_resumes_analyzed,
            "skill_frequency": self.skill_frequency,
            "bullet_point_patterns": self.bullet_point_patterns[-500:],
            "summary_patterns": self.summary_patterns[-200:],
            "section_order_frequency": self.section_order_frequency,
            "experience_bullet_avg_length": self.experience_bullet_avg_length,
            "summary_avg_length": self.summary_avg_length,
            "action_verbs": self.action_verbs,
            "industry_keywords": self.industry_keywords,
            "common_jd_skills": self.common_jd_skills,
            "ats_score_patterns": self.ats_score_patterns,
            "last_updated": self.last_updated,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ResumePattern":
        p = cls()
        p.total_resumes_analyzed = data.get("total_resumes_analyzed", 0)
        p.skill_frequency = data.get("skill_frequency", {})
        p.bullet_point_patterns = data.get("bullet_point_patterns", [])[:500]
        p.summary_patterns = data.get("summary_patterns", [])[:200]
        p.section_order_frequency = data.get("section_order_frequency", {})
        p.experience_bullet_avg_length = data.get("experience_bullet_avg_length", 0.0)
        p.summary_avg_length = data.get("summary_avg_length", 0.0)
        p.action_verbs = data.get("action_verbs", {})
        p.industry_keywords = data.get("industry_keywords", {})
        p.common_jd_skills = data.get("common_jd_skills", {})
        p.ats_score_patterns = data.get("ats_score_patterns", {})
        p.last_updated = data.get("last_updated", "")
        return p


class PatternLearningService:
    def __init__(self):
        self._pattern: Optional[ResumePattern] = None
        self._save_counter: int = 0

    @property
    def pattern(self) -> ResumePattern:
        if self._pattern is None:
            self._pattern = self._load_patterns()
        return self._pattern

    def _load_patterns(self) -> ResumePattern:
        p = ResumePattern()

        try:
            from app.integrations.supabase_client import supabase_service
            sb = supabase_service._get_client_safe()
            if sb:
                result = sb.table(SUPABASE_TABLE).select("pattern_data").eq("id", "global").execute()
                if result.data and len(result.data) > 0:
                    data = result.data[0].get("pattern_data", {})
                    if data:
                        p = ResumePattern.from_dict(data)
                        logger.info("patterns_loaded_supabase", extra={"detail": f"Loaded from Supabase: {p.total_resumes_analyzed} resumes"})
                        return p
        except Exception as e:
            logger.warning("pattern_load_supabase_failed", extra={"detail": str(e)[:100]})

        try:
            if os.path.exists(PATTERN_FILE):
                with open(PATTERN_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                p = ResumePattern.from_dict(data)
                logger.info("patterns_loaded_file", extra={"detail": f"Loaded from file: {p.total_resumes_analyzed} resumes"})
        except Exception as e:
            logger.warning("pattern_load_file_failed", extra={"detail": str(e)[:200]})

        return p

    def _save_patterns(self) -> None:
        p = self.pattern
        p.last_updated = datetime.now(timezone.utc).isoformat()
        data = p.to_dict()

        try:
            from app.integrations.supabase_client import supabase_service
            sb = supabase_service._get_client_safe()
            if sb:
                existing = sb.table(SUPABASE_TABLE).select("id").eq("id", "global").execute()
                if existing.data and len(existing.data) > 0:
                    sb.table(SUPABASE_TABLE).update({"pattern_data": data, "updated_at": "now()"}).eq("id", "global").execute()
                else:
                    sb.table(SUPABASE_TABLE).insert({"id": "global", "pattern_data": data}).execute()
                logger.info("patterns_saved_supabase", extra={"detail": f"Saved to Supabase: {p.total_resumes_analyzed} resumes"})
                return
        except Exception as e:
            logger.warning("pattern_save_supabase_failed", extra={"detail": str(e)[:100]})

        try:
            tmp_path = PATTERN_FILE + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            os.replace(tmp_path, PATTERN_FILE)
            logger.info("patterns_saved_file", extra={"detail": f"Saved to file: {p.total_resumes_analyzed} resumes"})
        except Exception as e:
            logger.error("pattern_save_failed", extra={"detail": str(e)[:200]})

    def learn_from_resume(self, resume: Resume) -> None:
        p = self.pattern
        p.total_resumes_analyzed += 1

        if resume.skills:
            for sg in resume.skills:
                for skill in sg.skills:
                    s_lower = skill.lower().strip()
                    if s_lower:
                        p.skill_frequency[s_lower] = p.skill_frequency.get(s_lower, 0) + 1

        if resume.experience:
            total_bullet_len = 0
            bullet_count = 0
            for exp in resume.experience:
                if exp.description_bullets:
                    for bullet in exp.description_bullets:
                        bullet_stripped = bullet.strip()
                        if bullet_stripped:
                            total_bullet_len += len(bullet_stripped)
                            bullet_count += 1
                            if len(p.bullet_point_patterns) < 500:
                                p.bullet_point_patterns.append(bullet_stripped)
                            first_word = bullet_stripped.split()[0].lower().rstrip("ed") if bullet_stripped.split() else ""
                            if first_word and len(first_word) > 2:
                                p.action_verbs[first_word] = p.action_verbs.get(first_word, 0) + 1

            if bullet_count > 0:
                current_avg = p.experience_bullet_avg_length
                new_avg = total_bullet_len / bullet_count
                n = p.total_resumes_analyzed
                p.experience_bullet_avg_length = (current_avg * (n - 1) + new_avg) / n

        if resume.professional_summary:
            summary = resume.professional_summary.strip()
            if summary:
                if len(p.summary_patterns) < 200:
                    p.summary_patterns.append(summary)
                n = p.total_resumes_analyzed
                current_avg = p.summary_avg_length
                p.summary_avg_length = (current_avg * (n - 1) + len(summary)) / n

        sections_present = []
        if resume.experience:
            sections_present.append("experience")
        if resume.education:
            sections_present.append("education")
        if resume.skills:
            sections_present.append("skills")
        if resume.projects:
            sections_present.append("projects")
        if resume.certifications:
            sections_present.append("certifications")
        if resume.achievements:
            sections_present.append("achievements")
        if resume.professional_summary:
            sections_present.insert(0, "professional_summary")

        order_key = "->".join(sections_present)
        p.section_order_frequency[order_key] = p.section_order_frequency.get(order_key, 0) + 1

        self._save_counter += 1
        if self._save_counter % 5 == 0 or p.total_resumes_analyzed <= 3:
            self._save_patterns()
        else:
            p.last_updated = datetime.now(timezone.utc).isoformat()

    def learn_from_jd_analysis(self, jd_analysis: Any) -> None:
        p = self.pattern
        try:
            for skill in jd_analysis.required_skills:
                s_lower = skill.lower().strip()
                if s_lower:
                    p.common_jd_skills[s_lower] = p.common_jd_skills.get(s_lower, 0) + 1
            for skill in jd_analysis.preferred_skills:
                s_lower = skill.lower().strip()
                if s_lower:
                    p.common_jd_skills[s_lower] = p.common_jd_skills.get(s_lower, 0) + 1
        except Exception as e:
            logger.warning("jd_pattern_learn_failed", extra={"detail": str(e)[:100]})

    def learn_from_ats_score(self, score_result: Any) -> None:
        p = self.pattern
        try:
            overall = score_result.overall_score
            bucket = "high" if overall >= 75 else "medium" if overall >= 50 else "low"
            if bucket not in p.ats_score_patterns:
                p.ats_score_patterns[bucket] = {"count": 0, "avg_score": 0.0}
            current = p.ats_score_patterns[bucket]
            n = current["count"] + 1
            current["avg_score"] = (current["avg_score"] * (n - 1) + overall) / n
            current["count"] = n
        except Exception as e:
            logger.warning("ats_pattern_learn_failed", extra={"detail": str(e)[:100]})

    def get_learning_context(self) -> str:
        p = self.pattern
        if p.total_resumes_analyzed == 0:
            return ""

        top_skills = sorted(p.skill_frequency.items(), key=lambda x: x[1], reverse=True)[:20]
        top_action_verbs = sorted(p.action_verbs.items(), key=lambda x: x[1], reverse=True)[:15]
        top_jd_skills = sorted(p.common_jd_skills.items(), key=lambda x: x[1], reverse=True)[:15]
        top_section_orders = sorted(p.section_order_frequency.items(), key=lambda x: x[1], reverse=True)[:3]

        parts = [
            f"LEARNED INSIGHTS FROM {p.total_resumes_analyzed} RESUMES:",
            f"- Most common skills across resumes: {', '.join(s[0] for s in top_skills[:15])}",
            f"- Most effective action verbs: {', '.join(v[0] for v in top_action_verbs[:10])}",
            f"- Average experience bullet length: {p.experience_bullet_avg_length:.0f} chars",
            f"- Average summary length: {p.summary_avg_length:.0f} chars",
        ]

        if top_jd_skills:
            parts.append(f"- Most requested JD skills: {', '.join(s[0] for s in top_jd_skills[:10])}")

        if top_section_orders:
            parts.append(f"- Most common section order: {top_section_orders[0][0]}")

        if p.ats_score_patterns:
            for bucket, data in p.ats_score_patterns.items():
                if data.get("count", 0) > 0:
                    parts.append(f"- ATS score distribution: {bucket}={data['count']} resumes (avg {data['avg_score']:.1f})")

        return "\n".join(parts)

    def get_tailoring_insights(self, target_skills: List[str], target_jd_keywords: List[str]) -> Dict[str, Any]:
        p = self.pattern
        if p.total_resumes_analyzed == 0:
            return {"learning_available": False}

        target_lower = {s.lower() for s in target_skills + target_jd_keywords}
        matched_from_learning = []
        for learned_skill, freq in p.skill_frequency.items():
            if learned_skill in target_lower:
                matched_from_learning.append({"skill": learned_skill, "frequency": freq})

        high_score_patterns = p.ats_score_patterns.get("high", {})
        medium_score_patterns = p.ats_score_patterns.get("medium", {})

        return {
            "learning_available": True,
            "total_resumes_analyzed": p.total_resumes_analyzed,
            "skills_in_target_jd_also_common_in_resumes": sorted(matched_from_learning, key=lambda x: x["frequency"], reverse=True)[:15],
            "top_action_verbs": sorted(p.action_verbs.items(), key=lambda x: x[1], reverse=True)[:15],
            "optimal_bullet_length": p.experience_bullet_avg_length,
            "optimal_summary_length": p.summary_avg_length,
            "high_score_avg": high_score_patterns.get("avg_score", 0),
            "high_score_count": high_score_patterns.get("count", 0),
            "section_order_trends": sorted(p.section_order_frequency.items(), key=lambda x: x[1], reverse=True)[:3],
        }


pattern_learning_service = PatternLearningService()
