-- ============================================================
-- Migration: post_images table for multi-image post support
--
-- Why: posts.image_url stored a single URL as a text column.
-- This migration introduces a proper post_images child table so
-- each post can have 1–5 images with their storage paths stored
-- directly (no URL parsing required for cleanup).
--
-- Run in Supabase SQL Editor.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ============================================================

-- 1. Create post_images table
CREATE TABLE IF NOT EXISTS public.post_images (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,  -- e.g. {user_id}/{timestamp}-{n}.jpg — used for storage cleanup
  image_url    text        NOT NULL,  -- public URL
  position     integer     NOT NULL DEFAULT 0,  -- display order (0 = first)
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- 2. RLS
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_images_select" ON public.post_images;
DROP POLICY IF EXISTS "post_images_insert" ON public.post_images;
DROP POLICY IF EXISTS "post_images_delete" ON public.post_images;

CREATE POLICY "post_images_select" ON public.post_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "post_images_insert" ON public.post_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_images_delete" ON public.post_images
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Migrate existing posts: copy image_url into post_images.
--    storage_path is extracted from the URL.
--    ON CONFLICT DO NOTHING makes this safe to re-run.
INSERT INTO public.post_images (post_id, user_id, storage_path, image_url, position)
SELECT
  id          AS post_id,
  user_id,
  -- Extract the path after the bucket prefix, e.g. '{user_id}/{timestamp}.jpg'
  regexp_replace(image_url, '^.+/object/public/note-image/', '') AS storage_path,
  image_url,
  0           AS position
FROM public.posts
WHERE image_url IS NOT NULL
ON CONFLICT DO NOTHING;
