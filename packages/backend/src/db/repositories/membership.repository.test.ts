/**
 * Membership Repository Tests
 *
 * Comprehensive tests for the MembershipRepository including:
 * - Upsert operations
 * - CRUD operations
 * - Status management
 * - Grace period logic
 * - Bulk operations
 * - Statistics
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { MembershipRepository, MembershipNotFoundError, MembershipConflictError } from './membership.repository';

// Mock the connection module before importing
const mockQuery = mock(() => Promise.resolve({ rows: [] }));

mock.module('../connection', () => ({
  query: mockQuery,
}));

import { query } from '../connection';
import type {
  Membership,
  MembershipStatus,
  MembershipTier,
  MembershipCadence,
  BillingMethod,
} from '@supporter360/shared';

describe('MembershipRepository', () => {
  let repository: MembershipRepository;

  beforeEach(() => {
    mockQuery.mockClear();
    repository = new MembershipRepository();
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const createMockMembership = (overrides?: Partial<Membership>): Membership => ({
    id: 1,
    supporter_id: 'supporter-123',
    tier: 'Full',
    cadence: 'Annual',
    billing_method: 'gocardless',
    status: 'Active',
    last_payment_date: new Date('2024-01-01'),
    next_expected_payment_date: new Date('2025-01-01'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides,
  });

  // ==========================================================================
  // Upsert Operations Tests
  // ==========================================================================

  describe('upsert', () => {
    it('should create a new membership', async () => {
      const mockMembership = createMockMembership();
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.upsert({
        supporter_id: 'supporter-123',
        tier: 'Full',
        cadence: 'Annual',
        billing_method: 'gocardless',
        status: 'Active',
      });

      expect(result).toEqual(mockMembership);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO membership'),
        expect.arrayContaining([
          'supporter-123',
          'Full',
          'Annual',
          'gocardless',
          'Active',
          expect.any(Date),
          expect.any(Date),
          expect.any(Date),
          expect.any(Date),
          expect.any(Date),
        ])
      );
    });

    it('should update existing membership on conflict', async () => {
      const mockMembership = createMockMembership({ tier: 'OAP' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      await repository.upsert({
        supporter_id: 'supporter-123',
        tier: 'OAP',
        cadence: 'Annual',
        billing_method: 'gocardless',
        status: 'Active',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (supporter_id)'),
        expect.any(Array)
      );
    });

    it('should use default status of Unknown', async () => {
      const mockMembership = createMockMembership({ status: 'Unknown' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      await repository.upsert({
        supporter_id: 'supporter-123',
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][5]).toBe('Unknown'); // status parameter
    });

    it('should handle null values correctly', async () => {
      const mockMembership = createMockMembership({
        tier: null,
        cadence: null,
        billing_method: null,
      });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      await repository.upsert({
        supporter_id: 'supporter-123',
      });

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][1]).toBeNull(); // tier
      expect(callArgs[1][2]).toBeNull(); // cadence
      expect(callArgs[1][3]).toBeNull(); // billing_method
    });
  });

  // ==========================================================================
  // Find Operations Tests
  // ==========================================================================

  describe('findById', () => {
    it('should find membership by database ID', async () => {
      const mockMembership = createMockMembership();
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.findById(1);

      expect(result).toEqual(mockMembership);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM membership WHERE id = $1',
        [1]
      );
    });

    it('should return null if not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findBySupporterId', () => {
    it('should find membership by supporter ID', async () => {
      const mockMembership = createMockMembership();
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.findBySupporterId('supporter-123');

      expect(result).toEqual(mockMembership);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM membership WHERE supporter_id = $1',
        ['supporter-123']
      );
    });

    it('should return null if not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findBySupporterId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return membership status', async () => {
      mockQuery.mockResolvedValue({ rows: [{ status: 'Active' }] });

      const result = await repository.getStatus('supporter-123');

      expect(result).toBe('Active');
    });

    it('should return Unknown if membership not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getStatus('supporter-123');

      expect(result).toBe('Unknown');
    });
  });

  // ==========================================================================
  // Update Operations Tests
  // ==========================================================================

  describe('updateStatus', () => {
    it('should update membership status', async () => {
      const mockMembership = createMockMembership({ status: 'Past Due' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.updateStatus('supporter-123', 'Past Due');

      expect(result.status).toBe('Past Due');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE membership'),
        expect.arrayContaining(['Past Due', expect.any(Date), 'supporter-123'])
      );
    });

    it('should throw MembershipNotFoundError if not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        repository.updateStatus('nonexistent', 'Active')
      ).rejects.toThrow(MembershipNotFoundError);
    });
  });

  describe('updateLastPaymentDate', () => {
    it('should update last payment date for monthly cadence', async () => {
      const mockMembership = createMockMembership({
        cadence: 'Monthly',
        last_payment_date: new Date('2024-01-15'),
      });
      mockQuery
        .mockResolvedValueOnce({ rows: [mockMembership] })
        .mockResolvedValueOnce({ rows: [mockMembership] });

      const paymentDate = new Date('2024-01-15');
      const result = await repository.updateLastPaymentDate('supporter-123', paymentDate);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const callArgs = mockQuery.mock.calls[1];
      // Check that next payment is approximately 1 month later
      expect(callArgs[1][1]).toBeInstanceOf(Date);
    });

    it('should update last payment date for annual cadence', async () => {
      const mockMembership = createMockMembership({
        cadence: 'Annual',
        last_payment_date: new Date('2024-01-15'),
      });
      mockQuery
        .mockResolvedValueOnce({ rows: [mockMembership] })
        .mockResolvedValueOnce({ rows: [mockMembership] });

      const paymentDate = new Date('2024-01-15');
      await repository.updateLastPaymentDate('supporter-123', paymentDate);

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw MembershipNotFoundError if membership not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        repository.updateLastPaymentDate('nonexistent', new Date())
      ).rejects.toThrow(MembershipNotFoundError);
    });

    it('should handle null cadence gracefully', async () => {
      const mockMembership = createMockMembership({ cadence: null });
      mockQuery
        .mockResolvedValueOnce({ rows: [mockMembership] })
        .mockResolvedValueOnce({ rows: [mockMembership] });

      const result = await repository.updateLastPaymentDate('supporter-123', new Date());

      expect(result).toBeDefined();
      const callArgs = mockQuery.mock.calls[1];
      expect(callArgs[1][2]).toBeNull(); // next_expected_payment_date should be null
    });
  });

  describe('update', () => {
    it('should update specified fields only', async () => {
      const mockMembership = createMockMembership({ tier: 'Student' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.update('supporter-123', {
        tier: 'Student',
      });

      expect(result.tier).toBe('Student');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE membership SET'),
        expect.arrayContaining([expect.any(Date), 'Student', 'supporter-123'])
      );
    });

    it('should update multiple fields', async () => {
      const mockMembership = createMockMembership({
        tier: 'OAP',
        cadence: 'Annual',
        status: 'Past Due',
      });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.update('supporter-123', {
        tier: 'OAP',
        cadence: 'Annual',
        status: 'Past Due',
      });

      expect(result.tier).toBe('OAP');
      expect(result.cadence).toBe('Annual');
      expect(result.status).toBe('Past Due');
    });

    it('should throw MembershipNotFoundError if not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        repository.update('nonexistent', { status: 'Active' })
      ).rejects.toThrow(MembershipNotFoundError);
    });
  });

  // ==========================================================================
  // Status Management Tests
  // ==========================================================================

  describe('markActive', () => {
    it('should set status to Active', async () => {
      const mockMembership = createMockMembership({ status: 'Active' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.markActive('supporter-123');

      expect(result.status).toBe('Active');
    });
  });

  describe('markPastDue', () => {
    it('should set status to Past Due', async () => {
      const mockMembership = createMockMembership({ status: 'Past Due' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.markPastDue('supporter-123');

      expect(result.status).toBe('Past Due');
    });
  });

  describe('cancel', () => {
    it('should set status to Cancelled', async () => {
      const mockMembership = createMockMembership({ status: 'Cancelled' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.cancel('supporter-123');

      expect(result.status).toBe('Cancelled');
    });
  });

  // ==========================================================================
  // Grace Period Logic Tests
  // ==========================================================================

  describe('isActive', () => {
    it('should return true for Active status', async () => {
      const mockMembership = createMockMembership({ status: 'Active' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.isActive('supporter-123');

      expect(result).toBe(true);
    });

    it('should return true for Past Due within grace period', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3); // 3 days ago

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

      const mockMembership = createMockMembership({
        status: 'Past Due',
        next_expected_payment_date: pastDate,
      });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.isActive('supporter-123', 7);

      expect(result).toBe(true);
    });

    it('should return false for Past Due outside grace period', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const mockMembership = createMockMembership({
        status: 'Past Due',
        next_expected_payment_date: oldDate,
      });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.isActive('supporter-123', 7);

      expect(result).toBe(false);
    });

    it('should return false if no membership exists', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.isActive('supporter-123');

      expect(result).toBe(false);
    });

    it('should return false for Cancelled status', async () => {
      const mockMembership = createMockMembership({ status: 'Cancelled' });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.isActive('supporter-123');

      expect(result).toBe(false);
    });

    it('should use custom grace days', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

      const mockMembership = createMockMembership({
        status: 'Past Due',
        next_expected_payment_date: recentDate,
      });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      // With 3 day grace period, 5 days ago should be inactive
      const result = await repository.isActive('supporter-123', 3);

      expect(result).toBe(false);
    });

    it('should handle null next_expected_payment_date', async () => {
      const mockMembership = createMockMembership({
        status: 'Past Due',
        next_expected_payment_date: null,
      });
      mockQuery.mockResolvedValue({ rows: [mockMembership] });

      const result = await repository.isActive('supporter-123');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Bulk Operations Tests
  // ==========================================================================

  describe('findByStatus', () => {
    it('should find all memberships with given status', async () => {
      const mockMemberships = [
        createMockMembership({ id: 1, supporter_id: 'supporter-1' }),
        createMockMembership({ id: 2, supporter_id: 'supporter-2' }),
      ];
      mockQuery.mockResolvedValue({ rows: mockMemberships });

      const result = await repository.findByStatus('Active');

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM membership WHERE status = $1',
        ['Active']
      );
    });

    it('should return empty array if none found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByStatus('Cancelled');

      expect(result).toEqual([]);
    });
  });

  describe('findPastDue', () => {
    it('should find memberships past due with default grace period', async () => {
      const mockMemberships = [createMockMembership({ status: 'Past Due' })];
      mockQuery.mockResolvedValue({ rows: mockMemberships });

      const result = await repository.findPastDue();

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status IN'),
        expect.any(Array)
      );
    });

    it('should use custom grace period', async () => {
      const mockMemberships = [createMockMembership()];
      mockQuery.mockResolvedValue({ rows: mockMemberships });

      await repository.findPastDue(14);

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][0]).toBeInstanceOf(Date);
    });
  });

  describe('findUpcomingPayments', () => {
    it('should find memberships with upcoming payments', async () => {
      const mockMemberships = [createMockMembership()];
      mockQuery.mockResolvedValue({ rows: mockMemberships });

      const result = await repository.findUpcomingPayments(7);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = \'Active\''),
        expect.any(Array)
      );
    });

    it('should use default 7 days if not specified', async () => {
      const mockMemberships = [createMockMembership()];
      mockQuery.mockResolvedValue({ rows: mockMemberships });

      await repository.findUpcomingPayments();

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1][0]).toBeInstanceOf(Date);
    });

    it('should return results ordered by payment date', async () => {
      const mockMemberships = [createMockMembership()];
      mockQuery.mockResolvedValue({ rows: mockMemberships });

      await repository.findUpcomingPayments();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY next_expected_payment_date ASC'),
        expect.any(Array)
      );
    });
  });

  describe('findByTier', () => {
    it('should find all memberships with given tier', async () => {
      const mockMemberships = [
        createMockMembership({ tier: 'Full' }),
        createMockMembership({ tier: 'Full', supporter_id: 'another' }),
      ];
      mockQuery.mockResolvedValue({ rows: mockMemberships });

      const result = await repository.findByTier('Full');

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM membership WHERE tier = $1',
        ['Full']
      );
    });
  });

  describe('findByBillingMethod', () => {
    it('should find all memberships with given billing method', async () => {
      const mockMemberships = [
        createMockMembership({ billing_method: 'gocardless' }),
        createMockMembership({ billing_method: 'gocardless', supporter_id: 'another' }),
      ];
      mockQuery.mockResolvedValue({ rows: mockMemberships });

      const result = await repository.findByBillingMethod('gocardless');

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM membership WHERE billing_method = $1',
        ['gocardless']
      );
    });
  });

  // ==========================================================================
  // Delete Operations Tests
  // ==========================================================================

  describe('delete', () => {
    it('should delete membership for supporter', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repository.delete('supporter-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM membership WHERE supporter_id = $1',
        ['supporter-123']
      );
    });

    it('should return false if no membership to delete', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repository.delete('supporter-123');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Statistics Tests
  // ==========================================================================

  describe('getCountByStatus', () => {
    it('should return count of memberships by status', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { status: 'Active', count: '150' },
          { status: 'Past Due', count: '25' },
          { status: 'Cancelled', count: '10' },
        ],
      });

      const result = await repository.getCountByStatus();

      expect(result.Active).toBe(150);
      expect(result['Past Due']).toBe(25);
      expect(result.Cancelled).toBe(10);
      expect(result.Unknown).toBe(0); // Default for missing status
    });

    it('should include all status types in result', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getCountByStatus();

      expect(result).toHaveProperty('Active');
      expect(result).toHaveProperty('Past Due');
      expect(result).toHaveProperty('Cancelled');
      expect(result).toHaveProperty('Unknown');
    });

    it('should handle zero counts', async () => {
      mockQuery.mockResolvedValue({ rows: [{ status: 'Active', count: '0' }] });

      const result = await repository.getCountByStatus();

      expect(result.Active).toBe(0);
    });
  });

  describe('getCountByTier', () => {
    it('should return count of memberships by tier', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { tier: 'Full', count: '100' },
          { tier: 'OAP', count: '25' },
          { tier: 'Student', count: '15' },
        ],
      });

      const result = await repository.getCountByTier();

      expect(result.Full).toBe(100);
      expect(result.OAP).toBe(25);
      expect(result.Student).toBe(15);
    });

    it('should handle Unknown tier for null values', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ tier: 'Unknown', count: '5' }],
      });

      const result = await repository.getCountByTier();

      expect(result.Unknown).toBe(5);
    });

    it('should return empty object if no memberships', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getCountByTier();

      expect(result).toEqual({});
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle all possible status values', async () => {
      const statuses: MembershipStatus[] = ['Active', 'Past Due', 'Cancelled', 'Unknown'];

      for (const status of statuses) {
        const mockMembership = createMockMembership({ status });
        mockQuery.mockResolvedValue({ rows: [mockMembership] });

        const result = await repository.updateStatus('supporter-123', status);
        expect(result.status).toBe(status);
      }
    });

    it('should handle all possible tier values', async () => {
      const tiers: MembershipTier[] = ['Full', 'OAP', 'Student', 'Overseas'];

      for (const tier of tiers) {
        const mockMembership = createMockMembership({ tier });
        mockQuery.mockResolvedValue({ rows: [mockMembership] });

        const result = await repository.update('supporter-123', { tier });
        expect(result.tier).toBe(tier);
      }
    });

    it('should handle all possible cadence values', async () => {
      const cadences: MembershipCadence[] = ['Monthly', 'Annual'];

      for (const cadence of cadences) {
        const mockMembership = createMockMembership({ cadence });
        mockQuery.mockResolvedValue({ rows: [mockMembership] });

        const result = await repository.update('supporter-123', { cadence });
        expect(result.cadence).toBe(cadence);
      }
    });

    it('should handle all possible billing method values', async () => {
      const methods: BillingMethod[] = ['gocardless', 'stripe'];

      for (const method of methods) {
        const mockMembership = createMockMembership({ billing_method: method });
        mockQuery.mockResolvedValue({ rows: [mockMembership] });

        const result = await repository.update('supporter-123', { billing_method: method });
        expect(result.billing_method).toBe(method);
      }
    });
  });
});
