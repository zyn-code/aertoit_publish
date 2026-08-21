-- =====================================================================
-- Correct the recruitment postings.
--
-- The homepage banner advertises "Chef d'Équipe", so the original seed
-- created a chef-d-equipe posting. There is no such page on the live site:
-- that role is the couvreur-experimente posting, whose real title is
-- "Chef/fe d'équipe - Couvreur/euse Expérimenté(e)". The invented row is
-- removed rather than left as a near-empty duplicate.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

-- Reassign any applications before the row goes, so none are orphaned.
UPDATE `job_applications` ja
JOIN `job_postings` old ON old.id = ja.job_posting_id AND old.slug = 'chef-d-equipe'
JOIN `job_postings` new ON new.slug = 'couvreur-experimente'
SET ja.job_posting_id = new.id;

DELETE FROM `job_postings` WHERE `slug` = 'chef-d-equipe';

UPDATE `job_postings` SET
  `title`      = 'Chef/fe d’équipe - Couvreur/euse Expérimenté(e)',
  `meta_title` = 'Chef/fe d’équipe - Couvreur/euse Expérimenté(e) (H/F) — Aertoit Couverture',
  `sort_order` = 1
WHERE `slug` = 'couvreur-experimente';

UPDATE `job_postings` SET `sort_order` = 2 WHERE `slug` = 'couvreur-qualifie';
UPDATE `job_postings` SET `sort_order` = 3 WHERE `slug` = 'assistant-polyvalent';

SELECT `slug`, `title`, `sort_order`, CHAR_LENGTH(`body`) AS body_chars
FROM `job_postings` ORDER BY `sort_order`;
