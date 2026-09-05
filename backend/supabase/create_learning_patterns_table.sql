-- AI Learning Patterns table for adaptive resume improvement
-- Run this SQL in the Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS ai_learning_patterns (
    id TEXT PRIMARY KEY DEFAULT 'global',
    pattern_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ai_learning_patterns ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage patterns (using service_role key from backend)
CREATE POLICY "Service role can manage learning patterns"
    ON ai_learning_patterns
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow anonymous reads for learning context
CREATE POLICY "Anyone can read learning patterns"
    ON ai_learning_patterns
    FOR SELECT
    USING (true);
