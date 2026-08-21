"""
Reads every sub-service page on aertoit.fr and writes down, in document
order, the headings, paragraphs and images inside its main content.

The point is the *order*: the brief asks for each photograph to sit where
the original puts it relative to the surrounding text, so a list of image
URLs alone is not enough. Output goes to original-subservice-content.json.

    python fetch-subservice-content.py
"""

import html
import io
import json
import re
import urllib.request
from html.parser import HTMLParser

BASE = "https://aertoit.fr"

# Local slug -> path on the original site. The two zinc pages were written
# from the printed deck and have never existed online; they are listed so the
# report can say so rather than silently skipping them.
PAGES = {
    "couverture-en-tuiles": "/service/couverture-en-tuiles",
    "couverture-en-ardoises": "/service/couverture-en-ardoises",
    "couverture-en-bac-acier": "/service/couverture-en-bac-acier",
    "couverture-en-zinc-a-tasseaux": "/service/couverture-en-zinc-à-tasseaux",
    "couverture-en-zinc-a-joint-debout": "/service/couverture-en-zinc-à-joint-debout",
    "solutions-d-isolation-laine-de-verre": "/service/solutions-d-isolation-laine-de-verre",
    "solutions-d-isolation-laine-de-roche": "/service/solutions-d-isolation-laine-de-roche",
    "solutions-d-isolation-sarking-fibre-de-bois": "/service/solutions-d-isolation-sarking-fibre-de-bois",
    "solutions-d-isolation-sarking-polyurethane": "/service/solutions-d-isolation-sarking-polyurethane",
    "solutions-d-isolation-actis": "/service/solutions-d-isolation-actis",
    "accessoires-velux": "/service/accessoires-velux",
}

SKIP = {"script", "style", "noscript", "svg", "head"}
BLOCKS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li"}


class Linearise(HTMLParser):
    """Emits blocks and images in the order they appear in the document."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items = []
        self.skip_depth = 0
        self.stack = []
        self.buf = []
        self.tag = None
        self.in_main = False
        self.main_depth = 0

    # --- helpers ---------------------------------------------------------

    def flush(self):
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        if text and self.tag:
            self.items.append({"type": self.tag, "text": text})
        self.buf = []
        self.tag = None

    # --- parser ----------------------------------------------------------

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "div" and a.get("id") == "main":
            self.in_main = True
            self.main_depth = 0
        if self.in_main and tag == "div":
            self.main_depth += 1

        if tag in SKIP:
            self.skip_depth += 1
            return
        if self.skip_depth or not self.in_main:
            return

        if tag == "img":
            src = a.get("src", "")
            # Framer serves the same asset at many widths through srcset; the
            # bare src is the canonical one.
            if "framerusercontent.com" in src:
                self.flush()
                self.items.append(
                    {
                        "type": "img",
                        "src": src.split("?")[0],
                        "alt": a.get("alt", ""),
                        "srcset": a.get("srcset", "")[:400],
                    }
                )
        elif tag in BLOCKS:
            self.flush()
            self.tag = tag

    def handle_endtag(self, tag):
        if tag in SKIP and self.skip_depth:
            self.skip_depth -= 1
            return
        if tag in BLOCKS:
            self.flush()
        if self.in_main and tag == "div":
            self.main_depth -= 1
            if self.main_depth <= 0:
                self.in_main = False

    def handle_data(self, data):
        if self.skip_depth or not self.in_main or not self.tag:
            return
        self.buf.append(data)


def fetch(path):
    req = urllib.request.Request(
        BASE + urllib.parse.quote(path, safe="/-"),
        headers={"User-Agent": "Mozilla/5.0 (compatible; aertoit-rebuild)"},
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.status, r.read().decode("utf-8", "replace")


import urllib.parse  # noqa: E402  (used by fetch)

out = {}
for slug, path in PAGES.items():
    try:
        status, body = fetch(path)
    except Exception as exc:  # 404s arrive as HTTPError
        out[slug] = {"path": path, "status": getattr(exc, "code", str(exc)), "items": []}
        print(f"{slug:<46} {out[slug]['status']}")
        continue

    p = Linearise()
    p.feed(body)
    p.flush()
    # Drop the chrome that surrounds every page so what remains is the
    # article: the nav, the footer CTA and the cookie banner repeat verbatim
    # on all of them.
    items = p.items
    imgs = [i for i in items if i["type"] == "img"]
    out[slug] = {"path": path, "status": status, "items": items}
    print(f"{slug:<46} {status}  blocks={len(items)}  images={len(imgs)}")

io.open("original-subservice-content.json", "w", encoding="utf-8").write(
    json.dumps(out, ensure_ascii=False, indent=1)
)
print("\nwritten: original-subservice-content.json")
