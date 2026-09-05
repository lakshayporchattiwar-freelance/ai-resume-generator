"""DOCX generator using python-docx with 5 professional templates."""

import logging
from io import BytesIO
from typing import List

from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

from app.models.resume import (
    AchievementEntry, CertificationEntry, EducationEntry,
    ExperienceEntry, PersonalDetails, ProjectEntry, Resume,
    SkillGroup, ReferencesMode, ReferenceEntry,
)

logger = logging.getLogger(__name__)

TEMPLATE_CONFIGS = {
    "academic": {
        "primary": RGBColor(0x1a, 0x3c, 0x5e),
        "heading_font": "Times New Roman",
        "body_font": "Times New Roman",
        "title_size": 22,
        "heading_size": 12,
        "body_size": 10,
        "center_name": True,
        "skill_table": False,
    },
    "developer": {
        "primary": RGBColor(0x25, 0x63, 0xeb),
        "heading_font": "Calibri",
        "body_font": "Calibri",
        "title_size": 20,
        "heading_size": 11,
        "body_size": 10,
        "center_name": False,
        "skill_table": True,
    },
    "executive": {
        "primary": RGBColor(0x00, 0x36, 0x70),
        "heading_font": "Times New Roman",
        "body_font": "Times New Roman",
        "title_size": 24,
        "heading_size": 12,
        "body_size": 10,
        "center_name": True,
        "skill_table": True,
    },
    "minimal": {
        "primary": RGBColor(0x00, 0x00, 0x00),
        "heading_font": "Calibri",
        "body_font": "Calibri",
        "title_size": 22,
        "heading_size": 11,
        "body_size": 10,
        "center_name": False,
        "skill_table": False,
    },
    "professional": {
        "primary": RGBColor(0x1f, 0x29, 0x37),
        "heading_font": "Calibri",
        "body_font": "Calibri",
        "title_size": 22,
        "heading_size": 11,
        "body_size": 10,
        "center_name": True,
        "skill_table": False,
    },
}


