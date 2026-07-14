-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  domain TEXT CHECK (domain IS NULL OR domain IN ('aerospace', 'nanotechnology', 'clean_energy', 'energy')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  novelty_score REAL,
  disciplines TEXT[] DEFAULT '{}',
  innovation_summary TEXT,
  rejection_reason TEXT,
  review_notes TEXT,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  publish_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_public_posts_created_at ON public_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_posts_status ON public_posts (status);
CREATE INDEX IF NOT EXISTS idx_public_posts_approved_feed ON public_posts (status, created_at DESC)
  WHERE status = 'approved';

-- Usage logging for cost monitoring
CREATE TABLE IF NOT EXISTS usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved only" ON public_posts
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Service role full access" ON public_posts
  FOR ALL USING (true) WITH CHECK (true);
