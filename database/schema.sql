-- =====================================================================
-- Aertoit Couverture — database schema
-- Target: MariaDB 10.4+ (XAMPP) / MySQL 8.0+
-- Charset: utf8mb4 throughout (required for French accents + emoji)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `aertoit`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `aertoit`;

-- Drop in reverse dependency order so re-running is safe
DROP TABLE IF EXISTS `job_applications`;
DROP TABLE IF EXISTS `quote_requests`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `blog_posts`;
DROP TABLE IF EXISTS `job_postings`;
DROP TABLE IF EXISTS `faqs`;
DROP TABLE IF EXISTS `testimonials`;
DROP TABLE IF EXISTS `certifications`;
DROP TABLE IF EXISTS `site_settings`;
DROP TABLE IF EXISTS `services`;


-- ---------------------------------------------------------------------
-- services — the six offerings. Drives /service/:slug and home cards.
-- ---------------------------------------------------------------------
CREATE TABLE `services` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`             VARCHAR(120)  NOT NULL,
  `name`             VARCHAR(160)  NOT NULL,  -- short label, used in nav + form dropdown
  `h1`               VARCHAR(200)  NOT NULL,
  `card_title`       VARCHAR(160)  NOT NULL,
  `card_excerpt`     VARCHAR(400)  NOT NULL,
  `intro`            TEXT          NOT NULL,
  `body`             MEDIUMTEXT        NULL,
  `icon`             VARCHAR(200)      NULL,
  `hero_image`       VARCHAR(255)      NULL,
  `hero_image_alt`   VARCHAR(255)      NULL,
  `meta_title`       VARCHAR(200)  NOT NULL,
  `meta_description` VARCHAR(320)  NOT NULL,
  `sort_order`       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_published`     BOOLEAN       NOT NULL DEFAULT TRUE,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_services_slug` (`slug`),
  KEY `ix_services_pub_sort` (`is_published`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- site_settings — NAP, contact details, socials. Single source of truth
-- for the email address, so the .com/.fr mailto bug cannot recur.
-- ---------------------------------------------------------------------
CREATE TABLE `site_settings` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(80)  NOT NULL,
  `value`       TEXT         NOT NULL,
  `group_name`  VARCHAR(40)  NOT NULL DEFAULT 'general',
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- certifications — RGE Qualibat, VELUX, Éco Artisan, décennale…
-- Presented with descriptions rather than bare badges (webB-inspired).
-- ---------------------------------------------------------------------
CREATE TABLE `certifications` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(160) NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `logo`        VARCHAR(255)     NULL,
  `logo_alt`    VARCHAR(255) NOT NULL,
  `url`         VARCHAR(255)     NULL,
  `sort_order`  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_published` BOOLEAN     NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- testimonials — client reviews. `google_url` links the real review.
-- ---------------------------------------------------------------------
CREATE TABLE `testimonials` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `author`       VARCHAR(120) NOT NULL,
  `author_role`  VARCHAR(120) NOT NULL DEFAULT 'Client Aertoit',
  `headline`     VARCHAR(200) NOT NULL,
  `body`         TEXT         NOT NULL,
  `rating`       TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `google_url`   VARCHAR(255)     NULL,
  `sort_order`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_published` BOOLEAN      NOT NULL DEFAULT TRUE,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_testimonials_pub_sort` (`is_published`, `sort_order`),
  CONSTRAINT `ck_testimonials_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- faqs — `scope` lets a page pull only its own questions ('global',
-- 'contact', or a service slug). Feeds FAQPage JSON-LD.
-- ---------------------------------------------------------------------
CREATE TABLE `faqs` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question`     VARCHAR(400) NOT NULL,
  `answer`       TEXT         NOT NULL,
  `scope`        VARCHAR(120) NOT NULL DEFAULT 'global',
  `sort_order`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_published` BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  KEY `ix_faqs_scope` (`scope`, `is_published`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- blog_posts — webA has 8 posts but no index page and 4 orphans.
-- ---------------------------------------------------------------------
CREATE TABLE `blog_posts` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`             VARCHAR(200)  NOT NULL,
  `title`            VARCHAR(300)  NOT NULL,
  `excerpt`          VARCHAR(600)  NOT NULL,
  `body`             MEDIUMTEXT    NOT NULL,
  `cover_image`      VARCHAR(255)      NULL,
  `cover_image_alt`  VARCHAR(255)      NULL,
  `author`           VARCHAR(120)  NOT NULL DEFAULT 'Aertoit Couverture',
  `meta_title`       VARCHAR(200)  NOT NULL,
  `meta_description` VARCHAR(320)  NOT NULL,
  `published_at`     DATETIME      NOT NULL,
  `is_published`     BOOLEAN       NOT NULL DEFAULT TRUE,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_posts_slug` (`slug`),
  KEY `ix_posts_pub_date` (`is_published`, `published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- projects — réalisations gallery. The main content addition vs webA,
