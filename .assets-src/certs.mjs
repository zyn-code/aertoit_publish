import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
const files = await readdir('raw');
const small = [];
for (const f of files) {
  try {
    const m = await sharp('raw/' + f).metadata();
    // Cert badges/icons: small, roughly square-ish, not photos
    if (m.width <= 260 && m.height <= 260 && m.width >= 30) small.push({ f, w: m.width, h: m.height });
  } catch {}
}
small.sort((a, b) => a.f.localeCompare(b.f));
const S = 200, COLS = 5;
const tiles = [];
for (let i = 0; i < small.length && i < 20; i++) {
  const buf = await sharp('raw/' + small[i].f)
    .resize(S - 20, S - 20, { fit: 'contain', background: '#fff' })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#fff' })
    .png().toBuffer();
  tiles.push({ input: buf, left: (i % COLS) * S, top: Math.floor(i / COLS) * S });
}
await sharp({ create: { width: COLS * S, height: Math.ceil(Math.min(small.length,20) / COLS) * S, channels: 3, background: '#ffffff' } })
  .composite(tiles).jpeg({ quality: 85 }).toFile('cert-sheet.jpg');
small.slice(0, 20).forEach((s, i) => console.log(`  [${i}] r${Math.floor(i/COLS)}c${i%COLS}  ${s.w}x${s.h}  ${s.f}`));
