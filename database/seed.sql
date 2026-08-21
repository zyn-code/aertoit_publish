-- =====================================================================
-- Aertoit Couverture — seed data
--
-- Content sourced from the live aertoit.fr analysis. All French spelling
-- and grammar errors found on the live site are CORRECTED here:
--   Appellez      -> Appelez
--   Toit-Terasse  -> Toit-Terrasse
--   Instalateur   -> Installateur
--   Selectionnez  -> Sélectionnez
--   Fenètres      -> Fenêtres
--   Saisssez      -> Saisissez
--   fait appelle  -> fait appel
--   "avec une toit terrasse" -> "sur un toit terrasse"
--   "d'une toit terrasse"    -> "d'un toit terrasse"
--
-- French apostrophes use U+2019 (’) as on the original site, which also
-- avoids SQL quote escaping throughout.
--
-- ⚠ ITEMS NEEDING REAL CONTENT BEFORE LAUNCH are marked "NEEDS CONTENT".
-- =====================================================================

USE `aertoit`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `job_applications`;
TRUNCATE TABLE `quote_requests`;
TRUNCATE TABLE `projects`;
TRUNCATE TABLE `blog_posts`;
TRUNCATE TABLE `job_postings`;
TRUNCATE TABLE `faqs`;
TRUNCATE TABLE `testimonials`;
TRUNCATE TABLE `certifications`;
TRUNCATE TABLE `site_settings`;
TRUNCATE TABLE `services`;
SET FOREIGN_KEY_CHECKS = 1;


-- ---------------------------------------------------------------------
-- site_settings
-- NOTE: `contact_email` is the single source of truth for the address.
-- The live site displays contact@aertoit.fr but links mailto:...@aertoit.com
-- Reading it from here is what stops that drifting again.
-- ---------------------------------------------------------------------
INSERT INTO `site_settings` (`setting_key`, `value`, `group_name`) VALUES
  ('company_name',      'Aertoit Couverture',                  'identity'),
  ('legal_name',        'Aertoit',                             'identity'),
  ('tagline',           'L’énergie est notre avenir, économisons-la.', 'identity'),
  ('founded_year',      '2005',                                'identity'),
  ('contact_email',     'contact@aertoit.fr',                  'contact'),
  ('phone_display',     '01 46 63 99 59',                      'contact'),
  ('phone_e164',        '+33146639959',                        'contact'),
  ('address_street',    '19 Rue Dispan',                       'contact'),
  ('address_locality',  'L’Haÿ-les-Roses',                     'contact'),
  ('address_postal',    '94240',                               'contact'),
  ('address_region',    'Val-de-Marne',                        'contact'),
  ('address_country',   'FR',                                  'contact'),
  ('service_area',      'Val-de-Marne et Île-de-France',        'contact'),
  ('social_linkedin',   'https://www.linkedin.com/company/aertoit-couverture/', 'social'),
  ('social_facebook',   'https://www.facebook.com/profile.php?id=61572539914910', 'social'),
  ('social_instagram',  'https://www.instagram.com/aertoit',    'social'),
  -- Deliberately empty. A 4,9 average over 160 reviews could not be
  -- substantiated from the approved content, and the same numbers fed an
  -- AggregateRating into the LocalBusiness JSON-LD. The keys remain so a
  -- template reading them gets '' rather than undefined.
  ('rating_value',      '',                                    'reviews'),
  ('review_count',      '',                                    'reviews'),
  ('callback_promise',  'Nous vous recontactons sous 48h',      'contact'),
  -- NEEDS CONTENT: required by LCEN art. 6-III for the mentions légales page
  ('legal_siret',       '',                                    'legal'),
  ('legal_rcs',         '',                                    'legal'),
  ('legal_capital',     '',                                    'legal'),
  ('legal_director',    '',                                    'legal'),
  ('legal_vat',         '',                                    'legal'),
  ('legal_insurer',     '',                                    'legal'),
  ('host_name',         '',                                    'legal'),
  ('host_address',      '',                                    'legal');


-- ---------------------------------------------------------------------
-- services (6)
-- ---------------------------------------------------------------------
INSERT INTO `services`
  (`slug`, `name`, `h1`, `card_title`, `card_excerpt`, `intro`,
   `meta_title`, `meta_description`, `icon`, `sort_order`) VALUES

