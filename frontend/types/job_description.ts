export type JDSourceType = "pasted_text" | "uploaded_file";
export type KeywordImportance = "required" | "preferred";
export type AnalysisConfidence = "high" | "medium" | "low";

export interface KeywordItem {
  term: string;
  importance: KeywordImportance;
  source_context?: string;
}

export interface JobDescriptionInput {
  source_type: JDSourceType;
  raw_text?: string;
  job_title?: string;
  company_name?: string;
}

export interface JobDescriptionAnalysis {
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  keywords: KeywordItem[];
  analysis_confidence: AnalysisConfidence;
}
