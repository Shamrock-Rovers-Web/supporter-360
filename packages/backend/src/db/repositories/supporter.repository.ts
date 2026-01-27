import { PoolClient } from 'pg';
import { query, transaction } from '../connection';
import {
  Supporter,
  EmailAlias,
  SearchRequest,
  SearchResult,
  SupporterProfile,
} from '@supporter360/shared';

export class SupporterRepository {
  async findById(supporterId: string): Promise<Supporter | null> {
    const result = await query<Supporter>(
      'SELECT * FROM supporter WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<Supporter[]> {
    const result = await query<Supporter>(
      `SELECT s.* FROM supporter s
       INNER JOIN email_alias ea ON s.supporter_id = ea.supporter_id
       WHERE ea.email = $1`,
      [email]
    );
    return result.rows;
  }

  async search(searchRequest: SearchRequest): Promise<SearchResult[]> {
    const { query: searchQuery, field = 'all', limit = 50, offset = 0 } = searchRequest;

    let whereClause = '';
    let params: any[] = [searchQuery.toLowerCase()];

    if (field === 'email') {
      whereClause = 'ea.email ILIKE $1';
    } else if (field === 'name') {
      whereClause = 's.name ILIKE $1';
    } else if (field === 'phone') {
      whereClause = 's.phone ILIKE $1';
    } else {
      whereClause = '(ea.email ILIKE $1 OR s.name ILIKE $1 OR s.phone ILIKE $1)';
    }

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
      LIMIT $2 OFFSET $3
    `;

    const result = await query<SearchResult>(sql, [
      `%${searchQuery}%`,
      limit,
      offset,
    ]);

    return result.rows;
  }

  async getProfile(supporterId: string): Promise<SupporterProfile | null> {
    const supporter = await this.findById(supporterId);
    if (!supporter) return null;

    const [emails, membership, mailchimpMemberships, lastTicketOrder, lastShopOrder, lastStadiumEntry] = await Promise.all([
      this.getEmailAliases(supporterId),
      this.getMembership(supporterId),
      this.getMailchimpMemberships(supporterId),
      this.getLastEvent(supporterId, 'TicketPurchase'),
      this.getLastEvent(supporterId, 'ShopOrder'),
      this.getLastEvent(supporterId, 'StadiumEntry'),
    ]);

    return {
      ...supporter,
      emails,
      membership,
      mailchimp_memberships: mailchimpMemberships,
      last_ticket_order: lastTicketOrder,
      last_shop_order: lastShopOrder,
      last_stadium_entry: lastStadiumEntry,
    };
  }

  async create(supporterData: Partial<Supporter>): Promise<Supporter> {
    const sql = `
      INSERT INTO supporter (name, primary_email, phone, supporter_type, supporter_type_source, flags, linked_ids)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await query<Supporter>(sql, [
      supporterData.name || null,
      supporterData.primary_email || null,
      supporterData.phone || null,
      supporterData.supporter_type || 'Unknown',
      supporterData.supporter_type_source || 'auto',
      JSON.stringify(supporterData.flags || {}),
      JSON.stringify(supporterData.linked_ids || {}),
    ]);
    return result.rows[0];
  }

  async update(supporterId: string, updates: Partial<Supporter>): Promise<Supporter> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.primary_email !== undefined) {
      fields.push(`primary_email = $${paramIndex++}`);
      values.push(updates.primary_email);
    }
    if (updates.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(updates.phone);
    }
    if (updates.supporter_type !== undefined) {
      fields.push(`supporter_type = $${paramIndex++}`);
      values.push(updates.supporter_type);
    }
    if (updates.supporter_type_source !== undefined) {
      fields.push(`supporter_type_source = $${paramIndex++}`);
      values.push(updates.supporter_type_source);
    }
    if (updates.flags !== undefined) {
      fields.push(`flags = $${paramIndex++}`);
      values.push(JSON.stringify(updates.flags));
    }
    if (updates.linked_ids !== undefined) {
      fields.push(`linked_ids = $${paramIndex++}`);
      values.push(JSON.stringify(updates.linked_ids));
    }

    values.push(supporterId);

    const sql = `
      UPDATE supporter
      SET ${fields.join(', ')}
      WHERE supporter_id = $${paramIndex}
      RETURNING *
    `;

    const result = await query<Supporter>(sql, values);
    return result.rows[0];
  }

  async addEmailAlias(supporterId: string, email: string, isShared: boolean = false): Promise<EmailAlias> {
    const sql = `
      INSERT INTO email_alias (supporter_id, email, is_shared)
      VALUES ($1, $2, $3)
      ON CONFLICT (email, supporter_id) DO UPDATE SET is_shared = $3
      RETURNING *
    `;
    const result = await query<EmailAlias>(sql, [supporterId, email, isShared]);
    return result.rows[0];
  }

  async getEmailAliases(supporterId: string): Promise<EmailAlias[]> {
    const result = await query<EmailAlias>(
      'SELECT * FROM email_alias WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows;
  }

  async getMembership(supporterId: string): Promise<any> {
    const result = await query(
      'SELECT * FROM membership WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows[0] || null;
  }

  async getMailchimpMemberships(supporterId: string): Promise<any[]> {
    const result = await query(
      'SELECT * FROM mailchimp_membership WHERE supporter_id = $1',
      [supporterId]
    );
    return result.rows;
  }

  async getLastEvent(supporterId: string, eventType: string): Promise<any> {
    const result = await query(
      `SELECT * FROM event
       WHERE supporter_id = $1 AND event_type = $2
       ORDER BY event_time DESC
       LIMIT 1`,
      [supporterId, eventType]
    );
    return result.rows[0] || null;
  }

  async merge(
    primarySupporterId: string,
    secondarySupporterId: string,
    actorUserId: string,
    reason?: string
  ): Promise<Supporter> {
    return transaction(async (client: PoolClient) => {
      const primary = await this.findById(primarySupporterId);
      const secondary = await this.findById(secondarySupporterId);

      if (!primary || !secondary) {
        throw new Error('Supporter not found');
      }

      await client.query(
        'UPDATE event SET supporter_id = $1 WHERE supporter_id = $2',
        [primarySupporterId, secondarySupporterId]
      );

      await client.query(
        'UPDATE email_alias SET supporter_id = $1 WHERE supporter_id = $2',
        [primarySupporterId, secondarySupporterId]
      );

      await client.query(
        'UPDATE membership SET supporter_id = $1 WHERE supporter_id = $2',
        [primarySupporterId, secondarySupporterId]
      );

      await client.query(
        'UPDATE mailchimp_membership SET supporter_id = $1 WHERE supporter_id = $2',
        [primarySupporterId, secondarySupporterId]
      );

      const mergedLinkedIds = {
        ...secondary.linked_ids,
        ...primary.linked_ids,
      };

      await client.query(
        'UPDATE supporter SET linked_ids = $1 WHERE supporter_id = $2',
        [JSON.stringify(mergedLinkedIds), primarySupporterId]
      );

      await client.query(
        `INSERT INTO audit_log (actor_user_id, action_type, before_state, after_state, reason)
         VALUES ($1, 'merge', $2, $3, $4)`,
        [
          actorUserId,
          JSON.stringify({ primary, secondary }),
          JSON.stringify({ merged: primarySupporterId }),
          reason,
        ]
      );

      await client.query(
        'DELETE FROM supporter WHERE supporter_id = $1',
        [secondarySupporterId]
      );

      const result = await client.query<Supporter>(
        'SELECT * FROM supporter WHERE supporter_id = $1',
        [primarySupporterId]
      );

      return result.rows[0];
    });
  }
}
