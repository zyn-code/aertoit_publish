"""
Extracts page bodies with site chrome removed, and writes
014-clean-bodies.sql.

Framer renders no landmark elements — no <nav>, <header>, <main> or
<footer> — so chrome cannot be stripped structurally, and hand-written
blacklists kept missing things (first a duplicated footer complete with a
second address, then the whole services dropdown at the top of every body).

Chrome is instead *derived*: any block of text that appears on most pages is
by definition furniture, not content. That is self-maintaining — if the nav
or footer changes, the detection follows.

    python extract-bodies.py
"""
import io
import re
import urllib.request
from collections import Counter
from html.parser import HTMLParser

BASE = "https://aertoit.fr"

SERVICES = {
    "couverture": "/couverture",
    "isolation": "/isolation",
    "fenetre-de-toit-velux": "/fenetre-de-toit-velux",
    "travaux-de-charpente": "/service/travaux-de-charpente",
    "etancheite-de-toit-terrasse": "/service/etancheite-de-toit-terrasse",
    "nettoyage-et-entretien-de-toiture": "/service/nettoyage-et-entretien-de-toiture",
    "couverture-en-tuiles": "/service/couverture-en-tuiles",
    "couverture-en-ardoises": "/service/couverture-en-ardoises",
    "couverture-en-bac-acier": "/service/couverture-en-bac-acier",
    "solutions-d-isolation-laine-de-verre": "/service/solutions-d-isolation-laine-de-verre",
    "solutions-d-isolation-laine-de-roche": "/service/solutions-d-isolation-laine-de-roche",
    "solutions-d-isolation-sarking-fibre-de-bois": "/service/solutions-d-isolation-sarking-fibre-de-bois",
    "solutions-d-isolation-sarking-polyurethane": "/service/solutions-d-isolation-sarking-polyurethane",
    "solutions-d-isolation-actis": "/service/solutions-d-isolation-actis",
    "accessoires-velux": "/service/accessoires-velux",
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
    "gouttieres-en-zinc-ou-pvc-que-choisir": "/blog/goutti%C3%A8res-en-zinc-ou-pvc-que-choisir",
    "anticiper-hiver-preparer-sa-toiture":
        "/blog/anticiper-l-hiver-pr%C3%A9parer-sa-toiture-pour-le-froid-la-pluie-et-l-humidit%C3%A9",
    "nettoyage-de-gouttieres-l-essentiel-de-l-automne":
        "/blog/nettoyage-de-goutti%C3%A8res-l-essentiel-de-l-automne",
    "la-saison-du-demoussage-est-arrivee": "/blog/la-saison-du-d%C3%A9moussage-est-arriv%C3%A9e",
    "quelle-est-la-meilleure-isolation-pour-votre-toiture":
        "/blog/quelle-est-la-meilleure-isolation-pour-votre-toiture",
    "comment-choisir-le-bon-materiau-pour-votre-toiture":
        "/blog/comment-choisir-le-bon-mat%C3%A9riau-pour-votre-toiture",
}
PAGES = {"a-propos": "/a-propos"}

SKIP = {"script", "style", "noscript", "svg", "head"}
BLOCKS = {"h1", "h2", "h3", "h4", "p", "li"}
COMMUNE_RE = re.compile(r"^(dans le val-de-marne|au? |à |aux )", re.I)
LIST_HEADINGS = ("les missions", "profil recherché", "vos missions", "compétences")


VOID = {"br", "img", "input", "hr", "meta", "link", "source", "area", "col", "embed"}

# Inline elements are transparent: their text flows into the surrounding
# block. Treating them as blocks in their own right split "Ardoise :
# élégance et longévité" into two fragments and dropped the surrounding
# sentence, because the parent <p> then looked like a non-leaf.
INLINE = {
    "a", "strong", "b", "em", "i", "u", "span", "small", "sup", "sub",
    "code", "mark", "abbr", "cite", "q", "time", "label",
}


class P(HTMLParser):
    """
    Collects the text of every *leaf* element, whatever its tag.

    Restricting this to h1–h4/p/li missed real copy: Framer renders some
    paragraphs in bare <div>s, which silently dropped bullet lines from two
    blog posts. Capturing any leaf and letting the cross-page chrome filter
    remove furniture is both broader and self-correcting.

    A leaf is an element with no element children — so an outer wrapper does
    not emit the concatenation of everything inside it.
    """

    def __init__(self):
        super().__init__()
        self.skip = 0
        self.stack = []          # frames: [tag, buffer, has_child_element]
        self.blocks = []

    def handle_starttag(self, t, a):
        if t in SKIP:
            self.skip += 1
            return
        if self.skip or t in VOID or t in INLINE:
            return                        # inline: text flows to the parent
        if self.stack:
            self.stack[-1][2] = True      # parent now has a block child
        self.stack.append([t, [], False])

    def handle_endtag(self, t):
        if t in SKIP:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip or t in INLINE or not self.stack:
            return
        # Unwind to the matching tag; Framer's markup is not always balanced.
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == t:
                for frame in self.stack[i:]:
                    tag, buf, had_child = frame
                    if had_child:
                        continue
                    txt = re.sub(r"\s+", " ", "".join(buf)).strip()
                    if len(txt) > 2:
                        # Normalise non-semantic wrappers to a paragraph.
                        self.blocks.append((tag if tag in BLOCKS else "p", txt))
                del self.stack[i:]
                return

    def handle_data(self, d):
        if not self.skip and self.stack:
            self.stack[-1][1].append(d)


