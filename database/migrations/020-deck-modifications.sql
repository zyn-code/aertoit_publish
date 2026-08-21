-- Modifications deck, pages 5 and 6 — data-layer changes.
--
-- Page 6 is a literal before/after of the "Les plus d'AERTOIT" block:
-- the savoir-faire panel moves to the top and absorbs the standalone
-- "Plus de 20 ans" card, Eco Artisan goes, FFB arrives, and the generic
-- decennale ribbon is replaced by the APRIL logo (APRIL being the insurer).
--
-- Page 5 collects the content corrections: the a-propos locality, the
-- blog bylines, and TikTok in the contact block and footer.

USE `aertoit`;

-- ---------------------------------------------------------------- C ----
-- The "Plus de 20 ans d'expérience" card is not deleted so much as
-- promoted: it becomes the second half of the savoir-faire heading, which
-- the template now renders above the badge row.
DELETE FROM `certifications` WHERE `name` IN (
  'Plus de 20 ans d’expérience',
  'Certifié Éco Artisan'
);

-- APRIL underwrites the garantie décennale, so their logo replaces the
-- generic ribbon. The card's title and copy are unchanged — the deck only
-- swaps the mark.
UPDATE `certifications` SET
  `logo`     = '/assets/certifications/april.webp',
  `logo_alt` = 'Logo APRIL, assureur de notre garantie décennale',
  `url`      = 'https://www.april.fr/',
  `sort_order` = 1
WHERE `name` = 'Garantie décennale';

UPDATE `certifications` SET `sort_order` = 2 WHERE `name` = 'Certifié RGE QUALIBAT';
UPDATE `certifications` SET `sort_order` = 3 WHERE `name` = 'Installateur Conseil Expert VELUX';

INSERT INTO `certifications`
  (`name`, `description`, `logo`, `logo_alt`, `url`, `sort_order`, `is_published`)
SELECT
  'Adhérent Fédération Française du Bâtiment',
  'Informations réglementaires et techniques de la profession.',
  '/assets/certifications/ffb.webp',
  'Logo de la Fédération Française du Bâtiment',
  'https://www.ffbatiment.fr/',
  4, TRUE
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM (SELECT `name` FROM `certifications`) c
  WHERE c.`name` = 'Adhérent Fédération Française du Bâtiment'
);

-- The deck names APRIL as the décennale insurer, which is the one legal
-- identifier mentions-legales was rendering as a placeholder.
UPDATE `site_settings` SET `value` = 'APRIL (garantie décennale)'
WHERE `setting_key` = 'legal_insurer' AND `value` = '';

-- ---------------------------------------------------------------- E ----
INSERT INTO `site_settings` (`setting_key`, `value`, `group_name`)
VALUES ('social_tiktok', '', 'social')
ON DUPLICATE KEY UPDATE `group_name` = VALUES(`group_name`);

-- ---------------------------------------------------------------- D ----
-- Normalise the locality to the spelling site_settings and the JSON-LD
-- already use, so the two cannot disagree.
UPDATE `pages` SET
  `intro` = REPLACE(`intro`, 'l''Haÿ-Les-Roses', 'L''Haÿ-les-Roses'),
  `body`  = REPLACE(`body`,  'l''Haÿ-Les-Roses', 'L''Haÿ-les-Roses')
WHERE `slug` = 'a-propos';

-- Typo carried over verbatim from the live site: "Salairés" -> "Salariés".
UPDATE `pages` SET
  `intro` = REPLACE(`intro`, 'Salairés', 'Salariés'),
  `body`  = REPLACE(`body`,  'Salairés', 'Salariés')
WHERE `slug` = 'a-propos';

-- The VELUX row has had a NULL logo since the first import even though the
-- live site shows the badge; it now points at a placeholder like the other two.
UPDATE `certifications` SET
  `logo`     = '/assets/certifications/velux.webp',
  `logo_alt` = 'Logo Installateur Conseil Expert VELUX'
WHERE `name` = 'Installateur Conseil Expert VELUX' AND `logo` IS NULL;

SELECT `name`, `logo`, `sort_order` FROM `certifications`
WHERE `is_published` ORDER BY `sort_order`;
SELECT `setting_key`, `value` FROM `site_settings`
WHERE `setting_key` IN ('social_tiktok', 'legal_insurer');
-- The bullet list lives in `body`, not `intro`; checking the wrong column
-- here reported the typo as unfixed when it had in fact been replaced.
SELECT `intro` LIKE '%Haÿ-les-Roses%' AS locality_ok,
       `body`  LIKE '%Salariés%'      AS typo_fixed,
       `body`  LIKE '%Salairés%'      AS typo_left
FROM `pages` WHERE `slug` = 'a-propos';
