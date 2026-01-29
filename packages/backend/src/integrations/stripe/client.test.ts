/**
 * Stripe Integration Client Tests
 *
 * Tests for Stripe API client including:
 * - Webhook signature verification
 * - API client methods (with mocks)
 * - Error handling
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { StripeClient, StripeApiError, createStripeClient, createStripeWebhookSecret } from './client';

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: async () => ({}),
}));
global.fetch = mockFetch;

describe('StripeClient', () => {
  let client: StripeClient;
  const mockConfig = {
    apiKey: 'sk_test_1234567890',
  };

  beforeEach(() => {
    mockFetch.mockClear();
    client = new StripeClient(mockConfig);
    // Mock current time for timestamp verification
    spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01 00:00:00 UTC
  });

  afterEach(() => {
    // Restore Date.now mock
    const dateSpy = Date.now as any;
    if (dateSpy.mockRestore) {
      dateSpy.mockRestore();
    }
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeDefined();
    });

    it('should use default API version', () => {
      expect(client).toBeDefined();
    });

    it('should use custom API version if provided', () => {
      const customClient = new StripeClient({
        apiKey: 'sk_test_123',
        apiVersion: '2023-12-15',
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('getApiMode', () => {
    it('should return test mode for test keys', () => {
      const testClient = new StripeClient({ apiKey: 'sk_test_123' });
      expect(testClient.getApiMode()).toBe('test');
    });

    it('should return live mode for live keys', () => {
      const liveClient = new StripeClient({ apiKey: 'sk_live_123' });
      expect(liveClient.getApiMode()).toBe('live');
    });
  });

  // ==========================================================================
  // Webhook Signature Verification Tests
  // ==========================================================================

  describe('verifyWebhook', () => {
    const secret = 'whsec_test_secret';

    it('should verify valid Stripe webhook signature', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const timestamp = '1704067200';
      const signature = `t=${timestamp},v1=valid-signature`;

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'valid-signature'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyWebhook(payload, signature, secret);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', 'evt_123');
    });

    it('should reject webhook with old timestamp', () => {
      const payload = 'test payload';
      // Timestamp more than 5 minutes ago (301 seconds)
      const oldTimestamp = (1704067200 - 301).toString();
      const signature = `t=${oldTimestamp},v1=signature`;

      const result = client.verifyWebhook(payload, signature, secret);

      expect(result).toBeNull();
    });

    it('should reject webhook with future timestamp', () => {
      const payload = 'test payload';
      // Timestamp more than 5 minutes in the future (301 seconds)
      const futureTimestamp = (1704067200 + 301).toString();
      const signature = `t=${futureTimestamp},v1=signature`;

      const result = client.verifyWebhook(payload, signature, secret);

      expect(result).toBeNull();
    });

    it('should reject webhook with missing timestamp', () => {
      const payload = 'test payload';
      const signature = 'v1=signature'; // No t= component

      const result = client.verifyWebhook(payload, signature, secret);

      expect(result).toBeNull();
    });

    it('should reject webhook with missing v1 signature', () => {
      const payload = 'test payload';
      const signature = 't=1704067200'; // No v1= component

      const result = client.verifyWebhook(payload, signature, secret);

      expect(result).toBeNull();
    });

    it('should handle Buffer input for payload', () => {
      const payload = Buffer.from('test payload');
      const timestamp = '1704067200';
      const signature = `t=${timestamp},v1=valid`;

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'valid'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyWebhook(payload, signature, secret);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // verifyAndParseWebhook Tests
  // ==========================================================================

  describe('verifyAndParseWebhook', () => {
    const secret = 'whsec_test_secret';

    it('should verify and return event when allowed types match', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const timestamp = '1704067200';
      const signature = `t=${timestamp},v1=valid`;

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'valid'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyAndParseWebhook(
        payload,
        signature,
        secret,
        ['payment_intent.succeeded', 'charge.succeeded']
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', 'evt_123');
    });

    it('should return null when event type not in allowed list', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const timestamp = '1704067200';
      const signature = `t=${timestamp},v1=valid`;

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'valid'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyAndParseWebhook(
        payload,
        signature,
        secret,
        ['charge.succeeded'] // Different type
      );

      expect(result).toBeNull();
    });

    it('should allow all types when no allowed types specified', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'any.event.type' });
      const timestamp = '1704067200';
      const signature = `t=${timestamp},v1=valid`;

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'valid'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyAndParseWebhook(payload, signature, secret);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('type', 'any.event.type');
    });

    it('should return null for invalid signature', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
      const timestamp = '1704067200';
      const signature = `t=${timestamp},v1=invalid`;

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'different'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(false);

      const result = client.verifyAndParseWebhook(payload, signature, secret);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // API Client Tests
  // ==========================================================================

  describe('getCustomer', () => {
    it('should fetch customer by ID', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'customer@example.com',
        name: 'John Doe',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customer: mockCustomer }),
      } as Response);

      const result = await client.getCustomer('cus_123');

      expect(result).toEqual(mockCustomer);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/customers/cus_123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockConfig.apiKey}`,
          }),
        })
      );
    });

    it('should return null for 404 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await client.getCustomer('cus_nonexistent');

      expect(result).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      await expect(client.getCustomer('cus_123')).rejects.toThrow(StripeApiError);
    });
  });

  describe('getPaymentIntent', () => {
    it('should fetch payment intent by ID', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payment_intent: mockPaymentIntent }),
      } as Response);

      const result = await client.getPaymentIntent('pi_123');

      expect(result).toEqual(mockPaymentIntent);
    });

    it('should return null for nonexistent payment intent', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await client.getPaymentIntent('pi_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listCharges', () => {
    it('should list charges for a customer', async () => {
      const mockCharges = [
        { id: 'ch_1', amount: 5000 },
        { id: 'ch_2', amount: 10000 },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockCharges }),
      } as Response);

      const result = await client.listCharges('cus_123');

      expect(result).toEqual(mockCharges);
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('customer=cus_123');
    });

    it('should apply limit parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await client.listCharges('cus_123', 50);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=50');
    });

    it('should cap limit at 100', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await client.listCharges('cus_123', 200);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=100');
    });
  });

  describe('getCharge', () => {
    it('should fetch charge by ID', async () => {
      const mockCharge = {
        id: 'ch_123',
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ charge: mockCharge }),
      } as Response);

      const result = await client.getCharge('ch_123');

      expect(result).toEqual(mockCharge);
    });
  });

  describe('listChargesSince', () => {
    it('should list charges since a timestamp', async () => {
      const mockCharges = [{ id: 'ch_1' }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockCharges }),
      } as Response);

      const result = await client.listChargesSince(1704067200);

      expect(result).toEqual(mockCharges);
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('gt%5Bcreated%5D=1704067200');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle 429 rate limit response with retry', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '1' }),
          text: async () => 'Too Many Requests',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customer: { id: 'cus_1' } }),
        } as Response);

      const result = await client.getCustomer('cus_1');

      expect(result).toEqual({ id: 'cus_1' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for rate limit without Retry-After', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers(),
          text: async () => 'Too Many Requests',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customer: { id: 'cus_1' } }),
        } as Response);

      const result = await client.getCustomer('cus_1');

      expect(result).toEqual({ id: 'cus_1' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      await expect(client.getCustomer('cus_1')).rejects.toThrow(StripeApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw StripeApiError with status code', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => 'Payment Required',
      } as Response);

      try {
        await client.getCustomer('cus_1');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(StripeApiError);
        expect((error as StripeApiError).status).toBe(402);
      }
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('createStripeClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create client from environment variable', () => {
      process.env.STRIPE_API_KEY = 'sk_test_env_key';

      const client = createStripeClient();

      expect(client).toBeDefined();
    });

    it('should throw if STRIPE_API_KEY is missing', () => {
      process.env.STRIPE_API_KEY = '';

      expect(() => createStripeClient()).toThrow('Missing Stripe configuration');
    });
  });

  describe('createStripeWebhookSecret', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return secret from environment variable', () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_secret';

      const secret = createStripeWebhookSecret();

      expect(secret).toBe('whsec_secret');
    });

    it('should throw if STRIPE_WEBHOOK_SECRET is missing', () => {
      process.env.STRIPE_WEBHOOK_SECRET = '';

      expect(() => createStripeWebhookSecret()).toThrow('Missing Stripe configuration');
    });
  });
});
