"""
Parses the replacement service copy out of the modifications deck
(pages 8-22) and emits 019-deck-copy.sql.

The deck is a slide deck, not HTML, so structure comes from typography:

  * bold          -> heading
  * 12pt block    -> page title + intro (the panel at the top of each slide)
  * 10pt          -> body
  * vertical gap  -> paragraph break

Run with --dump to review the parsed structure before generating SQL.

    python parse-deck-copy.py --dump 8
    python parse-deck-copy.py
"""
import io
import re
import sys

import pymupdf

PDF = r"C:\Workspace\Website\Modifications Site internet.pdf"

# deck page -> (slug, is_new). is_new means the page does not exist yet and
# the row must be INSERTed under its parent rather than UPDATEd.
PAGES = {
    8:  ("couverture-en-tuiles", False),
    9:  ("couverture-en-ardoises", False),
    10: ("couverture-en-bac-acier", False),
    11: ("couverture-en-zinc-a-tasseaux", True),
    12: ("couverture-en-zinc-a-joint-debout", True),
    13: ("travaux-de-charpente", False),
    14: ("etancheite-de-toit-terrasse", False),
    15: ("solutions-d-isolation-sarking-fibre-de-bois", False),
    16: ("solutions-d-isolation-sarking-polyurethane", False),
    17: ("solutions-d-isolation-actis", False),
    18: ("solutions-d-isolation-laine-de-roche", False),
    19: ("solutions-d-isolation-laine-de-verre", False),
    20: ("nettoyage-et-entretien-de-toiture", False),
    21: ("fenetre-de-toit-velux", False),
    22: ("accessoires-velux", False),
}

# Metadata for the two pages that do not exist yet.
NEW_PAGES = {
    "couverture-en-zinc-a-tasseaux": {
        "parent": "couverture",
        "name": "Couverture en Zinc à Tasseaux",
        "card": "Une solution esthétique et résistante pour une toiture en zinc durable.",
        "meta_title": "Couverture en Zinc à Tasseaux - Aertoit : Votre Expert dans le Val-de-Marne",
        "meta_desc": "Pose de couverture en zinc à tasseaux : durabilité, esthétique en relief "
                     "et étanchéité optimale, même sur les toitures de faible pente.",
        "sort": 4,
    },
    "couverture-en-zinc-a-joint-debout": {
        "parent": "couverture",
        "name": "Couverture en Zinc à Joint Debout",
        "card": "Modernité et étanchéité pour vos projets de toiture en zinc.",
        "meta_title": "Couverture en Zinc à Joint Debout - Aertoit : Votre Expert dans le Val-de-Marne",
        "meta_desc": "Pose de couverture en zinc à joint debout : lignes contemporaines, "
                     "étanchéité continue et longévité supérieure à 50 ans.",
        "sort": 5,
    },
}

PARA_GAP = 1.7          # multiple of line height that starts a new paragraph
BULLET_LEAD = re.compile(r"^([A-ZÉÈÀÎÔÛ][^:]{2,58})\s*:\s+(.{15,})$")
# "1.Préparation du support : …" — the deck writes steps without a space.
NUMBERED_STEP = re.compile(r"^(\d{1,2})\s*[.)]\s*(.+)$")


