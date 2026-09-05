"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, FileText, ZoomIn, ZoomOut, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useResumeStore } from "@/stores/useResumeStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { Header } from "@/components/layout/Header";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { apiClient } from "@/lib/api-client";
import { isExportReady, downloadBlob, formatDate } from "@/lib/utils/helpers";
import Link from "next/link";

const TEMPLATES = [
  { id: "academic", name: "Academic", description: "Formal Times New Roman layout, lined sections" },
  { id: "developer", name: "Developer", description: "Clean modern style with skill tables" },
  { id: "executive", name: "Executive", description: "Navy blue accents, professional table layout" },
  { id: "minimal", name: "Minimal", description: "Black & white, ultra-clean, maximum ATS compatibility" },
  { id: "professional", name: "Professional", description: "Classic centered name, balanced sections" },
];

const TEMPLATE_STYLES: Record<string, { primaryColor: string; fontFamily: string; centerName: boolean; skillTable: boolean }> = {
  academic: { primaryColor: "#1a3c5e", fontFamily: "Georgia, 'Times New Roman', serif", centerName: true, skillTable: false },
  developer: { primaryColor: "#2563eb", fontFamily: "system-ui, -apple-system, sans-serif", centerName: false, skillTable: true },
  executive: { primaryColor: "#003670", fontFamily: "Georgia, 'Times New Roman', serif", centerName: true, skillTable: true },
  minimal: { primaryColor: "#000000", fontFamily: "system-ui, -apple-system, sans-serif", centerName: false, skillTable: false },
  professional: { primaryColor: "#1f2937", fontFamily: "system-ui, -apple-system, sans-serif", centerName: true, skillTable: false },
};

