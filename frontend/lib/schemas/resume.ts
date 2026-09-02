import { z } from "zod";

export const linkEntrySchema = z.object({
  label: z.string().max(40),
  url: z.string().url().max(500),
});

export const personalDetailsSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(120),
  professional_title: z.string().max(150).optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  location: z.string().max(150).optional(),
  links: z.array(linkEntrySchema).optional(),
});

export const experienceEntrySchema = z.object({
  id: z.string(),
  company_name: z.string().min(1, "Company name is required").max(150),
  job_title: z.string().min(1, "Job title is required").max(150),
  location: z.string().max(150).optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  description_bullets: z.array(z.string().max(400)).optional(),
  order_index: z.number(),
});

export const educationEntrySchema = z.object({
  id: z.string(),
  institution_name: z.string().min(1, "Institution name is required").max(150),
  degree: z.string().min(1, "Degree is required").max(150),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  details: z.string().max(300).optional(),
  order_index: z.number(),
});

export const projectEntrySchema = z.object({
  id: z.string(),
  project_name: z.string().min(1, "Project name is required").max(150),
  link: z.string().url().max(500).optional().or(z.literal("")),
  timeframe: z.string().max(60).optional(),
  description_bullets: z.array(z.string().max(400)).optional(),
  order_index: z.number(),
});

export const skillGroupSchema = z.object({
  category_label: z.string().max(60).optional(),
  skills: z.array(z.string().max(60)).min(1, "At least one skill is required"),
});

export const certificationEntrySchema = z.object({
  id: z.string(),
  certification_name: z.string().min(1, "Certification name is required").max(150),
  issuing_organization: z.string().max(150).optional(),
  date_obtained: z.string().optional(),
  expiration_date: z.string().optional(),
});

export const achievementEntrySchema = z.object({
  id: z.string(),
  statement: z.string().min(1, "Achievement statement is required").max(300),
  order_index: z.number(),
});

export const referenceEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Reference name is required").max(120),
  relationship: z.string().max(100).optional(),
  contact_info: z.string().max(150).optional(),
});

export const referencesModeSchema = z.enum(["available_upon_request"]);

export const resumeMetaSchema = z.object({
  source: z.enum(["created", "uploaded"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export const resumeSchema = z.object({
  personal_details: personalDetailsSchema,
  professional_summary: z.string().max(800).optional(),
  experience: z.array(experienceEntrySchema).optional(),
  education: z.array(educationEntrySchema).optional(),
  projects: z.array(projectEntrySchema).optional(),
  skills: z.array(skillGroupSchema).optional(),
  certifications: z.array(certificationEntrySchema).optional(),
  achievements: z.array(achievementEntrySchema).optional(),
  references: z.array(referenceEntrySchema).or(referencesModeSchema).optional(),
  meta: resumeMetaSchema,
});

export type ResumeFormData = z.infer<typeof resumeSchema>;
