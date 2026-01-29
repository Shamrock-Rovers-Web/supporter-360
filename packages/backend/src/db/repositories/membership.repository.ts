/**
 * Membership Repository
 *
 * Data access layer for membership records. Memberships track recurring
 * payment relationships with supporters for season tickets and official
 * membership status.
 *
 * @packageDocumentation
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../connection';
import type {
  Membership,
  MembershipStatus,
  MembershipTier,
  MembershipCadence,
  BillingMethod,
} from '@supporter360/shared';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when a requested membership is not found.
 */
export class MembershipNotFoundError extends Error {
  constructor(membershipId: number) {
    super(`Membership not found: ${membershipId}`);
    this.name = 'MembershipNotFoundError';
  }
}

/**
 * Error thrown when a membership operation is invalid.
 */
export class MembershipConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MembershipConflictError';
  }
}

// ============================================================================
// Repository Implementation
// ============================================================================

/**
 * Input data for creating or updating a membership.
 */
export type MembershipInput = Omit<Partial<Membership>, 'id' | 'created_at' | 'updated_at'> & {
  supporter_id: string;
};

/**
 * Repository for Membership data access.
 *
 * Memberships track the recurring payment relationships between supporters
 * and the club, typically for season tickets or official membership status.
 */
export class MembershipRepository {
  // ========================================================================
  // CRUD Operations
  // ========================================================================

  /**
   * Creates or updates a membership record.
   *
   * Uses upsert logic based on supporter_id. If a membership exists for
   * the supporter, it will be updated. Otherwise, a new one is created.
   *
   * @param data - The membership data
   * @returns The created or updated membership
   */
  async upsert(data: MembershipInput): Promise<Membership> {
    const now = new Date();

    const sql = `
      INSERT INTO membership (
        supporter_id, tier, cadence, billing_method, status,
        last_payment_date, next_expected_payment_date, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (supporter_id)
        DO UPDATE SET
          tier = EXCLUDED.tier,
          cadence = EXCLUDED.cadence,
          billing_method = EXCLUDED.billing_method,
          status = EXCLUDED.status,
          last_payment_date = EXCLUDED.last_payment_date,
          next_expected_payment_date = EXCLUDED.next_expected_payment_date,
          updated_at = $9
      RETURNING *
    `;

    const result = await query<Membership>(sql, [
      data.supporter_id,
      data.tier || null,
      data.cadence || null,
      data.billing_method || null,
      data.status || 'Unknown',
      data.last_payment_date || null,
      data.next_expected_payment_date || null,
      now,
      now,
    ]);

    return result.rows[0];
  }

  /**
   * Finds a membership by its database ID.
   *
   * @param membershipId - The membership database ID
   * @returns The membership or null if not found
   */
  async findById(membershipId: number): Promise<Membership | null> {
    const result = await query<Membership>(
      'SELECT * FROM membership WHERE id = $1',
      [membershipId]
    );
    return result.rows[0] || null;
  }

