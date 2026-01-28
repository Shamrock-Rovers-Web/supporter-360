/**
 * GoCardless Event Processor Tests
 *
 * Tests for GoCardless SQS event processor including:
 * - Idempotency (duplicate events handled correctly)
 * - Supporter matching logic
 * - Event creation
 * - Membership status updates
 * - Error handling
 *
 * @packageDocumentation
 */

import { handler } from './gocardless.processor';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { MembershipRepository } from '../../db/repositories/membership.repository';

// Mock all dependencies
jest.mock('../../db/repositories/supporter.repository');
jest.mock('../../db/repositories/event.repository');
jest.mock('../../db/repositories/membership.repository');

describe('GoCardless Event Processor', () => {
  let mockSupporterRepo: jest.Mocked<SupporterRepository>;
  let mockEventRepo: jest.Mocked<EventRepository>;
  let mockMembershipRepo: jest.Mocked<MembershipRepository>;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SupporterRepository
    mockSupporterRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      updateLinkedIds: jest.fn(),
      update: jest.fn(),
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

    // Mock MembershipRepository
    mockMembershipRepo = {
      findBySupporterId: jest.fn(),
      upsert: jest.fn(),
      updateLastPaymentDate: jest.fn(),
      markActive: jest.fn(),
      markPastDue: jest.fn(),
      cancel: jest.fn(),
    } as any;
    (require('../../db/repositories/membership.repository') as any).MembershipRepository = function () {
      return mockMembershipRepo;
    };

    // Mock fetch for API calls
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createSQSMessage = (gcEvent: any) => ({
    event: gcEvent,
    s3Key: 'gocardless/2024/01/01/payload.json',
    payloadId: 'evt-123',
  });

  const createSQSEvent = (messages: any[]) => ({
    Records: messages.map((msg, i) => ({
      messageId: `msg-${i}`,
      receiptHandle: `handle-${i}`,
      body: JSON.stringify(msg),
      attributes: {},
    })),
  });

  const createGoCardlessEvent = (
    resourceType: string,
    action: string,
    links: Record<string, string>
  ) => ({
    id: `EV${Date.now()}`,
    created_at: '2024-01-01T00:00:00Z',
    resource_type: resourceType,
    action,
    links,
  });

  // ==========================================================================
  // General Handler Tests
  // ==========================================================================

  describe('handler', () => {
    it('should process multiple messages', async () => {
      const messages = [
        createSQSMessage(createGoCardlessEvent('payments', 'confirmed', { payment: 'PM001' })),
        createSQSMessage(createGoCardlessEvent('payments', 'paid_out', { payment: 'PM002' })),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          payments: [{ id: 'PM001', status: 'confirmed', amount: '1000', links: { customer: 'CU001' } }],
        }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
        linked_ids: {},
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});
      mockMembershipRepo.findBySupporterId.mockResolvedValue(null);
      mockMembershipRepo.updateLastPaymentDate.mockResolvedValue({});
      mockMembershipRepo.markActive.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await expect(handler(event)).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should log processing start and completion', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const messages = [
        createSQSMessage(createGoCardlessEvent('payments', 'confirmed', { payment: 'PM001' })),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing 1 GoCardless webhook messages')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed all')
      );

      consoleLogSpy.mockRestore();
    });

    it('should re-throw on error to trigger DLQ', async () => {
      const messages = [
        createSQSMessage(createGoCardlessEvent('payments', 'confirmed', { payment: 'PM001' })),
      ];

      mockFetch.mockRejectedValue(new Error('API error'));

      await expect(handler(createSQSEvent(messages))).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Payment Event Processing Tests
  // ==========================================================================

  describe('payments resource type', () => {
    it('should process payment_confirmed event', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'confirmed', {
        payment: 'PM001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockPayment = {
        id: 'PM001',
        amount: '1000',
        currency: 'GBP',
        status: 'confirmed',
        links: {
          customer: 'CU001',
          subscription: 'SUB001',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [mockPayment] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
        linked_ids: {},
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});
      mockMembershipRepo.findBySupporterId.mockResolvedValue(null);
      mockMembershipRepo.updateLastPaymentDate.mockResolvedValue({});
      mockMembershipRepo.markActive.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'MembershipEvent',
          source_system: 'gocardless',
          amount: 10.00,
          currency: 'GBP',
        })
      );
    });

    it('should process payment_failed event', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'failed', {
        payment: 'PM001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockPayment = {
        id: 'PM001',
        status: 'failed',
        amount: '1000',
        currency: 'GBP',
        links: { customer: 'CU001' },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [mockPayment] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});
      mockMembershipRepo.findBySupporterId.mockResolvedValue({
        id: 1,
        supporter_id: 'supp-123',
        status: 'Active',
      });
      mockMembershipRepo.markPastDue.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'PaymentEvent',
        })
      );
      expect(mockMembershipRepo.markPastDue).toHaveBeenCalledWith('supp-123');
    });

    it('should create MembershipEvent for successful payment', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'paid_out', {
        payment: 'PM001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockPayment = {
        id: 'PM001',
        status: 'paid_out',
        amount: '1000',
        currency: 'GBP',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [mockPayment] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});
      mockMembershipRepo.findBySupporterId.mockResolvedValue(null);
      mockMembershipRepo.updateLastPaymentDate.mockResolvedValue({});
      mockMembershipRepo.markActive.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'MembershipEvent',
        })
      );
    });
  });

  // ==========================================================================
  // Mandate Event Processing Tests
  // ==========================================================================

  describe('mandates resource type', () => {
    it('should cancel membership on mandate cancellation', async () => {
      const gcEvent = createGoCardlessEvent('mandates', 'cancelled', {
        mandate: 'MD001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockMandate = {
        id: 'MD001',
        status: 'cancelled',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ mandates: [mockMandate] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customers: [{}] }),
        });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockMembershipRepo.cancel.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.cancel).toHaveBeenCalledWith('supp-123');
    });

    it('should ensure membership exists on mandate created', async () => {
      const gcEvent = createGoCardlessEvent('mandates', 'created', {
        mandate: 'MD001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockMandate = {
        id: 'MD001',
        status: 'pending',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ mandates: [mockMandate] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customers: [{}] }),
        });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockMembershipRepo.upsert.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.upsert).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        billing_method: 'gocardless',
        status: 'Active',
      });
    });
  });

  // ==========================================================================
  // Subscription Event Processing Tests
  // ==========================================================================

  describe('subscriptions resource type', () => {
    it('should cancel membership on subscription cancelled', async () => {
      const gcEvent = createGoCardlessEvent('subscriptions', 'cancelled', {
        subscription: 'SUB001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockSubscription = {
        id: 'SUB001',
        status: 'cancelled',
        interval_unit: 'monthly',
        amount: '1000',
        currency: 'GBP',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscriptions: [mockSubscription] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customers: [{}] }),
        });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockMembershipRepo.cancel.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.cancel).toHaveBeenCalledWith('supp-123');
    });

    it('should update membership based on subscription status', async () => {
      const gcEvent = createGoCardlessEvent('subscriptions', 'updated', {
        subscription: 'SUB001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockSubscription = {
        id: 'SUB001',
        status: 'active',
        interval_unit: 'yearly',
        amount: '12000',
        currency: 'GBP',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscriptions: [mockSubscription] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customers: [{}] }),
        });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockMembershipRepo.upsert.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.upsert).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        cadence: 'Annual',
        billing_method: 'gocardless',
        status: 'Active',
      });
    });

    it('should map monthly interval to Monthly cadence', async () => {
      const gcEvent = createGoCardlessEvent('subscriptions', 'created', {
        subscription: 'SUB001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockSubscription = {
        id: 'SUB001',
        status: 'active',
        interval_unit: 'monthly',
        amount: '1000',
        currency: 'GBP',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscriptions: [mockSubscription] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customers: [{}] }),
        });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockMembershipRepo.upsert.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.upsert).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        cadence: 'Monthly',
        billing_method: 'gocardless',
        status: 'Active',
      });
    });
  });

  // ==========================================================================
  // Customer Event Processing Tests
  // ==========================================================================

  describe('customers resource type', () => {
    it('should find or create supporter from customer', async () => {
      const gcEvent = createGoCardlessEvent('customers', 'created', {
        customer: 'CU001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockCustomer = {
        id: 'CU001',
        email: 'customer@example.com',
        given_name: 'Test',
        family_name: 'User',
        phone: '+353871234567',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [mockCustomer] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({
        supporter_id: 'supp-new',
      });
      mockSupporterRepo.addEmailAlias.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: 'Test User',
        primary_email: 'customer@example.com',
        phone: '+353871234567',
        supporter_type: 'Member',
        supporter_type_source: 'auto',
        linked_ids: { gocardless: 'CU001' },
      });
    });

    it('should update existing supporter with GoCardless ID', async () => {
      const gcEvent = createGoCardlessEvent('customers', 'created', {
        customer: 'CU001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockCustomer = {
        id: 'CU001',
        email: 'existing@example.com',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [mockCustomer] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-existing',
        linked_ids: {},
      }]);
      mockSupporterRepo.updateLinkedIds.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.updateLinkedIds).toHaveBeenCalledWith(
        'supp-existing',
        { gocardless: 'CU001' }
      );
    });

    it('should skip customer without email', async () => {
      const gcEvent = createGoCardlessEvent('customers', 'created', {
        customer: 'CU001',
        // No email
      });

      const messages = [createSQSMessage(gcEvent)];

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [{}] }),
      });

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Customer without email')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Idempotency Tests
  // ==========================================================================

  describe('idempotency', () => {
    it('should skip processing if event already exists', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'confirmed', {
        payment: 'PM001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockPayment = {
        id: 'PM001',
        status: 'confirmed',
        amount: '1000',
        currency: 'GBP',
        links: { customer: 'CU001' },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [mockPayment] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue({
        event_id: 'existing-evt',
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payment already processed')
      );
      expect(mockEventRepo.create).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should check idempotency for all event types', async () => {
      // Test mandate cancellation idempotency
      const gcEvent = createGoCardlessEvent('mandates', 'cancelled', {
        mandate: 'MD001',
      });

      messages = [createSQSMessage(gcEvent)];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mandates: [{}] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);

      // Mock that event already exists
      mockEventRepo.findByExternalId.mockResolvedValue({
        event_id: 'existing-evt',
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should log error and re-throw', async () => {
      const messages = [
        createSQSMessage(createGoCardlessEvent('payments', 'confirmed', {
          payment: 'PM001',
        })),
      ];

      mockFetch.mockRejectedValue(new Error('API error'));
      mockSupporterRepo.findByEmail.mockRejectedValue(new Error('DB error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const event = createSQSEvent(messages);

      await expect(handler(createSQSEvent(messages))).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle GoCardless API errors gracefully', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'confirmed', {
        payment: 'PM001',
      });

      const messages = [createSQSMessage(gcEvent)];

      // Return null to indicate failure
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch payment')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Membership Update Logic Tests
  // ==========================================================================

  describe('membership update logic', () => {
    it('should update last payment date on confirmed payment', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'confirmed', {
        payment: 'PM001',
        charge_date: '2024-01-15',
        amount: '1000',
        currency: 'GBP',
        links: {
          customer: 'CU001',
        },
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockPayment = {
        id: 'PM001',
        amount: '1000',
        currency: 'GBP',
        status: 'confirmed',
        charge_date: '2024-01-15',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [mockPayment] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});
      mockMembershipRepo.findBySupporterId.mockResolvedValue({
        id: 1,
        supporter_id: 'supp-123',
        status: 'Active',
      });
      mockMembershipRepo.updateLastPaymentDate.mockResolvedValue({});
      mockMembershipRepo.markActive.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.updateLastPaymentDate).toHaveBeenCalled();
    });

    it('should create membership if not exists', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'confirmed', {
        payment: 'PM001',
        charge_date: '2024-01-15',
        amount: '1000',
        currency: 'GBP',
        links: {
          customer: 'CU001',
        },
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockPayment = {
        id: 'PM001',
        amount: '1000',
        currency: 'GBP',
        status: 'confirmed',
        links: { customer: 'CU001' },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [mockPayment] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});
      mockMembershipRepo.findBySupporterId.mockResolvedValue(null);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ensured membership exists')
      );

      consoleLogSpy.mockRestore();
    });

    it('should mark membership as past due on failed payment', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'failed', {
        payment: 'PM001',
        amount: '1000',
        currency: 'GBP',
        links: { customer: 'CU001' },
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockPayment = {
        id: 'PM001',
        amount: '1000',
        currency: 'GBP',
        status: 'failed',
        links: { customer: 'CU001' },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [mockPayment] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({});
      mockMembershipRepo.findBySupporterId.mockResolvedValue({
        id: 1,
        supporter_id: 'supp-123',
        status: 'Active',
      });
      mockMembershipRepo.markPastDue.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.markPastDue).toHaveBeenCalledWith('supp-123');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle missing customer link gracefully', async () => {
      const gcEvent = createGoCardlessEvent('payments', 'confirmed', {
        payment: 'PM001',
        // No customer link
      });

      const messages = [createSQSMessage(gcEvent)];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ payments: [{ id: 'PM001', links: {} }] }),
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payment without customer')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle paused subscription', async () => {
      const gcEvent = createGoCardlessEvent('subscriptions', 'updated', {
        subscription: 'SUB001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockSubscription = {
        id: 'SUB001',
        status: 'paused',
        interval_unit: 'monthly',
        amount: '1000',
        currency: 'GBP',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscriptions: [mockSubscription] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customers: [{}] }),
        });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);

      const event = createSQSEvent(messages);

      await handler(event);

      const upsertCall = mockMembershipRepo.upsert.mock.calls[0];
      expect(upsertCall[1].status).toBe('Past Due');
    });

    it('should handle annual subscription', async () => {
      const gcEvent = createGoCardlessEvent('subscriptions', 'created', {
        subscription: 'SUB001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockSubscription = {
        id: 'SUB001',
        status: 'active',
        interval_unit: 'yearly',
        amount: '12000',
        currency: 'GBP',
        links: {
          customer: 'CU001',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscriptions: [mockSubscription] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customers: [{}] }),
        });

      mockSupporterRepo.findByEmail.mockResolvedValue([{
        supporter_id: 'supp-123',
      }]);

      const event = createSQSEvent(messages);

      await handler(event);

      const upsertCall = mockMembershipRepo.upsert.mock.calls[0];
      expect(upsertCall[1].cadence).toBe('Annual');
    });

    it('should handle special characters in customer name', async () => {
      const gcEvent = createGoCardlessEvent('customers', 'created', {
        customer: 'CU001',
      });

      const messages = [createSQSMessage(gcEvent)];

      const mockCustomer = {
        id: 'CU001',
        email: 'test@example.com',
        given_name: "O'Brien",
        family_name: "O'Connor",
        company_name: 'O\'Brien Ltd',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ customers: [mockCustomer] }),
      });

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue({
        supporter_id: 'supp-123',
      });
      mockSupporterRepo.addEmailAlias.mockResolvedValue({});

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: "O'Brien O'Connor",
      });
    });
  });
});
