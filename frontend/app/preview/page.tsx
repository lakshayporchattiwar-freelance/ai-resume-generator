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
  { id: "modern", name: "Modern", description: "Clean layout with distinct section headers" },
  { id: "classic", name: "Classic", description: "Traditional format with centered headings" },
  { id: "compact", name: "Compact", description: "Space-efficient for experienced professionals" },
];

function ResumePreview() {
  const resume = useResumeStore((s) => s.resume);
  const templateId = useTemplateStore((s) => s.selectedTemplateId);
  const zoom = useTemplateStore((s) => s.zoom);
  const pd = resume.personal_details;
  const isClassic = templateId === "classic";
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

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        className="bg-white shadow-sm rounded-lg origin-top"
        style={{ transform: `scale(${effectiveScale})`, width: "794px", minHeight: "1123px", padding: "48px" }}
      >
        <div className={isClassic ? "text-center" : ""}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#18181B", marginBottom: "4px" }}>
            {pd.full_name || "Your Name"}
          </h1>
          {pd.professional_title && (
            <p style={{ fontSize: "16px", color: "#52525B", marginBottom: "8px" }}>{pd.professional_title}</p>
          )}
          <div style={{ fontSize: "13px", color: "#71717A", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: isClassic ? "center" : "flex-start", marginBottom: "16px" }}>
            {pd.email && <span>{pd.email}</span>}
            {pd.phone && <span>{pd.phone}</span>}
            {pd.location && <span>{pd.location}</span>}
            {(pd.links || []).map((l, i) => (
              <span key={i}>{l.label}</span>
            ))}
          </div>
        </div>

        {resume.professional_summary && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E4E4E7", paddingBottom: "4px", marginBottom: "8px" }}>Summary</h2>
            <p style={{ fontSize: "13px", color: "#3F3F46", lineHeight: 1.6 }}>{resume.professional_summary}</p>
          </div>
        )}

        {(resume.experience || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E4E4E7", paddingBottom: "4px", marginBottom: "8px" }}>Experience</h2>
            {(resume.experience || []).map((exp) => (
              <div key={exp.id} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: "14px", color: "#18181B" }}>{exp.job_title}</strong>
                  <span style={{ fontSize: "12px", color: "#71717A" }}>{formatDate(exp.start_date)} — {formatDate(exp.end_date)}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#52525B" }}>{exp.company_name}</p>
                {(exp.description_bullets || []).filter(Boolean).map((b, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "#3F3F46", marginLeft: "16px", lineHeight: 1.5 }}>{b}</li>
                ))}
              </div>
            ))}
          </div>
        )}

        {(resume.education || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E4E4E7", paddingBottom: "4px", marginBottom: "8px" }}>Education</h2>
            {(resume.education || []).map((edu) => (
              <div key={edu.id} style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: "14px", color: "#18181B" }}>{edu.degree}</strong>
                  <span style={{ fontSize: "12px", color: "#71717A" }}>{formatDate(edu.start_date || "")} — {formatDate(edu.end_date || "")}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#52525B" }}>{edu.institution_name}</p>
              </div>
            ))}
          </div>
        )}

        {(resume.skills || []).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E4E4E7", paddingBottom: "4px", marginBottom: "8px" }}>Skills</h2>
            {(resume.skills || []).map((sg, i) => (
              <p key={i} style={{ fontSize: "13px", color: "#3F3F46", marginBottom: "4px" }}>
                {sg.category_label && <strong>{sg.category_label}: </strong>}
                {sg.skills.join(", ")}
              </p>
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
