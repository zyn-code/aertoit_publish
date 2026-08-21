import sharp from 'sharp';
import { readFileSync } from 'node:fs';
// Python wrote this on Windows, so lines end \r\n — strip CR or every
// filename gains a trailing carriage return and no file is ever found.
const picks = readFileSync('subservice-picks.txt', 'utf8')
  .split(/\r?\n/).filter(Boolean).map(l => l.split('\t').map(s => s.trim()));
const S = 300, COLS = 3;
const tiles = [];
for (let i = 0; i < picks.length; i++) {
  const buf = await sharp('raw/' + picks[i][1]).resize(S, S, { fit: 'cover' }).png().toBuffer();
  tiles.push({ input: buf, left: (i % COLS) * S, top: Math.floor(i / COLS) * S });
}
await sharp({ create: { width: COLS*S, height: Math.ceil(picks.length/COLS)*S, channels: 3, background: '#fff' } })
  .composite(tiles).jpeg({ quality: 82 }).toFile('subservice-sheet.jpg');
picks.forEach(([slug], i) => console.log(`  [r${Math.floor(i/COLS)}c${i%COLS}] ${slug}`));
