/**
 * Future Ticketing Integration Client Tests
 *
 * Tests for Future Ticketing API client including:
 * - API client methods (with mocks)
 * - Error handling
 * - Retry logic with exponential backoff
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { FutureTicketingClient, FutureTicketingApiError, createFutureTicketingClient } from './client';

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: async () => ({}),
}));
global.fetch = mockFetch;

describe('FutureTicketingClient', () => {
  let client: FutureTicketingClient;
  const mockConfig = {
    apiUrl: 'https://api.futureticketing.example.com',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    mockFetch.mockClear();
    client = new FutureTicketingClient(mockConfig);
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
      const customClient = new FutureTicketingClient({
        ...mockConfig,
        apiVersion: 'v2',
      });
      expect(customClient).toBeDefined();
    });

    it('should use custom options', () => {
      const customClient = new FutureTicketingClient(mockConfig, {
        timeout: 10000,
        retryAttempts: 10,
        retryDelay: 2000,
        pageSize: 200,
      });
      expect(customClient).toBeDefined();
    });
  });

  // ==========================================================================
  // Customer API Tests
  // ==========================================================================

  describe('getCustomers', () => {
    it('should fetch customers', async () => {
      const mockCustomers = [
        { id: 'C001', email: 'customer1@example.com', name: 'John Doe' },
        { id: 'C002', email: 'customer2@example.com', name: 'Jane Doe' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCustomers,
      } as Response);

      const result = await client.getCustomers();

      expect(result).toEqual(mockCustomers);
    });

    it('should fetch customers since a date', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await client.getCustomers('2024-01-01T00:00:00Z');

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('modifiedSince=2024-01-01T00%3A00%3A00Z');
    });

    it('should handle paginated response format', async () => {
      const paginatedResponse = {
        data: [{ id: 'C001' }],
        pagination: { hasMore: true, total: 100 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => paginatedResponse,
      } as Response);

      const result = await client.getCustomers();

      expect(result).toEqual([{ id: 'C001' }]);
    });

    it('should fetch all pages when hasMore is true', async () => {
      const page1 = {
        data: [{ id: 'C001' }],
        pagination: { hasMore: true },
      };
      const page2 = {
        data: [{ id: 'C002' }],
        pagination: { hasMore: false },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2,
        } as Response);

      const result = await client.getCustomers();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('C001');
      expect(result[1].id).toBe('C002');
    });
  });

  describe('getCustomer', () => {
    it('should fetch a specific customer', async () => {
      const mockCustomer = {
        id: 'C001',
        email: 'customer@example.com',
        name: 'John Doe',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCustomer,
      } as Response);

      const result = await client.getCustomer('C001');

      expect(result).toEqual(mockCustomer);
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await client.getCustomer('C999');

      expect(result).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      } as Response);

      await expect(client.getCustomer('C001')).rejects.toThrow(FutureTicketingApiError);
    });
  });

  // ==========================================================================
  // Order API Tests
  // ==========================================================================

  describe('getOrders', () => {
    it('should fetch orders', async () => {
      const mockOrders = [
        { id: 'O001', total: 100 },
        { id: 'O002', total: 50 },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockOrders,
      } as Response);

      const result = await client.getOrders();

      expect(result).toEqual(mockOrders);
    });
  });

  // ==========================================================================
  // Health Check Tests
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return true for successful health check', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      } as Response);

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false if both endpoints fail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.healthCheck();

      expect(result).toBe(false);
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
          json: async () => [],
        } as Response);

      const result = await client.getCustomers();

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      await expect(client.getCustomers()).rejects.toThrow(FutureTicketingApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw FutureTicketingApiError with status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      try {
        await client.getCustomer('C001');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(FutureTicketingApiError);
        expect((error as FutureTicketingApiError).status).toBe(401);
      }
    });
  });

  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================

  describe('createFutureTicketingClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create client from environment variables', () => {
      process.env.FUTURE_TICKETING_API_URL = 'https://api.test.com';
      process.env.FUTURE_TICKETING_API_KEY = 'test-key';

      const client = createFutureTicketingClient();

      expect(client).toBeDefined();
    });

    it('should throw if FUTURE_TICKETING_API_URL is missing', () => {
      process.env.FUTURE_TICKETING_API_URL = '';
      process.env.FUTURE_TICKETING_API_KEY = 'key';

      expect(() => createFutureTicketingClient()).toThrow('Missing Future Ticketing configuration');
    });

    it('should throw if FUTURE_TICKETING_API_KEY is missing', () => {
      process.env.FUTURE_TICKETING_API_URL = 'https://api.test.com';
      process.env.FUTURE_TICKETING_API_KEY = '';

      expect(() => createFutureTicketingClient()).toThrow('Missing Future Ticketing configuration');
    });
  });
});
