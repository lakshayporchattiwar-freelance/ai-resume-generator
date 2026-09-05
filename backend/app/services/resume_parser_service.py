"""Resume parsing service per TRD Section 5.1. Extracts text from PDF/DOCX and structures via AI."""

import json
import logging
import re
import uuid
from typing import Dict, Optional, Tuple

from app.core.exceptions import ParsingError
from app.integrations.docx_parser import docx_parser
from app.integrations.groq_client import groq_client
from app.integrations.pdf_parser import pdf_parser
from app.models.resume import (
    Resume, ResumeSource, ResumeMeta, PersonalDetails,
    ExperienceEntry, EducationEntry, ProjectEntry, SkillGroup,
    CertificationEntry, AchievementEntry,
)
from app.models.responses import ParsedResumeResult, SectionConfidence
from app.prompts.resume_structuring_prompt import (
    RESUME_STRUCTURING_SYSTEM_PROMPT,
    RESUME_STRUCTURING_USER_TEMPLATE,
)

logger = logging.getLogger(__name__)

ALLOWED_MIME_RESUME = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
MIME_SIGNATURES = {
    b"%PDF": "application/pdf",
    b"PK\x03\x04": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
PHONE_RE = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')
LINK_RE = re.compile(r'https?://[^\s<>\"\'\)]+|www\.[^\s<>\"\'\)]+')
DATE_RE = re.compile(r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*\d{4}|\d{1,2}/\d{4}|\d{4}\s*[-–]\s*(?:present|current|\d{4})', re.IGNORECASE)
SKILL_KEYWORDS = {
    "programming": ["python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab"],
    "frameworks": ["react", "angular", "vue", "django", "flask", "fastapi", "spring", "express", "nextjs", "nuxt", "svelte", "nodejs", "node.js"],
    "databases": ["sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "dynamodb", "cassandra", "oracle", "sqlite"],
    "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd", "devops"],
    "tools": ["git", "github", "gitlab", "jira", "confluence", "figma", "slack", "notion", "postman"],
    "data": ["pandas", "numpy", "tensorflow", "pytorch", "scikit-learn", "spark", "hadoop", "tableau", "power bi"],
    "soft": ["leadership", "communication", "teamwork", "problem-solving", "agile", "scrum", "project management"],
}


def detect_mime_by_signature(file_bytes: bytes) -> str | None:
    for sig, mime in MIME_SIGNATURES.items():
        if file_bytes[:len(sig)] == sig:
            return mime
    return None


class ResumeParserService:
    async def parse(self, file_bytes: bytes, filename: str, content_type: str) -> ParsedResumeResult:
        actual_mime = detect_mime_by_signature(file_bytes[:16])
        if actual_mime is None:
            if filename.lower().endswith(".pdf"):
                actual_mime = "application/pdf"
            elif filename.lower().endswith(".docx"):
                actual_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        if actual_mime not in ALLOWED_MIME_RESUME:
            raise ParsingError(f"Unsupported file type detected: {actual_mime}")

        try:
            raw_text = self._extract_text(file_bytes, actual_mime)
        except Exception as e:
            logger.error("text_extraction_failed", extra={"detail": str(e)[:200]})
            raise ParsingError("Failed to extract text from the uploaded file. The file may be corrupted or image-based.")

        if not raw_text.strip():
            raise ParsingError("No text content could be extracted from the file. If this is a scanned PDF, please upload a text-based PDF or DOCX instead.")

        structured = None
        ai_error = None

        try:
            structured = await self._structure_with_ai(raw_text)
        except Exception as e:
            ai_error = str(e)[:200]
            logger.warning("ai_structuring_failed_using_regex_fallback", extra={"detail": ai_error})

        if structured is None:
            structured = self._regex_fallback_structure(raw_text)

        structured.meta = ResumeMeta(source=ResumeSource.uploaded)

        confidence = self._compute_confidence(structured, raw_text)

        return ParsedResumeResult(resume=structured, section_confidence=confidence)

    def _extract_text(self, file_bytes: bytes, mime_type: str) -> str:
        if mime_type == "application/pdf":
            return pdf_parser.extract_text(file_bytes)
        else:
            return docx_parser.extract_text(file_bytes)

    async def _structure_with_ai(self, raw_text: str) -> Resume | None:
        max_chars = 15000
        truncated = raw_text[:max_chars]
        if len(raw_text) > max_chars:
            truncated += f"\n\n[... document truncated, total {len(raw_text)} chars]"

        user_prompt = RESUME_STRUCTURING_USER_TEMPLATE.format(resume_text=truncated)
        response = await groq_client.chat_completion(
            system_prompt=RESUME_STRUCTURING_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=6000,
        )
        parsed = self._parse_ai_response(response)
        if parsed is None:
            raise ParsingError("AI structuring returned invalid data")
        return parsed

    def _parse_ai_response(self, response: str) -> Resume | None:
        try:
            data = json.loads(response)
            data.pop("section_confidence", None)

            if "personal_details" not in data or not isinstance(data.get("personal_details"), dict):
                return None

            pd = data["personal_details"]
            if not pd.get("full_name") or not pd["full_name"].strip():
                return None

            for section in ["experience", "education", "projects"]:
                if section in data and isinstance(data[section], list):
                    for item in data[section]:
                        if isinstance(item, dict) and "id" not in item:
                            item["id"] = str(uuid.uuid4())

            return Resume(**data)
        except Exception as e:
            logger.warning("ai_response_parse_failed", extra={"detail": str(e)[:200]})
            return None

    def _regex_fallback_structure(self, raw_text: str) -> Resume:
        lines = raw_text.split("\n")
        non_empty = [l.strip() for l in lines if l.strip()]

        personal = self._extract_personal_details(non_empty, raw_text)
        summary = self._extract_summary(non_empty, raw_text)
        experience = self._extract_experience(non_empty, raw_text)
        education = self._extract_education(non_empty, raw_text)
        projects = self._extract_projects(non_empty, raw_text)
        skills = self._extract_skills(raw_text)
        certifications = self._extract_certifications(non_empty, raw_text)
        achievements = self._extract_achievements(non_empty, raw_text)

        return Resume(
            personal_details=personal,
            professional_summary=summary,
            experience=experience or None,
            education=education or None,
            projects=projects or None,
            skills=skills or None,
            certifications=certifications or None,
            achievements=achievements or None,
            meta=ResumeMeta(source=ResumeSource.uploaded),
        )

    def _extract_personal_details(self, lines: list, raw_text: str) -> PersonalDetails:
        full_name = "Unknown"
        if lines:
            for line in lines[:5]:
                clean = line.strip()
                if clean and len(clean) < 120 and not EMAIL_RE.search(clean) and not PHONE_RE.search(clean):
                    if not any(c in clean for c in "@|/#") and len(clean.split()) >= 2:
                        full_name = clean
                        break

        email = None
        email_match = EMAIL_RE.search(raw_text)
        if email_match:
            email = email_match.group(0)

        phone = None
        phone_match = PHONE_RE.search(raw_text)
        if phone_match:
            phone = phone_match.group(0)

        links = []
        for link_match in LINK_RE.finditer(raw_text):
            url = link_match.group(0).rstrip(".,;:")
            label = "LinkedIn" if "linkedin" in url.lower() else "GitHub" if "github" in url.lower() else "Portfolio"
            links.append({"label": label, "url": url})

        location = None
        location_patterns = [
            re.compile(r'(?:located in|based in|living in)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2}(?:\s+\d{5})?)', re.IGNORECASE),
            re.compile(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:USA|UK|India|Canada|Australia|Germany|France))', re.IGNORECASE),
        ]
        for pat in location_patterns:
            m = pat.search(raw_text)
            if m:
                location = m.group(1).strip()
                break

        professional_title = None
        if lines and len(lines) > 1:
            for line in lines[1:4]:
                clean = line.strip()
                if clean and len(clean) < 150 and len(clean.split()) <= 8:
                    if any(kw in clean.lower() for kw in ["engineer", "developer", "manager", "analyst", "designer", "director", "lead", "architect", "consultant", "scientist", "specialist", "coordinator", "intern", "admin"]):
                        professional_title = clean
                        break

        return PersonalDetails(
            full_name=full_name[:120],
            professional_title=professional_title,
            email=email,
            phone=phone,
            location=location,
            links=links if links else None,
        )

    def _extract_summary(self, lines: list, raw_text: str) -> Optional[str]:
        summary_keywords = ["summary", "objective", "profile", "about", "professional summary", "career objective"]
        in_summary = False
        summary_lines = []

        for line in lines:
            lower = line.lower().strip()
            if any(kw in lower for kw in summary_keywords) and len(line) < 80:
                in_summary = True
                continue
            if in_summary:
                if line.strip() and not line.strip().startswith("#") and not line.strip().startswith("-"):
                    summary_lines.append(line.strip())
                    if len(" ".join(summary_lines)) > 600:
                        break
                else:
                    if summary_lines:
                        break

        if summary_lines:
            return " ".join(summary_lines)[:800]

        if len(raw_text) > 100:
            for line in lines[2:6]:
                clean = line.strip()
                if len(clean) > 80 and len(clean) < 400 and not EMAIL_RE.search(clean):
                    return clean[:800]

        return None

    def _extract_experience(self, lines: list, raw_text: str) -> list:
        experience = []
        exp_keywords = ["experience", "work history", "employment", "professional experience", "work experience"]
        edu_keywords = ["education", "academic", "qualification"]
        skill_keywords = ["skills", "technical skills", "technologies"]

        exp_start = -1
        exp_end = len(lines)

        for i, line in enumerate(lines):
            lower = line.lower().strip().lstrip("#").strip()
            if any(kw in lower for kw in exp_keywords) and len(line) < 80:
                exp_start = i + 1
                break

        if exp_start == -1:
            return []

        for i in range(exp_start, len(lines)):
            lower = lines[i].lower().strip().lstrip("#").strip()
            if any(kw in lower for kw in edu_keywords + skill_keywords) and len(lines[i]) < 80:
                exp_end = i
                break

        exp_lines = lines[exp_start:exp_end]
        if not exp_lines:
            return []

        current_entry = None
        date_pattern = re.compile(r'(?:\d{4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{0,4})\s*[-–—to]+\s*(?:\d{4}|present|current)', re.IGNORECASE)
        simple_date = re.compile(r'\b20\d{2}\b|\b19\d{2}\b')

        for line in exp_lines:
            stripped = line.strip().lstrip("-•●◆◇►").strip()
            if not stripped:
                continue

            has_date = date_pattern.search(stripped) or (simple_date.search(stripped) and len(stripped.split()) <= 6)
            looks_like_header = (stripped[0].isupper() if stripped else False) and (has_date or len(stripped.split()) <= 6)

            if looks_like_header and (date_pattern.search(stripped) or (simple_date.search(stripped) and any(kw in stripped.lower() for kw in ["at", "@", "-", "–"]))):
                if current_entry:
                    experience.append(current_entry)
                parts = re.split(r'\s*(?:at|@|[-–—])\s*', stripped, maxsplit=1)
                job_title = parts[0].strip() if parts else stripped
                company = parts[1].strip() if len(parts) > 1 else "Unknown Company"

                dates = date_pattern.findall(stripped)
                start_date = dates[0].split("-")[0].strip() if dates else ""
                end_date = dates[0].split("-")[-1].strip() if dates and "-" in dates[0] else "present"

                if not start_date:
                    years = simple_date.findall(stripped)
                    start_date = years[0] if years else ""
                    end_date = years[1] if len(years) > 1 else "present"

                current_entry = ExperienceEntry(
                    company_name=company[:150],
                    job_title=job_title[:150],
                    start_date=start_date[:10],
                    end_date=end_date[:10],
                    description_bullets=[],
                    order_index=len(experience),
                )
            elif current_entry and (line.strip().startswith("-") or line.strip().startswith("•") or line.strip().startswith("●")):
                bullet = stripped[:400]
                if bullet:
                    current_entry.description_bullets.append(bullet)
            elif current_entry and len(stripped) > 15:
                current_entry.description_bullets.append(stripped[:400])

        if current_entry:
            experience.append(current_entry)

        return experience

    def _extract_education(self, lines: list, raw_text: str) -> list:
        education = []
        edu_keywords = ["education", "academic", "qualification", "degree"]
        other_keywords = ["experience", "skills", "projects", "certification"]

        edu_start = -1
        edu_end = len(lines)

        for i, line in enumerate(lines):
            lower = line.lower().strip().lstrip("#").strip()
            if any(kw in lower for kw in edu_keywords) and len(line) < 80:
                edu_start = i + 1
                break

        if edu_start == -1:
            return []

        for i in range(edu_start, len(lines)):
            lower = lines[i].lower().strip().lstrip("#").strip()
            if any(kw in lower for kw in other_keywords) and len(lines[i]) < 80:
                edu_end = i
                break

        edu_lines = lines[edu_start:edu_end]
        if not edu_lines:
            return []

        current_entry = None
        degree_keywords = ["bachelor", "master", "phd", "b.tech", "m.tech", "b.sc", "m.sc", "mba", "bba", "bsc", "msc", "b.e", "m.e", "diploma", "associate", "doctorate", "undergraduate", "graduate"]

        for line in edu_lines:
            stripped = line.strip().lstrip("-•●◆◇►").strip()
            if not stripped:
                continue

            has_degree = any(kw in stripped.lower() for kw in degree_keywords)
            is_short = len(stripped.split()) <= 8

            if (has_degree or is_short) and stripped[0:1].isupper() if stripped else False:
                if current_entry:
                    education.append(current_entry)

                institution = stripped
                degree = ""
                parts = re.split(r'[,\-–]', stripped, maxsplit=1)
                if len(parts) >= 2:
                    if any(kw in parts[0].lower() for kw in degree_keywords):
                        degree = parts[0].strip()
                        institution = parts[1].strip()
                    else:
                        institution = parts[0].strip()
                        degree = parts[1].strip()
                elif has_degree:
                    degree = stripped
                    institution = ""

                years = re.findall(r'\b(19|20)\d{2}\b', stripped)
                start_date = years[0] if years else None
                end_date = years[1] if len(years) > 1 else None

                current_entry = EducationEntry(
                    institution_name=institution[:150] or "Unknown Institution",
                    degree=degree[:150] or "Degree",
                    start_date=start_date,
                    end_date=end_date,
                    order_index=len(education),
                )
            elif current_entry and stripped:
                current_entry.details = (current_entry.details or "") + " " + stripped if current_entry.details else stripped
                if current_entry.details and len(current_entry.details) > 300:
                    current_entry.details = current_entry.details[:300]

        if current_entry:
            education.append(current_entry)

        return education

    def _extract_projects(self, lines: list, raw_text: str) -> list:
        projects = []
        proj_keywords = ["projects", "personal projects", "key projects", "notable projects"]
        other_keywords = ["experience", "education", "skills", "certification", "achievements"]

        proj_start = -1
        proj_end = len(lines)

        for i, line in enumerate(lines):
            lower = line.lower().strip().lstrip("#").strip()
            if any(kw in lower for kw in proj_keywords) and len(line) < 80:
                proj_start = i + 1
                break

        if proj_start == -1:
            return []

        for i in range(proj_start, len(lines)):
            lower = lines[i].lower().strip().lstrip("#").strip()
            if any(kw in lower for kw in other_keywords) and len(lines[i]) < 80:
                proj_end = i
                break

        proj_lines = lines[proj_start:proj_end]
        if not proj_lines:
            return []

        current_entry = None

        for line in proj_lines:
            stripped = line.strip().lstrip("-•●◆◇►").strip()
            if not stripped:
                continue

            is_header = not line.strip().startswith("-") and not line.strip().startswith("•") and len(stripped.split()) <= 8 and stripped[0:1].isupper()

            if is_header:
                if current_entry:
                    projects.append(current_entry)
                current_entry = ProjectEntry(
                    project_name=stripped[:150],
                    description_bullets=[],
                    order_index=len(projects),
                )
            elif current_entry:
                current_entry.description_bullets.append(stripped[:400])

        if current_entry:
            projects.append(current_entry)

        return projects

    def _extract_skills(self, raw_text: str) -> list:
        text_lower = raw_text.lower()
        found_skills = {}

        for category, keywords in SKILL_KEYWORDS.items():
            matched = []
            for kw in keywords:
                if kw in text_lower:
                    matched.append(kw.title() if kw[0].islower() else kw)
            if matched:
                label = category.title()
                found_skills[label] = matched

        skill_section_match = re.search(
            r'(?:skills|technologies|tech stack|technical skills)[:\s]*(.*?)(?=\n\n|\n#[^#]|\Z)',
            raw_text,
            re.IGNORECASE | re.DOTALL,
        )
        if skill_section_match:
            skill_text = skill_section_match.group(1)
            individual_skills = re.split(r'[,;|•●◆\n]+', skill_text)
            individual_skills = [s.strip().strip("-•●◆").strip() for s in individual_skills if s.strip() and len(s.strip()) > 1]

            if individual_skills:
                found_skills["From Resume"] = individual_skills[:30]

        if not found_skills:
            return []

        return [SkillGroup(category_label=cat, skills=skls) for cat, skls in found_skills.items()]

    def _extract_certifications(self, lines: list, raw_text: str) -> list:
        certs = []
        cert_keywords = ["certification", "certificate", "certified", "license"]

        in_cert = False
        cert_lines = []

        for line in lines:
            lower = line.lower().strip().lstrip("#").strip()
            if any(kw in lower for kw in cert_keywords) and len(line) < 80:
                in_cert = True
                continue
            if in_cert:
                other_sections = ["experience", "education", "skills", "projects", "achievements"]
                if any(kw in lower for kw in other_sections) and len(line) < 80:
                    in_cert = False
                    continue
                cert_lines.append(line.strip())

        for line in cert_lines:
            stripped = line.strip().lstrip("-•●◆◇►").strip()
            if not stripped or len(stripped) < 3:
                continue
            certs.append(CertificationEntry(
                certification_name=stripped[:150],
            ))

        return certs

    def _extract_achievements(self, lines: list, raw_text: str) -> list:
        achievements = []
        ach_keywords = ["achievement", "award", "honor", "recognition", "accomplishment"]

        in_ach = False
        ach_lines = []

        for line in lines:
            lower = line.lower().strip().lstrip("#").strip()
            if any(kw in lower for kw in ach_keywords) and len(line) < 80:
                in_ach = True
                continue
            if in_ach:
                other_sections = ["experience", "education", "skills", "projects", "certification"]
                if any(kw in lower for kw in other_sections) and len(line) < 80:
                    in_ach = False
                    continue
                ach_lines.append(line.strip())

        for line in ach_lines:
            stripped = line.strip().lstrip("-•●◆◇►").strip()
            if not stripped or len(stripped) < 3:
                continue
            achievements.append(AchievementEntry(
                statement=stripped[:300],
                order_index=len(achievements),
            ))

        return achievements

    def _compute_confidence(self, resume: Resume, raw_text: str) -> Dict[str, SectionConfidence]:
        confidence: Dict[str, SectionConfidence] = {}
        pd = resume.personal_details
        if pd and pd.full_name and len(pd.full_name) > 1 and pd.full_name != "Unknown":
            confidence["personal_details"] = SectionConfidence.high
        elif pd and pd.full_name:
            confidence["personal_details"] = SectionConfidence.needs_review
        else:
            confidence["personal_details"] = SectionConfidence.not_found

        confidence["professional_summary"] = (
            SectionConfidence.high if resume.professional_summary
            else SectionConfidence.not_found
        )
        confidence["experience"] = (
            SectionConfidence.high if resume.experience and len(resume.experience) > 0
            else SectionConfidence.not_found
        )
        confidence["education"] = (
            SectionConfidence.high if resume.education and len(resume.education) > 0
            else SectionConfidence.not_found
        )
        confidence["projects"] = (
            SectionConfidence.high if resume.projects and len(resume.projects) > 0
            else SectionConfidence.not_found
        )
        confidence["skills"] = (
            SectionConfidence.high if resume.skills and len(resume.skills) > 0
            else SectionConfidence.not_found
        )
        confidence["certifications"] = (
            SectionConfidence.high if resume.certifications and len(resume.certifications) > 0
            else SectionConfidence.not_found
        )
        confidence["achievements"] = (
            SectionConfidence.high if resume.achievements and len(resume.achievements) > 0
            else SectionConfidence.not_found
        )
        confidence["references"] = (
            SectionConfidence.needs_review if resume.references
            else SectionConfidence.not_found
        )
        return confidence


resume_parser_service = ResumeParserService()