def fetch(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")


ALL = [("services", SERVICES), ("job_postings", CAREERS), ("blog_posts", POSTS), ("pages", PAGES)]

# --- pass 1: gather every page's blocks --------------------------------
raw = {}
for _table, group in ALL:
    for slug, path in group.items():
        p = P()
        p.feed(fetch(path))
        raw[slug] = p.blocks

# --- pass 2: anything on most pages is chrome ---------------------------
counts = Counter()
for blocks in raw.values():
    for _tag, text in set(blocks):
        counts[text] += 1

total = len(raw)
threshold = max(3, int(total * 0.5))
chrome = {t for t, n in counts.items() if n >= threshold}
print(f"pages: {total}   chrome blocks detected: {len(chrome)} (on >= {threshold} pages)\n")


def esc(s):
    return s.replace("\\", "\\\\").replace("'", "''")


# Sub-services that have their own page. On a parent page these appear as a
# list of name + excerpt + "En Savoir Plus"; the rebuild renders them as real
# cards from the parent/child relation, so keeping the text as well would
# print the list twice.
#
# The two zinc entries are now included: the modifications deck supplied their
# copy, so both have real pages and render as cards like every other child.
# They were previously excluded because the live site advertises them here
# while 404ing on every URL, making this text their only record.
CHILD_NAMES = {
    "Couverture en Tuiles", "Couverture en Ardoises", "Couverture en Bac Acier",
    "Couverture en Zinc à Joint Debout", "Couverture en Zinc à Tasseaux",
    "Isolation en Laine de Verre", "Isolation par Laine de Roche Projetée",
    "Isolation en Sarking Fibre de Bois", "Isolation en Sarking Polyuréthane",
    "Isolation Mince Actis", "Accessoires VELUX",
}
CHILD_CTA = {"En Savoir Plus", "En savoir plus"}

# Buttons that sit inside the content flow on individual pages. They appear
# too few times to cross the frequency threshold, but they are controls, not
# copy — left in, they render as stray list items mid-paragraph.
CTA_TEXT = {
    "Prendre Rendez-Vous", "Prendre rendez-vous",
    "Besoin d’un conseil ? Appelez-nous dès maintenant !",
    "Besoin d'un conseil ? Appelez-nous dès maintenant !",
    "Demande de Devis", "Demande de Devis Rapide", "Demander un devis",
    "Appellez-Nous", "Appelez-nous", "Postuler", "Contactez-nous",
    "Je souhaite être rappelé(e)", "Plus d’informations", "Plus d'informations",
    "Voir tout", "Lire +", "Obtenir mon devis",
}


# The FAQ block appears on only four pages, too few to cross the frequency
# threshold, but it is still furniture: FaqSection renders it from the
# database. Everything after this heading on those pages is FAQ, closing CTA
# and footer, so the body simply ends here.
TAIL_HEADING = re.compile(r"^Questions\s*/\s*Réponses", re.I)


def build(slug, listify=False):
    parts, seen, dropped_h1 = [], set(), False
    skipping_child = False
    for tag, text in raw[slug]:
        if TAIL_HEADING.match(text):
            break
        # A child heading starts a card; skip it and its trailing excerpt/CTA
        # until the next heading.
        if tag in ("h2", "h3", "h4") and text in CHILD_NAMES:
            skipping_child = True
            continue
        if skipping_child:
            if tag in ("h1", "h2", "h3", "h4"):
                skipping_child = False      # a real heading resumes content
            else:
                continue
        if text in CHILD_CTA or text in CTA_TEXT:
            continue
        if text in chrome or text in seen:
            continue
        if tag in ("h1", "h2", "h3") and COMMUNE_RE.match(text) and len(text) < 34:
            continue
        if tag == "h1" and not dropped_h1:
            dropped_h1 = True          # the template renders the H1
            seen.add(text)
            continue
        seen.add(text)
        if listify and tag == "p" and len(text) < 95 and not text.endswith("."):
            if parts and (any(h in parts[-1].lower() for h in LIST_HEADINGS)
                          or parts[-1].startswith("<li>")):
                parts.append(f"<li>{text}</li>")
                continue
        if tag in ("h2", "h3", "h4"):
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


sql = io.open("../database/migrations/014-clean-bodies.sql", "w", encoding="utf-8")
sql.write("-- Generated by .assets-src/extract-bodies.py — do not edit by hand.\n")
sql.write("-- Bodies re-extracted with chrome detected by cross-page frequency,\n")
sql.write("-- replacing hand-written blacklists that leaked the nav and footer.\n")
sql.write("USE `aertoit`;\n\n")

print(f"{'TABLE':<13}{'SLUG':<50}{'CHARS':>7}")
for table, group in ALL:
    for slug in group:
        html = build(slug, listify=(table == "job_postings"))
        sql.write(f"UPDATE `{table}` SET `body` = '{esc(html)}' WHERE `slug` = '{esc(slug)}';\n")
        flag = "  <- thin" if len(html) < 300 else ""
        print(f"{table:<13}{slug:<50}{len(html):>7}{flag}")

sql.write("""
SELECT 'contaminated' AS check_name, COUNT(*) AS rows_affected FROM (
  SELECT slug FROM services   WHERE body LIKE '%Rue des Jardins%' OR body LIKE '%contact@aertoit%' OR body LIKE '%Appellez%'
  UNION ALL SELECT slug FROM blog_posts  WHERE body LIKE '%Rue des Jardins%' OR body LIKE '%contact@aertoit%' OR body LIKE '%Appellez%'
  UNION ALL SELECT slug FROM job_postings WHERE body LIKE '%Rue des Jardins%' OR body LIKE '%contact@aertoit%' OR body LIKE '%Appellez%'
  UNION ALL SELECT slug FROM pages       WHERE body LIKE '%Rue des Jardins%' OR body LIKE '%contact@aertoit%' OR body LIKE '%Appellez%'
) x;
""")
sql.close()
print("\nwrote 014-clean-bodies.sql")
