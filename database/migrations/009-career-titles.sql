-- =====================================================================
-- Align the career posting titles with the live site exactly.
--
-- Run this as a file, never as an inline -e string: passing accented text
-- through a PowerShell here-string mangles it to '?' before mysql sees it,
-- which is how "Qualifié(e)" briefly became "Qualifi?(e)".
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

UPDATE `job_postings` SET
  `title`      = 'Couvreur/euse Qualifié(e)',
  `meta_title` = 'Couvreur/euse Qualifié(e) (H/F) — Rejoignez Aertoit Couverture'
WHERE `slug` = 'couvreur-qualifie';

SELECT `slug`, `title`, HEX(SUBSTRING(`title`, 18, 2)) AS accent_bytes
FROM `job_postings` ORDER BY `sort_order`;
