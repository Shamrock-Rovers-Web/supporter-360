/**
 * Supporter Repository
 *
 * Data access layer for supporter records. Provides CRUD operations
 * and specialized queries for supporter management.
 *
 * @packageDocumentation
 */

import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../connection';
import type {
  Supporter,
  EmailAlias,
  SearchRequest,
  SearchResult,
  SupporterProfile,
  SupporterOverview,
  Membership,
  MailchimpMembership,
  Event,
} from '@supporter360/shared';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when a requested supporter is not found.
 */
export class SupporterNotFoundError extends Error {
  constructor(supporterId: string) {
    super(`Supporter not found: ${supporterId}`);
    this.name = 'SupporterNotFoundError';
  }
}

/**
 * Error thrown when attempting to merge supporters that would cause data loss.
 */
export class MergeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MergeConflictError';
  }
}

// ============================================================================
// Repository Implementation
// ============================================================================

/**
 * Repository for Supporter data access.
 *
 * All methods use parameterized queries to prevent SQL injection.
 * Complex operations use the transaction helper for atomicity.
 */
export class SupporterRepository {
  // ========================================================================
  // CRUD Operations
  // ========================================================================

  /**
   * Creates a new supporter record.
   *
   * @param supporterData - The supporter data to create (supporter_id will be generated)
   * @returns The created supporter with generated ID
   *
   * @example
   * ```ts
   * const newSupporter = await repository.create({
   *   name: 'John Doe',
   *   primary_email: 'john@example.com',
   *   supporter_type: 'Unknown'
   * });
   * ```
   */
  async create(supporterData: Omit<Partial<Supporter>, 'supporter_id' | 'created_at' | 'updated_at'>): Promise<Supporter> {
    const supporter_id = uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO supporter (
        supporter_id, name, primary_email, phone, supporter_type,
        supporter_type_source, flags, linked_ids, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await query<Supporter>(sql, [
      supporter_id,
      supporterData.name || null,
      supporterData.primary_email || null,
      supporterData.phone || null,
      supporterData.supporter_type || 'Unknown',
      supporterData.supporter_type_source || 'auto',
      JSON.stringify(supporterData.flags || {}),
      JSON.stringify(supporterData.linked_ids || {}),
      now,
      now,
    ]);

    return result.rows[0];
  }

  /**
   * Finds a supporter by their unique ID.
   *
   * @param supporterId - The supporter UUID
   * @returns The supporter or null if not found
   */
  async findById(supporterId: string): Promise<Supporter | null> {
    const result = await query<Supporter>(
      'SELECT * FROM supporter WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows[0] || null;
  }

  /**
   * Finds supporters by primary email or email alias.
   *
   * @param email - The email address to search for
   * @returns Array of supporters matching the email
   */
  async findByEmail(email: string): Promise<Supporter[]> {
    const result = await query<Supporter>(
      `SELECT DISTINCT s.* FROM supporter s
       LEFT JOIN email_alias ea ON s.supporter_id = ea.supporter_id
       WHERE s.primary_email = $1 OR ea.email = $1`,
      [email]
    );
    return result.rows;
  }

  /**
   * Finds supporters by phone number.
   *
   * @param phone - The phone number to search for
   * @returns Array of supporters matching the phone number
   */
  async findByPhone(phone: string): Promise<Supporter[]> {
    const result = await query<Supporter>(
      'SELECT * FROM supporter WHERE phone = $1',
      [phone]
    );
    return result.rows;
  }

  /**
   * Searches for supporters based on query parameters.
   *
   * Supports searching by email (exact), name (partial), or phone (partial).
   * Returns aggregated data including membership status and recent activity dates.
   *
   * @param searchRequest - The search parameters
   * @returns Array of search results
   */
  async search(searchRequest: SearchRequest): Promise<{ results: SearchResult[]; total: number }> {
    const { query: searchQuery, field = 'all', supporter_type, limit = 50, offset = 0 } = searchRequest;

    let whereConditions: string[] = [];
    let params: unknown[] = [];

    if (field === 'email') {
      whereConditions.push('(s.primary_email = $1 OR ea.email = $1)');
      params = [searchQuery];
    } else if (field === 'name') {
      whereConditions.push('s.name ILIKE $1');
      params = [`%${searchQuery}%`];
    } else if (field === 'phone') {
      whereConditions.push('s.phone ILIKE $1');
      params = [`%${searchQuery}%`];
    } else {
      // Search all fields
      whereConditions.push('(s.primary_email ILIKE $1 OR ea.email ILIKE $1 OR s.name ILIKE $1 OR s.phone ILIKE $1)');
      params = [`%${searchQuery}%`];
    }

    // Add supporter_type filter if provided
    if (supporter_type) {
      const types = Array.isArray(supporter_type) ? supporter_type : [supporter_type];
      params.push(types);
      whereConditions.push(`s.supporter_type = ANY($${params.length})`);
    }

    const whereClause = whereConditions.join(' AND ');

    // First, get the total count
    params.push(limit, offset);
    const countParams = params.slice(0, -2);
    const countSql = `
      SELECT COUNT(DISTINCT s.supporter_id) as total
      FROM supporter s
      LEFT JOIN email_alias ea ON s.supporter_id = ea.supporter_id
      WHERE ${whereClause}
    `;
    const countResult = await query<{ total: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Then get the paginated results
    const sql = `
      SELECT DISTINCT ON (s.supporter_id)
        s.supporter_id,
        s.name,
        s.primary_email as email,
        s.supporter_type,
        m.status as membership_status,
        (
          SELECT MAX(e.event_time)
          FROM event e
          WHERE e.supporter_id = s.supporter_id
            AND e.event_type = 'TicketPurchase'
        ) as last_ticket_order_date,
        (
          SELECT MAX(e.event_time)
          FROM event e
          WHERE e.supporter_id = s.supporter_id
            AND e.event_type = 'ShopOrder'
        ) as last_shop_order_date,
        (
          SELECT MAX(e.event_time)
          FROM event e
          WHERE e.supporter_id = s.supporter_id
            AND e.event_type = 'StadiumEntry'
        ) as last_stadium_entry_date
      FROM supporter s
      LEFT JOIN email_alias ea ON s.supporter_id = ea.supporter_id
      LEFT JOIN membership m ON s.supporter_id = m.supporter_id
      WHERE ${whereClause}
      ORDER BY s.supporter_id, s.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await query<SearchResult>(sql, params);
    return { results: result.rows, total };
  }

  /**
   * Updates a supporter record.
   *
   * Only updates fields that are provided. Null values will clear the field.
   *
   * @param supporterId - The supporter UUID
   * @param updates - Partial supporter data to update
   * @returns The updated supporter
   * @throws {SupporterNotFoundError} If supporter not found
   */
  async update(supporterId: string, updates: Partial<Supporter>): Promise<Supporter> {
    const fields: string[] = ['updated_at = $1'];
    const values: unknown[] = [new Date()];
    let paramIndex = 2;

    const updateFields: Array<keyof Supporter> = [
      'name',
      'primary_email',
      'phone',
      'supporter_type',
      'supporter_type_source',
      'flags',
      'linked_ids',
    ];

    for (const field of updateFields) {
      if (field in updates) {
        fields.push(`${field} = $${paramIndex++}`);
        const value = updates[field];
        // Handle JSON fields
        if (field === 'flags' || field === 'linked_ids') {
          values.push(JSON.stringify(value || {}));
        } else {
          values.push(value);
        }
      }
    }

    values.push(supporterId);

    const sql = `
      UPDATE supporter
      SET ${fields.join(', ')}
      WHERE supporter_id = $${paramIndex}
      RETURNING *
    `;

    const result = await query<Supporter>(sql, values);

    if (!result.rows[0]) {
      throw new SupporterNotFoundError(supporterId);
    }

    return result.rows[0];
  }

  // ========================================================================
  // Merge Operations
  // ========================================================================

  /**
   * Merges two supporter records into one.
   *
   * This operation:
   * 1. Reassigns all events from source to target
   * 2. Reassigns email aliases
   * 3. Reassigns membership (if source has one)
   * 4. Merges linked_ids (union of both)
   * 5. Writes an audit log entry
   * 6. Deletes the source supporter
   *
   * All operations are performed within a transaction for atomicity.
   *
   * @param sourceId - The supporter ID to merge from (will be deleted)
   * @param targetId - The supporter ID to merge into (will be kept)
   * @param actorId - The ID of the user performing the merge
   * @param reason - Optional reason for the merge
   * @returns The merged supporter record
   * @throws {SupporterNotFoundError} If either supporter not found
   * @throws {MergeConflictError} If merge would cause data loss
   */
  async merge(sourceId: string, targetId: string, actorId: string, reason?: string): Promise<Supporter> {
    return transaction(async (client: PoolClient) => {
      // Lock both supporter rows to prevent concurrent merges
      // Using FOR UPDATE to lock rows in a consistent order to prevent deadlocks
      const [firstId, secondId] = [sourceId, targetId].sort();
      await client.query('SELECT 1 FROM supporter WHERE supporter_id = $1 FOR UPDATE', [firstId]);
      await client.query('SELECT 1 FROM supporter WHERE supporter_id = $1 FOR UPDATE', [secondId]);

      // Fetch both supporters
      const sourceResult = await client.query<Supporter>(
        'SELECT * FROM supporter WHERE supporter_id = $1',
        [sourceId]
      );
      const targetResult = await client.query<Supporter>(
        'SELECT * FROM supporter WHERE supporter_id = $1',
        [targetId]
      );

      const source = sourceResult.rows[0];
      const target = targetResult.rows[0];

      if (!source || !target) {
        throw new SupporterNotFoundError(!source ? sourceId : targetId);
      }

      // Additional check: ensure source and target are different
      if (sourceId === targetId) {
        throw new MergeConflictError('Cannot merge a supporter with itself');
      }

      // Check for shared email conflict
      if (source.flags?.shared_email || target.flags?.shared_email) {
        throw new MergeConflictError('Cannot merge supporters with shared email flag');
      }

      // Check if both supporters have the same primary email or share email aliases
      if (source.primary_email && target.primary_email && source.primary_email === target.primary_email) {
        throw new MergeConflictError('Cannot merge supporters with identical primary email - they may be different people');
      }

      // Check for shared email aliases
      const sourceAliasesResult = await client.query<{ email: string }>(
        'SELECT email FROM email_alias WHERE supporter_id = $1',
        [sourceId]
      );
      const targetAliasesResult = await client.query<{ email: string }>(
        'SELECT email FROM email_alias WHERE supporter_id = $1',
        [targetId]
      );

      const sourceAliases = new Set(sourceAliasesResult.rows.map(r => r.email));
      const targetAliases = new Set(targetAliasesResult.rows.map(r => r.email));

      // Check if source's primary email is in target's aliases or vice versa
      if (
        (source.primary_email && (targetAliases.has(source.primary_email) || target.primary_email === source.primary_email)) ||
        (target.primary_email && sourceAliases.has(target.primary_email))
      ) {
        throw new MergeConflictError('Cannot merge supporters with shared email addresses');
      }

      // Check for any overlapping email aliases
      for (const alias of sourceAliases) {
        if (targetAliases.has(alias)) {
          throw new MergeConflictError(`Cannot merge supporters - both have email alias: ${alias}`);
        }
      }

      // Reassign all events
      await client.query(
        'UPDATE event SET supporter_id = $1 WHERE supporter_id = $2',
        [targetId, sourceId]
      );

      // Reassign email aliases (skip if duplicate)
      await client.query(`
        INSERT INTO email_alias (supporter_id, email, is_shared)
        SELECT $1, email, is_shared
        FROM email_alias
        WHERE supporter_id = $2
        ON CONFLICT (email) DO NOTHING
      `, [targetId, sourceId]);

      // Delete source email aliases
      await client.query(
        'DELETE FROM email_alias WHERE supporter_id = $1',
        [sourceId]
      );

      // Reassign membership
      await client.query(
        'UPDATE membership SET supporter_id = $1 WHERE supporter_id = $2',
        [targetId, sourceId]
      );

      // Reassign Mailchimp memberships
      await client.query(
        'UPDATE mailchimp_membership SET supporter_id = $1 WHERE supporter_id = $2',
        [targetId, sourceId]
      );

      // Merge linked_ids
      const mergedLinkedIds = {
        ...source.linked_ids,
        ...target.linked_ids,
      };

      await client.query(
        'UPDATE supporter SET linked_ids = $1 WHERE supporter_id = $2',
        [JSON.stringify(mergedLinkedIds), targetId]
      );

      // Write audit log
      await client.query(
        `INSERT INTO audit_log (audit_id, actor_user_id, action_type, timestamp, before_state, after_state, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          actorId,
          'merge',
          new Date(),
          JSON.stringify({ source, target }),
          JSON.stringify({ merged_into: targetId }),
          reason || null,
        ]
      );

      // Delete source supporter
      await client.query(
        'DELETE FROM supporter WHERE supporter_id = $1',
        [sourceId]
      );

      // Return merged supporter
      const mergedResult = await client.query<Supporter>(
        'SELECT * FROM supporter WHERE supporter_id = $1',
        [targetId]
      );

      return mergedResult.rows[0];
    });
  }

