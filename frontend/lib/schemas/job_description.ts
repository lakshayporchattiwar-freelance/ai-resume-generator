import { z } from "zod";

export const keywordItemSchema = z.object({
  term: z.string().max(80),
  importance: z.enum(["required", "preferred"]),
  source_context: z.string().max(200).optional(),
});

export const jobDescriptionInputSchema = z.object({
  source_type: z.enum(["pasted_text", "uploaded_file"]),
  raw_text: z.string().max(20000).optional(),
  job_title: z.string().max(150).optional(),
  company_name: z.string().max(150).optional(),
});

export const jobDescriptionAnalysisSchema = z.object({
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  keywords: z.array(keywordItemSchema),
  analysis_confidence: z.enum(["high", "medium", "low"]),
});

export type JobDescriptionInputFormData = z.infer<typeof jobDescriptionInputSchema>;
