
-- Create Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pais TEXT NOT NULL, -- 'Todos' for global topics or specific country name
    titulo TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed some initial data
INSERT INTO public.topics (pais, titulo) VALUES
('Todos', 'Acceso a FamilySearch'),
('Todos', 'Recuperación de Cuenta'),
('Argentina', 'Feria del Libro'),
('Argentina', 'Registros Civiles en Buenos Aires'),
('Perú', 'Registros Parroquiales Lima'),
('México', 'Censo 1930')
ON CONFLICT DO NOTHING;

-- RLS Policies (Open for all for now for simplicity in prototype)
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.topics
    FOR SELECT USING (true);

CREATE POLICY "Enable all access for authenticated users" ON public.topics
    FOR ALL USING (auth.role() = 'authenticated');
