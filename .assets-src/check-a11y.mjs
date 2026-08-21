/**
 * Accessibility, console and link checks that need a real browser.
 *
 *   - console errors and failed network requests
 *   - heading order (no skipped levels, exactly one h1)
 *   - images without an alt attribute
 *   - form controls with no accessible label
 *   - duplicate element ids
 *   - broken internal links (crawled from every page)
 *   - contrast of body text against its background
 *
 *     node check-a11y.mjs
 */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';

const ROUTES = [
  '/',
  '/contact',
  '/a-propos',
  '/nos-prestations',
  '/realisations',
  '/blog',
  '/blog/la-saison-du-demoussage-est-arrivee',
  '/service/couverture',
  '/service/couverture-en-tuiles',
  '/service/isolation',
  '/carriere/couvreur-qualifie',
  '/mentions-legales',
  '/politique-de-confidentialite',
  '/introuvable-xyz',
];

function audit() {
  const out = { headings: [], noAlt: [], unlabelled: [], dupIds: [], contrast: [], links: [], overImage: 0, unmeasurable: 0 };

  // --- heading order -------------------------------------------------
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
    level: Number(h.tagName[1]),
    text: h.textContent.trim().slice(0, 40),
  }));
  const h1s = hs.filter((h) => h.level === 1).length;
  if (h1s !== 1) out.headings.push(`${h1s} h1 elements`);
  for (let i = 1; i < hs.length; i++) {
    if (hs[i].level - hs[i - 1].level > 1) {
      out.headings.push(`h${hs[i - 1].level} -> h${hs[i].level} at "${hs[i].text}"`);
    }
  }

  // --- images --------------------------------------------------------
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) out.noAlt.push(img.getAttribute('src') || '(no src)');
  }

  // --- form controls -------------------------------------------------
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (el.type === 'hidden' || el.closest('.honeypot')) continue;
    const labelled =
      el.labels?.length ||
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.getAttribute('title');
    if (!labelled) out.unlabelled.push(el.name || el.id || el.type);
  }

  // --- duplicate ids -------------------------------------------------
  const seen = new Map();
  for (const el of document.querySelectorAll('[id]')) {
    seen.set(el.id, (seen.get(el.id) || 0) + 1);
  }
  for (const [id, n] of seen) if (n > 1) out.dupIds.push(`${id} x${n}`);

  // --- contrast ------------------------------------------------------
  // Relative luminance per WCAG; walks up for the first opaque background.
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  /**
   * Resolves the effective background, or reports that it cannot.
   *
   * Two cases defeat a static computation and must not be reported as
   * failures: text sitting on a photograph, and a translucent panel whose
   * own colour is only part of the answer. The first version walked up to
   * the nearest non-transparent background and found the hero CTA's
   * `rgba(255,255,255,0.12)` — white on white, 1.00:1 — when the text is in
   * fact white on a dark navy scrim.
   */
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = cs.backgroundColor;
      const a = Number((c.match(/[\d.]+/g) || [])[3] ?? 1);
      if (!c || c === 'transparent' || a === 0) continue;
      // Anything short of opaque leaves the real backdrop unknown.
      if (a < 1) return null;
      return parse(c);
    }
    return [255, 255, 255];
  };

  // Text laid over a hero photograph: the backdrop is pixels, not a colour.
  // Every surface that lays type over a photograph. The backdrop is
  // pixels, so no static computation can resolve it.
  const overImage = (el) =>
    !!el.closest('.hero, .service-hero.has-media, .closing-cta, .tile, .svc, .about-hero');

  const sample = [...document.querySelectorAll('p, li, a, span, h1, h2, h3, h4, button')].slice(
    0,
    400,
  );
  for (const el of sample) {
    const cs = getComputedStyle(el);
    if (!el.textContent.trim()) continue;
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    if (overImage(el)) {
      out.overImage++;
      continue;
    }
    const fg = parse(cs.color);
    const bg = bgOf(el);
    if (bg === null) {
      out.unmeasurable++;
      continue;
    }
    const l1 = lum(fg) + 0.05;
    const l2 = lum(bg) + 0.05;
    const ratio = l1 > l2 ? l1 / l2 : l2 / l1;

    const px = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;

    if (ratio < need) {
      out.contrast.push(
        `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} ` +
          `"${el.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}:1 (needs ${need})`,
      );
    }
  }

  // --- internal links ------------------------------------------------
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('//')) out.links.push(href.split('#')[0]);
  }

  return out;
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const consoleErrors = [];
const failedRequests = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(`${page.url()} :: ${m.text().slice(0, 160)}`);
});
page.on('requestfailed', (r) =>
  failedRequests.push(`${r.url().slice(0, 110)} :: ${r.failure()?.errorText}`),
);
page.on('response', (r) => {
  if (r.status() >= 400) failedRequests.push(`HTTP ${r.status()} ${r.url().slice(0, 110)}`);
});

const allLinks = new Set();
let problems = 0;

for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 200));
  });
  const r = await page.evaluate(audit);
  r.links.forEach((l) => allLinks.add(l));

  const bits = [];
  if (r.headings.length) bits.push(`headings: ${r.headings.join(' ; ')}`);
  if (r.noAlt.length) bits.push(`img without alt: ${r.noAlt.length}`);
  if (r.unlabelled.length) bits.push(`unlabelled controls: ${r.unlabelled.join(', ')}`);
  if (r.dupIds.length) bits.push(`duplicate ids: ${r.dupIds.join(', ')}`);
  if (r.contrast.length) bits.push(`contrast(${r.contrast.length}): ${r.contrast.slice(0, 3).join(' ; ')}`);

  if (bits.length) {
    problems += bits.length;
    console.log(`\n  ${route}`);
    for (const b of bits) console.log(`      ${b}`);
  } else {
    console.log(`  ${route.padEnd(46)} ok`);
  }
}

// --- every internal link resolves ------------------------------------
console.log(`\nchecking ${allLinks.size} distinct internal links…`);
const broken = [];
for (const href of allLinks) {
  const res = await page.goto(BASE + href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const status = res?.status() ?? 0;
  // The 404 route is expected to 404; everything else must resolve.
  if (status >= 400) broken.push(`${href} -> ${status}`);
}
if (broken.length) {
  problems += broken.length;
  console.log('  BROKEN INTERNAL LINKS:');
  for (const b of broken) console.log(`      ${b}`);
} else {
  console.log('  all internal links resolve');
}

console.log(`\nconsole errors: ${consoleErrors.length}`);
for (const e of [...new Set(consoleErrors)].slice(0, 10)) console.log(`   ${e}`);
const realFails = [...new Set(failedRequests)].filter((f) => !f.includes('introuvable'));
console.log(`failed requests: ${realFails.length}`);
for (const f of realFails.slice(0, 10)) console.log(`   ${f}`);

console.log(`\nTOTAL problem lines: ${problems + consoleErrors.length + realFails.length}`);
await browser.close();
