/**
 * Timeline API Handler Tests
 *
 * Tests for the timeline endpoint including:
 * - Timeline event retrieval
 * - Filtering by event types
 * - Pagination
 * - Date range filtering
 * - Error handling
 *
 * @packageDocumentation
 */

import { handler } from './timeline.handler';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { EventRepository } from '../../db/repositories/event.repository';
import { SupporterNotFoundError } from '../../db/repositories/supporter.repository';

// Mock the repositories
jest.mock('../../db/repositories/event.repository');
jest.mock('../../db/repositories/supporter.repository');
jest.mock('../../middleware/auth');

describe('Timeline API Handler', () => {
  let mockEventRepository: jest.Mocked<EventRepository>;
  let mockRequireAuth: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventRepository = {
      findBySupporterId: jest.fn(),
      getCount: jest.fn(),
    } as any;
    (require('../../db/repositories/event.repository') as any).EventRepository = function () {
      return mockEventRepository;
    };

    // Mock auth middleware
    mockRequireAuth = jest.fn().mockImplementation((fn) => async (event: any) => {
      return fn(event, { role: 'staff', keyName: 'test-key' });
    });
    (require('../../middleware/auth') as any).requireAuth = mockRequireAuth;
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

  const createMockTimelineEvent = (overrides = {}) => ({
    event_id: 'evt-123',
    supporter_id: 'supp-123',
    source_system: 'shopify',
    event_type: 'ShopOrder',
    event_time: new Date('2024-01-15T12:00:00Z'),
    external_id: 'shop-123',
    amount: 50,
    currency: 'EUR',
    metadata: {},
    created_at: new Date(),
    ...overrides,
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('validation', () => {
    it('should reject request with missing supporter ID', async () => {
      const event = createMockEvent({
        pathParameters: {},
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.success).toBe(false);
      expect(response.code).toBe('MISSING_SUPPORTER_ID');
    });

    it('should reject request with empty supporter ID', async () => {
      const event = createMockEvent({
        pathParameters: { id: '' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.code).toBe('MISSING_SUPPORTER_ID');
    });
  });

  // ==========================================================================
  // Event Retrieval Tests
  // ==========================================================================

  describe('event retrieval', () => {
    it('should return timeline events for a supporter', async () => {
      const mockEvents = [createMockTimelineEvent()];
      mockEventRepository.findBySupporterId.mockResolvedValue(mockEvents);
      mockEventRepository.getCount.mockResolvedValue(1);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.success).toBe(true);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          limit: 100,
          offset: 0,
        })
      );

      expect(response.data.events).toHaveLength(1);
      expect(response.data.events[0].event_id).toBe('evt-123');
    });

    it('should include supporter_id in response', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.supporter_id).toBe('supp-123');
    });

    it('should return empty timeline for supporter with no events', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.events).toEqual([]);
      expect(response.data.total).toBe(0);
    });
  });

  // ==========================================================================
  // Event Type Filtering Tests
  // ==========================================================================

  describe('event type filtering', () => {
    it('should filter by single event type using "type" param', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { type: 'ShopOrder' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          event_types: ['ShopOrder'],
        })
      );
    });

    it('should filter by single event type using "types" param', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { types: 'TicketPurchase' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          event_types: ['TicketPurchase'],
        })
      );
    });

    it('should filter by multiple event types', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { types: 'ShopOrder,TicketPurchase,StadiumEntry' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          event_types: ['ShopOrder', 'TicketPurchase', 'StadiumEntry'],
        })
      );
    });

    it('should ignore invalid event types', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { types: 'ShopOrder,InvalidType,PaymentEvent' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      const types = mockEventRepository.findBySupporterId.mock.calls[0][1].event_types;
      expect(types).toEqual(['ShopOrder', 'PaymentEvent']);
    });

    it('should not filter if no valid types provided', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { types: 'InvalidType,AnotherInvalid' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      const filters = mockEventRepository.findBySupporterId.mock.calls[0][1];
      expect(filters.event_types).toBeUndefined();
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================

  describe('pagination', () => {
    it('should apply custom limit', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { limit: '50' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          limit: 50,
          offset: 0,
        })
      );
    });

    it('should apply custom offset', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { offset: '100' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          limit: 100,
          offset: 100,
        })
      );
    });

    it('should use default limit of 100', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          limit: 100,
          offset: 0,
        })
      );
    });

    it('should cap limit at MAX_LIMIT (500)', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { limit: '1000' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          limit: 500,
        })
      );
    });

    it('should return has_more when more results exist', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([{}, {}, {}]);
      mockEventRepository.getCount.mockResolvedValue(103);

      const event = createMockEvent({
        queryStringParameters: { limit: '100', offset: '0' },
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.has_more).toBe(true);
    });

    it('should return has_more false when no more results', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([{}, {}]);
      mockEventRepository.getCount.mockResolvedValue(2);

      const event = createMockEvent({
        queryStringParameters: { limit: '100', offset: '0' },
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.has_more).toBe(false);
    });

    it('should include pagination params in response', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { limit: '25', offset: '50' },
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.limit).toBe(25);
      expect(response.data.offset).toBe(50);
    });
  });

  // ==========================================================================
  // Date Range Filtering Tests
  // ==========================================================================

  describe('date range filtering', () => {
    it('should filter by start_date', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const startDate = '2024-01-01T00:00:00Z';
      const event = createMockEvent({
        queryStringParameters: { start_date: startDate },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          start_date: new Date(startDate),
        })
      );
    });

    it('should filter by end_date', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const endDate = '2024-12-31T23:59:59Z';
      const event = createMockEvent({
        queryStringParameters: { end_date: endDate },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          end_date: new Date(endDate),
        })
      );
    });

    it('should filter by both start and end date', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: {
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-12-31T23:59:59Z',
        },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockEventRepository.findBySupporterId).toHaveBeenCalledWith(
        'supp-123',
        expect.objectContaining({
          start_date: new Date('2024-01-01T00:00:00Z'),
          end_date: new Date('2024-12-31T23:59:59Z'),
        })
      );
    });

    it('should include applied filters in response', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: {
          types: 'ShopOrder',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-12-31T23:59:59Z',
        },
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.filters.event_types).toEqual(['ShopOrder']);
      expect(response.data.filters.start_date).toBe('2024-01-01T00:00:00.000Z');
      expect(response.data.filters.end_date).toBe('2024-12-31T23:59:59.000Z');
    });

    it('should include null filters when none applied', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.filters.event_types).toBeNull();
      expect(response.data.filters.start_date).toBeNull();
      expect(response.data.filters.end_date).toBeNull();
    });
  });

  // ==========================================================================
  // Response Format Tests
  // ==========================================================================

  describe('response format', () => {
    it('should format timeline events correctly', async () => {
      const mockEvents = [createMockTimelineEvent()];
      mockEventRepository.findBySupporterId.mockResolvedValue(mockEvents);
      mockEventRepository.getCount.mockResolvedValue(1);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.events[0]).toEqual({
        event_id: 'evt-123',
        supporter_id: 'supp-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: '2024-01-15T12:00:00.000Z',
        external_id: 'shop-123',
        amount: 50,
        currency: 'EUR',
        metadata: {},
        created_at: expect.any(String),
      });
    });

    it('should convert dates to ISO strings', async () => {
      const mockEvents = [createMockTimelineEvent()];
      mockEventRepository.findBySupporterId.mockResolvedValue(mockEvents);
      mockEventRepository.getCount.mockResolvedValue(1);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.events[0].event_time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return total count', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(42);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.total).toBe(42);
    });

    it('should return success response structure', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

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
      mockEventRepository.findBySupporterId.mockRejectedValue(new Error('Database error'));

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(500);
      expect(response.success).toBe(false);
      expect(response.code).toBe('TIMELINE_ERROR');
      expect(response.details.message).toBe('Database error');
    });

    it('should handle SupporterNotFoundError from repositories', async () => {
      mockEventRepository.findBySupporterId.mockRejectedValue(
        new SupporterNotFoundError('supp-123')
      );
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(response.code).toBe('SUPPORTER_NOT_FOUND');
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockEventRepository.findBySupporterId.mockRejectedValue(new Error('Test error'));

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle zero limit', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { limit: '0' },
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
      // Default limit is used when 0 is provided (via Math.max with DEFAULT_LIMIT)
    });

    it('should handle very large offset', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { offset: '99999' },
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });

    it('should handle invalid date formats gracefully', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { start_date: 'invalid-date' },
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      // Should still parse as a date (even if invalid)
      expect(result.statusCode).toBe(200);
    });

    it('should handle special characters in supporter ID', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123/with-slashes' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });

    it('should handle comma-separated event types with spaces', async () => {
      mockEventRepository.findBySupporterId.mockResolvedValue([]);
      mockEventRepository.getCount.mockResolvedValue(0);

      const event = createMockEvent({
        queryStringParameters: { types: 'ShopOrder, TicketPurchase , StadiumEntry' },
        pathParameters: { id: 'supp-123' },
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      const types = mockEventRepository.findBySupporterId.mock.calls[0][1].event_types;
      expect(types).toEqual(['ShopOrder', 'TicketPurchase', 'StadiumEntry']);
    });
  });
});
