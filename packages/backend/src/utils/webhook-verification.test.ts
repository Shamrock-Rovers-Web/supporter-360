import {
  verifyShopifyWebhook,
  verifyStripeWebhook,
  verifyGoCardlessWebhook,
  verifyMailchimpWebhook,
} from './webhook-verification';
import { createHmac } from 'crypto';

describe('Webhook Verification', () => {
  const mockSecret = 'test-webhook-secret';

  describe('verifyShopifyWebhook', () => {
    it('should verify valid Shopify webhook signatures', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const signature = createHmac('sha256', mockSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      expect(verifyShopifyWebhook(rawBody, signature, mockSecret)).toBe(true);
    });

    it('should reject invalid Shopify webhook signatures', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const invalidSignature = 'invalid-signature';

      expect(verifyShopifyWebhook(rawBody, invalidSignature, mockSecret)).toBe(false);
    });

    it('should reject signatures with different length', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const signature = createHmac('sha256', mockSecret)
        .update(rawBody, 'utf8')
        .digest('base64');
      const truncatedSignature = signature.substring(0, 10);

      expect(verifyShopifyWebhook(rawBody, truncatedSignature, mockSecret)).toBe(false);
    });
  });

  describe('verifyStripeWebhook', () => {
    const generateStripeSignature = (timestamp: number, payload: string, secret: string): string => {
      const sigPayload = `${timestamp}.${payload}`;
      const signature = createHmac('sha256', secret)
        .update(sigPayload, 'utf8')
        .digest('hex');
      return `t=${timestamp},v1=${signature}`;
    };

    it('should verify valid Stripe webhook signatures', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateStripeSignature(timestamp, rawBody, mockSecret);

      expect(verifyStripeWebhook(rawBody, signature, mockSecret)).toBe(true);
    });

    it('should reject invalid Stripe webhook signatures', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const invalidSignature = 't=1234567890,v1=invalid';

      expect(verifyStripeWebhook(rawBody, invalidSignature, mockSecret)).toBe(false);
    });

    it('should reject expired timestamps (replay attack protection)', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const oldTimestamp = Math.floor(Date.now() / 1000) - 200; // 200 seconds ago
      const signature = generateStripeSignature(oldTimestamp, rawBody, mockSecret);

      expect(verifyStripeWebhook(rawBody, signature, mockSecret)).toBe(false);
    });

    it('should reject signatures missing timestamp', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const signature = `v1=${createHmac('sha256', mockSecret).update(rawBody, 'utf8').digest('hex')}`;

      expect(verifyStripeWebhook(rawBody, signature, mockSecret)).toBe(false);
    });

    it('should reject signatures missing v1', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp}`;

      expect(verifyStripeWebhook(rawBody, signature, mockSecret)).toBe(false);
    });
  });

  describe('verifyGoCardlessWebhook', () => {
    it('should verify valid GoCardless webhook signatures', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const signature = createHmac('sha256', mockSecret)
        .update(rawBody, 'utf8')
        .digest('hex');

      expect(verifyGoCardlessWebhook(rawBody, signature, mockSecret)).toBe(true);
    });

    it('should reject invalid GoCardless webhook signatures', () => {
      const rawBody = JSON.stringify({ test: 'data' });
      const invalidSignature = 'invalid-hex-signature';

      expect(verifyGoCardlessWebhook(rawBody, invalidSignature, mockSecret)).toBe(false);
    });

    it('should reject empty signatures', () => {
      const rawBody = JSON.stringify({ test: 'data' });

      expect(verifyGoCardlessWebhook(rawBody, '', mockSecret)).toBe(false);
    });
  });

  describe('verifyMailchimpWebhook', () => {
    it('should verify valid Mailchimp webhook signatures', () => {
      const rawBody = 'type=click&data=%7B%22email%22%3A%22test%40example.com%22%7D';
      const signature = createHmac('sha256', mockSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      expect(verifyMailchimpWebhook(rawBody, signature, mockSecret)).toBe(true);
    });

    it('should reject invalid Mailchimp webhook signatures', () => {
      const rawBody = 'type=click&data=%7B%22email%22%3A%22test%40example.com%22%7D';
      const invalidSignature = 'invalid-base64-signature';

      expect(verifyMailchimpWebhook(rawBody, invalidSignature, mockSecret)).toBe(false);
    });

    it('should reject empty signatures', () => {
      const rawBody = 'type=click&data=%7B%22email%22%3A%22test%40example.com%22%7D';

      expect(verifyMailchimpWebhook(rawBody, '', mockSecret)).toBe(false);
    });

    it('should reject when secret is empty', () => {
      const rawBody = 'type=click&data=%7B%22email%22%3A%22test%40example.com%22%7D';
      const signature = createHmac('sha256', mockSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      expect(verifyMailchimpWebhook(rawBody, signature, '')).toBe(false);
    });

    it('should reject tampered payload', () => {
      const rawBody = 'type=click&data=%7B%22email%22%3A%22test%40example.com%22%7D';
      const tamperedBody = 'type=unsubscribe&data=%7B%22email%22%3A%22test%40example.com%22%7D';
      const signature = createHmac('sha256', mockSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      expect(verifyMailchimpWebhook(tamperedBody, signature, mockSecret)).toBe(false);
    });
  });
});
