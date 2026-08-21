-- Removes the figures the site asserted but nothing in the supplied content
-- substantiates.
--
--   +3000 projets réalisés
--   +20 années d'expérience
--   +25 salariés qualifiés
--   +160 clients nous recommandent
--   4,9 / 5 — which also fed an AggregateRating into the LocalBusiness JSON-LD
--
-- These came across verbatim from the live aertoit.fr, so they are the
-- company's own published wording rather than anything invented here. They
-- are removed on the owner's instruction because none can be evidenced from
-- the approved content, and an unverifiable number in structured data can
-- earn a rich result the business cannot defend.
--
-- Safe to run against an existing database: the table is dropped only after
-- its rows are gone, and every UPDATE is idempotent. No customer or business
-- record is touched.

USE `aertoit`;

-- The whole table existed only to hold those four counters.
DROP TABLE IF EXISTS `stats`;

-- Blanked rather than deleted: the keys are read by the settings endpoint,
-- and a missing key would surface as `undefined` in a template. Empty means
-- "no verified figure", which every consumer already treats as absent.
UPDATE `site_settings` SET `value` = '' WHERE `setting_key` IN ('rating_value', 'review_count');

-- The same four claims are spelled out as bullets in the à-propos body.
-- Leaving them there while removing the homepage counters would keep the
-- assertion on the site under a different heading.
UPDATE `pages` SET
  `body` = REPLACE(`body`, '<p>+25 Salariés Qualifiés</p>', ''),
  `intro` = REPLACE(`intro`, '<p>+25 Salariés Qualifiés</p>', '')
WHERE `slug` = 'a-propos';

UPDATE `pages` SET
  `body` = REPLACE(`body`, '<p>+ 3000 Projets Réalisés</p>', ''),
  `intro` = REPLACE(`intro`, '<p>+ 3000 Projets Réalisés</p>', '')
WHERE `slug` = 'a-propos';

UPDATE `pages` SET
  `body` = REPLACE(`body`, '<p>+3000 Projets Réalisés</p>', ''),
  `intro` = REPLACE(`intro`, '<p>+3000 Projets Réalisés</p>', '')
WHERE `slug` = 'a-propos';

-- "Depuis plus de 20 ans" opens the à-propos paragraph and is a claim of the
-- same kind. Replaced with wording that carries the same meaning — long
-- experience — without asserting a figure.
UPDATE `pages` SET
  `intro` = REPLACE(`intro`, 'Depuis plus de 20 ans, Aertoit Couverture est', 'Aertoit Couverture est'),
  `body`  = REPLACE(`body`,  'Depuis plus de 20 ans, Aertoit Couverture est', 'Aertoit Couverture est')
WHERE `slug` = 'a-propos';

-- Verification: nothing below should return a row.
SELECT 'stats table still present' AS problem
FROM information_schema.tables
WHERE table_schema = 'aertoit' AND table_name = 'stats'
UNION ALL
SELECT CONCAT('claim left in pages.', 'body/intro: ', `slug`)
FROM `pages`
WHERE CONCAT(IFNULL(`intro`, ''), IFNULL(`body`, '')) REGEXP '(\\\\+ ?3000|\\\\+ ?25 Salari|\\\\+ ?160|plus de 20 ans)'
UNION ALL
SELECT CONCAT('setting still set: ', `setting_key`)
FROM `site_settings`
WHERE `setting_key` IN ('rating_value', 'review_count') AND `value` <> '';
