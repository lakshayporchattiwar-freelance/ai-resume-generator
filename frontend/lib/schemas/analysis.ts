import { z } from "zod";

export const subScoresSchema = z.object({
  keyword_coverage: z.number().min(0).max(100),
  skills_alignment: z.number().min(0).max(100),
  experience_relevance: z.number().min(0).max(100),
  formatting_compatibility: z.number().min(0).max(100),
});

export const recommendationSchema = z.object({
  priority: z.enum(["high", "medium", "low"]),
  message: z.string().max(300),
  related_section: z.enum([
    "personal_details", "professional_summary", "experience",
    "education", "projects", "skills", "certifications",
    "achievements", "references",
  ]).nullable().optional(),
});

export const atsScoreResultSchema = z.object({
  overall_score: z.number().min(0).max(100),
  sub_scores: subScoresSchema,
  matched_keywords: z.array(z.string()),
  missing_required_keywords: z.array(z.string()),
  missing_preferred_keywords: z.array(z.string()),
  recommendations: z.array(recommendationSchema),
  computed_at: z.string(),
  resume_snapshot_hash: z.string(),
});

export const aiGenerationRequestSchema = z.object({
  action_type: z.enum([
    "generate_summary", "rewrite_summary",
    "rewrite_experience_bullets", "rewrite_project_description",
    "suggest_achievement_phrasing",
  ]),
  source_content: z.string().optional(),
  source_bullets: z.array(z.string()).optional(),
  job_description_analysis: z.any().optional(),
});

export const aiGenerationResultSchema = z.object({
  generated_content: z.string().optional(),
  generated_bullets: z.array(z.string()).optional(),
  guardrail_validated: z.boolean(),
  warning_message: z.string().nullable().optional(),
});
