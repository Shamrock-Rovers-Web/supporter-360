/**
 * Event Repository
 *
 * Data access layer for event records stored in the supporter timeline.
 * Events are immutable records of actions from all integrated systems.
 *
 * @packageDocumentation
 */

import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../connection';
import type {
  Event,
  EventType,
  SourceSystem,
  TimelineRequest,
  TimelineEvent,
} from '@supporter360/shared';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when a requested event is not found.
 */
export class EventNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Event not found: ${eventId}`);
    this.name = 'EventNotFoundError';
  }
}

/**
 * Error thrown when attempting to create a duplicate event.
 */
export class DuplicateEventError extends Error {
  constructor(externalId: string, sourceSystem: SourceSystem) {
    super(`Event already exists: ${sourceSystem}/${externalId}`);
    this.name = 'DuplicateEventError';
  }
}

// ============================================================================
// Repository Implementation
// ============================================================================

/**
 * Repository for Event data access.
 *
 * Events are immutable records of all supporter interactions across
 * integrated systems. They form the timeline that powers the UI.
 */
export class EventRepository {
  // ========================================================================
  // CRUD Operations
  // ========================================================================

  /**
   * Creates a new event record.
   *
   * Uses upsert logic to prevent duplicate events from the same external system.
   * If an event with the same source_system and external_id exists, it updates
   * the metadata and raw_payload_ref fields.
   *
   * @param eventData - The event data to create (event_id will be generated if not provided)
   * @returns The created or updated event
   */
  async create(eventData: Partial<Event> & {
    supporter_id: string;
    source_system: SourceSystem;
    event_type: EventType;
    event_time: Date;
  }): Promise<Event> {
    const event_id = eventData.event_id || uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO event (
        event_id, supporter_id, source_system, event_type, event_time,
        external_id, amount, currency, metadata, raw_payload_ref, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (source_system, external_id)
        DO UPDATE SET
          metadata = EXCLUDED.metadata,
          raw_payload_ref = EXCLUDED.raw_payload_ref
      RETURNING *
    `;

    const result = await query<Event>(sql, [
      event_id,
      eventData.supporter_id,
      eventData.source_system,
      eventData.event_type,
      eventData.event_time,
      eventData.external_id || null,
      eventData.amount || null,
      eventData.currency || null,
      JSON.stringify(eventData.metadata || {}),
      eventData.raw_payload_ref || null,
      now,
    ]);

    return result.rows[0];
  }

  /**
   * Finds an event by its unique ID.
   *
   * @param eventId - The event UUID
   * @returns The event or null if not found
   */
  async findById(eventId: string): Promise<Event | null> {
    const result = await query<Event>(
      'SELECT * FROM event WHERE event_id = $1',
      [eventId]
    );
    return result.rows[0] || null;
  }

  /**
   * Finds events by supporter ID with optional filtering.
   *
   * @param supporterId - The supporter UUID
   * @param filters - Optional filters (event types, date range, pagination)
   * @returns Array of events matching the criteria
   */
  async findBySupporterId(
    supporterId: string,
    filters?: {
      event_types?: EventType[];
      start_date?: Date;
      end_date?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Event[]> {
    const conditions: string[] = ['supporter_id = $1'];
    const params: unknown[] = [supporterId];
    let paramIndex = 2;

    if (filters?.event_types && filters.event_types.length > 0) {
      conditions.push(`event_type = ANY($${paramIndex++})`);
      params.push(filters.event_types);
    }

    if (filters?.start_date) {
      conditions.push(`event_time >= $${paramIndex++}`);
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      conditions.push(`event_time <= $${paramIndex++}`);
      params.push(filters.end_date);
    }

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    params.push(limit, offset);

    const sql = `
      SELECT * FROM event
      WHERE ${conditions.join(' AND ')}
      ORDER BY event_time DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await query<Event>(sql, params);
    return result.rows;
  }

  /**
   * Finds an event by its external system ID.
   *
   * This is useful for idempotency checks when processing webhooks.
   *
   * @param sourceSystem - The external system name
   * @param externalId - The external system's event ID
   * @returns The event or null if not found
   */
  async findByExternalId(sourceSystem: SourceSystem, externalId: string): Promise<Event | null> {
    const result = await query<Event>(
      'SELECT * FROM event WHERE source_system = $1 AND external_id = $2',
      [sourceSystem, externalId]
    );
    return result.rows[0] || null;
  }

  // ========================================================================
  // Timeline Operations
  // ========================================================================

  /**
   * Gets a paginated timeline of events for a supporter.
   *
   * Timeline events are ordered by event_time descending (newest first).
   * Supports filtering by event types and date ranges.
   *
   * @param request - Timeline request parameters
   * @returns Array of timeline events
   */
  async getTimeline(request: TimelineRequest): Promise<TimelineEvent[]> {
    const {
      supporter_id,
      event_types,
      start_date,
      end_date,
      limit = 100,
      offset = 0,
    } = request;

    const conditions: string[] = ['supporter_id = $1'];
    const params: unknown[] = [supporter_id];
    let paramIndex = 2;

    if (event_types && event_types.length > 0) {
      conditions.push(`event_type = ANY($${paramIndex++})`);
      params.push(event_types);
    }

    if (start_date) {
      conditions.push(`event_time >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`event_time <= $${paramIndex++}`);
      params.push(end_date);
    }

    params.push(limit, offset);

    const sql = `
      SELECT * FROM event
      WHERE ${conditions.join(' AND ')}
      ORDER BY event_time DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await query<TimelineEvent>(sql, params);
    return result.rows;
  }

  /**
   * Gets the most recent event of a specific type for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param eventType - The type of event to retrieve
   * @returns The most recent event or null if not found
   */
  async getLastEvent(supporterId: string, eventType: EventType): Promise<Event | null> {
    const result = await query<Event>(
      `SELECT * FROM event
       WHERE supporter_id = $1 AND event_type = $2
       ORDER BY event_time DESC
       LIMIT 1`,
      [supporterId, eventType]
    );
    return result.rows[0] || null;
  }

  /**
   * Gets the count of events for a supporter with optional filtering.
   *
   * @param supporterId - The supporter UUID
   * @param filters - Optional filters
   * @returns The count of matching events
   */
  async getCount(
    supporterId: string,
    filters?: { event_types?: EventType[]; start_date?: Date; end_date?: Date }
  ): Promise<number> {
    const conditions: string[] = ['supporter_id = $1'];
    const params: unknown[] = [supporterId];
    let paramIndex = 2;

    if (filters?.event_types && filters.event_types.length > 0) {
      conditions.push(`event_type = ANY($${paramIndex++})`);
      params.push(filters.event_types);
    }

    if (filters?.start_date) {
      conditions.push(`event_time >= $${paramIndex++}`);
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      conditions.push(`event_time <= $${paramIndex++}`);
      params.push(filters.end_date);
    }

    const sql = `SELECT COUNT(*) as count FROM event WHERE ${conditions.join(' AND ')}`;
    const result = await query<{ count: string }>(sql, params);
    return parseInt(result.rows[0].count, 10);
  }

  // ========================================================================
  // Type-Specific Queries
  // ========================================================================

  /**
   * Gets all ticket purchase events for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param limit - Maximum number of events to return
   * @returns Array of ticket purchase events
   */
  async getTicketPurchases(supporterId: string, limit = 50): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'TicketPurchase', limit);
  }

  /**
   * Gets all shop order events for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param limit - Maximum number of events to return
   * @returns Array of shop order events
   */
  async getShopOrders(supporterId: string, limit = 50): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'ShopOrder', limit);
  }

  /**
   * Gets all stadium entry events for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param limit - Maximum number of events to return
   * @returns Array of stadium entry events
   */
  async getStadiumEntries(supporterId: string, limit = 50): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'StadiumEntry', limit);
  }

  /**
   * Gets all payment events for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param limit - Maximum number of events to return
   * @returns Array of payment events
   */
  async getPaymentEvents(supporterId: string, limit = 50): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'PaymentEvent', limit);
  }

  /**
   * Gets all email click events for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param limit - Maximum number of events to return
   * @returns Array of email click events
   */
  async getEmailClicks(supporterId: string, limit = 50): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'EmailClick', limit);
  }

  /**
   * Gets all membership events for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param limit - Maximum number of events to return
   * @returns Array of membership events
   */
  async getMembershipEvents(supporterId: string, limit = 50): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'MembershipEvent', limit);
  }

  /**
   * Gets events of a specific type for a supporter.
   *
   * @param supporterId - The supporter UUID
   * @param eventType - The type of event
   * @param limit - Maximum number of events to return
   * @returns Array of events matching the type
   */
  async getEventsByType(supporterId: string, eventType: EventType, limit = 50): Promise<Event[]> {
    const result = await query<Event>(
      `SELECT * FROM event
       WHERE supporter_id = $1 AND event_type = $2
       ORDER BY event_time DESC
       LIMIT $3`,
      [supporterId, eventType, limit]
    );
    return result.rows;
  }

  // ========================================================================
  // Batch Operations
  // ========================================================================

  /**
   * Bulk creates events within a transaction.
   *
   * Uses a transaction to ensure all events are created together
   * or none at all.
   *
   * @param events - Array of events to create
   * @returns Array of created events
   */
  async bulkCreate(events: Array<Partial<Event> & {
    supporter_id: string;
    source_system: SourceSystem;
    event_type: EventType;
    event_time: Date;
  }>): Promise<Event[]> {
    return transaction(async (client: PoolClient) => {
      const createdEvents: Event[] = [];

      for (const eventData of events) {
        const event_id = eventData.event_id || uuidv4();
        const now = new Date();

        const sql = `
          INSERT INTO event (
            event_id, supporter_id, source_system, event_type, event_time,
            external_id, amount, currency, metadata, raw_payload_ref, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (source_system, external_id)
            DO UPDATE SET
              metadata = EXCLUDED.metadata,
              raw_payload_ref = EXCLUDED.raw_payload_ref
          RETURNING *
        `;

        const result = await client.query<Event>(sql, [
          event_id,
          eventData.supporter_id,
          eventData.source_system,
          eventData.event_type,
          eventData.event_time,
          eventData.external_id || null,
          eventData.amount || null,
          eventData.currency || null,
          JSON.stringify(eventData.metadata || {}),
          eventData.raw_payload_ref || null,
          now,
        ]);

        createdEvents.push(result.rows[0]);
      }

      return createdEvents;
    });
  }

  // ========================================================================
  // Supporter Reassignment
  // ========================================================================

  /**
   * Updates the supporter_id for a single event.
   *
   * Used during merge operations to reassign events to a different supporter.
   *
   * @param eventId - The event UUID
   * @param newSupporterId - The new supporter UUID
   * @returns The updated event
   * @throws {EventNotFoundError} If event not found
   */
  async updateSupporterId(eventId: string, newSupporterId: string): Promise<Event> {
    const result = await query<Event>(
      'UPDATE event SET supporter_id = $1 WHERE event_id = $2 RETURNING *',
      [newSupporterId, eventId]
    );

    if (!result.rows[0]) {
      throw new EventNotFoundError(eventId);
    }

    return result.rows[0];
  }

  /**
   * Bulk updates supporter_id for multiple events.
   *
   * Used during merge operations to reassign events from a deleted
   * supporter to the target supporter.
   *
   * @param eventIds - Array of event UUIDs to update
   * @param newSupporterId - The new supporter UUID
   * @returns Number of events updated
   */
  async bulkUpdateSupporterId(eventIds: string[], newSupporterId: string): Promise<number> {
    if (eventIds.length === 0) {
      return 0;
    }

    const result = await query<{ count: string }>(
      'UPDATE event SET supporter_id = $1 WHERE event_id = ANY($2)',
      [newSupporterId, eventIds]
    );

    // pg returns rowCount for UPDATE queries
    return result.rowCount || 0;
  }

  /**
   * Reassigns all events from one supporter to another.
   *
   * Used during merge operations.
   *
   * @param fromSupporterId - The source supporter UUID
   * @param toSupporterId - The target supporter UUID
   * @returns Number of events reassigned
   */
  async reassignAllToSupporter(fromSupporterId: string, toSupporterId: string): Promise<number> {
    const result = await query(
      'UPDATE event SET supporter_id = $1 WHERE supporter_id = $2',
      [toSupporterId, fromSupporterId]
    );
    return result.rowCount || 0;
  }

  // ========================================================================
  // Deletion
  // ========================================================================

  /**
   * Deletes an event by its ID.
   *
   * Events should generally not be deleted, but this is provided
   * for administrative purposes.
   *
   * @param eventId - The event UUID
   * @returns True if the event was deleted
   */
  async delete(eventId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM event WHERE event_id = $1',
      [eventId]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Deletes all events for a supporter.
   *
   * Used during supporter deletion/merge operations.
   *
   * @param supporterId - The supporter UUID
   * @returns Number of events deleted
   */
  async deleteAllForSupporter(supporterId: string): Promise<number> {
    const result = await query(
      'DELETE FROM event WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rowCount || 0;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Default event repository instance.
 */
export const eventRepository = new EventRepository();
