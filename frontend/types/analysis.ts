export type ActionType =
  | "generate_summary"
  | "rewrite_summary"
  | "rewrite_experience_bullets"
  | "rewrite_project_description"
  | "suggest_achievement_phrasing";

export type RecommendationPriority = "high" | "medium" | "low";
export type RelatedSection =
  | "personal_details"
  | "professional_summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "achievements"
  | "references";

export interface SubScores {
  keyword_coverage: number;
  skills_alignment: number;
  experience_relevance: number;
  formatting_compatibility: number;
}

export interface Recommendation {
  priority: RecommendationPriority;
  message: string;
  related_section?: RelatedSection | null;
}

export interface ATSScoreResult {
  overall_score: number;
  sub_scores: SubScores;
  matched_keywords: string[];
  missing_required_keywords: string[];
  missing_preferred_keywords: string[];
  recommendations: Recommendation[];
  computed_at: string;
  resume_snapshot_hash: string;
}

export interface AIGenerationRequest {
  action_type: ActionType;
  source_content?: string;
  source_bullets?: string[];
  job_description_analysis?: import("./job_description").JobDescriptionAnalysis;
}

export interface AIGenerationResult {
  generated_content?: string;
  generated_bullets?: string[];
  guardrail_validated: boolean;
  warning_message?: string | null;
}
