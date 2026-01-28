/**
 * Test Data Seeding Utilities
 *
 * Helpers for creating realistic test data for supporters, events,
 * memberships, and other entities. All generated IDs are deterministic
 * for consistent testing.
 *
 * @packageDocumentation
 */

import type { Supporter, Event, EmailAlias, Membership, MembershipCadence, MembershipStatus, SupporterType, SourceSystem, EventType } from '@supporter360/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a deterministic UUID based on a seed string
 * This allows us to have predictable IDs for testing
 */
function seedUuid(seed: string): string {
  // Simple hash-based seed for consistent IDs across test runs
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  // Format as UUID-like string
  const segment = (n: number) => {
    const hex = Math.abs(n).toString(16).padStart(8, '0');
    return hex.substring(0, 8) + '-' +
           hex.substring(8, 12) + '-' +
           hex.substring(12, 16) + '-' +
           hex.substring(16, 20);
  };

  return `${segment(hash & 0xffffffff)}-${segment(hash >>> 32)}`;
}

/**
 * Helper to create dates relative to now
 */
export function dateFromNow(daysAgo: number, hoursOffset = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() + hoursOffset);
  return date;
}

/**
 * Supporter Factory - Create test supporter data
 */
export interface SupporterOptions {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  supporter_type?: SupporterType;
  supporter_type_source?: 'auto' | 'admin_override';
  linked_ids?: {
    shopify?: string;
    stripe?: string;
    gocardless?: string;
    futureticketing?: string;
    mailchimp?: string;
  };
  flags?: {
    shared_email?: boolean;
    test_data?: boolean;
  };
}

export function createSupporter(seed: string, options: SupporterOptions = {}): Supporter {
  const id = seedUuid(seed);

  return {
    supporter_id: id,
    name: options.name || `Test User ${seed}`,
    primary_email: options.email || `test${seed.toLowerCase()}@example.com`,
    phone: options.phone || `+35387123${seed.padStart(4, '0')}`,
    supporter_type: options.supporter_type || 'Unknown',
    supporter_type_source: options.supporter_type_source || 'auto',
    linked_ids: {
      shopify: options.linked_ids?.shopify || null,
      stripe: options.linked_ids?.stripe || null,
      gocardless: options.linked_ids?.gocardless || null,
      futureticketing: options.linked_ids?.futureticketing || null,
      mailchimp: options.linked_ids?.mailchimp || null,
    },
    flags: {
      shared_email: options.flags?.shared_email || false,
      test_data: options.flags?.test_data || true,
    },
    created_at: dateFromNow(30),
    updated_at: dateFromNow(1),
  };
}

/**
 * Event Factory - Create test event data
 */
export interface EventOptions {
  source_system?: SourceSystem;
  external_id?: string;
  event_type?: EventType;
  event_time?: Date;
  amount?: number | null;
  metadata?: Record<string, unknown>;
  supporter_id?: string;
}

export function createEvent(seed: string, options: EventOptions = {}): Event {
  const id = seedUuid(`event-${seed}`);

  return {
    event_id: id,
    supporter_id: options.supporter_id || seedUuid(`supporter-${seed}`),
    source_system: options.source_system || 'stripe',
    external_id: options.external_id || `evt_${seed}`,
    event_type: options.event_type || 'PaymentEvent',
    event_time: options.event_time || dateFromNow(15),
    amount: options.amount ?? null,
    metadata: options.metadata || {},
  };
}

/**
 * Email Alias Factory - Create test email alias data
 */
export interface EmailAliasOptions {
  supporter_id?: string;
  email?: string;
  is_primary?: boolean;
}

export function createEmailAlias(seed: string, options: EmailAliasOptions = {}): EmailAlias {
  const id = seedUuid(`alias-${seed}`);

  return {
    email_alias_id: id,
    supporter_id: options.supporter_id || seedUuid(`supporter-${seed}`),
    email: options.email || `alias${seed.toLowerCase()}@example.com`,
    is_primary: options.is_primary ?? false,
    created_at: dateFromNow(30),
  };
}

/**
 * Membership Factory - Create test membership data
 */
export interface MembershipOptions {
  supporter_id?: string;
  status?: MembershipStatus;
  cadence?: MembershipCadence;
  tier?: string | null;
  amount?: number;
  start_date?: Date;
  end_date?: Date | null;
}

