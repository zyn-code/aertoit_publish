"""
Extracts body content for every page still short of parity, and generates
005-content-parity.sql.

Covers the six parent services, three career postings and eight blog posts.
Content comes from the live pages rather than being rewritten.

    python extract-all.py
"""
import io
import json
import os
import re
import urllib.request
from html.parser import HTMLParser

BASE = "https://aertoit.fr"

SERVICES = {
    "couverture": "/couverture",
    "isolation": "/isolation",
    "fenetre-de-toit-velux": "/fenetre-de-toit-velux",
    "travaux-de-charpente": "/service/travaux-de-charpente",
    "etancheite-de-toit-terrasse": "/service/etancheite-de-toit-terrasse",
    "nettoyage-et-entretien-de-toiture": "/service/nettoyage-et-entretien-de-toiture",
}
CAREERS = {
    "assistant-polyvalent": "/carriere/assistant-polyvalent",
    "couvreur-experimente": "/carriere/couvreur-experimente",
    "couvreur-qualifie": "/carriere/couvreur-qualifie",
}
POSTS = {
    "fibre-de-bois-isolant-naturel-ideal-contre-la-canicule":
        "/blog/fibre-de-bois-l%E2%80%99isolant-naturel-id%C3%A9al-contre-la-canicule",
    "le-metier-de-couvreur-savoir-faire-technique":
        "/blog/le-m%C3%A9tier-de-couvreur-un-savoir-faire-technique-essentiel-pour-la-p%C3%A9rennit%C3%A9-de-votre-habitation",
    "gouttieres-en-zinc-ou-pvc-que-choisir":
        "/blog/goutti%C3%A8res-en-zinc-ou-pvc-que-choisir",
    "anticiper-hiver-preparer-sa-toiture":
        "/blog/anticiper-l-hiver-pr%C3%A9parer-sa-toiture-pour-le-froid-la-pluie-et-l-humidit%C3%A9",
    "nettoyage-de-gouttieres-l-essentiel-de-l-automne":
        "/blog/nettoyage-de-goutti%C3%A8res-l-essentiel-de-l-automne",
    "la-saison-du-demoussage-est-arrivee":
        "/blog/la-saison-du-d%C3%A9moussage-est-arriv%C3%A9e",
    "quelle-est-la-meilleure-isolation-pour-votre-toiture":
        "/blog/quelle-est-la-meilleure-isolation-pour-votre-toiture",
    "comment-choisir-le-bon-materiau-pour-votre-toiture":
        "/blog/comment-choisir-le-bon-mat%C3%A9riau-pour-votre-toiture",
}

SKIP = {"script", "style", "noscript", "svg", "head"}
BLOCKS = {"h1", "h2", "h3", "h4", "p", "li"}

# Site chrome, plus the two blocks rendered by shared components locally
# (the FAQ accordion and the closing CTA) — those must not be duplicated
# into a page's stored body.
CHROME = {
    "accueil", "nos services", "a propos", "à propos", "recrutement", "contact",
    "demande de devis", "demande de devis rapide", "plus d'informations",
    "je souhaite être rappelé(e)", "en savoir plus", "nos prestations",
    "navigation", "services", "avis clients", "suivez-nous", "couverture",
    "isolation", "charpente", "linkedin", "facebook", "instagram",
    "questions / réponses", "aertoit couverture : votre partenaire de confiance",
    "appellez-nous dès maintenant", "appelez-nous dès maintenant",
    "prendre un rendez-vous", "postuler", "envoyer ma candidature",
    "etanchéité de toit terrasse",
    "nettoyage et entretien de toiture", "fenêtres de toit velux",
    "l’énergie est notre avenir, économisons la.",
    "contactez nous dès que possible pour convenir d'un rendez-vous avec une estimation gratuite.",
}
COMMUNE_RE = re.compile(r"^(dans le val-de-marne|au? |à |aux )", re.I)

# Everything from here down is the page's trailing furniture: the FAQ block,
# the closing CTA and the footer. Framer emits it inline with the body, so a
# naive extraction pulls a whole second footer — complete with an address —
# into every stored body. Cut at the earliest of these markers instead of
# trying to blacklist each line.
TAIL_MARKERS = [
    re.compile(r"^Prêt à résoudre", re.I),
    re.compile(r"^L[’'`]énergie est notre avenir", re.I),
    re.compile(r"^\d+\s+Rue\s", re.I),
    re.compile(r"contact@aertoit", re.I),
    re.compile(r"^0[1-9](\s?\d{2}){4}$"),
    re.compile(r"^(Pourquoi choisir la fibre de bois|Quels sont les avantages des tuiles"
               r"|Est-il possible d.{1,3}installer une fenêtre|Comment garantir l.{1,3}étanchéité"
               r"|Combien de fois par an)", re.I),
    re.compile(r"^Aertoit Couverture\s*:\s*votre partenaire", re.I),
]


