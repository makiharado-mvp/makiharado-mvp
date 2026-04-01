-- ============================================================
-- Migration: allow reviews to reference posts (not just notes)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Make note_id nullable (posts won't have a note_id)
alter table reviews alter column note_id drop not null;

-- 2. Add post_id column referencing posts
alter table reviews add column if not exists post_id uuid references posts(id) on delete cascade;

-- 3. Unique constraint to prevent duplicate review rows per post+interval
--    (note equivalent already handled by app logic; add for posts)
alter table reviews
  drop constraint if exists reviews_post_id_interval_day_key;

alter table reviews
  add constraint reviews_post_id_interval_day_key
  unique (post_id, interval_day);