class DOCXGenerator:
    def generate(self, resume: Resume, template_id: str = "developer") -> bytes:
        try:
            doc = Document()
            cfg = TEMPLATE_CONFIGS.get(template_id, TEMPLATE_CONFIGS["developer"])

            style = doc.styles["Normal"]
            style.font.name = cfg["body_font"]
            style.font.size = Pt(cfg["body_size"])
            style.paragraph_format.space_after = Pt(2)
            style.paragraph_format.space_before = Pt(0)

            for section in doc.sections:
                section.top_margin = Cm(1.5)
                section.bottom_margin = Cm(1.5)
                section.left_margin = Cm(1.8)
                section.right_margin = Cm(1.8)

            self._add_header(doc, resume.personal_details, cfg)

            if resume.professional_summary:
                self._add_section_heading(doc, "Professional Summary", cfg)
                p = doc.add_paragraph(resume.professional_summary)
                p.paragraph_format.space_after = Pt(4)

            if resume.experience:
                self._add_section_heading(doc, "Experience", cfg)
                for entry in resume.experience:
                    self._add_experience_entry(doc, entry, cfg)

            if resume.education:
                self._add_section_heading(doc, "Education", cfg)
                for entry in resume.education:
                    self._add_education_entry(doc, entry, cfg)

            if resume.projects:
                self._add_section_heading(doc, "Projects", cfg)
                for entry in resume.projects:
                    self._add_project_entry(doc, entry, cfg)

            if resume.skills:
                self._add_section_heading(doc, "Technical Skills", cfg)
                self._add_skills(doc, resume.skills, cfg)

            if resume.certifications:
                self._add_section_heading(doc, "Certifications", cfg)
                for entry in resume.certifications:
                    self._add_certification_entry(doc, entry, cfg)

            if resume.achievements:
                self._add_section_heading(doc, "Achievements", cfg)
                for entry in resume.achievements:
                    self._add_achievement_entry(doc, entry, cfg)

            if resume.references:
                self._add_section_heading(doc, "References", cfg)
                if isinstance(resume.references, ReferencesMode):
                    doc.add_paragraph("Available upon request")
                elif isinstance(resume.references, list):
                    for ref in resume.references:
                        text = ref.name
                        if ref.relationship:
                            text += f" — {ref.relationship}"
                        doc.add_paragraph(text)

            buf = BytesIO()
            doc.save(buf)
            docx_bytes = buf.getvalue()
            logger.info("docx_generated", extra={"detail": f"{len(docx_bytes)} bytes, template={template_id}"})
            return docx_bytes
        except Exception as e:
            logger.error("docx_generation_error", extra={"detail": str(e)[:200]})
            raise

    def _add_header(self, doc: Document, pd: PersonalDetails, cfg: dict):
        name_para = doc.add_paragraph()
        name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER if cfg["center_name"] else WD_ALIGN_PARAGRAPH.LEFT
        run = name_para.add_run(pd.full_name)
        run.font.size = Pt(cfg["title_size"])
        run.font.color.rgb = cfg["primary"]
        run.bold = True
        run.font.name = cfg["heading_font"]
        name_para.paragraph_format.space_after = Pt(2)

        if pd.professional_title:
            title_para = doc.add_paragraph()
            title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER if cfg["center_name"] else WD_ALIGN_PARAGRAPH.LEFT
            run = title_para.add_run(pd.professional_title)
            run.font.size = Pt(11)
            run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
            run.italic = True
            title_para.paragraph_format.space_after = Pt(2)

        contact_parts = []
        if pd.email:
            contact_parts.append(pd.email)
        if pd.phone:
            contact_parts.append(pd.phone)
        if pd.location:
            contact_parts.append(pd.location)

        link_parts = []
        if pd.links:
            for link in pd.links:
                link_parts.append(f"{link.label}: {link.url}")

        all_contact = contact_parts + link_parts
        if all_contact:
            contact_para = doc.add_paragraph()
            contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER if cfg["center_name"] else WD_ALIGN_PARAGRAPH.LEFT
            run = contact_para.add_run(" | ".join(all_contact))
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
            contact_para.paragraph_format.space_after = Pt(4)

        self._add_horizontal_rule(doc, cfg["primary"])

    def _add_section_heading(self, doc: Document, text: str, cfg: dict):
        para = doc.add_paragraph()
        run = para.add_run(text.upper())
        run.font.size = Pt(cfg["heading_size"])
        run.font.color.rgb = cfg["primary"]
        run.bold = True
        run.font.name = cfg["heading_font"]
        para.paragraph_format.space_before = Pt(10)
        para.paragraph_format.space_after = Pt(2)

        self._add_horizontal_rule(doc, cfg["primary"])

    def _add_horizontal_rule(self, doc: Document, color: RGBColor):
        para = doc.add_paragraph()
        para.paragraph_format.space_before = Pt(0)
        para.paragraph_format.space_after = Pt(4)
        pPr = para._p.get_or_add_pPr()
        pBdr = pPr.makeelement(qn("w:pBdr"), {})
        bottom = pBdr.makeelement(qn("w:bottom"), {
            qn("w:val"): "single",
            qn("w:sz"): "4",
            qn("w:space"): "1",
            qn("w:color"): f"{color[0]:02x}{color[1]:02x}{color[2]:02x}",
        })
        pBdr.append(bottom)
        pPr.append(pBdr)

    def _add_experience_entry(self, doc: Document, entry: ExperienceEntry, cfg: dict):
        row1 = doc.add_paragraph()
        run = row1.add_run(f"{entry.job_title}")
        run.bold = True
        run.font.size = Pt(cfg["body_size"] + 1)
        row1.paragraph_format.space_after = Pt(0)

        meta_parts = []
        if entry.company_name:
            meta_parts.append(entry.company_name)
        if entry.location:
            meta_parts.append(entry.location)
        date_str = f"{entry.start_date} — {entry.end_date}"

        row2 = doc.add_paragraph()
        run = row2.add_run(" | ".join(meta_parts) + f"  •  {date_str}" if meta_parts else date_str)
        run.font.size = Pt(cfg["body_size"] - 0.5)
        run.font.color.rgb = RGBColor(0x6b, 0x72, 0x80)
        row2.paragraph_format.space_after = Pt(2)

        if entry.description_bullets:
            for bullet in entry.description_bullets:
                bp = doc.add_paragraph(bullet, style="List Bullet")
                for run in bp.runs:
                    run.font.size = Pt(cfg["body_size"])
                bp.paragraph_format.space_after = Pt(1)

    def _add_education_entry(self, doc: Document, entry: EducationEntry, cfg: dict):
        row1 = doc.add_paragraph()
        run = row1.add_run(f"{entry.degree}")
        run.bold = True
        run.font.size = Pt(cfg["body_size"] + 1)
        row1.paragraph_format.space_after = Pt(0)

        meta_parts = []
        if entry.institution_name:
            meta_parts.append(entry.institution_name)
        date_parts = []
        if entry.start_date and entry.end_date:
            date_parts.append(f"{entry.start_date} — {entry.end_date}")
        elif entry.end_date:
            date_parts.append(entry.end_date)

        row2 = doc.add_paragraph()
        run = row2.add_run(" | ".join(meta_parts + date_parts))
        run.font.size = Pt(cfg["body_size"] - 0.5)
        run.font.color.rgb = RGBColor(0x6b, 0x72, 0x80)
        row2.paragraph_format.space_after = Pt(1)

        if entry.details:
            dp = doc.add_paragraph(entry.details)
            for run in dp.runs:
                run.font.size = Pt(cfg["body_size"])
            dp.paragraph_format.space_after = Pt(1)

    def _add_project_entry(self, doc: Document, entry: ProjectEntry, cfg: dict):
        row1 = doc.add_paragraph()
        run = row1.add_run(entry.project_name)
        run.bold = True
        run.font.size = Pt(cfg["body_size"] + 1)

        meta_parts = []
        if entry.link:
            meta_parts.append(entry.link)
        if entry.timeframe:
            meta_parts.append(entry.timeframe)
        if meta_parts:
            run2 = row1.add_run(f"  |  {' | '.join(meta_parts)}")
            run2.font.size = Pt(cfg["body_size"] - 0.5)
            run2.font.color.rgb = RGBColor(0x6b, 0x72, 0x80)

        row1.paragraph_format.space_after = Pt(2)

        if entry.description_bullets:
            for bullet in entry.description_bullets:
                bp = doc.add_paragraph(bullet, style="List Bullet")
                for run in bp.runs:
                    run.font.size = Pt(cfg["body_size"])
                bp.paragraph_format.space_after = Pt(1)

    def _add_skills(self, doc: Document, groups: List[SkillGroup], cfg: dict):
        if cfg["skill_table"]:
            table = doc.add_table(rows=len(groups), cols=2)
            table.alignment = WD_TABLE_ALIGNMENT.LEFT
            for i, group in enumerate(groups):
                label = group.category_label or "Skills"
                cell_label = table.rows[i].cells[0]
                cell_label.text = ""
                run = cell_label.paragraphs[0].add_run(f"{label}:")
                run.bold = True
                run.font.size = Pt(cfg["body_size"])
                run.font.color.rgb = cfg["primary"]

                cell_value = table.rows[i].cells[1]
                cell_value.text = ""
                run = cell_value.paragraphs[0].add_run(", ".join(group.skills))
                run.font.size = Pt(cfg["body_size"])
        else:
            for group in groups:
                p = doc.add_paragraph()
                if group.category_label:
                    run = p.add_run(f"{group.category_label}: ")
                    run.bold = True
                    run.font.color.rgb = cfg["primary"]
                run = p.add_run(", ".join(group.skills))
                p.paragraph_format.space_after = Pt(1)

    def _add_certification_entry(self, doc: Document, entry: CertificationEntry, cfg: dict):
        p = doc.add_paragraph()
        run = p.add_run(entry.certification_name)
        run.bold = True
        if entry.issuing_organization:
            run2 = p.add_run(f" — {entry.issuing_organization}")
            run2.font.color.rgb = RGBColor(0x6b, 0x72, 0x80)
        if entry.date_obtained:
            run3 = p.add_run(f"  •  {entry.date_obtained}")
            run3.font.color.rgb = RGBColor(0x6b, 0x72, 0x80)
            run3.font.size = Pt(cfg["body_size"] - 0.5)
        p.paragraph_format.space_after = Pt(1)

    def _add_achievement_entry(self, doc: Document, entry: AchievementEntry, cfg: dict):
        bp = doc.add_paragraph(entry.statement, style="List Bullet")
        for run in bp.runs:
            run.font.size = Pt(cfg["body_size"])


docx_generator = DOCXGenerator()
