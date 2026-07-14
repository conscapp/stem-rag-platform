-- Add innovation domain column (aerospace | nanotechnology | energy)
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS domain TEXT;
