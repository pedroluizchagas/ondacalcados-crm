-- Add avatar_url column to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Optional: Create a public storage bucket for employee avatars
-- Ensure the bucket exists and is public via Supabase dashboard or API
-- Example:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('funcionarios_avatar', 'funcionarios_avatar', true);
