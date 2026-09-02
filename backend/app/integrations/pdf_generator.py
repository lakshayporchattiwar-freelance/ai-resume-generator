"""PDF generator using ReportLab per TRD Section 5 and Security Document Section 5."""

import html
import logging
from io import BytesIO
from typing import List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

from app.models.resume import (
    AchievementEntry, CertificationEntry, EducationEntry,
    ExperienceEntry, PersonalDetails, ProjectEntry, Resume,
    SkillGroup,
)

logger = logging.getLogger(__name__)

TEMPLATE_STYLES = {
    "modern": {"primary_color": "#1a1a2e", "accent_color": "#16213e", "font": "Helvetica"},
    "classic": {"primary_color": "#2c3e50", "accent_color": "#34495e", "font": "Times-Roman"},
    "compact": {"primary_color": "#1b1b1b", "accent_color": "#333333", "font": "Helvetica"},
}


class PDFGenerator:
    def generate(self, resume: Resume, template_id: str = "modern") -> bytes:
        try:
            buf = BytesIO()
            style_config = TEMPLATE_STYLES.get(template_id, TEMPLATE_STYLES["modern"])
            styles = getSampleStyleSheet()
            self._configure_styles(styles, style_config)

            doc = SimpleDocTemplate(
                buf,
                pagesize=A4,
                topMargin=0.5 * inch,
                bottomMargin=0.5 * inch,
                leftMargin=0.6 * inch,
                rightMargin=0.6 * inch,
            )

            elements = []
            self._add_personal_details(elements, resume.personal_details, styles)
            if resume.professional_summary:
                self._add_section(elements, "Professional Summary", resume.professional_summary, styles)
            if resume.experience:
                self._add_experience(elements, resume.experience, styles)
            if resume.education:
                self._add_education(elements, resume.education, styles)
            if resume.projects:
                self._add_projects(elements, resume.projects, styles)
            if resume.skills:
                self._add_skills(elements, resume.skills, styles)
            if resume.certifications:
                self._add_certifications(elements, resume.certifications, styles)
            if resume.achievements:
                self._add_achievements(elements, resume.achievements, styles)
            if resume.references:
                self._add_references(elements, resume.references, styles)

            doc.build(elements)
            pdf_bytes = buf.getvalue()
            logger.info("pdf_generated", extra={"detail": f"{len(pdf_bytes)} bytes"})
            return pdf_bytes
        except Exception as e:
            logger.error("pdf_generation_error", extra={"detail": str(e)[:200]})
            raise

    def _configure_styles(self, styles, config: dict):
        styles["Title"].fontName = config["font"]
        styles["Title"].fontSize = 22
        styles["Title"].textColor = _hex_to_color(config["primary_color"])
        styles["Heading2"].fontName = config["font"]
        styles["Heading2"].fontSize = 13
        styles["Heading2"].textColor = _hex_to_color(config["accent_color"])
        styles["Normal"].fontName = config["font"]
        styles["Normal"].fontSize = 10
        styles["Normal"].leading = 14

    def _esc(self, text: str) -> str:
        return html.escape(text or "")

    def _add_personal_details(self, elements, pd: PersonalDetails, styles):
        elements.append(Paragraph(self._esc(pd.full_name), styles["Title"]))
        sub_parts = []
        if pd.professional_title:
            sub_parts.append(self._esc(pd.professional_title))
        contact_parts = []
        if pd.email:
            contact_parts.append(self._esc(pd.email))
        if pd.phone:
            contact_parts.append(self._esc(pd.phone))
        if pd.location:
            contact_parts.append(self._esc(pd.location))
        if contact_parts:
            sub_parts.append(" | ".join(contact_parts))
        if pd.links:
            for link in pd.links:
                sub_parts.append(f'{self._esc(link.label)}: {self._esc(link.url)}')
        if sub_parts:
            elements.append(Paragraph("<br/>".join(sub_parts), styles["Normal"]))
        elements.append(Spacer(1, 6))
        elements.append(HRFlowable(width="100%", thickness=1, color=_hex_to_color(styles["Heading2"].textColor)))

    def _add_section(self, elements, title: str, content: str, styles):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(self._esc(title).upper(), styles["Heading2"]))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(self._esc(content), styles["Normal"]))

    def _add_experience(self, elements, entries: List[ExperienceEntry], styles):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("EXPERIENCE", styles["Heading2"]))
        for entry in entries:
            elements.append(Spacer(1, 6))
            header = f"<b>{self._esc(entry.job_title)}</b> at {self._esc(entry.company_name)}"
            date_range = f"{self._esc(entry.start_date)} - {self._esc(entry.end_date)}"
            elements.append(Paragraph(header, styles["Normal"]))
            elements.append(Paragraph(date_range, styles["Normal"]))
            if entry.description_bullets:
                for bullet in entry.description_bullets:
                    elements.append(Paragraph(f"&bull; {self._esc(bullet)}", styles["Normal"]))

    def _add_education(self, elements, entries: List[EducationEntry], styles):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("EDUCATION", styles["Heading2"]))
        for entry in entries:
            elements.append(Spacer(1, 6))
            elements.append(Paragraph(f"<b>{self._esc(entry.degree)}</b> - {self._esc(entry.institution_name)}", styles["Normal"]))
            if entry.end_date:
                elements.append(Paragraph(self._esc(entry.end_date), styles["Normal"]))
            if entry.details:
                elements.append(Paragraph(self._esc(entry.details), styles["Normal"]))

    def _add_projects(self, elements, entries: List[ProjectEntry], styles):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("PROJECTS", styles["Heading2"]))
        for entry in entries:
            elements.append(Spacer(1, 6))
            elements.append(Paragraph(f"<b>{self._esc(entry.project_name)}</b>", styles["Normal"]))
            if entry.description_bullets:
                for bullet in entry.description_bullets:
                    elements.append(Paragraph(f"&bull; {self._esc(bullet)}", styles["Normal"]))

    def _add_skills(self, elements, groups: List[SkillGroup], styles):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("SKILLS", styles["Heading2"]))
        for group in groups:
            label = self._esc(group.category_label) + ": " if group.category_label else ""
            elements.append(Paragraph(f"{label}{self._esc(', '.join(group.skills))}", styles["Normal"]))

    def _add_certifications(self, elements, entries: List[CertificationEntry], styles):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("CERTIFICATIONS", styles["Heading2"]))
        for entry in entries:
            text = f"<b>{self._esc(entry.certification_name)}</b>"
            if entry.issuing_organization:
                text += f" - {self._esc(entry.issuing_organization)}"
            elements.append(Paragraph(text, styles["Normal"]))

    def _add_achievements(self, elements, entries: List[AchievementEntry], styles):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("ACHIEVEMENTS", styles["Heading2"]))
        for entry in entries:
            elements.append(Paragraph(f"&bull; {self._esc(entry.statement)}", styles["Normal"]))

    def _add_references(self, elements, refs, styles):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("REFERENCES", styles["Heading2"]))
        from app.models.resume import ReferencesMode
        if isinstance(refs, ReferencesMode):
            elements.append(Paragraph("Available upon request", styles["Normal"]))
        elif isinstance(refs, list):
            for ref in refs:
                elements.append(Paragraph(f"{self._esc(ref.name)} - {self._esc(ref.relationship or '')}", styles["Normal"]))


def _hex_to_color(hex_str: str):
    from reportlab.lib.colors import HexColor
    return HexColor(hex_str)


pdf_generator = PDFGenerator()
