/**
 * Supporter Type Classifier Scheduled Handler
 *
 * Scheduled Lambda function (runs every 30 minutes) that derives supporter_type
 * for all supporters based on their engagement patterns.
 *
 * Rules (in priority order):
 * 1. Member: membership.status = 'Active' OR last_payment within grace_days
 * 2. Season Ticket Holder: has purchased season ticket product
 * 3. Ticket Buyer: ticket_purchase within 365 days
 * 4. Shop Buyer: shop_order within 365 days
 * 5. Away Supporter: has AwaySupporter tag AND no other activity
 * 6. Unknown: none of the above
 *
 * Respects admin_override (don't change if source = 'admin_override')
 * Logs type changes to audit_log
 * Configurable grace_days from config table
 *
 * @packageDocumentation
 */

import { ScheduledEvent } from 'aws-lambda';
import { query } from '../../db/connection';
import { v4 as uuidv4 } from 'uuid';
import type { SupporterType } from '@supporter360/shared';

/**
 * Configuration for the supporter type classifier
 */
interface ClassifierConfig {
  grace_days: number;
  ticket_lookback_days: number;
  shop_lookback_days: number;
  away_lookback_days: number;
}

/**
 * Result of a type classification operation
 */
interface ClassificationResult {
  total_processed: number;
  updated: number;
  unchanged: number;
  skipped_admin_override: number;
  errors: number;
  type_changes: Array<{
    supporter_id: string;
    old_type: string;
    new_type: string;
  }>;
}

/**
 * Loads configuration from the config table with defaults
 */
async function loadConfig(): Promise<ClassifierConfig> {
  const result = await query<{ key: string; value: string }>(
    `SELECT key, value FROM config WHERE key IN ('grace_days', 'ticket_lookback_days', 'shop_lookback_days', 'away_lookback_days')`
  );

  const config: ClassifierConfig = {
    grace_days: 7,
    ticket_lookback_days: 365,
    shop_lookback_days: 365,
    away_lookback_days: 365,
  };

  for (const row of result.rows) {
    const numValue = parseInt(row.value, 10);
    if (!isNaN(numValue)) {
      switch (row.key) {
        case 'grace_days':
          config.grace_days = numValue;
          break;
        case 'ticket_lookback_days':
          config.ticket_lookback_days = numValue;
          break;
        case 'shop_lookback_days':
          config.shop_lookback_days = numValue;
          break;
        case 'away_lookback_days':
          config.away_lookback_days = numValue;
          break;
      }
    }
  }

  return config;
}

/**
 * Derives supporter_type for a single supporter based on rules
 */
async function deriveSupporterType(
  supporterId: string,
  config: ClassifierConfig
): Promise<SupporterType> {
  // Rule 1: Member - check if membership is active or within grace period
  const membershipCheck = await query<{
    status: string;
    last_payment_date: Date | null;
    next_expected_payment_date: Date | null;
  }>(
    `SELECT status, last_payment_date, next_expected_payment_date
     FROM membership
     WHERE supporter_id = $1`,
    [supporterId]
  );

  if (membershipCheck.rows.length > 0) {
    const m = membershipCheck.rows[0];

    if (m.status === 'Active') {
      return 'Member';
    }

    if (m.status === 'Past Due' && m.last_payment_date) {
      // Check if within grace period
      const graceDeadline = new Date(m.last_payment_date);
      graceDeadline.setDate(graceDeadline.getDate() + config.grace_days);

      if (new Date() <= graceDeadline) {
        return 'Member';
      }
    }
  }

  // Rule 2: Season Ticket Holder - check for season ticket product purchases
  const stHolderCheck = await query<{ exists: number }>(
    `SELECT 1 as exists
     FROM event e
     INNER JOIN future_ticketing_product_mapping ft
       ON e.metadata->>'product_id' = ft.product_id
     WHERE e.supporter_id = $1
       AND ft.meaning = 'SeasonTicket'
       AND e.event_type = 'TicketPurchase'
     LIMIT 1`,
    [supporterId]
  );

  if (stHolderCheck.rows.length > 0) {
    return 'Season Ticket Holder';
  }

  // Check for Away Supporter tag for use in Rule 5
  const awaySupporterCheck = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM event e
     INNER JOIN future_ticketing_product_mapping ft
       ON e.metadata->>'product_id' = ft.product_id
     WHERE e.supporter_id = $1
       AND ft.meaning = 'AwaySupporter'
       AND e.event_time > NOW() - INTERVAL '1 day' * $2`,
    [supporterId, config.away_lookback_days]
  );

  const hasAwaySupporterTag = parseInt(awaySupporterCheck.rows[0].count, 10) > 0;

  // Check for other activity (ticket or shop purchases)
  const otherActivityCheck = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM event
     WHERE supporter_id = $1
       AND event_type IN ('TicketPurchase', 'ShopOrder')
       AND event_time > NOW() - INTERVAL '1 day' * $2`,
    [supporterId, config.ticket_lookback_days]
  );

  const hasOtherActivity = parseInt(otherActivityCheck.rows[0].count, 10) > 0;

  // Rule 5: Away Supporter - has AwaySupporter tag AND no other activity
  if (hasAwaySupporterTag && !hasOtherActivity) {
    return 'Away Supporter';
  }

  // Rule 3: Ticket Buyer
  const ticketCheck = await query<{ event_time: Date }>(
    `SELECT event_time
     FROM event
     WHERE supporter_id = $1
       AND event_type = 'TicketPurchase'
       AND event_time > NOW() - INTERVAL '1 day' * $2
     ORDER BY event_time DESC
     LIMIT 1`,
    [supporterId, config.ticket_lookback_days]
  );

  if (ticketCheck.rows.length > 0) {
    return 'Ticket Buyer';
  }

  // Rule 4: Shop Buyer
  const shopCheck = await query<{ event_time: Date }>(
    `SELECT event_time
     FROM event
     WHERE supporter_id = $1
       AND event_type = 'ShopOrder'
       AND event_time > NOW() - INTERVAL '1 day' * $2
     ORDER BY event_time DESC
     LIMIT 1`,
    [supporterId, config.shop_lookback_days]
  );

  if (shopCheck.rows.length > 0) {
    return 'Shop Buyer';
  }

  // Rule 6: Unknown - default fallback
  return 'Unknown';
}

