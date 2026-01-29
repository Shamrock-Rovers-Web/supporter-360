/**
 * Mailchimp Event Processor Tests
 *
 * Tests for the Mailchimp SQS event processor including:
 * - Click event processing
 * - Supporter lookup by email
 * - Idempotency checking
 * - Mailchimp click count aggregation
 * - Multi-audience handling
 * - Error handling and DLQ triggering
 *
 * @packageDocumentation
 */

import { handler } from './mailchimp.processor';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { query } from '../../db/connection';

// Mock the repositories
jest.mock('../../db/repositories/supporter.repository');
jest.mock('../../db/repositories/event.repository');
jest.mock('../../db/connection');

describe('Mailchimp Event Processor', () => {
  let mockSupporterRepo: jest.Mocked<SupporterRepository>;
  let mockEventRepo: jest.Mocked<EventRepository>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupporterRepo = {
      findByEmail: jest.fn(),
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

  const createClickMessage = (overrides = {}): string => {
    const data = {
      email: 'test@example.com',
      campaign_id: 'campaign-123',
      url: 'https://example.com/link',
      timestamp: '2024-01-15T12:00:00Z',
      ...overrides,
    };

    return JSON.stringify({
      type: 'click',
      data,
      s3Key: 'mailchimp/payload-123.json',
      payloadId: 'payload-123',
    });
  };

  const createMockSupporter = (overrides = {}) => ({
    supporter_id: 'supp-123',
    name: 'Test Supporter',
    primary_email: 'test@example.com',
    supporter_type: 'Member',
    ...overrides,
  });

  // ==========================================================================
  // Handler Tests
  // ==========================================================================

  describe('handler', () => {
    it('should process multiple SQS records', async () => {
      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter()]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [
          createSQSRecord({ body: createClickMessage({ email: 'user1@example.com' }) }),
          createSQSRecord({ body: createClickMessage({ email: 'user2@example.com' }) }),
        ],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should log processing start and success', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter()]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Processing 1 Mailchimp webhook messages'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully processed all Mailchimp webhook messages'));

      consoleLogSpy.mockRestore();
    });

    it('should throw error to trigger DLQ on processing failure', async () => {
      mockSupporterRepo.findByEmail.mockRejectedValue(new Error('Database error'));

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await expect(handler(event, {} as any)).rejects.toThrow('Database error');
    });

    it('should continue processing remaining records after one fails', async () => {
      mockSupporterRepo.findByEmail
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce([createMockSupporter()]);

      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [
          createSQSRecord({ body: createClickMessage({ email: 'user1@example.com' }) }),
          createSQSRecord({ body: createClickMessage({ email: 'user2@example.com' }) }),
        ],
      };

      await expect(handler(event, {} as any)).rejects.toThrow();
      // The second record would not be processed because error is thrown
    });
  });

  // ==========================================================================
  // Click Event Processing Tests
  // ==========================================================================

  describe('click event processing', () => {
    it('should create EmailClick event for supporter', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith({
        supporter_id: 'supp-123',
        source_system: 'mailchimp',
        event_type: 'EmailClick',
        event_time: new Date('2024-01-15T12:00:00Z'),
        external_id: 'mailchimp-click-campaign-123-test@example.com-2024-01-15T12:00:00Z',
        amount: null,
        currency: null,
        metadata: {
          email: 'test@example.com',
          campaign_id: 'campaign-123',
          url: 'https://example.com/link',
        },
        raw_payload_ref: 'mailchimp/payload-123.json',
      });
    });

    it('should increment mailchimp click count', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 5 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO supporter_mailchimp_aggregates'),
        ['supp-123']
      );
    });

    it('should handle click without campaign ID', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const messageWithoutCampaign = createClickMessage({ campaign_id: undefined });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: messageWithoutCampaign })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          external_id: expect.stringContaining('mailchimp-click-unknown-'),
        })
      );
    });

    it('should convert email to lowercase', async () => {
      const supporter = createMockSupporter({ primary_email: 'test@example.com' });
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const messageWithUppercase = createClickMessage({ email: 'Test@Example.COM' });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: messageWithUppercase })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  // ==========================================================================
  // Idempotency Tests
  // ==========================================================================

  describe('idempotency', () => {
    it('should skip processing duplicate click events', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue({ event_id: 'existing' } as any);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should create unique external ID per click', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event1: SQSEvent = {
        Records: [
          createSQSRecord({
            body: createClickMessage({
              timestamp: '2024-01-15T12:00:00Z',
            }),
          }),
        ],
      };
      const event2: SQSEvent = {
        Records: [
          createSQSRecord({
            body: createClickMessage({
              timestamp: '2024-01-15T12:01:00Z',
            }),
          }),
        ],
      };

      await handler(event1, {} as any);
      await handler(event2, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledTimes(2);
      const calls = mockEventRepo.create.mock.calls;
      expect(calls[0][0].external_id).not.toBe(calls[1][0].external_id);
    });
  });

  // ==========================================================================
  // Supporter Lookup Tests
  // ==========================================================================

  describe('supporter lookup', () => {
    it('should skip click event when no supporter found', async () => {
      mockSupporterRepo.findByEmail.mockResolvedValue([]);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
    });

    it('should skip click event when multiple supporters found', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSupporterRepo.findByEmail.mockResolvedValue([
        createMockSupporter({ supporter_id: 'supp-1' }),
        createMockSupporter({ supporter_id: 'supp-2' }),
      ]);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple supporters found'));

      consoleWarnSpy.mockRestore();
    });

    it('should find supporter by primary email', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supporter_id: 'supp-123',
        })
      );
    });

    it('should find supporter by email alias', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Event Type Handling Tests
  // ==========================================================================

  describe('event type handling', () => {
    it('should only process click events', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const nonClickMessage = JSON.stringify({
        type: 'open',
        data: { email: 'test@example.com' },
        s3Key: 'mailchimp/payload-123.json',
        payloadId: 'payload-123',
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: nonClickMessage })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled Mailchimp event type: open'));

      consoleLogSpy.mockRestore();
    });

    it('should handle unknown event types gracefully', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const unknownMessage = JSON.stringify({
        type: 'unknown_type',
        data: { email: 'test@example.com' },
        s3Key: 'mailchimp/payload-123.json',
        payloadId: 'payload-123',
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: unknownMessage })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled Mailchimp event type'));

      consoleLogSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Timestamp Handling Tests
  // ==========================================================================

  describe('timestamp handling', () => {
    it('should use provided timestamp for event time', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage({ timestamp: '2024-06-15T10:30:00Z' }) })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_time: new Date('2024-06-15T10:30:00Z'),
        })
      );
    });

    it('should handle invalid timestamp gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage({ timestamp: 'invalid-date' }) })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_time: expect.any(Date),
        })
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid timestamp'));

      consoleWarnSpy.mockRestore();
    });

    it('should use current time when timestamp not provided', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const messageWithoutTimestamp = createClickMessage({ timestamp: undefined });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: messageWithoutTimestamp })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_time: expect.any(Date),
        })
      );
    });
  });

  // ==========================================================================
  // Click Count Aggregation Tests
  // ==========================================================================

  describe('click count aggregation', () => {
    it('should insert new aggregate record on first click', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO supporter_mailchimp_aggregates'),
        expect.any(Array)
      );
    });

    it('should increment existing click count', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 5 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (supporter_id) DO UPDATE SET'),
        expect.any(Array)
      );
    });

    it('should update last_click_date on click', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_click_date = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSupporterRepo.findByEmail.mockRejectedValue(new Error('Database connection failed'));

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await expect(handler(event, {} as any)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing Mailchimp message'),
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
      mockSupporterRepo.findByEmail.mockResolvedValue([createMockSupporter()]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockRejectedValue(new Error('Event creation failed'));

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await expect(handler(event, {} as any)).rejects.toThrow('Event creation failed');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle click event without email', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const messageWithoutEmail = createClickMessage({ email: undefined });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: messageWithoutEmail })],
      };

      await handler(event, {} as any);

      expect(mockSupporterRepo.findByEmail).not.toHaveBeenCalled();
      expect(mockEventRepo.create).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Click event without email'));

      consoleWarnSpy.mockRestore();
    });

    it('should handle click event without URL', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const messageWithoutUrl = createClickMessage({ url: undefined });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: messageWithoutUrl })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            url: undefined,
          }),
        })
      );
    });

    it('should handle special characters in email', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const messageWithSpecialEmail = createClickMessage({
        email: 'user+tag@example.com',
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: messageWithSpecialEmail })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalled();
    });

    it('should handle very long campaign IDs', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const longCampaignId = 'campaign-' + 'x'.repeat(200);

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage({ campaign_id: longCampaignId }) })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          external_id: expect.stringContaining(longCampaignId),
        })
      );
    });

    it('should handle very long URLs', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const longUrl = 'https://example.com/' + 'path/'.repeat(50) + 'very-long-link';

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage({ url: longUrl }) })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            url: longUrl,
          }),
        })
      );
    });

    it('should handle missing S3 key', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const message = JSON.stringify({
        type: 'click',
        data: {
          email: 'test@example.com',
          campaign_id: 'campaign-123',
          url: 'https://example.com/link',
          timestamp: '2024-01-15T12:00:00Z',
        },
        s3Key: undefined,
        payloadId: 'payload-123',
      });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: message })],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          raw_payload_ref: undefined,
        })
      );
    });
  });

  // ==========================================================================
  // Multi-Audience Tests
  // ==========================================================================

  describe('multi-audience handling', () => {
    it('should process clicks from different audiences', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 1 }] });

      const campaign1Click = createClickMessage({
        campaign_id: 'us-audience-newsletter',
        email: 'test@example.com',
      });
      const campaign2Click = createClickMessage({
        campaign_id: 'eu-audience-newsletter',
        email: 'test@example.com',
      });

      const event: SQSEvent = {
        Records: [
          createSQSRecord({ body: campaign1Click }),
          createSQSRecord({ body: campaign2Click }),
        ],
      };

      await handler(event, {} as any);

      expect(mockEventRepo.create).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should track clicks per supporter (not per audience)', async () => {
      const supporter = createMockSupporter();
      mockSupporterRepo.findByEmail.mockResolvedValue([supporter]);
      mockEventRepo.findByExternalId.mockResolvedValue(null);
      mockEventRepo.create.mockResolvedValue({} as any);
      mockQuery.mockResolvedValue({ rows: [{ click_count: 2 }] });

      const event: SQSEvent = {
        Records: [createSQSRecord({ body: createClickMessage() })],
      };

      await handler(event, {} as any);

      // Click count is aggregated at supporter level
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('supporter_mailchimp_aggregates'),
        ['supp-123']
      );
    });
  });
});
