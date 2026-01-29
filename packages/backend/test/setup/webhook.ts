/**
 * Webhook Test Utilities
 *
 * Helpers for creating test webhook events and signature generation
 * for testing webhook handlers with real signature verification.
 *
 * @packageDocumentation
 */

import { createHmac } from 'crypto';

/**
 * Generate Stripe webhook signature
 *
 * @param payload - Raw webhook payload string
 * @param secret - Webhook secret key
 * @param timestamp - Optional timestamp for v2 signatures
 * @returns Signature string
 */
export function generateStripeSignature(
  payload: string,
  secret: string,
  timestamp?: number
): string {
  const timestampPrefix = timestamp ? `${timestamp}.` : '';
  const signedPayload = timestampPrefix + payload;
  return createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
}

/**
 * Create a Stripe webhook event with signature
 */
export function createStripeWebhookWithSignature(
  options: {
    type: 'payment_intent.succeeded' | 'invoice.payment_succeeded' | 'customer.subscription.created';
    amount?: number;
    currency?: string;
    customer_id?: string;
    subscription_id?: string;
    metadata?: Record<string, unknown>;
  },
  secret: string
): {
  event: Record<string, unknown>;
  signature: string;
  payload: string;
} {
  const timestamp = Math.floor(Date.now() / 1000);
  const webhookData = {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2020-08-27',
    created: timestamp,
    type: options.type,
    data: {
      object: {
        id: options.subscription_id || 'sub_test123',
        customer: options.customer_id || 'cus_test123',
        amount: options.amount || 1500,
        currency: options.currency || 'eur',
        status: 'succeeded',
        metadata: options.metadata || {},
      },
    },
  };

  const payload = JSON.stringify(webhookData);
  const signature = generateStripeSignature(payload, secret, timestamp);

  return {
    event: webhookData,
    payload,
    signature: `t=${timestamp},v1=${signature}`,
  };
}

/**
 * Generate Shopify HMAC signature
 *
 * @param payload - Raw webhook payload string
 * @param secret - Webhook secret key
 * @returns HMAC hex signature
 */
export function generateShopifySignature(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Create a Shopify webhook event with signature
 */
export function createShopifyWebhookWithSignature(
  options: {
    topic: 'orders/create' | 'orders/updated' | 'app/uninstalled';
    order_id?: string;
    customer_email?: string;
    domain?: string;
  },
  secret: string
): {
  event: Record<string, unknown>;
  payload: string;
  signature: string;
} {
  const orderDate = new Date().toISOString();
  const webhookData = {
    id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
    topic: options.topic,
    shop_domain: options.domain || 'test-shop.myshopify.com',
    payload: {
      id: options.order_id || `order_${Date.now()}`,
      email: options.customer_email || 'customer@example.com',
      created_at: orderDate,
      updated_at: orderDate,
      line_items: [],
      tags: 'test-data',
    },
  };

  const payload = new URLSearchParams();
  payload.append('topic', webhookData.topic);
  payload.append('shop_domain', webhookData.shop_domain);
  payload.append('payload', JSON.stringify(webhookData.payload));

  const payloadString = payload.toString();
  const signature = generateShopifySignature(payloadString, secret);

  return {
    event: webhookData,
    payload: payloadString,
    signature,
  };
}

/**
 * Generate GoCardless webhook signature
 *
 * @param payload - Raw webhook payload string
 * @param secret - Webhook secret key
 * @returns HMAC hex signature
 */
export function generateGoCardlessSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Create a GoCardless webhook event with signature
 */
export function createGoCardlessWebhookWithSignature(
  options: {
    action?: 'created' | 'customer_approval_denied' | 'submitted';
    resource_type?: 'payments' | 'subscriptions' | 'mandates';
    amount?: number;
    customer_id?: string;
    payment_id?: string;
  },
  secret: string
): {
  event: Record<string, unknown>;
  payload: string;
  signature: string;
} {
  const webhookData = {
    id: `EV${Date.now()}${Math.random().toString(36).substring(7)}`,
    created_at: new Date().toISOString(),
    action: options.action || 'created',
    resource_type: options.resource_type || 'payments',
    links: {
      payment: options.payment_id || `PM_${Date.now()}`,
    },
    details: {
      amount: options.amount || 1500,
      currency: 'EUR',
    },
  };

  if (options.customer_id) {
    (webhookData.links as Record<string, string>).customer = options.customer_id;
  }

  const payload = JSON.stringify(webhookData);
  const signature = generateGoCardlessSignature(payload, secret);

  return {
    event: webhookData,
    payload,
    signature,
  };
}

/**
 * Create SQS message for testing processors
 */
export function createSQSMessage(body: Record<string, unknown>): {
  messageId: string;
  receiptHandle: string;
  body: string;
  attributes: Record<string, unknown>;
} {
  return {
    messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    receiptHandle: `handle-${Date.now()}`,
    body: JSON.stringify(body),
    attributes: {},
  };
}

/**
 * Create SQS event wrapper for Lambda processor tests
 */
export function createSQSEvent(
  messages: Array<{ body: string; attributes?: Record<string, unknown> }>
): {
  Records: Array<{
    messageId: string;
    receiptHandle: string;
    body: string;
    attributes: Record<string, unknown>;
  }>;
} {
  return {
    Records: messages.map((msg, i) => ({
      messageId: `msg-${i}-${Date.now()}`,
      receiptHandle: `handle-${i}`,
      body: msg.body,
      attributes: msg.attributes || {},
    })),
  };
}

/**
 * Create S3 put object request for testing
 */
export function createS3PutRequest(
  bucket: string,
  key: string,
  body: Record<string, unknown>
): {
  bucket: string;
  key: string;
  body: string;
} {
  return {
    bucket,
    key,
    body: JSON.stringify(body),
  };
}
