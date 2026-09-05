"""PDF generator using ReportLab with 5 professional templates."""

import html
import logging
from io import BytesIO
from typing import List, Optional

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, black, white, Color
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from app.models.resume import (
    AchievementEntry, CertificationEntry, EducationEntry,
    ExperienceEntry, PersonalDetails, ProjectEntry, Resume,
    SkillGroup,
)

logger = logging.getLogger(__name__)

TEMPLATES = {
    "academic": {
        "primary": HexColor("#1a3c5e"),
        "accent": HexColor("#2c5f8a"),
        "text": HexColor("#1a1a1a"),
        "muted": HexColor("#555555"),
        "rule": HexColor("#1a3c5e"),
        "font_title": "Times-Bold",
        "font_heading": "Times-Bold",
        "font_body": "Times-Roman",
        "title_size": 22,
        "heading_size": 12,
        "body_size": 10,
        "center_name": True,
        "section_rule": True,
        "skill_table": False,
    },
    "developer": {
        "primary": HexColor("#2563eb"),
        "accent": HexColor("#3b82f6"),
        "text": HexColor("#111827"),
        "muted": HexColor("#6b7280"),
        "rule": HexColor("#2563eb"),
        "font_title": "Helvetica-Bold",
        "font_heading": "Helvetica-Bold",
        "font_body": "Helvetica",
        "title_size": 20,
        "heading_size": 11,
        "body_size": 9.5,
        "center_name": False,
        "section_rule": True,
        "skill_table": True,
    },
    "executive": {
        "primary": HexColor("#003670"),
        "accent": HexColor("#1a56db"),
        "text": HexColor("#1a1a1a"),
        "muted": HexColor("#4b5563"),
        "rule": HexColor("#003670"),
        "font_title": "Times-Bold",
        "font_heading": "Times-Bold",
        "font_body": "Times-Roman",
        "title_size": 24,
        "heading_size": 12,
        "body_size": 10,
        "center_name": True,
        "section_rule": True,
        "skill_table": True,
    },
    "minimal": {
        "primary": HexColor("#000000"),
        "accent": HexColor("#333333"),
        "text": HexColor("#1a1a1a"),
        "muted": HexColor("#666666"),
        "rule": HexColor("#000000"),
        "font_title": "Helvetica-Bold",
        "font_heading": "Helvetica-Bold",
        "font_body": "Helvetica",
        "title_size": 22,
        "heading_size": 11,
        "body_size": 10,
        "center_name": False,
        "section_rule": True,
        "skill_table": False,
    },
    "professional": {
        "primary": HexColor("#1f2937"),
        "accent": HexColor("#374151"),
        "text": HexColor("#111827"),
        "muted": HexColor("#6b7280"),
        "rule": HexColor("#1f2937"),
        "font_title": "Helvetica-Bold",
        "font_heading": "Helvetica-Bold",
        "font_body": "Helvetica",
        "title_size": 22,
        "heading_size": 11,
        "body_size": 10,
        "center_name": True,
        "section_rule": True,
        "skill_table": False,
    },
}


def _esc(text: str) -> str:
    return html.escape(text or "")


