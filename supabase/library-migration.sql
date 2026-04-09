-- ─── Library feature schema ───────────────────────────────────────────────────
-- library_posts holds intentionally public content shared by authenticated users.
--
-- Privacy guarantees:
--   • Private notes are NEVER exposed — content is copied at share time, not referenced.
--   • source_note_id is a nullable UUID breadcrumb only; it carries no note content.
--   • All public queries in the app select only safe columns (never source_note_id).
--   • RLS on the private `notes` table is unchanged and continues to block all
--     cross-user access, even if someone attempts a nested join via source_note_id.

CREATE TABLE library_posts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_note_id  uuid        REFERENCES notes(id) ON DELETE SET NULL,
  title           text        NOT NULL,
  content         text        NOT NULL,
  category        text        NOT NULL CHECK (category IN (
                                'stationery', 'journaling', 'tips', 'reviews', 'other'
                              )),
  tags            text[]      NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- library_images: up to 2 images per library post.
-- Stored under library/{user_id}/ prefix in the note-image bucket to distinguish
-- them from private note images ({user_id}/) and private post images ({user_id}/).
CREATE TABLE library_images (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  library_post_id uuid        NOT NULL REFERENCES library_posts(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path    text        NOT NULL,
  image_url       text        NOT NULL,
  position        int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS: library_posts ───────────────────────────────────────────────────────
ALTER TABLE library_posts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can read library posts.
-- This is intentional: the library is a public-facing feature.
-- No private note data is reachable through this table:
--   • content is copied at share time — the private note is not joined.
--   • source_note_id is a UUID only; even if joined, notes' own RLS blocks access.
CREATE POLICY "public can read library posts"
  ON library_posts FOR SELECT USING (true);

CREATE POLICY "owner can insert library post"
  ON library_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner can update library post"
  ON library_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "owner can delete library post"
  ON library_posts FOR DELETE USING (auth.uid() = user_id);

-- ─── RLS: library_images ──────────────────────────────────────────────────────
ALTER TABLE library_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read library images — they accompany publicly shared posts.
-- These images are uploaded to library/{user_id}/ and are intentionally public.
-- Private note images live at {user_id}/ and are unrelated to this table.
CREATE POLICY "public can read library images"
  ON library_images FOR SELECT USING (true);

CREATE POLICY "owner can insert library image"
  ON library_images FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner can delete library image"
  ON library_images FOR DELETE USING (auth.uid() = user_id);
