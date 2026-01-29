/**
 * Reconciliation Job Scheduled Handler
 *
 * Scheduled Lambda function (runs daily at 2 AM UTC) that reconciles events
 * across all integrations to catch any missed webhooks or processing failures.
 *
 * For each integration (Shopify, Stripe, GoCardless, Future Ticketing):
 * - Queries last 24 hours of events from source API
 * - Checks if each event exists in event table (by source_system + external_id)
 * - Creates missing events
 *
 * Logs recovered events to CloudWatch and alerts if >100 events recovered.
 *
 * Idempotent - safe to re-run.
 *
 * @packageDocumentation
 */

import { ScheduledEvent } from 'aws-lambda';
import { query } from '../../db/connection';
import { v4 as uuidv4 } from 'uuid';
import { createShopifyClient } from '../../integrations/shopify';
import { createStripeClient } from '../../integrations/stripe';
import { createGoCardlessClient } from '../../integrations/gocardless';
import { createFutureTicketingClient } from '../../integrations/future-ticketing';

/**
 * Reconciliation result for a single source system
 */
interface SourceReconciliationResult {
  source_system: string;
  events_found: number;
  events_recovered: number;
  events_already_exists: number;
  errors: string[];
}

/**
 * Overall reconciliation result
 */
interface ReconciliationResult {
  sources: SourceReconciliationResult[];
  total_events_found: number;
  total_events_recovered: number;
  alert_threshold_exceeded: boolean;
  duration_ms: number;
}

/**
 * Gets the lookback period from config or defaults to 24 hours
 */
async function getLookbackHours(): Promise<number> {
  const result = await query<{ value: string }>(
    `SELECT value FROM config WHERE key = 'reconciliation_lookback_hours'`
  );

  if (result.rows.length > 0) {
    const hours = parseInt(result.rows[0].value, 10);
    if (!isNaN(hours) && hours > 0) {
      return hours;
    }
  }

  return 24; // Default to 24 hours
}

/**
 * Checks if an event already exists in the database
 */
async function eventExists(sourceSystem: string, externalId: string): Promise<boolean> {
  const result = await query<{ exists: number }>(
    `SELECT 1 as exists
     FROM event
     WHERE source_system = $1 AND external_id = $2
     LIMIT 1`,
    [sourceSystem, externalId]
  );

  return result.rows.length > 0;
}

/**
 * Reconciles Shopify orders from the last 24 hours
 */