def blocks_of(page):
    """Flatten a page into [(size, bold, text, top, bottom)] in reading order."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for line in b.get("lines", []):
            text = "".join(s["text"] for s in line["spans"]).strip()
            if not text:
                continue
            def is_bold(s):
                f = s["font"].lower()
                return any(w in f for w in ("bold", "black", "semib", "heavy"))

            # A heading is bold *throughout*. Several pages bold only the lead
            # of a bullet ("Durabilité : le zinc est…"); judging by the first
            # span alone promoted every one of those to a heading.
            spans = [s for s in line["spans"] if s["text"].strip()]
            all_bold = bool(spans) and all(is_bold(s) for s in spans)

            span = spans[0] if spans else line["spans"][0]
            x0, y0, x1, y1 = line["bbox"]
            out.append((round(span["size"], 1), all_bold, text, y0, y1))
    return out


def group(lines):
    """Merge wrapped lines into blocks, splitting on style change or a gap."""
    grouped = []
    for size, bold, text, y0, y1 in lines:
        if grouped:
            p = grouped[-1]
            height = max(p["y1"] - p["y0_last"], 1)
            gap = y0 - p["y1"]
            same_style = (p["size"], p["bold"]) == (size, bold)

            # Vertical gaps alone do not separate bullets here: the deck sets
            # them at the same leading as a wrapped line, so gap detection
            # merged whole bullet lists into one paragraph. A line only
            # continues the previous block if that block is mid-sentence —
            # i.e. it does not already end in terminal punctuation.
            continues = not re.search(r"[.:!?]\s*$", " ".join(p["parts"]))

            if same_style and gap < height * PARA_GAP and continues:
                p["parts"].append(text)
                p["y1"] = y1
                p["y0_last"] = y0
                continue
        grouped.append(
            {"size": size, "bold": bold, "parts": [text], "y0": y0, "y1": y1, "y0_last": y0}
        )
    for g in grouped:
        # PDF line-wraps mid-word are already space-separated; just normalise.
        g["text"] = re.sub(r"\s+", " ", " ".join(g["parts"])).strip()
    return grouped


def to_html(groups):
    """Render grouped blocks as the same HTML shape the rest of the site uses."""
    parts, list_tag = [], None

    def close_list():
        nonlocal list_tag
        if list_tag:
            parts.append(f"</{list_tag}>")
            list_tag = None

    def open_list(tag):
        nonlocal list_tag
        if list_tag != tag:
            close_list()
            parts.append(f"<{tag}>")
            list_tag = tag

    for g in groups:
        text = g["text"]

        if g["bold"]:
            close_list()
            parts.append(f"<h2>{text}</h2>" if g["size"] < 11.5 else f"<h3>{text}</h3>")
            continue

        # Numbered procedure steps, written "1.Préparation du support : …".
        step = NUMBERED_STEP.match(text)
        if step:
            open_list("ol")
            body = step.group(2).strip()
            lead = BULLET_LEAD.match(body)
            parts.append(
                f"<li><strong>{lead.group(1).strip()}</strong> : {lead.group(2).strip()}</li>"
                if lead else f"<li>{body}</li>"
            )
            continue

        m = BULLET_LEAD.match(text)
        if m and len(text) < 500:
            open_list("ul")
            parts.append(f"<li><strong>{m.group(1).strip()}</strong> : {m.group(2).strip()}</li>")
            continue

        # Inside a numbered procedure, a plain paragraph is the tail of the
        # step above it, not a new section. Closing the <ol> here would restart
        # the numbering at 1 for every following step.
        if list_tag == "ol" and parts and parts[-1].endswith("</li>"):
            parts[-1] = parts[-1][: -len("</li>")] + f" {text}</li>"
            continue

        close_list()
        parts.append(f"<p>{text}</p>")

    close_list()
    return "".join(parts)


def parse(page_no):
    doc = pymupdf.open(PDF)
    groups = group(blocks_of(doc[page_no - 1]))
    if not groups:
        return None

    title = groups[0]["text"] if groups[0]["bold"] else ""
    rest = groups[1:] if title else groups
    intro = ""
    if rest and not rest[0]["bold"]:
        intro = rest[0]["text"]
        rest = rest[1:]
    return {"title": title, "intro": intro, "body": to_html(rest), "groups": groups}


def esc(s):
    return (s or "").replace("\\", "\\\\").replace("'", "''")


# --- dump mode: review structure before trusting it --------------------
if "--dump" in sys.argv:
    n = int(sys.argv[sys.argv.index("--dump") + 1])
    d = parse(n)
    print(f"page {n} -> {PAGES[n][0]}\n")
    print(f"TITLE: {d['title']}\n")
    print(f"INTRO: {d['intro'][:200]}\n")
    print("BODY STRUCTURE:")
    for chunk in re.findall(r"<(h2|h3|p|li|ul|/ul)>?", d["body"]):
        pass
    for m in re.finditer(r"<(h2|h3)>(.*?)</\1>|<li>(.*?)</li>|<p>(.*?)</p>", d["body"]):
        tag = m.group(1) or ("li" if m.group(3) else "p")
        txt = m.group(2) or m.group(3) or m.group(4) or ""
        txt = re.sub(r"<[^>]+>", "", txt)
        print(f"  {tag:<3} {txt[:88]}")
    raise SystemExit(0)

# --- generate SQL -------------------------------------------------------
out = io.open("../database/migrations/019-deck-copy.sql", "w", encoding="utf-8")
out.write("-- Generated by .assets-src/parse-deck-copy.py — do not edit by hand.\n")
out.write("-- Replacement service copy from 'Modifications Site internet' (pages 8-22),\n")
out.write("-- including the two zinc pages the live site advertises but never built.\n")
out.write("USE `aertoit`;\n\n")

report = []
for page_no, (slug, is_new) in PAGES.items():
    d = parse(page_no)
    if not d:
        report.append((page_no, slug, 0, "PARSE FAILED"))
        continue

    if is_new:
        meta = NEW_PAGES[slug]
        out.write(f"""INSERT INTO `services`
  (`parent_id`, `slug`, `name`, `h1`, `card_title`, `card_excerpt`, `intro`, `body`,
   `meta_title`, `meta_description`, `communes`, `sort_order`, `is_published`)
