-- Create Roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_leader BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add role_id to volunteers table
ALTER TABLE volunteers 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Insert default roles
INSERT INTO roles (name, description, is_leader) VALUES
('Voluntario', 'Voluntario estándar para atención de usuarios.', FALSE),
('Líder de Turno', 'Responsable de coordinar el turno y apoyar a voluntarios.', TRUE),
('Administrador', 'Acceso completo a la configuración.', TRUE)
ON CONFLICT DO NOTHING;

-- Policy adjustments (Optional - assumes typical RLS)
-- Enable RLS on roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" ON roles
FOR SELECT TO authenticated USING (true);

-- Allow write access only to admins (if you have an admin flag on auth.users or volunteers)
-- For now, allowing authenticated users to create roles for setup simplicity:
CREATE POLICY "Allow all access for authenticated users" ON roles
FOR ALL TO authenticated USING (true);
