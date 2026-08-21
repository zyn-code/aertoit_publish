-- Deck page 3 replaces the "Nos services" dropdown with a row of five pills.
--
-- Four of them are one parent service each; the fifth merges Couverture and
-- Charpente under one label. That is a presentation grouping only — the
-- parent/child hierarchy, the URLs and the sub-service pages are untouched,
-- because the service tree drives breadcrumbs, sitemap and JSON-LD.
--
-- The label lives here rather than in the header template so it stays
-- editable alongside the services it groups.

USE `aertoit`;

ALTER TABLE `services`
  ADD COLUMN IF NOT EXISTS `nav_group` VARCHAR(60) NULL
    COMMENT 'Header pill this top-level service appears under; NULL for children'
    AFTER `sort_order`;

UPDATE `services` SET `nav_group` = 'Couverture / Charpente'
  WHERE `slug` IN ('couverture', 'travaux-de-charpente');
UPDATE `services` SET `nav_group` = 'Étanchéité'
  WHERE `slug` = 'etancheite-de-toit-terrasse';
UPDATE `services` SET `nav_group` = 'Isolation'
  WHERE `slug` = 'isolation';
-- The deck writes "Nettoyage/Entretient"; "Entretien" is the correct spelling
-- and is what the service page itself uses.
UPDATE `services` SET `nav_group` = 'Nettoyage / Entretien'
  WHERE `slug` = 'nettoyage-et-entretien-de-toiture';
UPDATE `services` SET `nav_group` = 'Fenêtres VELUX'
  WHERE `slug` = 'fenetre-de-toit-velux';

-- Every top-level service must land in a pill, or it drops out of the nav.
SELECT `slug`, `nav_group`, `sort_order`
FROM `services`
WHERE `parent_id` IS NULL AND `is_published`
ORDER BY `sort_order`;

-- Deck page 3 orders the pills Couverture/Charpente, Étanchéité, Isolation,
-- Nettoyage, VELUX — which is not `sort_order`, and `sort_order` also drives
-- the homepage cards and the sitemap. A separate rank keeps the two orders
-- from having to agree.
ALTER TABLE `services`
  ADD COLUMN IF NOT EXISTS `nav_group_order` SMALLINT UNSIGNED NULL
    COMMENT 'Left-to-right rank of the header pill; same for every service in a group'
    AFTER `nav_group`;

UPDATE `services` SET `nav_group_order` = CASE `nav_group`
  WHEN 'Couverture / Charpente' THEN 1
  WHEN 'Étanchéité'             THEN 2
  WHEN 'Isolation'              THEN 3
  WHEN 'Nettoyage / Entretien'  THEN 4
  WHEN 'Fenêtres VELUX'         THEN 5
END
WHERE `nav_group` IS NOT NULL;

SELECT `nav_group_order`, `nav_group`, `slug`
FROM `services` WHERE `nav_group` IS NOT NULL
ORDER BY `nav_group_order`, `sort_order`;
