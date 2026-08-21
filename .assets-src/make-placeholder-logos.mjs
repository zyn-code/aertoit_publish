/**
 * Generates visibly-marked placeholder badges for the three partner logos
 * the deck asks for but does not supply (APRIL, FFB) plus VELUX, whose row
 * has had a NULL logo since the first import.
 *
 * They are written at the exact paths the `certifications` rows point at, so
 * dropping in a real file is a straight replacement with no DB change.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = '../frontend/public/assets/certifications';
const S = 144;

const LOGOS = [
  { file: 'april.webp', label: 'APRIL' },
  { file: 'ffb.webp', label: 'FFB' },
  { file: 'velux.webp', label: 'VELUX' },
];

await mkdir(OUT, { recursive: true });

for (const { file, label } of LOGOS) {
  // A dashed outline reads as "deliberately empty" rather than "broken image".
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <rect x="4" y="4" width="${S - 8}" height="${S - 8}" rx="10"
          fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" stroke-dasharray="7 5"/>
    <text x="50%" y="46%" text-anchor="middle" font-family="Arial, sans-serif"
          font-size="24" font-weight="700" fill="#475569">${label}</text>
    <text x="50%" y="64%" text-anchor="middle" font-family="Arial, sans-serif"
          font-size="11" fill="#64748b">logo a fournir</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(`${OUT}/${file}`);
  console.log(`  ${file}  (${label} placeholder)`);
}