async function reconcileShopify(since: Date): Promise<SourceReconciliationResult> {
  const result: SourceReconciliationResult = {
    source_system: 'shopify',
    events_found: 0,
    events_recovered: 0,
    events_already_exists: 0,
    errors: [],
  };

  try {
    const shopifyClient = createShopifyClient();

    // Get orders updated since the lookback date
    const orders = await shopifyClient.getOrdersSince(since.toISOString());

    result.events_found = orders.length;

    for (const order of orders) {
      try {
        const exists = await eventExists('shopify', String(order.id));

        if (exists) {
          result.events_already_exists++;
          continue;
        }

        // Find or create supporter by email
        const supporterResult = await query<{ supporter_id: string }>(
          `SELECT supporter_id FROM supporter WHERE primary_email = $1 LIMIT 1`,
          [order.email]
        );

        if (supporterResult.rows.length === 0) {
          // No supporter found - skip or could create a placeholder
          result.errors.push(`No supporter found for order ${order.id}`);
          continue;
        }

        const supporterId = supporterResult.rows[0].supporter_id;

        // Create the missing event
        await query(
          `INSERT INTO event (event_id, supporter_id, source_system, event_type, event_time, external_id, amount, currency, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            supporterId,
            'shopify',
            'ShopOrder',
            order.created_at ? new Date(order.created_at) : new Date(),
            String(order.id),
            order.total_price || 0,
            order.currency || 'EUR',
            JSON.stringify({
              order_id: order.id,
              order_number: order.order_number,
              customer_id: order.customer?.id,
              total_price: order.total_price,
              financial_status: order.financial_status,
              fulfillment_status: order.fulfillment_status,
            }),
            new Date(),
          ]
        );

        result.events_recovered++;
        console.log(`[Reconciler] Recovered Shopify order ${order.id}`);
      } catch (error) {
        result.errors.push(`Error processing order ${order.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  } catch (error) {
    result.errors.push(`Shopify API error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return result;
}

/**
 * Reconciles Stripe charges from the last 24 hours
 */
async function reconcileStripe(since: Date): Promise<SourceReconciliationResult> {
  const result: SourceReconciliationResult = {
    source_system: 'stripe',
    events_found: 0,
    events_recovered: 0,
    events_already_exists: 0,
    errors: [],
  };

  try {
    const stripeClient = createStripeClient();

    // Get charges created since the lookback date
    const charges = await stripeClient.listChargesSince(since.getTime() / 1000);

    result.events_found = charges.length;

    for (const charge of charges) {
      try {
        const exists = await eventExists('stripe', charge.id);

        if (exists) {
          result.events_already_exists++;
          continue;
        }

        // Find supporter by Stripe customer ID
        const supporterResult = await query<{ supporter_id: string }>(
          `SELECT supporter_id FROM supporter WHERE linked_ids->>'stripe' = $1 LIMIT 1`,
          [charge.customer]
        );

        if (supporterResult.rows.length === 0) {
          result.errors.push(`No supporter found for charge ${charge.id}`);
          continue;
        }

        const supporterId = supporterResult.rows[0].supporter_id;

        // Create the missing event
        await query(
          `INSERT INTO event (event_id, supporter_id, source_system, event_type, event_time, external_id, amount, currency, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            supporterId,
            'stripe',
            'PaymentEvent',
            new Date(charge.created * 1000),
            charge.id,
            charge.amount || 0,
            charge.currency || 'eur',
            JSON.stringify({
              charge_id: charge.id,
              customer_id: charge.customer,
              amount: charge.amount,
              currency: charge.currency,
              status: charge.status,
              paid: charge.paid,
              refunded: charge.refunded,
            }),
            new Date(),
          ]
        );

        result.events_recovered++;
        console.log(`[Reconciler] Recovered Stripe charge ${charge.id}`);
      } catch (error) {
        result.errors.push(`Error processing charge ${charge.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  } catch (error) {
    result.errors.push(`Stripe API error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return result;
}

/**
 * Reconciles GoCardless payments from the last 24 hours
 */
async function reconcileGoCardless(since: Date): Promise<SourceReconciliationResult> {
  const result: SourceReconciliationResult = {
    source_system: 'gocardless',
    events_found: 0,
    events_recovered: 0,
    events_already_exists: 0,
    errors: [],
  };

  try {
    const gcClient = createGoCardlessClient();

    // Get payments created since the lookback date
    const response = await gcClient.listPaymentsSince(since.toISOString());
    const payments = response.payments;

    result.events_found = payments.length;

    for (const payment of payments) {
      try {
        const exists = await eventExists('gocardless', payment.id);

        if (exists) {
          result.events_already_exists++;
          continue;
        }

        // Find supporter by GoCardless customer ID
        const supporterResult = await query<{ supporter_id: string }>(
          `SELECT supporter_id FROM supporter WHERE linked_ids->>'gocardless' = $1 LIMIT 1`,
          [payment.links.customer]
        );

        if (supporterResult.rows.length === 0) {
          result.errors.push(`No supporter found for payment ${payment.id}`);
          continue;
        }

        const supporterId = supporterResult.rows[0].supporter_id;

        // Create the missing event
        await query(
          `INSERT INTO event (event_id, supporter_id, source_system, event_type, event_time, external_id, amount, currency, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            supporterId,
            'gocardless',
            'PaymentEvent',
            new Date(payment.created_at),
            payment.id,
            payment.amount || 0,
            payment.currency || 'EUR',
            JSON.stringify({
              payment_id: payment.id,
              customer_id: payment.links.customer,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              charge_date: payment.charge_date,
            }),
            new Date(),
          ]
        );

        result.events_recovered++;
        console.log(`[Reconciler] Recovered GoCardless payment ${payment.id}`);
      } catch (error) {
        result.errors.push(`Error processing payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  } catch (error) {
    result.errors.push(`GoCardless API error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return result;
}

/**
 * Reconciles Future Ticketing orders from the last 24 hours
 */
async function reconcileFutureTicketing(since: Date): Promise<SourceReconciliationResult> {
  const result: SourceReconciliationResult = {
    source_system: 'futureticketing',
    events_found: 0,
    events_recovered: 0,
    events_already_exists: 0,
    errors: [],
  };

  // Convert dates to YYYY-MM-DD format for FT API
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];
  const startDate = formatDate(since);
  const endDate = formatDate(new Date());

  try {
    const ftClient = createFutureTicketingClient();

    // Get orders using date range search
    let page = 1;
    let hasMore = true;
    const allOrders: unknown[] = [];

    while (hasMore && page <= 50) {
      const response = await ftClient.getOrdersByDate(startDate, endDate, { page, validOrder: true });
      if (response.data?.length) {
        allOrders.push(...response.data);
        result.events_found += response.data.length;
      }

      const currentPage = response.currentpage || page;
      const limit = parseInt(response.limit || '20', 10);
      const total = parseInt(response.total || '0', 10);
      hasMore = currentPage * limit < total;
      page++;
    }

    for (const order of allOrders as Array<{
      id: string;
      account_id: string;
      order_date: string;
      order_amount: string;
      status: string;
      detail: unknown[];
    }>) {
      try {
        const exists = await eventExists('futureticketing', order.id);

        if (exists) {
          result.events_already_exists++;
          continue;
        }

        // Find supporter by FT account ID
        const supporterResult = await query<{ supporter_id: string }>(
          `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1 LIMIT 1`,
          [order.account_id]
        );

        if (supporterResult.rows.length === 0) {
          result.errors.push(`No supporter found for FT order ${order.id}`);
          continue;
        }

        const supporterId = supporterResult.rows[0].supporter_id;

        // Create the missing event
        await query(
          `INSERT INTO event (event_id, supporter_id, source_system, event_type, event_time, external_id, amount, currency, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            supporterId,
            'futureticketing',
            'TicketPurchase',
            new Date(order.order_date),
            order.id,
            parseFloat(order.order_amount) || 0,
            'EUR',
            JSON.stringify({
              order_id: order.id,
              account_id: order.account_id,
              detail: order.detail,
              total_amount: order.order_amount,
              status: order.status,
            }),
            new Date(),
          ]
        );

        result.events_recovered++;
        console.log(`[Reconciler] Recovered FT order ${order.id}`);
      } catch (error) {
        result.errors.push(`Error processing FT order: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Also reconcile stadium entries (extracted from order barcodes)
    const entries = await ftClient.getStadiumEntries(startDate, endDate);

    for (const entry of entries) {
      try {
        // Use barcode + scan_datetime as the unique ID for entries
        const entryId = `${entry.barcode_ean13}-${entry.scan_datetime}`;

        const exists = await eventExists('futureticketing', entryId);

        if (exists) {
          result.events_already_exists++;
          continue;
        }

        // Find supporter by FT account ID
        const supporterResult = await query<{ supporter_id: string }>(
          `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1 LIMIT 1`,
          [entry.account_id]
        );

        if (supporterResult.rows.length === 0) {
          result.errors.push(`No supporter found for FT entry ${entryId}`);
          continue;
        }

        const supporterId = supporterResult.rows[0].supporter_id;

        // Create the missing event
        await query(
          `INSERT INTO event (event_id, supporter_id, source_system, event_type, event_time, external_id, amount, currency, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            supporterId,
            'futureticketing',
            'StadiumEntry',
            entry.scan_datetime ? new Date(entry.scan_datetime) : new Date(entry.event_date),
            entryId,
            null,
            null,
            JSON.stringify({
              barcode: entry.barcode_ean13,
              account_id: entry.account_id,
              event_id: entry.event_id,
              event_name: entry.event,
              scanner_no: entry.scanner_no,
            }),
            new Date(),
          ]
        );

        result.events_recovered++;
        result.events_found++;
        console.log(`[Reconciler] Recovered FT entry ${entryId}`);
      } catch (error) {
        result.errors.push(`Error processing FT entry: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  } catch (error) {
    result.errors.push(`Future Ticketing API error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return result;
}

/**
 * Main handler for reconciliation job
 */
export const handler = async (_event: ScheduledEvent): Promise<{
  statusCode: number;
  body: string;
}> => {
  const startTime = Date.now();
  console.log('[Reconciler] Starting reconciliation run');

  const result: ReconciliationResult = {
    sources: [],
    total_events_found: 0,
    total_events_recovered: 0,
    alert_threshold_exceeded: false,
    duration_ms: 0,
  };

  try {
    // Get lookback period
    const lookbackHours = await getLookbackHours();
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    console.log(`[Reconciler] Reconciling events since ${since.toISOString()} (${lookbackHours} hours)`);

    // Reconcile all sources in parallel for efficiency
    const [shopifyResult, stripeResult, gcResult, ftResult] = await Promise.allSettled([
      reconcileShopify(since),
      reconcileStripe(since),
      reconcileGoCardless(since),
      reconcileFutureTicketing(since),
    ]);

    // Collect results (handle both fulfilled and rejected promises)
    const sources: SourceReconciliationResult[] = [];

    if (shopifyResult.status === 'fulfilled') {
      sources.push(shopifyResult.value);
    } else {
      sources.push({
        source_system: 'shopify',
        events_found: 0,
        events_recovered: 0,
        events_already_exists: 0,
        errors: [shopifyResult.reason?.message || 'Unknown error'],
      });
    }

    if (stripeResult.status === 'fulfilled') {
      sources.push(stripeResult.value);
    } else {
      sources.push({
        source_system: 'stripe',
        events_found: 0,
        events_recovered: 0,
        events_already_exists: 0,
        errors: [stripeResult.reason?.message || 'Unknown error'],
      });
    }

    if (gcResult.status === 'fulfilled') {
      sources.push(gcResult.value);
    } else {
      sources.push({
        source_system: 'gocardless',
        events_found: 0,
        events_recovered: 0,
        events_already_exists: 0,
        errors: [gcResult.reason?.message || 'Unknown error'],
      });
    }

    if (ftResult.status === 'fulfilled') {
      sources.push(ftResult.value);
    } else {
      sources.push({
        source_system: 'futureticketing',
        events_found: 0,
        events_recovered: 0,
        events_already_exists: 0,
        errors: [ftResult.reason?.message || 'Unknown error'],
      });
    }

    result.sources = sources;
    result.total_events_found = sources.reduce((sum, s) => sum + s.events_found, 0);
    result.total_events_recovered = sources.reduce((sum, s) => sum + s.events_recovered, 0);

    // Check alert threshold
    const ALERT_THRESHOLD = 100;
    result.alert_threshold_exceeded = result.total_events_recovered > ALERT_THRESHOLD;

    if (result.alert_threshold_exceeded) {
      console.error(`[Reconciler] ALERT: ${result.total_events_recovered} events recovered - possible webhook failure!`);
    }

    // Log recovered events to CloudWatch
    if (result.total_events_recovered > 0) {
      console.log('RECONCILER_RECOVERED_EVENTS', JSON.stringify({
        timestamp: new Date().toISOString(),
        recovered_by_source: sources.map(s => ({
          source: s.source_system,
          count: s.events_recovered,
        })),
        total_recovered: result.total_events_recovered,
      }));
    }

    // Update last run timestamp in config
    await query(
      `INSERT INTO config (key, value, description)
       VALUES ('reconciliation_last_run', $1, 'Last reconciliation run')
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [new Date().toISOString()]
    );

    result.duration_ms = Date.now() - startTime;

    console.log('[Reconciler] Completed:', {
      ...result,
      lookback_hours: lookbackHours,
    });

    // Emit CloudWatch custom metrics
    console.log('RECONCILER_METRICS', JSON.stringify({
      timestamp: new Date().toISOString(),
      ...result,
    }));

    return {
      statusCode: result.alert_threshold_exceeded ? 206 : 200, // 206 for partial success with alert
      body: JSON.stringify({
        message: 'Reconciliation completed',
        lookback_hours: lookbackHours,
        ...result,
      }),
    };
  } catch (error) {
    result.duration_ms = Date.now() - startTime;
    console.error('[Reconciler] Fatal error:', error);

    // Log error metric
    console.log('RECONCILER_ERROR', JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: result.duration_ms,
    }));

    throw error;
  }
};