export function createMembership(seed: string, options: MembershipOptions = {}): Membership {
  const id = seedUuid(`membership-${seed}`);

  const status = options.status || 'Active';
  const cadence = options.cadence || 'monthly';
  const startDate = options.start_date || dateFromNow(365);

  // Calculate end date based on cadence (simplified)
  let endDate = options.end_date || null;
  if (cadence === 'monthly' && !options.end_date) {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return {
    membership_id: id,
    supporter_id: options.supporter_id || seedUuid(`supporter-${seed}`),
    status,
    cadence,
    tier: options.tier || 'Standard',
    amount: options.amount ?? 15,
    start_date: startDate,
    end_date: endDate,
    created_at: dateFromNow(30),
    updated_at: dateFromNow(1),
  };
}

/**
 * Batch Data Generators for realistic test scenarios
 */

/**
 * Generate a complete test supporter with full history
 * Useful for integration tests
 */
export function createCompleteSupporter(seed: string): {
  supporter: Supporter;
  events: Event[];
  memberships: Membership[];
  emailAliases: EmailAlias[];
} {
  const supporter = createSupporter(seed, {
    name: 'Complete Test User',
    email: `complete${seed}@example.com`,
    phone: '+353871234567',
    supporter_type: 'Member',
    linked_ids: {
      stripe: `cus_${seed}`,
      shopify: `gid_shopify_${seed}`,
      futureticketing: `ft_cust_${seed}`,
    },
  });

  // Create events
  const events: Event[] = [
    createEvent(`${seed}-evt-1`, {
      supporter_id: supporter.supporter_id,
      source_system: 'stripe',
      external_id: `pi_${seed}_1`,
      event_type: 'PaymentEvent',
      event_time: dateFromNow(365),
      amount: 15,
      metadata: { description: 'Monthly membership' },
    }),
    createEvent(`${seed}-evt-2`, {
      supporter_id: supporter.supporter_id,
      source_system: 'shopify',
      external_id: `order_${seed}`,
      event_type: 'ShopOrder',
      event_time: dateFromNow(180),
      metadata: { order_name: 'Shamrock Rovers Jersey', amount: '75.00' },
    }),
  ];

  // Create membership
  const membership = createMembership(seed, {
    supporter_id: supporter.supporter_id,
    status: 'Active',
    cadence: 'monthly',
    tier: 'Standard',
    amount: 15,
  });

  // Create email alias
  const emailAlias = createEmailAlias(`${seed}-alias`, {
    supporter_id: supporter.supporter_id,
    email: `alias_${seed}@example.com`,
    is_primary: false,
  });

  return { supporter, events: [membership], emailAliases: [emailAlias] };
}

/**
 * Seed multiple supporters with realistic data distributions
 */
export function seedSupporters(count: number): Supporter[] {
  const supporters: Supporter[] = [];

  const types: SupporterType[] = [
    'Member',
    'Season Ticket Holder',
    'Ticket Buyer',
    'Shop Buyer',
    'Away Supporter',
    'Staff/VIP',
  ];

  for (let i = 0; i < count; i++) {
    const seed = `seed-${i.toString().padStart(3, '0')}`;
    const type = types[i % types.length];

    supporters.push(createSupporter(seed, {
      name: `Supporter ${i + 1}`,
      email: `supporter${i + 1}@example.com`,
      supporter_type: type,
      linked_ids: i % 3 === 0 ? {
        stripe: `cus_${seed}`,
      } : undefined,
    }));
  }

  return supporters;
}

/**
 * Generate test webhooks for external system testing
 */
export function createStripeWebhook(options: {
  type: 'payment_intent.succeeded' | 'invoice.payment_succeeded' | 'customer.subscription.created';
  amount?: number;
  currency?: string;
  customer_id?: string;
  subscription_id?: string;
}) {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2020-08-27',
    created: Math.floor(Date.now() / 1000),
    type: options.type,
    data: {
      object: {
        id: options.subscription_id || 'sub_test',
        customer: options.customer_id || 'cus_test',
        amount: options.amount || 1500,
        currency: options.currency || 'eur',
        status: 'succeeded',
      },
    },
  };
}

export function createShopifyWebhook(options: {
  topic: 'orders/create' | 'orders/updated' | 'app/uninstalled';
  order_id?: string;
  customer_email?: string;
}) {
  const orderDate = new Date().toISOString();

  return {
    id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
    topic: options.topic,
    shop_domain: 'test-shop.myshopify.com',
    payload: {
      id: options.order_id || `order_${Date.now()}`,
      email: options.customer_email || 'customer@example.com',
      created_at: orderDate,
      updated_at: orderDate,
      line_items: [],
    },
  };
}

export function createGoCardlessWebhook(options: {
  action?: 'created' | 'customer_approval_denied' | 'submitted';
  resource_type?: 'payments' | 'subscriptions' | 'mandates';
  amount?: number;
}) {
  return {
    id: `EV${Date.now()}${Math.random().toString(36).substring(7)}`,
    created_at: new Date().toISOString(),
    action: options.action || 'created',
    resource_type: options.resource_type || 'payments',
    links: {
      payment: `PM_${Date.now()}`,
    },
    details: {
      amount: options.amount || 1500,
      currency: 'EUR',
    },
  };
}
