-- Closes a WCAG 1.3.1 heading-order break in the imported body HTML.
--
-- Twelve records jump straight from <h2> (or <h1>) to <h4>, skipping <h3>.
-- A screen-reader user navigating by heading level reads that as a missing
-- level of structure.
--
-- Every one of these bodies contains zero <h3>, so promoting <h4> to <h3> is
-- unambiguous: nothing can collide, and the visual hierarchy is unchanged
-- because `.prose` sizes h3 and h4 only one step apart.
--
-- Scoped by `body LIKE '%<h4>%' AND body NOT LIKE '%<h3>%'` so it is safe to
-- re-run and cannot touch a record that already nests correctly.

USE `aertoit`;

UPDATE `pages` SET `body` = REPLACE(REPLACE(`body`, '<h4>', '<h3>'), '</h4>', '</h3>')
WHERE `body` LIKE '%<h4>%' AND `body` NOT LIKE '%<h3>%';

UPDATE `blog_posts` SET `body` = REPLACE(REPLACE(`body`, '<h4>', '<h3>'), '</h4>', '</h3>')
WHERE `body` LIKE '%<h4>%' AND `body` NOT LIKE '%<h3>%';

UPDATE `job_postings` SET `body` = REPLACE(REPLACE(`body`, '<h4>', '<h3>'), '</h4>', '</h3>')
WHERE `body` LIKE '%<h4>%' AND `body` NOT LIKE '%<h3>%';

UPDATE `services` SET `body` = REPLACE(REPLACE(`body`, '<h4>', '<h3>'), '</h4>', '</h3>')
WHERE `body` LIKE '%<h4>%' AND `body` NOT LIKE '%<h3>%';

-- Should return no rows: nothing may still hold an h4 without an h3.
SELECT 'pages' AS tbl, `slug` FROM `pages`
  WHERE `body` LIKE '%<h4>%' AND `body` NOT LIKE '%<h3>%'
UNION ALL SELECT 'blog_posts', `slug` FROM `blog_posts`
  WHERE `body` LIKE '%<h4>%' AND `body` NOT LIKE '%<h3>%'
UNION ALL SELECT 'job_postings', `slug` FROM `job_postings`
  WHERE `body` LIKE '%<h4>%' AND `body` NOT LIKE '%<h3>%'
UNION ALL SELECT 'services', `slug` FROM `services`
  WHERE `body` LIKE '%<h4>%' AND `body` NOT LIKE '%<h3>%';

-- Blog posts need one more step. Their bodies contain no <h2> at all, so
-- after the promotion above the article still reads <h1> (the post title)
-- straight to <h3>. Job postings already carry their own <h2>, so only the
-- blog is affected.
UPDATE `blog_posts` SET `body` = REPLACE(REPLACE(`body`, '<h3>', '<h2>'), '</h3>', '</h2>')
WHERE `body` LIKE '%<h3>%' AND `body` NOT LIKE '%<h2>%';

SELECT `slug`, `body` LIKE '%<h2>%' AS has_h2, `body` LIKE '%<h3>%' AS has_h3
FROM `blog_posts` ORDER BY `slug` LIMIT 3;
