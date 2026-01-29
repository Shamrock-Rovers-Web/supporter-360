/**
 * Profile API Handler Tests
 *
 * Tests for the profile endpoint including:
 * - Supporter profile retrieval
 * - Overview aggregates
 * - Error handling
 *
 * @packageDocumentation
 */

import { handler } from './profile.handler';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { SupporterRepository, SupporterNotFoundError } from '../../db/repositories/supporter.repository';

// Mock the repository
jest.mock('../../db/repositories/supporter.repository');
jest.mock('../../middleware/auth');

describe('Profile API Handler', () => {
  let mockRepository: jest.Mocked<SupporterRepository>;
  let mockRequireAuth: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = {
      getProfile: jest.fn(),
    } as any;
    (require('../../db/repositories/supporter.repository') as any).SupporterRepository = function () {
      return mockRepository;
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

  const createMockSupporterProfile = () => ({
    supporter_id: 'supp-123',
    name: 'John Doe',
    primary_email: 'john@example.com',
    phone: '+353871234567',
    supporter_type: 'Member',
    supporter_type_source: 'auto',
    flags: {},
    linked_ids: {
      shopify: 'shop-123',
      stripe: 'pi-123',
    },
    emails: [
      { id: 1, email: 'alias@example.com', is_shared: false, created_at: new Date() },
    ],
    overview: {
      last_ticket_order: {
        event_id: 'evt-1',
        supporter_id: 'supp-123',
        source_system: 'futureticketing',
        event_type: 'TicketPurchase',
        event_time: new Date('2024-01-01'),
        external_id: 'ft-123',
        amount: 25,
        currency: 'EUR',
        metadata: {},
        created_at: new Date(),
      },
      last_shop_order: {
        event_id: 'evt-2',
        supporter_id: 'supp-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: new Date('2024-01-15'),
        external_id: 'shop-123',
        amount: 50,
        currency: 'EUR',
        metadata: {},
        created_at: new Date(),
      },
      membership: {
        id: 1,
        supporter_id: 'supp-123',
        tier: 'Full',
        cadence: 'Annual',
        billing_method: 'gocardless',
        status: 'Active',
        last_payment_date: new Date('2024-01-01'),
        next_expected_payment_date: new Date('2025-01-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },
      last_stadium_entry: {
        event_id: 'evt-3',
        supporter_id: 'supp-123',
        source_system: 'futureticketing',
        event_type: 'StadiumEntry',
        event_time: new Date('2024-01-20'),
        external_id: 'entry-123',
        amount: null,
        currency: null,
        metadata: {},
        created_at: new Date(),
      },
      mailchimp: [
        {
          id: 1,
          audience_id: 'aud1',
          mailchimp_contact_id: 'mc-123',
          tags: ['Member', 'Active'],
          last_synced_at: new Date('2024-01-01'),
          supporter_id: 'supp-123',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    },
    created_at: new Date(),
    updated_at: new Date(),
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
  // Profile Retrieval Tests
  // ==========================================================================

  describe('profile retrieval', () => {
    it('should return full supporter profile', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.success).toBe(true);

      expect(response.data.supporter_id).toBe('supp-123');
      expect(response.data.name).toBe('John Doe');
      expect(response.data.primary_email).toBe('john@example.com');
      expect(response.data.phone).toBe('+353871234567');
      expect(response.data.supporter_type).toBe('Member');
    });

    it('should return 404 if supporter not found', async () => {
      mockRepository.getProfile.mockResolvedValue(null);

      const event = createMockEvent({
        pathParameters: { id: 'nonexistent' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(response.success).toBe(false);
      expect(response.code).toBe('SUPPORTER_NOT_FOUND');
      expect(response.details.supporter_id).toBe('nonexistent');
    });

    it('should handle SupporterNotFoundError', async () => {
      mockRepository.getProfile.mockRejectedValue(
        new SupporterNotFoundError('supp-123')
      );

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(response.code).toBe('SUPPORTER_NOT_FOUND');
    });
  });

  // ==========================================================================
  // Email Aliases Tests
  // ==========================================================================

  describe('email aliases', () => {
    it('should include email aliases in response', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.emails).toEqual([
        { id: 1, email: 'alias@example.com', is_shared: false },
      ]);
    });

    it('should handle empty email aliases', async () => {
      const mockProfile = createMockSupporterProfile();
      mockProfile.emails = [];
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.emails).toEqual([]);
    });
  });

  // ==========================================================================
  // Overview Section Tests
  // ==========================================================================

  describe('overview section', () => {
    it('should include last_ticket_order in overview', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.overview.last_ticket_order).toEqual({
        event_id: 'evt-1',
        event_time: '2024-01-01T00:00:00.000Z',
        source_system: 'futureticketing',
        event_type: 'TicketPurchase',
        external_id: 'ft-123',
        amount: 25,
        currency: 'EUR',
        metadata: {},
      });
    });

    it('should include last_shop_order in overview', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.overview.last_shop_order).toEqual({
        event_id: 'evt-2',
        event_time: '2024-01-15T00:00:00.000Z',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        amount: 50,
        currency: 'EUR',
      });
    });

    it('should include membership in overview', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.overview.membership).toEqual({
        id: 1,
        tier: 'Full',
        cadence: 'Annual',
        billing_method: 'gocardless',
        status: 'Active',
        last_payment_date: '2024-01-01T00:00:00.000Z',
        next_expected_payment_date: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should handle null membership', async () => {
      const mockProfile = createMockSupporterProfile();
      mockProfile.overview.membership = null;
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.overview.membership).toBeNull();
    });

    it('should include last_stadium_entry in overview', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.overview.last_stadium_entry).toEqual({
        event_id: 'evt-3',
        event_time: '2024-01-20T00:00:00.000Z',
        source_system: 'futureticketing',
        event_type: 'StadiumEntry',
      });
    });

    it('should include mailchimp memberships in overview', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.overview.mailchimp).toEqual([
        {
          id: 1,
          audience_id: 'aud1',
          mailchimp_contact_id: 'mc-123',
          tags: ['Member', 'Active'],
          last_synced_at: '2024-01-01T00:00:00.000Z',
        },
      ]);
    });

    it('should handle null overview events', async () => {
      const mockProfile = createMockSupporterProfile();
      mockProfile.overview.last_ticket_order = null;
      mockProfile.overview.last_shop_order = null;
      mockProfile.overview.last_stadium_entry = null;
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.overview.last_ticket_order).toBeNull();
      expect(response.data.overview.last_shop_order).toBeNull();
      expect(response.data.overview.last_stadium_entry).toBeNull();
    });
  });

  // ==========================================================================
  // Linked IDs and Flags Tests
  // ==========================================================================

  describe('linked_ids and flags', () => {
    it('should include linked_ids in response', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.linked_ids).toEqual({
        shopify: 'shop-123',
        stripe: 'pi-123',
      });
    });

    it('should include flags in response', async () => {
      const mockProfile = createMockSupporterProfile();
      mockProfile.flags = { shared_email: true, duplicate_candidate: false };
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.flags).toEqual({
        shared_email: true,
        duplicate_candidate: false,
      });
    });

    it('should handle empty linked_ids and flags', async () => {
      const mockProfile = createMockSupporterProfile();
      mockProfile.linked_ids = {};
      mockProfile.flags = {};
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.linked_ids).toEqual({});
      expect(response.data.flags).toEqual({});
    });
  });

  // ==========================================================================
  // Response Format Tests
  // ==========================================================================

  describe('response format', () => {
    it('should return formatted timestamps', async () => {
      const mockProfile = createMockSupporterProfile();
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.created_at).toBeDefined();
      expect(response.data.updated_at).toBeDefined();
    });

    it('should return success response structure', async () => {
      mockRepository.getProfile.mockResolvedValue(createMockSupporterProfile());

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle repository errors', async () => {
      mockRepository.getProfile.mockRejectedValue(new Error('Database error'));

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(500);
      expect(response.success).toBe(false);
      expect(response.code).toBe('PROFILE_ERROR');
      expect(response.details.message).toBe('Database error');
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepository.getProfile.mockRejectedValue(new Error('Test error'));

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
    it('should handle supporter with null values', async () => {
      const mockProfile = createMockSupporterProfile();
      mockProfile.name = null;
      mockProfile.primary_email = null;
      mockProfile.phone = null;
      mockRepository.getProfile.mockResolvedValue(mockProfile);

      const event = createMockEvent({
        pathParameters: { id: 'supp-123' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.name).toBeNull();
      expect(response.data.primary_email).toBeNull();
      expect(response.data.phone).toBeNull();
    });

    it('should handle special characters in supporter ID', async () => {
      mockRepository.getProfile.mockResolvedValue(createMockSupporterProfile());

      const event = createMockEvent({
        pathParameters: { id: 'supp-123-with-special-chars' },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });

    it('should handle UUID format supporter IDs', async () => {
      const uuidId = '123e4567-e89b-12d3-a456-426614174000';
      mockRepository.getProfile.mockResolvedValue(createMockSupporterProfile());

      const event = createMockEvent({
        pathParameters: { id: uuidId },
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });
  });
});
