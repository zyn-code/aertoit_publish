/**
 * Contact sheets of the restored in-article photographs, one row per page.
 * Written so the alt text can be based on what the picture actually shows
 * rather than on its filename.
 *
 *   node content-sheet.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('content-images.json', 'utf8'));
const slugs = Object.keys(manifest);
const PUBLIC = join('..', 'frontend', 'public');

const CELL = 300;
const CELL_H = 210;
const LABEL = 26;
const ROW = CELL_H + LABEL;
const PER_SHEET = 4;

for (let s = 0; s < slugs.length; s += PER_SHEET) {
  const group = slugs.slice(s, s + PER_SHEET);
  const width = CELL * 3;
  const height = ROW * group.length;
  const layers = [];

  for (let r = 0; r < group.length; r++) {
    const slug = group[r];
    const y = r * ROW;
    layers.push({
      input: Buffer.from(
        `<svg width="${width}" height="${LABEL}">
           <rect width="100%" height="100%" fill="#0b223f"/>
           <text x="8" y="18" font-family="Arial" font-size="14" fill="#ffffff">${slug}   (1, 2, 3 left to right)</text>
         </svg>`,
      ),
      top: y,
      left: 0,
    });
    for (const img of manifest[slug]) {
      const buf = await sharp(join(PUBLIC, img.file))
        .resize(CELL - 4, CELL_H - 4, { fit: 'cover' })
        .png()
        .toBuffer();
      layers.push({ input: buf, top: y + LABEL + 2, left: (img.order - 1) * CELL + 2 });
    }
  }

  const name = `content-sheet-${s / PER_SHEET + 1}.jpg`;
  await sharp({
    create: { width, height, channels: 3, background: '#ffffff' },
  })
    .composite(layers)
    .jpeg({ quality: 78 })
    .toFile(name);
  console.log(name, group.join(', '));
}
