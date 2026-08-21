-- =====================================================================
-- Editorial pages that are not services, posts or job postings.
--
-- À-propos was the last page still carrying hard-coded copy in its
-- template, which left it at 88% content parity with the live site and
-- missing five sections. Giving it a row means the same edit path as
-- everything else.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

CREATE TABLE IF NOT EXISTS `pages` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`             VARCHAR(120)  NOT NULL,
  `h1`               VARCHAR(200)  NOT NULL,
  `intro`            TEXT              NULL,
  `body`             MEDIUMTEXT        NULL,
  `hero_image`       VARCHAR(255)      NULL,
  `hero_image_alt`   VARCHAR(255)      NULL,
  `meta_title`       VARCHAR(200)  NOT NULL,
  `meta_description` VARCHAR(320)  NOT NULL,
  `is_published`     BOOLEAN       NOT NULL DEFAULT TRUE,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pages_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
