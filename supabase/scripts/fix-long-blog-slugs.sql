-- Shorten blog post slugs that exceed safe URL length (fixes HTTP 431 on /blog/{slug} links).
-- Run in Supabase SQL editor or: psql ... -f supabase/scripts/fix-long-blog-slugs.sql

UPDATE blog_posts
SET slug = CONCAT(
  TRIM(BOTH '-' FROM LEFT(
    REGEXP_REPLACE(
      REGEXP_REPLACE(LOWER(COALESCE(NULLIF(TRIM(title), ''), 'post')), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    ),
    80
  )),
  '-',
  SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)
)
WHERE LENGTH(slug) > 100;
