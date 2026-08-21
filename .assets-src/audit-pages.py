"""
Sweeps every prerendered page for the defect classes this rebuild has
actually produced: broken links, broken asset references, images without
alt text, duplicate or missing H1s, and empty sections.

    python audit-pages.py
"""
import io
import os
import re
import urllib.parse
import urllib.request

BASE = "http://localhost:4000"
DIST = r"C:\Workspace\Website\frontend\dist\frontend\browser"


def routes():
    out = []
    for root, _dirs, files in os.walk(DIST):
        if "index.html" in files:
            rel = os.path.relpath(root, DIST).replace("\\", "/")
            out.append("/" if rel == "." else "/" + rel)
    return sorted(out)


def get(path):
    req = urllib.request.Request(BASE + urllib.parse.quote(path),
                                 headers={"User-Agent": "audit"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


def head_status(url):
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "audit"})
        return urllib.request.urlopen(req, timeout=20).status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:  # noqa: BLE001
        return 0


all_routes = routes()
route_set = set(all_routes)
asset_cache = {}
problems = []

print(f"auditing {len(all_routes)} routes\n")

for path in all_routes:
    try:
        html = get(path)
    except Exception as e:  # noqa: BLE001
        problems.append((path, "FETCH", str(e)[:60]))
        continue

    # --- H1 -----------------------------------------------------------
    h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    if len(h1s) != 1:
        problems.append((path, "H1", f"{len(h1s)} H1 elements"))

    # --- images: alt + resolvable --------------------------------------
    for tag in re.findall(r"<img\b[^>]*>", html):
        src = re.search(r'src="([^"]+)"', tag)
        # Angular serialises alt="" as a bare `alt`, which is valid HTML5 and
        # still marks the image decorative — accept both forms.
        alt = re.search(r'\balt(=|\s|>)', tag)
        if alt is None:
            problems.append((path, "IMG", f"no alt attribute: {(src.group(1) if src else tag)[:52]}"))
        if src and src.group(1).startswith("/"):
            u = src.group(1)
            if u not in asset_cache:
                asset_cache[u] = head_status(BASE + urllib.parse.quote(u))
            if asset_cache[u] != 200:
                problems.append((path, "IMG", f"{asset_cache[u]} {u[:52]}"))

    # --- internal links resolve to a real route -------------------------
    for href in set(re.findall(r'href="(/[^"#?]*)"', html)):
        if re.search(r"\.[a-z0-9]{2,5}$", href):        # asset, checked above
            if href not in asset_cache:
                asset_cache[href] = head_status(BASE + urllib.parse.quote(href))
            if asset_cache[href] != 200:
                problems.append((path, "ASSET", f"{asset_cache[href]} {href[:52]}"))
            continue
        clean = href.rstrip("/") or "/"
        if clean in route_set:
            continue
        code = head_status(BASE + urllib.parse.quote(href))
        if code not in (200, 301, 302):
            problems.append((path, "LINK", f"{code} {href[:52]}"))

    # --- empty sections -------------------------------------------------
    for sec in re.findall(r"<section[^>]*>(.*?)</section>", html, re.S):
        text = re.sub(r"<[^>]+>", " ", sec)
        if len(text.split()) < 3:
            problems.append((path, "EMPTY", "section with almost no text"))
            break

by_kind = {}
for path, kind, detail in problems:
    by_kind.setdefault(kind, []).append((path, detail))

if not problems:
    print("  no problems found")
else:
    for kind in sorted(by_kind):
        items = by_kind[kind]
        print(f"{kind}  ({len(items)})")
        seen = set()
        for path, detail in items:
            key = (kind, detail)
            if key in seen:
                continue
            seen.add(key)
            print(f"   {path:<48} {detail}")
        print()

print(f"TOTAL problems: {len(problems)}")
