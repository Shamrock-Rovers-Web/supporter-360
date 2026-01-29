import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const frontendUrl = 'https://d2aoqa35scit03.cloudfront.net';

console.log('Opening frontend:', frontendUrl);
await page.goto(frontendUrl, { waitUntil: 'networkidle' });

// Wait for page to load
await page.waitForTimeout(2000);

// Take a screenshot
await page.screenshot({ path: '/tmp/frontend-test.png', fullPage: true });
console.log('Screenshot saved to /tmp/frontend-test.png');

// Check for any console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.error('Browser console error:', msg.text());
  }
});

// Try to search for something
console.log('Testing search functionality...');
try {
  const searchInput = await page.locator('input[type="search"]').waitFor({ timeout: 5000 });
  await searchInput.fill('test');
  await page.waitForTimeout(1000);

  const resultsText = await page.locator('text=No results found').textContent({ timeout: 5000 });
  console.log('Search results:', resultsText);
} catch (e) {
  console.log('Search test:', e.message);
}

// Get page title
const title = await page.title();
console.log('Page title:', title);

// Check if API calls are working
const apiRequests = [];
page.on('request', request => {
  if (request.url().includes('execute-api')) {
    apiRequests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    });
  }
});

await browser.close();

console.log('API Requests made:', apiRequests.length);
if (apiRequests.length > 0) {
  console.log('First API request:', apiRequests[0]);
} else {
  console.log('No API requests detected - check if frontend is configured correctly');
}
