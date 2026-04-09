-- ─── Library category system update ──────────────────────────────────────────
-- Replaces the flat `category` column with a two-level hierarchy:
--   top_category: language | other
--   mid_category: japanese | english | chinese | other (under language)
--                 math | science | other               (under other)
--   item_type:    vocab | grammar | writing | quote | other
--                 NULL for math/science — only used for language posts
--
-- Relationship constraints (top↔mid↔item_type) are enforced at the app layer.

ALTER TABLE library_posts
  DROP COLUMN category,
  ADD COLUMN top_category text NOT NULL DEFAULT 'other'
    CHECK (top_category IN ('language', 'other')),
  ADD COLUMN mid_category text NOT NULL DEFAULT 'other'
    CHECK (mid_category IN ('japanese', 'english', 'chinese', 'math', 'science', 'other')),
  ADD COLUMN item_type    text
    CHECK (item_type IN ('vocab', 'grammar', 'writing', 'quote', 'other'));
-- item_type is nullable — NULL is correct for math/science posts
