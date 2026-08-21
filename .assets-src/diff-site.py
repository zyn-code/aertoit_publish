"""
Systematic content diff: every live aertoit.fr page vs the local rebuild.

Compares headings and body word counts, not just whether a URL responds, so
a page that exists but is missing half its sections shows up.

    python diff-site.py
"""
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser

LIVE = "https://aertoit.fr"
MINE = "http://localhost:4000"

# live path -> local path. None = intentionally absent locally.
MAP = {
    "/": "/",
    "/a-propos": "/a-propos",
    "/contact": "/contact",
    # Parents live at the root on the live site; normalised under /service/ here
    # with 301s from the old paths.
    "/couverture": "/service/couverture",
    "/isolation": "/service/isolation",
    "/fenetre-de-toit-velux": "/service/fenetre-de-toit-velux",
    "/service/travaux-de-charpente": "/service/travaux-de-charpente",
    "/service/etancheite-de-toit-terrasse": "/service/etancheite-de-toit-terrasse",
    "/service/nettoyage-et-entretien-de-toiture": "/service/nettoyage-et-entretien-de-toiture",
    "/service/couverture-en-tuiles": "/service/couverture-en-tuiles",
    "/service/couverture-en-ardoises": "/service/couverture-en-ardoises",
    "/service/couverture-en-bac-acier": "/service/couverture-en-bac-acier",
    "/service/solutions-d-isolation-laine-de-verre": "/service/solutions-d-isolation-laine-de-verre",
    "/service/solutions-d-isolation-laine-de-roche": "/service/solutions-d-isolation-laine-de-roche",
    "/service/solutions-d-isolation-sarking-fibre-de-bois": "/service/solutions-d-isolation-sarking-fibre-de-bois",
    "/service/solutions-d-isolation-sarking-polyurethane": "/service/solutions-d-isolation-sarking-polyurethane",
    "/service/solutions-d-isolation-actis": "/service/solutions-d-isolation-actis",
    "/service/accessoires-velux": "/service/accessoires-velux",
    "/carriere/assistant-polyvalent": "/carriere/assistant-polyvalent",
    "/carriere/couvreur-experimente": "/carriere/couvreur-experimente",
    "/carriere/couvreur-qualifie": "/carriere/couvreur-qualifie",
    # Blog: live slugs are accented/URL-encoded; local ones are ASCII.
    "/blog/fibre-de-bois-l%E2%80%99isolant-naturel-id%C3%A9al-contre-la-canicule":
        "/blog/fibre-de-bois-isolant-naturel-ideal-contre-la-canicule",
    "/blog/le-m%C3%A9tier-de-couvreur-un-savoir-faire-technique-essentiel-pour-la-p%C3%A9rennit%C3%A9-de-votre-habitation":
        "/blog/le-metier-de-couvreur-savoir-faire-technique",
    "/blog/goutti%C3%A8res-en-zinc-ou-pvc-que-choisir":
        "/blog/gouttieres-en-zinc-ou-pvc-que-choisir",
    "/blog/anticiper-l-hiver-pr%C3%A9parer-sa-toiture-pour-le-froid-la-pluie-et-l-humidit%C3%A9":
        "/blog/anticiper-hiver-preparer-sa-toiture",
    "/blog/nettoyage-de-goutti%C3%A8res-l-essentiel-de-l-automne":
        "/blog/nettoyage-de-gouttieres-l-essentiel-de-l-automne",
    "/blog/la-saison-du-d%C3%A9moussage-est-arriv%C3%A9e":
        "/blog/la-saison-du-demoussage-est-arrivee",
    "/blog/quelle-est-la-meilleure-isolation-pour-votre-toiture":
        "/blog/quelle-est-la-meilleure-isolation-pour-votre-toiture",
    "/blog/comment-choisir-le-bon-mat%C3%A9riau-pour-votre-toiture":
        "/blog/comment-choisir-le-bon-materiau-pour-votre-toiture",
}