  // ========================================================================
  // Linked IDs Management
  // ========================================================================

  /**
   * Gets all external system IDs linked to a supporter.
   *
   * @param supporterId - The supporter UUID
   * @returns Object containing linked IDs for each system
   * @throws {SupporterNotFoundError} If supporter not found
   */
  async getLinkedIds(supporterId: string): Promise<Record<string, string>> {
    const result = await query<Pick<Supporter, 'linked_ids'>>(
      'SELECT linked_ids FROM supporter WHERE supporter_id = $1',
      [supporterId]
    );

    if (!result.rows[0]) {
      throw new SupporterNotFoundError(supporterId);
    }

    return result.rows[0].linked_ids || {};
  }

  /**
   * Updates the external system IDs linked to a supporter.
   *
   * Performs a shallow merge - new IDs are added, existing ones are updated.
   *
   * @param supporterId - The supporter UUID
   * @param linkedIds - Object containing linked IDs to set
   * @throws {SupporterNotFoundError} If supporter not found
   */
  async updateLinkedIds(supporterId: string, linkedIds: Record<string, string>): Promise<void> {
    const current = await this.getLinkedIds(supporterId);
    const merged = { ...current, ...linkedIds };

    await query(
      'UPDATE supporter SET linked_ids = $1 WHERE supporter_id = $2',
      [JSON.stringify(merged), supporterId]
    );
  }

