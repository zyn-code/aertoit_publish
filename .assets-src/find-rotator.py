"""Reports which live pages carry the commune rotator in their hero."""
import io
import json
import os
import re

COMMUNE = re.compile(r"^(Dans le Val-de-Marne|Au |À |Aux )", re.I)

for name in sorted(os.listdir("content")):
    d = json.load(io.open(os.path.join("content", name), encoding="utf-8"))
    hits = [
        b["text"] for b in d["blocks"]
        if b["tag"] in ("h1", "h2", "h3") and COMMUNE.match(b["text"]) and len(b["text"]) < 34
    ]
    tag = "ROTATOR" if len(hits) >= 3 else "-"
    print(f"  {tag:<8} {d['path']:<52} {len(hits):>2}  {', '.join(hits[:4])}")
