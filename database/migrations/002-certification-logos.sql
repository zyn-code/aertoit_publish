-- =====================================================================
-- Attach the migrated certification icons.
--
-- Four of the five were identified from the live site's asset set. The
-- VELUX "Installateur Conseil Expert" badge was not located among them
-- and stays NULL — the card renders without a logo rather than with a
-- wrong one. Idempotent.
-- =====================================================================

USE `aertoit`;

UPDATE `certifications` SET `logo` = '/assets/certifications/experience.svg'
  WHERE `name` LIKE 'Plus de 20 ans%';

UPDATE `certifications` SET `logo` = '/assets/certifications/garantie-decennale.webp'
  WHERE `name` LIKE 'Garantie décennale%';

UPDATE `certifications` SET `logo` = '/assets/certifications/rge-qualibat.webp'
  WHERE `name` LIKE 'Certifié RGE QUALIBAT%';

UPDATE `certifications` SET `logo` = '/assets/certifications/eco-artisan.svg'
  WHERE `name` LIKE 'Certifié Éco Artisan%';

SELECT `name`, COALESCE(`logo`, '(none — needs the VELUX badge)') AS logo
FROM `certifications` ORDER BY `sort_order`;
