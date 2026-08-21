"""Extracts every page of the modifications deck as plain text."""
import io
from pypdf import PdfReader

PDF = r"C:\Workspace\Website\Modifications Site internet.pdf"

reader = PdfReader(PDF)
out = io.open("mods.txt", "w", encoding="utf-8")

for i, page in enumerate(reader.pages, 1):
    text = (page.extract_text() or "").strip()
    header = f"\n{'=' * 72}\nPAGE {i}\n{'=' * 72}"
    out.write(header + "\n" + (text or "(no text — image only)") + "\n")
    print(header)
    print(text or "(no text — image only)")

out.close()
