import { ScheduledHandler } from 'aws-lambda';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { query } from '../../db/connection';
import { FutureTicketingClient, FTCheckPoint } from '../../services/futureticketing.client';

const sqsClient = new SQSClient({});
const QUEUE_URL = process.env.FUTURE_TICKETING_QUEUE_URL!;
const ftClient = new FutureTicketingClient();

export const handler: ScheduledHandler = async (event) => {
  console.log('Future Ticketing polling triggered', JSON.stringify(event));

  try {
    // Get checkpoint
    const checkpointResult = await query(
      "SELECT value FROM config WHERE key = 'future_ticketing_checkpoint'"
    );

    let checkpoint: FTCheckPoint = {
      last_customer_fetch: null,
      last_order_fetch: null,
      last_entry_fetch: null,
    };

    if (checkpointResult.rows.length > 0) {
      checkpoint = checkpointResult.rows[0].value as FTCheckPoint;
    }

    const now = new Date().toISOString();
    const entries: any[] = [];

    // Fetch customers
    const customers = await ftClient.getCustomers(checkpoint.last_customer_fetch || undefined);
    console.log(`Fetched ${customers.length} customers`);
    customers.forEach(c => entries.push({
      type: 'customer',
      data: c,
    }));

    // Fetch orders
    const orders = await ftClient.getOrders(checkpoint.last_order_fetch || undefined);
    console.log(`Fetched ${orders.length} orders`);
    orders.forEach(o => entries.push({
      type: 'order',
      data: o,
    }));

    // Fetch stadium entries
    const stadiumEntries = await ftClient.getStadiumEntries(checkpoint.last_entry_fetch || undefined);
    console.log(`Fetched ${stadiumEntries.length} stadium entries`);
    stadiumEntries.forEach(e => entries.push({
      type: 'entry',
      data: e,
    }));

    // Send to SQS in batches
    const batchSize = 10;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      await sqsClient.send(new SendMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: batch.map((entry, idx) => ({
          Id: `${entry.type}-${entry.data.OrderID || entry.data.CustomerID || entry.data.EntryID}-${i}-${idx}`,
          MessageBody: JSON.stringify(entry),
          MessageAttributes: {
            type: { DataType: 'String', StringValue: entry.type },
            source: { DataType: 'String', StringValue: 'futureticketing' },
          },
        })),
      }));
    }

    // Update checkpoint
    const newCheckpoint: FTCheckPoint = {
      last_customer_fetch: now,
      last_order_fetch: now,
      last_entry_fetch: now,
    };

    await query(
      `INSERT INTO config (key, value, description)
       VALUES ('future_ticketing_checkpoint', $1, 'FT polling checkpoint')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(newCheckpoint)]
    );

    console.log('Polling complete, checkpoint updated');
  } catch (error) {
    console.error('FT polling error:', error);
    throw error;
  }
};
