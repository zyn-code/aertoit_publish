-- =====================================================================
-- Publish the "Pourquoi Nous Choisir ?" section row.
--
-- It was inserted unpublished to keep it out of the sitemap, but
-- /api/pages/:slug filters on is_published, so the shared component fetched
-- a 404 and the section silently rendered nothing.
--
-- Publishing is safe: the sitemap is built from an explicit list of routes
-- rather than from this table, and no route maps to this slug, so it cannot
-- be reached as a page. It is only ever pulled in by WhyChooseUs.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

UPDATE `pages` SET `is_published` = TRUE WHERE `slug` = 'pourquoi-nous-choisir';

SELECT `slug`, `is_published`, CHAR_LENGTH(`body`) AS body_chars FROM `pages` ORDER BY `slug`;