('couverture', 'Couverture',
 'Travaux de Couverture dans le Val-de-Marne',
 'Travaux de Couverture',
 'Une équipe de couvreurs spécialisée à votre service.',
 'Tuiles, ardoises, zinc ou bac acier : nos couvreurs interviennent sur tous types de toitures, en rénovation comme en neuf, dans le respect du patrimoine architectural francilien.',
 'Aertoit : Votre Expert en Travaux de Couverture dans le Val-de-Marne',
 'Découvrez les solutions de couverture d’Aertoit Couverture : tuiles, ardoises, zinc, bac acier. Expertise, durabilité et garantie décennale dans le Val-de-Marne.',
 'couverture', 1),

('isolation', 'Isolation',
 'Solutions d’Isolation de Toiture dans le Val-de-Marne',
 'Solutions d’Isolation',
 'Choisissez la technique d’isolation idéale pour votre habitat.',
 'Laine de verre, laine de roche, sarking en fibre de bois ou polyuréthane : nous déterminons avec vous la solution la mieux adaptée à votre habitation et à votre budget.',
 'Aertoit : Votre Expert en Travaux d’Isolation dans le Val-de-Marne',
 'Découvrez les solutions d’isolation d’Aertoit : laine de verre, laine de roche, sarking (fibre de bois, polyuréthane). Certifié RGE QUALIBAT.',
 'isolation', 2),

('travaux-de-charpente', 'Charpente',
 'Travaux de Charpente Traditionnelle',
 'Travaux de Charpente',
 'Confiez-nous la fabrication ou la rénovation de vos charpentes.',
 'Charpentes traditionnelles neuves, réparation de pièces attaquées par l’humidité ou les insectes, renforcement de structure : un savoir-faire de charpentier au service de la durabilité de votre toiture.',
 'Travaux de Charpente Traditionnelle - Aertoit : Votre Expert dans le Val-de-Marne',
 'Découvrez nos solutions sur mesure pour vos charpentes traditionnelles : robustesse, durabilité et esthétisme au service de votre habitation.',
 'charpente', 3),

('etancheite-de-toit-terrasse', 'Étanchéité de Toit-Terrasse',
 'Étanchéité de Toit-Terrasse',
 'Étanchéité de Toit-Terrasse',
 'Protégez votre maison contre les intempéries.',
 'Membranes bitumineuses, systèmes multicouches et relevés d’étanchéité : nous assurons la protection durable de vos toitures-terrasses accessibles ou inaccessibles.',
 'Étanchéité de Toit-Terrasse - Aertoit : Votre Expert dans le Val-de-Marne',
 'Assurez une étanchéité optimale pour vos toits-terrasses grâce à nos solutions fiables et durables. Garantie décennale.',
 'etancheite', 4),

('nettoyage-et-entretien-de-toiture', 'Nettoyage et Entretien de Toiture',
 'Nettoyage et Entretien de Toiture',
 'Nettoyage et Entretien de Toiture',
 'Donnez une nouvelle vie à votre toiture.',
 'Démoussage, traitement hydrofuge, nettoyage de gouttières et contrôle annuel : un entretien régulier prolonge la durée de vie de votre couverture et prévient les infiltrations.',
 'Nettoyage et Entretien de Toiture - Aertoit : Votre Expert dans le Val-de-Marne',
 'Protégez et prolongez la vie de votre toiture avec notre service de nettoyage et d’entretien professionnel dans le Val-de-Marne.',
 'nettoyage', 5),

('fenetre-de-toit-velux', 'Fenêtres de Toit VELUX',
 'Installation de Fenêtres de Toit VELUX',
 'Fenêtres de Toit VELUX',
 'Gagnez en luminosité dans toute la maison.',
 'Certifiés « Installateur Conseil Expert VELUX », nous posons et remplaçons vos fenêtres de toit avec la garantie d’une mise en œuvre conforme et parfaitement étanche.',
 'Aertoit : Installateur Conseil Expert VELUX dans le Val-de-Marne',
 'Aertoit est certifié « Installateur Conseil Expert VELUX » pour une installation professionnelle garantie dans le Val-de-Marne.',
 'velux', 6);


