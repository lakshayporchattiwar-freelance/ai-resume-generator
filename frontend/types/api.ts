export type SectionConfidence = "high" | "needs_review" | "not_found";

export interface ParsedResumeResult {
  resume: import("./resume").Resume;
  section_confidence: Record<string, SectionConfidence>;
}

export interface ResumeValidationResult {
  is_export_ready: boolean;
  missing_required_fields: string[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
}
