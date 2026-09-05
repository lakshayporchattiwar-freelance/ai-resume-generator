"""AI Orchestration Service per TRD Section 5.1 and 8. Central point for all AI generation."""

import json
import logging
import re
from typing import List, Optional

from app.core.config import settings
from app.core.exceptions import GuardrailValidationError, AIProviderError
from app.integrations.groq_client import groq_client
from app.models.analysis import ActionType, AIGenerationResult, AIGenerationRequest
from app.models.job_description import JobDescriptionAnalysis
from app.prompts.generation_prompts import (
    GENERATION_SYSTEM_PROMPT,
    SUMMARY_GENERATE_USER_TEMPLATE,
    SUMMARY_REWRITE_USER_TEMPLATE,
    EXPERIENCE_BULLETS_REWRITE_USER_TEMPLATE,
    PROJECT_DESCRIPTION_REWRITE_USER_TEMPLATE,
    ACHIEVEMENT_PHRASING_USER_TEMPLATE,
    TAILOR_RESUME_SYSTEM_PROMPT,
    TAILOR_RESUME_USER_TEMPLATE,
    TRANSFORM_RESUME_SYSTEM_PROMPT,
    TRANSFORM_RESUME_USER_TEMPLATE,
    get_jd_context_prompt,
)
from app.services.pattern_learning_service import pattern_learning_service

logger = logging.getLogger(__name__)