-- ---------------------------------------------------------------------
-- certifications — the "Les plus d’AERTOIT" block
-- ---------------------------------------------------------------------
INSERT INTO `certifications` (`name`, `description`, `logo_alt`, `sort_order`) VALUES
  ('Plus de 20 ans d’expérience',
   'Faites confiance à notre savoir-faire pour des travaux de toiture impeccables et durables.',
   'Vingt ans d’expérience en couverture', 1),
  ('Garantie décennale',
   'Profitez de la tranquillité d’esprit grâce à notre garantie décennale sur tous nos travaux de toiture.',
   'Logo garantie décennale', 2),
  ('Certifié RGE QUALIBAT',
   'Assurez-vous des services de haute qualité, réalisés par des experts reconnus et certifiés RGE QUALIBAT.',
   'Logo de la certification RGE QUALIBAT', 3),
  ('Installateur Conseil Expert VELUX',
   'Aertoit est certifié « Installateur Conseil Expert VELUX » pour une installation professionnelle garantie.',
   'Logo Installateur Conseil Expert VELUX', 4),
  ('Certifié Éco Artisan',
   'Engagés pour l’environnement, nous utilisons des matériaux écologiques et des pratiques éco-responsables.',
   'Logo de la certification Éco Artisan', 5);


-- ---------------------------------------------------------------------
-- testimonials — the six real reviews from the live site.
-- Jean-Pierre D.’s "fait appelle" corrected to "fait appel".
-- ---------------------------------------------------------------------
INSERT INTO `testimonials` (`author`, `headline`, `body`, `rating`, `google_url`, `sort_order`) VALUES
('Dragna T.', 'Merci à toute l’équipe Aertoit',
 'Une véritable écoute et de bons conseils lors de l’offre de prix. Les travaux ont été réalisés sur la période définie, avec un grand professionnalisme et sans surprise tarifaire.',
 5, 'https://g.co/kgs/dCcC2Bj', 1),
('Sébastien C.', 'Équipe compétente et rassurante',
 'Très bon professionnalisme du responsable et de ses équipes. Prise en charge parfaite depuis la réalisation du devis jusqu’à la réception du chantier.',
 5, 'https://g.co/kgs/7u2kFzt', 2),
('Vincent C.', 'Nous recommandons sans réserve',
 'Délais annoncés tenus. Travaux de qualité. Chantier au propre chaque soir. Personnels de qualité, qui aiment leur métier, ponctuels, polis, très professionnels.',
 5, 'https://g.co/kgs/VQ138dX', 3),
('Luc B.', 'Ponctuel, professionnel et à l’écoute',
 'L’équipe d’Aertoit est parfaitement autonome et est à votre écoute pour vos demandes particulières. Aertoit fait du travail de professionnel extrêmement soigné.',
 5, 'https://g.co/kgs/YSAAszk', 4),
('Jean-Pierre D.', 'Très bon rapport qualité / prix',
 'Nous avons fait appel à la société Aertoit pour un remplacement de la partie zinc de notre toiture ainsi que le remplacement de toutes les gouttières et descentes d’eau.',
 5, 'https://g.co/kgs/3bDKPDK', 5),
('Nina V.', 'Ravis de notre expérience avec Aertoit',
 'Aertoit a compris les spécificités de nos problèmes de toiture et Velux et résolu une fuite dont l’origine n’était pas évidente. Artisans professionnels, propres et aimables.',
 5, 'https://g.co/kgs/8UM6WvD', 6);


-- ---------------------------------------------------------------------
-- faqs
--
-- Q1’s answer is the real text from the live site.
-- ⚠ NEEDS CONTENT: answers 2–5 are collapsed in the live accordion and
-- were not retrievable. The text below is technically sound placeholder
-- copy written for the rebuild — have Aertoit review before launch.
-- Questions 3 and 4 have their grammar corrected.
-- ---------------------------------------------------------------------
INSERT INTO `faqs` (`question`, `answer`, `scope`, `sort_order`) VALUES
('Pourquoi choisir la fibre de bois comme isolant pour ma toiture ?',
 'La fibre de bois est un excellent isolant thermique et acoustique. Elle offre une grande capacité de déphasage thermique, c’est-à-dire qu’elle retarde le transfert de chaleur, ce qui permet de maintenir une température agréable à l’intérieur pendant les périodes de fortes chaleurs. De plus, la fibre de bois est un matériau écologique, durable et respectueux de l’environnement.',
 'global', 1),

