-- Run after schema.sql — stores submission consent audit trail

ALTER TABLE public_posts
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS publish_consent BOOLEAN DEFAULT false;
