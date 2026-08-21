/**
 * Converts the three in-article photographs of every sub-service page to
 * WebP and writes the manifest the migration reads.
 *
 * The sources come from original-subservice-content.json, which records the
 * order they appear in on aertoit.fr; that order is preserved here, because
 * the brief asks for the same sequence rather than merely the same set.
 *
 *   node build-content-images.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join('..', 'frontend', 'public', 'assets', 'services', 'content');
mkdirSync(OUT, { recursive: true });
mkdirSync('raw', { recursive: true });

const pages = JSON.parse(readFileSync('original-subservice-content.json', 'utf8'));

// Images that appear on every page are chrome (logos, footer, the shared
// "why choose us" block), not article content.
const pageCount = Object.keys(pages).length;
const seenOn = new Map();
for (const p of Object.values(pages)) {
  for (const src of new Set(p.items.filter((i) => i.type === 'img').map((i) => i.src))) {
    seenOn.set(src, (seenOn.get(src) ?? 0) + 1);
  }
}
const chrome = new Set([...seenOn].filter(([, n]) => n === pageCount).map(([s]) => s));

const manifest = {};
let downloaded = 0;
let before = 0;
let after = 0;

for (const [slug, page] of Object.entries(pages)) {
  const ordered = [];
  for (const item of page.items) {
    if (item.type !== 'img' || chrome.has(item.src)) continue;
    if (!ordered.some((o) => o.src === item.src)) ordered.push(item);
  }

  manifest[slug] = [];
  for (let i = 0; i < ordered.length; i++) {
    const src = ordered[i].src;
    const file = src.split('/').pop();
    const local = join('raw', file);

    if (!existsSync(local)) {
      const res = await fetch(src);
      if (!res.ok) {
        console.log(`  MISSING  ${slug}  ${file}  HTTP ${res.status}`);
        continue;
      }
      writeFileSync(local, Buffer.from(await res.arrayBuffer()));
      downloaded++;
    }

    const name = `${slug}-${i + 1}.webp`;
    const dest = join(OUT, name);
    const img = sharp(local);
    // Cropped to 3:4 here rather than in CSS. aertoit.fr presents these three
    // as portraits, and cropping at build time means the file that ships is
    // the part that shows: a landscape source cropped by CSS would have to
    // carry roughly twice the pixels to survive the crop on a 2x display.
    // Centre crop, which is what the original does.
    await img
      .resize(780, 1040, { fit: 'cover', position: 'centre', withoutEnlargement: false })
      .webp({ quality: 80 })
      .toFile(dest);

    before += readFileSync(local).length;
    after += readFileSync(dest).length;
    const out = await sharp(dest).metadata();
    manifest[slug].push({
      order: i + 1,
      origin: src,
      file: `/assets/services/content/${name}`,
      width: out.width,
      height: out.height,
    });
  }
  console.log(`${slug.padEnd(46)} ${manifest[slug].length} images`);
}

writeFileSync('content-images.json', JSON.stringify(manifest, null, 1));
console.log(
  `\ndownloaded ${downloaded} new  ·  ${(before / 1024 / 1024).toFixed(1)}MB -> ` +
    `${(after / 1024 / 1024).toFixed(1)}MB  ·  written content-images.json`,
);
