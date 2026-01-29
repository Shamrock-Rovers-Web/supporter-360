import { query } from '../db/connection';
import { SupporterType } from '@supporter360/shared';

export class SupporterTypeService {
  async deriveAll(): Promise<{ updated: number }> {
    const result = await query(`
      SELECT supporter_id
      FROM supporter
      WHERE supporter_type_source = 'auto'
         OR updated_at < NOW() - INTERVAL '1 hour'
    `);

    let updated = 0;
    for (const row of result.rows) {
      const newType = await this.deriveForSupporter(row.supporter_id);
      await query(
        `UPDATE supporter
         SET supporter_type = $1, supporter_type_source = 'auto', updated_at = NOW()
         WHERE supporter_id = $2`,
        [newType, row.supporter_id]
      );
      updated++;
    }

    await query(
      `INSERT INTO config (key, value, description)
       VALUES ('supporter_type_last_run', $1, 'Last supporter type derivation')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [new Date().toISOString()]
    );

    return { updated };
  }

  async deriveForSupporter(supporterId: string): Promise<SupporterType> {
    const supporter = await query(
      `SELECT supporter_type_source FROM supporter WHERE supporter_id = $1`,
      [supporterId]
    );

    if (supporter.rows[0]?.supporter_type_source === 'admin_override') {
      const existing = await query(
        `SELECT supporter_type FROM supporter WHERE supporter_id = $1`,
        [supporterId]
      );
      return existing.rows[0].supporter_type as SupporterType;
    }

    const stHolderCheck = await query(`
      SELECT 1 FROM event e
      JOIN future_ticketing_product_mapping ft
        ON e.metadata->>'product_id' = ft.product_id
      WHERE e.supporter_id = $1
        AND ft.meaning = 'SeasonTicket'
      LIMIT 1
    `, [supporterId]);

    if (stHolderCheck.rows.length > 0) {
      return 'Season Ticket Holder';
    }

    const membershipCheck = await query(`
      SELECT m.status,
             (SELECT value::numeric FROM config WHERE key = 'paid_up_grace_days_monthly') as grace_days
      FROM membership m
      WHERE m.supporter_id = $1
    `, [supporterId]);

    if (membershipCheck.rows.length > 0) {
      const m = membershipCheck.rows[0];
      if (m.status === 'Active') {
        return 'Member';
      }
      if (m.status === 'Past Due' && m.last_payment_date) {
        const graceDays = parseInt(m.grace_days || '35');
        const lastPayment = new Date(m.last_payment_date);
        const daysSince = Math.floor((Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince <= graceDays) {
          return 'Member';
        }
      }
    }

    const awayCheck = await query(`
      SELECT COUNT(*) as count FROM event e
      JOIN future_ticketing_product_mapping ft
        ON e.metadata->>'product_id' = ft.product_id
      WHERE e.supporter_id = $1
        AND ft.meaning = 'AwaySupporter'
        AND e.event_time > NOW() - INTERVAL '365 days'
    `, [supporterId]);

    const otherActivityCheck = await query(`
      SELECT COUNT(*) as count FROM event
      WHERE supporter_id = $1
        AND event_type IN ('TicketPurchase', 'ShopOrder')
        AND e.event_time > NOW() - INTERVAL '365 days'
    `, [supporterId]);

    if (parseInt(awayCheck.rows[0].count) > 0 &&
        parseInt(otherActivityCheck.rows[0].count) === 0) {
      return 'Away Supporter';
    }

    const ticketCheck = await query(`
      SELECT 1 FROM event
      WHERE supporter_id = $1
        AND event_type = 'TicketPurchase'
        AND event_time > NOW() - INTERVAL '365 days'
      LIMIT 1
    `, [supporterId]);

    if (ticketCheck.rows.length > 0) {
      return 'Ticket Buyer';
    }

    const shopCheck = await query(`
      SELECT 1 FROM event
      WHERE supporter_id = $1
        AND event_type = 'ShopOrder'
        AND event_time > NOW() - INTERVAL '365 days'
      LIMIT 1
    `, [supporterId]);

    if (shopCheck.rows.length > 0) {
      return 'Shop Buyer';
    }

    return 'Unknown';
  }
}
