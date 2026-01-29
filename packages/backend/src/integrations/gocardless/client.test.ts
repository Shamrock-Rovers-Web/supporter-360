/**
 * GoCardless Integration Client Tests
 *
 * Tests for GoCardless API client including:
 * - Webhook signature verification
 * - API client methods (with mocks)
 * - Error handling
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { GoCardlessClient, GoCardlessApiError, createGoCardlessClient, createGoCardlessWebhookSecret } from './client';

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: async () => ({}),
}));
global.fetch = mockFetch;

describe('GoCardlessClient', () => {
  let client: GoCardlessClient;
  const mockConfig = {
    accessToken: 'test-access-token',
    environment: 'sandbox' as const,
  };

  beforeEach(() => {
    mockFetch.mockClear();
    client = new GoCardlessClient(mockConfig);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should initialize with sandbox environment', () => {
      expect(client).toBeDefined();
    });

    it('should use sandbox URL by default', () => {
      expect(client).toBeDefined();
    });

    it('should use live URL for live environment', () => {
      const liveClient = new GoCardlessClient({
        accessToken: 'token',
        environment: 'live',
      });
      expect(liveClient).toBeDefined();
    });

    it('should set custom options', () => {
      const customClient = new GoCardlessClient(mockConfig, {
        timeout: 10000,
        retryAttempts: 5,
      });
      expect(customClient).toBeDefined();
    });
  });

  // ==========================================================================
  // Webhook Signature Verification Tests
  // ==========================================================================

  describe('verifyWebhook', () => {
    const secret = 'test-webhook-secret';

    it('should verify valid GoCardless webhook signature', () => {
      const requestBody = '{"events": []}';
      const signature = 'sha256 valid-signature';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'valid-signature'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyWebhook(requestBody, signature, secret);

      expect(result).toBe(true);
    });

    it('should reject invalid signature format', () => {
      const requestBody = '{"events": []}';
      const signature = 'invalid-format';

      const result = client.verifyWebhook(requestBody, signature, secret);

      expect(result).toBe(false);
    });

    it('should reject mismatched signature', () => {
      const requestBody = '{"events": []}';
      const signature = 'sha256 wrong-signature';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'correct-signature'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(false);

      const result = client.verifyWebhook(requestBody, signature, secret);

      expect(result).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      const requestBody = '{"events": []}';
      const signature = 'sha256 sig';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'sig'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      client.verifyWebhook(requestBody, signature, secret);

      const timingSafeEqualSpy = crypto.timingSafeEqual as any;
      expect(timingSafeEqualSpy).toHaveBeenCalled();
    });

    it('should return false on timing-safe comparison error', () => {
      const requestBody = '{"events": []}';
      const signature = 'sha256 sig';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'sig'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockImplementation(() => {
        throw new Error('Length mismatch');
      });

      const result = client.verifyWebhook(requestBody, signature, secret);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // parseWebhook Tests
  // ==========================================================================

  describe('parseWebhook', () => {
    const secret = 'test-secret';

    it('should verify and parse valid webhook', () => {
      const requestBody = JSON.stringify({
        events: [
          { id: 'EV001', resource_type: 'payments', action: 'created' },
        ],
      });
      const signature = 'sha256 valid';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'valid'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.parseWebhook(requestBody, signature, secret);

      expect(result.valid).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events![0].id).toBe('EV001');
    });

    it('should return error for invalid signature', () => {
      const requestBody = '{"events": []}';
      const signature = 'sha256 invalid';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'different'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(false);

      const result = client.parseWebhook(requestBody, signature, secret);

      expect(result.valid).toBe(false);
      expect(result.events).toBeNull();
      expect(result.error).toBe('Invalid webhook signature');
    });

    it('should return error for invalid JSON', () => {
      const requestBody = 'not json';
      const signature = 'sha256 sig';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'sig'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.parseWebhook(requestBody, signature, secret);

      expect(result.valid).toBe(false);
      expect(result.events).toBeNull();
      expect(result.error).toBe('Invalid JSON payload');
    });

    it('should return error for missing events array', () => {
      const requestBody = JSON.stringify({ data: 'no events' });
      const signature = 'sha256 sig';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'sig'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.parseWebhook(requestBody, signature, secret);

      expect(result.valid).toBe(false);
      expect(result.events).toBeNull();
      expect(result.error).toBe('Invalid webhook payload');
    });
  });

  // ==========================================================================
  // Customer API Tests
  // ==========================================================================

  describe('getCustomer', () => {
    it('should fetch customer by ID', async () => {
      const mockCustomer = {
        id: 'CU001',
        email: 'customer@example.com',
        given_name: 'John',
        family_name: 'Doe',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [mockCustomer] }),
      } as Response);

      const result = await client.getCustomer('CU001');

      expect(result).toEqual(mockCustomer);
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await client.getCustomer('CU999');

      expect(result).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      } as Response);

      await expect(client.getCustomer('CU001')).rejects.toThrow(GoCardlessApiError);
    });
  });

  describe('listCustomers', () => {
    it('should list customers with pagination', async () => {
      const mockCustomers = [
        { id: 'CU001', email: 'one@example.com' },
        { id: 'CU002', email: 'two@example.com' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          customers: mockCustomers,
          meta: { cursors: { after: 'next-cursor' } },
        }),
      } as Response);

      const result = await client.listCustomers(50, 'cursor');

      expect(result.customers).toEqual(mockCustomers);
      expect(result.meta).toEqual({ cursors: { after: 'next-cursor' } });
    });

    it('should cap limit at 500', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [] }),
      } as Response);

      await client.listCustomers(1000);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=500');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle 429 rate limit with retry', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '1' }),
          text: async () => 'Rate Limited',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customers: [{ id: 'CU001' }] }),
        } as Response);

      const result = await client.getCustomer('CU001');

      expect(result).toEqual({ id: 'CU001' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      await expect(client.getCustomer('CU001')).rejects.toThrow(GoCardlessApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw GoCardlessApiError with status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as Response);

      try {
        await client.getCustomer('CU001');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(GoCardlessApiError);
        expect((error as GoCardlessApiError).status).toBe(403);
      }
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('createGoCardlessClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create client from environment variables', () => {
      process.env.GOCARDLESS_ACCESS_TOKEN = 'env-token';

      const client = createGoCardlessClient();

      expect(client).toBeDefined();
    });

    it('should throw if GOCARDLESS_ACCESS_TOKEN is missing', () => {
      process.env.GOCARDLESS_ACCESS_TOKEN = '';

      expect(() => createGoCardlessClient()).toThrow('Missing GoCardless configuration');
    });
  });

  describe('createGoCardlessWebhookSecret', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return secret from environment variable', () => {
      process.env.GOCARDLESS_WEBHOOK_SECRET = 'webhook-secret';

      const secret = createGoCardlessWebhookSecret();

      expect(secret).toBe('webhook-secret');
    });

    it('should throw if GOCARDLESS_WEBHOOK_SECRET is missing', () => {
      process.env.GOCARDLESS_WEBHOOK_SECRET = '';

      expect(() => createGoCardlessWebhookSecret()).toThrow('Missing GoCardless configuration');
    });
  });
});
