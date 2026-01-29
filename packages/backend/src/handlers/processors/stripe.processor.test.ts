/**
 * Stripe Event Processor Tests
 *
 * Tests for Stripe SQS event processor including:
 * - Idempotency (duplicate events handled correctly)
 * - Supporter matching logic
 * - Event creation
 * - Membership updates
 * - Arrears detection
 * - Error handling
 *
 * @packageDocumentation
 */

import { handler } from './stripe.processor';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { MembershipRepository } from '../../db/repositories/membership.repository';

// Mock all dependencies
jest.mock('../../db/repositories/supporter.repository');
jest.mock('../../db/repositories/event.repository');
jest.mock('../../db/repositories/membership.repository');

describe('Stripe Event Processor', () => {
  let mockSupporterRepo: jest.Mocked<SupporterRepository>;
  let mockEventRepo: jest.Mocked<EventRepository>;
  let mockMembershipRepo: jest.Mocked<MembershipRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SupporterRepository
    mockSupporterRepo = {
      findByEmail: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateLinkedIds: jest.fn(),
      addEmailAlias: jest.fn(),
      findById: jest.fn(),
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
      markPastDue: jest.fn(),
    } as any;
    (require('../../db/repositories/membership.repository') as any).MembershipRepository = function () {
      return mockMembershipRepo;
    };
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createMockSupporter = (overrides = {}): any => ({
    supporter_id: 'supp-123',
    name: 'Test Supporter',
    primary_email: 'test@example.com',
    phone: '+353871234567',
    supporter_type: 'Unknown',
    supporter_type_source: 'auto',
    linked_ids: {},
    flags: {},
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const createMockEvent = (overrides = {}): any => ({
    event_id: 'evt-123',
    supporter_id: 'supp-123',
    source_system: 'stripe',
    event_type: 'PaymentEvent',
    event_time: new Date(),
    external_id: 'test-external-id',
    amount: 100,
    currency: 'EUR',
    metadata: {},
    raw_payload_ref: 's3-key',
    ...overrides,
  });

  const createMockSearchResult = (overrides = {}): any => ({
    supporter_id: 'supp-123',
    name: 'Test Supporter',
    email: 'test@example.com',
    supporter_type: 'Unknown',
    last_ticket_order_date: null,
    last_shop_order_date: null,
    membership_status: null,
    last_stadium_entry_date: null,
    ...overrides,
  });

  const createMockMembership = (overrides = {}): any => ({
    id: 1,
    supporter_id: 'supp-123',
    tier: 'Full',
    cadence: 'Annual',
    billing_method: 'stripe',
    status: 'Active',
    last_payment_date: new Date(),
    start_date: new Date(),
    end_date: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const createSQSMessage = (stripeEvent: any) => ({
    event: stripeEvent,
    s3Key: 'stripe/2024/01/01/payload.json',
    payloadId: 'evt-123',
  });

  const createSQSEvent = (messages: any[]) => ({
    Records: messages.map((msg, i) => ({
      messageId: `msg-${i}`,
      receiptHandle: `handle-${i}`,
      body: JSON.stringify(msg),
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: `${Date.now()}`,
        SenderId: 'AIDAIO23YVJENQZJOL4VO',
        ApproximateFirstReceiveTimestamp: `${Date.now()}`,
      },
      messageAttributes: {},
      md5OfBody: 'mock-md5',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:stripe-queue',
      awsRegion: 'eu-west-1',
    })),
  });

  const createStripeEvent = (type: string, data: any) => ({
    id: `evt_${Date.now()}`,
    object: 'event',
    type,
    created: Math.floor(Date.now() / 1000),
    data: { object: data },
  });

  // ==========================================================================
  // General Handler Tests
  // ==========================================================================

  describe('handler', () => {
    it('should process multiple messages', async () => {
      const messages = [
        createSQSMessage(createStripeEvent('payment_intent.succeeded', { id: 'pi-1' })),
        createSQSMessage(createStripeEvent('charge.succeeded', { id: 'ch-1' })),
      ];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
        linked_ids: {},
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);
      mockSupporterRepo.updateLinkedIds.mockResolvedValue(undefined as any);

      const event = createSQSEvent(messages);

      await expect(handler(event)).resolves.not.toThrow();
      expect(mockEventRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should log processing start and completion', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const messages = [
        createSQSMessage(createStripeEvent('payment_intent.succeeded', {})),
      ];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing 2 Stripe webhook messages')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed')
      );

      consoleLogSpy.mockRestore();
    });

    it('should re-throw on error to trigger DLQ', async () => {
      const messages = [
        createSQSMessage(createStripeEvent('payment_intent.succeeded', {})),
      ];

      mockSupporterRepo.findByEmail.mockRejectedValue(new Error('DB error'));

      const event = createSQSEvent(messages);

      await expect(handler(event)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Payment Intent Succeeded Tests
  // ==========================================================================

  describe('payment_intent.succeeded processing', () => {
    it('should create PaymentEvent for payment intent', async () => {
      const stripeEvent = createStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
        created: 1704067200,
        customer: 'cus_abc',
        customer_details: {
          email: 'payer@example.com',
        },
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
        linked_ids: {},
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        source_system: 'stripe',
        event_type: 'PaymentEvent',
        amount: 100.00, // Converted from cents
        currency: 'EUR',
        metadata: expect.any(Object),
        external_id: 'stripe-pi-pi_123',
      });
    });

    it('should find supporter by email first', async () => {
      const stripeEvent = createStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        receipt_email: 'email@example.com',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.findByEmail).toHaveBeenCalledWith('email@example.com');
    });

    it('should update membership if payment has membership metadata', async () => {
      const stripeEvent = createStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        amount: 5000,
        currency: 'eur',
        metadata: {
          membership_tier: 'Full',
          membership_cadence: 'Annual',
          is_membership: 'true',
        },
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
        linked_ids: {},
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);
      mockMembershipRepo.upsert.mockResolvedValue({} as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.upsert).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        tier: 'Full',
        cadence: 'Annual',
        billing_method: 'stripe',
        status: 'Active',
        last_payment_date: expect.any(Date),
      });
    });

    it('should skip payment without email or customer', async () => {
      const stripeEvent = createStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        // No email or customer
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payment intent without email')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Charge Succeeded Tests
  // ==========================================================================

  describe('charge.succeeded processing', () => {
    it('should create PaymentEvent for charge', async () => {
      const stripeEvent = createStripeEvent('charge.succeeded', {
        id: 'ch_123',
        amount: 2500,
        currency: 'eur',
        status: 'succeeded',
        billing_details: {
          email: 'payer@example.com',
        },
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
        linked_ids: {},
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        source_system: 'stripe',
        event_type: 'PaymentEvent',
        amount: 25.00,
        currency: 'EUR',
        external_id: 'stripe-charge-ch_123',
      });
    });

    it('should update linked_ids with customer ID', async () => {
      const stripeEvent = createStripeEvent('charge.succeeded', {
        id: 'ch_123',
        customer: 'cus_abc',
        billing_details: {
          email: 'payer@example.com',
        },
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
        linked_ids: {},
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);
      mockSupporterRepo.updateLinkedIds.mockResolvedValue(undefined as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.updateLinkedIds).toHaveBeenCalledWith(
        'supp-123',
        { stripe: 'cus_abc' }
      );
    });
  });

  // ==========================================================================
  // Invoice Payment Succeeded Tests
  // ==========================================================================

  describe('invoice.payment_succeeded processing', () => {
    it('should create MembershipEvent and update payment date', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_succeeded', {
        id: 'in_123',
        subscription: 'sub_abc',
        total: '5000',
        amount_paid: '5000',
        status: 'paid',
        period_start: 1704067200,
        period_end: 1706748800,
        created: 1704067200,
        customer: 'cus_abc',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.search.mockResolvedValue({
        results: [{
          supporter_id: 'supp-123',
          linked_ids: { stripe: 'cus_abc' },
        } as any], // Cast to any because SearchResult doesn't have linked_ids but processor expects it
        total: 1,
      });
      mockSupporterRepo.findById.mockResolvedValue(createMockSupporter());
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);
      mockMembershipRepo.updateLastPaymentDate.mockResolvedValue(undefined as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'MembershipEvent',
          external_id: 'stripe-invoice-in_123',
          amount: 50.00,
        })
      );
      expect(mockMembershipRepo.updateLastPaymentDate).toHaveBeenCalled();
    });

    it('should find supporter by Stripe customer ID', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_succeeded', {
        customer: 'cus_abc',
        id: 'in_123',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.search.mockResolvedValue({
        results: [{
          supporter_id: 'supp-123',
          linked_ids: { stripe: 'cus_abc' },
        } as any], // Cast to any because SearchResult doesn't have linked_ids but processor expects it
        total: 1,
      });
      mockSupporterRepo.findById.mockResolvedValue(createMockSupporter());
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);
      mockMembershipRepo.updateLastPaymentDate.mockResolvedValue(undefined as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.search).toHaveBeenCalledWith({
        query: 'cus_abc',
        field: 'all',
        limit: 100,
      });
    });

    it('should skip if supporter not found', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_succeeded', {
        customer: 'cus_nonexistent',
        id: 'in_123',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.search.mockResolvedValue({
        results: [],
        total: 0,
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No supporter found')
      );
      expect(mockEventRepo.create).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Invoice Payment Failed Tests
  // ==========================================================================

  describe('invoice.payment_failed processing', () => {
    it('should mark membership as Past Due', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_failed', {
        id: 'in_123',
        customer: 'cus_abc',
        subscription: 'sub_abc',
        due_date: 1704067200,
        status: 'open',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.search.mockResolvedValue({
        results: [{
          supporter_id: 'supp-123',
          linked_ids: { stripe: 'cus_abc' },
        } as any], // Cast to any because SearchResult doesn't have linked_ids but processor expects it
        total: 1,
      });
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);
      mockMembershipRepo.findBySupporterId.mockResolvedValue(createMockMembership({
        status: 'Active',
      }));
      mockMembershipRepo.markPastDue.mockResolvedValue(undefined as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockMembershipRepo.markPastDue).toHaveBeenCalledWith('supp-123');
    });

    it('should create MembershipEvent for failure', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_failed', {
        id: 'in_123',
        customer: 'cus_abc',
        subscription: 'sub_abc',
        amount_due: '5000',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.search.mockResolvedValue({
        results: [{
          supporter_id: 'supp-123',
          linked_ids: { stripe: 'cus_abc' },
        } as any], // Cast to any because SearchResult doesn't have linked_ids but processor expects it
        total: 1,
      });
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);
      mockMembershipRepo.findBySupporterId.mockResolvedValue(createMockMembership({
        status: 'Active',
      }));
      mockMembershipRepo.markPastDue.mockResolvedValue(undefined as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'MembershipEvent',
          external_id: 'stripe-invoice-failed-in_123',
          metadata: expect.objectContaining({
            status: 'payment_failed',
            subscription_id: 'sub_abc',
          }),
        })
      );
    });

    it('should handle membership not found', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_failed', {
        customer: 'cus_abc',
        id: 'in_123',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.search.mockResolvedValue({
        results: [{
          supporter_id: 'supp-123',
          linked_ids: { stripe: 'cus_abc' },
        } as any], // Cast to any because SearchResult doesn't have linked_ids but processor expects it
        total: 1,
      });
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);
      mockMembershipRepo.findBySupporterId.mockResolvedValue(null);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No membership found')
      );

      consoleLogSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Customer Created Tests
  // ==========================================================================

  describe('customer.created processing', () => {
    it('should create new supporter from customer', async () => {
      const stripeEvent = createStripeEvent('customer.created', {
        id: 'cus_123',
        email: 'new@example.com',
        name: 'New Customer',
        phone: '+353871234567',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter({
        supporter_id: 'supp-new',
        primary_email: null,
      }));
      mockSupporterRepo.addEmailAlias.mockResolvedValue({
        id: 1,
        supporter_id: 'supp-123',
        email: 'test@example.com',
        is_shared: false,
        created_at: new Date(),
      } as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: 'New Customer',
        primary_email: 'new@example.com',
        phone: '+353871234567',
        supporter_type: 'Unknown',
        supporter_type_source: 'auto',
        linked_ids: { stripe: 'cus_123' },
      });
    });

    it('should update existing supporter with Stripe ID', async () => {
      const stripeEvent = createStripeEvent('customer.created', {
        id: 'cus_123',
        email: 'existing@example.com',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-existing',
        linked_ids: {},
      })]);
      mockSupporterRepo.updateLinkedIds.mockResolvedValue(undefined as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.updateLinkedIds).toHaveBeenCalledWith(
        'supp-existing',
        { stripe: 'cus_123' }
      );
    });

    it('should flag multiple supporters with same email', async () => {
      const stripeEvent = createStripeEvent('customer.created', {
        id: 'cus_123',
        email: 'shared@example.com',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([
        createMockSupporter({ supporter_id: 'supp-1', flags: {} }),
        createMockSupporter({ supporter_id: 'supp-2', flags: {} }),
      ]);
      mockSupporterRepo.update.mockResolvedValue(createMockSupporter() as any);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple supporters')
      );
      expect(mockSupporterRepo.update).toHaveBeenCalledTimes(2);

      consoleWarnSpy.mockRestore();
    });

    it('should create supporter without email if not provided', async () => {
      const stripeEvent = createStripeEvent('customer.created', {
        id: 'cus_123',
        // No email
        name: 'No Email Customer',
        phone: '+353871234567',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter({
        supporter_id: 'supp-no-email',
        primary_email: null,
      }));

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        name: 'No Email Customer',
        primary_email: null,
        phone: '+353871234567',
        supporter_type: 'Unknown',
      });
      expect(mockSupporterRepo.addEmailAlias).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Customer Updated Tests
  // ==========================================================================

  describe('customer.updated processing', () => {
    it('should update supporter details', async () => {
      const stripeEvent = createStripeEvent('customer.updated', {
        id: 'cus_123',
        email: 'updated@example.com',
        name: 'Updated Name',
        phone: '+35387999999',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-existing',
        name: 'Old Name',
        phone: null,
        linked_ids: {},
      })]);
      mockSupporterRepo.updateLinkedIds.mockResolvedValue(undefined as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.update).toHaveBeenCalledWith(
        'supp-existing',
        expect.objectContaining({
          name: 'Updated Name',
          phone: '+35387999999',
        })
      );
    });

    it('should not overwrite existing name or phone', async () => {
      const stripeEvent = createStripeEvent('customer.updated', {
        id: 'cus_123',
        email: 'existing@example.com',
        name: 'Should Not Update',
        phone: '0000000000',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-existing',
        name: 'Existing Name',
        phone: '+353871234567',
        linked_ids: {},
      })]);

      const event = createSQSEvent(messages);

      await handler(event);

      const updateCall = mockSupporterRepo.update.mock.calls[0];
      expect(updateCall[1].name).toBeUndefined();
      expect(updateCall[1].phone).toBeUndefined();
    });
  });

  // ==========================================================================
  // Idempotency Tests
  // ==========================================================================

  describe('idempotency', () => {
    it('should skip processing if payment intent already exists', async () => {
      const stripeEvent = createStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        receipt_email: 'test@example.com',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(createMockEvent({
        event_id: 'existing',
      }));

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payment intent already processed')
      );
      expect(mockEventRepo.create).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should skip processing if charge already exists', async () => {
      const stripeEvent = createStripeEvent('charge.succeeded', {
        id: 'ch_123',
        customer: 'cus_abc',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(createMockEvent({
        event_id: 'existing',
      }));

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Charge already processed')
      );
      expect(mockEventRepo.create).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should skip processing if invoice already exists', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_succeeded', {
        id: 'in_123',
        customer: 'cus_abc',
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.search.mockResolvedValue({
        results: [{ supporter_id: 'supp-123', linked_ids: { stripe: 'cus_abc' } } as any],
        total: 1,
      });
      mockEventRepo.findByExternalId.mockResolvedValue(createMockEvent({
        event_id: 'existing',
      }));

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = createSQSEvent(messages);

      await handler(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice already processed')
      );

      consoleLogSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle null amount gracefully', async () => {
      const stripeEvent = createStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        amount: null,
        currency: null,
        receipt_email: 'test@example.com',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);

      const event = createSQSEvent(messages);

      await handler(event);

      const createCall = mockEventRepo.create.mock.calls[0];
      expect(createCall[0].amount).toBeNull();
      expect(createCall[0].currency).toBe('EUR'); // Default currency
    });

    it('should handle special characters in email', async () => {
      const stripeEvent = createStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        receipt_email: "user+test@example.com",
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);

      const event = createSQSEvent(messages);

      expect(mockSupporterRepo.findByEmail).toHaveBeenCalledWith('user+test@example.com');
    });

    it('should handle large payment amounts', async () => {
      const stripeEvent = createStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        amount: 999999, // Large amount in cents
        currency: 'eur',
        receipt_email: 'test@example.com',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter({
        supporter_id: 'supp-123',
      })]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);

      const event = createSQSEvent(messages);

      const createCall = mockEventRepo.create.mock.calls[0];
      expect(createCall[0].amount).toBe(9999.99);
    });

    it('should handle missing customer_details', async () => {
      const stripeEvent = createStripeEvent('charge.succeeded', {
        id: 'ch_123',
        amount: 5000,
        currency: 'eur',
        // No billing_details
        customer: 'cus_abc',
        created: 1704067200,
      });

      const messages = [createSQSMessage(stripeEvent)];

      mockSupporterRepo.findByEmail.mockResolvedValue([]);
      mockSupporterRepo.create.mockResolvedValue(createMockSupporter({
        supporter_id: 'supp-new',
        primary_email: null,
      }));
      mockSupporterRepo.addEmailAlias.mockResolvedValue({
        id: 1,
        supporter_id: 'supp-123',
        email: 'test@example.com',
        is_shared: false,
        created_at: new Date(),
      } as any);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue(createMockEvent() as any);

      const event = createSQSEvent(messages);

      await handler(event);

      expect(mockSupporterRepo.create).toHaveBeenCalledWith({
        primary_email: null,
      });
    });
  });
});
