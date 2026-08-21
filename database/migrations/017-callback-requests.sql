-- =====================================================================
-- Support the short "Demande de Devis Rapide" form.
--
-- The live site puts a compact callback form on every service page: service,
-- name, phone, and a "Je souhaite être rappelé(e)" button. The rebuild only
-- had the full contact form, so twelve pages were missing their primary
-- inline conversion point.
--
-- A callback asks for phone only, so `email` and `commune` become nullable
-- and `request_type` records which form produced the row. Existing rows are
-- all full submissions.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

-- MariaDB has no ADD COLUMN IF NOT EXISTS in older versions; guard by hand.
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'aertoit' AND TABLE_NAME = 'quote_requests'
    AND COLUMN_NAME = 'request_type'
);
SET @stmt := IF(@has_col = 0,
  "ALTER TABLE `quote_requests`
     ADD COLUMN `request_type` ENUM('full','callback') NOT NULL DEFAULT 'full'
     AFTER `service_id`",
  'DO 0');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- A callback carries no e-mail or commune; the full form still requires both
-- (enforced by the API schema, which is where the rule belongs).
ALTER TABLE `quote_requests`
  MODIFY `email`   VARCHAR(255) NULL,
  MODIFY `commune` VARCHAR(160) NULL;

SELECT `request_type`, COUNT(*) AS rows_count
FROM `quote_requests` GROUP BY `request_type`;