  // ========================================================================
  // Email Aliases
  // ========================================================================

  /**
   * Adds an email alias to a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param email - The email address to add
   * @param isShared - Whether this email is shared by multiple people
   * @returns The created email alias
   */
  async addEmailAlias(supporterId: string, email: string, isShared = false): Promise<EmailAlias> {
    const sql = `
      INSERT INTO email_alias (supporter_id, email, is_shared)
      VALUES ($1, $2, $3)
      ON CONFLICT (email, supporter_id) DO NOTHING
      RETURNING *
    `;
    let result = await query<EmailAlias>(sql, [supporterId, email, isShared]);

    // If conflict occurred, fetch the existing row
    if (result.rows.length === 0) {
      result = await query<EmailAlias>(
        'SELECT * FROM email_alias WHERE email = $1 AND supporter_id = $2',
        [email, supporterId]
      );
    }

    return result.rows[0];
  }

  /**
   * Gets all email aliases for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @returns Array of email aliases
   */
  async getEmailAliases(supporterId: string): Promise<EmailAlias[]> {
    const result = await query<EmailAlias>(
      'SELECT * FROM email_alias WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows;
  }

  /**
   * Removes an email alias.
   *
   * @param email - The email address to remove
   */
  async removeEmailAlias(email: string): Promise<void> {
    await query('DELETE FROM email_alias WHERE email = $1', [email]);
  }

  // ========================================================================
  // Profile Queries
  // ========================================================================

  /**
   * Gets a complete supporter profile with all related data.
   *
   * Aggregates data from supporter, membership, events, and Mailchimp tables.
   *
   * @param supporterId - The supporter UUID
   * @returns Complete supporter profile or null if not found
   */
  async getProfile(supporterId: string): Promise<SupporterProfile | null> {
    const supporter = await this.findById(supporterId);
    if (!supporter) return null;

    const [emails, membership, mailchimpMemberships, lastTicketOrder, lastShopOrder, lastStadiumEntry] =
      await Promise.all([
        this.getEmailAliases(supporterId),
        this.getMembership(supporterId),
        this.getMailchimpMemberships(supporterId),
        this.getLastEvent(supporterId, 'TicketPurchase'),
        this.getLastEvent(supporterId, 'ShopOrder'),
        this.getLastEvent(supporterId, 'StadiumEntry'),
      ]);

    const overview: SupporterOverview = {
      last_ticket_order: lastTicketOrder,
      last_shop_order: lastShopOrder,
      membership,
      last_stadium_entry: lastStadiumEntry,
      mailchimp: mailchimpMemberships,
    };

    return {
      ...supporter,
      emails,
      overview,
    };
  }

  /**
   * Gets the membership record for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @returns Membership or null if not found
   */
  async getMembership(supporterId: string): Promise<Membership | null> {
    const result = await query<Membership>(
      'SELECT * FROM membership WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows[0] || null;
  }

  /**
   * Gets all Mailchimp memberships for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @returns Array of Mailchimp memberships
   */
  async getMailchimpMemberships(supporterId: string): Promise<MailchimpMembership[]> {
    const result = await query<MailchimpMembership>(
      'SELECT * FROM mailchimp_membership WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows;
  }

  /**
   * Gets the most recent event of a specific type for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param eventType - The type of event to retrieve
   * @returns Event or null if not found
   */
  async getLastEvent(supporterId: string, eventType: string): Promise<Event | null> {
    const result = await query<Event>(
      `SELECT * FROM event
       WHERE supporter_id = $1 AND event_type = $2
       ORDER BY event_time DESC
       LIMIT 1`,
      [supporterId, eventType]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Default supporter repository instance.
 */
export const supporterRepository = new SupporterRepository();
