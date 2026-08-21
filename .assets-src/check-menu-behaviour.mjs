// Behavioural half of the menu/card verification: pointer travel, keyboard,
// layout shift, link targets and hydration errors. Geometry lives in
// check-cards.mjs.
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--hide-scrollbars'],
});
const fail = [];
const note = (ok, msg) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
  if (!ok) fail.push(msg);
};

const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });

console.log('=== pointer travel (1440px) ===');
const trigger = await page.$eval('.site-header__menu-toggle', (b) => {
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, bottom: r.bottom };
});
await page.mouse.move(trigger.x, trigger.y);
await new Promise((r) => setTimeout(r, 350));
note(
  await page.$eval('#services-menu', (m) => m.classList.contains('is-open')),
  'menu opens on hover',
);

// Walk the pointer down through the gap between the trigger and the panel,
// which is where a naive mouseleave-closes implementation drops the menu.
const panel = await page.$eval('#services-menu', (m) => {
  const r = m.getBoundingClientRect();
  return { top: r.top, x: r.left + r.width / 2, y: r.top + 40 };
});
let stayedOpen = true;
for (let y = trigger.bottom + 1; y <= panel.y; y += 4) {
  await page.mouse.move(trigger.x, y);
  await new Promise((r) => setTimeout(r, 30));
  if (!(await page.$eval('#services-menu', (m) => m.classList.contains('is-open')))) {
    stayedOpen = false;
    break;
  }
}
await page.mouse.move(panel.x, panel.y);
await new Promise((r) => setTimeout(r, 120));
note(stayedOpen, 'menu stays open moving the pointer from trigger into the panel');
note(
  await page.$eval('#services-menu', (m) => m.classList.contains('is-open')),
  'menu still open with the pointer inside it',
);

// Leaving closes it again.
await page.mouse.move(20, 700);
await new Promise((r) => setTimeout(r, 500));
note(
  await page.$eval('#services-menu', (m) => !m.classList.contains('is-open')),
  'menu closes when the pointer leaves',
);

console.log('\n=== keyboard ===');
await page.evaluate(() => document.querySelector('.site-header__menu-toggle').focus());
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 250));
note(
  await page.$eval('#services-menu', (m) => m.classList.contains('is-open')),
  'menu opens with Enter on the trigger',
);

// Tab forward and confirm focus reaches the sub-services and then escapes
// the panel rather than cycling inside it.
const seen = [];
for (let i = 0; i < 26; i++) {
  await page.keyboard.press('Tab');
  seen.push(
    await page.evaluate(() => {
      const a = document.activeElement;
      return {
        cls: a.className || a.tagName,
        inPanel: !!a.closest('#services-menu'),
        text: (a.textContent || '').trim().slice(0, 34),
      };
    }),
  );
}
note(
  seen.some((s) => s.inPanel && s.cls.includes('mega__cat')),
  'a category link takes focus',
);
note(
  seen.some((s) => s.inPanel && s.cls.includes('mega__subs') === false && s.text.length > 0 && s.inPanel),
  'panel contents take focus',
);
note(!seen.every((s) => s.inPanel), 'focus is not trapped inside the panel');

await page.evaluate(() => document.querySelector('.site-header__menu-toggle').focus());
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 200));
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 200));
note(
  await page.$eval('#services-menu', (m) => !m.classList.contains('is-open')),
  'Escape closes and returns',
);

// Outside click.
await page.evaluate(() => document.querySelector('.site-header__menu-toggle').click());
await new Promise((r) => setTimeout(r, 250));
const below = await page.$eval('#services-menu', (m) => m.getBoundingClientRect().bottom);
await page.mouse.click(700, Math.min(below + 40, 890));
await new Promise((r) => setTimeout(r, 250));
note(
  await page.$eval('#services-menu', (m) => !m.classList.contains('is-open')),
  'outside click closes',
);

console.log('\n=== layout shift ===');
const shift = await page.evaluate(async () => {
  const before = document.querySelector('main').getBoundingClientRect().top;
  const h = document.documentElement.scrollHeight;
  document.querySelector('.site-header__menu-toggle').click();
  await new Promise((r) => setTimeout(r, 300));
  const after = document.querySelector('main').getBoundingClientRect().top;
  return { delta: Math.abs(after - before), heightDelta: Math.abs(document.documentElement.scrollHeight - h) };
});
note(shift.delta < 1, `opening the menu does not move the page (${shift.delta}px)`);

console.log('\n=== links ===');
const hrefs = await page.evaluate(() => [
  ...new Set([
    ...[...document.querySelectorAll('#services-menu a')].map((a) => a.getAttribute('href')),
    ...[...document.querySelectorAll('.svc a')].map((a) => a.getAttribute('href')),
  ]),
]);
for (const h of hrefs) {
  const res = await fetch(`${BASE}${h}`);
  note(res.status === 200, `${h} -> ${res.status}`);
}

console.log('\n=== hydration ===');
const real = consoleErrors.filter((e) => !/favicon|ERR_/.test(e));
note(real.length === 0, `console clean (${real.length} errors)${real.length ? `: ${real[0]}` : ''}`);

await browser.close();
console.log(`\n${fail.length ? `${fail.length} FAILURES` : 'all checks passed'}`);
process.exit(fail.length ? 1 : 0);
