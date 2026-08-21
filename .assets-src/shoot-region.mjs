/** Viewport-only and element-clipped shots, for inspecting one thing closely. */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const [route, width, selector, name] = process.argv.slice(2);

await mkdir('shots', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: Number(width), height: 900, deviceScaleFactor: 1 });
// Git Bash on Windows rewrites a bare '/' argument into a filesystem path,
// so routes are passed without the leading slash and normalised here.
const path = route === 'home' ? '/' : '/' + route.replace(/^\/+/, '');
await page.goto('http://localhost:4000' + path, { waitUntil: 'networkidle2', timeout: 60000 });
await page.evaluate(async () => {
  const step = window.innerHeight;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 100));
  }
  window.scrollTo(0, 0);
  // Reveal transitions run 700ms; capturing sooner catches them mid-fade
  // and the section looks half-rendered.
  await new Promise((r) => setTimeout(r, 1400));
});

const file = `shots/${name}.png`;
if (selector && selector !== '-') {
  const el = await page.$(selector);
  if (!el) throw new Error(`no element for ${selector}`);
  // Centre the target and let its reveal transition finish. Scrolling the
  // whole page in one pass is not enough: a section can slip through without
  // ever clearing the observer's 15% threshold, and the capture then shows it
  // at opacity 0 — which looks exactly like a rendering bug but is not one.
  await page.evaluate((sel) => {
    document.querySelector(sel)?.scrollIntoView({ block: 'center' });
  }, selector);
  await new Promise((r) => setTimeout(r, 1600));
  await el.screenshot({ path: file });
} else {
  await page.screenshot({ path: file }); // viewport only
}
console.log(`  ${file}`);
await browser.close();
