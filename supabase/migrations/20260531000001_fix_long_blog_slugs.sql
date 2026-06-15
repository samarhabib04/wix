-- Shorten oversized blog slugs (fixes HTTP 431 on public /blog/{slug} URLs).
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