('Quels sont les avantages des tuiles en tant que couverture pour la toiture ?',
 'La tuile offre une excellente longévité, souvent supérieure à cinquante ans, pour un entretien limité. Elle résiste bien au gel et aux fortes pluies, se répare unité par unité sans toucher au reste de la couverture, et s’intègre naturellement au bâti francilien. Terre cuite ou béton, plate ou mécanique, le choix dépend de la pente de votre toit et des règles d’urbanisme de votre commune.',
 'global', 2),

('Est-il possible d’installer une fenêtre de toit VELUX sur un toit terrasse ?',
 'Oui. Sur une toiture plate ou à très faible pente, on ne pose pas une fenêtre de toit classique mais une verrière plate ou une coupole VELUX conçue pour cet usage, montée sur une costière qui assure la reprise d’étanchéité. En tant qu’Installateur Conseil Expert VELUX, nous vérifions la compatibilité de votre support et réalisons les relevés d’étanchéité nécessaires.',
 'global', 3),

('Comment garantir l’étanchéité d’un toit terrasse ?',
 'L’étanchéité repose sur trois points : un support sain et correctement pentu pour l’évacuation des eaux, un complexe d’étanchéité adapté à l’usage de la terrasse, et des relevés soignés en périphérie et autour de chaque émergence. Un contrôle visuel annuel et le nettoyage des évacuations suffisent ensuite à prévenir la grande majorité des infiltrations.',
 'global', 4),

('Combien de fois par an est-il recommandé de nettoyer ses gouttières et pourquoi est-ce important ?',
 'Deux fois par an suffisent dans la plupart des cas : une fois à l’automne après la chute des feuilles, une fois au printemps. Une gouttière obstruée déborde et l’eau ruisselle le long de la façade, ce qui dégrade les enduits, sature les fondations et peut provoquer des infiltrations en pied de toiture. Un nettoyage régulier coûte bien moins cher que la reprise des dégâts qu’il évite.',
 'global', 5);


-- ---------------------------------------------------------------------
-- blog_posts
--
-- The four most recent posts carry their real titles, dates and excerpts
-- from the live homepage. The four older ones are reconstructed from the
-- sitemap slugs.
-- ⚠ NEEDS CONTENT: `body` for every post. The live article bodies were
-- not captured; each body below holds the excerpt plus a visible marker.
-- ---------------------------------------------------------------------
INSERT INTO `blog_posts`
  (`slug`, `title`, `excerpt`, `body`, `meta_title`, `meta_description`, `published_at`) VALUES

('fibre-de-bois-isolant-naturel-ideal-contre-la-canicule',
 'Fibre de Bois : l’isolant naturel idéal contre la canicule',
 'Une solution durable pour mieux vivre les épisodes de canicule.',
 '<p>Une solution durable pour mieux vivre les épisodes de canicule.</p><!-- TODO: article body -->',
 'Fibre de Bois : l’isolant naturel idéal contre la canicule | Aertoit',
 'Pourquoi la fibre de bois est l’isolant le plus efficace contre la chaleur estivale : déphasage thermique, confort d’été et performance écologique.',
 '2026-06-03 09:00:00'),

('le-metier-de-couvreur-savoir-faire-technique',
 'Le métier de couvreur : un savoir-faire technique essentiel pour la pérennité de votre habitation',
 'Le métier de couvreur : expertise, précision et passion au service de votre toiture.',
 '<p>Le métier de couvreur : expertise, précision et passion au service de votre toiture.</p><!-- TODO: article body -->',
 'Le métier de couvreur : un savoir-faire technique essentiel | Aertoit',
 'Découvrez le métier de couvreur : formation, techniques, matériaux et pourquoi le choix de l’artisan détermine la durée de vie de votre toiture.',
 '2026-05-12 09:00:00'),

