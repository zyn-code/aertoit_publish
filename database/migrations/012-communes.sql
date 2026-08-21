-- =====================================================================
-- Seed the commune rotator lists.
--
-- The live site runs a rotating "Dans le Val-de-Marne / À Antony / À
-- Sceaux…" line under the H1 of every page served from /service/ — a
-- local-SEO play putting one page in front of a dozen town-name queries.
-- Its three root-level pages (/couverture, /isolation,
-- /fenetre-de-toit-velux) do not have it.
--
-- Presence of `communes` is what switches the rotator on, so the split is
-- data rather than a hard-coded list of slugs in the template.
--
-- Spellings are corrected: the live rotator writes "À l'Hay-les-Roses",
-- dropping both the apostrophe casing and the diaeresis in Haÿ.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

SET @communes := JSON_ARRAY(
  'Dans le Val-de-Marne',
  'À L’Haÿ-les-Roses',
  'À Chevilly-Larue',
  'À Bourg-la-Reine',
  'À Antony',
  'À Sceaux',
  'Au Plessis-Robinson',
  'À Fontenay-aux-Roses',
  'À Orsay',
  'À Meudon',
  'À Sèvres'
);

-- Every sub-service, plus the three parents the live site serves from
-- /service/. Not the three that sit at its root.
UPDATE `services` SET `communes` = @communes
WHERE `parent_id` IS NOT NULL
   OR `slug` IN (
     'travaux-de-charpente',
     'etancheite-de-toit-terrasse',
     'nettoyage-et-entretien-de-toiture'
   );

UPDATE `services` SET `communes` = NULL
WHERE `slug` IN ('couverture', 'isolation', 'fenetre-de-toit-velux');

SELECT `slug`,
       CASE WHEN `communes` IS NULL THEN 'no rotator'
            ELSE CONCAT(JSON_LENGTH(`communes`), ' communes') END AS rotator
FROM `services` ORDER BY `parent_id` IS NOT NULL, `sort_order`;
