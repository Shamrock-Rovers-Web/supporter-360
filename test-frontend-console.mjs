import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const frontendUrl = 'https://d2aoqa35scit03.cloudfront.net';

// Collect console messages
const consoleMessages = [];
page.on('console', msg => {
  consoleMessages.push({
    type: msg.type(),
    text: msg.text(),
    location: msg.location()
  });
});

// Collect errors
page.on('pageerror', error => {
  console.error('Page Error:', error.message);
  console.error('Stack:', error.stack);
});

console.log('Opening frontend:', frontendUrl);
await page.goto(frontendUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// Get page HTML
const bodyText = await page.evaluate(() => document.body.innerHTML);
console.log('--- Page HTML (first 2000 chars) ---');
console.log(bodyText.substring(0, 2000));

console.log('\n--- Console Messages ---');
consoleMessages.forEach(msg => {
  console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
});

// Get computed styles of root
const rootStyles = await page.evaluate(() => {
  const root = document.getElementById('root');
  if (!root) return 'No root element';
  return {
    display: window.getComputedStyle(root).display,
    height: window.getComputedStyle(root).height,
    children: root.innerHTML.length
  };
});
console.log('\n--- Root Element ---');
console.log(rootStyles);

await browser.close();
