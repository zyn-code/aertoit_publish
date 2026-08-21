"""
Shows the font size / weight structure of a copy page, so heading detection
can key off typography instead of guessing from punctuation.
"""
import re
import sys
from collections import Counter

import pymupdf

PDF = r"C:\Workspace\Website\Modifications Site internet.pdf"
page_no = int(sys.argv[1]) if len(sys.argv) > 1 else 8

doc = pymupdf.open(PDF)
page = doc[page_no - 1]
blocks = page.get_text("dict")["blocks"]

sizes = Counter()
rows = []
for b in blocks:
    for line in b.get("lines", []):
        text = "".join(s["text"] for s in line["spans"]).strip()
        if not text:
            continue
        span = line["spans"][0]
        size = round(span["size"], 1)
        font = span["font"]
        bold = "bold" in font.lower() or "black" in font.lower() or "semib" in font.lower()
        sizes[size] += len(text)
        rows.append((size, bold, font, text))

print(f"page {page_no}: {len(rows)} lines\n")
print("size distribution (by characters):")
for size, chars in sorted(sizes.items(), reverse=True):
    print(f"  {size:>5}pt  {chars:>6} chars")

print("\nfirst 30 lines:")
for size, bold, font, text in rows[:30]:
    flag = "B" if bold else " "
    print(f"  {size:>5}pt {flag}  {re.sub(r'\\s+', ' ', text)[:82]}")
