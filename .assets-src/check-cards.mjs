// Measures the two corrections in a real browser: the header services menu
// and the homepage service cards. Geometry and computed style only — the
// point is to prove the layering and the contrast rather than eyeball them.
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';
const WIDTHS = [360, 390, 768, 1024, 1280, 1440];

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) =>
  0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--force-color-profile=srgb', '--hide-scrollbars'],
});

const fail = [];
const note = (ok, msg) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
  if (!ok) fail.push(msg);
};

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  console.log(`\n=== ${width}px ===`);

  // --- header menu ------------------------------------------------------
  const desktop = width > 1080;
  // Below the breakpoint the services trigger lives inside the closed
  // drawer, so it has to be opened first. Clicked through the DOM rather
  // than by hit-test, which fails on an element mid-transition.
  await page.evaluate((isDesktop) => {
    if (!isDesktop) document.querySelector('.site-header__toggle').click();
  }, desktop);
  await new Promise((r) => setTimeout(r, 350));
  await page.evaluate(() => document.querySelector('.site-header__menu-toggle').click());
  await new Promise((r) => setTimeout(r, 400));

  const menu = await page.evaluate(() => {
    const panel = document.querySelector('#services-menu');
    const r = panel.getBoundingClientRect();
    const cats = [...panel.querySelectorAll('.mega__cat')];
    const cs = getComputedStyle(panel.querySelector('.mega__inner'));
    return {
      cats: cats.length,
      cols: cs.gridTemplateColumns.split(' ').length,
      right: r.right,
      bottom: r.bottom,
      catFont: parseFloat(getComputedStyle(cats[0]).fontSize),
      catWeight: getComputedStyle(cats[0]).fontWeight,
      subFont: (() => {
        const s = panel.querySelector('.mega__subs a');
        return s ? parseFloat(getComputedStyle(s).fontSize) : null;
      })(),
      // Photographic cards must not exist in the header.
      photoCards: panel.querySelectorAll('.svc, .svc__media, .svc__overlay').length,
      toggles: [...panel.querySelectorAll('.mega__toggle')].map((b) => ({
        h: Math.round(b.getBoundingClientRect().height),
        w: Math.round(b.getBoundingClientRect().width),
        expanded: b.getAttribute('aria-expanded'),
        visible: getComputedStyle(b).display !== 'none',
      })),
      subsVisible: [...panel.querySelectorAll('.mega__subs')].filter(
        (u) => getComputedStyle(u).display !== 'none',
      ).length,
    };
  });
  note(menu.cats === 6, `menu: 6 categories (got ${menu.cats})`);
  note(menu.photoCards === 0, `menu: no image cards (got ${menu.photoCards})`);
  note(menu.right <= width + 1, `menu: fits viewport (right ${Math.round(menu.right)})`);
  note(
    menu.catFont > (menu.subFont ?? 0),
    `menu: category ${menu.catFont}px > sub ${menu.subFont}px`,
  );
  if (desktop) {
    note(menu.cols === 3, `menu: 3 columns (got ${menu.cols})`);
    note(menu.subsVisible === 3, `menu: sub-lists open on desktop (${menu.subsVisible}/3)`);
    note(
      menu.toggles.every((t) => !t.visible),
      `menu: accordion buttons hidden on desktop`,
    );
  } else {
    const t = menu.toggles.filter((x) => x.visible);
    note(t.length === 3, `menu: 3 accordion buttons (got ${t.length})`);
    note(
      t.every((x) => x.h >= 44 && x.w >= 44),
      `menu: touch targets >=44px (${t.map((x) => `${x.w}x${x.h}`).join(', ')})`,
    );
    note(
      t.every((x) => x.expanded === 'false'),
      `menu: aria-expanded starts false`,
    );
    note(menu.subsVisible === 0, `menu: sub-lists collapsed (${menu.subsVisible} open)`);

    // Open one and confirm the state follows.
    await page.evaluate(() => {
      [...document.querySelectorAll('.mega__toggle')]
        .find((x) => getComputedStyle(x).display !== 'none')
        .click();
    });
    await new Promise((r) => setTimeout(r, 250));
    const after = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.mega__toggle')].find(
        (x) => getComputedStyle(x).display !== 'none',
      );
      const u = document.querySelector(`#${CSS.escape(b.getAttribute('aria-controls'))}`);
      return { exp: b.getAttribute('aria-expanded'), shown: getComputedStyle(u).display };
    });
    note(
      after.exp === 'true' && after.shown !== 'none',
      `menu: accordion opens (aria-expanded=${after.exp}, display=${after.shown})`,
    );
  }

  await page.evaluate(() => document.querySelector('.site-header__menu-toggle').focus());
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 150));
  const closed = await page.$eval('#services-menu', (m) => !m.classList.contains('is-open'));
  note(closed, 'menu: Escape closes');

  // --- homepage cards ---------------------------------------------------
  // The cards carry loading="lazy", so at narrow widths the lower ones are
  // below the fold and genuinely have not fetched yet. Scroll the section
  // through the viewport first, then measure: the question is whether the
  // images load, not whether they load before they are needed.
  await page.evaluate(async () => {
    const el = document.querySelector('.svc-grid');
    el.scrollIntoView({ block: 'end' });
    await new Promise((r) => setTimeout(r, 300));
    // Instant, and awaited: the site sets scroll-behavior: smooth, so a
    // plain scrollTo leaves the page mid-flight and every rect measured
    // afterwards is wrong by however far it still had to travel.
    window.scrollTo({ top: 0, behavior: 'instant' });
    while (window.scrollY !== 0) await new Promise((r) => requestAnimationFrame(r));
    await Promise.all(
      [...document.querySelectorAll('.svc__media img')].map((i) =>
        i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true })),
      ),
    );
  });
  await new Promise((r) => setTimeout(r, 250));

  const cards = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.svc')) {
      const media = el.querySelector('.svc__media');
      const overlay = el.querySelector('.svc__overlay');
      const body = el.querySelector('.svc__body');
      const img = el.querySelector('.svc__media img');
      const title = el.querySelector('.svc__title');
      const r = el.getBoundingClientRect();
      const z = (n) => getComputedStyle(n).zIndex;
      const op = (n) => parseFloat(getComputedStyle(n).opacity);
      out.push({
        name: title.textContent.trim(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        right: r.right,
        radius: parseFloat(getComputedStyle(el).borderRadius),
        pad: parseFloat(getComputedStyle(body).paddingTop),
        z: [z(media), z(overlay), z(body)],
        // Only the overlay may carry a non-1 opacity.
        opacity: { card: op(el), media: op(media), body: op(body), title: op(title) },
        objectFit: getComputedStyle(img).objectFit,
        // A cover crop must not distort: compare the intrinsic ratio with
        // the ratio the pixels are actually drawn at.
        natural: img.naturalWidth / img.naturalHeight,
        loaded: img.naturalWidth > 0,
        gradient: getComputedStyle(overlay).backgroundImage,
        // Content position within the card.
        titleOffset: Math.round(title.getBoundingClientRect().top - r.top),
        subs: el.querySelectorAll('.svc__sub').length,
        cta: !!el.querySelector('.svc__cta'),
        // A nested link inside a stretched-anchor card is the failure mode
        // the brief calls out; here the card is NOT one anchor, so nested
        // links are valid — but there must be no <a> inside an <a>.
        anchorInAnchor: !!el.querySelector('a a'),
      });
    }
    return out;
  });

  note(cards.length === 6, `cards: 6 on homepage (got ${cards.length})`);
  note(
    cards.every((c) => c.z[0] === '0' && c.z[1] === '1' && c.z[2] === '2'),
    `cards: layer order 0/1/2 (${cards[0].z.join('/')})`,
  );
  note(
    cards.every(
      (c) =>
        c.opacity.card === 1 &&
        c.opacity.media === 1 &&
        c.opacity.body === 1 &&
        c.opacity.title === 1,
    ),
    'cards: opacity applied to overlay only',
  );
  note(cards.every((c) => c.loaded), 'cards: every image loaded');
  note(cards.every((c) => c.objectFit === 'cover'), 'cards: object-fit cover');
  note(
    cards.every((c) => c.radius >= 20 && c.radius <= 28),
    `cards: radius ${cards[0].radius}px in 20-28`,
  );
  note(
    cards.every((c) => c.right <= width + 1),
    'cards: no horizontal overflow',
  );
  note(cards.every((c) => c.cta), 'cards: action present on every card');
  note(!cards.some((c) => c.anchorInAnchor), 'cards: no nested anchors');
  note(
    cards.every((c) => c.titleOffset <= c.h * 0.45),
    `cards: title in the upper part (max ${Math.max(...cards.map((c) => Math.round((c.titleOffset / c.h) * 100)))}%)`,
  );
  const padOk = width <= 1024 ? [24, 30] : [28, 36];
  note(
    cards.every((c) => c.pad >= padOk[0] && c.pad <= padOk[1]),
    `cards: padding ${cards[0].pad}px in ${padOk.join('-')}`,
  );

  // Columns actually laid out, from the distinct x positions of row 1.
  const cols = await page.evaluate(() => {
    const xs = [...document.querySelectorAll('.svc')].map((e) =>
      Math.round(e.getBoundingClientRect().left),
    );
    const top0 = Math.round(
      document.querySelector('.svc').getBoundingClientRect().top,
    );
    return [
      ...new Set(
        [...document.querySelectorAll('.svc')]
          .filter((e) => Math.abs(e.getBoundingClientRect().top - top0) < 4)
          .map((e) => Math.round(e.getBoundingClientRect().left)),
      ),
    ].length;
  });
  const wantCols = width <= 640 ? 1 : width <= 1024 ? 2 : 3;
  note(cols === wantCols, `cards: ${cols} column(s), expected ${wantCols}`);

  // --- contrast of the title over the composited overlay ----------------
  //
  // Measured from the painted frame rather than reconstructed from the
  // gradient stops: photograph, overlay and glyph are already composited
  // there, which is what a reader sees. Sampled inside the card padding at
  // the same height as the title, so no glyph pixels enter the average.
  const box = await page.evaluate(() => {
    const c = document.querySelector('.svc');
    const t = c.querySelector('.svc__title');
    const cr = c.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    return {
      color: getComputedStyle(t).color,
      // Left padding strip, vertically aligned with the title. Converted to
      // document coordinates: getBoundingClientRect is viewport-relative and
      // page.screenshot({clip}) is not, so any residual scroll offset would
      // slide the sample off the card -- which is exactly what happened when
      // the page grew and the scroll no longer settled at zero.
      x: Math.round(cr.left + window.scrollX + 4),
      y: Math.round(tr.top + window.scrollY + 2),
      w: Math.max(4, Math.round(tr.left - cr.left - 8)),
      h: Math.max(4, Math.round(tr.height - 4)),
      // Where the title sits along the card, to report the gradient band.
      alongX: (tr.left + tr.width / 2 - cr.left) / cr.width,
      alongY: (tr.top + tr.height / 2 - cr.top) / cr.height,
    };
  });
  const png = await page.screenshot({ type: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  const bgPx = [r / n, g / n, b / n];
  const fg = box.color.match(/\d+/g).slice(0, 3).map(Number);
  const cr = ratio(fg, bgPx);
  note(
    cr >= 4.5,
    `cards: title contrast ${cr.toFixed(2)}:1 on painted pixels ` +
      `(bg rgb ${bgPx.map((v) => Math.round(v)).join(',')})`,
  );

  // Overlay strength where the title sits, from the declared stops and the
  // correct CSS gradient projection: direction (sin A, -cos A), origin at
  // the box centre, line length |W sinA| + |H cosA|.
  const band = await page.evaluate(({ alongX, alongY }) => {
    const el = document.querySelector('.svc__overlay');
    const g = getComputedStyle(el).backgroundImage;
    const A = (parseFloat(g.match(/([\d.]+)deg/)[1]) * Math.PI) / 180;
    // Chrome drops the 0% and 100% positions when it serialises a gradient,
    // so the position is optional here and the ends are filled back in.
    // Matching only positioned stops silently lost both anchors and made the
    // interpolation extrapolate past the declared maximum alpha.
    const stops = [...g.matchAll(/rgba\(([^)]+)\)(?:\s+([\d.]+)%)?/g)].map((m) => ({
      a: Number(m[1].split(',')[3]),
      p: m[2] === undefined ? null : parseFloat(m[2]),
    }));
    if (stops[0].p === null) stops[0].p = 0;
    if (stops[stops.length - 1].p === null) stops[stops.length - 1].p = 100;
    const rect = el.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const dx = Math.sin(A), dy = -Math.cos(A);
    const L = Math.abs(W * dx) + Math.abs(H * dy);
    const px = (alongX - 0.5) * W, py = (alongY - 0.5) * H;
    const pct = ((px * dx + py * dy) / L + 0.5) * 100;
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (pct >= stops[i].p && pct <= stops[i + 1].p) { lo = stops[i]; hi = stops[i + 1]; }
    }
    const f = hi.p === lo.p ? 0 : (pct - lo.p) / (hi.p - lo.p);
    return { pct, alpha: lo.a + (hi.a - lo.a) * f };
  }, box);
  note(
    band.alpha >= 0.72 && band.alpha <= 0.84,
    `cards: overlay alpha behind title ${band.alpha.toFixed(2)} at ` +
      `${band.pct.toFixed(0)}% along the gradient (0.72-0.84)`,
  );

  await page.close();
}

await browser.close();
console.log(`\n${fail.length ? `${fail.length} FAILURES` : 'all checks passed'}`);
process.exit(fail.length ? 1 : 0);
