"""
Sentence-level content check: is every block of real copy on the live site
present somewhere on the rebuild?

The heading diff only compares headings, so it would miss a dropped
paragraph. This compares every text block instead, and checks for presence
anywhere on the corresponding page — content that legitimately moved (the
FAQ into a shared component, child names into cards) still counts as
present.

    python verify-content.py
"""
import io
import re
import unicodedata
import urllib.parse
import urllib.request
from collections import Counter
from html.parser import HTMLParser

LIVE = "https://aertoit.fr"
MINE = "http://localhost:4000"

MAP = {
    "/": "/",
    "/a-propos": "/a-propos",
    "/contact": "/contact",
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
    "/blog/fibre-de-bois-l%E2%80%99isolant-naturel-id%C3%A9al-contre-la-canicule":
        "/blog/fibre-de-bois-isolant-naturel-ideal-contre-la-canicule",
    "/blog/le-m%C3%A9tier-de-couvreur-un-savoir-faire-technique-essentiel-pour-la-p%C3%A9rennit%C3%A9-de-votre-habitation":
        "/blog/le-metier-de-couvreur-savoir-faire-technique",
    "/blog/goutti%C3%A8res-en-zinc-ou-pvc-que-choisir": "/blog/gouttieres-en-zinc-ou-pvc-que-choisir",
    "/blog/anticiper-l-hiver-pr%C3%A9parer-sa-toiture-pour-le-froid-la-pluie-et-l-humidit%C3%A9":
        "/blog/anticiper-hiver-preparer-sa-toiture",
    "/blog/nettoyage-de-goutti%C3%A8res-l-essentiel-de-l-automne":
        "/blog/nettoyage-de-gouttieres-l-essentiel-de-l-automne",
    "/blog/la-saison-du-d%C3%A9moussage-est-arriv%C3%A9e": "/blog/la-saison-du-demoussage-est-arrivee",
    "/blog/quelle-est-la-meilleure-isolation-pour-votre-toiture":
        "/blog/quelle-est-la-meilleure-isolation-pour-votre-toiture",
    "/blog/comment-choisir-le-bon-mat%C3%A9riau-pour-votre-toiture":
        "/blog/comment-choisir-le-bon-materiau-pour-votre-toiture",
}

SKIP = {"script", "style", "noscript", "svg", "head"}
BLOCKS = {"h1", "h2", "h3", "h4", "p", "li", "a", "span", "div"}


class Text(HTMLParser):
    """Collects leaf text blocks."""

    def __init__(self):
        super().__init__()
        self.skip = 0
        self.buf = []
        self.blocks = []

    def handle_starttag(self, t, a):
        if t in SKIP:
            self.skip += 1

    def handle_endtag(self, t):
        if t in SKIP:
            self.skip = max(0, self.skip - 1)

    def handle_data(self, d):
        if self.skip:
            return
        s = re.sub(r"\s+", " ", d).strip()
        if len(s) > 2:
            self.blocks.append(s)


def norm(s):
    """Fold accents, quotes and spacing so only wording differences remain."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("œ", "oe").replace("Œ", "OE")
    s = re.sub(r"[^a-z0-9 ]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def fetch(base, path):
    req = urllib.request.Request(base + path, headers={"User-Agent": "verify"})
    return urllib.request.urlopen(req, timeout=45).read().decode("utf-8", "replace")


def blocks_of(html):
    p = Text()
    p.feed(html)
    return p.blocks


# Chrome = text on most live pages. Excluded: it is layout, and the rebuild
# renders its own header/footer with different wording.
live_pages = {}
for lp in MAP:
    live_pages[lp] = blocks_of(fetch(LIVE, lp))

counts = Counter()
for blocks in live_pages.values():
    for b in set(blocks):
        counts[norm(b)] += 1
threshold = max(3, int(len(live_pages) * 0.5))
chrome = {k for k, n in counts.items() if n >= threshold}

print(f"live pages: {len(live_pages)}   chrome blocks ignored: {len(chrome)}\n")

total_checked = 0
total_missing = 0
report = []

for lp, mp in MAP.items():
    mine = norm(" ".join(blocks_of(fetch(MINE, urllib.parse.quote(mp)))))

    missing = []
    for b in dict.fromkeys(live_pages[lp]):
        n = norm(b)
        # Only meaningful copy: skip chrome, fragments and pure numbers.
        if n in chrome or len(n) < 25 or n.isdigit():
            continue
        total_checked += 1
        if n not in mine:
            missing.append(b)
            total_missing += 1

    if missing:
        report.append((urllib.parse.unquote(lp), missing))

for path, missing in report:
    print(f"{path}  — {len(missing)} block(s) not found")
    for b in missing[:4]:
        print(f"    · {b[:100]}")
    print()

pct = 100 * (total_checked - total_missing) / max(total_checked, 1)
print(f"content blocks checked: {total_checked}")
print(f"missing on the rebuild: {total_missing}")
print(f"coverage: {pct:.1f}%")
