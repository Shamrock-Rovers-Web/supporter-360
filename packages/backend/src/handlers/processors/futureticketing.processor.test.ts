/**
 * Future Ticketing Event Processor Tests
 *
 * Tests for the Future Ticketing SQS event processor including:
 * - Customer event processing
 * - Order event processing with product mapping
 * - Entry event processing
 * - Supporter lookup by FT customer ID
 * - Idempotency checking
 * - Product meaning-based tagging
 * - Error handling and DLQ triggering
 *
 * @packageDocumentation
 */

import { handler } from './futureticketing.processor';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { query } from '../../db/connection';
import type { Supporter } from '@supporter360/shared';

// Mock the repositories
jest.mock('../../db/repositories/supporter.repository');
jest.mock('../../db/repositories/event.repository');
jest.mock('../../db/connection');

describe('Future Ticketing Event Processor', () => {
  let mockSupporterRepo: jest.Mocked<SupporterRepository>;
  let mockEventRepo: jest.Mocked<EventRepository>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupporterRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      updateLinkedIds: jest.fn(),
      update: jest.fn(),
      addEmailAlias: jest.fn(),
      search: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockEventRepo = {
      findByExternalId: jest.fn(),
      create: jest.fn(),
    } as any;

    mockQuery = jest.fn();

    (require('../../db/repositories/supporter.repository') as any).SupporterRepository = function () {
      return mockSupporterRepo;
    };
    (require('../../db/repositories/event.repository') as any).EventRepository = function () {
      return mockEventRepo;
    };
    (require('../../db/connection') as any).query = mockQuery;
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createSQSRecord = (overrides = {}): SQSRecord => ({
    messageId: 'msg-123',
    receiptHandle: 'receipt-123',
    body: '{}',
    attributes: {} as any,
    messageAttributes: {},
    md5OfBody: 'abc123',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
    awsRegion: 'us-east-1',
    ...overrides,
  });

  const createCustomerMessage = (overrides = {}): string => {
    const customer = {
      CustomerID: 'cust-123',
      Email: 'test@example.com',
      FirstName: 'John',
      LastName: 'Doe',
      Phone: '+1234567890',
      ...overrides,
    };

    return JSON.stringify({
      type: 'customer',
      data: customer,
    });
  };

  const createOrderMessage = (overrides = {}): string => {
    const order = {
      OrderID: 'order-123',
      CustomerID: 'cust-123',
      OrderDate: '2024-01-15T12:00:00Z',
      TotalAmount: 100,
      Status: 'confirmed',
      Items: [
        {
          ProductID: 'prod-123',
          CategoryID: 'cat-456',
          ProductName: 'Match Ticket',
          Quantity: 2,
          Price: 50,
        },
      ],
      ...overrides,
    };

    return JSON.stringify({
      type: 'order',
      data: order,
    });
  };

  const createEntryMessage = (overrides = {}): string => {
    const entry = {
      EntryID: 'entry-123',
      CustomerID: 'cust-123',
      EntryTime: '2024-01-15T15:30:00Z',
      EventID: 'event-456',
      EventName: 'Big Match',
      Gate: 'Gate A',
      ...overrides,
    };

    return JSON.stringify({
      type: 'entry',
      data: entry,
    });
  };

  const createMockSupporter = (overrides = {}): Supporter => ({
    supporter_id: 'supp-123',
    name: 'John Doe',
    primary_email: 'test@example.com',
    phone: '+1234567890',
    supporter_type: 'Member',
    supporter_type_source: 'auto',
    linked_ids: { futureticketing: 'cust-123' },
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  // ==========================================================================
  // Handler Tests
  // ==========================================================================

  describe('handler', () => {
    it('should process multiple SQS records', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const event: SQSEvent = {
        Records: [
          createSQSRecord({ body: createCustomerMessage() }),
          createSQSRecord({ body: createOrderMessage() }),
        ],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalled();
    });

    it('should log processing start and success', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter());
      mockSupporterRepo.addEmailAlias.mockResolvedValue({} as any);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createCustomerMessage() })],
      };

      await handler(event, {} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Processing 1 Future Ticketing messages'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully processed all Future Ticketing messages'));

      consoleLogSpy.mockRestore();
    });

    it('should throw error to trigger DLQ on processing failure', async () => {
      mockSupporterRepo.search.mockRejectedValue(new Error('Database error'));

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await expect(handler(event, {} as any)).rejects.toThrow('Database error');
    });

    it('should log unhandled message types', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const unknownMessage = JSON.stringify({
        type: 'unknown_type',
        data: {},
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: unknownMessage })],
      };

      await handler(event, {} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled Future Ticketing message type'));

      consoleLogSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Customer Processing Tests
  // ==========================================================================

  describe('customer processing', () => {
    it('should create new supporter from customer data', async () => {
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter());
      mockSupporterRepo.addEmailAlias.mockResolvedValue({} as any);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createCustomerMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: 'John Doe',
        primary_email: 'test@example.com',
        phone: '+1234567890',
        supporter_type: 'Unknown',
        supporter_type_source: 'auto',
        linked_ids: {
          futureticketing: 'cust-123',
        },
      });
      expect(mockSupporterRepo.addEmailAlias).toHaveBeenCalledWith('supp-123', 'test@example.com', false);
    });

    it('should skip if supporter already exists with FT customer ID', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createCustomerMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.create).not.toHaveBeenCalled();
    });

    it('should link FT customer ID to existing supporter by email', async () => {
      const supporter = createMockSupporter({
        linked_ids: {},
        supporter_type_source: 'manual',
      });
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockSupporterRepo.updateLinkedIds.mockResolvedValue({} as any);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createCustomerMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.updateLinkedIds).toHaveBeenCalledWith('supp-123', {
        futureticketing: 'cust-123',
      });
    });

    it('should skip when multiple supporters found for email', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockSupporterRepo.findByEmail.mockResolvedValue([
        createMockSupporter({ supporter_id: 'supp-1' }),
        createMockSupporter({ supporter_id: 'supp-2' }),
      ]);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createCustomerMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.create).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple supporters for email'));

      consoleWarnSpy.mockRestore();
    });

    it('should handle customer without email', async () => {
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter());
      mockSupporterRepo.addEmailAlias.mockResolvedValue({} as any);

      const customerWithoutEmail = createCustomerMessage({ Email: undefined });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: customerWithoutEmail })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          primary_email: null,
        })
      );
      expect(mockSupporterRepo.addEmailAlias).not.toHaveBeenCalled();
    });

    it('should handle customer without names', async () => {
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter());
      mockSupporterRepo.addEmailAlias.mockResolvedValue({} as any);

      const customerWithoutNames = createCustomerMessage({
        FirstName: undefined,
        LastName: undefined,
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: customerWithoutNames })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: null,
        })
      );
    });

    it('should handle customer without phone', async () => {
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter());
      mockSupporterRepo.addEmailAlias.mockResolvedValue({} as any);

      const customerWithoutPhone = createCustomerMessage({ Phone: undefined });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: customerWithoutPhone })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: null,
        })
      );
    });
  });

  // ==========================================================================
  // Order Processing Tests
  // ==========================================================================

  describe('order processing', () => {
    it('should create TicketPurchase event', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        source_system: 'futureticketing',
        event_type: 'TicketPurchase',
        event_time: new Date('2024-01-15T12:00:00Z'),
        external_id: 'ft-order-order-123',
        amount: 100,
        currency: 'EUR',
        metadata: {
          order_id: 'order-123',
          customer_id: 'cust-123',
          status: 'confirmed',
          items: [
            {
              ProductID: 'prod-123',
              CategoryID: 'cat-456',
              ProductName: 'Match Ticket',
              Quantity: 2,
              Price: 50,
            },
          ],
          product_meanings: [],
        },
        raw_payload_ref: null,
      });
    });

    it('should create supporter if not found for order', async () => {
      mockSupporterRepo.search
        .mockResolvedValueOnce({ results: [], total: 0 })
        .mockResolvedValueOnce({ results: [createMockSupporter()], total: 1 });
      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter());
      mockSupporterRepo.addEmailAlias.mockResolvedValue({} as any);
      mockSupporterRepo.findById.mockResolvedValue(createMockSupporter());
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const orderWithoutEmail = createOrderMessage();

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: orderWithoutEmail })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.create).toHaveBeenCalled();
      expect(mockEventRepo.create).toHaveBeenCalled();
    });

    it('should skip order if supporter cannot be found or created', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockSupporterRepo.findByEmail.mockResolvedValue([]);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not find or create supporter'));

      consoleWarnSpy.mockRestore();
    });

    it('should skip already processed orders', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue({ event_id: 'existing' } as any);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Entry Processing Tests
  // ==========================================================================

  describe('entry processing', () => {
    it('should create StadiumEntry event', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createEntryMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        source_system: 'futureticketing',
        event_type: 'StadiumEntry',
        event_time: new Date('2024-01-15T15:30:00Z'),
        external_id: 'ft-entry-entry-123',
        amount: null,
        currency: null,
        metadata: {
          entry_id: 'entry-123',
          customer_id: 'cust-123',
          event_id: 'event-456',
          event_name: 'Big Match',
          gate: 'Gate A',
        },
        raw_payload_ref: null,
      });
    });

    it('should skip entry if supporter not found', async () => {
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createEntryMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
    });

    it('should skip already processed entries', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue({ event_id: 'existing' } as any);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createEntryMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Product Mapping Tests
  // ==========================================================================

  describe('product mapping', () => {
    it('should look up product meaning for order items', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            category_id: null,
            meaning: 'SeasonTicket',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM future_ticketing_product_mapping'),
        ['prod-123', 'cat-456']
      );
    });

    it('should include product meanings in event metadata', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            category_id: null,
            meaning: 'SeasonTicket',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            product_meanings: ['SeasonTicket'],
          }),
        })
      );
    });

    it('should handle multiple items with different meanings', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            category_id: null,
            meaning: 'SeasonTicket',
            effective_from: new Date(),
            notes: null,
          },
          {
            id: 2,
            product_id: 'prod-456',
            category_id: null,
            meaning: 'AwaySupporter',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const orderWithMultipleItems = createOrderMessage({
        Items: [
          { ProductID: 'prod-123', CategoryID: 'cat-1' },
          { ProductID: 'prod-456', CategoryID: 'cat-2' },
        ],
      });

      const sqsEvent: SQSEvent = {
        Records: [createSQSRecord({ body: orderWithMultipleItems })],
      };

      await handler(sqsEvent, {} as any);

      const metadata = mockEventRepo.create.mock.calls[0][0].metadata;
      expect(metadata.product_meanings).toContain('SeasonTicket');
      expect(metadata.product_meanings).toContain('AwaySupporter');
    });
  });

  // ==========================================================================
  // Supporter Type Update Tests
  // ==========================================================================

  describe('supporter type updates', () => {
    it('should update supporter type to Season Ticket Holder', async () => {
      const supporter = createMockSupporter({ supporter_type: 'Unknown', supporter_type_source: 'auto' });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockSupporterRepo.update.mockResolvedValue({} as any);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            meaning: 'SeasonTicket',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.update).toHaveBeenCalledWith('supp-123', {
        supporter_type: 'Season Ticket Holder',
      });
    });

    it('should update supporter type to Away Supporter', async () => {
      const supporter = createMockSupporter({ supporter_type: 'Unknown', supporter_type_source: 'auto' });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockSupporterRepo.update.mockResolvedValue({} as any);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            meaning: 'AwaySupporter',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.update).toHaveBeenCalledWith('supp-123', {
        supporter_type: 'Away Supporter',
      });
    });

    it('should prioritize Season Ticket Holder over Away Supporter', async () => {
      const supporter = createMockSupporter({ supporter_type: 'Unknown', supporter_type_source: 'auto' });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockSupporterRepo.update.mockResolvedValue({} as any);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          { id: 1, product_id: 'prod-1', meaning: 'AwaySupporter', effective_from: new Date(), notes: null },
          { id: 2, product_id: 'prod-2', meaning: 'SeasonTicket', effective_from: new Date(), notes: null },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.update).toHaveBeenCalledWith('supp-123', {
        supporter_type: 'Season Ticket Holder',
      });
    });

    it('should not update type if source is manual', async () => {
      const supporter = createMockSupporter({
        supporter_type: 'VIP',
        supporter_type_source: 'manual',
      });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            meaning: 'SeasonTicket',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.update).not.toHaveBeenCalled();
    });

    it('should not update type if no product meanings found', async () => {
      const supporter = createMockSupporter({ supporter_type: 'Unknown', supporter_type_source: 'auto' });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Product Meaning Parsing Tests
  // ==========================================================================

  describe('product meaning parsing', () => {
    it('should parse "AwaySupporter" meaning', async () => {
      const supporter = createMockSupporter({ supporter_type: 'Unknown', supporter_type_source: 'auto' });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            meaning: 'away supporter',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      const metadata = mockEventRepo.create.mock.calls[0][0].metadata;
      expect(metadata.product_meanings).toContain('AwaySupporter');
    });

    it('should parse "SeasonTicket" meaning', async () => {
      const supporter = createMockSupporter({ supporter_type: 'Unknown', supporter_type_source: 'auto' });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            meaning: 'season ticket',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      const metadata = mockEventRepo.create.mock.calls[0][0].metadata;
      expect(metadata.product_meanings).toContain('SeasonTicket');
    });

    it('should parse "HomeTicket" meaning', async () => {
      const supporter = createMockSupporter({ supporter_type: 'Unknown', supporter_type_source: 'auto' });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            meaning: 'home ticket',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      const metadata = mockEventRepo.create.mock.calls[0][0].metadata;
      expect(metadata.product_meanings).toContain('HomeTicket');
    });

    it('should return "Other" for unknown meanings', async () => {
      const supporter = createMockSupporter({ supporter_type: 'Unknown', supporter_type_source: 'auto' });
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-123',
            meaning: 'merchandise',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      const metadata = mockEventRepo.create.mock.calls[0][0].metadata;
      expect(metadata.product_meanings).toContain('Other');
    });
  });

  // ==========================================================================
  // Supporter Lookup Tests
  // ==========================================================================

  describe('supporter lookup', () => {
    it('should find supporter by FT customer ID', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.search).toHaveBeenCalledWith({
        query: 'cust-123',
        field: 'all',
        limit: 100,
      });
    });

    it('should return null when no supporter found', async () => {
      mockSupporterRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      // Should skip order processing
      expect(mockEventRepo.create).not.toHaveBeenCalled();
    });

    it('should get full supporter profile after search', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({
        results: [{ supporter_id: 'supp-123', linked_ids: { futureticketing: 'cust-123' } }],
        total: 1,
      });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.findById).toHaveBeenCalledWith('supp-123');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSupporterRepo.search.mockRejectedValue(new Error('Database connection failed'));

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await expect(handler(event, {} as any)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing Future Ticketing message'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed message body', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: 'invalid json{' })],
      };

      await expect(handler(event, {} as any)).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should handle repository errors gracefully', async () => {
      mockSupporterRepo.search.mockResolvedValue({ results: [createMockSupporter()], total: 1 });
      mockSupporterRepo.findById.mockRejectedValue(new Error('Supporter lookup failed'));

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createOrderMessage() })],
      };

      await expect(handler(event, {} as any)).rejects.toThrow('Supporter lookup failed');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle order without items', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const orderWithoutItems = createOrderMessage({
        Items: undefined,
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: orderWithoutItems })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            product_meanings: [],
          }),
        })
      );
    });

    it('should handle order with empty items array', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const orderWithEmptyItems = createOrderMessage({
        Items: [],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: orderWithEmptyItems })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            product_meanings: [],
          }),
        })
      );
    });

    it('should handle order without total amount', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const orderWithoutAmount = createOrderMessage({
        TotalAmount: undefined,
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: orderWithoutAmount })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: null,
        })
      );
    });

    it('should handle order without status', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const orderWithoutStatus = createOrderMessage({
        Status: undefined,
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: orderWithoutStatus })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: undefined,
          }),
        })
      );
    });

    it('should handle entry without optional fields', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);

      const entryWithoutOptionals = createEntryMessage({
        EventID: undefined,
        EventName: undefined,
        Gate: undefined,
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: entryWithoutOptionals })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            event_id: undefined,
            event_name: undefined,
            gate: undefined,
          }),
        })
      );
    });

    it('should handle order item without ProductID and CategoryID', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const orderWithIncompleteItem = createOrderMessage({
        Items: [{ Quantity: 1 }],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: orderWithIncompleteItem })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalled();
    });

    it('should handle product lookup with only category ID', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: null,
            category_id: 'cat-456',
            meaning: 'SeasonTicket',
            effective_from: new Date(),
            notes: null,
          },
        ],
      });

      const orderWithOnlyCategory = createOrderMessage({
        Items: [{ CategoryID: 'cat-456' }],
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: orderWithOnlyCategory })],
      };

      await handler(event, {} as any);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [null, 'cat-456']);
    });

    it('should handle missing S3 key', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.search.mockResolvedValue({ results: [supporter], total: 1 });
      mockSupporterRepo.findById.mockResolvedValue(supporter);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [] });

      const message = JSON.stringify({
        type: 'order',
        data: {
          OrderID: 'order-123',
          CustomerID: 'cust-123',
          OrderDate: '2024-01-15T12:00:00Z',
        },
        s3Key: undefined,
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: message })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          raw_payload_ref: null,
        })
      );
    });
  });
});
