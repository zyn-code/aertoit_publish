import sharp from 'sharp';
const C = [
  '29FCqXgMn77CdOqBmtwRz1zGMjQ.jpg',   // 0 etancheite (current - diagram)
  'AGs9q3MRWDSA0Pf5tbPFAEaFYTQ.jpg',   // 1 etancheite alt
  'AHMd32UIUSLwp4oL86ipAopNrI.jpeg',   // 2 etancheite alt
  '2Y8WF5Hl1W9rg5YBfTEWcuj64.jpeg',    // 3 velux (current - tiny)
  'M6x6hbj1S4rqt6C6QEdF5O9JeU.jpeg',   // 4 velux alt
  '7tC4YIHlkk5XAyfe4dLr1sKw.jpg',      // 5 nettoyage (current)
  'GGuaU6WAXVVOXmUeAygS4MEv2Rg.svg',   // 6 nettoyage alt
  'Mx5Q27i6tzMJ9LKliba5Wo6fTc.jpeg',   // 7 couverture alt
  '2dD80SQ6BxyIZMCXcwbMn4aA.jpg',      // 8 charpente alt
];
const S = 300, COLS = 3;
const tiles = [];
for (let i = 0; i < C.length; i++) {
  try {
    const buf = await sharp('raw/' + C[i]).resize(S, S, { fit: 'cover' }).png().toBuffer();
    tiles.push({ input: buf, left: (i % COLS) * S, top: Math.floor(i / COLS) * S });
  } catch (e) { console.log(`  [${i}] FAILED ${C[i]}: ${e.message}`); }
}
await sharp({ create: { width: COLS * S, height: Math.ceil(C.length / COLS) * S, channels: 3, background: '#fff' } })
  .composite(tiles).jpeg({ quality: 80 }).toFile('contact-sheet.jpg');
C.forEach((f, i) => console.log(`  [${i}] row${Math.floor(i/COLS)} col${i%COLS}  ${f}`));
