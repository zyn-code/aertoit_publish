-- Deck pages 2 and 3: the hero gains a photo panel beside the copy, and the
-- deck asks for its carousel photos to be changed.
--
-- The slides live in their own table so swapping a photograph is one row, not
-- a template edit and a rebuild of the component. Seeded from the work
-- photographs already in the repo, which are Aertoit's own and are different
-- from the three the live hero cycles.

USE `aertoit`;

CREATE TABLE IF NOT EXISTS `hero_slides` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `image`        VARCHAR(255) NOT NULL,
  `image_alt`    VARCHAR(255) NOT NULL,
  `sort_order`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Idempotent: re-running the migration must not stack duplicate slides.
DELETE FROM `hero_slides`;

INSERT INTO `hero_slides` (`image`, `image_alt`, `sort_order`) VALUES
  ('/assets/services/couverture.webp',
   'Toiture en ardoises posée par les couvreurs Aertoit', 1),
  ('/assets/services/travaux-de-charpente.webp',
   'Charpente en bois neuve montée par l’équipe Aertoit', 2),
  ('/assets/services/couverture-en-tuiles.webp',
   'Couverture en tuiles terre cuite rénovée par Aertoit', 3),
  ('/assets/services/fenetre-de-toit-velux.webp',
   'Fenêtre de toit VELUX installée dans une couverture en ardoises', 4),
  ('/assets/services/etancheite-de-toit-terrasse.webp',
   'Étanchéité d’un toit-terrasse réalisée par Aertoit', 5);

SELECT `sort_order`, `image`, `image_alt` FROM `hero_slides`
WHERE `is_published` ORDER BY `sort_order`;
