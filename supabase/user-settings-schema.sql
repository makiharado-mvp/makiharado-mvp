-- ============================================================
-- Makiharado MVP — User Settings Table
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists user_settings (
  user_id              uuid references auth.users primary key,
  notification_enabled boolean default false not null
);

alter table user_settings enable row level security;

drop policy if exists "user_settings_select" on user_settings;
drop policy if exists "user_settings_insert" on user_settings;
drop policy if exists "user_settings_update" on user_settings;

create policy "user_settings_select" on user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert" on user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update" on user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