  /**
   * Finds a membership by supporter ID.
   *
   * @param supporterId - The supporter UUID
   * @returns The membership or null if not found
   */
  async findBySupporterId(supporterId: string): Promise<Membership | null> {
    const result = await query<Membership>(
      'SELECT * FROM membership WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows[0] || null;
  }

  /**
   * Gets the membership status for a supporter.
   *
   * This is a lightweight method that only returns the status string,
   * useful for quick checks without loading the full membership record.
   *
   * @param supporterId - The supporter UUID
   * @returns The membership status or 'Unknown' if not found
   */
  async getStatus(supporterId: string): Promise<MembershipStatus> {
    const result = await query<{ status: MembershipStatus }>(
      'SELECT status FROM membership WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows[0]?.status || 'Unknown';
  }

  // ========================================================================
  // Update Operations
  // ========================================================================

  /**
   * Updates the membership status.
   *
   * @param supporterId - The supporter UUID
   * @param status - The new status
   * @returns The updated membership
   * @throws {MembershipNotFoundError} If membership not found
   */
  async updateStatus(supporterId: string, status: MembershipStatus): Promise<Membership> {
    const result = await query<Membership>(
      `UPDATE membership
       SET status = $1, updated_at = $2
       WHERE supporter_id = $3
       RETURNING *`,
      [status, new Date(), supporterId]
    );

    if (!result.rows[0]) {
      throw new MembershipNotFoundError(0); // ID unknown, using 0
    }

    return result.rows[0];
  }

  /**
   * Updates the last payment date.
   *
   * Also recalculates the next expected payment date based on the cadence.
   *
   * @param supporterId - The supporter UUID
   * @param paymentDate - The date of the last payment
   * @returns The updated membership
   * @throws {MembershipNotFoundError} If membership not found
   */
  async updateLastPaymentDate(supporterId: string, paymentDate: Date): Promise<Membership> {
    // Get the membership to determine cadence
    const membership = await this.findBySupporterId(supporterId);
    if (!membership) {
      throw new MembershipNotFoundError(0);
    }

    // Calculate next payment date based on cadence
    let nextExpectedDate: Date | null = null;
    if (membership.cadence === 'Monthly') {
      nextExpectedDate = new Date(paymentDate);
      nextExpectedDate.setMonth(nextExpectedDate.getMonth() + 1);
    } else if (membership.cadence === 'Annual') {
      nextExpectedDate = new Date(paymentDate);
      nextExpectedDate.setFullYear(nextExpectedDate.getFullYear() + 1);
    }

    const result = await query<Membership>(
      `UPDATE membership
       SET last_payment_date = $1, next_expected_payment_date = $2, updated_at = $3
       WHERE supporter_id = $4
       RETURNING *`,
      [paymentDate, nextExpectedDate, new Date(), supporterId]
    );

    return result.rows[0];
  }

  /**
   * Updates a membership record.
   *
   * Only updates fields that are provided.
   *
   * @param supporterId - The supporter UUID
   * @param updates - Partial membership data to update
   * @returns The updated membership
   * @throws {MembershipNotFoundError} If membership not found
   */
  async update(supporterId: string, updates: Partial<Membership>): Promise<Membership> {
    const fields: string[] = ['updated_at = $1'];
    const values: unknown[] = [new Date()];
    let paramIndex = 2;

    const updateFields: Array<keyof Membership> = [
      'tier',
      'cadence',
      'billing_method',
      'status',
      'last_payment_date',
      'next_expected_payment_date',
    ];

    for (const field of updateFields) {
      if (field in updates) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push(updates[field]);
      }
    }

    values.push(supporterId);

    const sql = `
      UPDATE membership
      SET ${fields.join(', ')}
      WHERE supporter_id = $${paramIndex}
      RETURNING *
    `;

    const result = await query<Membership>(sql, values);

    if (!result.rows[0]) {
      throw new MembershipNotFoundError(0);
    }

    return result.rows[0];
  }

  // ========================================================================
  // Status Management
  // ========================================================================

  /**
   * Marks a membership as active.
   *
   * @param supporterId - The supporter UUID
   * @returns The updated membership
   */
  async markActive(supporterId: string): Promise<Membership> {
    return this.updateStatus(supporterId, 'Active');
  }

  /**
   * Marks a membership as past due.
   *
   * @param supporterId - The supporter UUID
   * @returns The updated membership
   */
  async markPastDue(supporterId: string): Promise<Membership> {
    return this.updateStatus(supporterId, 'Past Due');
  }

  /**
   * Cancels a membership.
   *
   * @param supporterId - The supporter UUID
   * @returns The updated membership
   */
  async cancel(supporterId: string): Promise<Membership> {
    return this.updateStatus(supporterId, 'Cancelled');
  }

  /**
   * Checks if a membership is active.
   *
   * A membership is considered active if its status is 'Active' or
   * if it's 'Past Due' but within the grace period.
   *
   * @param supporterId - The supporter UUID
   * @param graceDays - Grace period in days (default: 7)
   * @returns True if the membership is active
   */
  async isActive(supporterId: string, graceDays = 7): Promise<boolean> {
    const membership = await this.findBySupporterId(supporterId);
    if (!membership) {
      return false;
    }

    if (membership.status === 'Active') {
      return true;
    }

    if (membership.status === 'Past Due' && membership.next_expected_payment_date) {
      const gracePeriodEnd = new Date(membership.next_expected_payment_date);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + graceDays);
      return new Date() < gracePeriodEnd;
    }

    return false;
  }

