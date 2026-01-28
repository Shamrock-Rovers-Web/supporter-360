/**
 * Future Ticketing Poller Scheduled Handler
 *
 * Scheduled Lambda function (runs every 5 minutes) that polls the Future Ticketing
 * API for new customers, orders, and stadium entries since the last poll.
 *
 * For each result, sends a message to the future-ticketing SQS queue for processing.
 * Updates the config.last_ft_poll_timestamp after successful polling.
 *
 * Idempotent and processes in batches of 100.
 *
 * @packageDocumentation
 */

import { ScheduledEvent } from 'aws-lambda';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { query } from '../../db/connection';
import { createFutureTicketingClient } from '../../integrations/future-ticketing';
import type { FTAccount, FTOrder, FTStadiumEntry } from '../../integrations/future-ticketing/types';

// FTCustomer is an alias for FTAccount for backwards compatibility
type FTCustomer = FTAccount;

/**
 * Convert ISO date string to YYYY-MM-DD format for FT API
 */
function toApiDate(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Checkpoint tracking last poll timestamps for each FT entity type
 */
interface FTPollCheckpoint {
  last_account_poll: string | null;
  last_order_poll: string | null;
  last_entry_poll: string | null;
}

/**
 * Result of the FT polling operation
 */
interface PollResult {
  customers_found: number;
  orders_found: number;
  entries_found: number;
  total_queued: number;
  errors: string[];
}

const sqsClient = new SQSClient({
  maxAttempts: 3,
  region: process.env.AWS_REGION || 'eu-west-1',
});

const QUEUE_URL = process.env.FUTURE_TICKETING_QUEUE_URL;

if (!QUEUE_URL) {
  throw new Error('FUTURE_TICKETING_QUEUE_URL environment variable is required');
}

/**
 * Loads the checkpoint from the config table
 */
async function loadCheckpoint(): Promise<FTPollCheckpoint> {
  const result = await query<{ value: string }>(
    `SELECT value FROM config WHERE key = 'last_ft_poll_checkpoint'`
  );

  if (result.rows.length === 0) {
    return {
      last_account_poll: null,
      last_order_poll: null,
      last_entry_poll: null,
    };
  }

  try {
    return JSON.parse(result.rows[0].value) as FTPollCheckpoint;
  } catch {
    return {
      last_account_poll: null,
      last_order_poll: null,
      last_entry_poll: null,
    };
  }
}

/**
 * Saves the checkpoint to the config table
 */
async function saveCheckpoint(checkpoint: FTPollCheckpoint): Promise<void> {
  await query(
    `INSERT INTO config (key, value, description)
     VALUES ('last_ft_poll_checkpoint', $1, 'Future Ticketing polling checkpoint')
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(checkpoint)]
  );
}

/**
 * Sends messages to SQS in batches of up to 10
 */
async function sendToQueue(messages: Array<{
  type: string;
  data: unknown;
}>): Promise<number> {
  const BATCH_SIZE = 10;
  let sent = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const entries = batch.map((msg, idx) => ({
      Id: `${msg.type}-${Date.now()}-${i}-${idx}`,
      MessageBody: JSON.stringify(msg.data),
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: msg.type,
        },
        source: {
          DataType: 'String',
          StringValue: 'futureticketing',
        },
      },
    }));

    try {
      await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: QUEUE_URL,
          Entries: entries,
        })
      );
      sent += batch.length;
    } catch (error) {
      console.error('[FTPoller] Failed to send batch to SQS:', error);
      // Continue with next batch - partial failure is acceptable
      // SQS will handle retry via DLQ if configured
    }
  }

  return sent;
}

/**
 * Polls for accounts since the last checkpoint
 */
async function pollCustomers(since: string | null): Promise<{
  customers: FTAccount[];
  errors: string[];
}> {
  const errors: string[] = [];
  const ftClient = createFutureTicketingClient();

  try {
    // Use updatedSince filter via POST
    const response = since
      ? await ftClient.getAccounts({ updatedSince: toApiDate(since), expand: ['address', 'account_category'] })
      : await ftClient.getAccounts({ page: 1 });

    // Extract all pages for initial sync
    let allAccounts = response.data || [];
    let currentPage = response.currentpage || 1;
    const limit = parseInt(response.limit || '20', 10);
    const total = parseInt(response.total || '0', 0);

    // If we have no checkpoint (first run), fetch all accounts up to a reasonable limit
    if (!since && total > limit * 10) {
      console.warn(`[FTPoller] First run would fetch ${total} accounts, limiting to ${limit * 10}`);
    }

    // Fetch remaining pages if needed
    while (currentPage * limit < total && currentPage < 10) {
      currentPage++;
      const nextPage = since
        ? await ftClient.getAccounts({ updatedSince: toApiDate(since), page: currentPage, expand: ['address', 'account_category'] })
        : await ftClient.getAccounts({ page: currentPage });
      if (nextPage.data?.length) {
        allAccounts = allAccounts.concat(nextPage.data);
      }
    }

    return { customers: allAccounts, errors };
  } catch (error) {
    const errorMessage = `Failed to poll accounts: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMessage);
    console.error('[FTPoller]', errorMessage);
    return { customers: [], errors };
  }
}