class PDFGenerator:
    def generate(self, resume: Resume, template_id: str = "developer") -> bytes:
        try:
            buf = BytesIO()
            cfg = TEMPLATES.get(template_id, TEMPLATES["developer"])

            doc = SimpleDocTemplate(
                buf,
                pagesize=A4,
                topMargin=0.5 * inch,
                bottomMargin=0.5 * inch,
                leftMargin=0.65 * inch,
                rightMargin=0.65 * inch,
            )

            story: list = []
            self._build(story, resume, cfg)

            doc.build(story)
            pdf_bytes = buf.getvalue()
            logger.info("pdf_generated", extra={"detail": f"{len(pdf_bytes)} bytes, template={template_id}"})
            return pdf_bytes
        except Exception as e:
            logger.error("pdf_generation_error", extra={"detail": str(e)[:200]})
            raise

    def _build(self, story: list, resume: Resume, cfg: dict):
        styles = self._make_styles(cfg)

        self._add_header(story, resume.personal_details, cfg, styles)

        if resume.professional_summary:
            self._add_section(story, "Professional Summary", styles, cfg)
            story.append(Paragraph(_esc(resume.professional_summary), styles["body"]))

        if resume.experience:
            self._add_section(story, "Experience", styles, cfg)
            for entry in resume.experience:
                self._add_experience_entry(story, entry, styles, cfg)

        if resume.education:
            self._add_section(story, "Education", styles, cfg)
            for entry in resume.education:
                self._add_education_entry(story, entry, styles, cfg)

        if resume.projects:
            self._add_section(story, "Projects", styles, cfg)
            for entry in resume.projects:
                self._add_project_entry(story, entry, styles, cfg)

        if resume.skills:
            self._add_section(story, "Technical Skills", styles, cfg)
            self._add_skills(story, resume.skills, styles, cfg)

        if resume.certifications:
            self._add_section(story, "Certifications", styles, cfg)
            for entry in resume.certifications:
                self._add_certification_entry(story, entry, styles, cfg)

        if resume.achievements:
            self._add_section(story, "Achievements", styles, cfg)
            for entry in resume.achievements:
                self._add_achievement_entry(story, entry, styles, cfg)

        if resume.references:
            self._add_section(story, "References", styles, cfg)
            from app.models.resume import ReferencesMode
            if isinstance(resume.references, ReferencesMode):
                story.append(Paragraph("Available upon request", styles["body"]))
            elif isinstance(resume.references, list):
                for ref in resume.references:
                    story.append(Paragraph(
                        f"{_esc(ref.name)}" + (f" — {_esc(ref.relationship or '')}" if ref.relationship else ""),
                        styles["body"],
                    ))

    def _make_styles(self, cfg: dict) -> dict:
        base = getSampleStyleSheet()
        return {
            "name": ParagraphStyle(
                "Name", parent=base["Normal"],
                fontName=cfg["font_title"], fontSize=cfg["title_size"],
                textColor=cfg["primary"], leading=cfg["title_size"] + 4,
                alignment=TA_CENTER if cfg["center_name"] else TA_LEFT,
                spaceAfter=2,
            ),
            "subtitle": ParagraphStyle(
                "Subtitle", parent=base["Normal"],
                fontName=cfg["font_body"], fontSize=11,
                textColor=cfg["muted"], leading=14,
                alignment=TA_CENTER if cfg["center_name"] else TA_LEFT,
                spaceAfter=4,
            ),
            "contact": ParagraphStyle(
                "Contact", parent=base["Normal"],
                fontName=cfg["font_body"], fontSize=9,
                textColor=cfg["muted"], leading=12,
                alignment=TA_CENTER if cfg["center_name"] else TA_LEFT,
                spaceAfter=6,
            ),
            "heading": ParagraphStyle(
                "Heading", parent=base["Normal"],
                fontName=cfg["font_heading"], fontSize=cfg["heading_size"],
                textColor=cfg["primary"], leading=cfg["heading_size"] + 4,
                spaceBefore=10, spaceAfter=2,
                textTransform="uppercase",
            ),
            "body": ParagraphStyle(
                "Body", parent=base["Normal"],
                fontName=cfg["font_body"], fontSize=cfg["body_size"],
                textColor=cfg["text"], leading=cfg["body_size"] + 4,
                alignment=TA_JUSTIFY,
            ),
            "job_title": ParagraphStyle(
                "JobTitle", parent=base["Normal"],
                fontName=cfg["font_heading"], fontSize=cfg["body_size"] + 1,
                textColor=cfg["text"], leading=cfg["body_size"] + 5,
            ),
            "job_meta": ParagraphStyle(
                "JobMeta", parent=base["Normal"],
                fontName=cfg["font_body"], fontSize=cfg["body_size"] - 0.5,
                textColor=cfg["muted"], leading=cfg["body_size"] + 2,
            ),
            "bullet": ParagraphStyle(
                "Bullet", parent=base["Normal"],
                fontName=cfg["font_body"], fontSize=cfg["body_size"],
                textColor=cfg["text"], leading=cfg["body_size"] + 4,
                leftIndent=14, bulletIndent=0,
                alignment=TA_JUSTIFY,
            ),
            "skill_label": ParagraphStyle(
                "SkillLabel", parent=base["Normal"],
                fontName=cfg["font_heading"], fontSize=cfg["body_size"],
                textColor=cfg["primary"], leading=cfg["body_size"] + 3,
            ),
            "skill_value": ParagraphStyle(
                "SkillValue", parent=base["Normal"],
                fontName=cfg["font_body"], fontSize=cfg["body_size"],
                textColor=cfg["text"], leading=cfg["body_size"] + 3,
            ),
        }

    def _add_header(self, story: list, pd: PersonalDetails, cfg: dict, styles: dict):
        story.append(Paragraph(_esc(pd.full_name), styles["name"]))

        if pd.professional_title:
            story.append(Paragraph(_esc(pd.professional_title), styles["subtitle"]))

        contact_parts = []
        if pd.email:
            contact_parts.append(_esc(pd.email))
        if pd.phone:
            contact_parts.append(_esc(pd.phone))
        if pd.location:
            contact_parts.append(_esc(pd.location))

        link_parts = []
        if pd.links:
            for link in pd.links:
                link_parts.append(f'{_esc(link.label)}: {_esc(link.url)}')

        contact_line = " &nbsp;&bull;&nbsp; ".join(contact_parts)
        if link_parts:
            contact_line += " &nbsp;&bull;&nbsp; " + " &nbsp;&bull;&nbsp; ".join(link_parts)

        if contact_line:
            story.append(Paragraph(contact_line, styles["contact"]))

        story.append(HRFlowable(
            width="100%", thickness=1.2,
            color=cfg["rule"], spaceBefore=4, spaceAfter=6,
        ))

    def _add_section(self, story: list, title: str, styles: dict, cfg: dict):
        story.append(Spacer(1, 6))
        story.append(Paragraph(title.upper(), styles["heading"]))
        story.append(HRFlowable(
            width="100%", thickness=0.5,
            color=cfg["rule"], spaceBefore=0, spaceAfter=4,
        ))

    def _add_experience_entry(self, story: list, entry: ExperienceEntry, styles: dict, cfg: dict):
        row1 = f"<b>{_esc(entry.job_title)}</b>"
        row1_right = f"{_esc(entry.start_date)} — {_esc(entry.end_date)}"

        row2_parts = []
        if entry.company_name:
            row2_parts.append(_esc(entry.company_name))
        if entry.location:
            row2_parts.append(_esc(entry.location))
        row2 = ", ".join(row2_parts) if row2_parts else ""

        story.append(Paragraph(row1, styles["job_title"]))
        story.append(Paragraph(
            f'{row2} &nbsp;&bull;&nbsp; {row1_right}' if row2 else row1_right,
            styles["job_meta"],
        ))

        if entry.description_bullets:
            for bullet in entry.description_bullets:
                story.append(Paragraph(
                    f'<bullet>&bull;</bullet> {_esc(bullet)}',
                    styles["bullet"],
                ))
        story.append(Spacer(1, 4))

    def _add_education_entry(self, story: list, entry: EducationEntry, styles: dict, cfg: dict):
        row1 = f"<b>{_esc(entry.degree)}</b>"
        row1_right = ""
        if entry.start_date and entry.end_date:
            row1_right = f"{_esc(entry.start_date)} — {_esc(entry.end_date)}"
        elif entry.end_date:
            row1_right = _esc(entry.end_date)

        story.append(Paragraph(row1, styles["job_title"]))
        inst_parts = []
        if entry.institution_name:
            inst_parts.append(_esc(entry.institution_name))
        if row1_right:
            inst_parts.append(row1_right)
        story.append(Paragraph(" &nbsp;&bull;&nbsp; ".join(inst_parts), styles["job_meta"]))
        if entry.details:
            story.append(Paragraph(_esc(entry.details), styles["body"]))
        story.append(Spacer(1, 3))

    def _add_project_entry(self, story: list, entry: ProjectEntry, styles: dict, cfg: dict):
        row1 = f"<b>{_esc(entry.project_name)}</b>"
        if entry.link:
            row1 += f" &nbsp;&bull;&nbsp; {_esc(entry.link)}"
        if entry.timeframe:
            row1 += f" &nbsp;&bull;&nbsp; {_esc(entry.timeframe)}"

        story.append(Paragraph(row1, styles["job_title"]))

        if entry.description_bullets:
            for bullet in entry.description_bullets:
                story.append(Paragraph(
                    f'<bullet>&bull;</bullet> {_esc(bullet)}',
                    styles["bullet"],
                ))
        story.append(Spacer(1, 3))

    def _add_skills(self, story: list, groups: List[SkillGroup], styles: dict, cfg: dict):
        if cfg["skill_table"]:
            table_data = []
            for group in groups:
                label = _esc(group.category_label or "Skills")
                skills_str = _esc(", ".join(group.skills))
                table_data.append([
                    Paragraph(f"<b>{label}</b>", styles["skill_label"]),
                    Paragraph(skills_str, styles["skill_value"]),
                ])

            avail_width = A4[0] - 0.65 * inch * 2
            col_widths = [1.5 * inch, avail_width - 1.5 * inch]
            t = Table(table_data, colWidths=col_widths)
            t.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(t)
        else:
            for group in groups:
                label = f"<b>{_esc(group.category_label or 'Skills')}:</b> " if group.category_label else ""
                skills_str = _esc(", ".join(group.skills))
                story.append(Paragraph(f"{label}{skills_str}", styles["body"]))

    def _add_certification_entry(self, story: list, entry: CertificationEntry, styles: dict, cfg: dict):
        text = f"<b>{_esc(entry.certification_name)}</b>"
        if entry.issuing_organization:
            text += f" — {_esc(entry.issuing_organization)}"
        date_parts = []
        if entry.date_obtained:
            date_parts.append(_esc(entry.date_obtained))
        if date_parts:
            text += f" &nbsp;&bull;&nbsp; {' '.join(date_parts)}"
        story.append(Paragraph(text, styles["body"]))

    def _add_achievement_entry(self, story: list, entry: AchievementEntry, styles: dict, cfg: dict):
        story.append(Paragraph(
            f'<bullet>&bull;</bullet> {_esc(entry.statement)}',
            styles["bullet"],
        ))


pdf_generator = PDFGenerator()
