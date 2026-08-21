"""
Extracts structured content from the live Aertoit pages.

Writes one JSON file per page into content/, so the seed can be generated
without holding every page's prose in memory at once.

    python extract-content.py
"""
import json
import os
import re
import urllib.request
from html.parser import HTMLParser

BASE = "https://aertoit.fr"
OUT = "content"

PAGES = [
    # parent services (already built, re-extracted for their body copy)
    "/couverture", "/isolation", "/fenetre-de-toit-velux",
    "/service/travaux-de-charpente",
    "/service/etancheite-de-toit-terrasse",
    "/service/nettoyage-et-entretien-de-toiture",
    # the nine sub-services that were missing entirely
    "/service/couverture-en-tuiles",
    "/service/couverture-en-ardoises",
    "/service/couverture-en-bac-acier",
    "/service/solutions-d-isolation-laine-de-verre",
    "/service/solutions-d-isolation-laine-de-roche",
    "/service/solutions-d-isolation-sarking-fibre-de-bois",
    "/service/solutions-d-isolation-sarking-polyurethane",
    "/service/solutions-d-isolation-actis",
    "/service/accessoires-velux",
]

SKIP = {"script", "style", "noscript", "svg", "head"}
BLOCKS = {"h1", "h2", "h3", "h4", "p", "li"}


class Extract(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip_depth = 0
        self.stack = []
        self.buf = []
        self.blocks = []
        self.title = None
        self.description = None
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and a.get("name") == "description":
            self.description = a.get("content")
        if tag == "title":
            self._in_title = True
        if tag in SKIP:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag in BLOCKS:
            self.stack.append(tag)
            self.buf = []

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag in SKIP:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if self.skip_depth:
            return
        if tag in BLOCKS and self.stack and self.stack[-1] == tag:
            self.stack.pop()
            text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
            # Framer emits a lot of empty and single-glyph wrappers.
            if len(text) > 2:
                self.blocks.append({"tag": tag, "text": text})
            self.buf = []

    def handle_data(self, data):
        if self._in_title and self.title is None:
            t = data.strip()
            if t:
                self.title = t
        if self.skip_depth or not self.stack:
            return
        self.buf.append(data)


os.makedirs(OUT, exist_ok=True)
summary = []

for path in PAGES:
    url = BASE + path
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        print(f"  FAILED {path}: {e}")
        continue

    p = Extract()
    p.feed(html)

    # Drop duplicated blocks (Framer renders some content twice) and nav chrome.
    seen, blocks = set(), []
    for b in p.blocks:
        key = b["text"]
        if key in seen:
            continue
        seen.add(key)
        blocks.append(b)

    name = path.strip("/").replace("/", "__") or "home"
    data = {
        "path": path,
        "title": p.title,
        "description": p.description,
        "headings": [b["text"] for b in blocks if b["tag"] in ("h1", "h2", "h3")][:12],
        "blocks": blocks,
    }
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    words = sum(len(b["text"].split()) for b in blocks)
    summary.append((path, len(blocks), words, p.title or ""))

print(f"{'PATH':<52} {'BLOCKS':>6} {'WORDS':>6}  TITLE")
for path, n, w, t in summary:
    print(f"  {path:<50} {n:>6} {w:>6}  {t[:44]}")