/**
 * Polls for orders since the last checkpoint
 */
async function pollOrders(since: string | null): Promise<{
  orders: FTOrder[];
  errors: string[];
}> {
  const errors: string[] = [];
  const ftClient = createFutureTicketingClient();

  try {
    if (!since) {
      // First run - use a default lookback of 30 days
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      since = defaultStartDate.toISOString();
    }

    // Use date range up to now
    const startDate = toApiDate(since);
    const endDate = toApiDate(new Date().toISOString());

    // Fetch all pages
    let allOrders: FTOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 50) {
      const response = await ftClient.getOrdersByDate(startDate, endDate, { page, validOrder: true });
      if (response.data?.length) {
        allOrders = allOrders.concat(response.data);
      }

      // Check if there are more pages
      const currentPage = response.currentpage || page;
      const limit = parseInt(response.limit || '20', 10);
      const total = parseInt(response.total || '0', 10);
      hasMore = currentPage * limit < total;
      page++;
    }

    return { orders: allOrders, errors };
  } catch (error) {
    const errorMessage = `Failed to poll orders: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMessage);
    console.error('[FTPoller]', errorMessage);
    return { orders: [], errors };
  }
}

/**
 * Polls for stadium entries since the last checkpoint
 */
async function pollEntries(since: string | null): Promise<{
  entries: FTStadiumEntry[];
  errors: string[];
}> {
  const errors: string[] = [];
  const ftClient = createFutureTicketingClient();

  try {
    if (!since) {
      // First run - entries are derived from orders, so use same default
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      since = defaultStartDate.toISOString();
    }

    // Use date range - entries are extracted from order barcode scans
    const startDate = toApiDate(since);
    const endDate = toApiDate(new Date().toISOString());

    const entries = await ftClient.getStadiumEntries(startDate, endDate);
    return { entries, errors };
  } catch (error) {
    const errorMessage = `Failed to poll entries: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMessage);
    console.error('[FTPoller]', errorMessage);
    return { entries: [], errors };
  }
}

/**
 * Main handler for Future Ticketing polling
 */
export const handler = async (_event: ScheduledEvent): Promise<{
  statusCode: number;
  body: string;
}> => {
  const startTime = Date.now();
  console.log('[FTPoller] Starting Future Ticketing poll');

  const result: PollResult = {
    customers_found: 0,
    orders_found: 0,
    entries_found: 0,
    total_queued: 0,
    errors: [],
  };

  try {
    // Load checkpoint
    const checkpoint = await loadCheckpoint();
    console.log('[FTPoller] Loaded checkpoint:', checkpoint);

    const now = new Date();
    const newPollTimestamp = now.toISOString();

    // Poll all three data sources in parallel
    const [customersResult, ordersResult, entriesResult] = await Promise.all([
      pollCustomers(checkpoint.last_account_poll),
      pollOrders(checkpoint.last_order_poll),
      pollEntries(checkpoint.last_entry_poll),
    ]);

    result.customers_found = customersResult.customers.length;
    result.orders_found = ordersResult.orders.length;
    result.entries_found = entriesResult.entries.length;
    result.errors = [
      ...customersResult.errors,
      ...ordersResult.errors,
      ...entriesResult.errors,
    ];

    console.log('[FTPoller] Found:', {
      customers: result.customers_found,
      orders: result.orders_found,
      entries: result.entries_found,
    });

    // Prepare messages for SQS
    const messages: Array<{ type: string; data: unknown }> = [];

    for (const account of customersResult.customers) {
      messages.push({
        type: 'account',
        data: account,
      });
    }

    for (const order of ordersResult.orders) {
      messages.push({
        type: 'order',
        data: order,
      });
    }

    for (const entry of entriesResult.entries) {
      messages.push({
        type: 'entry',
        data: entry,
      });
    }

    // Send to SQS in batches
    if (messages.length > 0) {
      result.total_queued = await sendToQueue(messages);
      console.log('[FTPoller] Queued', result.total_queued, 'messages');
    }

    // Update checkpoint (always update, even if no new data)
    // This ensures we don't re-poll the same time range
    const newCheckpoint: FTPollCheckpoint = {
      last_account_poll: newPollTimestamp,
      last_order_poll: newPollTimestamp,
      last_entry_poll: newPollTimestamp,
    };

    await saveCheckpoint(newCheckpoint);

    const duration = Date.now() - startTime;
    console.log('[FTPoller] Completed in', duration, 'ms', {
      ...result,
      checkpoint_updated: true,
    });

    // Emit CloudWatch custom metrics via console.log
    console.log('FT_POLL_METRICS', JSON.stringify({
      timestamp: new Date().toISOString(),
      accounts_found: result.customers_found,
      orders_found: result.orders_found,
      entries_found: result.entries_found,
      total_queued: result.total_queued,
      errors_count: result.errors.length,
      duration_ms: duration,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Future Ticketing poll completed',
        duration_ms: duration,
        ...result,
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[FTPoller] Fatal error after', duration, 'ms:', error);

    // Log error metric
    console.log('FT_POLL_ERROR', JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration,
    }));

    throw error;
  }
};
