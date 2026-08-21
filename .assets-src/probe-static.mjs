import puppeteer from 'puppeteer-core';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const count = () => ({
  services: document.querySelectorAll('.svc').length,
  reviews: document.querySelectorAll('[data-card]').length,
  faqs: document.querySelectorAll('.faq__question').length,
  tiles: document.querySelectorAll('.tile').length,
});

const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });

// Served HTML, JS never enabled on this page.
const noJs = await b.newPage();
await noJs.setJavaScriptEnabled(false);
await noJs.goto('http://localhost:4500/', { waitUntil: 'domcontentloaded' });
const before = await noJs.evaluate(count);
await noJs.close();

// A separate page, JS on throughout.
const withJs = await b.newPage();
const errs = [];
withJs.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 130)));
withJs.on('requestfailed', (r) => errs.push('FAILED ' + r.url().slice(0, 80)));
await withJs.goto('http://localhost:4500/', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
const after = await withJs.evaluate(count);

console.log('  served HTML     :', JSON.stringify(before));
console.log('  after hydration :', JSON.stringify(after));
console.log('  survived        :', JSON.stringify(before) === JSON.stringify(after) ? 'YES' : 'NO');
console.log('  errors          :', errs.length ? [...new Set(errs)].slice(0, 5) : 'none');
await b.close();
