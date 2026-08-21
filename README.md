# Aertoit Couverture — site

Rebuild of [aertoit.fr](https://aertoit.fr) on a self-hosted stack: Angular 20
with SSR, an Express + TypeScript API, and MariaDB.

All page content lives in the database rather than in templates, so copy can be
edited without a redeploy. Marketing pages are prerendered to static HTML at
build time, which is what preserves the SEO the original Framer site had.

---

## Stack

| Layer     | Choice                                            |
|-----------|---------------------------------------------------|
| Frontend  | Angular 20, standalone components, signals, SSR + prerender |
| Backend   | Node 24, Express 5, TypeScript, `mysql2`, zod     |
| Database  | MariaDB 10.4+ (XAMPP locally), phpMyAdmin         |
| Styling   | SCSS with CSS custom properties                   |

---

## Layout

```
frontend/        Angular app (SSR). Prerenders 36 routes.
backend/         REST API. Content reads + form submissions.
database/
  schema.sql     Tables
  seed.sql       Base content
  migrations/    Ordered, idempotent; apply in filename order
.assets-src/     Content & image pipeline (see below)
```

---

## Setup

Requires **Node 24+** and **MariaDB/MySQL**. XAMPP is the assumed local setup,
but only for the database — **this does not go in `htdocs`**. Apache is not
used; the site is served by Node. Clone it wherever you like.

Start MySQL in the XAMPP Control Panel first, then, from the repo root:

```bash
# 1. Database — schema and all content in one shot
mysql -u root < database/aertoit-dump.sql

# 2. API on :3000
cd backend
cp .env.example .env          # edit if your MySQL isn't root/no-password
npm install
npm run dev                   # leave this running

# 3. Frontend on :4000 — in a SECOND terminal, API must be up
cd frontend
npm install
npm run build
node dist/frontend/server/server.mjs
```

Then open **http://localhost:4000**.

On Windows, `mysql` may not be on PATH — use the full path instead:
`"C:\xampp\mysql\bin\mysql.exe" -u root < database/aertoit-dump.sql`

> **The API must be up before `npm run build`.** Prerendering asks it for the
> service, blog, project and career slugs. If it is unreachable the build still
> succeeds — those routes fall back to server rendering — but nothing is
> prerendered, and you lose the SEO that is the point of the setup. A good
> build prints `Prerendered 36 static routes.`

### Dev mode (hot reload)

For working on the frontend, `npm start` in `frontend/` gives you :4200 with
live reload. The API still needs to be running on :3000.

Dev mode does **not** prerender and does not exercise SSR, so check anything
SEO-related against the built server on :4000 instead.

### Running on different ports

Three settings have to agree. To put the API on 3001 and the site on 4001:

```bash
# backend/.env
PORT=3001
CORS_ORIGINS=http://localhost:4200,http://localhost:4001

# build, so prerendering can reach the API
API_URL=http://localhost:3001/api npm run build

# serve, so the /api proxy can reach the API
PORT=4001 API_ORIGIN=http://localhost:3001 node dist/frontend/server/server.mjs
```

### Re-exporting the database

After changing content, refresh the committed dump with
`sh database/export-db.sh`.

`database/schema.sql` + `seed.sql` + `migrations/` are the historical build-up
and are kept for provenance; the dump is their end state and is all you need
for a fresh install.

---

## Notes worth knowing

**`NG_ALLOWED_HOSTS`** — Angular's SSR engine validates the `Host` header. An
unlisted host does not error; it silently falls back to client-side rendering
and serves a ~3 kB empty shell. `server.ts` sets a default covering the
production domain and localhost. Override it when deploying elsewhere.

**Rate limiting** — reads are capped at 600/min per IP and skip loopback, so
the prerender pass doesn't exhaust the visitors' budget. Writes are two-tier:
30 attempts/15 min, of which 5 may be accepted submissions.

**Quote requests** come in two shapes. `full` (the contact page) requires
e-mail and commune; `callback` (the short form on service pages) does not. A
zod refinement enforces the difference, and RGPD consent is mandatory for both
and stored as the audit trail.

**Content pipeline** — `.assets-src/` holds the scripts that derived every
page's content and imagery from the live site and generated the SQL
migrations. They are committed as provenance and are re-runnable:

| Script                  | Purpose                                              |
|-------------------------|------------------------------------------------------|
| `extract-bodies.py`     | Page bodies, with chrome detected by cross-page frequency |
| `build-assets.mjs`      | Images → WebP (13 MB → 1.1 MB)                       |
| `subset-fonts.py`       | Fonts → French subset (395 kB → 86 kB)               |
| `verify-content.py`     | Sentence-level coverage against the live site         |
| `audit-pages.py`        | Broken links, missing alt, H1 count, empty sections   |
| `diff-site.py`          | Heading parity against the live site                  |

---

## Fonts

`frontend/public/assets/fonts/` — **Satoshi** (Fontshare licence) and
**Inter** (SIL OFL), both subset to the French character set. See the README
there before replacing them.

---

## Outstanding

Items that need content from Aertoit and cannot be derived:

- VELUX "Installateur Conseil Expert" badge image
- Legal identifiers for `mentions-legales`: SIRET, RCS, capital, publication
  director, insurer, host — the page renders visible placeholders until these
  are supplied in `site_settings`
- Real réalisations projects (the three seeded rows are unpublished examples)
- Three "Pourquoi Nous Choisir" descriptions — the live site shows those
  titles over empty panels
- Review of FAQ answers 2–5, which were written for this rebuild