  // ========================================================================
  // Bulk Operations
  // ========================================================================

  /**
   * Gets all memberships with a specific status.
   *
   * @param status - The status to filter by
   * @returns Array of memberships with the specified status
   */
  async findByStatus(status: MembershipStatus): Promise<Membership[]> {
    const result = await query<Membership>(
      'SELECT * FROM membership WHERE status = $1',
      [status]
    );
    return result.rows;
  }

  /**
   * Gets all memberships that are past due.
   *
   * @param graceDays - Days past the expected payment date to consider (default: 0)
   * @returns Array of past due memberships
   */
  async findPastDue(graceDays = 0): Promise<Membership[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - graceDays);

    const result = await query<Membership>(
      `SELECT * FROM membership
       WHERE status IN ('Past Due', 'Active')
         AND next_expected_payment_date < $1`,
      [cutoffDate]
    );
    return result.rows;
  }

  /**
   * Gets all memberships that need payment soon.
   *
   * @param daysAhead - Number of days ahead to look (default: 7)
   * @returns Array of memberships with upcoming payments
   */
  async findUpcomingPayments(daysAhead = 7): Promise<Membership[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const result = await query<Membership>(
      `SELECT * FROM membership
       WHERE status = 'Active'
         AND next_expected_payment_date BETWEEN CURRENT_DATE AND $1
       ORDER BY next_expected_payment_date ASC`,
      [endDate]
    );
    return result.rows;
  }

  /**
   * Gets all memberships by tier.
   *
   * @param tier - The membership tier
   * @returns Array of memberships with the specified tier
   */
  async findByTier(tier: MembershipTier): Promise<Membership[]> {
    const result = await query<Membership>(
      'SELECT * FROM membership WHERE tier = $1',
      [tier]
    );
    return result.rows;
  }

  /**
   * Gets all memberships by billing method.
   *
   * @param billingMethod - The billing method
   * @returns Array of memberships with the specified billing method
   */
  async findByBillingMethod(billingMethod: BillingMethod): Promise<Membership[]> {
    const result = await query<Membership>(
      'SELECT * FROM membership WHERE billing_method = $1',
      [billingMethod]
    );
    return result.rows;
  }

  // ========================================================================
  // Delete Operations
  // ========================================================================

  /**
   * Deletes a membership.
   *
   * @param supporterId - The supporter UUID
   * @returns True if the membership was deleted
   */
  async delete(supporterId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM membership WHERE supporter_id = $1',
      [supporterId]
    );
    return (result.rowCount || 0) > 0;
  }

  // ========================================================================
  // Statistics
  // ========================================================================

  /**
   * Gets the count of memberships by status.
   *
   * @returns Object mapping status to count
   */
  async getCountByStatus(): Promise<Record<MembershipStatus, number>> {
    const result = await query<{ status: MembershipStatus; count: string }>(
      `SELECT status, COUNT(*) as count
       FROM membership
       GROUP BY status`
    );

    const counts: Record<string, number> = {
      Active: 0,
      'Past Due': 0,
      Cancelled: 0,
      Unknown: 0,
    };

    for (const row of result.rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts as Record<MembershipStatus, number>;
  }

  /**
   * Gets the count of memberships by tier.
   *
   * @returns Object mapping tier to count
   */
  async getCountByTier(): Promise<Record<string, number>> {
    const result = await query<{ tier: string; count: string }>(
      `SELECT COALESCE(tier, 'Unknown') as tier, COUNT(*) as count
       FROM membership
       GROUP BY tier`
    );

    const counts: Record<string, number> = {};

    for (const row of result.rows) {
      counts[row.tier] = parseInt(row.count, 10);
    }

    return counts;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Default membership repository instance.
 */
export const membershipRepository = new MembershipRepository();
