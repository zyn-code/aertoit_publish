/**
 * Converts the originals pulled from the live site into web-ready assets.
 *
 * The live site ships these as raw JPEG/PNG — 52 MB across the set, with
 * single files up to 3.7 MB — which is the main reason its homepage weighs
 * 4.8 MB. Everything here becomes WebP, capped at a sensible render width.
 *
 *   node build-assets.mjs
 */
import sharp from 'sharp';
import { mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const RAW = resolve('raw');
const OUT = resolve('..', 'frontend', 'public', 'assets');

/** [source file, destination, max render width] */
const JOBS = [
  // Hero / header band. A seamless tile pattern, not a photograph, so it
  // compresses to almost nothing and never needs full resolution.
  ['qE80Q29arMc70EAREfeNGmzh9I.png', 'hero-toiture.webp', 1600],

  // Service card photos, one per page, rendered ~544px wide in a 16:10 box.
  ['4EELNGiZmzUYYEOxFpI0L8g7Y4.jpg', 'services/couverture.webp', 1100],
  ['6B6t5yVdL2iD9tAF4S2AUJtXYls.jpeg', 'services/isolation.webp', 1100],
  // Not 2Y8WF5Hl… — that source is only 360px wide and renders soft in a
  // 544px card. This one is full resolution.
  ['M6x6hbj1S4rqt6C6QEdF5O9JeU.jpeg', 'services/fenetre-de-toit-velux.webp', 1100],
  ['5PMq8NxeGo4LwJ4lExtKwCn3hoI.jpeg', 'services/travaux-de-charpente.webp', 1100],
  // Not 29FCqXgM… — that file is a technical cross-section drawing, not a
  // photograph of finished work. This is the completed terrace membrane.
  ['AHMd32UIUSLwp4oL86ipAopNrI.jpeg', 'services/etancheite-de-toit-terrasse.webp', 1100],
  ['7tC4YIHlkk5XAyfe4dLr1sKw.jpg', 'services/nettoyage-et-entretien-de-toiture.webp', 1100],

  // Blog covers — mapped from each post's card link on the live homepage.
  ['iAqrDovmeR7tPh3RkwaHebJvMQE.png', 'blog/fibre-de-bois.webp', 900],
  ['9qqKklPVXAISBtQdQ4vkBCX4.png', 'blog/metier-de-couvreur.webp', 900],
  ['fmYGpM1NUql98KsBrDyt6FzVgc.png', 'blog/gouttieres-zinc-pvc.webp', 900],
  ['5rXjVOz5D3B1o9hD69PIoF0bYs.png', 'blog/preparer-hiver.webp', 900],

  // Client avatars in the hero rating cluster, rendered at 40px.
  ['cWjCiBlhd98GRSpNSVbvkxLNkk.png', 'avatars/client-1.webp', 120],
  ['wpFR2bMzF4Fbaf9JXDLmSUOng.png', 'avatars/client-2.webp', 120],
  ['trOuFXeYShrZO6spuodiNLG9Hk.png', 'avatars/client-3.webp', 120],
];

/** SVGs are copied untouched — already tiny and resolution-independent. */
const SVGS = [
  // Two logo variants: white for the navy header, dark for light backgrounds.
  ['FKOIp4kDBSHLmILiwql8sEQwFM.svg', 'logo-aertoit.svg'],
  ['JvoC6XML6ZEYx2ulsGwjlTQiAA.svg', 'logo-aertoit-footer.svg'],

  // "Les plus d'AERTOIT" icons, identified from a contact sheet of the
  // site's small assets.
  ['GGuaU6WAXVVOXmUeAygS4MEv2Rg.svg', 'certifications/experience.svg'], // hard hat
  ['HxvO0NGWeK33tVfuFrIpjid518.svg', 'certifications/eco-artisan.svg'], // leaves
];

/** Raster certification badges. */
const CERT_PNGS = [
  ['M4WsaSq896n94uGbfpjIBFl6F0.png', 'certifications/garantie-decennale.webp', 224], // rosette
  ['IOMkQSfcuoeEIVYgJdsA40gfL8.png', 'certifications/rge-qualibat.webp', 220],
];

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;

let before = 0;
let after = 0;
const missing = [];

await mkdir(OUT, { recursive: true });

for (const [src, dest, width] of [...JOBS, ...CERT_PNGS]) {
  const from = join(RAW, src);
  if (!existsSync(from)) {
    missing.push(src);
    continue;
  }
  const to = join(OUT, dest);
  await mkdir(dirname(to), { recursive: true });

  const inSize = (await stat(from)).size;
  await sharp(from)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile(to);
  const outSize = (await stat(to)).size;

  before += inSize;
  after += outSize;
  const pct = Math.round((1 - outSize / inSize) * 100);
  console.log(`  ${dest.padEnd(46)} ${kb(inSize).padStart(9)} -> ${kb(outSize).padStart(8)}  (-${pct}%)`);
}

for (const [src, dest] of SVGS) {
  const from = join(RAW, src);
  if (!existsSync(from)) {
    missing.push(src);
    continue;
  }
  const to = join(OUT, dest);
  await copyFile(from, to);
  const size = (await stat(to)).size;
  before += size;
  after += size;
  console.log(`  ${dest.padEnd(46)} ${kb(size).padStart(9)} -> ${kb(size).padStart(8)}  (svg, copied)`);
}

console.log(`\n  total ${kb(before)} -> ${kb(after)}  (-${Math.round((1 - after / before) * 100)}%)`);
if (missing.length) console.log(`\n  MISSING from raw/: ${missing.join(', ')}`);
