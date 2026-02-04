-- Migration: Add missing columns for new features
-- This script adds the necessary columns to sessions and messages tables

-- 1. Add 'idioma' column to sessions table
-- This allows tracking the language preferred by the user
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS idioma TEXT DEFAULT 'es';

-- 2. Add 'volunteer_id' column to messages table
-- This allows identifying which volunteer sent each message in multi-volunteer chats
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS volunteer_id UUID REFERENCES public.volunteers(id);

-- Optional: Create index on volunteer_id for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_messages_volunteer_id ON public.messages(volunteer_id);

-- Verify the columns exist (useful when running in Supabase SQL editor)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='idioma') THEN
        RAISE NOTICE 'Column idioma was not added to sessions';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='volunteer_id') THEN
        RAISE NOTICE 'Column volunteer_id was not added to messages';
    END IF;
END $$;
