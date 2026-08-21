-- =====================================================================
-- Fill the homepage counters with figures Aertoit actually publishes.
--
-- The original seed deliberately left a completed-jobs counter out rather
-- than copy webB's "15 500 chantiers", which is FCA's number. The à-propos
-- page states "+ 3000 Projets Réalisés" and "+25 Salariés Qualifiés", so
-- those are Aertoit's own and can be used.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

INSERT INTO `stats` (`label`, `value`, `decimals`, `prefix`, `suffix`, `sort_order`) VALUES
  ('Projets réalisés', 3000, 0, '+', '', 1)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- No unique key on label, so guard the insert by hand.
DELETE t1 FROM `stats` t1
JOIN `stats` t2 ON t1.label = t2.label AND t1.id > t2.id;

INSERT INTO `stats` (`label`, `value`, `decimals`, `prefix`, `suffix`, `sort_order`)
SELECT 'Salariés qualifiés', 25, 0, '+', '', 4
WHERE NOT EXISTS (SELECT 1 FROM `stats` WHERE `label` = 'Salariés qualifiés');

UPDATE `stats` SET `sort_order` = 1 WHERE `label` = 'Projets réalisés';
UPDATE `stats` SET `sort_order` = 2 WHERE `label` = 'Années d’expérience';
UPDATE `stats` SET `sort_order` = 3 WHERE `label` = 'Clients nous recommandent';
UPDATE `stats` SET `sort_order` = 4 WHERE `label` = 'Note moyenne sur Google';

SELECT `label`, `prefix`, `value`, `suffix`, `sort_order` FROM `stats` ORDER BY `sort_order`;
