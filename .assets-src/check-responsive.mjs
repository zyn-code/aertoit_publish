/**
 * Measures every route at the viewport widths in the brief and reports the
 * defects a stylesheet review cannot catch: horizontal overflow, clipped or
 * overlapping content, undersized tap targets, distorted images.
 *
 * Drives the Edge binary already on this machine through puppeteer-core —
 * `puppeteer` proper would download a second Chromium for no benefit. This
 * is dev tooling; nothing here ships.
 *
 *     node check-responsive.mjs            # all widths
 *     node check-responsive.mjs 390        # one width
 */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';

const WIDTHS = process.argv[2] ? [Number(process.argv[2])] : [360, 390, 768, 1024, 1280, 1440];

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
  '/carriere/couvreur-qualifie',
  '/mentions-legales',
  '/politique-de-confidentialite',
  '/introuvable-xyz',
];

/** Runs in the page. Returns every measurable defect at this width. */
function probe() {
  const vw = window.innerWidth;
  const out = { overflow: null, bleeding: [], small: [], belowAaa: [], distorted: [], overlaps: [] };

  const docW = document.documentElement.scrollWidth;
  if (docW > vw + 1) out.overflow = { docW, vw };

  const label = (el) => {
    const cls = (el.className || '').toString().trim().split(/\s+/)[0] || '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  };

  const hidden = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return true;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (hidden(el)) continue;
    if (el.closest('.honeypot')) continue; // parked at -9999px on purpose

    // Elements poking past the viewport.
    //
    // An element can only push the page sideways if nothing between it and
    // the root clips or scrolls on the x axis. Matching on class names was
    // guesswork and got this wrong three times: a carousel viewport whose
    // class did not contain "scroller", and the FAQ band's decorative glows,
    // which sit inside `overflow: hidden` and are already clipped.
    if (r.right > vw + 1 || r.left < -1) {
      let clipped = false;
      for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') {
          clipped = true;
          break;
        }
      }
      if (!clipped) {
        out.bleeding.push(`${label(el)} [${Math.round(r.left)},${Math.round(r.right)}]`);
      }
    }

    // Images whose rendered box does not match their intrinsic ratio.
    if (el.tagName === 'IMG' && el.naturalWidth > 0) {
      const natural = el.naturalWidth / el.naturalHeight;
      const rendered = r.width / r.height;
      const fit = getComputedStyle(el).objectFit;
      const stretched = Math.abs(natural - rendered) / natural > 0.02;
      if (stretched && (fit === 'fill' || fit === 'none')) {
        out.distorted.push(`${label(el)} ${natural.toFixed(2)} vs ${rendered.toFixed(2)}`);
      }
    }
  }

  // Tap targets. Links sitting inside a sentence are exempt under WCAG 2.5.8.
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (hidden(el)) continue;
    if (el.closest('.honeypot')) continue;

    const p = el.parentElement;
    // WCAG 2.5.8 exempts a link that sits inside a run of text. LABEL belongs
    // in this list: the consent checkbox's privacy-policy link is part of a
    // sentence, not a control in its own right.
    const inline =
      el.tagName === 'A' &&
      p &&
      /^(P|LI|SPAN|TD|DD|H[1-6]|ADDRESS|BLOCKQUOTE|LABEL)$/.test(p.tagName) &&
      p.textContent.trim().length > el.textContent.trim().length + 5;
    if (inline) continue;

    // 24x24 is the AA floor (2.5.8). 44x44 is the AAA target (2.5.5) this
    // project aims at; falling between the two is reported separately so a
    // real AA failure is never buried under a stylistic shortfall.
    if (r.width < 24 || r.height < 24) {
      const parent = p ? label(p) : '?';
      out.small.push(
        `${label(el)}<${parent} "${(el.textContent || '').trim().slice(0, 18)}" ` +
          `${Math.round(r.width)}x${Math.round(r.height)}`,
      );
    } else if (r.width < 44 || r.height < 44) {
      out.belowAaa.push(
        `${label(el)} "${(el.textContent || '').trim().slice(0, 18)}" ` +
          `${Math.round(r.width)}x${Math.round(r.height)}`,
      );
    }
  }

  return out;
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let problems = 0;

for (const width of WIDTHS) {
  console.log(`\n${'='.repeat(66)}\n  ${width}px\n${'='.repeat(66)}`);
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 });
    // Reveal animations start elements at opacity 0; scrolling the page
    // triggers them so nothing is measured mid-transition.
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 250));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 250));
    });

    const r = await page.evaluate(probe);
    const bits = [];
    const notes = [];
    if (r.overflow) bits.push(`OVERFLOW ${r.overflow.docW}>${r.overflow.vw}`);
    if (r.bleeding.length) bits.push(`bleed(${r.bleeding.length}): ${r.bleeding.slice(0, 3).join(' ; ')}`);
    if (r.small.length)
      bits.push(`AA FAIL <24px (${r.small.length}): ${[...new Set(r.small)].slice(0, 4).join(' ; ')}`);
    if (r.belowAaa.length)
      notes.push(`24-43px (AA ok, AAA short) x${r.belowAaa.length}: ${[...new Set(r.belowAaa)].slice(0, 3).join(' ; ')}`);
    if (r.distorted.length) bits.push(`distorted: ${r.distorted.slice(0, 2).join(' ; ')}`);

    if (bits.length) {
      problems += bits.length;
      console.log(`  ${route}`);
      for (const b of bits) console.log(`      ${b}`);
    } else {
      console.log(`  ${route.padEnd(46)} ok${notes.length ? '   ·  ' + notes[0] : ''}`);
    }
  }
  await page.close();
}

console.log(`\nTOTAL problem lines: ${problems}`);
await browser.close();
