import { query } from '../connection';
import { Event, EventType, TimelineRequest } from '@supporter360/shared';
import { v4 as uuidv4 } from 'uuid';

export class EventRepository {
  async create(eventData: Partial<Event>): Promise<Event> {
    const sql = `
      INSERT INTO event (
        supporter_id, source_system, event_type, event_time,
        external_id, amount, currency, metadata, raw_payload_ref
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (source_system, external_id) DO UPDATE
      SET metadata = $8, raw_payload_ref = $9
      RETURNING *
    `;

    const result = await query<Event>(sql, [
      eventData.supporter_id,
      eventData.source_system,
      eventData.event_type,
      eventData.event_time,
      eventData.external_id,
      eventData.amount || null,
      eventData.currency || null,
      JSON.stringify(eventData.metadata || {}),
      eventData.raw_payload_ref || null,
    ]);

    return result.rows[0];
  }

  async findById(eventId: string): Promise<Event | null> {
    const result = await query<Event>(
      'SELECT * FROM event WHERE event_id = $1',
      [eventId]
    );
    return result.rows[0] || null;
  }

  async findByExternalId(sourceSystem: string, externalId: string): Promise<Event | null> {
    const result = await query<Event>(
      'SELECT * FROM event WHERE source_system = $1 AND external_id = $2',
      [sourceSystem, externalId]
    );
    return result.rows[0] || null;
  }

  async getTimeline(request: TimelineRequest): Promise<Event[]> {
    const {
      supporter_id,
      event_types,
      start_date,
      end_date,
      limit = 100,
      offset = 0,
    } = request;

    const conditions: string[] = ['supporter_id = $1'];
    const params: any[] = [supporter_id];
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

    const result = await query<Event>(sql, params);
    return result.rows;
  }

  async getEventsByType(
    supporterId: string,
    eventType: EventType,
    limit: number = 50
  ): Promise<Event[]> {
    const result = await query<Event>(
      `SELECT * FROM event
       WHERE supporter_id = $1 AND event_type = $2
       ORDER BY event_time DESC
       LIMIT $3`,
      [supporterId, eventType, limit]
    );
    return result.rows;
  }

  async getTicketPurchases(supporterId: string): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'TicketPurchase');
  }

  async getShopOrders(supporterId: string): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'ShopOrder');
  }

  async getStadiumEntries(supporterId: string): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'StadiumEntry');
  }

  async getPaymentEvents(supporterId: string): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'PaymentEvent');
  }

  async getEmailClicks(supporterId: string): Promise<Event[]> {
    return this.getEventsByType(supporterId, 'EmailClick');
  }

  async updateSupporterId(eventId: string, newSupporterId: string): Promise<Event> {
    const result = await query<Event>(
      'UPDATE event SET supporter_id = $1 WHERE event_id = $2 RETURNING *',
      [newSupporterId, eventId]
    );
    return result.rows[0];
  }

  async bulkUpdateSupporterId(eventIds: string[], newSupporterId: string): Promise<void> {
    await query(
      'UPDATE event SET supporter_id = $1 WHERE event_id = ANY($2)',
      [newSupporterId, eventIds]
    );
  }
}
