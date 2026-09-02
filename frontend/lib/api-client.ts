import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface ApiCallOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | undefined> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || undefined;
  }

  private async request<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
    const { method = "POST", body, isFormData = false } = options;
    const headers: Record<string, string> = {};

    if (!isFormData && body) {
      headers["Content-Type"] = "application/json";
    }

    const token = await this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = { method, headers };

    if (body) {
      fetchOptions.body = isFormData ? (body as FormData) : JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, fetchOptions);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: { code: "UNKNOWN_ERROR", message: `HTTP ${response.status}` } };
      }
      const errMsg = errorData?.error?.message || errorData?.message || `HTTP ${response.status}`;
      throw { error: { code: errorData?.error?.code || "API_ERROR", message: errMsg } };
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response as unknown as T;
  }

  async parseResume(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<import("@/types/api").ParsedResumeResult>("/api/v1/resume/parse", {
      body: formData,
      isFormData: true,
    });
  }

  async validateResume(resume: import("@/types/resume").Resume) {
    return this.request<import("@/types/api").ResumeValidationResult>("/api/v1/resume/validate", {
      body: { resume },
    });
  }

  async analyzeJobDescriptionText(text: string, jobTitle?: string, companyName?: string) {
    const formData = new FormData();
    formData.append("text", text);
    if (jobTitle) formData.append("job_title", jobTitle);
    if (companyName) formData.append("company_name", companyName);
    return this.request<import("@/types/job_description").JobDescriptionAnalysis>("/api/v1/job-description/analyze", {
      body: formData,
      isFormData: true,
    });
  }

  async analyzeJobDescriptionFile(file: File, jobTitle?: string, companyName?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (jobTitle) formData.append("job_title", jobTitle);
    if (companyName) formData.append("company_name", companyName);
    return this.request<import("@/types/job_description").JobDescriptionAnalysis>("/api/v1/job-description/analyze", {
      body: formData,
      isFormData: true,
    });
  }

  async aiGenerate(request: import("@/types/analysis").AIGenerationRequest) {
    return this.request<import("@/types/analysis").AIGenerationResult>("/api/v1/ai/generate", {
      body: { request },
    });
  }

  async scoreResume(resume: import("@/types/resume").Resume, jdAnalysis: import("@/types/job_description").JobDescriptionAnalysis) {
    return this.request<import("@/types/analysis").ATSScoreResult>("/api/v1/analysis/score", {
      body: { resume, job_description_analysis: jdAnalysis },
    });
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async exportPdf(resume: import("@/types/resume").Resume, templateId: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/export/pdf`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ resume, template_id: templateId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { code: "EXPORT_ERROR", message: "Export failed" } }));
      throw errorData;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : "resume.pdf";
    return { blob, filename };
  }

  async exportDocx(resume: import("@/types/resume").Resume, templateId: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/export/docx`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ resume, template_id: templateId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { code: "EXPORT_ERROR", message: "Export failed" } }));
      throw errorData;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : "resume.docx";
    return { blob, filename };
  }
}

export const apiClient = new ApiClient(API_BASE);
