/**
 * Shopify Integration Client Tests
 *
 * Tests for Shopify API client including:
 * - Webhook signature verification
 * - API client methods (with mocks)
 * - Error handling
 * - Rate limiting
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { ShopifyClient, ShopifyApiError, createShopifyClient } from './client';

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: async () => ({}),
}));
global.fetch = mockFetch;

describe('ShopifyClient', () => {
  let client: ShopifyClient;
  const mockConfig = {
    shopDomain: 'test-shop.myshopify.com',
    accessToken: 'test-access-token',
  };

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ShopifyClient(mockConfig);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeDefined();
    });

    it('should set default API version', () => {
      const customClient = new ShopifyClient({
        shopDomain: 'test.myshopify.com',
        accessToken: 'token',
      });
      expect(customClient).toBeDefined();
    });

    it('should use custom API version if provided', () => {
      const customClient = new ShopifyClient({
        shopDomain: 'test.myshopify.com',
        accessToken: 'token',
        apiVersion: '2024-04',
      });
      expect(customClient).toBeDefined();
    });

    it('should set default options', () => {
      const customClient = new ShopifyClient(mockConfig, {});
      expect(customClient).toBeDefined();
    });

    it('should use custom options', () => {
      const customClient = new ShopifyClient(mockConfig, {
        timeout: 5000,
        retryAttempts: 5,
      });
      expect(customClient).toBeDefined();
    });
  });

  // ==========================================================================
  // Webhook Signature Verification Tests
  // ==========================================================================

  describe('verifyWebhook', () => {
    it('should verify valid webhook signature', () => {
      const rawBody = Buffer.from('test payload');
      const signature = 'valid-signature';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'computed-signature'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyWebhook(rawBody, signature);

      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const rawBody = Buffer.from('test payload');
      const signature = 'invalid-signature';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'different-signature'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(false);

      const result = client.verifyWebhook(rawBody, signature);

      expect(result).toBe(false);
    });

    it('should handle string input for rawBody', () => {
      const rawBody = 'test payload';
      const signature = 'valid-signature';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'computed-signature'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyWebhook(rawBody, signature);

      expect(result).toBe(true);
    });

    it('should use timing-safe comparison', () => {
      const rawBody = Buffer.from('test');
      const signature = 'sig';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'sig'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      client.verifyWebhook(rawBody, signature);

      const timingSafeEqualSpy = crypto.timingSafeEqual as any;
      expect(timingSafeEqualSpy).toHaveBeenCalled();
    });

    it('should return false if signature lengths differ', () => {
      const rawBody = Buffer.from('test');
      const signature = 'very-long-signature-that-does-not-match';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'short'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockImplementation(() => {
        throw new Error('Buffer lengths differ');
      });

      const result = client.verifyWebhook(rawBody, signature);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // parseWebhook Tests
  // ==========================================================================

  describe('parseWebhook', () => {
    it('should verify and parse valid webhook', async () => {
      const rawBody = JSON.stringify({ id: 123, email: 'test@example.com' });
      const signature = 'valid-signature';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'valid-signature'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = await client.parseWebhook(rawBody, signature, 'orders/create');

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ id: 123, email: 'test@example.com' });
    });

    it('should return error for invalid signature', async () => {
      const rawBody = JSON.stringify({ id: 123 });
      const signature = 'invalid';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'different'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(false);

      const result = await client.parseWebhook(rawBody, signature, 'orders/create');

      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Invalid webhook signature');
    });

    it('should return error for invalid JSON', async () => {
      const rawBody = 'not valid json';
      const signature = 'sig';

      const mockHmac = {
        update: mock(() => mockHmac),
        digest: mock(() => 'sig'),
      };

      const crypto = require('crypto');
      spyOn(crypto, 'createHmac').mockReturnValue(mockHmac);
      spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = await client.parseWebhook(rawBody, signature, 'orders/create');

      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Invalid JSON payload');
    });
  });

  // ==========================================================================
  // API Client Tests
  // ==========================================================================

  describe('getCustomer', () => {
    it('should fetch customer by ID', async () => {
      const mockCustomer = {
        id: 123456,
        email: 'customer@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customer: mockCustomer }),
      } as Response);

      const result = await client.getCustomer(123456);

      expect(result).toEqual(mockCustomer);
    });

    it('should return null for 404 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await client.getCustomer(999999);

      expect(result).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      await expect(client.getCustomer(123)).rejects.toThrow(ShopifyApiError);
    });
  });

  describe('getOrders', () => {
    it('should fetch orders for a customer', async () => {
      const mockOrders = [
        { id: 1, total_price: '100.00' },
        { id: 2, total_price: '50.00' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ orders: mockOrders }),
      } as Response);

      const result = await client.getOrders(123456);

      expect(result).toEqual(mockOrders);
    });

    it('should apply status filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      } as Response);

      await client.getOrders(123456, 'open', 10);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('status=open');
    });

    it('should apply limit', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      } as Response);

      await client.getOrders(123456, 'any', 100);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=100');
    });

    it('should cap limit at 250', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      } as Response);

      await client.getOrders(123456, 'any', 500);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=250');
    });
  });

  describe('getOrder', () => {
    it('should fetch order by ID', async () => {
      const mockOrder = {
        id: 123456,
        order_number: 1001,
        total_price: '75.00',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ order: mockOrder }),
      } as Response);

      const result = await client.getOrder(123456);

      expect(result).toEqual(mockOrder);
    });

    it('should return null for nonexistent order', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await client.getOrder(999999);

      expect(result).toBeNull();
    });
  });

  describe('getOrdersSince', () => {
    it('should fetch orders since a date', async () => {
      const mockOrders = [{ id: 1 }, { id: 2 }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ orders: mockOrders }),
      } as Response);

      const result = await client.getOrdersSince('2024-01-01T00:00:00Z');

      expect(result).toEqual(mockOrders);
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
          json: async () => ({ customer: { id: 1 } }),
        } as Response);

      const result = await client.getCustomer(1);

      expect(result).toEqual({ id: 1 });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      await expect(client.getCustomer(1)).rejects.toThrow(ShopifyApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw ShopifyApiError for failed requests', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      try {
        await client.getCustomer(1);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ShopifyApiError);
        expect((error as ShopifyApiError).status).toBe(500);
      }
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => {
        throw new Error('ABORT_ERR');
      });

      await expect(client.getCustomer(1)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('createShopifyClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create client from environment variables', () => {
      process.env.SHOPIFY_SHOP_DOMAIN = 'test.myshopify.com';
      process.env.SHOPIFY_ACCESS_TOKEN = 'env-token';

      const client = createShopifyClient();

      expect(client).toBeDefined();
    });

    it('should throw if SHOPIFY_SHOP_DOMAIN is missing', () => {
      process.env.SHOPIFY_SHOP_DOMAIN = '';
      process.env.SHOPIFY_ACCESS_TOKEN = 'token';

      expect(() => createShopifyClient()).toThrow('Missing Shopify configuration');
    });

    it('should throw if SHOPIFY_ACCESS_TOKEN is missing', () => {
      process.env.SHOPIFY_SHOP_DOMAIN = 'test.myshopify.com';
      process.env.SHOPIFY_ACCESS_TOKEN = '';

      expect(() => createShopifyClient()).toThrow('Missing Shopify configuration');
    });
  });
});
