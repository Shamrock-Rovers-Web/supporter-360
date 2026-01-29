/**
 * Shopify Event Processor Tests
 *
 * Tests for Shopify SQS event processor including:
 * - Idempotency (duplicate events handled correctly)
 * - Supporter matching logic
 * - Event creation
 * - Error handling
 *
 * @packageDocumentation
 */

import { handler } from './shopify.processor';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';

// Mock all dependencies
jest.mock('../../db/repositories/supporter.repository');
jest.mock('../../db/repositories/event.repository');

describe('Shopify Event Processor', () => {
  let mockSupporterRepo: jest.Mocked<SupporterRepository>;
  let mockEventRepo: jest.Mocked<EventRepository>;
  let mockS3Client: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SupporterRepository
    mockSupporterRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateLinkedIds: jest.fn(),
      addEmailAlias: jest.fn(),
    } as any;
    (require('../../db/repositories/supporter.repository') as any).SupporterRepository = function () {
      return mockSupporterRepo;
    };

    // Mock EventRepository
    mockEventRepo = {
      create: jest.fn(),
      findByExternalId: jest.fn(),
    } as any;
    (require('../../db/repositories/event.repository') as any).EventRepository = function () {
      return mockEventRepo;
    };

    // Mock S3 client
    mockS3Client = {
      send: jest.fn().mockResolvedValue({
        Body: {
          transformToString: jest.fn().mockResolvedValue(
            JSON.stringify({ id: 123, email: 'test@example.com' })
          ),
        },
      }),
    };
    jest.mock('@aws-sdk/client-s3', () => ({
      S3Client: jest.fn().mockImplementation(() => mockS3Client),
      GetObjectCommand: jest.fn(),
    }));
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createSQSMessage = (topic: string, payload: any = {}) => ({
    topic,
    domain: 'test-shop.myshopify.com',
    payload: {
      id: '123',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...payload,
    },
  });

  const createSQSEvent = (messages: any[]) => ({
    Records: messages.map((msg, i) => ({
      messageId: `msg-${i}`,
      receiptHandle: `handle-${i}`,
      body: JSON.stringify(msg),
      attributes: {},
    })),
  });

  // ==========================================================================
  // General Handler Tests
  // ==========================================================================

  describe('handler', () => {
    it('should process multiple messages', async () => {
      const messages = [
        createSQSMessage('orders/create', { id: 'order-1' }),
        createSQSMessage('orders/create', { id: 'order-2' }),
      ];

      // Setup mocks for successful processing
      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({
        supporter_id: 'supp-123',
        primary_email: 'test@example.com',
      });
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await expect(handler(event)).resolves.not.toThrow();
      expect(mockEventRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should log message count', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const messages = [
        createSQSMessage('orders/create'),
        createSQSMessage('customers/create'),
        createSQSMessage('customers/update'),
      ];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({});
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing 3 Shopify webhook messages')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed all')
      );

      consoleLogSpy.mockRestore();
    });

    it('should re-throw on error to trigger DLQ', async () => {
      const messages = [
        createSQSMessage('orders/create', { id: 'order-1' }),
      ];

      mockSupporterRepo.findByEmail.mockRejectedValue(new Error('Database error'));

      const event = createSQSEvent(messages);

      await expect(handler(event)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Orders Event Processing Tests
  // ==========================================================================

  describe('orders/create processing', () => {
    it('should create new supporter for order with unknown email', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'newcustomer@example.com',
        customer: {
          id: 'cust-123',
          first_name: 'Jane',
          last_name: 'Doe',
        },
        total_price: '75.00',
        currency: 'EUR',
        line_items: [
          { id: 'li-1', title: 'Product 1', quantity: 1, price: '25.00' },
        ],
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({
        supporter_id: 'supp-new',
        primary_email: 'newcustomer@example.com',
      });
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: 'Jane Doe',
        primary_email: 'newcustomer@example.com',
        phone: null,
        supporter_type: 'Shop Buyer',
        supporter_type_source: 'auto',
        linked_ids: { shopify: 'cust-123' },
      });
      expect(mockSupporterRepo.addEmailAlias).toHaveBeenCalledWith(
        'supp-new',
        'newcustomer@example.com',
        false
      );
    });

    it('should link to existing supporter by email', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'existing@example.com',
        customer: { id: 'cust-456' },
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-existing',
        linked_ids: {},
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).not.toHaveBeenCalled();
      expect(mockEventRepo.create).toHaveBeenCalledWith({
        supporter_id: 'supp-existing',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        external_id: 'shopify-order-order-123',
      });
    });

    it('should update linked_ids if customer ID is new', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'existing@example.com',
        customer: { id: 'cust-new' },
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-existing',
        linked_ids: {}, // No Shopify ID yet
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});
      mockSupporterRepo.updateLinkedIds.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.updateLinkedIds).toHaveBeenCalledWith(
        'supp-existing',
        { shopify: 'cust-new' }
      );
    });

    it('should skip orders without email', async () => {
      const orderPayload = {
        id: 'order-123',
        // No email
        line_items: [],
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSupporterRepo.findByEmail.mockResolvedValue([]);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Order without email')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Idempotency Tests
  // ==========================================================================

  describe('idempotency', () => {
    it('should skip creating event if already processed', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue({
        event_id: 'existing-evt',
      }); // Already exists
      mockEventRepo.create.mockResolvedValue({});

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already processed')
      );

      consoleLogSpy.mockRestore();
    });

    it('should use unique external ID for idempotency', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          external_id: 'shopify-order-order-123',
        })
      );
    });

    it('should process orders/paid', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
        financial_status: 'paid',
      };

      const messages = [createSQSMessage('orders/paid', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'ShopOrder',
          metadata: expect.objectContaining({
            topic: 'orders/paid',
          }),
        })
      );
    });

    it('should process orders/fulfilled', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
        fulfillment_status: 'fulfilled',
      };

      const messages = [createSQSMessage('orders/fulfilled', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'ShopOrder',
          metadata: expect.objectContaining({
            topic: 'orders/fulfilled',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Customer Create Processing Tests
  // ==========================================================================

  describe('customers/create processing', () => {
    it('should create new supporter from customer', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'new@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: '+353871234567',
      };

      const messages = [createSQSMessage('customers/create', customerPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({
        supporter_id: 'supp-new',
      });
      mockEventRepo.create.mockResolvedValue({});
      mockSupporterRepo.addEmailAlias.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: 'Test User',
        primary_email: 'new@example.com',
        phone: '+353871234567',
        supporter_type: 'Shop Buyer',
        supporter_type_source: 'auto',
        linked_ids: { shopify: 'cust-123' },
      });
    });

    it('should handle missing customer name', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'no-name@example.com',
        // No first_name/last_name
      };

      const messages = [createSQSMessage('customers/create', customerPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({
        supporter_id: 'supp-new',
      });
      mockEventRepo.create.mockResolvedValue({});
      mockSupporterRepo.addEmailAlias.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: null,
        primary_email: 'no-name@example.com',
      });
    });

    it('should update existing supporter with Shopify ID', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'existing@example.com',
      };

      const messages = [createSQSMessage('customers/create', customerPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-existing',
        linked_ids: {}, // No Shopify ID yet
      }]);
      mockSupporterRepo.updateLinkedIds.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.updateLinkedIds).toHaveBeenCalledWith(
        'supp-existing',
        { shopify: 'cust-123' }
      );
    });

    it('should flag multiple supporters with same email', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'shared@example.com',
      };

      const messages = [createSQSMessage('customers/create', customerPayload)];

      // Multiple supporters found
      mockSupporterRepo.findByEmail.mockResolvedValue([
        { supporter_id: 'supp-1', flags: {}, linked_ids: {} },
        { supporter_id: 'supp-2', flags: {}, linked_ids: {} },
      ]);
      mockSupporterRepo.update.mockResolvedValue({});

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple supporters')
      );
      expect(mockSupporterRepo.update).toHaveBeenCalledTimes(2);

      consoleWarnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Customer Update Processing Tests
  // ==========================================================================

  describe('customers/update processing', () => {
    it('should update existing supporter details', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'existing@example.com',
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+353879999999',
      };

      const messages = [createSQSMessage('customers/update', customerPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-existing',
        name: null, // No name yet
        phone: null, // No phone yet
        linked_ids: {},
      }]);
      mockSupporterRepo.update.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.update).toHaveBeenCalledWith(
        'supp-existing',
        expect.objectContaining({
          name: 'Updated Name',
          phone: '+353879999999',
          linked_ids: { shopify: 'cust-123' },
        })
      );
    });

    it('should not overwrite existing data', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'existing@example.com',
        first_name: 'New',
        last_name: 'Name',
        phone: 'new-phone',
      };

      const messages = [createSQSMessage('customers/update', customerPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-existing',
        name: 'Existing Name', // Already has a name
        phone: 'existing-phone', // Already has a phone
        linked_ids: {},
      }]);
      mockSupporterRepo.update.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      const updateCall = mockSupporterRepo.update.mock.calls[0];
      expect(updateCall[1].name).toBeUndefined();
      expect(updateCall[1].phone).toBeUndefined();
    });

    it('should handle multiple supporters gracefully', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'shared@example.com',
      };

      const messages = [createSQSMessage('customers/update', customerPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([
        { supporter_id: 'supp-1' },
        { supporter_id: 'supp-2' },
      ]);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple supporters')
      );
      expect(mockSupporterRepo.update).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should log error and re-throw', async () => {
      const messages = [createSQSMessage('orders/create', {})];

      mockSupporterRepo.findByEmail.mockRejectedValue(new Error('DB error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const event = createSQSEvent(messages);

      await expect(handler(event)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should log unhandled topics', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const messages = [createSQSMessage('app/uninstalled', {})];

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled Shopify topic: app/uninstalled')
      );

      consoleLogSpy.mockRestore();
    });

    it('should continue processing other messages after one fails', async () => {
      const messages = [
        createSQSMessage('orders/create', { id: 'order-1' }),
        createSQSMessage('orders/create', { id: 'order-2' }),
      ];

      // First message succeeds, second fails
      mockSupporterRepo.findByEmail
        .mockResolvedValueOnce([{ supporter_id: 'supp-1' }])
        .mockRejectedValueOnce(new Error('DB error'));

      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await expect(handler(event)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Event Metadata Tests
  // ==========================================================================

  describe('event metadata', () => {
    it('should include order details in metadata', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
        order_number: '1001',
        total_price: '100.00',
        currency: 'EUR',
        financial_status: 'paid',
        fulfillment_status: 'fulfilled',
        line_items: [
          { id: 'li-1', title: 'Jersey', quantity: 2, price: '50.00' },
        ],
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      const createCall = mockEventRepo.create.mock.calls[0];
      const metadata = createCall[1].metadata;

      expect(metadata).toEqual({
        order_id: 'order-123',
        order_number: '1001',
        items: [
          { id: 'li-1', title: 'Jersey', quantity: 2, price: '50.00' },
        ],
        fulfillment_status: 'fulfilled',
        financial_status: 'paid',
        topic: 'orders/create',
      });
    });

    it('should include amount and currency', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
        total_price: '100.00',
        currency: 'EUR',
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      const createCall = mockEventRepo.create.mock.calls[0];
      expect(createCall[1].amount).toBe(100);
      expect(createCall[1].currency).toBe('EUR');
    });

    it('should handle missing optional fields', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
        // Missing optional fields
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      const createCall = mockEventRepo.create.mock.calls[0];
      expect(createCall[1].amount).toBe(0);
      expect(createCall[1].currency).toBe('EUR');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty line_items', async () => {
      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
        line_items: [],
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      const createCall = mockEventRepo.create.mock.calls[0];
      expect(createCall[1].items).toEqual([]);
    });

    it('should handle customer without phone', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'no-phone@example.com',
        first_name: 'No',
        last_name: 'Phone',
      };

      const messages = [createSQSMessage('customers/create', customerPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({
        supporter_id: 'supp-123',
      });
      mockEventRepo.create.mockResolvedValue({});
      mockSupporterRepo.addEmailAlias.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        phone: null,
      });
    });

    it('should handle special characters in name', async () => {
      const customerPayload = {
        id: 'cust-123',
        email: 'special@example.com',
        first_name: "O'Brien",
        last_name: 'O\'Connor-Davis',
      };

      const messages = [createSQSMessage('customers/create', customerPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({
        supporter_id: 'supp-123',
      });
      mockEventRepo.create.mockResolvedValue({});
      mockSupporterRepo.addEmailAlias.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: "O'Brien O'Connor-Davis",
      });
    });

    it('should handle very long line items lists', async () => {
      const manyItems = Array(100).fill(null).map((_, i) => ({
        id: `li-${i}`,
        title: `Product ${i}`,
        quantity: 1,
        price: '10.00',
      }));

      const orderPayload = {
        id: 'order-123',
        email: 'test@example.com',
        line_items: manyItems,
      };

      const messages = [createSQSMessage('orders/create', orderPayload)];

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      const createCall = mockEventRepo.create.mock.calls[0];
      expect(createCall[1].metadata.items).toHaveLength(100);
    });
  });
});
