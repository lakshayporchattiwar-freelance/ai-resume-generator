import { z } from "zod";

export const sectionConfidenceSchema = z.enum(["high", "needs_review", "not_found"]);

export const parsedResumeResultSchema = z.object({
  resume: z.any(),
  section_confidence: z.record(z.string(), sectionConfidenceSchema),
});

export const resumeValidationResultSchema = z.object({
  is_export_ready: z.boolean(),
  missing_required_fields: z.array(z.string()),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().nullable().optional(),
  }),
});
