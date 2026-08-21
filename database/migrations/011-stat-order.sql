-- =====================================================================
-- Settle the counter row at four figures.
--
-- The Google rating is already shown in the hero ("★ 4,9"), so repeating it
-- as a counter was redundant and pushed the row to five items, which wraps
-- awkwardly. Removed from `stats` only — the hero and the AggregateRating
-- JSON-LD both read it from site_settings and are unaffected.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

DELETE FROM `stats` WHERE `label` = 'Note moyenne sur Google';

UPDATE `stats` SET `sort_order` = 1 WHERE `label` = 'Projets réalisés';
UPDATE `stats` SET `sort_order` = 2 WHERE `label` = 'Années d’expérience';
UPDATE `stats` SET `sort_order` = 3 WHERE `label` = 'Salariés qualifiés';
UPDATE `stats` SET `sort_order` = 4 WHERE `label` = 'Clients nous recommandent';

SELECT `label`, CONCAT(`prefix`, FORMAT(`value`, `decimals`), `suffix`) AS display, `sort_order`
FROM `stats` ORDER BY `sort_order`;
