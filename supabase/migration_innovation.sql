-- Migration for existing public_posts tables
-- Run in Supabase SQL Editor if you already created the original schema

ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS novelty_score REAL;
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS disciplines TEXT[] DEFAULT '{}';
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS innovation_summary TEXT;
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add check constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'public_posts_status_check'
  ) THEN
    ALTER TABLE public_posts ADD CONSTRAINT public_posts_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Mark existing posts as approved so feed still works
UPDATE public_posts SET status = 'approved' WHERE status IS NULL OR status = 'pending';

CREATE INDEX IF NOT EXISTS idx_public_posts_status ON public_posts (status);

-- Update RLS: public only sees approved
DROP POLICY IF EXISTS "Public read access" ON public_posts;
DROP POLICY IF EXISTS "Public read approved only" ON public_posts;
CREATE POLICY "Public read approved only" ON public_posts
  FOR SELECT USING (status = 'approved');
