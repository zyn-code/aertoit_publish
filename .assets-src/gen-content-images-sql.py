"""
Writes 029-subservice-content-images.sql: the three in-article photographs
from each aertoit.fr sub-service page, put back where that page puts them.

On the original, every sub-service carries a row of exactly three images
sitting after the "Besoin d'un conseil ?" line and immediately before the
next heading. The deck rewrite dropped both the images and that CTA line, so
the anchor used here is the heading that *follows* the row: the row goes back
directly above the local heading with the same text. One page, tuiles, no
longer has that heading at all, and the row goes at the foot of the article.

    python gen-content-images-sql.py
"""

import io
import json
import re
import unicodedata
import urllib.request

MANIFEST = "content-images.json"
OUT = "../database/migrations/029-subservice-content-images.sql"
API = "http://localhost:3000/api/services"

# What each photograph shows, read off the contact sheets rather than guessed
# from the file name.
ALT = {
    "couverture-en-tuiles": [
        "Vue aérienne d’une toiture en tuiles mécaniques équipée de six fenêtres de toit",
        "Toiture en tuiles de terre cuite avec ses noues et ses fenêtres de toit",
        "Maison couverte en tuiles rouges photographiée par drone après rénovation",
    ],
    "couverture-en-ardoises": [
        "Souche de cheminée et couverture en ardoises naturelles posées à joints croisés",
        "Toiture en ardoises en cours de pose, échafaudage monté autour de la maison",
        "Toit-terrasse bordé d’une couverture en ardoises, vu de dessus",
    ],
    "couverture-en-bac-acier": [
        "Couverture en bac acier clair posée sur un auvent, échafaudage en place",
        "Toiture en bac acier avec relevé d’étanchéité contre une souche de cheminée",
        "Toiture en bac acier rouge avec sa gouttière et sa bavette de raccordement",
    ],
    "couverture-en-zinc-a-tasseaux": [
        "Feuilles de zinc VMZINC déroulées sur le support de couverture avant la pose",
        "Toiture en zinc à tasseaux terminée, les tasseaux marquant chaque relief",
        "Vue aérienne d’une couverture en zinc à tasseaux sur un bâtiment en rénovation",
    ],
    "couverture-en-zinc-a-joint-debout": [
        "Fenêtre de toit intégrée dans une couverture en zinc à joint debout de teinte cuivrée",
        "Couverture en zinc à joint debout posée le long d’une toiture-terrasse",
        "Machine à profiler les feuilles de zinc installée sur le chantier",
    ],
    "solutions-d-isolation-laine-de-verre": [
        "Pose d’un panneau de laine de verre entre les chevrons d’une toiture",
        "Rouleau de laine de verre déroulé sur le plancher de combles",
        "Détail de la fibre d’un isolant en laine de verre",
    ],
    "solutions-d-isolation-laine-de-roche": [
        "Toiture en cours de rénovation, isolation posée sous la couverture",
        "Laine de roche projetée en flocons sur le plancher de combles perdus",
        "Trappe d’accès surélevée dans des combles isolés en laine de roche soufflée",
    ],
    "solutions-d-isolation-sarking-fibre-de-bois": [
        "Chantier d’isolation en sarking Aertoit, panneaux de fibre de bois en cours de pose",
        "Panneaux de fibre de bois posés en sarking sur la charpente d’une toiture",
        "Vue aérienne d’une toiture entièrement recouverte de panneaux de fibre de bois",
    ],
    "solutions-d-isolation-sarking-polyurethane": [
        "Panneaux de polyuréthane protégés sous bâche sur une toiture en cours d’isolation",
        "Panneaux de polyuréthane posés en sarking sur un rampant de toiture",
        "Contre-lattage bois posé sur les panneaux de sarking avant la couverture",
    ],
    "solutions-d-isolation-actis": [
        "Isolant mince Actis posé sous les rampants de combles aménagés",
        "Membrane Actis déroulée sur une toiture isolée par l’extérieur",
        "Détail de l’isolant Actis agrafé entre les liteaux d’une toiture",
    ],
    "accessoires-velux": [
        "Barre de manœuvre VELUX fixée sur le cadre d’une fenêtre de toit",
        "Fenêtre de toit VELUX ouverte sur une couverture en tuiles",
        "Store d’occultation VELUX installé sur une fenêtre de toit",
    ],
}

