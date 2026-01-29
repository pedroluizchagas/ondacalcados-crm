-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for avatars (if using Supabase Storage)
-- Note: This needs to be done via Supabase dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