SELECT p.id, '{esc(slug)}', '{esc(meta["name"])}', '{esc(d["title"])}', '{esc(meta["name"])}',
       '{esc(meta["card"])}', '{esc(d["intro"])}', '{esc(d["body"])}',
       '{esc(meta["meta_title"])}', '{esc(meta["meta_desc"])}',
       (SELECT `communes` FROM (SELECT `communes` FROM `services`
          WHERE `slug` = 'couverture-en-tuiles') x),
       {meta["sort"]}, TRUE
FROM `services` p WHERE p.slug = '{esc(meta["parent"])}'
ON DUPLICATE KEY UPDATE
  `h1` = VALUES(`h1`), `intro` = VALUES(`intro`), `body` = VALUES(`body`),
  `card_excerpt` = VALUES(`card_excerpt`), `meta_title` = VALUES(`meta_title`),
  `meta_description` = VALUES(`meta_description`), `sort_order` = VALUES(`sort_order`);\n\n""")
    else:
        out.write(f"""UPDATE `services` SET
  `h1` = '{esc(d["title"])}',
  `intro` = '{esc(d["intro"])}',
  `body` = '{esc(d["body"])}'
WHERE `slug` = '{esc(slug)}';\n\n""")

    heads = len(re.findall(r"<h[23]>", d["body"]))
    items = len(re.findall(r"<li>", d["body"]))
    report.append((page_no, slug, len(d["body"]), f"{heads} headings, {items} bullets"))

out.write("""
SELECT `slug`, CHAR_LENGTH(`body`) AS chars,
       `body` LIKE '%<h3>%' AS h3, `body` LIKE '%<li>%' AS bullets
FROM `services` WHERE `parent_id` IS NOT NULL OR `slug` IN
  ('travaux-de-charpente','etancheite-de-toit-terrasse',
   'nettoyage-et-entretien-de-toiture','fenetre-de-toit-velux')
ORDER BY `parent_id` IS NULL DESC, `sort_order`;
""")
out.close()

print(f"{'PG':>3}  {'SLUG':<46}{'CHARS':>7}  STRUCTURE")
for page_no, slug, n, note in report:
    flag = "  <- NEW" if PAGES[page_no][1] else ""
    print(f"{page_no:>3}  {slug:<46}{n:>7}  {note}{flag}")
print("\nwrote 019-deck-copy.sql")
