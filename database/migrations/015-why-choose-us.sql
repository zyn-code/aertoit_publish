-- =====================================================================
-- "Pourquoi Nous Choisir ?" — the block the live site repeats across all
-- service pages and à-propos.
--
-- It was being lost: the body extractor treats anything appearing on most
-- pages as chrome, and this is genuine content that happens to repeat. It
-- is stored once here and rendered by a shared component, the same
-- treatment as the FAQ and the closing CTA.
--
-- ⚠ Only the first of the four items has body copy on the live site — the
-- other three are titles over empty accordion panels there. Their copy is
-- marked NEEDS COPY rather than invented.
--
-- Idempotent.
-- =====================================================================

USE `aertoit`;

INSERT INTO `pages` (`slug`, `h1`, `intro`, `body`, `meta_title`, `meta_description`, `is_published`)
VALUES (
  'pourquoi-nous-choisir',
  'Pourquoi Nous Choisir ?',
  'Professionnels de la toiture, les équipes d’Aertoit Couverture portent une attention particulière à vous offrir une qualité irréprochable dans la réalisation de vos toitures. Nous mettons un point d’honneur à respecter les délais annoncés lors de l’établissement de votre devis.',
  CONCAT(
    '<h3>Dépannage d’Urgence</h3>',
    '<p>En cas d’urgence, nous mettons tout en œuvre pour mobiliser une équipe afin d’intervenir dans les plus brefs délais. Contactez-nous à tout moment pour une intervention rapide et efficace.</p>',
    '<h3>Engagement Écologique</h3>',
    '<p data-needs-copy="true">NEEDS COPY — le site actuel affiche ce titre sans texte.</p>',
    '<h3>Couvreurs Qualifiés</h3>',
    '<p data-needs-copy="true">NEEDS COPY — le site actuel affiche ce titre sans texte.</p>',
    '<h3>Service d’Accueil</h3>',
    '<p data-needs-copy="true">NEEDS COPY — le site actuel affiche ce titre sans texte.</p>'
  ),
  'Pourquoi choisir Aertoit Couverture',
  'Dépannage d’urgence, engagement écologique, couvreurs qualifiés et service d’accueil : pourquoi confier votre toiture à Aertoit Couverture.',
  -- Not a routable page: it is a section, surfaced only via the shared
  -- component. Keeping it unpublished keeps it out of the sitemap.
  FALSE
)
ON DUPLICATE KEY UPDATE
  `h1` = VALUES(`h1`), `intro` = VALUES(`intro`), `body` = VALUES(`body`),
  `meta_title` = VALUES(`meta_title`), `meta_description` = VALUES(`meta_description`);

SELECT `slug`, `is_published`, CHAR_LENGTH(`body`) AS body_chars,
       (CHAR_LENGTH(`body`) - CHAR_LENGTH(REPLACE(`body`, 'NEEDS COPY', ''))) / 10 AS gaps
FROM `pages` ORDER BY `slug`;
