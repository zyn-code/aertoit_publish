"""
Subsets the webfonts to the characters a French site actually uses.

Inter ships as a 352 kB variable font covering Latin, Greek, Cyrillic and
Vietnamese. This site is French-only, so the rest is dead weight on every
first visit.

Keeps the full weight axis — the design uses 400/500/600/700 — and only
narrows the character set.

    python subset-fonts.py
"""
import os
import subprocess
import sys

FONT_DIR = os.path.join("..", "frontend", "public", "assets", "fonts")

# Basic Latin + Latin-1 Supplement + Latin Extended-A covers French
# (é è ê ë à â ä î ï ô ö ù û ü ÿ ç œ æ), plus the typographic punctuation
# the copy uses: ’ « » — – … and the ★ used in the rating line.
UNICODES = (
    "U+0020-007E,"      # basic latin
    "U+00A0-00FF,"      # latin-1 supplement (accented vowels, ç)
    "U+0100-017F,"      # latin extended-A (œ, Ÿ, ...)
    "U+2018-201F,"      # ‘ ’ “ ”
    "U+2013-2014,"      # – —
    "U+2026,"           # …
    "U+00AB,U+00BB,"    # « »
    "U+20AC,"           # €
    "U+2605,U+2606,"    # ★ ☆
    "U+2192,U+2197,"    # → ↗
    "U+260E"            # ☎
)


def subset(name):
    src = os.path.join(FONT_DIR, name)
    if not os.path.exists(src):
        print(f"  {name}: MISSING")
        return
    before = os.path.getsize(src)
    out = src.replace(".woff2", ".subset.woff2")

    cmd = [
        sys.executable, "-m", "fontTools.subset", src,
        f"--unicodes={UNICODES}",
        "--flavor=woff2",
        f"--output-file={out}",
        "--layout-features=kern,liga,calt,ccmp,locl",
        "--no-hinting",
        "--desubroutinize",
        # Keep the variable axes: the design uses several weights.
        "--drop-tables+=DSIG",
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"  {name}: FAILED\n{res.stderr[:300]}")
        return

    after = os.path.getsize(out)
    os.replace(out, src)
    pct = round((1 - after / before) * 100)
    print(f"  {name:<26} {before:>7} -> {after:>6} bytes  (-{pct}%)")


print("subsetting to the French character set:")
for f in ("Inter-Variable.woff2", "Satoshi-Variable.woff2"):
    subset(f)

total = sum(
    os.path.getsize(os.path.join(FONT_DIR, f))
    for f in os.listdir(FONT_DIR) if f.endswith(".woff2")
)
print(f"\n  total font payload: {total} bytes ({round(total/1024)} kB)")
