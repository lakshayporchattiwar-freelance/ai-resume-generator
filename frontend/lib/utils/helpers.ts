import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

export function formatDate(date: string): string {
  if (!date || date === "present" || date === "expected") return date;
  if (date.length === 7) {
    const [year, month] = date.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  }
  return date;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function isExportReady(resume: import("@/types/resume").Resume): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!resume.personal_details?.full_name?.trim()) {
    missing.push("personal_details.full_name");
  }
  const hasContent =
    (resume.experience && resume.experience.length > 0) ||
    (resume.education && resume.education.length > 0) ||
    (resume.projects && resume.projects.length > 0);
  if (!hasContent) {
    missing.push("At least one of: experience, education, or projects");
  }
  return { ready: missing.length === 0, missing };
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-success-600";
  if (score >= 50) return "text-warning-600";
  return "text-error-600";
}

export function getScoreBgColor(score: number): string {
  if (score >= 75) return "bg-success-600";
  if (score >= 50) return "bg-warning-600";
  return "bg-error-600";
}

export function getScoreBgTint(score: number): string {
  if (score >= 75) return "bg-success-100";
  if (score >= 50) return "bg-warning-100";
  return "bg-error-100";
}
