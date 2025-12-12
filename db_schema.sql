-- Add password column to volunteers for simple auth
alter table public.volunteers add column password text;
