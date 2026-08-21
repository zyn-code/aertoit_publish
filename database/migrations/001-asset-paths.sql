-- =====================================================================
-- Wire the migrated image assets to their content rows.
--
-- Assets were exported from the live Framer site and re-encoded as WebP
-- (see .assets-src/build-assets.mjs): 10.8 MB of JPEG/PNG became 1.08 MB.
--
-- Idempotent — safe to re-run.
-- =====================================================================

USE `aertoit`;

-- --- service card / hero photos --------------------------------------
UPDATE `services` SET
  `hero_image`     = CONCAT('/assets/services/', `slug`, '.webp'),
  `hero_image_alt` = CASE `slug`
    WHEN 'couverture'                        THEN 'Couvreur Aertoit posant des tuiles sur une toiture'
    WHEN 'isolation'                         THEN 'Pose de panneaux isolants en sarking sur une toiture'
    WHEN 'travaux-de-charpente'              THEN 'Charpente traditionnelle en bois réalisée par Aertoit'
    WHEN 'etancheite-de-toit-terrasse'       THEN 'Travaux d’étanchéité sur un toit-terrasse'
    WHEN 'nettoyage-et-entretien-de-toiture' THEN 'Nettoyage et démoussage d’une toiture'
    WHEN 'fenetre-de-toit-velux'             THEN 'Fenêtre de toit VELUX installée par Aertoit'
    ELSE `name`
  END
WHERE `slug` IN (
  'couverture', 'isolation', 'travaux-de-charpente',
  'etancheite-de-toit-terrasse', 'nettoyage-et-entretien-de-toiture',
  'fenetre-de-toit-velux'
);

-- --- blog covers ------------------------------------------------------
-- Only the four posts whose covers exist on the live homepage. The older
-- four keep NULL covers until their images are supplied.
UPDATE `blog_posts` SET `cover_image` = '/assets/blog/fibre-de-bois.webp',
  `cover_image_alt` = 'Panneau isolant en fibre de bois'
  WHERE `slug` = 'fibre-de-bois-isolant-naturel-ideal-contre-la-canicule';

UPDATE `blog_posts` SET `cover_image` = '/assets/blog/metier-de-couvreur.webp',
  `cover_image_alt` = 'Couvreur au travail sur une toiture'
  WHERE `slug` = 'le-metier-de-couvreur-savoir-faire-technique';

UPDATE `blog_posts` SET `cover_image` = '/assets/blog/gouttieres-zinc-pvc.webp',
  `cover_image_alt` = 'Gouttière en zinc le long d’une toiture'
  WHERE `slug` = 'gouttieres-en-zinc-ou-pvc-que-choisir';

UPDATE `blog_posts` SET `cover_image` = '/assets/blog/preparer-hiver.webp',
  `cover_image_alt` = 'Toiture sous la pluie en hiver'
  WHERE `slug` = 'anticiper-hiver-preparer-sa-toiture';

SELECT slug, hero_image FROM `services` ORDER BY sort_order;
SELECT slug, cover_image FROM `blog_posts` WHERE cover_image IS NOT NULL;
