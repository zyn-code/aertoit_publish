-- Structured blocks for editorial pages.
--
-- The à-propos page held everything in one `body` HTML string: the intro, a
-- list of values, the team roster and a duplicate of the job adverts that the
-- careers section already renders from `job_postings`. A single blob can only
-- ever be laid out as one column of prose, which is exactly the problem with
-- that page.
--
-- These rows carry the same words, split into addressable pieces so the
-- template can lay them out as cards and alternating bands — and so an editor
-- can still change any of them without touching a template.
--
-- Nothing is invented here: every title and every line below is lifted from
-- the existing `pages.body` for a-propos, with two spelling corrections
-- ("Satifaction" -> "Satisfaction", "disponnibles" -> "disponibles").

USE `aertoit`;

CREATE TABLE IF NOT EXISTS `page_blocks` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_slug`    VARCHAR(120) NOT NULL,
  -- Groups blocks into a band: 'valeur', 'equipe', …
  `kind`         VARCHAR(40)  NOT NULL,
  `title`        VARCHAR(200) NOT NULL,
  `text`         VARCHAR(500) NOT NULL DEFAULT '',
  `icon`         VARCHAR(40)  NOT NULL DEFAULT '',
  `sort_order`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `ix_page_blocks` (`page_slug`, `kind`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Idempotent: re-running must not stack duplicates.
DELETE FROM `page_blocks` WHERE `page_slug` = 'a-propos';

INSERT INTO `page_blocks` (`page_slug`, `kind`, `title`, `text`, `icon`, `sort_order`) VALUES
  ('a-propos', 'valeur', 'Écoute et Conseils',
   'Nos couvreurs experts sont à votre écoute pour vous offrir des solutions personnalisées et adaptées à vos besoins.',
   'ear', 1),
  ('a-propos', 'valeur', 'Excellence',
   'Nous mettons un point d''honneur à garantir une qualité irréprochable et une propreté méticuleuse sur chaque projet.',
   'star', 2),
  ('a-propos', 'valeur', 'Satisfaction Client',
   'Votre satisfaction est notre priorité absolue, nous travaillons sans relâche pour vous offrir une expérience exceptionnelle.',
   'heart', 3),

  ('a-propos', 'equipe', 'Yoann et son Équipe', 'Couvreur / Charpentier', '', 1),
  ('a-propos', 'equipe', 'Thomas et son Équipe', 'Couvreur / Zingueur', '', 2),
  ('a-propos', 'equipe', 'Nicolas et son Équipe', 'Couvreur / Charpentier / Ardoisier', '', 3),
  ('a-propos', 'equipe', 'Gérald et son Équipe', 'Couvreur / Ardoisier / Zingueur', '', 4),
  ('a-propos', 'equipe', 'Juan & Nils', 'Couvreurs', '', 5),
  ('a-propos', 'equipe', 'Patrice & Ilyes', 'Couvreurs', '', 6);

-- The page body keeps only the "Qui sommes-nous ?" prose. The values, the
-- roster and the duplicated job adverts now live in their proper homes —
-- page_blocks and job_postings — so the same words are not published twice.
UPDATE `pages` SET `body` = CONCAT(
  '<h2>Qui sommes-nous ?</h2>',
  '<p>Aertoit Couverture est votre partenaire de confiance pour tous vos besoins en toiture. ',
  'Basés à L''Haÿ-les-Roses, nous mettons notre expertise et notre passion au service de la ',
  'protection et de la beauté de votre maison.</p>'
) WHERE `slug` = 'a-propos';

UPDATE `pages` SET `intro` = 'Découvrez une équipe de professionnels de la toiture à votre service !'
WHERE `slug` = 'a-propos';

SELECT `kind`, COUNT(*) AS n FROM `page_blocks` WHERE `page_slug` = 'a-propos' GROUP BY `kind`;
SELECT CHAR_LENGTH(`body`) AS body_len, `intro` FROM `pages` WHERE `slug` = 'a-propos';