def is_tail(text):
    return any(m.search(text) for m in TAIL_MARKERS)


class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.stack = []
        self.buf = []
        self.blocks = []

    def handle_starttag(self, t, a):
        if t in SKIP:
            self.skip += 1
            return
        if self.skip:
            return
        if t in BLOCKS:
            self.stack.append(t)
            self.buf = []

    def handle_endtag(self, t):
        if t in SKIP:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        if t in BLOCKS and self.stack and self.stack[-1] == t:
            self.stack.pop()
            s = re.sub(r"\s+", " ", "".join(self.buf)).strip()
            if len(s) > 2:
                self.blocks.append((t, s))
            self.buf = []

    def handle_data(self, d):
        if self.skip or not self.stack:
            return
        self.buf.append(d)


def esc(s):
    return (s or "").replace("\\", "\\\\").replace("'", "''")


LIST_HEADINGS = ("les missions", "profil recherché", "vos missions", "compétences")


def body_html(url, drop_first_heading=True, listify_after_headings=False):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")
    p = P()
    p.feed(html)

    # Truncate at the first trailing-chrome marker.
    blocks = []
    for tag, text in p.blocks:
        if is_tail(re.sub(r"\s+", " ", text).strip()):
            break
        blocks.append((tag, text))

    parts, seen, dropped_h1 = [], set(), not drop_first_heading
    for tag, text in blocks:
        low = text.lower().strip()
        if low in CHROME or text in seen:
            continue
        # Threshold of 3, not 12 — an earlier pass used 12 and silently ate
        # short but real headings such as "Conclusion".
        if len(text) < 3:
            continue
        if tag in ("h1", "h2", "h3") and COMMUNE_RE.match(text) and len(text) < 34:
            continue
        if tag == "h1" and not dropped_h1:
            dropped_h1 = True          # the page renders its own H1
            seen.add(text)
            continue
        seen.add(text)
        if listify_after_headings and tag == "p" and len(text) < 95 and not text.endswith("."):
            # Short, unpunctuated line under a list-style heading: a bullet.
            if parts and any(h in parts[-1].lower() for h in LIST_HEADINGS) or (
                parts and parts[-1].startswith("<li>")):
                parts.append(f"<li>{text}</li>")
                continue
        if tag in ("h2", "h3", "h4"):
            # Preserve the level. Flattening everything to <h2> destroyed
            # the document outline on pages that nest three levels deep.
            parts.append(f"<{tag}>{text}</{tag}>")
        elif tag == "li":
            parts.append(f"<li>{text}</li>")
        else:
            parts.append(f"<p>{text}</p>")

    out, in_ul = [], False
    for c in parts:
        li = c.startswith("<li>")
        if li and not in_ul:
            out.append("<ul>")
            in_ul = True
        elif not li and in_ul:
            out.append("</ul>")
            in_ul = False
        out.append(c)
    if in_ul:
        out.append("</ul>")
    return "".join(out)


sql = io.open("../database/migrations/005-content-parity.sql", "w", encoding="utf-8")
sql.write("-- Generated by .assets-src/extract-all.py — do not edit by hand.\n")
sql.write("-- Body copy recovered from the live site for the pages that were still stubs.\n")
sql.write("USE `aertoit`;\n\n")

report = []
for slug, path in SERVICES.items():
    h = body_html(BASE + path)
    sql.write(f"UPDATE `services` SET `body` = '{esc(h)}' WHERE `slug` = '{esc(slug)}';\n")
    report.append(("service", slug, len(h)))

for slug, path in CAREERS.items():
    h = body_html(BASE + path, listify_after_headings=True)
    sql.write(f"UPDATE `job_postings` SET `body` = '{esc(h)}' WHERE `slug` = '{esc(slug)}';\n")
    report.append(("career", slug, len(h)))

for slug, path in POSTS.items():
    h = body_html(BASE + path)
    sql.write(f"UPDATE `blog_posts` SET `body` = '{esc(h)}' WHERE `slug` = '{esc(slug)}';\n")
    report.append(("post", slug, len(h)))

sql.write("""
SELECT 'services' AS t, slug, CHAR_LENGTH(body) AS chars FROM `services` WHERE parent_id IS NULL
UNION ALL SELECT 'careers', slug, CHAR_LENGTH(body) FROM `job_postings`
UNION ALL SELECT 'posts', slug, CHAR_LENGTH(body) FROM `blog_posts`;
""")
sql.close()

print(f"{'KIND':<9}{'SLUG':<56}{'BODY CHARS':>11}")
for kind, slug, n in report:
    flag = "  <- still thin" if n < 400 else ""
    print(f"{kind:<9}{slug:<56}{n:>11}{flag}")
