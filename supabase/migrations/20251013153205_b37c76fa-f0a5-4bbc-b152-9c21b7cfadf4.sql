-- Add submitted_at timestamp to assignments table to track when users submitted their work
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Add index for better sorting performance
CREATE INDEX IF NOT EXISTS idx_assignments_submitted_at ON assignments(submitted_at DESC NULLS LAST);