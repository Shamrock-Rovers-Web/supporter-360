/**
 * Integration Clients Index
 *
 * Exports all external integration clients for the Supporter 360 backend.
 *
 * Each integration client provides:
 * - Methods to fetch data from the external system
 * - Webhook signature verification
 * - Type definitions for the external system's data
 *
 * Usage:
 *   import { createShopifyClient } from '@/integrations';
 *   const shopify = createShopifyClient();
 *   const customer = await shopify.getCustomer(12345);
 */

// Shopify Integration
export {
  ShopifyClient,
  createShopifyClient,
  ShopifyApiError,
} from './shopify/client.js';
export type {
  ShopifyCustomer,
  ShopifyOrder,
  ShopifyLineItem,
  ShopifyAddress,
  ShopifyWebhookEventType,
} from './shopify/types.js';

// Stripe Integration
export {
  StripeClient,
  createStripeClient,
  createStripeWebhookSecret,
  StripeApiError,
} from './stripe/client.js';
export type {
  StripeCustomer,
  StripePaymentIntent,
  StripeCharge,
  StripeEvent,
} from './stripe/types.js';

// GoCardless Integration
export {
  GoCardlessClient,
  createGoCardlessClient,
  createGoCardlessWebhookSecret,
  GoCardlessApiError,
} from './gocardless/client.js';
export type {
  GCCustomer,
  GCPayment,
  GCMandate,
  GCSubscription,
  GCWebhookEvent,
} from './gocardless/types.js';

// Future Ticketing Integration
export {
  FutureTicketingClient,
  createFutureTicketingClient,
  FutureTicketingApiError,
} from './future-ticketing/client.js';
export type {
  FTCustomer,
  FTOrder,
  FTStadiumEntry,
  FTProduct,
  FTConfig,
} from './future-ticketing/types.js';

// Mailchimp Integration
export {
  MailchimpClient,
  createMailchimpClient,
  MailchimpApiError,
} from './mailchimp/client.js';
export type {
  MailchimpAudience,
  MailchimpMember,
  MailchimpTagFull,
  MailchimpClickEvent,
  MailchimpAudienceConfig,
} from './mailchimp/types.js';
