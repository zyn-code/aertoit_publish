# À fournir par Aertoit

Everything in the modifications deck is implemented. Four items could not be
derived from anything in the repo or on the live site, and each is wired up
with a visible placeholder rather than left silently missing — so a gap shows
up in review instead of shipping unnoticed.

| # | Item | Where it lands | What is there now |
|---|------|----------------|-------------------|
| 1 | **APRIL logo** | Homepage, "Les plus d'AERTOIT", garantie décennale badge | `frontend/public/assets/certifications/april.webp` — a dashed grey box reading "APRIL / logo a fournir" |
| 2 | **FFB logo** | Same block, fourth badge | `frontend/public/assets/certifications/ffb.webp` — same treatment |
| 3 | **VELUX logo** | Same block, third badge | `frontend/public/assets/certifications/velux.webp` — same treatment. Not asked for by the deck; the row has had no logo since the first import even though the live site shows the badge |
| 4 | **TikTok profile URL** | Contact block + footer, beside LinkedIn / Facebook / Instagram | Nothing renders. The account is configured but blank, and the links component skips any social with no URL, so no dead link ships |
| 5 | **New "Nettoyage et Entretien" photo** | `/service/nettoyage-et-entretien-de-toiture` card and hero | The current photo. The deck marks it "Changer cette photo" but does not supply the replacement |

## How to supply them

**Logos (1–3)** — replace the file at the same path, keeping the `.webp`
extension. No database or code change is needed; the `certifications` rows
already point at these paths. Roughly 144×144 works best.

**TikTok (4)** — one row:

```sql
UPDATE `site_settings` SET `value` = 'https://www.tiktok.com/@…'
WHERE `setting_key` = 'social_tiktok';
```

**Nettoyage photo (5)** — drop the new image in as
`frontend/public/assets/services/nettoyage-et-entretien-de-toiture.webp`.

Rebuild after any of these with `npm run build` in `frontend/`.

## Also still blank

Unrelated to this deck, but outstanding since the first build: the company
identifiers that LCEN art. 6-III requires on `/mentions-legales` — SIRET, RCS,
share capital, director, VAT number. They render as visible placeholders on
that page. `legal_insurer` is now filled in ("APRIL"), which the deck supplied.

## Hero carousel photographs

`/` now shows a five-photo panel beside the headline, seeded from Aertoit's own
work photographs already in the repo. Deck page 2 asks to "changer les photos
carrousels" — if specific photographs are wanted, they are rows, not code:

```sql
SELECT * FROM `hero_slides` ORDER BY `sort_order`;
UPDATE `hero_slides` SET `image` = '/assets/…', `image_alt` = '…' WHERE `id` = 1;
```

Every slide needs an `image_alt` that describes the photograph — it is what a
screen-reader user gets in place of the picture.


---

# Added by the redesign pass

## 6 — Real chantiers for /réalisations

The gallery held three rows titled `[EXEMPLE] …` whose own summary read
*"Ligne de démonstration — à remplacer par un chantier réel avant mise en
ligne."* They carried no photographs and no body. They are now unpublished
(migration `024`), so `/realisations` renders its real empty state and no
placeholder text is reachable or indexable.

To publish real ones, insert rows with `is_published = TRUE`; the gallery, the
sitemap and the prerender list pick them up with no code change:

```sql
INSERT INTO `projects` (`slug`, `title`, `commune`, `postal_code`, `year`,
                        `summary`, `image_after`, `image_after_alt`, `is_published`)
VALUES ('refection-toiture-ardoise-cachan', 'Réfection de toiture en ardoise',
        'Cachan', '94230', 2025, '…', '/assets/realisations/…webp', '…', TRUE);
```

## 7 — Confirm the postal address

`site_settings` holds **19 Rue Dispan, 94240 L'Haÿ-les-Roses**, and that is
what the footer, the contact page, the mentions légales and the LocalBusiness
JSON-LD all render from. **22 Rue des Jardins** appears nowhere in the
repository — not in the database, the seed data, the migrations or any
template. The codebase therefore does establish one answer, but since the two
were raised as being in conflict, please confirm which is correct before
launch. If it is the second, one row changes and every surface follows:

```sql
UPDATE `site_settings` SET `value` = '22 Rue des Jardins' WHERE `setting_key` = 'address_street';
```

## 8 — Figures removed as unsupported

Removed sitewide on instruction (migration `023`): **+3000 projets réalisés**,
**+20 années d'expérience**, **+25 salariés qualifiés**, **+160 clients nous
recommandent**, and the **4,9 / 5** rating.

Worth knowing: these were not invented for this build — they were carried over
verbatim from the live aertoit.fr, so they are Aertoit's own published wording.
They were removed because none can be evidenced from the approved content, and
the rating additionally fed an `AggregateRating` into the LocalBusiness
structured data, where an unverifiable number can earn a rich result the
business cannot defend.

If any of them can be substantiated, they can come back. The homepage now
leads on certifications instead, which are verifiable, so nothing needs
redesigning to accommodate a returning figure.

## 9 — Test rows in `quote_requests`

Nine rows from development testing remain (`Test Complet`, `Marc Rappel`,
`Claire Navigateur`, `Jean Testeur`, …, all with `example.fr` / `example.com`
addresses). They are excluded from `database/aertoit-dump.sql` and so will not
travel to another environment, but you may want them cleared locally:

```sql
DELETE FROM `quote_requests` WHERE `email` LIKE '%@example.%' OR `email` IS NULL;
```
