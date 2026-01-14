
-- Migration to add last_status_change to volunteers
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ DEFAULT now();
