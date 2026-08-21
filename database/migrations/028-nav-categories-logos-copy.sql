-- Four data-side changes requested together.
--
-- 1. Six header categories, in the requested order, each its own entry.
--    `nav_group` previously merged Couverture and Charpente into one pill;
--    they are separate categories now, and the order is the one specified.
--
-- 2. The décennale logo is restored. Migration 020 repointed that row at
--    `april.webp` because the modifications deck asked for the APRIL mark —
--    but no APRIL artwork was ever supplied, so the row has been showing a
--    generated placeholder while the real `garantie-decennale.webp`
--    (224x224, shipped with the project) sat unused in the assets folder.
--
--    APRIL, FFB and VELUX artwork still does not exist. Their rows are set to
--    NULL rather than to a placeholder image: the template already renders a
--    logo-less certification as text, and a dashed "logo à fournir" box is
--    itself visible placeholder content.
--
-- 3. The three NEEDS COPY paragraphs are removed. The live site shows those
--    three headings with no text beneath them, so there is no approved copy to
--    restore and none is invented here. The headings remain; the placeholder
--    sentence does not.
--
-- 4. "20 ans d'expérience" joins the savoir-faire heading.

USE `aertoit`;

-- ------------------------------------------------------------- 1 -----
UPDATE `services` SET `nav_group` = `name`, `nav_group_order` = NULL
WHERE `parent_id` IS NULL AND `is_published`;

UPDATE `services` SET `nav_group` = 'Isolation',             `nav_group_order` = 1 WHERE `slug` = 'isolation';
UPDATE `services` SET `nav_group` = 'Fenêtres VELUX',        `nav_group_order` = 2 WHERE `slug` = 'fenetre-de-toit-velux';
UPDATE `services` SET `nav_group` = 'Étanchéité',            `nav_group_order` = 3 WHERE `slug` = 'etancheite-de-toit-terrasse';
UPDATE `services` SET `nav_group` = 'Charpente',             `nav_group_order` = 4 WHERE `slug` = 'travaux-de-charpente';
UPDATE `services` SET `nav_group` = 'Nettoyage / Entretien', `nav_group_order` = 5 WHERE `slug` = 'nettoyage-et-entretien-de-toiture';
UPDATE `services` SET `nav_group` = 'Couverture',            `nav_group_order` = 6 WHERE `slug` = 'couverture';

-- ------------------------------------------------------------- 2 -----
UPDATE `certifications` SET
  `logo` = '/assets/certifications/garantie-decennale.webp',
  `logo_alt` = 'Logo de la garantie décennale'
WHERE `name` = 'Garantie décennale';

-- No supplied artwork; NULL renders the entry as text rather than as a
-- placeholder box.
UPDATE `certifications` SET `logo` = NULL
WHERE `logo` IN (
  '/assets/certifications/april.webp',
  '/assets/certifications/ffb.webp',
  '/assets/certifications/velux.webp'
);

-- ------------------------------------------------------------- 3 -----
UPDATE `pages`
SET `body` = REPLACE(
  `body`,
  '<p data-needs-copy="true">NEEDS COPY — le site actuel affiche ce titre sans texte.</p>',
  ''
)
WHERE `slug` = 'pourquoi-nous-choisir';

-- ------------------------------------------------------------- 4 -----
UPDATE `pages` SET `h1` = 'Savoir-faire français, 20 ans d''expérience'
WHERE `slug` = 'savoir-faire-francais';

-- Verification.
SELECT `nav_group_order` AS ord, `nav_group`, `slug`
FROM `services` WHERE `nav_group_order` IS NOT NULL ORDER BY `nav_group_order`;

SELECT `name`, IFNULL(`logo`, '(none — artwork not supplied)') AS logo
FROM `certifications` WHERE `is_published` ORDER BY `sort_order`;

SELECT 'NEEDS COPY still present' AS problem, `slug` FROM `pages` WHERE `body` LIKE '%NEEDS COPY%';
SELECT `h1` FROM `pages` WHERE `slug` = 'savoir-faire-francais';
