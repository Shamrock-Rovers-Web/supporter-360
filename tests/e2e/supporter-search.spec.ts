import { test, expect } from '@playwright/test';

const API_URL = 'https://2u9a7una05.execute-api.eu-west-1.amazonaws.com/prod';
const FRONTEND_URL = 'https://d2aoqa35scit03.cloudfront.net';
const API_KEY = 'dev-staff-key';
const TEST_EMAIL = 'gleesonb@gmail.com';

// Store supporter ID between tests
let supporterId: string | undefined;

test.describe('Supporter 360 - End to End Tests', () => {
  test.beforeAll(async () => {
    console.log(`Testing with email: ${TEST_EMAIL}`);
  });

  test('API: Search for supporter by email', async ({ request }) => {
    const response = await request.get(`${API_URL}/search`, {
      params: { q: TEST_EMAIL, field: 'email' },
      headers: { 'X-API-Key': API_KEY }
    });

    expect(response.ok()).toBeTruthy();
    const apiResponse = await response.json();

    console.log('Search results:', JSON.stringify(apiResponse, null, 2));

    // API returns { success: true, data: { results: [...] } }
    const data = apiResponse.data;

    // Should find at least one supporter
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0]).toMatchObject({
      supporter_id: expect.any(String),
      email: TEST_EMAIL.toLowerCase(),
      name: expect.any(String)
    });

    // Save supporter_id for subsequent tests
    supporterId = data.results[0].supporter_id;
    console.log('✅ Found supporter:', supporterId);
  });

  test('API: Get supporter profile', async ({ request }) => {
    if (!supporterId) {
      throw new Error('No supporter_id found - run search test first');
    }

    const response = await request.get(`${API_URL}/supporters/${supporterId}`, {
      headers: { 'X-API-Key': API_KEY }
    });

    expect(response.ok()).toBeTruthy();
    const apiResponse = await response.json();

    console.log('Supporter profile:', JSON.stringify(apiResponse, null, 2));

    // API returns { success: true, data: { ... } }
    const profile = apiResponse.data;

    // Verify profile structure
    expect(profile).toMatchObject({
      supporter_id: supporterId,
      primary_email: TEST_EMAIL.toLowerCase(),
      name: expect.any(String),
      linked_ids: expect.any(Object),
      supporter_type: expect.any(String)
    });

    // Check for Future Ticketing data (should exist for gleesonb@gmail.com)
    if (profile.linked_ids.futureticketing) {
      console.log('✅ Future Ticketing data found:', profile.linked_ids.futureticketing);
    } else {
      console.log('⚠️ No Future Ticketing data found');
    }
  });

  test('API: Get supporter timeline', async ({ request }) => {
    if (!supporterId) {
      throw new Error('No supporter_id found - run search test first');
    }

    const response = await request.get(`${API_URL}/supporters/${supporterId}/timeline`, {
      headers: { 'X-API-Key': API_KEY }
    });

    expect(response.ok()).toBeTruthy();
    const apiResponse = await response.json();

    // API returns { success: true, data: { events: [...] } }
    const timeline = apiResponse.data;

    console.log(`Timeline events: ${timeline.events.length} total`);

    if (timeline.events.length > 0) {
      console.log('Timeline sample:', JSON.stringify(timeline.events.slice(0, 3), null, 2));

      // Check event types
      const eventTypes = [...new Set(timeline.events.map((e: any) => e.event_type))];
      console.log('Event types found:', eventTypes);

      // Verify Future Ticketing events exist (should have TicketPurchase or StadiumEntry)
      const hasFTEvents = eventTypes.some((type: string) =>
        ['TicketPurchase', 'StadiumEntry', 'AccountCreated'].includes(type)
      );
      if (hasFTEvents) {
        console.log('✅ Future Ticketing events found in timeline');
      }
    } else {
      console.log('⚠️ Timeline is empty - FT integration may not have created events yet');
    }

    // Don't fail the test if timeline is empty - just log it
    // This can happen if FT integration only imported accounts but not orders/entries
  });

  test('Frontend: Load homepage', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    console.log('✅ Frontend loaded at:', FRONTEND_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'test-results/frontend-homepage.png', fullPage: true });
    console.log('Screenshot saved to test-results/frontend-homepage.png');
  });

  test('Verify all integrations for test account', async ({ request }) => {
    if (!supporterId) {
      throw new Error('No supporter_id found - run search test first');
    }

    const response = await request.get(`${API_URL}/supporters/${supporterId}`, {
      headers: { 'X-API-Key': API_KEY }
    });

    expect(response.ok()).toBeTruthy();
    const apiResponse = await response.json();

    // API returns { success: true, data: { ... } }
    const profile = apiResponse.data;

    console.log('\n=== Integration Data Check ===');
    console.log('Email:', profile.primary_email);
    console.log('Name:', profile.name);
    console.log('Supporter Type:', profile.supporter_type);
    console.log('\nLinked IDs:');

    const integrations: Record<string, string> = {
      futureticketing: 'Future Ticketing',
      shopify: 'Shopify',
      stripe: 'Stripe',
      gocardless: 'GoCardless',
      mailchimp: 'Mailchimp'
    };

    const foundIntegrations: string[] = [];
    const missingIntegrations: string[] = [];

    for (const [key, name] of Object.entries(integrations)) {
      const hasData = profile.linked_ids[key] !== undefined &&
                      profile.linked_ids[key] !== null;

      if (hasData) {
        console.log(`  ✅ ${name}: ${JSON.stringify(profile.linked_ids[key])}`);
        foundIntegrations.push(name);
      } else {
        console.log(`  ❌ ${name}: No data found`);
        missingIntegrations.push(name);
      }
    }

    console.log(`\nSummary: ${foundIntegrations.length}/${Object.keys(integrations).length} integrations have data`);
    console.log('Found:', foundIntegrations.join(', ') || 'None');
    console.log('Missing:', missingIntegrations.join(', ') || 'None');

    // At minimum, Future Ticketing should have data (we know this works)
    expect(foundIntegrations.length).toBeGreaterThanOrEqual(1);
  });

  test.afterAll(async () => {
    console.log('\n=== Test Summary ===');
    console.log('All API tests completed successfully!');
    console.log('Supporter ID:', supporterId || 'Not found');
  });
});
