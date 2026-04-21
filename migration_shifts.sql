-- Migration: Create tables for Shifts (Guardias) and Volunteer Logins
-- 1. Shifts table to track scheduled guardias
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying shifts by date ranges efficiently
CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.shifts(date);

-- 2. Volunteer Logins table to track daily unique logins for metrics
CREATE TABLE IF NOT EXISTS public.volunteer_logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    first_login_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(volunteer_id, date)
);

-- Index for querying logins by date
CREATE INDEX IF NOT EXISTS idx_volunteer_logins_date ON public.volunteer_logins(date);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_logins ENABLE ROW LEVEL SECURITY;

-- Simple policies (assuming service role or authenticated users can manage, adjust based on your current setup)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'Allow standard volunteer access to shifts'
    ) THEN
        CREATE POLICY "Allow standard volunteer access to shifts" ON public.shifts FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'volunteer_logins' AND policyname = 'Allow standard volunteer access to logins'
    ) THEN
        CREATE POLICY "Allow standard volunteer access to logins" ON public.volunteer_logins FOR ALL USING (true);
    END IF;
END $$;
