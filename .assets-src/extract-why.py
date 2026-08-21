"""Pulls the repeated "Pourquoi Nous Choisir ?" block from a service page."""
import re
import urllib.request
from html.parser import HTMLParser

SKIP = {"script", "style", "noscript", "svg", "head"}
BLOCKS = {"h1", "h2", "h3", "h4", "p", "li"}


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
        elif not self.skip and t in BLOCKS:
            self.stack.append(t)
            self.buf = []

    def handle_endtag(self, t):
        if t in SKIP:
            self.skip = max(0, self.skip - 1)
        elif not self.skip and t in BLOCKS and self.stack and self.stack[-1] == t:
            self.stack.pop()
            txt = re.sub(r"\s+", " ", "".join(self.buf)).strip()
            if len(txt) > 2:
                self.blocks.append((t, txt))
            self.buf = []

    def handle_data(self, d):
        if not self.skip and self.stack:
            self.buf.append(d)


req = urllib.request.Request("https://aertoit.fr/service/travaux-de-charpente",
                             headers={"User-Agent": "Mozilla/5.0"})
p = P()
p.feed(urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace"))

out, capture = [], False
for tag, text in p.blocks:
    if re.match(r"^Pourquoi Nous Choisir", text, re.I):
        capture = True
        continue
    if capture:
        # The block ends at the next major heading or the FAQ.
        if tag in ("h1", "h2") or re.match(r"^Questions\s*/", text, re.I):
            break
        out.append((tag, text))

print(f'"Pourquoi Nous Choisir ?" — {len(out)} blocks\n')
for tag, text in out:
    print(f"  {tag:<3} {text[:96]}")
