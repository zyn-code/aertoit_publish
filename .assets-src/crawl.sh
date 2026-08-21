#!/bin/sh
# Recursive crawl of aertoit.fr, 3 levels deep.
: > seen.txt; : > queue.txt
echo "/" >> queue.txt
curl -s https://aertoit.fr/sitemap.xml | grep -oE '<loc>[^<]+' | sed 's|<loc>||; s|https://aertoit.fr||' | sed 's|^$|/|' >> queue.txt
sort -u queue.txt -o queue.txt

for depth in 1 2 3; do
  : > next.txt
  while read -r p; do
    grep -qxF "$p" seen.txt && continue
    echo "$p" >> seen.txt
    curl -s "https://aertoit.fr$p" \
      | grep -oE 'href="(\./|/)[^"#?]*"' \
      | sed 's|href="\./|/|; s|href="||; s|"$||' \
      | grep -vE '^//|^/$' >> next.txt
  done < queue.txt
  sort -u next.txt | grep -vE '\.(xml|json|jpg|png|svg|webp|pdf)$' > queue.txt
done
sort -u seen.txt
