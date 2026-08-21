"""Page-by-page map of the modifications deck: size, kind, and opening lines."""
import io
import re
from pypdf import PdfReader

reader = PdfReader(r"C:\Workspace\Website\Modifications Site internet.pdf")

print(f"{'PG':>3}  {'CHARS':>6}  {'KIND':<12} OPENING")
print("-" * 100)
for i, page in enumerate(reader.pages, 1):
    t = re.sub(r"\s+", " ", (page.extract_text() or "")).strip()
    if not t:
        kind = "image-only"
    elif len(t) > 1500:
        kind = "page copy"          # full replacement text for a page
    elif "Modification" in t or "Enlever" in t or "Rajouter" in t or "Changer" in t:
        kind = "INSTRUCTION"
    else:
        kind = "label/short"
    print(f"{i:>3}  {len(t):>6}  {kind:<12} {t[:76]}")
