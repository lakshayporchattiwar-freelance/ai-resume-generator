import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; email: string; full_name?: string | null; avatar_url?: string | null };
        Update: { full_name?: string | null; avatar_url?: string | null; updated_at?: string };
      };
      resumes: {
        Row: {
          id: string; user_id: string; personal_details: Record<string, unknown>;
          professional_summary: string | null; experience: unknown[]; education: unknown[];
          projects: unknown[]; skills: unknown[]; certifications: unknown[];
          achievements: unknown[]; references_data: unknown; meta: Record<string, unknown>;
          source: string; created_at: string; updated_at: string;
        };
        Insert: {
          user_id: string; personal_details?: Record<string, unknown>;
          professional_summary?: string | null; experience?: unknown[];
          education?: unknown[]; projects?: unknown[]; skills?: unknown[];
          certifications?: unknown[]; achievements?: unknown[];
          references_data?: unknown; meta?: Record<string, unknown>; source?: string;
        };
        Update: Record<string, unknown>;
      };
      job_descriptions: {
        Row: {
          id: string; user_id: string; resume_id: string | null;
          source_type: string; raw_text: string | null; job_title: string | null;
          company_name: string | null; analysis: unknown; created_at: string;
        };
        Insert: {
          user_id: string; resume_id?: string | null; source_type?: string;
          raw_text?: string | null; job_title?: string | null;
          company_name?: string | null; analysis?: unknown;
        };
        Update: Record<string, unknown>;
      };
      ats_scores: {
        Row: {
          id: string; user_id: string; resume_id: string;
          job_description_id: string; overall_score: number;
          sub_scores: Record<string, unknown>; matched_keywords: string[];
          missing_required_keywords: string[]; missing_preferred_keywords: string[];
          recommendations: unknown[]; resume_snapshot_hash: string; computed_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
}
