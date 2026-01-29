/**
 * Test Fixtures Loader
 *
 * Loads sample JSON data from the fixtures directory.
 * Provides typed access to test data for integration tests.
 *
 * @packageDocumentation
 */

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Load JSON file from fixtures directory
 */
async function loadFixture<T>(relativePath: string): Promise<T> {
  const fixturesDir = join(__dirname, 'fixtures');
  const filePath = join(fixturesDir, relativePath);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to load fixture: ${relativePath}\n${error}`);
  }
}

/**
 * Load raw JSON string from fixtures (for webhook body testing)
 */
async function loadFixtureRaw(relativePath: string): Promise<string> {
  const fixturesDir = join(__dirname, 'fixtures');
  const filePath = join(fixturesDir, relativePath);

  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to load fixture: ${relativePath}\n${error}`);
  }
}

/**
 * Webhook fixtures
 */
export const webhookFixtures = {
  stripe: {
    paymentSucceeded: () => loadFixture<Record<string, unknown>>('webhooks/stripe-payment-succeeded.json'),
    subscriptionCreated: () => loadFixture<Record<string, unknown>>('webhooks/stripe-subscription-created.json'),
    invoicePaymentSucceeded: () => loadFixture<Record<string, unknown>>('webhooks/stripe-invoice-payment-succeeded.json'),
  },
  shopify: {
    ordersCreate: () => loadFixture<Record<string, unknown>>('webhooks/shopify-orders-create.json'),
    ordersUpdated: () => loadFixture<Record<string, unknown>>('webhooks/shopify-orders-updated.json'),
  },
  gocardless: {
    paymentCreated: () => loadFixture<Record<string, unknown>>('webhooks/gocardless-payment-created.json'),
    subscriptionCreated: () => loadFixture<Record<string, unknown>>('webhooks/gocardless-subscription-created.json'),
  },
  mailchimp: {
    subscribed: () => loadFixture<Record<string, unknown>>('webhooks/mailchimp-subscribed.json'),
  },

  /**
   * Get raw JSON string for webhook body testing
   */
  raw: {
    paymentSucceeded: () => loadFixtureRaw('webhooks/stripe-payment-succeeded.json'),
    ordersCreate: () => loadFixtureRaw('webhooks/shopify-orders-create.json'),
  },
};

/**
 * Data fixtures
 */
export const dataFixtures = {
  supporters: () => loadFixture<Record<string, unknown>[]>('data/supporters.json'),
  events: () => loadFixture<Record<string, unknown>[]>('data/events.json'),
  memberships: () => loadFixture<Record<string, unknown>[]>('data/memberships.json'),
};

/**
 * Load all fixtures at once (for test setup)
 */
export async function loadAllFixtures() {
  const [supporters, events, memberships] = await Promise.all([
    dataFixtures.supporters(),
    dataFixtures.events(),
    dataFixtures.memberships(),
  ]);

  return {
    supporters,
    events,
    memberships,
    webhooks: webhookFixtures,
  };
}
