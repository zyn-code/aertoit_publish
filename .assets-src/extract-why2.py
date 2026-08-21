"""Checks whether the other three feature descriptions exist in the markup."""
import re
import urllib.request

req = urllib.request.Request(
    "https://aertoit.fr/service/travaux-de-charpente",
    headers={"User-Agent": "Mozilla/5.0"},
)
html = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")

for term in ("Dépannage d’Urgence", "Dépannage d'Urgence", "Engagement Écologique",
             "Couvreurs Qualifiés", "Service d’Accueil", "Service d'Accueil"):
    hits = [m.end() for m in re.finditer(re.escape(term), html)]
    if not hits:
        continue
    seg = html[hits[0]:hits[0] + 900]
    text = re.sub(r"<[^>]+>", " ", seg)
    text = re.sub(r"\s+", " ", text).strip()
    print(f"=== {term}  ({len(hits)} occurrences)")
    print(f"    {text[:220]}\n")
