-- The réalisations gallery shipped with three demonstration rows.
--
-- They are titled "[EXEMPLE] …" and their summary reads "Ligne de
-- démonstration — à remplacer par un chantier réel avant mise en ligne."
-- They carry no photographs and no body. They existed so the gallery,
-- routing and JSON-LD could be built end to end, and were never meant to be
-- published.
--
-- Unpublished rather than deleted: the rows document the shape a real
-- chantier record takes, and un-publishing is reversible. The listing page
-- now renders its empty state, and the three detail URLs stop being
-- generated — so no placeholder text is reachable and nothing is indexed
-- that Aertoit would have to stand behind.
--
-- Add real chantiers by inserting rows with `is_published = TRUE`; the
-- gallery, the sitemap and the prerender list pick them up with no code
-- change.

USE `aertoit`;

UPDATE `projects` SET `is_published` = FALSE WHERE `slug` LIKE 'exemple-%';

SELECT
  SUM(`is_published` = TRUE)  AS published,
  SUM(`is_published` = FALSE) AS hidden_examples
FROM `projects`;
