/**
 * Screenshots each route at the requested widths, for actually looking at.
 *
 * The responsive and a11y checkers measure geometry; they cannot tell you
 * whether a composition reads well. This drives the same headless Edge and
 * writes PNGs.
 *
 *     node shoot.mjs                     # key routes, desktop + mobile
 *     node shoot.mjs / 1440              # one route, one width
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';
const OUT = 'shots';

const ROUTES = process.argv[2] ? [process.argv[2]] : ['/', '/nos-prestations', '/a-propos'];
const WIDTHS = process.argv[3] ? [Number(process.argv[3])] : [1440, 390];

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars'],
});

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 });

    // Scroll the page so every reveal animation has fired and every lazy
    // image has loaded, then return to the top before shooting.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });

    const name = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
    const file = `${OUT}/${name}-${width}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ${file}`);
  }
  await page.close();
}

await browser.close();
