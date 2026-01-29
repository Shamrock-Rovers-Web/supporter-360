/**
 * Supporter Repository Tests
 *
 * Comprehensive tests for the SupporterRepository including:
 * - CRUD operations
 * - Search functionality
 * - Merge operations
 * - Email alias management
 * - Linked IDs management
 * - Profile queries
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { SupporterRepository, SupporterNotFoundError, MergeConflictError } from './supporter.repository';
import type { Supporter, SearchResult, SupporterProfile } from '@supporter360/shared';

// Mock the connection module before importing
const mockQuery = mock(() => Promise.resolve({ rows: [] }));
const mockTransaction = mock(() => Promise.resolve({}));

mock.module('../connection', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

import { query, transaction } from '../connection';

describe('SupporterRepository', () => {
  let repository: SupporterRepository;

  beforeEach(() => {
    mockQuery.mockClear();
    mockTransaction.mockClear();
    repository = new SupporterRepository();
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createMockSupporter = (overrides?: Partial<Supporter>): Supporter => ({
    supporter_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    primary_email: 'john@example.com',
    phone: '+353871234567',
    supporter_type: 'Member',
    supporter_type_source: 'auto',
    flags: {},
    linked_ids: {},
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });

  const createMockSearchResult = (overrides?: Partial<SearchResult>): SearchResult => ({
    supporter_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com',
    supporter_type: 'Member',
    last_ticket_order_date: null,
    last_shop_order_date: null,
    last_stadium_entry_date: null,
    membership_status: null,
    ...overrides,
  });

  // ==========================================================================
  // CRUD Operations Tests
  // ==========================================================================

  describe('create', () => {
    it('should create a new supporter with generated ID', async () => {
      const mockSupporter = createMockSupporter();
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      const result = await repository.create({
        name: 'John Doe',
        primary_email: 'john@example.com',
        supporter_type: 'Unknown',
      });

      expect(result).toEqual(mockSupporter);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO supporter'),
        expect.arrayContaining([
          expect.any(String), // supporter_id (UUID)
          'John Doe',
          'john@example.com',
          null, // phone
          'Unknown',
          'auto',
          expect.stringContaining('{}'), // flags JSON
          expect.stringContaining('{}'), // linked_ids JSON
          expect.any(Date),
          expect.any(Date),
        ])
      );
    });

    it('should create a supporter with provided ID', async () => {
      const providedId = 'custom-uuid-1234';
      const mockSupporter = createMockSupporter({ supporter_id: providedId });
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      const result = await repository.create({
        supporter_id: providedId,
        name: 'Jane Doe',
        primary_email: 'jane@example.com',
        supporter_type: 'Shop Buyer',
      });

      expect(result.supporter_id).toBe(providedId);
    });

    it('should handle null values correctly', async () => {
      const mockSupporter = createMockSupporter({
        name: null,
        primary_email: null,
        phone: null,
      });
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      await repository.create({
        supporter_type: 'Unknown',
      });

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should serialize flags and linked_ids as JSON', async () => {
      const mockSupporter = createMockSupporter({
        flags: { shared_email: true },
        linked_ids: { shopify: '123456' },
      });
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      await repository.create({
        name: 'Test User',
        flags: { shared_email: true },
        linked_ids: { shopify: '123456' },
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][7]).toBe('{"shared_email":true}'); // flags
      expect(callArgs[1][8]).toBe('{"shopify":"123456"}'); // linked_ids
    });
  });

  // ==========================================================================
  // Find Operations Tests
  // ==========================================================================

  describe('findById', () => {
    it('should find a supporter by ID', async () => {
      const mockSupporter = createMockSupporter();
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      const result = await repository.findById('supporter-123');

      expect(result).toEqual(mockSupporter);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM supporter WHERE supporter_id = $1',
        ['supporter-123']
      );
    });

    it('should return null if supporter not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find supporters by primary email', async () => {
      const mockSupporters = [createMockSupporter()];
      mockQuery.mockResolvedValue({ rows: mockSupporters });

      const result = await repository.findByEmail('john@example.com');

      expect(result).toEqual(mockSupporters);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT s.* FROM supporter s'),
        ['john@example.com']
      );
    });

    it('should find supporters by email alias', async () => {
      const mockSupporters = [createMockSupporter()];
      mockQuery.mockResolvedValue({ rows: mockSupporters });

      await repository.findByEmail('alias@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN email_alias ea'),
        expect.any(Array)
      );
    });

    it('should return empty array if no supporters found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toEqual([]);
    });
  });

  describe('findByPhone', () => {
    it('should find supporters by phone number', async () => {
      const mockSupporters = [createMockSupporter()];
      mockQuery.mockResolvedValue({ rows: mockSupporters });

      const result = await repository.findByPhone('+353871234567');

      expect(result).toEqual(mockSupporters);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM supporter WHERE phone = $1',
        ['+353871234567']
      );
    });

    it('should return empty array if no supporters found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByPhone('+353870000000');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Search Operations Tests
  // ==========================================================================

  describe('search', () => {
    it('should search by email field', async () => {
      const mockResults = [createMockSearchResult()];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockResults });

      const result = await repository.search({
        query: 'john@example.com',
        field: 'email',
      });

      expect(result.results).toEqual(mockResults);
      expect(result.total).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('(s.primary_email = $1 OR ea.email = $1)'),
        expect.any(Array)
      );
    });

    it('should search by name field with partial match', async () => {
      const mockResults = [createMockSearchResult({ name: 'John Johnson' })];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockResults });

      const result = await repository.search({
        query: 'John',
        field: 'name',
      });

      expect(result.results[0].name).toBe('John Johnson');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('s.name ILIKE $1'),
        expect.arrayContaining(['%John%'])
      );
    });

    it('should search by phone field with partial match', async () => {
      const mockResults = [createMockSearchResult()];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockResults });

      await repository.search({
        query: '871234567',
        field: 'phone',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('s.phone ILIKE $1'),
        expect.arrayContaining(['%871234567%'])
      );
    });

    it('should search all fields when field is "all"', async () => {
      const mockResults = [createMockSearchResult()];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockResults });

      await repository.search({
        query: 'john',
        field: 'all',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('(s.primary_email ILIKE $1 OR ea.email ILIKE $1 OR s.name ILIKE $1 OR s.phone ILIKE $1)'),
        expect.any(Array)
      );
    });

    it('should filter by supporter_type', async () => {
      const mockResults = [createMockSearchResult()];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockResults });

      await repository.search({
        query: 'john',
        field: 'all',
        supporter_type: 'Member',
      });

      const callArgs = mockQuery.mock.calls[1];
      expect(callArgs[1]).toContain('Member');
    });

    it('should filter by multiple supporter types', async () => {
      const mockResults = [createMockSearchResult()];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockResults });

      await repository.search({
        query: 'john',
        field: 'all',
        supporter_type: ['Member', 'Season Ticket Holder'],
      });

      const callArgs = mockQuery.mock.calls[1];
      expect(callArgs[1]).toContain(['Member', 'Season Ticket Holder']);
    });

    it('should apply pagination correctly', async () => {
      const mockResults = [createMockSearchResult()];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: mockResults });

      await repository.search({
        query: 'john',
        field: 'all',
        limit: 20,
        offset: 40,
      });

      const countCallArgs = mockQuery.mock.calls[0];
      const dataCallArgs = mockQuery.mock.calls[1];

      // Count query should not include limit/offset
      expect(countCallArgs[1].slice(-2)).not.toEqual([20, 40]);

      // Data query should include limit/offset
      expect(dataCallArgs[1].slice(-2)).toEqual([20, 40]);
    });

    it('should return correct total count', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '42' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await repository.search({
        query: 'john',
        field: 'all',
      });

      expect(result.total).toBe(42);
    });
  });

  // ==========================================================================
  // Update Operations Tests
  // ==========================================================================

  describe('update', () => {
    it('should update supporter fields', async () => {
      const mockSupporter = createMockSupporter({ name: 'Updated Name' });
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      const result = await repository.update('supporter-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE supporter SET'),
        expect.arrayContaining([expect.any(Date), 'Updated Name', 'supporter-123'])
      );
    });

    it('should update JSON fields correctly', async () => {
      const mockSupporter = createMockSupporter({
        flags: { shared_email: true },
        linked_ids: { shopify: '123' },
      });
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      await repository.update('supporter-123', {
        flags: { shared_email: true },
        linked_ids: { shopify: '123' },
      });

      const callArgs = mockQuery.mock.calls[0];
      const sql = callArgs[0];
      expect(sql).toContain('flags = $');
      expect(sql).toContain('linked_ids = $');
    });

    it('should throw SupporterNotFoundError if supporter not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        repository.update('nonexistent', { name: 'Test' })
      ).rejects.toThrow(SupporterNotFoundError);
    });

    it('should update multiple fields at once', async () => {
      const mockSupporter = createMockSupporter({
        name: 'New Name',
        phone: '+353879999999',
        supporter_type: 'Season Ticket Holder',
      });
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      const result = await repository.update('supporter-123', {
        name: 'New Name',
        phone: '+353879999999',
        supporter_type: 'Season Ticket Holder',
      });

      expect(result.name).toBe('New Name');
      expect(result.phone).toBe('+353879999999');
      expect(result.supporter_type).toBe('Season Ticket Holder');
    });
  });

  // ==========================================================================
  // Merge Operations Tests
  // ==========================================================================

  describe('merge', () => {
    const mockSource = createMockSupporter({
      supporter_id: 'source-uuid',
      name: 'Source User',
      primary_email: 'source@example.com',
      flags: {},
      linked_ids: { shopify: 'source-shopify' },
    });

    const mockTarget = createMockSupporter({
      supporter_id: 'target-uuid',
      name: 'Target User',
      primary_email: 'target@example.com',
      flags: {},
      linked_ids: { stripe: 'target-stripe' },
    });

    it('should merge two supporters successfully', async () => {
      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [mockSource] }))
          .mockResolvedValueOnce({ rows: [mockSource] }) // Fetch source
          .mockResolvedValueOnce({ rows: [mockTarget] }) // Fetch target
          .mockResolvedValueOnce({ rows: [] }) // Source aliases
          .mockResolvedValueOnce({ rows: [] }) // Target aliases
          .mockResolvedValueOnce({}) // Reassign events
          .mockResolvedValueOnce({}) // Insert aliases
          .mockResolvedValueOnce({}) // Delete source aliases
          .mockResolvedValueOnce({}) // Reassign membership
          .mockResolvedValueOnce({}) // Reassign mailchimp membership
          .mockResolvedValueOnce({}) // Update linked_ids
          .mockResolvedValueOnce({}) // Insert audit log
          .mockResolvedValueOnce({}) // Delete source
          .mockResolvedValueOnce({ rows: [mockTarget] }), // Fetch merged
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      const result = await repository.merge('source-uuid', 'target-uuid', 'admin-123', 'Duplicate records');

      expect(result.supporter_id).toBe('target-uuid');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE event SET supporter_id = $1 WHERE supporter_id = $2'),
        ['target-uuid', 'source-uuid']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM supporter WHERE supporter_id = $1'),
        ['source-uuid']
      );
    });

    it('should merge linked_ids from both supporters', async () => {
      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [mockSource] }))
          .mockResolvedValueOnce({ rows: [mockSource] })
          .mockResolvedValueOnce({ rows: [mockTarget] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({}) // This is the linked_ids update
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ rows: [mockTarget] }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await repository.merge('source-uuid', 'target-uuid', 'admin-123');

      const linkedIdsCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('UPDATE supporter SET linked_ids = $1')
      );

      expect(linkedIdsCall).toBeDefined();
      const mergedLinkedIds = JSON.parse(linkedIdsCall![1][0]);
      expect(mergedLinkedIds).toEqual({
        shopify: 'source-shopify',
        stripe: 'target-stripe',
      });
    });

    it('should throw SupporterNotFoundError if source not found', async () => {
      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [] }))
          .mockResolvedValueOnce({ rows: [] }), // Source not found
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await expect(
        repository.merge('nonexistent-source', 'target-uuid', 'admin-123')
      ).rejects.toThrow(SupporterNotFoundError);
    });

    it('should throw SupporterNotFoundError if target not found', async () => {
      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [mockSource] }))
          .mockResolvedValueOnce({ rows: [mockSource] })
          .mockResolvedValueOnce({ rows: [] }), // Target not found
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await expect(
        repository.merge('source-uuid', 'nonexistent-target', 'admin-123')
      ).rejects.toThrow(SupporterNotFoundError);
    });

    it('should throw MergeConflictError if source has shared email flag', async () => {
      const sourceWithSharedEmail = createMockSupporter({
        supporter_id: 'source-uuid',
        flags: { shared_email: true },
      });

      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [sourceWithSharedEmail] }))
          .mockResolvedValueOnce({ rows: [sourceWithSharedEmail] })
          .mockResolvedValueOnce({ rows: [mockTarget] }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await expect(
        repository.merge('source-uuid', 'target-uuid', 'admin-123')
      ).rejects.toThrow(MergeConflictError);
    });

    it('should throw MergeConflictError if target has shared email flag', async () => {
      const targetWithSharedEmail = createMockSupporter({
        supporter_id: 'target-uuid',
        flags: { shared_email: true },
      });

      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [mockSource] }))
          .mockResolvedValueOnce({ rows: [mockSource] })
          .mockResolvedValueOnce({ rows: [targetWithSharedEmail] }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await expect(
        repository.merge('source-uuid', 'target-uuid', 'admin-123')
      ).rejects.toThrow(MergeConflictError);
    });

    it('should throw MergeConflictError if both have identical primary email', async () => {
      const sourceWithEmail = createMockSupporter({
        supporter_id: 'source-uuid',
        primary_email: 'same@example.com',
      });

      const targetWithEmail = createMockSupporter({
        supporter_id: 'target-uuid',
        primary_email: 'same@example.com',
      });

      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [sourceWithEmail] }))
          .mockResolvedValueOnce({ rows: [sourceWithEmail] })
          .mockResolvedValueOnce({ rows: [targetWithEmail] }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await expect(
        repository.merge('source-uuid', 'target-uuid', 'admin-123')
      ).rejects.toThrow(MergeConflictError);
    });

    it('should throw MergeConflictError if they share email aliases', async () => {
      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [mockSource] }))
          .mockResolvedValueOnce({ rows: [mockSource] })
          .mockResolvedValueOnce({ rows: [mockTarget] })
          .mockResolvedValueOnce({ rows: [{ email: 'shared@example.com' }] }) // Source aliases
          .mockResolvedValueOnce({ rows: [{ email: 'shared@example.com' }] }), // Target aliases
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await expect(
        repository.merge('source-uuid', 'target-uuid', 'admin-123')
      ).rejects.toThrow(MergeConflictError);
    });

    it('should write audit log entry', async () => {
      const mockClient = {
        query: mock(() =>
          Promise.resolve({ rows: [mockSource] }))
          .mockResolvedValueOnce({ rows: [mockSource] })
          .mockResolvedValueOnce({ rows: [mockTarget] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({}) // Audit log insert
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ rows: [mockTarget] }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await repository.merge('source-uuid', 'target-uuid', 'admin-123', 'Duplicate detected');

      const auditLogCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO audit_log')
      );

      expect(auditLogCall).toBeDefined();
      expect(auditLogCall![1][1]).toBe('admin-123'); // actor
      expect(auditLogCall![1][2]).toBe('merge'); // action
      expect(auditLogCall![1][6]).toBe('Duplicate detected'); // reason
    });
  });

  // ==========================================================================
  // Linked IDs Management Tests
  // ==========================================================================

  describe('getLinkedIds', () => {
    it('should return linked IDs for a supporter', async () => {
      const mockSupporter = createMockSupporter({
        linked_ids: { shopify: '123', stripe: '456' },
      });
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      const result = await repository.getLinkedIds('supporter-123');

      expect(result).toEqual({ shopify: '123', stripe: '456' });
    });

    it('should return empty object if no linked IDs', async () => {
      const mockSupporter = createMockSupporter({ linked_ids: null });
      mockQuery.mockResolvedValue({ rows: [mockSupporter] });

      const result = await repository.getLinkedIds('supporter-123');

      expect(result).toEqual({});
    });

    it('should throw SupporterNotFoundError if supporter not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        repository.getLinkedIds('nonexistent')
      ).rejects.toThrow(SupporterNotFoundError);
    });
  });

  describe('updateLinkedIds', () => {
    it('should merge new linked IDs with existing ones', async () => {
      const existing = { shopify: '123' };
      const newIds = { stripe: '456' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ linked_ids: existing }] })
        .mockResolvedValueOnce({});

      await repository.updateLinkedIds('supporter-123', newIds);

      const updateCall = mockQuery.mock.calls[1];
      const mergedIds = JSON.parse(updateCall[1][0]);
      expect(mergedIds).toEqual({ shopify: '123', stripe: '456' });
    });

    it('should overwrite existing linked IDs with same keys', async () => {
      const existing = { shopify: '123' };
      const newIds = { shopify: '789' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ linked_ids: existing }] })
        .mockResolvedValueOnce({});

      await repository.updateLinkedIds('supporter-123', newIds);

      const updateCall = mockQuery.mock.calls[1];
      const mergedIds = JSON.parse(updateCall[1][0]);
      expect(mergedIds).toEqual({ shopify: '789' });
    });
  });

  // ==========================================================================
  // Email Alias Management Tests
  // ==========================================================================

  describe('addEmailAlias', () => {
    it('should add an email alias', async () => {
      const mockAlias = {
        id: 1,
        email: 'alias@example.com',
        supporter_id: 'supporter-123',
        is_shared: false,
        created_at: new Date(),
      };
      mockQuery.mockResolvedValue({ rows: [mockAlias] });

      const result = await repository.addEmailAlias('supporter-123', 'alias@example.com');

      expect(result.email).toBe('alias@example.com');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_alias'),
        ['supporter-123', 'alias@example.com', false]
      );
    });

    it('should add shared email alias', async () => {
      const mockAlias = {
        id: 1,
        email: 'shared@example.com',
        supporter_id: 'supporter-123',
        is_shared: true,
        created_at: new Date(),
      };
      mockQuery.mockResolvedValue({ rows: [mockAlias] });

      const result = await repository.addEmailAlias('supporter-123', 'shared@example.com', true);

      expect(result.is_shared).toBe(true);
    });
  });

  describe('getEmailAliases', () => {
    it('should return all email aliases for a supporter', async () => {
      const mockAliases = [
        { id: 1, email: 'alias1@example.com', supporter_id: 'supporter-123', is_shared: false, created_at: new Date() },
        { id: 2, email: 'alias2@example.com', supporter_id: 'supporter-123', is_shared: false, created_at: new Date() },
      ];
      mockQuery.mockResolvedValue({ rows: mockAliases });

      const result = await repository.getEmailAliases('supporter-123');

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('alias1@example.com');
    });

    it('should return empty array if no aliases', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getEmailAliases('supporter-123');

      expect(result).toEqual([]);
    });
  });

  describe('removeEmailAlias', () => {
    it('should remove an email alias', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.removeEmailAlias('alias@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM email_alias WHERE email = $1',
        ['alias@example.com']
      );
    });
  });

  // ==========================================================================
  // Profile Query Tests
  // ==========================================================================

  describe('getProfile', () => {
    it('should return null if supporter not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getProfile('nonexistent');

      expect(result).toBeNull();
    });

    it('should return complete supporter profile', async () => {
      const mockSupporter = createMockSupporter();
      const mockAliases = [
        { id: 1, email: 'alias@example.com', supporter_id: 'supporter-123', is_shared: false, created_at: new Date() },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [mockSupporter] }) // findById
        .mockResolvedValueOnce({ rows: mockAliases }) // getEmailAliases
        .mockResolvedValueOnce({ rows: [null] }) // getMembership
        .mockResolvedValueOnce({ rows: [] }) // getMailchimpMemberships
        .mockResolvedValueOnce({ rows: [null] }) // getLastEvent - TicketPurchase
        .mockResolvedValueOnce({ rows: [null] }) // getLastEvent - ShopOrder
        .mockResolvedValueOnce({ rows: [null] }); // getLastEvent - StadiumEntry

      const result = await repository.getProfile('supporter-123');

      expect(result).toBeDefined();
      expect(result?.supporter_id).toBe(mockSupporter.supporter_id);
      expect(result?.emails).toEqual(mockAliases);
    });
  });

  describe('getMembership', () => {
    it('should return membership for a supporter', async () => {
      const mockMembership = {
        id: 1,
        supporter_id: 'supporter-123',
        tier: 'Full',
        cadence: 'Annual',
        billing_method: 'gocardless',
        status: 'Active',
        last_payment_date: new Date(),
        next_expected_payment_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.getMembership('supporter-123');

      expect(result).toEqual(mockMembership);
    });

    it('should return null if no membership', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getMembership('supporter-123');

      expect(result).toBeNull();
    });
  });

  describe('getLastEvent', () => {
    it('should return the most recent event of a type', async () => {
      const mockEvent = {
        event_id: 'event-123',
        supporter_id: 'supporter-123',
        source_system: 'shopify',
        event_type: 'ShopOrder',
        event_time: new Date(),
        external_id: 'order-123',
        amount: 100,
        currency: 'EUR',
        metadata: {},
        raw_payload_ref: 's3://key',
        created_at: new Date(),
      };
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
});
