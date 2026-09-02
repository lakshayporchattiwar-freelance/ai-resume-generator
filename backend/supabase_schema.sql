-- Supabase migration: AI Resume Generator tables with user auth support
-- Run this in the Supabase SQL Editor (idempotent - safe to re-run)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop old tables if they exist (from the previous session-based schema)
DROP TABLE IF EXISTS rate_limit_counters CASCADE;
DROP TABLE IF EXISTS ai_generation_logs CASCADE;
DROP TABLE IF EXISTS ats_scores CASCADE;
DROP TABLE IF EXISTS job_descriptions CASCADE;
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resumes table (tied to user)
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_details JSONB NOT NULL DEFAULT '{}',
  professional_summary TEXT,
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  projects JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  achievements JSONB DEFAULT '[]',
  references_data JSONB,
  meta JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job descriptions table
CREATE TABLE job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'pasted_text',
  raw_text TEXT,
  job_title TEXT,
  company_name TEXT,
  analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ATS scores table
CREATE TABLE ats_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  overall_score FLOAT NOT NULL,
  sub_scores JSONB NOT NULL DEFAULT '{}',
  matched_keywords JSONB DEFAULT '[]',
  missing_required_keywords JSONB DEFAULT '[]',
  missing_preferred_keywords JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  resume_snapshot_hash TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI generation logs (no content stored, only metadata)
CREATE TABLE ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  guardrail_validated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_resumes_user ON resumes(user_id);
CREATE INDEX idx_job_descriptions_user ON job_descriptions(user_id);
CREATE INDEX idx_ats_scores_resume ON ats_scores(resume_id);
CREATE INDEX idx_ats_scores_user ON ats_scores(user_id);
CREATE INDEX idx_ai_logs_user ON ai_generation_logs(user_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can insert own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can update own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can delete own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can view own job_descriptions" ON job_descriptions;
DROP POLICY IF EXISTS "Users can insert own job_descriptions" ON job_descriptions;
DROP POLICY IF EXISTS "Users can update own job_descriptions" ON job_descriptions;
DROP POLICY IF EXISTS "Users can delete own job_descriptions" ON job_descriptions;
DROP POLICY IF EXISTS "Users can view own ats_scores" ON ats_scores;
DROP POLICY IF EXISTS "Users can insert own ats_scores" ON ats_scores;
DROP POLICY IF EXISTS "Users can delete own ats_scores" ON ats_scores;
DROP POLICY IF EXISTS "Users can view own ai_logs" ON ai_generation_logs;
DROP POLICY IF EXISTS "Users can insert own ai_logs" ON ai_generation_logs;

-- Now create policies fresh
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view own resumes" ON resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resumes" ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resumes" ON resumes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resumes" ON resumes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own job_descriptions" ON job_descriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF EXISTS "Users can insert own job_descriptions" ON job_descriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own job_descriptions" ON job_descriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own job_descriptions" ON job_descriptions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own ats_scores" ON ats_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ats_scores" ON ats_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ats_scores" ON ats_scores FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own ai_logs" ON ai_generation_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_logs" ON ai_generation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
