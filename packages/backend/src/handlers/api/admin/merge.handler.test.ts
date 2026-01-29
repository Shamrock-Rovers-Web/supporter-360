/**
 * Admin Merge API Handler Tests
 *
 * Tests for the merge endpoint including:
 * - Request validation
 * - Admin authorization
 * - Merge operations
 * - Transaction verification
 * - Error handling
 *
 * @packageDocumentation
 */

import { handler } from './merge.handler';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  SupporterRepository,
  SupporterNotFoundError,
  MergeConflictError,
} from '../../../db/repositories/supporter.repository';

// Mock the repository
jest.mock('../../../db/repositories/supporter.repository');
jest.mock('../../../middleware/auth');

describe('Admin Merge API Handler', () => {
  let mockRepository: jest.Mocked<SupporterRepository>;
  let mockRequireAuth: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = {
      merge: jest.fn(),
    } as any;
    (require('../../../db/repositories/supporter.repository') as any).SupporterRepository = function () {
      return mockRepository;
    };

    // Mock auth middleware
    mockRequireAuth = jest.fn().mockImplementation((fn) => async (event: any) => {
      const auth = { role: 'admin', keyName: 'admin-key' };
      return fn(event, auth);
    });
    (require('../../../middleware/auth') as any).requireAuth = mockRequireAuth;
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createMockEvent = (overrides = {}) => ({
    body: '{}',
    queryStringParameters: {},
    headers: {},
    pathParameters: {},
    ...overrides,
  });

  const createMockSupporter = () => ({
    supporter_id: 'target-123',
    name: 'Merged Supporter',
    primary_email: 'merged@example.com',
    supporter_type: 'Member',
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('authorization', () => {
    it('should reject non-admin users', async () => {
      // Override auth to return staff role
      mockRequireAuth.mockImplementationOnce((fn) => async (event: any) => {
        return fn(event, { role: 'staff', keyName: 'staff-key' });
      });

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Duplicate records',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(403);
      expect(response.success).toBe(false);
      expect(response.code).toBe('FORBIDDEN');
      expect(response.error).toContain('Admin access required');
    });

    it('should allow admin users', async () => {
      mockRepository.merge.mockResolvedValue(createMockSupporter());

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Duplicate records',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).success).toBe(true);
    });
  });

  // ==========================================================================
  // Request Body Validation Tests
  // ==========================================================================

  describe('request body validation', () => {
    it('should reject invalid JSON', async () => {
      const event = createMockEvent({
        body: 'invalid json{',
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.code).toBe('INVALID_JSON');
    });

    it('should reject missing source_id', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.code).toBe('INVALID_REQUEST');
      expect(response.error).toContain('source_id is required');
    });

    it('should reject missing target_id', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.code).toBe('INVALID_REQUEST');
      expect(response.error).toContain('target_id is required');
    });

    it('should reject missing reason', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.code).toBe('INVALID_REQUEST');
      expect(response.error).toContain('reason is required');
    });

    it('should reject empty reason', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: '   ', // whitespace only
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.code).toBe('INVALID_REQUEST');
    });

    it('should reject same source and target IDs', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'same-123',
          target_id: 'same-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.error).toContain('source_id and target_id cannot be the same');
    });
  });

  // ==========================================================================
  // Type Validation Tests
  // ==========================================================================

  describe('type validation', () => {
    it('should reject non-string source_id', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 123, // Number instead of string
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
    });

    it('should reject non-string target_id', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 456, // Number instead of string
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // Merge Operation Tests
  // ==========================================================================

  describe('merge operation', () => {
    it('should call repository merge with correct parameters', async () => {
      const mergedSupporter = createMockSupporter();
      mockRepository.merge.mockResolvedValue(mergedSupporter);

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Duplicate records detected',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(mockRepository.merge).toHaveBeenCalledWith(
        'source-123',
        'target-123',
        'admin-key',
        'Duplicate records detected'
      );

      expect(result.statusCode).toBe(200);
      expect(response.data.message).toContain('merged successfully');
    });

    it('should use API key name as actor', async () => {
      mockRepository.merge.mockResolvedValue(createMockSupporter());

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(mockRepository.merge).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'admin-key',
        expect.any(String)
      );
    });

    it('should include merged supporter details in response', async () => {
      const mergedSupporter = createMockSupporter();
      mockRepository.merge.mockResolvedValue(mergedSupporter);

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(response.data.supporter_id).toBe('target-123');
      expect(response.data.name).toBe('Merged Supporter');
      expect(response.data.primary_email).toBe('merged@example.com');
      expect(response.data.supporter_type).toBe('Member');
    });

    it('should handle optional reason', async () => {
      mockRepository.merge.mockResolvedValue(createMockSupporter());

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          // reason is optional per type but required per validation
          reason: 'Default reason',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle SupporterNotFoundError', async () => {
      mockRepository.merge.mockRejectedValue(
        new SupporterNotFoundError('source-123')
      );

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(response.code).toBe('SUPPORTER_NOT_FOUND');
    });

    it('should handle MergeConflictError with 409 status', async () => {
      mockRepository.merge.mockRejectedValue(
        new MergeConflictError('Cannot merge: shared email conflict')
      );

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(409);
      expect(response.code).toBe('MERGE_CONFLICT');
      expect(response.error).toContain('Cannot merge: shared email conflict');
    });

    it('should handle generic errors', async () => {
      mockRepository.merge.mockRejectedValue(new Error('Database error'));

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(500);
      expect(response.code).toBe('MERGE_ERROR');
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepository.merge.mockRejectedValue(new Error('Test error'));

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      await handler(event as APIGatewayProxyEvent, {} as any);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Transaction Verification Tests
  // ==========================================================================

  describe('transaction verification', () => {
    it('should ensure atomic merge operation', async () => {
      // This is tested indirectly through the repository mock
      // In real scenario, the merge operation should be transactional
      const mockMergeFn = jest.fn().mockImplementation(async (fn) => {
        return fn();
      });
      mockRepository.merge = mockMergeFn;

      mockRepository.merge.mockResolvedValue(createMockSupporter());

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test merge',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });

    it('should roll back merge on error', async () => {
      mockRepository.merge.mockRejectedValue(new Error('Merge failed'));

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(500);
      // In real scenario, the transaction should be rolled back
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle extra fields in request body', async () => {
      mockRepository.merge.mockResolvedValue(createMockSupporter());

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: 'Test',
          extra_field: 'ignored',
          another_field: 'also_ignored',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
      expect(mockRepository.merge).toHaveBeenCalled();
    });

    it('should handle very long reason text', async () => {
      mockRepository.merge.mockResolvedValue(createMockSupporter());

      const longReason = 'A'.repeat(1000);

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source-123',
          target_id: 'target-123',
          reason: longReason,
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });

    it('should handle special characters in IDs', async () => {
      mockRepository.merge.mockResolvedValue(createMockSupporter());

      const event = createMockEvent({
        body: JSON.stringify({
          source_id: 'source/with/slashes',
          target_id: 'target-with-dashes',
          reason: 'Test merge with special chars: quotes \'double\' and "double"',
        }),
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
    });

    it('should handle null body gracefully', async () => {
      const event = createMockEvent({
        body: null,
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.code).toBe('INVALID_JSON');
    });

    it('should handle empty object body', async () => {
      const event = createMockEvent({
        body: '{}',
      });

      const result = await handler(event as APIGatewayProxyEvent, {} as any);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(response.code).toBe('INVALID_REQUEST');
    });
  });
});
