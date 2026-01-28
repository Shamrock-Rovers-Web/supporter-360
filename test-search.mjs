import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const frontendUrl = 'https://d2aoqa35scit03.cloudfront.net';

// Track API requests
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

// Track console messages
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.error('Console error:', msg.text());
  }
});

console.log('Opening frontend...');
await page.goto(frontendUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Check if we're on the search page
const title = await page.title();
console.log('Page title:', title);

// Find and fill the search input
const searchInput = page.locator('input[placeholder*="Search"]').first();
if (await searchInput.count() > 0) {
  console.log('Found search input!');

  // Fill in search query
  await searchInput.fill('test');
  console.log('Entered search query: "test"');

  // Wait for API call
  await page.waitForTimeout(1000);

  // Check for results
  const noResults = await page.locator('text=No results found').count();
  const resultsCount = await page.locator('tr:has-text("Unknown Name")').count();

  console.log('No results element found:', noResults > 0);
  console.log('Results rows found:', resultsCount);

  // Screenshot after search
  await page.screenshot({ path: '/tmp/search-test.png' });
  console.log('Screenshot saved to /tmp/search-test.png');
} else {
  console.log('Search input not found!');
}

console.log('\nAPI Requests made:', apiRequests.length);
if (apiRequests.length > 0) {
  console.log('API Request:', JSON.stringify(apiRequests[0], null, 2));
}

await browser.close();
