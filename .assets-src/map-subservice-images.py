"""
Finds the hero photo for each sub-service page and any image not yet in the
local asset set, then downloads what is missing.

Writes 013-subservice-images.sql.

    python map-subservice-images.py
"""
import io
import os
import re
import urllib.request

BASE = "https://aertoit.fr"
RAW = "raw"

SUBS = [
    "couverture-en-tuiles",
    "couverture-en-ardoises",
    "couverture-en-bac-acier",
    "solutions-d-isolation-laine-de-verre",
    "solutions-d-isolation-laine-de-roche",
    "solutions-d-isolation-sarking-fibre-de-bois",
    "solutions-d-isolation-sarking-polyurethane",
    "solutions-d-isolation-actis",
    "accessoires-velux",
]

IMG_RE = re.compile(r"https://framerusercontent\.com/images/([A-Za-z0-9]+\.(?:jpe?g|png|webp))")


def fetch(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")


# Images that appear on shared chrome / the homepage are not page heroes.
common = set()
for p in ("/", "/couverture", "/isolation", "/fenetre-de-toit-velux"):
    common |= set(IMG_RE.findall(fetch(p)))
print(f"chrome/common images: {len(common)}\n")

os.makedirs(RAW, exist_ok=True)

# Cache each page's images, then drop anything that turns up on more than one
# sub-service page: a hero is unique to its page, so a repeat is shared
# furniture the /-and-parents filter did not catch.
page_imgs = {}
freq = {}
for slug in SUBS:
    imgs = list(dict.fromkeys(IMG_RE.findall(fetch(f"/service/{slug}"))))
    page_imgs[slug] = [i for i in imgs if i not in common]
    for i in set(page_imgs[slug]):
        freq[i] = freq.get(i, 0) + 1

shared = {i for i, n in freq.items() if n > 1}
print(f"shared across sub-pages (excluded): {len(shared)}\n")

picks = {}

for slug in SUBS:
    imgs = [i for i in page_imgs[slug] if i not in shared]

    # Prefer a photograph over a diagram or icon: photos are JPEG here, and
    # the hero is the largest of them.
    best, best_size = None, 0
    for name in imgs:
        path = os.path.join(RAW, name)
        if not os.path.exists(path):
            try:
                urllib.request.urlretrieve(
                    f"https://framerusercontent.com/images/{name}", path)
            except Exception:  # noqa: BLE001
                continue
        size = os.path.getsize(path)
        # Skip tiny assets (icons) and prefer raster photos.
        if size < 20_000:
            continue
        if size > best_size:
            best, best_size = name, size

    picks[slug] = best
    print(f"  {slug:<46} {len(imgs):>2} unique  ->  {best or 'NONE'} ({best_size // 1024} kB)")

io.open("subservice-picks.txt", "w", encoding="utf-8").write(
    "\n".join(f"{k}\t{v}" for k, v in picks.items() if v)
)
print(f"\nwrote subservice-picks.txt ({sum(1 for v in picks.values() if v)} of {len(SUBS)})")
