/**
 * Search API Handler Tests
 *
 * Tests for the search endpoint including:
 * - Query parameter validation
 * - Filtering by field and type
 * - Pagination
 * - Error handling
 *
 * @packageDocumentation
 */

// @ts-nocheck

// Create mock repository that will be used by the handler
const mockRepository = {
  search: jest.fn(),
} as any;

// Mock auth middleware to bypass authentication
jest.mock('../../middleware/auth', () => ({
  requireAuth: jest.fn((fn) => async (event: any) => {
    return fn(event, { role: 'staff', keyName: 'test-key' });
  }),
  validateApiKey: jest.fn(),
  AuthContext: {},
}));

// Mock the repository before importing the handler
jest.mock('../../db/repositories/supporter.repository', () => ({
  SupporterRepository: jest.fn().mockImplementation(() => mockRepository),
}));

import { handler } from './search.handler';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('Search API Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createMockEvent = (overrides = {}) => ({
    body: '',
    queryStringParameters: {},
    headers: {},
    pathParameters: {},
    ...overrides,
  });

  // ==========================================================================
  // Query Parameter Validation Tests
  // ==========================================================================

  describe('query parameter validation', () => {
    it('should reject request with missing query parameter', async () => {
      const event = createMockEvent({
        queryStringParameters: {},
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.success).toBe(false);
      expect(response.code).toBe('INVALID_PARAMETERS');
    });

    it('should reject request with empty query parameter', async () => {
      const event = createMockEvent({
        queryStringParameters: { q: '   ' }, // Whitespace only
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid field parameter', async () => {
      const event = createMockEvent({
        queryStringParameters: { q: 'john', field: 'invalid' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid limit parameter', async () => {
      const event = createMockEvent({
        queryStringParameters: { q: 'john', limit: 'invalid' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
    });

    it('should reject limit above maximum', async () => {
      const event = createMockEvent({
        queryStringParameters: { q: 'john', limit: '101' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
    });

    it('should reject negative offset', async () => {
      const event = createMockEvent({
        queryStringParameters: { q: 'john', offset: '-1' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid supporter type', async () => {
      const event = createMockEvent({
        queryStringParameters: { q: 'john', type: 'InvalidType' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // Search by Field Tests
  // ==========================================================================

  describe('search by field', () => {
    it('should search by email when field is "email"', async () => {
      mockRepository.search.mockResolvedValue({
        results: [
          {
            supporter_id: 'supp-123',
            name: 'John Doe',
            email: 'john@example.com',
            supporter_type: 'Member',
            last_ticket_order_date: null,
            last_shop_order_date: null,
            last_stadium_entry_date: null,
            membership_status: 'Active',
          },
        ],
        total: 1,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john@example.com', field: 'email' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john@example.com',
        field: 'email',
        limit: 50,
        offset: 0,
        supporter_type: undefined,
      });

      expect(response.data.results).toHaveLength(1);
      expect(response.data.results[0].email).toBe('john@example.com');
    });

    it('should search by name when field is "name"', async () => {
      mockRepository.search.mockResolvedValue({
        results: [
          {
            supporter_id: 'supp-123',
            name: 'John Johnson',
            email: 'john@example.com',
            supporter_type: 'Member',
            last_ticket_order_date: null,
            last_shop_order_date: null,
            last_stadium_entry_date: null,
            membership_status: 'Active',
          },
        ],
        total: 1,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'Johnson', field: 'name' },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'Johnson',
        field: 'name',
        limit: 50,
        offset: 0,
        supporter_type: undefined,
      });
    });

    it('should search by phone when field is "phone"', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: '0871234567', field: 'phone' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: '0871234567',
        field: 'phone',
        limit: 50,
        offset: 0,
        supporter_type: undefined,
      });
    });

    it('should search all fields when field is "all"', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', field: 'all' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john',
        field: 'all',
        limit: 50,
        offset: 0,
        supporter_type: undefined,
      });
    });

    it('should default to "all" field when not specified', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john',
        field: 'all',
        limit: 50,
        offset: 0,
        supporter_type: undefined,
      });
    });
  });

  // ==========================================================================
  // Supporter Type Filter Tests
  // ==========================================================================

  describe('supporter type filtering', () => {
    it('should filter by single supporter type using "type" param', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', type: 'Member' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john',
        field: 'all',
        supporter_type: 'Member',
        limit: 50,
        offset: 0,
      });
    });

    it('should filter by single supporter type using "types" param', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', types: 'Member' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john',
        field: 'all',
        supporter_type: 'Member',
        limit: 50,
        offset: 0,
      });
    });

    it('should filter by multiple supporter types', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', types: 'Member,Season Ticket Holder' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john',
        field: 'all',
        supporter_type: ['Member', 'Season Ticket Holder'],
        limit: 50,
        offset: 0,
      });
    });

    it('should ignore invalid supporter types in comma-separated list', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', types: 'Member,InvalidType,Ticket Buyer' },
      });

      await handler(event as APIGatewayProxyEvent);

      const types = mockRepository.search.mock.calls[0][0].supporter_type;
      expect(types).toEqual(['Member', 'Ticket Buyer']);
    });

    it('should not filter if no valid types provided', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', types: 'InvalidType,AnotherInvalid' },
      });

      await handler(event as APIGatewayProxyEvent);

      const searchCall = mockRepository.search.mock.calls[0];
      expect(searchCall[0].supporter_type).toBeUndefined();
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================

  describe('pagination', () => {
    it('should apply custom limit and offset', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 100,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', limit: '20', offset: '40' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john',
        field: 'all',
        limit: 20,
        offset: 40,
        supporter_type: undefined,
      });
    });

    it('should return has_more when more results exist', async () => {
      mockRepository.search.mockResolvedValue({
        results: [{}, {}],
        total: 100,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', limit: '20', offset: '80' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(response.data.has_more).toBe(true);
    });

    it('should return has_more false when no more results', async () => {
      mockRepository.search.mockResolvedValue({
        results: [{}, {}],
        total: 82,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', limit: '20', offset: '80' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(response.data.has_more).toBe(false);
    });

    it('should use default limit of 50', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john',
        field: 'all',
        limit: 50,
        offset: 0,
        supporter_type: undefined,
      });
    });

    it('should use default offset of 0', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'john',
        field: 'all',
        limit: 50,
        offset: 0,
        supporter_type: undefined,
      });
    });
  });

  // ==========================================================================
  // Response Format Tests
  // ==========================================================================

  describe('response format', () => {
    it('should format results correctly', async () => {
      const mockResult = {
        supporter_id: 'supp-123',
        name: 'John Doe',
        email: 'john@example.com',
        supporter_type: 'Member',
        last_ticket_order_date: new Date('2024-01-01'),
        last_shop_order_date: new Date('2024-01-15'),
        last_stadium_entry_date: new Date('2024-01-20'),
        membership_status: 'Active',
      };

      mockRepository.search.mockResolvedValue({
        results: [mockResult],
        total: 1,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(response.data.results[0].supporter_id).toBe('supp-123');
      expect(response.data.results[0].last_ticket_order).toBe('2024-01-01T00:00:00.000Z');
      expect(response.data.results[0].last_shop_order).toBe('2024-01-15T00:00:00.000Z');
      expect(response.data.results[0].membership_status).toBe('Active');
    });

    it('should convert dates to ISO strings', async () => {
      const mockResult = {
        supporter_id: 'supp-123',
        name: 'John Doe',
        email: 'john@example.com',
        supporter_type: 'Member',
        last_ticket_order_date: null,
        last_shop_order_date: null,
        last_stadium_entry_date: null,
        membership_status: null,
      };

      mockRepository.search.mockResolvedValue({
        results: [mockResult],
        total: 1,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(response.data.results[0].last_ticket_order).toBeNull();
      expect(response.data.results[0].last_shop_order).toBeNull();
    });

    it('should return total count', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 42,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(response.data.total).toBe(42);
    });

    it('should include limit and offset in response', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', limit: '10', offset: '5' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(response.data.limit).toBe(10);
      expect(response.data.offset).toBe(5);
    });

    it('should return success response', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body);
      expect(response.success).toBe(true);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle repository errors', async () => {
      mockRepository.search.mockRejectedValue(new Error('Database connection failed'));

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(500);
      expect(response.success).toBe(false);
      expect(response.code).toBe('SEARCH_ERROR');
      expect(response.details.message).toBe('Database connection failed');
    });

    it('should log slow queries', async () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();

      mockRepository.search.mockImplementation(async () => {
        // Simulate slow query
        await new Promise(resolve => setTimeout(resolve, 10));
        return { results: [], total: 0 };
      });

      // Mock Date.now to simulate time passing
      const mockDateNow = jest.spyOn(Date, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(1001); // Simulate >1000ms duration

      const event = createMockEvent({
        queryStringParameters: { q: 'john' },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow search query:')
      );

      console.warn = originalWarn;
      mockDateNow.mockRestore();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle special characters in query', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: "O'Brien Jr." },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
    });

    it('should handle empty results', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'nonexistent' },
      });

      const result = await handler(event as APIGatewayProxyEvent);
      const response = JSON.parse(result.body);

      expect(response.data.results).toEqual([]);
      expect(response.data.total).toBe(0);
    });

    it('should handle zero offset', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', offset: '0' },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
    });

    it('should handle limit at boundary (100)', async () => {
      mockRepository.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const event = createMockEvent({
        queryStringParameters: { q: 'john', limit: '100' },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
    });
  });
});