function ResumePreview() {
  const resume = useResumeStore((s) => s.resume);
  const templateId = useTemplateStore((s) => s.selectedTemplateId);
  const zoom = useTemplateStore((s) => s.zoom);
  const pd = resume.personal_details;
  const tStyle = TEMPLATE_STYLES[templateId] || TEMPLATE_STYLES.developer;
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const paperWidth = 794;
      const maxScale = Math.min(1, containerWidth / paperWidth);
      setAutoScale(maxScale);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const effectiveScale = (zoom / 100) * autoScale;
  const s = tStyle;

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        className="bg-white shadow-sm rounded-lg origin-top"
        style={{ transform: `scale(${effectiveScale})`, width: "794px", minHeight: "1123px", padding: "48px", fontFamily: s.fontFamily }}
      >
        <div style={{ textAlign: s.centerName ? "center" : "left" }}>
          <h1 style={{ fontSize: `${templateId === "executive" ? 28 : templateId === "academic" ? 24 : 22}px`, fontWeight: 700, color: s.primaryColor, marginBottom: "2px", letterSpacing: "-0.01em" }}>
            {pd.full_name || "Your Name"}
          </h1>
          {pd.professional_title && (
            <p style={{ fontSize: "14px", color: "#555555", marginBottom: "4px", fontStyle: "italic" }}>{pd.professional_title}</p>
          )}
          <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: s.centerName ? "center" : "flex-start", marginBottom: "12px" }}>
            {pd.email && <span>{pd.email}</span>}
            {pd.phone && <span>• {pd.phone}</span>}
            {pd.location && <span>• {pd.location}</span>}
            {(pd.links || []).map((l, i) => (
              <span key={i}>• {l.label}: {l.url}</span>
            ))}
          </div>
        </div>
        <div style={{ borderBottom: `1.5px solid ${s.primaryColor}`, marginBottom: "16px" }} />

        {resume.professional_summary && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: s.primaryColor, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${s.primaryColor}`, paddingBottom: "3px", marginBottom: "6px" }}>Professional Summary</h2>
            <p style={{ fontSize: "12px", color: "#3F3F46", lineHeight: 1.6 }}>{resume.professional_summary}</p>
          </div>
        )}

        {(resume.experience || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: s.primaryColor, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${s.primaryColor}`, paddingBottom: "3px", marginBottom: "6px" }}>Experience</h2>
            {(resume.experience || []).map((exp) => (
              <div key={exp.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: "13px", color: "#18181B" }}>{exp.job_title}</strong>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>{formatDate(exp.start_date)} — {formatDate(exp.end_date)}</span>
                </div>
                <p style={{ fontSize: "12px", color: "#52525B", marginBottom: "2px" }}>{exp.company_name}{exp.location ? ` • ${exp.location}` : ""}</p>
                {(exp.description_bullets || []).filter(Boolean).map((b, i) => (
                  <li key={i} style={{ fontSize: "12px", color: "#3F3F46", marginLeft: "14px", lineHeight: 1.5, marginBottom: "1px" }}>{b}</li>
                ))}
              </div>
            ))}
          </div>
        )}

        {(resume.education || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: s.primaryColor, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${s.primaryColor}`, paddingBottom: "3px", marginBottom: "6px" }}>Education</h2>
            {(resume.education || []).map((edu) => (
              <div key={edu.id} style={{ marginBottom: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: "13px", color: "#18181B" }}>{edu.degree}</strong>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>{formatDate(edu.start_date || "")} — {formatDate(edu.end_date || "")}</span>
                </div>
                <p style={{ fontSize: "12px", color: "#52525B" }}>{edu.institution_name}</p>
                {edu.details && <p style={{ fontSize: "11px", color: "#6b7280" }}>{edu.details}</p>}
              </div>
            ))}
          </div>
        )}

        {(resume.projects || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: s.primaryColor, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${s.primaryColor}`, paddingBottom: "3px", marginBottom: "6px" }}>Projects</h2>
            {(resume.projects || []).map((proj) => (
              <div key={proj.id} style={{ marginBottom: "8px" }}>
                <strong style={{ fontSize: "13px", color: "#18181B" }}>{proj.project_name}</strong>
                {proj.link && <span style={{ fontSize: "11px", color: "#6b7280" }}> • {proj.link}</span>}
                {proj.timeframe && <span style={{ fontSize: "11px", color: "#6b7280" }}> • {proj.timeframe}</span>}
                {(proj.description_bullets || []).filter(Boolean).map((b, i) => (
                  <li key={i} style={{ fontSize: "12px", color: "#3F3F46", marginLeft: "14px", lineHeight: 1.5, marginBottom: "1px" }}>{b}</li>
                ))}
              </div>
            ))}
          </div>
        )}

        {(resume.skills || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: s.primaryColor, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${s.primaryColor}`, paddingBottom: "3px", marginBottom: "6px" }}>Technical Skills</h2>
            {s.skillTable ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                {(resume.skills || []).map((sg, i) => (
                  <tr key={i}>
                    <td style={{ width: "140px", verticalAlign: "top", padding: "1px 8px 1px 0" }}><strong style={{ fontSize: "12px", color: s.primaryColor }}>{sg.category_label || "Skills"}:</strong></td>
                    <td style={{ fontSize: "12px", color: "#3F3F46", padding: "1px 0" }}>{sg.skills.join(", ")}</td>
                  </tr>
                ))}
              </table>
            ) : (
              (resume.skills || []).map((sg, i) => (
                <p key={i} style={{ fontSize: "12px", color: "#3F3F46", marginBottom: "2px" }}>
                  {sg.category_label && <strong style={{ color: s.primaryColor }}>{sg.category_label}: </strong>}
                  {sg.skills.join(", ")}
                </p>
              ))
            )}
          </div>
        )}

        {(resume.certifications || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: s.primaryColor, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${s.primaryColor}`, paddingBottom: "3px", marginBottom: "6px" }}>Certifications</h2>
            {(resume.certifications || []).map((cert) => (
              <p key={cert.id} style={{ fontSize: "12px", color: "#3F3F46", marginBottom: "2px" }}>
                <strong>{cert.certification_name}</strong>
                {cert.issuing_organization && <span style={{ color: "#6b7280" }}> — {cert.issuing_organization}</span>}
              </p>
            ))}
          </div>
        )}

        {(resume.achievements || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: s.primaryColor, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${s.primaryColor}`, paddingBottom: "3px", marginBottom: "6px" }}>Achievements</h2>
            {(resume.achievements || []).map((ach) => (
              <li key={ach.id} style={{ fontSize: "12px", color: "#3F3F46", marginLeft: "14px", lineHeight: 1.5, marginBottom: "1px" }}>{ach.statement}</li>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const resume = useResumeStore((s) => s.resume);
  const templateId = useTemplateStore((s) => s.selectedTemplateId);
  const zoom = useTemplateStore((s) => s.zoom);
  const setTemplate = useTemplateStore((s) => s.setTemplate);
  const setZoom = useTemplateStore((s) => s.setZoom);
  const [exportModal, setExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const ready = isExportReady(resume);

  async function handleExport() {
    if (!ready.ready) return;
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);
    try {
      if (exportFormat === "pdf") {
        const { blob, filename } = await apiClient.exportPdf(resume, templateId);
        downloadBlob(blob, filename);
      } else {
        const { blob, filename } = await apiClient.exportDocx(resume, templateId);
        downloadBlob(blob, filename);
      }
      setExportSuccess(true);
    } catch (err: unknown) {
      const errorObj = err as { error?: { message?: string } };
      const message = errorObj?.error?.message || (err instanceof Error ? err.message : "Export failed. Please try again.");
      setExportError(message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <RequireAuth>
      <Header />

      <div className="flex flex-col md:flex-row flex-1">
        <aside className="md:w-72 md:shrink-0 md:border-r border-b md:border-b-0 border-neutral-200 bg-neutral-50 p-4 md:p-6 overflow-y-auto">
          <h2 className="typography-heading-md text-neutral-900 mb-4">Template</h2>
          <div className="flex flex-row md:flex-col gap-3 mb-6 md:mb-8 overflow-x-auto md:overflow-x-visible">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={[
                  "rounded-xl border p-4 text-left transition-colors duration-150 min-w-[160px] md:min-w-0",
                  templateId === t.id
                    ? "border-accent-600 ring-[3px] ring-accent-100 bg-neutral-0"
                    : "border-neutral-200 bg-neutral-0 hover:border-neutral-300",
                ].join(" ")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="typography-label text-neutral-900">{t.name}</span>
                  <Badge variant="info" className="text-[10px]">ATS-safe</Badge>
                </div>
                <p className="typography-body-md text-neutral-500">{t.description}</p>
              </button>
            ))}
          </div>

          <h2 className="typography-heading-md text-neutral-900 mb-4">Zoom</h2>
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <Button variant="ghost" size="sm" onClick={() => setZoom(zoom - 10)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="typography-body-md text-neutral-600 w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(zoom + 10)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-row md:flex-col gap-3">
            <Button onClick={() => setExportModal(true)} disabled={!ready.ready} className="flex-1 md:w-full">
              <Download className="h-4 w-4" />
              Export
            </Button>
            {!ready.ready && (
              <p className="typography-caption text-neutral-400 hidden md:block">
                Complete required fields to enable export
              </p>
            )}
            <Link href="/build" className="flex-1 md:w-full">
              <Button variant="secondary" className="w-full">Edit</Button>
            </Link>
            <Link href="/analysis" className="flex-1 md:w-full">
              <Button variant="ghost" className="w-full">Score</Button>
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-neutral-100 p-4 md:p-8">
          <div className="flex justify-center">
            <div className="elevation-1 rounded-lg inline-block">
              <ResumePreview />
            </div>
          </div>
        </main>
      </div>

      <Modal open={exportModal} onClose={() => setExportModal(false)} title="Export Resume">
        <div className="flex flex-col gap-4">
          <div className="inline-flex rounded-lg bg-neutral-100 p-1">
            <button
              onClick={() => setExportFormat("pdf")}
              className={[
                "rounded-md px-4 py-1.5 typography-label transition-colors duration-150",
                exportFormat === "pdf"
                  ? "bg-neutral-0 text-neutral-900 border border-neutral-200"
                  : "text-neutral-500",
              ].join(" ")}
            >
              PDF
            </button>
            <button
              onClick={() => setExportFormat("docx")}
              className={[
                "rounded-md px-4 py-1.5 typography-label transition-colors duration-150",
                exportFormat === "docx"
                  ? "bg-neutral-0 text-neutral-900 border border-neutral-200"
                  : "text-neutral-500",
              ].join(" ")}
            >
              DOCX
            </button>
          </div>

          {exportError && (
            <div className="flex items-center gap-2 text-error-600">
              <AlertCircle className="h-4 w-4" />
              <p className="typography-body-md">{exportError}</p>
            </div>
          )}

          {exportSuccess && (
            <div className="flex items-center gap-2 text-success-600">
              <CheckCircle2 className="h-4 w-4" />
              <p className="typography-body-md">Downloaded successfully</p>
            </div>
          )}

          <Button onClick={handleExport} loading={exporting} className="w-full">
            <Download className="h-4 w-4" />
            Download {exportFormat.toUpperCase()}
          </Button>

          <p className="typography-caption text-neutral-400 text-center">
            {templateId} template, {exportFormat.toUpperCase()} format
          </p>
        </div>
      </Modal>
    </RequireAuth>
  );
}
