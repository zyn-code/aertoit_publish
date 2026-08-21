/**
 * Photographs the restored gallery on every sub-service page and tiles them
 * into sheets, so all eleven can actually be looked at rather than assumed.
 *
 *   node shoot-galleries.mjs
 */
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';
const slugs = Object.keys(JSON.parse(readFileSync('content-images.json', 'utf8')));

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--hide-scrollbars'],
});

const shots = [];
for (const slug of slugs) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/service/${slug}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() =>
    document.querySelectorAll('[class*=cookie]').forEach((e) => (e.style.display = 'none')),
  );
  // appReveal holds the article at opacity 0 until it intersects, so the
  // block has to pass through the viewport before it can be photographed.
  const ok = await page.evaluate(async () => {
    const g = document.querySelector('.prose-gallery');
    if (!g) return false;
    g.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 800));
    return true;
  });
  if (!ok) {
    console.log(`${slug}: NO GALLERY`);
    await page.close();
    continue;
  }
  const el = await page.$('.prose-gallery');
  shots.push({ slug, buf: await el.screenshot() });
  const alts = await page.$$eval('.prose-gallery img', (is) => is.map((i) => i.alt));
  console.log(`${slug.padEnd(46)} ${alts.length} images`);
  await page.close();
}
await browser.close();

// Tile them, four pages per sheet.
const W = 1000;
const LABEL = 26;
const PER = 4;
for (let s = 0; s < shots.length; s += PER) {
  const group = shots.slice(s, s + PER);
  const rows = [];
  for (const g of group) {
    const img = sharp(g.buf).resize(W - 20, null, { fit: 'inside' });
    rows.push({ slug: g.slug, buf: await img.png().toBuffer(), meta: await img.metadata() });
  }
  let y = 0;
  const layers = [];
  for (const r of rows) {
    const h = (await sharp(r.buf).metadata()).height;
    layers.push({
      input: Buffer.from(
        `<svg width="${W}" height="${LABEL}"><rect width="100%" height="100%" fill="#0b223f"/>` +
          `<text x="8" y="18" font-family="Arial" font-size="14" fill="#fff">${r.slug}</text></svg>`,
      ),
      top: y,
      left: 0,
    });
    layers.push({ input: r.buf, top: y + LABEL + 4, left: 10 });
    y += LABEL + h + 14;
  }
  const name = `shot-galleries-${s / PER + 1}.jpg`;
  await sharp({ create: { width: W, height: y, channels: 3, background: '#ffffff' } })
    .composite(layers)
    .jpeg({ quality: 76 })
    .toFile(name);
  console.log(name);
}
