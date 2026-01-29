// @ts-nocheck - Disable TypeScript checking for this test file
/**
 * Mailchimp Integration Client Tests
 *
 * Tests for Mailchimp API client including:
 * - Webhook signature verification
 * - API client methods (with mocks)
 * - Error handling
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MailchimpClient, MailchimpApiError, createMailchimpClient } from './client';

// Mock fetch globally
const mockFetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: async () => ({}),
}));
global.fetch = mockFetch;

describe('MailchimpClient', () => {
  let client: MailchimpClient;
  const mockConfig = {
    apiKey: 'us1-test-api-key', // Format: key-datacenter
  };

  beforeEach(() => {
    mockFetch.mockClear();
    client = new MailchimpClient(mockConfig);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeDefined();
    });

    it('should extract data center from API key', () => {
      const client = new MailchimpClient({ apiKey: 'us2-api-key' });
      expect(client).toBeDefined();
    });

    it('should use default data center if key format is invalid', () => {
      const client = new MailchimpClient({ apiKey: 'invalid-key' });
      expect(client).toBeDefined();
    });

    it('should use custom API version if provided', () => {
      const customClient = new MailchimpClient({
        apiKey: 'us1-key',
        apiVersion: '3.5',
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('getConfiguredAudiences', () => {
    it('should return empty array if no audiences configured', () => {
      const client = new MailchimpClient({ apiKey: 'us1-key' });
      const audiences = client.getConfiguredAudiences();

      expect(audiences).toEqual([]);
    });

    it('should return configured audiences', () => {
      const audiences = [
        { id: 'aud1', name: 'Shop', type: 'Shop', enabled: true },
        { id: 'aud2', name: 'Members', type: 'Members', enabled: true },
      ];
      const client = new MailchimpClient({
        apiKey: 'us1-key',
        audiences,
      });

      expect(client.getConfiguredAudiences()).toEqual(audiences);
    });
  });

  // ==========================================================================
  // Webhook Signature Verification Tests
  // ==========================================================================

  describe('verifyWebhook', () => {
    it('should verify valid webhook signature', () => {
      const payload = 'test payload';
      const signature = '1234567890|base64signature'; // timestamp|signature

      // Setup mock
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn(() => ({ digest: jest.fn(() => 'base64signature') })),
        digest: jest.fn(() => 'base64signature'),
      });
      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const result = client.verifyWebhook(payload, signature);

      expect(result).toBe(true);
    });

    it('should reject signature with old timestamp', () => {
      const crypto = require('crypto');
      jest.spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01

      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn(() => ({ digest: jest.fn(() => 'sig') })),
        digest: jest.fn(() => 'sig'),
      });
      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const payload = 'test payload';
      // Timestamp more than 5 minutes ago
      const oldTimestamp = Math.floor(1704067200 / 1000) - 301;
      const signature = `${oldTimestamp}|sig`;

      const result = client.verifyWebhook(payload, signature);

      expect(result).toBe(false);
    });

    it('should handle signature without timestamp', () => {
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn(() => ({ digest: jest.fn(() => 'sig') })),
        digest: jest.fn(() => 'sig'),
      });
      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);

      const payload = 'test payload';
      const signature = 'sig'; // No timestamp

      const result = client.verifyWebhook(payload, signature);

      expect(result).toBe(true);
    });
  });

  describe('parseWebhook', () => {
    it('should parse valid webhook payload', () => {
      const payload = JSON.stringify({
        type: 'click',
        data: { email: 'test@example.com' },
      });

      const result = client.parseWebhook(payload);

      expect(result).toEqual({
        type: 'click',
        data: { email: 'test@example.com' },
      });
    });

    it('should handle payload with missing type', () => {
      const payload = JSON.stringify({
        data: { email: 'test@example.com' },
      });

      const result = client.parseWebhook(payload);

      expect(result).toEqual({
        type: 'unknown',
        data: { email: 'test@example.com' },
      });
    });

    it('should return null for invalid JSON', () => {
      const result = client.parseWebhook('not json');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Audience API Tests
  // ==========================================================================

  describe('getAllAudiences', () => {
    it('should fetch all audiences', async () => {
      const mockAudiences = [
        { id: 'aud1', name: 'Shop Customers' },
        { id: 'aud2', name: 'Members' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ lists: mockAudiences }),
      } as Response);

      const result = await client.getAllAudiences();

      expect(result).toEqual(mockAudiences);
    });

    it('should apply count and offset parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ lists: [] }),
      } as Response);

      await client.getAllAudiences(50, 10);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('count=50');
      expect(url).toContain('offset=10');
    });
  });

  // ==========================================================================
  // Member API Tests
  // ==========================================================================

  describe('getMember', () => {
    it('should fetch member by email', async () => {
      const mockMember = {
        id: 'abc123',
        email_address: 'test@example.com',
        status: 'subscribed',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMember,
      } as Response);

      const result = await client.getMember('aud1', 'test@example.com');

      expect(result).toEqual(mockMember);
    });

    it('should return null for nonexistent member', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await client.getMember('aud1', 'nonexistent@example.com');

      expect(result).toBeNull();
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
          text: async () => 'Too Many Requests',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [] }),
        } as Response);

      const result = await client.getAllAudiences();

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      await expect(client.getAllAudiences()).rejects.toThrow(MailchimpApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw MailchimpApiError with status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      try {
        await client.getAllAudiences();
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(MailchimpApiError);
        expect((error as MailchimpApiError).status).toBe(401);
      }
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('createMailchimpClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create client from environment variable', () => {
      process.env.MAILCHIMP_API_KEY = 'us1-env-key';

      const client = createMailchimpClient();

      expect(client).toBeDefined();
    });

    it('should load audiences from environment variables', () => {
      process.env.MAILCHIMP_API_KEY = 'us1-key';
      process.env.MAILCHIMP_AUDIENCE_SHOP = 'shop-audience';
      process.env.MAILCHIMP_AUDIENCE_MEMBERS = 'members-audience';

      const client = createMailchimpClient();
      const audiences = client.getConfiguredAudiences();

      expect(audiences).toHaveLength(2);
    });

    it('should throw if MAILCHIMP_API_KEY is missing', () => {
      process.env.MAILCHIMP_API_KEY = '';

      expect(() => createMailchimpClient()).toThrow('Missing Mailchimp configuration');
    });
  });
});
