-- ============================================================
-- Makiharado MVP — Posts Table
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists posts (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users not null,
  title      text        not null,
  content    text        not null default '',
  post_date  date        not null,
  image_url  text,
  created_at timestamptz default now() not null
);

alter table posts enable row level security;

drop policy if exists "posts_select" on posts;
drop policy if exists "posts_insert" on posts;
drop policy if exists "posts_update" on posts;
drop policy if exists "posts_delete" on posts;

create policy "posts_select" on posts for select using (auth.uid() = user_id);
create policy "posts_insert" on posts for insert with check (auth.uid() = user_id);
create policy "posts_update" on posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "posts_delete" on posts for delete using (auth.uid() = user_id);