('gouttieres-en-zinc-ou-pvc-que-choisir',
 'Gouttières en Zinc ou PVC, quel matériau choisir ?',
 'Un comparatif complet entre le Zinc et le PVC pour vos gouttières.',
 '<p>Un comparatif complet entre le Zinc et le PVC pour vos gouttières.</p><!-- TODO: article body -->',
 'Gouttières en Zinc ou PVC : quel matériau choisir ? | Aertoit',
 'Zinc ou PVC pour vos gouttières ? Comparatif de durabilité, de coût, d’entretien et d’esthétique pour faire le bon choix.',
 '2026-04-07 09:00:00'),

('anticiper-hiver-preparer-sa-toiture',
 'Préparer sa toiture pour le froid, la pluie et l’humidité',
 'Toiture, isolation, étanchéité : tout vérifier avant l’arrivée du froid.',
 '<p>Toiture, isolation, étanchéité : tout vérifier avant l’arrivée du froid.</p><!-- TODO: article body -->',
 'Préparer sa toiture pour l’hiver : le guide complet | Aertoit',
 'Checklist avant l’hiver : état de la couverture, gouttières, isolation et points d’étanchéité à contrôler pour passer la saison sereinement.',
 '2025-12-04 09:00:00'),

('nettoyage-de-gouttieres-l-essentiel-de-l-automne',
 'Nettoyage de gouttières : l’essentiel de l’automne',
 'Pourquoi l’automne est le moment clé pour entretenir vos évacuations d’eau.',
 '<p>Pourquoi l’automne est le moment clé pour entretenir vos évacuations d’eau.</p><!-- TODO: article body -->',
 'Nettoyage de gouttières : l’essentiel de l’automne | Aertoit',
 'Feuilles, mousses et débris : pourquoi nettoyer vos gouttières à l’automne évite les infiltrations et les dégâts de façade.',
 '2025-10-15 09:00:00'),

('la-saison-du-demoussage-est-arrivee',
 'La saison du démoussage est arrivée',
 'Quand et pourquoi faire démousser sa toiture.',
 '<p>Quand et pourquoi faire démousser sa toiture.</p><!-- TODO: article body -->',
 'La saison du démoussage est arrivée | Aertoit',
 'Mousses et lichens retiennent l’humidité et abîment la couverture. Quand démousser, avec quelle technique et à quelle fréquence.',
 '2025-09-10 09:00:00'),

('quelle-est-la-meilleure-isolation-pour-votre-toiture',
 'Quelle est la meilleure isolation pour votre toiture ?',
 'Comparatif des isolants de toiture et des techniques de pose.',
 '<p>Comparatif des isolants de toiture et des techniques de pose.</p><!-- TODO: article body -->',
 'Quelle est la meilleure isolation pour votre toiture ? | Aertoit',
 'Laine de verre, laine de roche, fibre de bois ou polyuréthane : comparatif des performances, des coûts et des techniques de pose.',
 '2025-06-18 09:00:00'),

('comment-choisir-le-bon-materiau-pour-votre-toiture',
 'Comment choisir le bon matériau pour votre toiture ?',
 'Tuile, ardoise, zinc ou bac acier : les critères qui comptent.',
 '<p>Tuile, ardoise, zinc ou bac acier : les critères qui comptent.</p><!-- TODO: article body -->',
 'Comment choisir le bon matériau pour votre toiture ? | Aertoit',
 'Pente, style architectural, budget et règles d’urbanisme : les critères pour choisir entre tuile, ardoise, zinc et bac acier.',
 '2025-04-22 09:00:00');


-- ---------------------------------------------------------------------
-- job_postings
-- ---------------------------------------------------------------------
INSERT INTO `job_postings`
  (`slug`, `title`, `contract_type`, `location`, `summary`, `body`,
   `meta_title`, `meta_description`, `sort_order`) VALUES

('chef-d-equipe', 'Chef d’Équipe Couverture', 'CDI', 'L’Haÿ-les-Roses (94)',
 'Vous encadrez une équipe de couvreurs sur des chantiers de rénovation en Île-de-France.',
 '<p>Vous encadrez une équipe de couvreurs sur des chantiers de rénovation en Île-de-France.</p><!-- TODO: fiche de poste complète -->',
 'Chef d’Équipe Couverture (H/F) — Rejoignez Aertoit Couverture',
 'Aertoit Couverture recrute un chef d’équipe couverture en CDI dans le Val-de-Marne. Envoyez votre CV dès maintenant.', 1),

