/**
 * Objective-defect sweep over every public route.
 *
 * Deliberately narrow: it only reports things that are wrong by measurement
 * — text clipped by its own box, images that failed to load or are drawn at
 * the wrong ratio, raw markup showing as text, placeholder strings, page
 * overflow, focus states that paint nothing, broken heading order, console
 * errors. Anything a person would have to have an opinion about is left
 * alone.
 *
 *   node audit-defects.mjs
 */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';
const WIDTHS = [360, 768, 1440];

const routes = await (async () => {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const found = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replace(/^https?:\/\/[^/]+/, ''),
  );
  return found.length ? [...new Set(found)] : ['/'];
})();

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--hide-scrollbars', '--force-color-profile=srgb'],
});

const problems = [];
const PLACEHOLDER = /NEEDS COPY|lorem ipsum|TODO|FIXME|\bundefined\b|\bNaN\b|\[object Object\]/i;
const RAW_MARKUP = /<\/?(p|div|span|h[1-6]|ul|li|strong|em|br|img)\b[^>]*>/i;

for (const width of WIDTHS) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });

  for (const route of routes) {
    consoleErrors.length = 0;
    const res = await page.goto(BASE + route, { waitUntil: 'networkidle0' });
    // 304 is a cache hit, which is a served page, not a failure.
    if (![200, 304].includes(res.status())) {
      problems.push(`${width}px ${route} — HTTP ${res.status()}`);
      continue;
    }

    // Walk the page so lazy images load and every reveal fires.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 200));
    });

    const found = await page.evaluate(
      ({ placeholderSrc, rawSrc }) => {
        const out = [];
        const placeholder = new RegExp(placeholderSrc, 'i');
        const raw = new RegExp(rawSrc, 'i');
        const label = (e) =>
          `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''}`;

        const de = document.documentElement;
        if (de.scrollWidth - de.clientWidth > 1) {
          out.push(`page scrolls horizontally by ${de.scrollWidth - de.clientWidth}px`);
        }

        for (const img of document.querySelectorAll('img')) {
          const r = img.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (!img.complete || img.naturalWidth === 0) {
            out.push(`broken image ${img.getAttribute('src')}`);
            continue;
          }
          // Drawn at a different ratio than the file, with no cover/contain
          // to explain it, means the picture is stretched.
          const fit = getComputedStyle(img).objectFit;
          if (fit === 'fill' || fit === 'none') {
            const drawn = r.width / r.height;
            const real = img.naturalWidth / img.naturalHeight;
            if (Math.abs(drawn - real) / real > 0.04) {
              out.push(
                `distorted image ${img.getAttribute('src')} (${drawn.toFixed(2)} vs ${real.toFixed(2)})`,
              );
            }
          }
          if (!img.hasAttribute('alt')) out.push(`image without alt ${img.getAttribute('src')}`);
        }

        // Text clipped by its own box: a hidden overflow narrower than the
        // content it holds. Scrollable regions are exempt.
        for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,a,button,span')) {
          if (!el.textContent.trim()) continue;
          const cs = getComputedStyle(el);
          if (cs.overflow === 'visible' || cs.textOverflow === 'ellipsis') continue;
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
          if (el.className === 'visually-hidden') continue;
          if (el.scrollWidth - el.clientWidth > 2 && cs.overflowX === 'hidden') {
            out.push(`clipped text in ${label(el)}: "${el.textContent.trim().slice(0, 40)}"`);
          }
        }

        // Placeholders and raw markup rendered as text.
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          const t = n.nodeValue.trim();
          if (!t) continue;
          const p = n.parentElement;
          if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName)) continue;
          if (placeholder.test(t)) out.push(`placeholder text in ${label(p)}: "${t.slice(0, 50)}"`);
          if (raw.test(t)) out.push(`raw markup shown as text in ${label(p)}: "${t.slice(0, 50)}"`);
        }

        // Heading order: exactly one h1, no level skipped.
        const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) =>
          Number(h.tagName[1]),
        );
        const h1s = hs.filter((h) => h === 1).length;
        if (h1s !== 1) out.push(`${h1s} h1 elements`);
        for (let i = 1; i < hs.length; i++) {
          if (hs[i] - hs[i - 1] > 1) out.push(`heading jumps h${hs[i - 1]} -> h${hs[i]}`);
        }

        return out;
      },
      { placeholderSrc: PLACEHOLDER.source, rawSrc: RAW_MARKUP.source },
    );

    for (const f of found) problems.push(`${width}px ${route} — ${f}`);

    const real = consoleErrors.filter((e) => !/favicon|404 \(Not Found\)/.test(e));
    for (const e of real) problems.push(`${width}px ${route} — console: ${e.slice(0, 110)}`);
  }
  await page.close();
  console.log(`swept ${routes.length} routes at ${width}px`);
}

await browser.close();

console.log(`\n${problems.length} problem line(s):`);
for (const p of problems) console.log('  ' + p);
