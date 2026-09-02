"""Scoring service per TRD Section 5.1. Combines deterministic keyword matching with AI qualitative assessment."""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import List

from app.core.config import settings
from app.core.exceptions import AIProviderError
from app.integrations.groq_client import groq_client
from app.models.analysis import (
    ATSScoreResult, SubScores, Recommendation, RecommendationPriority,
    RelatedSection,
)
from app.models.job_description import JobDescriptionAnalysis, KeywordImportance
from app.models.resume import Resume
from app.prompts.scoring_prompt import SCORING_SYSTEM_PROMPT, SCORING_USER_TEMPLATE

logger = logging.getLogger(__name__)


class ScoringService:
    async def score(self, resume: Resume, jd_analysis: JobDescriptionAnalysis) -> ATSScoreResult:
        matched, missing_req, missing_pref = self._compute_keyword_match(resume, jd_analysis)
        keyword_coverage = self._compute_keyword_coverage(jd_analysis, matched)

        formatting_compat = self._compute_formatting_score(resume)

        try:
            ai_scores = await self._get_ai_qualitative_scores(resume, jd_analysis)
            skills_alignment = ai_scores.get("skills_alignment_score", 50.0)
            experience_relevance = ai_scores.get("experience_relevance_score", 50.0)
            ai_recommendations = ai_scores.get("recommendations", [])
        except Exception as e:
            logger.warning("ai_scoring_fallback", extra={"detail": str(e)[:200]})
            skills_alignment = 50.0
            experience_relevance = 50.0
            ai_recommendations = []

        overall = (
            keyword_coverage * 0.30
            + skills_alignment * 0.25
            + experience_relevance * 0.25
            + formatting_compat * 0.20
        )

        all_recommendations = self._build_recommendations(
            missing_req, missing_pref, ai_recommendations, resume
        )

        snapshot_hash = self._compute_resume_hash(resume)

        return ATSScoreResult(
            overall_score=round(overall, 1),
            sub_scores=SubScores(
                keyword_coverage=round(keyword_coverage, 1),
                skills_alignment=round(skills_alignment, 1),
                experience_relevance=round(experience_relevance, 1),
                formatting_compatibility=round(formatting_compat, 1),
            ),
            matched_keywords=matched,
            missing_required_keywords=missing_req,
            missing_preferred_keywords=missing_pref,
            recommendations=all_recommendations,
            computed_at=datetime.now(timezone.utc).isoformat(),
            resume_snapshot_hash=snapshot_hash,
        )

    def _compute_keyword_match(
        self, resume: Resume, jd: JobDescriptionAnalysis
    ) -> tuple:
        resume_text_lower = self._get_resume_text(resume).lower()
        resume_words = set(resume_text_lower.split())

        matched = []
        missing_req = []
        missing_pref = []

        for kw in jd.keywords:
            term_lower = kw.term.lower()
            if term_lower in resume_text_lower or any(term_lower in w for w in resume_words):
                matched.append(kw.term)
            else:
                if kw.importance == KeywordImportance.required:
                    missing_req.append(kw.term)
                else:
                    missing_pref.append(kw.term)

        for skill in jd.required_skills:
            if skill.lower() in resume_text_lower:
                if skill not in matched:
                    matched.append(skill)
            else:
                if skill not in missing_req:
                    missing_req.append(skill)

        for skill in jd.preferred_skills:
            if skill.lower() in resume_text_lower:
                if skill not in matched:
                    matched.append(skill)
            else:
                if skill not in missing_pref:
                    missing_pref.append(skill)

        return matched, missing_req, missing_pref

    def _compute_keyword_coverage(self, jd: JobDescriptionAnalysis, matched: List[str]) -> float:
        total = len(jd.keywords) + len(jd.required_skills) + len(jd.preferred_skills)
        if total == 0:
            return 50.0
        match_count = len(matched)
        return min(100.0, (match_count / total) * 100)

    def _compute_formatting_score(self, resume: Resume) -> float:
        score = 100.0
        pd = resume.personal_details
        if not pd.full_name:
            score -= 30
        if not pd.email:
            score -= 10
        if not resume.professional_summary:
            score -= 10
        if not resume.experience or len(resume.experience) == 0:
            score -= 15
        if not resume.skills or len(resume.skills) == 0:
            score -= 10
        if not resume.education or len(resume.education) == 0:
            score -= 10
        if resume.experience:
            for exp in resume.experience:
                if not exp.description_bullets or len(exp.description_bullets) == 0:
                    score -= 5
        return max(0.0, score)

    def _get_resume_text(self, resume: Resume) -> str:
        parts = []
        pd = resume.personal_details
        parts.append(pd.full_name or "")
        parts.append(pd.professional_title or "")
        parts.append(resume.professional_summary or "")
        if resume.experience:
            for e in resume.experience:
                parts.append(e.company_name or "")
                parts.append(e.job_title or "")
                if e.description_bullets:
                    parts.extend(e.description_bullets)
        if resume.education:
            for e in resume.education:
                parts.append(e.institution_name or "")
                parts.append(e.degree or "")
        if resume.projects:
            for p in resume.projects:
                parts.append(p.project_name or "")
                if p.description_bullets:
                    parts.extend(p.description_bullets)
        if resume.skills:
            for sg in resume.skills:
                parts.extend(sg.skills)
        if resume.achievements:
            for a in resume.achievements:
                parts.append(a.statement or "")
        return " ".join(parts)

    async def _get_ai_qualitative_scores(self, resume: Resume, jd: JobDescriptionAnalysis) -> dict:
        resume_sections = []
        if resume.experience:
            resume_sections.append("experience")
        if resume.education:
            resume_sections.append("education")
        if resume.skills:
            resume_sections.append("skills")
        if resume.projects:
            resume_sections.append("projects")

        resume_skills = []
        if resume.skills:
            for sg in resume.skills:
                resume_skills.extend(sg.skills)

        user_prompt = SCORING_USER_TEMPLATE.format(
            resume_sections=", ".join(resume_sections) or "none",
            resume_skills=", ".join(resume_skills[:30]) or "none",
            experience_count=str(len(resume.experience or [])),
            education_count=str(len(resume.education or [])),
            required_skills=", ".join(jd.required_skills[:20]) or "none",
            preferred_skills=", ".join(jd.preferred_skills[:20]) or "none",
            responsibilities="; ".join(jd.responsibilities[:10]) or "none",
        )

        response = await groq_client.chat_completion(
            system_prompt=SCORING_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.warning("scoring_ai_json_parse_failed")
            return {}

    def _build_recommendations(
        self, missing_req: List[str], missing_pref: List[str],
        ai_recs: list, resume: Resume,
    ) -> List[Recommendation]:
        recommendations = []

        if missing_req:
            terms = ", ".join(missing_req[:5])
            recommendations.append(Recommendation(
                priority=RecommendationPriority.high,
                message=f"Add these required skills if you have them: {terms}",
                related_section=RelatedSection.skills,
            ))

        if missing_pref:
            terms = ", ".join(missing_pref[:5])
            recommendations.append(Recommendation(
                priority=RecommendationPriority.medium,
                message=f"Consider adding these preferred skills: {terms}",
                related_section=RelatedSection.skills,
            ))

        if resume.experience:
            has_metrics = False
            for exp in resume.experience:
                if exp.description_bullets:
                    for bullet in exp.description_bullets:
                        import re
                        if re.search(r'\d+', bullet):
                            has_metrics = True
                            break
            if not has_metrics:
                recommendations.append(Recommendation(
                    priority=RecommendationPriority.high,
                    message="Add measurable outcomes to your experience entries (e.g., 'increased by 20%')",
                    related_section=RelatedSection.experience,
                ))

        if not resume.professional_summary:
            recommendations.append(Recommendation(
                priority=RecommendationPriority.medium,
                message="Add a professional summary to strengthen your resume's first impression",
                related_section=RelatedSection.professional_summary,
            ))

        for rec_data in ai_recs[:5]:
            try:
                priority = RecommendationPriority(rec_data.get("priority", "medium"))
                section = rec_data.get("related_section")
                related = RelatedSection(section) if section else None
                recommendations.append(Recommendation(
                    priority=priority,
                    message=rec_data.get("message", "")[:300],
                    related_section=related,
                ))
            except (ValueError, TypeError):
                continue

        return recommendations[:10]

    def _compute_resume_hash(self, resume: Resume) -> str:
        resume_json = resume.json()
        return hashlib.sha256(resume_json.encode()).hexdigest()[:16]


scoring_service = ScoringService()
