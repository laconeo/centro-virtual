-- Performance Optimization Indexes
-- These indexes will significantly improve query performance under concurrent load

-- Index on volunteers.email for faster lookups during login/registration
CREATE INDEX IF NOT EXISTS idx_volunteers_email ON public.volunteers(email);

-- Index on volunteers.status for faster online volunteer queries
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON public.volunteers(status);

-- Index on topics.pais for faster topic filtering by country
CREATE INDEX IF NOT EXISTS idx_topics_pais ON public.topics(pais);

-- Index on topics.active for faster active topic queries
CREATE INDEX IF NOT EXISTS idx_topics_active ON public.topics(active);

-- Composite index on topics for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_topics_active_pais ON public.topics(active, pais);

-- Index on sessions.estado for faster session filtering
CREATE INDEX IF NOT EXISTS idx_sessions_estado ON public.sessions(estado);

-- Index on sessions.fecha_ingreso for faster ordering
CREATE INDEX IF NOT EXISTS idx_sessions_fecha_ingreso ON public.sessions(fecha_ingreso DESC);

-- Index on messages.session_id for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);

-- Index on messages.created_at for ordering
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Composite index for volunteers with role joins
CREATE INDEX IF NOT EXISTS idx_volunteers_role_id ON public.volunteers(role_id);

-- Index for surveys by session
CREATE INDEX IF NOT EXISTS idx_surveys_session_id ON public.surveys(session_id);

-- ANALYZE tables to update statistics for query planner
ANALYZE public.volunteers;
ANALYZE public.sessions;
ANALYZE public.topics;
ANALYZE public.messages;
ANALYZE public.roles;
ANALYZE public.surveys;