class AIOrchestrationService:
    async def generate(self, request: AIGenerationRequest) -> AIGenerationResult:
        if request.action_type == ActionType.tailor_resume:
            return await self._tailor_resume(request)
        if request.action_type == ActionType.transform_resume:
            return await self._transform_resume(request)

        template, user_prompt = self._build_prompt(request)

        for attempt in range(settings.AI_MAX_RETRIES + 1):
            try:
                response_text = await groq_client.chat_completion(
                    system_prompt=GENERATION_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    response_format={"type": "json_object"},
                    temperature=0.3,
                )

                result = self._parse_generation_response(response_text, request.action_type)

                source_entities = self._extract_entities(request.source_content or "", request.source_bullets or [])
                guardrail_passed = self._validate_guardrail(result, source_entities, request)

                if guardrail_passed:
                    result.guardrail_validated = True
                    return result

                if attempt < settings.AI_MAX_RETRIES:
                    logger.warning("guardrail_retry", extra={"detail": f"Attempt {attempt + 1}"})
                    user_prompt = self._add_stricter_guardrail(user_prompt)
                    continue
                else:
                    logger.warning("guardrail_failed_final")
                    result.guardrail_validated = False
                    result.warning_message = (
                        "We couldn't generate a suggestion that preserved all your original details "
                        "— please try again or edit manually"
                    )
                    return result

            except AIProviderError:
                raise
            except Exception as e:
                logger.error("ai_generation_error", extra={"detail": str(e)[:200]})
                if attempt < settings.AI_MAX_RETRIES:
                    continue
                raise AIProviderError("AI generation failed after retries")

        raise AIProviderError("AI generation failed")

    def _build_prompt(self, request: AIGenerationRequest) -> tuple:
        jd_json = request.job_description_analysis.json() if request.job_description_analysis else None
        jd_context = get_jd_context_prompt(jd_json)

        learning_context = pattern_learning_service.get_learning_context()
        learning_block = ""
        if learning_context:
            learning_block = f"\n\n{learning_context}\nUse these insights to inform your writing style, phrasing, and structure choices.\n"

        if request.action_type == ActionType.generate_summary:
            source = request.source_content or ""
            return SUMMARY_GENERATE_USER_TEMPLATE, SUMMARY_GENERATE_USER_TEMPLATE.format(
                source_content=source, jd_context=jd_context + learning_block
            )
        elif request.action_type == ActionType.rewrite_summary:
            source = request.source_content or ""
            return SUMMARY_REWRITE_USER_TEMPLATE, SUMMARY_REWRITE_USER_TEMPLATE.format(
                source_content=source, jd_context=jd_context + learning_block
            )
        elif request.action_type == ActionType.rewrite_experience_bullets:
            bullets = request.source_bullets or []
            bullets_text = "\n".join(f"- {b}" for b in bullets)
            return EXPERIENCE_BULLETS_REWRITE_USER_TEMPLATE, EXPERIENCE_BULLETS_REWRITE_USER_TEMPLATE.format(
                source_bullets=bullets_text, jd_context=jd_context + learning_block
            )
        elif request.action_type == ActionType.rewrite_project_description:
            bullets = request.source_bullets or []
            bullets_text = "\n".join(f"- {b}" for b in bullets)
            return PROJECT_DESCRIPTION_REWRITE_USER_TEMPLATE, PROJECT_DESCRIPTION_REWRITE_USER_TEMPLATE.format(
                source_bullets=bullets_text, jd_context=jd_context + learning_block
            )
        elif request.action_type == ActionType.suggest_achievement_phrasing:
            source = request.source_content or ""
            return ACHIEVEMENT_PHRASING_USER_TEMPLATE, ACHIEVEMENT_PHRASING_USER_TEMPLATE.format(
                source_content=source + learning_block
            )
        else:
            raise AIProviderError(f"Unknown action type: {request.action_type}")

    def _parse_generation_response(self, response: str, action_type: ActionType) -> AIGenerationResult:
        try:
            data = json.loads(response)
            if action_type in (ActionType.rewrite_experience_bullets, ActionType.rewrite_project_description):
                return AIGenerationResult(
                    generated_bullets=data.get("generated_bullets", []),
                    generated_content=data.get("generated_content"),
                )
            else:
                return AIGenerationResult(
                    generated_content=data.get("generated_content", ""),
                    generated_bullets=data.get("generated_bullets"),
                )
        except json.JSONDecodeError as e:
            logger.warning("ai_response_json_parse_failed", extra={"detail": str(e)[:200]})
            raise AIProviderError("AI returned invalid JSON")

    def _extract_entities(self, source_content: str, source_bullets: List[str]) -> set:
        entities = set()
        all_text = source_content + " " + " ".join(source_bullets)
        words = re.findall(r'\b[A-Z][a-zA-Z0-9]+\b', all_text)
        for w in words:
            entities.add(w.lower())
        numbers = re.findall(r'\b\d+\.?\d*%?\b', all_text)
        for n in numbers:
            entities.add(n)
        return entities

    def _validate_guardrail(
        self, result: AIGenerationResult, source_entities: set, request: AIGenerationRequest
    ) -> bool:
        generated_text = result.generated_content or ""
        generated_text += " ".join(result.generated_bullets or [])

        source_lower = {e.lower() for e in source_entities if isinstance(e, str)}

        STOPWORDS = {
            "the", "and", "for", "with", "that", "this", "from", "are", "was",
            "were", "been", "have", "has", "had", "will", "would", "could",
            "should", "may", "might", "can", "not", "but", "also", "more",
            "than", "other", "such", "some", "into", "over", "after", "before",
            "between", "through", "during", "about", "which", "their", "these",
            "those", "each", "where", "when", "what", "how", "all", "both",
            "few", "most", "very", "just", "only", "own", "same", "using",
            "used", "including", "based", "led", "managed", "developed",
            "designed", "implemented", "created", "built", "maintained",
            "supported", "improved", "increased", "reduced", "achieved",
            "delivered", "collaborated", "coordinated", "established",
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
            "Saturday", "Sunday",
        }

        TECH_SYNONYMS = {
            "javascript", "typescript", "python", "java", "react", "angular",
            "vue", "node", "nodejs", "aws", "azure", "gcp", "docker", "kubernetes",
            "k8s", "git", "github", "sql", "postgresql", "mysql", "mongodb",
            "redis", "elasticsearch", "terraform", "jenkins", "ci", "cd",
            "cicd", "api", "rest", "graphql", "microservices", "agile", "scrum",
            "html", "css", "sass", "tailwind", "bootstrap", "figma", "jira",
            "confluence", "slack", "teams", "linux", "unix", "windows", "macos",
            "swift", "kotlin", "flutter", "django", "flask", "fastapi",
            "spring", "express", "nextjs", "nuxt", "svelte",
        }

        new_capitalized = re.findall(r'\b[A-Z][a-zA-Z0-9]+\b', generated_text)

        suspicious = []
        for word in new_capitalized:
            wl = word.lower()
            if wl in source_lower or wl in STOPWORDS or wl in TECH_SYNONYMS:
                continue
            if len(word) <= 3:
                continue
            suspicious.append(word)

        if len(suspicious) > 10:
            logger.warning("guardrail_suspicious_entities", extra={"detail": str(suspicious[:10])})
            return False

        source_all_text = (request.source_content or "") + " " + " ".join(request.source_bullets or [])
        source_numbers = set(re.findall(r'\b\d+\.?\d*%?\b', source_all_text))

        new_numbers = re.findall(r'\b\d+\.?\d*%?\b', generated_text)
        invented_numbers = [n for n in new_numbers if n not in source_numbers and not n.startswith("[")]

        if len(invented_numbers) > 2:
            logger.warning("guardrail_invented_numbers", extra={"detail": str(invented_numbers[:5])})
            return False

        return True

    def _add_stricter_guardrail(self, user_prompt: str) -> str:
        return (
            "IMPORTANT REMINDER: You must NOT introduce any new skills, employers, job titles, "
            "certifications, degrees, dates, or quantified metrics that were not in the original content. "
            "Only rephrase and restructure existing information.\n\n" + user_prompt
        )

    async def _tailor_resume(self, request: AIGenerationRequest) -> AIGenerationResult:
        jd_json = request.job_description_analysis.json() if request.job_description_analysis else None
        jd_context = get_jd_context_prompt(jd_json)
        learning_context = pattern_learning_service.get_learning_context()

        resume_json = request.source_content or "{}"
        user_prompt = TAILOR_RESUME_USER_TEMPLATE.format(
            resume_json=resume_json[:12000],
            jd_context=jd_context,
            learning_context=learning_context,
        )

        for attempt in range(settings.AI_MAX_RETRIES + 1):
            try:
                response_text = await groq_client.chat_completion(
                    system_prompt=TAILOR_RESUME_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=6000,
                )

                data = json.loads(response_text)

                tailored_resume = data.get("tailored_resume", {})
                suggestions = data.get("tailoring_suggestions", [])
                tips = data.get("match_improvement_tips", [])

                result_parts = []
                if tailored_resume:
                    result_parts.append("=== TAILORED RESUME ===")
                    result_parts.append(json.dumps(tailored_resume, indent=2))
                if suggestions:
                    result_parts.append("\n=== TAILORING SUGGESTIONS ===")
                    for s in suggestions:
                        section = s.get("section", "")
                        suggestion = s.get("suggestion", "")
                        missing = s.get("missing_keywords", [])
                        result_parts.append(f"[{section}] {suggestion}")
                        if missing:
                            result_parts.append(f"  Missing keywords to consider adding: {', '.join(missing)}")
                if tips:
                    result_parts.append("\n=== IMPROVEMENT TIPS ===")
                    for tip in tips:
                        result_parts.append(f"- {tip}")

                return AIGenerationResult(
                    generated_content="\n".join(result_parts) if result_parts else None,
                    guardrail_validated=True,
                )

            except json.JSONDecodeError as e:
                logger.warning("tailor_resume_json_parse_failed", extra={"detail": str(e)[:200]})
                if attempt < settings.AI_MAX_RETRIES:
                    continue
                return AIGenerationResult(
                    generated_content=None,
                    guardrail_validated=False,
                    warning_message="Failed to tailor resume. The AI response was malformed. Please try again.",
                )
            except AIProviderError:
                raise
            except Exception as e:
                logger.error("tailor_resume_error", extra={"detail": str(e)[:200]})
                if attempt < settings.AI_MAX_RETRIES:
                    continue
                raise AIProviderError("Resume tailoring failed after retries")

    async def _transform_resume(self, request: AIGenerationRequest) -> AIGenerationResult:
        jd_json = request.job_description_analysis.json() if request.job_description_analysis else None
        jd_context = get_jd_context_prompt(jd_json)
        learning_context = pattern_learning_service.get_learning_context()

        resume_json = request.source_content or "{}"
        user_prompt = TRANSFORM_RESUME_USER_TEMPLATE.format(
            resume_json=resume_json[:14000],
            jd_context=jd_context,
            learning_context=learning_context or "No learning data available yet.",
        )

        for attempt in range(settings.AI_MAX_RETRIES + 1):
            try:
                response_text = await groq_client.chat_completion(
                    system_prompt=TRANSFORM_RESUME_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=8000,
                )

                data = json.loads(response_text)

                transformed = data.get("transformed_resume", {})
                fixes = data.get("fixes", [])

                return AIGenerationResult(
                    generated_content=json.dumps({
                        "transformed_resume": transformed,
                        "fixes": fixes,
                    }),
                    guardrail_validated=True,
                )

            except json.JSONDecodeError as e:
                logger.warning("transform_resume_json_parse_failed", extra={"detail": str(e)[:200]})
                if attempt < settings.AI_MAX_RETRIES:
                    continue
                return AIGenerationResult(
                    generated_content=None,
                    guardrail_validated=False,
                    warning_message="AI transformation returned invalid data. Please try again.",
                )
            except AIProviderError:
                raise
            except Exception as e:
                logger.error("transform_resume_error", extra={"detail": str(e)[:200]})
                if attempt < settings.AI_MAX_RETRIES:
                    continue
                raise AIProviderError("Resume transformation failed after retries")


ai_orchestration_service = AIOrchestrationService()
