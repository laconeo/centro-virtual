-- Create the table
CREATE TABLE IF NOT EXISTS public.extension_installs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL,
    extension_type TEXT NOT NULL CHECK (extension_type IN ('user', 'missionary')),
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_ping_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, extension_type)
);

-- Enable RLS
ALTER TABLE public.extension_installs ENABLE ROW LEVEL SECURITY;

-- Policy for anyone (authenticated or not) to insert data
CREATE POLICY "Allow public inserts for extension_installs" 
ON public.extension_installs FOR INSERT 
TO public 
WITH CHECK (true);

-- Policy to allow anyone to select (since this is internal dashboard, or we can restrict it if needed)
CREATE POLICY "Allow select for extension_installs"
ON public.extension_installs FOR SELECT
TO public
USING (true);

-- Policy to allow updates (for the occasional ping)
CREATE POLICY "Allow updates for extension_installs"
ON public.extension_installs FOR UPDATE
TO public
USING (true);

-- Index for fast counts
CREATE INDEX idx_extension_installs_type_installed_at ON public.extension_installs(extension_type, installed_at);