/**
 * Main handler for supporter type classification
 */
export const handler = async (_event: ScheduledEvent): Promise<{
  statusCode: number;
  body: string;
}> => {
  const startTime = Date.now();
  console.log('[SupporterTypeClassifier] Starting classification run');

  const result: ClassificationResult = {
    total_processed: 0,
    updated: 0,
    unchanged: 0,
    skipped_admin_override: 0,
    errors: 0,
    type_changes: [],
  };

  try {
    // Load configuration
    const config = await loadConfig();
    console.log('[SupporterTypeClassifier] Loaded config:', config);

    // Get all supporters that need classification
    // - All supporters with auto source
    // - Supporters not updated in the last hour (to catch recent changes)
    const supportersResult = await query<{
      supporter_id: string;
      supporter_type: SupporterType;
      supporter_type_source: 'auto' | 'admin_override';
    }>(
      `SELECT supporter_id, supporter_type, supporter_type_source
       FROM supporter
       WHERE supporter_type_source = 'auto'
          OR supporter_type_source IS NULL`
    );

    const supporters = supportersResult.rows;
    result.total_processed = supporters.length;

    console.log(`[SupporterTypeClassifier] Processing ${supporters.length} supporters`);

    // Process each supporter
    for (const supporter of supporters) {
      try {
        // Skip admin_override supporters
        if (supporter.supporter_type_source === 'admin_override') {
          result.skipped_admin_override++;
          continue;
        }

        // Derive new type
        const newType = await deriveSupporterType(supporter.supporter_id, config);

        // Check if type changed
        if (newType !== supporter.supporter_type) {
          // Update supporter type
          await query(
            `UPDATE supporter
             SET supporter_type = $1,
                 supporter_type_source = 'auto',
                 updated_at = NOW()
             WHERE supporter_id = $2`,
            [newType, supporter.supporter_id]
          );

          // Log to audit_log
          await query(
            `INSERT INTO audit_log (audit_id, actor_user_id, action_type, timestamp, before_state, after_state, reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              uuidv4(),
              'system',
              'supporter_type_change',
              new Date(),
              JSON.stringify({
                supporter_id: supporter.supporter_id,
                old_type: supporter.supporter_type,
              }),
              JSON.stringify({
                supporter_id: supporter.supporter_id,
                new_type: newType,
              }),
              'Scheduled classification',
            ]
          );

          result.updated++;
          result.type_changes.push({
            supporter_id: supporter.supporter_id,
            old_type: supporter.supporter_type,
            new_type: newType,
          });

          console.log(`[SupporterTypeClassifier] Updated ${supporter.supporter_id}: ${supporter.supporter_type} -> ${newType}`);
        } else {
          result.unchanged++;
        }
      } catch (error) {
        result.errors++;
        console.error(`[SupporterTypeClassifier] Error processing supporter ${supporter.supporter_id}:`, error);
      }
    }

    // Update last run timestamp in config
    await query(
      `INSERT INTO config (key, value, description)
       VALUES ('supporter_type_last_run', $1, 'Last supporter type classification run')
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [new Date().toISOString()]
    );

    const duration = Date.now() - startTime;
    console.log(`[SupporterTypeClassifier] Completed in ${duration}ms`, {
      total_processed: result.total_processed,
      updated: result.updated,
      unchanged: result.unchanged,
      skipped_admin_override: result.skipped_admin_override,
      errors: result.errors,
    });

    // Log type changes summary to CloudWatch
    if (result.type_changes.length > 0) {
      console.log('[SupporterTypeClassifier] Type changes summary:', JSON.stringify(result.type_changes));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Supporter type classification completed',
        duration_ms: duration,
        ...result,
      }),
    };
  } catch (error) {
    console.error('[SupporterTypeClassifier] Fatal error:', error);
    throw error;
  }
};
