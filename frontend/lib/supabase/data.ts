"use client";

import { supabase } from "@/lib/supabase";
import type { Resume } from "@/types/resume";
import type { JobDescriptionAnalysis } from "@/types/job_description";
import type { ATSScoreResult } from "@/types/analysis";

export async function saveResumeToSupabase(resume: Resume): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const row = {
    user_id: session.user.id,
    personal_details: resume.personal_details,
    professional_summary: resume.professional_summary || null,
    experience: resume.experience || [],
    education: resume.education || [],
    projects: resume.projects || [],
    skills: resume.skills || [],
    certifications: resume.certifications || [],
    achievements: resume.achievements || [],
    references_data: resume.references || null,
    meta: resume.meta || {},
    source: resume.meta?.source || "created",
  };

  const { data, error } = await supabase
    .from("resumes")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save resume:", error.message);
    return null;
  }
  return data.id;
}

export async function updateResumeInSupabase(resumeId: string, resume: Resume): Promise<boolean> {
  const row = {
    personal_details: resume.personal_details,
    professional_summary: resume.professional_summary || null,
    experience: resume.experience || [],
    education: resume.education || [],
    projects: resume.projects || [],
    skills: resume.skills || [],
    certifications: resume.certifications || [],
    achievements: resume.achievements || [],
    references_data: resume.references || null,
    meta: resume.meta || {},
    source: resume.meta?.source || "created",
  };

  const { error } = await supabase
    .from("resumes")
    .update(row)
    .eq("id", resumeId)
    .single();

  if (error) {
    console.error("Failed to update resume:", error.message);
    return false;
  }
  return true;
}

export async function loadResumesFromSupabase(): Promise<Resume[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load resumes:", error?.message);
    return [];
  }

  return data.map((row) => ({
    personal_details: row.personal_details,
    professional_summary: row.professional_summary,
    experience: row.experience,
    education: row.education,
    projects: row.projects,
    skills: row.skills,
    certifications: row.certifications,
    achievements: row.achievements,
    references: row.references_data,
    meta: row.meta,
  }));
}

export async function deleteResumeFromSupabase(resumeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", resumeId);

  if (error) {
    console.error("Failed to delete resume:", error.message);
    return false;
  }
  return true;
}

export async function saveJobDescriptionToSupabase(
  resumeId: string,
  jdData: { source_type: string; raw_text?: string; job_title?: string; company_name?: string; analysis?: JobDescriptionAnalysis }
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const row = {
    user_id: session.user.id,
    resume_id: resumeId,
    source_type: jdData.source_type,
    raw_text: jdData.raw_text || null,
    job_title: jdData.job_title || null,
    company_name: jdData.company_name || null,
    analysis: jdData.analysis || null,
  };

  const { data, error } = await supabase
    .from("job_descriptions")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save JD:", error.message);
    return null;
  }
  return data.id;
}

export async function saveAtsScoreToSupabase(
  resumeId: string,
  jdId: string,
  scoreData: ATSScoreResult
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const row = {
    user_id: session.user.id,
    resume_id: resumeId,
    job_description_id: jdId,
    overall_score: scoreData.overall_score,
    sub_scores: scoreData.sub_scores,
    matched_keywords: scoreData.matched_keywords,
    missing_required_keywords: scoreData.missing_required_keywords,
    missing_preferred_keywords: scoreData.missing_preferred_keywords,
    recommendations: scoreData.recommendations,
    resume_snapshot_hash: scoreData.resume_snapshot_hash,
  };

  const { data, error } = await supabase
    .from("ats_scores")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save ATS score:", error.message);
    return null;
  }
  return data.id;
}
