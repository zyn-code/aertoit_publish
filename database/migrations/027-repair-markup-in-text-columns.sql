-- Repairs plain-text columns that hold HTML.
--
-- ROOT CAUSE. `pages.intro` is a lead sentence rendered with Angular
-- interpolation — `{{ page.intro }}` — which escapes its input by design. The
-- à-propos row had the whole page pasted into that column during the original
-- import, so everything after the first sentence arrived as literal text:
--
--     Découvrez une équipe … !</p><h2>Qui sommes-nous ?</h2><p>Aertoit …
--
-- The escaping was correct; the data was in the wrong column. Migration 026
-- already split that row. This migration is the safe, idempotent repair for
-- any database that still carries the bad value — a copy restored from an
-- older dump, or a developer's local instance.
--
-- It is deliberately narrow. A blanket "strip all tags" pass over free-text
-- columns would silently damage legitimate content; this only touches a value
-- that provably contains a tag, and it moves the markup to `body` rather than
-- discarding words.

USE `aertoit`;

-- 1. Move everything from the first tag onwards out of `intro` and into
--    `body`, keeping the lead sentence where it belongs.
UPDATE `pages`
SET
  `body` = CONCAT(SUBSTRING(`intro`, LOCATE('<', `intro`)), IFNULL(`body`, '')),
  `intro` = TRIM(TRAILING ' ' FROM SUBSTRING(`intro`, 1, LOCATE('<', `intro`) - 1))
WHERE `intro` REGEXP '</?(p|h[1-6]|ul|ol|li|br|strong|em|a)[ >/]';

-- 2. The same mistake in the other direction: a card excerpt or summary is
--    always plain text, so any tag in one is an import artefact. These are
--    short fields with no structure worth preserving, so the tags go.
UPDATE `services` SET `card_excerpt` = TRIM(REGEXP_REPLACE(`card_excerpt`, '<[^>]*>', ''))
WHERE `card_excerpt` REGEXP '<[^>]+>';

UPDATE `services` SET `intro` = TRIM(REGEXP_REPLACE(`intro`, '<[^>]*>', ''))
WHERE `intro` REGEXP '<[^>]+>';

UPDATE `blog_posts` SET `excerpt` = TRIM(REGEXP_REPLACE(`excerpt`, '<[^>]*>', ''))
WHERE `excerpt` REGEXP '<[^>]+>';

UPDATE `job_postings` SET `summary` = TRIM(REGEXP_REPLACE(`summary`, '<[^>]*>', ''))
WHERE `summary` REGEXP '<[^>]+>';

UPDATE `projects` SET `summary` = TRIM(REGEXP_REPLACE(`summary`, '<[^>]*>', ''))
WHERE `summary` REGEXP '<[^>]+>';

UPDATE `faqs` SET `answer` = TRIM(REGEXP_REPLACE(`answer`, '<[^>]*>', ''))
WHERE `answer` REGEXP '<[^>]+>';

UPDATE `testimonials` SET `body` = TRIM(REGEXP_REPLACE(`body`, '<[^>]*>', ''))
WHERE `body` REGEXP '<[^>]+>';

-- 3. Double-encoding: a value that was escaped twice shows &lt;p&gt; on the
--    page even when rendered as HTML. None exists today; this catches it if
--    an import ever introduces one.
UPDATE `pages` SET `body` = REPLACE(REPLACE(REPLACE(`body`, '&lt;', '<'), '&gt;', '>'), '&amp;', '&')
WHERE `body` LIKE '%&lt;p&gt;%' OR `body` LIKE '%&lt;h2&gt;%';

UPDATE `blog_posts` SET `body` = REPLACE(REPLACE(REPLACE(`body`, '&lt;', '<'), '&gt;', '>'), '&amp;', '&')
WHERE `body` LIKE '%&lt;p&gt;%' OR `body` LIKE '%&lt;h2&gt;%';

UPDATE `services` SET `body` = REPLACE(REPLACE(REPLACE(`body`, '&lt;', '<'), '&gt;', '>'), '&amp;', '&')
WHERE `body` LIKE '%&lt;p&gt;%' OR `body` LIKE '%&lt;h2&gt;%';

-- Verification: every query below must return no rows.
SELECT 'pages.intro' AS problem, `slug` FROM `pages`
  WHERE `intro` REGEXP '<[^>]+>';
SELECT 'services.card_excerpt', `slug` FROM `services`
  WHERE `card_excerpt` REGEXP '<[^>]+>';
SELECT 'services.intro', `slug` FROM `services`
  WHERE `intro` REGEXP '<[^>]+>';
SELECT 'blog_posts.excerpt', `slug` FROM `blog_posts`
  WHERE `excerpt` REGEXP '<[^>]+>';
SELECT 'double-encoded body', `slug` FROM `pages`
  WHERE `body` LIKE '%&lt;%';
