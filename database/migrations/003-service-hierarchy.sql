-- =====================================================================
-- Service hierarchy + local service areas.
--
-- The live site has a two-level service structure that is absent from its
-- sitemap, so the original build missed it entirely: three "Couverture"
-- children, five "Isolation" children and one under VELUX — nine pages of
-- real content.
--
-- It also runs a commune rotator in each sub-service hero ("Couverture en
-- Tuiles / À Antony / À Sceaux …"), which is a local-SEO play: one page
-- ranking against several town-name queries. Those communes belong in data,
-- not in a template.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

-- --- parent/child ----------------------------------------------------
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'aertoit' AND TABLE_NAME = 'services' AND COLUMN_NAME = 'parent_id'
);
SET @sql := IF(@col = 0,
  'ALTER TABLE `services`
     ADD COLUMN `parent_id` INT UNSIGNED NULL AFTER `id`,
     ADD KEY `ix_services_parent` (`parent_id`, `sort_order`),
     ADD CONSTRAINT `fk_services_parent` FOREIGN KEY (`parent_id`)
       REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT "parent_id already present"');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Optional per-page override of the rotating commune list.
SET @col2 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'aertoit' AND TABLE_NAME = 'services' AND COLUMN_NAME = 'communes'
);
SET @sql2 := IF(@col2 = 0,
  'ALTER TABLE `services` ADD COLUMN `communes` JSON NULL AFTER `intro`',
  'SELECT "communes already present"');
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;

-- --- default service area --------------------------------------------
-- Taken from the rotator on the live sub-service pages.
INSERT INTO `site_settings` (`setting_key`, `value`, `group_name`) VALUES
  ('service_communes',
   'L’Haÿ-les-Roses,Chevilly-Larue,Bourg-la-Reine,Antony,Sceaux,Le Plessis-Robinson,Fontenay-aux-Roses,Orsay,Meudon,Sèvres',
   'contact')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

SELECT `setting_key`, LEFT(`value`, 60) AS value FROM `site_settings` WHERE `setting_key` = 'service_communes';