-- modelled on webB's 28 project pages.
-- ---------------------------------------------------------------------
CREATE TABLE `projects` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`             VARCHAR(200)  NOT NULL,
  `title`            VARCHAR(300)  NOT NULL,
  `service_id`       INT UNSIGNED      NULL,
  `commune`          VARCHAR(160)      NULL,
  `postal_code`      VARCHAR(10)       NULL,
  `year`             SMALLINT UNSIGNED NULL,
  `summary`          VARCHAR(600)  NOT NULL,
  `body`             MEDIUMTEXT        NULL,
  `image_before`     VARCHAR(255)      NULL,
  `image_before_alt` VARCHAR(255)      NULL,
  `image_after`      VARCHAR(255)      NULL,
  `image_after_alt`  VARCHAR(255)      NULL,
  `gallery`          JSON              NULL,  -- [{src, alt}]
  `meta_title`       VARCHAR(200)      NULL,
  `meta_description` VARCHAR(320)      NULL,
  `sort_order`       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_published`     BOOLEAN       NOT NULL DEFAULT TRUE,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_slug` (`slug`),
  KEY `ix_projects_pub_sort` (`is_published`, `sort_order`),
  CONSTRAINT `fk_projects_service` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- job_postings — recruitment (Chef d'Équipe, Couvreur Qualifié…)
-- ---------------------------------------------------------------------
CREATE TABLE `job_postings` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`             VARCHAR(160)  NOT NULL,
  `title`            VARCHAR(200)  NOT NULL,
  `contract_type`    VARCHAR(60)   NOT NULL DEFAULT 'CDI',
  `location`         VARCHAR(160)  NOT NULL,
  `summary`          VARCHAR(600)  NOT NULL,
  `body`             MEDIUMTEXT    NOT NULL,
  `meta_title`       VARCHAR(200)  NOT NULL,
  `meta_description` VARCHAR(320)  NOT NULL,
  `sort_order`       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_open`          BOOLEAN       NOT NULL DEFAULT TRUE,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_jobs_slug` (`slug`),
  KEY `ix_jobs_open_sort` (`is_open`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- quote_requests — the core lead capture.
-- `consent_given` is stored explicitly: it is the RGPD audit trail and
-- the API rejects any submission without it.
-- ---------------------------------------------------------------------
CREATE TABLE `quote_requests` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id`    INT UNSIGNED     NULL,
  `full_name`     VARCHAR(200) NOT NULL,
  `phone`         VARCHAR(40)  NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `commune`       VARCHAR(160) NOT NULL,
  `message`       TEXT             NULL,
  `consent_given` BOOLEAN      NOT NULL,
  `source_page`   VARCHAR(255)     NULL,
  `ip_address`    VARCHAR(45)      NULL,
  `user_agent`    VARCHAR(500)     NULL,
  `status`        ENUM('new','contacted','quoted','won','lost') NOT NULL DEFAULT 'new',
  `notes`         TEXT             NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_quotes_status_date` (`status`, `created_at`),
  KEY `ix_quotes_created` (`created_at`),
  CONSTRAINT `fk_quotes_service` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- job_applications — CV submissions against a posting.
-- ---------------------------------------------------------------------
CREATE TABLE `job_applications` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_posting_id` INT UNSIGNED     NULL,
  `full_name`      VARCHAR(200) NOT NULL,
  `email`          VARCHAR(255) NOT NULL,
  `phone`          VARCHAR(40)  NOT NULL,
  `message`        TEXT             NULL,
  `cv_filename`    VARCHAR(255)     NULL,
  `cv_path`        VARCHAR(500)     NULL,
  `consent_given`  BOOLEAN      NOT NULL,
  `ip_address`     VARCHAR(45)      NULL,
  `status`         ENUM('new','reviewing','interviewed','hired','rejected') NOT NULL DEFAULT 'new',
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_applications_status` (`status`, `created_at`),
  CONSTRAINT `fk_applications_job` FOREIGN KEY (`job_posting_id`)
    REFERENCES `job_postings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
