/**
 * Event Repository Tests
 *
 * Comprehensive tests for the EventRepository including:
 * - CRUD operations
 * - Timeline queries
 * - Bulk operations
 * - Supporter reassignment
 * - Event counting
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EventRepository, EventNotFoundError } from './event.repository';
import type { Event, TimelineEvent, EventType, SourceSystem } from '@supporter360/shared';

// Mock the connection module
const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../connection', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

import { query, transaction } from '../connection';

describe('EventRepository', () => {
  let repository: EventRepository;

  beforeEach(() => {
    mockQuery.mockClear();
    mockTransaction.mockClear();
    repository = new EventRepository();
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createMockEvent = (overrides?: Partial<Event>): Event => ({
    event_id: '123e4567-e89b-12d3-a456-426614174000',
    supporter_id: 'supporter-123',
    source_system: 'shopify',
    event_type: 'ShopOrder',
    event_time: new Date('2024-01-01T12:00:00Z'),
    external_id: 'shopify-order-123',
    amount: 100.50,
    currency: 'EUR',
    metadata: { order_id: '123' },
    raw_payload_ref: 's3://bucket/key.json',
    created_at: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  });

  // ==========================================================================
  // CRUD Operations Tests
  // ==========================================================================

  describe('create', () => {
    it('should create a new event with generated ID', async () => {
      const mockEvent = createMockEvent();
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      const result = await repository.create({
        supporter_id: 'supporter-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: new Date(),
        external_id: 'order-123',
        amount: 50,
        currency: 'EUR',
        metadata: {},
      });

      expect(result).toEqual(mockEvent);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO event'),
        expect.arrayContaining([
          expect.any(String), // event_id (UUID)
          'supporter-123',
          'shopify',
          'ShopOrder',
          expect.any(Date),
          'order-123',
          50,
          'EUR',
          expect.stringContaining('{}'), // metadata JSON
          null, // raw_payload_ref
          expect.any(Date),
        ])
      );
    });

    it('should use upsert logic to prevent duplicate events', async () => {
      const mockEvent = createMockEvent();
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      await repository.create({
        supporter_id: 'supporter-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: new Date(),
        external_id: 'order-123',
        amount: 50,
        currency: 'EUR',
        metadata: {},
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (source_system, external_id)'),
        expect.any(Array)
      );
    });

    it('should create event with provided ID', async () => {
      const providedId = 'custom-event-uuid';
      const mockEvent = createMockEvent({ event_id: providedId });
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      const result = await repository.create({
        event_id: providedId,
        supporter_id: 'supporter-123',
        source_system: 'stripe',
        event_type: 'PaymentEvent',
        event_time: new Date(),
        external_id: 'pi-123',
        amount: 25,
        currency: 'EUR',
        metadata: {},
      });

      expect(result.event_id).toBe(providedId);
    });

    it('should serialize metadata as JSON', async () => {
      const mockEvent = createMockEvent({
        metadata: { order_id: '123', items: ['item1', 'item2'] },
      });
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      await repository.create({
        supporter_id: 'supporter-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: new Date(),
        metadata: { order_id: '123', items: ['item1', 'item2'] },
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][9]).toBe('{"order_id":"123","items":["item1","item2"]}');
    });

    it('should handle null amount and currency', async () => {
      const mockEvent = createMockEvent({ amount: null, currency: null });
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      await repository.create({
        supporter_id: 'supporter-123',
        source_system: 'mailchimp',
        event_type: 'EmailClick',
        event_time: new Date(),
        external_id: 'click-123',
        metadata: {},
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][7]).toBeNull(); // amount
      expect(callArgs[1][8]).toBeNull(); // currency
    });
  });

  // ==========================================================================
  // Find Operations Tests
  // ==========================================================================

  describe('findById', () => {
    it('should find an event by ID', async () => {
      const mockEvent = createMockEvent();
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      const result = await repository.findById('event-123');

      expect(result).toEqual(mockEvent);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM event WHERE event_id = $1',
        ['event-123']
      );
    });

    it('should return null if event not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findBySupporterId', () => {
    it('should find all events for a supporter', async () => {
      const mockEvents = [
        createMockEvent({ event_id: 'event-1' }),
        createMockEvent({ event_id: 'event-2' }),
      ];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await repository.findBySupporterId('supporter-123');

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE supporter_id = $1'),
        expect.arrayContaining(['supporter-123'])
      );
    });

    it('should filter by event types', async () => {
      const mockEvents = [createMockEvent({ event_type: 'ShopOrder' })];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      await repository.findBySupporterId('supporter-123', {
        event_types: ['ShopOrder', 'TicketPurchase'],
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('event_type = ANY($'),
        expect.arrayContaining(['supporter-123', ['ShopOrder', 'TicketPurchase']])
      );
    });

    it('should filter by date range', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await repository.findBySupporterId('supporter-123', {
        start_date: startDate,
        end_date: endDate,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('event_time >= $'),
        expect.arrayContaining(['supporter-123', startDate, endDate])
      );
    });

    it('should apply limit and offset', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      await repository.findBySupporterId('supporter-123', {
        limit: 50,
        offset: 100,
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toContain(50);
      expect(callArgs[1]).toContain(100);
    });

    it('should return events ordered by event_time DESC', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      await repository.findBySupporterId('supporter-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY event_time DESC'),
        expect.any(Array)
      );
    });
  });

  describe('findByExternalId', () => {
    it('should find event by source system and external ID', async () => {
      const mockEvent = createMockEvent({
        source_system: 'shopify',
        external_id: 'shopify-order-123',
      });
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      const result = await repository.findByExternalId('shopify', 'shopify-order-123');

      expect(result).toEqual(mockEvent);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM event WHERE source_system = $1 AND external_id = $2',
        ['shopify', 'shopify-order-123']
      );
    });

    it('should return null if not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByExternalId('shopify', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Timeline Operations Tests
  // ==========================================================================

  describe('getTimeline', () => {
    it('should return timeline events for a supporter', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await repository.getTimeline({
        supporter_id: 'supporter-123',
      });

      expect(result).toEqual(mockEvents);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE supporter_id = $1'),
        expect.arrayContaining(['supporter-123'])
      );
    });

    it('should filter timeline by event types', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      await repository.getTimeline({
        supporter_id: 'supporter-123',
        event_types: ['ShopOrder', 'PaymentEvent'],
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('event_type = ANY($'),
        expect.arrayContaining(['supporter-123', ['ShopOrder', 'PaymentEvent']])
      );
    });

    it('should filter timeline by date range', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await repository.getTimeline({
        supporter_id: 'supporter-123',
        start_date: startDate,
        end_date: endDate,
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toContain(startDate);
      expect(callArgs[1]).toContain(endDate);
    });

    it('should apply pagination to timeline', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      await repository.getTimeline({
        supporter_id: 'supporter-123',
        limit: 50,
        offset: 0,
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toContain(50);
      expect(callArgs[1]).toContain(0);
    });

    it('should use default limit of 100', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      await repository.getTimeline({
        supporter_id: 'supporter-123',
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toContain(100);
    });
  });

  // ==========================================================================
  // Type-Specific Query Tests
  // ==========================================================================

  describe('getTicketPurchases', () => {
    it('should return ticket purchase events', async () => {
      const mockEvents = [
        createMockEvent({ event_type: 'TicketPurchase' }),
        createMockEvent({ event_type: 'TicketPurchase' }),
      ];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await repository.getTicketPurchases('supporter-123');

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('event_type = $2'),
        ['supporter-123', 'TicketPurchase', 50]
      );
    });

    it('should use custom limit', async () => {
      const mockEvents = [createMockEvent()];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      await repository.getTicketPurchases('supporter-123', 25);

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][2]).toBe(25);
    });
  });

  describe('getShopOrders', () => {
    it('should return shop order events', async () => {
      const mockEvents = [createMockEvent({ event_type: 'ShopOrder' })];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await repository.getShopOrders('supporter-123');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('event_type = $2'),
        ['supporter-123', 'ShopOrder', 50]
      );
    });
  });

  describe('getStadiumEntries', () => {
    it('should return stadium entry events', async () => {
      const mockEvents = [createMockEvent({ event_type: 'StadiumEntry' })];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await repository.getStadiumEntries('supporter-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('getPaymentEvents', () => {
    it('should return payment events', async () => {
      const mockEvents = [createMockEvent({ event_type: 'PaymentEvent' })];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await repository.getPaymentEvents('supporter-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('getEmailClicks', () => {
    it('should return email click events', async () => {
      const mockEvents = [createMockEvent({ event_type: 'EmailClick' })];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await repository.getEmailClicks('supporter-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('getMembershipEvents', () => {
    it('should return membership events', async () => {
      const mockEvents = [createMockEvent({ event_type: 'MembershipEvent' })];
      mockQuery.mockResolvedValue({ rows: mockEvents });

      const result = await repository.getMembershipEvents('supporter-123');

      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Bulk Operations Tests
  // ==========================================================================

  describe('bulkCreate', () => {
    it('should create multiple events in a transaction', async () => {
      const mockEvents = [
        createMockEvent({ event_id: 'event-1' }),
        createMockEvent({ event_id: 'event-2' }),
        createMockEvent({ event_id: 'event-3' }),
      ];

      const mockClient = {
        query: jest.fn(() =>
          Promise.resolve({ rows: [mockEvents[0]] }))
          .mockResolvedValueOnce({ rows: [mockEvents[0]] })
          .mockResolvedValueOnce({ rows: [mockEvents[1]] })
          .mockResolvedValueOnce({ rows: [mockEvents[2]] }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      const eventsToCreate = mockEvents.map(e => ({
        supporter_id: e.supporter_id,
        source_system: e.source_system as SourceSystem,
        event_type: e.event_type as EventType,
        event_time: e.event_time,
        external_id: e.external_id,
        amount: e.amount,
        currency: e.currency,
        metadata: e.metadata,
      }));

      const result = await repository.bulkCreate(eventsToCreate);

      expect(result).toHaveLength(3);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should use upsert logic for bulk create', async () => {
      const mockClient = {
        query: jest.fn(() =>
          Promise.resolve({ rows: [createMockEvent()] })),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await repository.bulkCreate([{
        supporter_id: 'supporter-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: new Date(),
        external_id: 'order-123',
        metadata: {},
      }]);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (source_system, external_id)'),
        expect.any(Array)
      );
    });

    it('should handle empty array', async () => {
      const mockClient = {
        query: jest.fn(() =>
          Promise.resolve({ rows: [] })),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      const result = await repository.bulkCreate([]);

      expect(result).toEqual([]);
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Supporter Reassignment Tests
  // ==========================================================================

  describe('updateSupporterId', () => {
    it('should update event supporter ID', async () => {
      const mockEvent = createMockEvent({ supporter_id: 'new-supporter' });
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      const result = await repository.updateSupporterId('event-123', 'new-supporter');

      expect(result.supporter_id).toBe('new-supporter');
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE event SET supporter_id = $1 WHERE event_id = $2 RETURNING *',
        ['new-supporter', 'event-123']
      );
    });

    it('should throw EventNotFoundError if event not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        repository.updateSupporterId('nonexistent', 'new-supporter')
      ).rejects.toThrow(EventNotFoundError);
    });
  });

  describe('bulkUpdateSupporterId', () => {
    it('should update multiple events supporter IDs', async () => {
      mockQuery.mockResolvedValue({ rowCount: 3 });

      const result = await repository.bulkUpdateSupporterId(
        ['event-1', 'event-2', 'event-3'],
        'new-supporter'
      );

      expect(result).toBe(3);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE event SET supporter_id = $1 WHERE event_id = ANY($2)',
        ['new-supporter', ['event-1', 'event-2', 'event-3']]
      );
    });

    it('should return 0 for empty array', async () => {
      const result = await repository.bulkUpdateSupporterId([], 'new-supporter');

      expect(result).toBe(0);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('reassignAllToSupporter', () => {
    it('should reassign all events from one supporter to another', async () => {
      mockQuery.mockResolvedValue({ rowCount: 5 });

      const result = await repository.reassignAllToSupporter('source-supporter', 'target-supporter');

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE event SET supporter_id = $1 WHERE supporter_id = $2',
        ['target-supporter', 'source-supporter']
      );
    });

    it('should return 0 if no events reassigned', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repository.reassignAllToSupporter('source', 'target');

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // Count Operations Tests
  // ==========================================================================

  describe('getCount', () => {
    it('should count all events for a supporter', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await repository.getCount('supporter-123');

      expect(result).toBe(42);
    });

    it('should count events filtered by type', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '10' }] });

      const result = await repository.getCount('supporter-123', {
        event_types: ['ShopOrder', 'TicketPurchase'],
      });

      expect(result).toBe(10);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('event_type = ANY($'),
        expect.any(Array)
      );
    });

    it('should count events filtered by date range', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '15' }] });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await repository.getCount('supporter-123', {
        start_date: startDate,
        end_date: endDate,
      });

      expect(result).toBe(15);
    });

    it('should return 0 for supporter with no events', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await repository.getCount('supporter-123');

      expect(result).toBe(0);
    });
  });

  describe('getLastEvent', () => {
    it('should return the most recent event of a type', async () => {
      const mockEvent = createMockEvent();
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      const result = await repository.getLastEvent('supporter-123', 'ShopOrder');

      expect(result).toEqual(mockEvent);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY event_time DESC LIMIT 1'),
        ['supporter-123', 'ShopOrder']
      );
    });

    it('should return null if no event of that type exists', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getLastEvent('supporter-123', 'StadiumEntry');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Deletion Tests
  // ==========================================================================

  describe('delete', () => {
    it('should delete an event by ID', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repository.delete('event-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM event WHERE event_id = $1',
        ['event-123']
      );
    });

    it('should return false if event not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteAllForSupporter', () => {
    it('should delete all events for a supporter', async () => {
      mockQuery.mockResolvedValue({ rowCount: 10 });

      const result = await repository.deleteAllForSupporter('supporter-123');

      expect(result).toBe(10);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM event WHERE supporter_id = $1',
        ['supporter-123']
      );
    });

    it('should return 0 if no events to delete', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repository.deleteAllForSupporter('supporter-123');

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle special characters in metadata', async () => {
      const mockEvent = createMockEvent({
        metadata: { name: "O'Brien", note: 'Test "quoted" string' },
      });
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      await repository.create({
        supporter_id: 'supporter-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: new Date(),
        metadata: { name: "O'Brien", note: 'Test "quoted" string' },
      });

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should handle very large amounts', async () => {
      const mockEvent = createMockEvent({ amount: 999999.99 });
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      await repository.create({
        supporter_id: 'supporter-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: new Date(),
        amount: 999999.99,
        currency: 'EUR',
        metadata: {},
      });

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should handle dates at millisecond precision', async () => {
      const preciseDate = new Date('2024-01-01T12:34:56.789Z');
      const mockEvent = createMockEvent({ event_time: preciseDate });
      mockQuery.mockResolvedValue({ rows: [mockEvent] });

      await repository.create({
        supporter_id: 'supporter-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: preciseDate,
        metadata: {},
      });

      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
