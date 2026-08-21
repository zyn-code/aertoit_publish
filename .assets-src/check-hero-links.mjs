/**
 * Measures the hero service-link block: how much of it sits over the
 * photograph, whether it clears the hero copy, and that the cards are
 * genuinely opaque rather than tinted by the image behind them.
 *
 *   node check-hero-links.mjs
 */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';
const WIDTHS = [360, 390, 768, 1024, 1280, 1440];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--hide-scrollbars', '--force-color-profile=srgb'],
});

const fail = [];
const note = (ok, msg) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
  if (!ok) fail.push(`${msg}`);
};

const overlaps = [];

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  console.log(`\n=== ${width}px ===`);

  const m = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const block = document.querySelector('.svc-links');
    const cards = [...document.querySelectorAll('.svc-link')];
    const title = document.querySelector('.hero__title');
    const actions = document.querySelector('.hero__actions');
    const proof = document.querySelector('.hero__proof');
    const showcase = document.querySelector('.svc-grid');
    const r = (e) => {
      const b = e.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, h: b.height };
    };
    const hb = r(hero);
    const bb = r(block);
    const over = Math.max(0, Math.min(hb.bottom, bb.bottom) - bb.top);
    const first = cards[0];
    const cs = getComputedStyle(first);
    // Distinct row tops tell us the real column count.
    const tops = [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().top)))];
    const rowOne = cards.filter(
      (c) => Math.round(c.getBoundingClientRect().top) === tops[0],
    ).length;
    return {
      heroBottom: hb.bottom,
      block: bb,
      overPx: over,
      overPct: (over / bb.h) * 100,
      cards: cards.length,
      labels: cards.map((c) => c.querySelector('.svc-link__title').textContent.trim()),
      transform: getComputedStyle(cards[0].querySelector('.svc-link__title')).textTransform,
      hrefs: cards.map((c) => c.getAttribute('href')),
      cols: rowOne,
      rows: tops.length,
      opacity: cs.opacity,
      bg: cs.backgroundColor,
      radius: parseFloat(cs.borderRadius),
      minH: Math.round(cards[0].getBoundingClientRect().height),
      pad: cs.padding,
      // The hero copy must stay clear of the block.
      clearsTitle: title.getBoundingClientRect().bottom <= bb.top,
      clearsActions: actions.getBoundingClientRect().bottom <= bb.top,
      clearsProof: proof ? proof.getBoundingClientRect().bottom <= bb.top : true,
      // And the block must clear the showcase below it.
      gapToShowcase: showcase ? showcase.getBoundingClientRect().top - bb.bottom : null,
      nested: cards.some((c) => c.querySelectorAll('a,button').length > 0),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  overlaps.push({ width, pct: m.overPct, px: m.overPx });

  note(m.cards === 6, `six cards (${m.cards})`);
  note(
    m.labels.join(' | ') ===
      'Isolation | Fenêtres VELUX | Étanchéité | Charpente | Nettoyage / Entretien | Couverture',
    `order + accents: ${m.labels.join(' | ')}`,
  );
  note(m.transform === 'uppercase', `rendered uppercase (${m.transform})`);
  const want = width >= 1024 ? 3 : width >= 768 ? 2 : 1;
  note(m.cols === want, `${m.cols} column(s) x ${m.rows} row(s), expected ${want}`);
  note(m.opacity === '1', `card opacity ${m.opacity}`);
  note(
    m.bg === 'rgb(255, 255, 255)',
    `card background ${m.bg} (must be solid white)`,
  );
  note(m.radius >= 14 && m.radius <= 18, `radius ${m.radius}px in 14-18`);
  note(m.clearsTitle && m.clearsActions && m.clearsProof, 'hero title, CTA and proof list are clear');
  note(m.gapToShowcase === null || m.gapToShowcase > 24, `gap to showcase ${Math.round(m.gapToShowcase)}px`);
  note(!m.nested, 'no nested interactive elements');
  note(m.docOverflow <= 0, `no horizontal overflow (${m.docOverflow}px)`);
  const band = width >= 768 ? [40, 50] : [10, 30];
  note(
    m.overPct >= band[0] && m.overPct <= band[1],
    `overlap ${Math.round(m.overPx)}px = ${m.overPct.toFixed(0)}% over the hero (target ${band.join('-')}%)`,
  );

  // Layout shift: does the block change height once the client app takes
  // over from the prerendered HTML?
  const shift = await page.evaluate(async () => {
    const b = document.querySelector('.svc-links');
    const before = b.getBoundingClientRect().height;
    const mainTop = document.querySelector('.section').getBoundingClientRect().top;
    await new Promise((r) => setTimeout(r, 700));
    return {
      dh: Math.abs(document.querySelector('.svc-links').getBoundingClientRect().height - before),
      dt: Math.abs(document.querySelector('.section').getBoundingClientRect().top - mainTop),
    };
  });
  note(shift.dh < 1 && shift.dt < 1, `no shift after hydration (${shift.dh}px / ${shift.dt}px)`);

  await page.close();
}

console.log('\noverlap by viewport:');
for (const o of overlaps) {
  console.log(`  ${String(o.width).padStart(5)}px   ${Math.round(o.px)}px   ${o.pct.toFixed(0)}%`);
}

await browser.close();
console.log(`\n${fail.length ? `${fail.length} FAILURES` : 'all checks passed'}`);
process.exit(fail.length ? 1 : 0);
