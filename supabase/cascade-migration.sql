-- ============================================================
-- Migration: add ON DELETE CASCADE to all user_id → auth.users FKs
--
-- Why: Without CASCADE, auth.admin.deleteUser() raises a Postgres FK
-- violation if any row in these tables still references the auth user.
-- With CASCADE, Supabase will auto-delete all dependent rows when the
-- auth user is deleted — acting as a database-level safety net even if
-- the application-level deletion misses a table.
--
-- Safe to run multiple times (DROP CONSTRAINT IF EXISTS).
-- Run in Supabase SQL Editor (requires service_role / dashboard access).
-- ============================================================

-- reviews.user_id
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_user_id_fkey,
  ADD CONSTRAINT reviews_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- posts.user_id
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_user_id_fkey,
  ADD CONSTRAINT posts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- notes.user_id
ALTER TABLE public.notes
  DROP CONSTRAINT IF EXISTS notes_user_id_fkey,
  ADD CONSTRAINT notes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_settings.user_id (also the primary key — FK is a separate constraint)
ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey,
  ADD CONSTRAINT user_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