# The heading each row sits above, taken from the original page. Matched
# loosely (accents, case and trailing punctuation ignored) so a typographic
# difference between the two copies does not silently drop the images.
ANCHOR_AFTER = {
    "couverture-en-tuiles": "Techniques de pose",
    "couverture-en-ardoises": "Ardoise Cupa 7 (35x25 cm)",
    "couverture-en-bac-acier": "Installation et Fixation",
    "couverture-en-zinc-a-tasseaux": "Avantages techniques du zinc à tasseaux",
    "couverture-en-zinc-a-joint-debout": "Technique de pose : le joint debout",
    "solutions-d-isolation-laine-de-verre": "Les Avantages de la Laine de Verre",
    "solutions-d-isolation-laine-de-roche": "Les Avantages de la Laine de Roche",
    "solutions-d-isolation-sarking-fibre-de-bois": "Les Avantages de la Fibre de Bois",
    "solutions-d-isolation-sarking-polyurethane": "Les Avantages du Sarking",
    "solutions-d-isolation-actis": "Les Avantages de l'Isolation Actis",
    "accessoires-velux": "Barre de Manœuvre VELUX",
}


def norm(s):
    """Case, accent and punctuation-insensitive key for heading comparison."""
    s = re.sub(r"<[^>]+>", "", s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("’", "'").lower()
    return re.sub(r"[^a-z0-9]+", "", s)


def gallery(slug, images):
    figs = []
    for img, alt in zip(images, ALT[slug]):
        figs.append(
            f'<figure><img src="{img["file"]}" alt="{alt}" '
            f'width="{img["width"]}" height="{img["height"]}"></figure>'
        )
    return '<div class="prose-gallery">' + "".join(figs) + "</div>"


manifest = json.load(io.open(MANIFEST, encoding="utf-8"))
api = json.load(urllib.request.urlopen(API))


def walk(nodes):
    for n in nodes:
        yield n
        yield from walk(n.get("children") or [])


bodies = {s["slug"]: (s.get("body") or "") for s in walk(api)}

lines = [
    "-- 029-subservice-content-images.sql",
    "--",
    "-- Restores the three in-article photographs of each sub-service page from",
    "-- aertoit.fr, in the original order and at the original position: directly",
    "-- above the heading that follows them there. Generated by",
    "-- .assets-src/gen-content-images-sql.py -- do not hand-edit.",
    "",
    "START TRANSACTION;",
    "",
]

report = []
for slug, images in manifest.items():
    body = bodies.get(slug, "")
    if not body:
        report.append((slug, "NO BODY", 0))
        continue
    # Re-runnable: drop a row inserted by an earlier run before inserting
    # this one, so the migration can be regenerated without stacking.
    body = re.sub(
        r'<div class="prose-gallery">(?:(?!</div>).)*</figure></div>', "", body, flags=re.S
    )

    block = gallery(slug, images)
    target = norm(ANCHOR_AFTER[slug])
    placed = None
    for m in re.finditer(r"<h([1-6])>(.*?)</h\1>", body, re.S):
        if norm(m.group(2)) == target:
            placed = m.start()
            break

    if placed is None:
        new = body + block
        where = "appended (anchor heading absent from the rewritten copy)"
    else:
        new = body[:placed] + block + body[placed:]
        where = f"before <h{m.group(1)}> {re.sub('<[^>]+>', '', m.group(2))[:48]}"

    esc = new.replace("\\", "\\\\").replace("'", "''")
    lines.append(f"-- {slug}: {where}")
    lines.append(f"UPDATE services SET body = '{esc}' WHERE slug = '{slug}';")
    lines.append("")
    report.append((slug, where, len(images)))

lines += ["COMMIT;", ""]
io.open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(lines))

for slug, where, n in report:
    print(f"{slug:<46} {n} images  {where}")
print(f"\nwritten {OUT}")