SKIP_TAGS = {"script", "style", "noscript", "svg", "head"}
BLOCKS = {"h1", "h2", "h3", "h4", "p", "li"}
# Chrome present on every page — excluded so it does not mask real gaps.
CHROME = {
    "accueil", "nos services", "a propos", "à propos", "recrutement", "contact",
    "demande de devis", "demande de devis rapide", "plus d'informations",
    "je souhaite être rappelé(e)", "en savoir plus", "en savoir plus ↗",
    "navigation", "services", "avis clients", "suivez-nous", "nos prestations",
    "couverture", "isolation", "charpente", "linkedin", "facebook", "instagram",
    "mentions légales", "politique de confidentialité", "paramètres des cookies",
    "aller au contenu principal", "demander un devis", "conseils toiture",
    "nos réalisations", "réalisations", "l’énergie est notre avenir, économisons la.",
    "l’énergie est notre avenir, économisons-la.", "prendre un rendez-vous",
}
COMMUNE_RE = re.compile(r"^(dans le val-de-marne|au? |à |aux )", re.I)


class Extract(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.stack = []
        self.buf = []
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self.skip += 1
            return
        if self.skip:
            return
        if tag in BLOCKS:
            self.stack.append(tag)
            self.buf = []

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        if tag in BLOCKS and self.stack and self.stack[-1] == tag:
            self.stack.pop()
            t = re.sub(r"\s+", " ", "".join(self.buf)).strip()
            if len(t) > 2:
                self.blocks.append((tag, t))
            self.buf = []

    def handle_data(self, data):
        if self.skip or not self.stack:
            return
        self.buf.append(data)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")


def profile(html):
    p = Extract()
    p.feed(html)
    heads, words, seen = [], 0, set()
    for tag, text in p.blocks:
        low = text.lower().strip()
        # Dedup within headings and within body text separately. A single
        # `seen` set made the breadcrumb's trailing <li> (which repeats the
        # page name) shadow the <h1> that follows it, so every page falsely
        # reported its own title as a missing heading.
        bucket = "h" if tag in ("h1", "h2", "h3") else "p"
        if low in CHROME or (bucket, text) in seen:
            continue
        seen.add((bucket, text))
        if tag in ("h1", "h2", "h3") and COMMUNE_RE.match(text) and len(text) < 34:
            continue
        if tag in ("h1", "h2", "h3"):
            heads.append(text)
        words += len(text.split())
    return heads, words


def norm(h):
    return re.sub(r"[^a-z0-9]+", " ", h.lower()).strip()


rows = []
for live_path, mine_path in MAP.items():
    try:
        lh, lw = profile(fetch(LIVE + live_path))
    except Exception as e:  # noqa: BLE001
        rows.append((live_path, "LIVE FETCH FAILED: " + str(e)[:30], 0, 0, []))
        continue
    if mine_path is None:
        rows.append((live_path, "(intentionally absent)", lw, 0, []))
        continue
    try:
        mh, mw = profile(fetch(MINE + urllib.parse.quote(mine_path)))
    except Exception as e:  # noqa: BLE001
        rows.append((live_path, "LOCAL FETCH FAILED: " + str(e)[:30], lw, 0, lh[:6]))
        continue

    mine_norm = {norm(h) for h in mh}
    missing = [h for h in lh if norm(h) not in mine_norm]
    rows.append((live_path, mine_path, lw, mw, missing))

out = io.open("diff-report.txt", "w", encoding="utf-8")
def w(s=""):
    out.write(s + "\n")

w(f"{'LIVE PAGE':<54}{'WORDS live/mine':>18}  {'COVER':>6}  MISSING HEADINGS")
w("-" * 132)
total_missing = 0
for live_path, mine_path, lw, mw, missing in rows:
    pct = f"{round(100 * mw / lw)}%" if lw else "—"
    total_missing += len(missing)
    label = urllib.parse.unquote(live_path)
    if len(label) > 52:
        label = label[:49] + "..."
    w(f"{label:<54}{f'{lw}/{mw}':>18}  {pct:>6}  {len(missing)} missing")
    for h in missing[:6]:
        w(f"{'':<54}{'':>18}          - {h[:64]}")
w()
w(f"TOTAL missing headings across the site: {total_missing}")
out.close()
print(io.open("diff-report.txt", encoding="utf-8").read())