('couvreur-qualifie', 'Couvreur / Couvreuse Qualifié(e)', 'CDI', 'L’Haÿ-les-Roses (94)',
 'Vous réalisez des travaux de couverture en tuile, ardoise et zinc sur des chantiers variés.',
 '<p>Vous réalisez des travaux de couverture en tuile, ardoise et zinc sur des chantiers variés.</p><!-- TODO: fiche de poste complète -->',
 'Couvreur / Couvreuse Qualifié(e) (H/F) — Rejoignez Aertoit Couverture',
 'Aertoit Couverture recrute un couvreur qualifié en CDI dans le Val-de-Marne. Envoyez votre CV dès maintenant.', 2),

('couvreur-experimente', 'Couvreur / Couvreuse Expérimenté(e)', 'CDI', 'L’Haÿ-les-Roses (94)',
 'Vous intervenez en autonomie sur des chantiers de rénovation de toiture exigeants.',
 '<p>Vous intervenez en autonomie sur des chantiers de rénovation de toiture exigeants.</p><!-- TODO: fiche de poste complète -->',
 'Couvreur / Couvreuse Expérimenté(e) (H/F) — Rejoignez Aertoit Couverture',
 'Aertoit Couverture recrute un couvreur expérimenté en CDI dans le Val-de-Marne. Envoyez votre CV dès maintenant.', 3),

('assistant-polyvalent', 'Assistant(e) Polyvalent(e)', 'CDI', 'L’Haÿ-les-Roses (94)',
 'Vous assurez l’accueil, le suivi administratif des chantiers et la relation client.',
 '<p>Vous assurez l’accueil, le suivi administratif des chantiers et la relation client.</p><!-- TODO: fiche de poste complète -->',
 'Assistant(e) Polyvalent(e) (H/F) — Rejoignez Aertoit Couverture',
 'Aertoit Couverture recrute un assistant polyvalent en CDI dans le Val-de-Marne. Envoyez votre CV dès maintenant.', 4);


-- ---------------------------------------------------------------------
-- projects — réalisations gallery (the main addition vs webA)
--
-- ⚠ NEEDS CONTENT: Aertoit publishes no project archive, so there is
-- nothing real to seed. These three rows exist so the gallery, routing
-- and JSON-LD can be built and tested end to end. They are clearly
-- marked and MUST be replaced with real chantiers before launch —
-- do not publish invented project references.
-- ---------------------------------------------------------------------
INSERT INTO `projects`
  (`slug`, `title`, `service_id`, `commune`, `postal_code`, `year`,
   `summary`, `is_published`, `sort_order`)
SELECT 'exemple-refection-toiture-tuile', '[EXEMPLE] Réfection de toiture en tuile',
       s.id, 'L’Haÿ-les-Roses', '94240', 2025,
       'Ligne de démonstration — à remplacer par un chantier réel avant mise en ligne.',
       FALSE, 1
FROM `services` s WHERE s.slug = 'couverture';

INSERT INTO `projects`
  (`slug`, `title`, `service_id`, `commune`, `postal_code`, `year`,
   `summary`, `is_published`, `sort_order`)
SELECT 'exemple-isolation-sarking', '[EXEMPLE] Isolation de combles par sarking',
       s.id, 'Cachan', '94230', 2025,
       'Ligne de démonstration — à remplacer par un chantier réel avant mise en ligne.',
       FALSE, 2
FROM `services` s WHERE s.slug = 'isolation';

INSERT INTO `projects`
  (`slug`, `title`, `service_id`, `commune`, `postal_code`, `year`,
   `summary`, `is_published`, `sort_order`)
SELECT 'exemple-pose-velux', '[EXEMPLE] Pose de fenêtres de toit VELUX',
       s.id, 'Bourg-la-Reine', '92340', 2025,
       'Ligne de démonstration — à remplacer par un chantier réel avant mise en ligne.',
       FALSE, 3
FROM `services` s WHERE s.slug = 'fenetre-de-toit-velux';
