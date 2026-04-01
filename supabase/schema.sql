-- ============================================================
-- Makiharado MVP — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Notes table
create table if not exists notes (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users not null,
  title       text        not null,
  content     text        not null default '',
  image_url   text,
  created_at  timestamptz default now() not null
);

-- Reviews table
-- due_date is DATE (not timestamptz) — reviews become available at midnight on that day
create table if not exists reviews (
  id           uuid        default gen_random_uuid() primary key,
  note_id      uuid        references notes(id) on delete cascade not null,
  user_id      uuid        references auth.users not null,
  interval_day integer     not null,       -- 1, 3, 7, 14, 30
  due_date     date        not null,       -- YYYY-MM-DD, no time
  completed_at timestamptz,
  created_at   timestamptz default now() not null
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table notes   enable row level security;
alter table reviews enable row level security;

-- Drop broad policies if they already exist, then recreate as explicit per-operation
drop policy if exists "Users manage their own notes"   on notes;
drop policy if exists "Users manage their own reviews" on reviews;

-- Notes: explicit per-operation policies
drop policy if exists "notes_select" on notes;
drop policy if exists "notes_insert" on notes;
drop policy if exists "notes_update" on notes;
drop policy if exists "notes_delete" on notes;

create policy "notes_select" on notes for select using (auth.uid() = user_id);
create policy "notes_insert" on notes for insert with check (auth.uid() = user_id);
create policy "notes_update" on notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete" on notes for delete using (auth.uid() = user_id);

-- Reviews: explicit per-operation policies
drop policy if exists "reviews_select" on reviews;
drop policy if exists "reviews_insert" on reviews;
drop policy if exists "reviews_update" on reviews;
drop policy if exists "reviews_delete" on reviews;

create policy "reviews_select" on reviews for select using (auth.uid() = user_id);
create policy "reviews_insert" on reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update" on reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_delete" on reviews for delete using (auth.uid() = user_id);

-- ============================================================
-- Storage: note-image bucket
-- Run AFTER creating the bucket manually in Supabase Storage UI
-- ============================================================

-- Drop existing storage policies if rerunning
drop policy if exists "Users upload their own images" on storage.objects;
drop policy if exists "Images are publicly readable"  on storage.objects;
drop policy if exists "Users delete their own images" on storage.objects;

-- Uploads: authenticated users can only upload to their own folder (user_id/filename)
create policy "Users upload their own images"
  on storage.objects for insert
  with check (
    bucket_id = 'note-image'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Reads: images are publicly readable (URLs are embedded in notes, safe since notes are RLS-protected)
create policy "Images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'note-image');

-- Deletes: users can only delete their own images
create policy "Users delete their own images"
  on storage.objects for delete
  using (
    bucket_id = 'note-image'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
