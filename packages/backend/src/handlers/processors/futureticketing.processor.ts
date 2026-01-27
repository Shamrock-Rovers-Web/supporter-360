import { SQSHandler, SQSRecord } from 'aws-lambda';
import { query, transaction } from '../../db/connection';
import { v4 as uuidv4 } from 'uuid';

interface FTMessage {
  type: 'customer' | 'order' | 'entry';
  data: any;
}

export const handler: SQSHandler = async (event) => {
  console.log(`Processing ${event.Records.length} FT messages`);

  for (const record of event.Records) {
    try {
      const message: FTMessage = JSON.parse(record.body);
      await processMessage(message);
      console.log(`Processed ${message.type}: ${JSON.stringify(message.data)}`);
    } catch (error) {
      console.error('Error processing record:', error);
      throw error; // Let DLQ handle it
    }
  }
};

async function processMessage(message: FTMessage) {
  switch (message.type) {
    case 'customer':
      await processCustomer(message.data);
      break;
    case 'order':
      await processOrder(message.data);
      break;
    case 'entry':
      await processEntry(message.data);
      break;
  }
}

async function processCustomer(customer: any) {
  const existingResult = await query(
    `SELECT s.* FROM supporter s
     WHERE s.linked_ids->>'futureticketing' = $1`,
    [customer.CustomerID]
  );

  if (existingResult.rows.length === 0) {
    await query(
      `INSERT INTO supporter (name, primary_email, phone, supporter_type, linked_ids)
       VALUES ($1, $2, $3, 'Unknown', $4)`,
      [
        `${customer.FirstName || ''} ${customer.LastName || ''}`.trim() || null,
        customer.Email || null,
        customer.Phone || null,
        JSON.stringify({ futureticketing: customer.CustomerID }),
      ]
    );

    // Add email alias
    if (customer.Email) {
      const supporterResult = await query(
        `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1`,
        [customer.CustomerID]
      );
      if (supporterResult.rows.length > 0) {
        await query(
          `INSERT INTO email_alias (email, supporter_id)
           VALUES ($1, $2)
           ON CONFLICT (email, supporter_id) DO NOTHING`,
          [customer.Email, supporterResult.rows[0].supporter_id]
        );
      }
    }
  }
}

async function processOrder(order: any) {
  // Find supporter by FT customer ID
  const supporterResult = await query(
    `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1`,
    [order.CustomerID]
  );

  if (supporterResult.rows.length === 0) {
    console.log(`Supporter not found for FT customer ${order.CustomerID}, skipping order`);
    return;
  }

  const supporterId = supporterResult.rows[0].supporter_id;

  // Check for existing event
  const existingEvent = await query(
    `SELECT event_id FROM event WHERE source_system = 'futureticketing' AND external_id = $1`,
    [`order-${order.OrderID}`]
  );

  if (existingEvent.rows.length > 0) {
    console.log(`Order ${order.OrderID} already processed, skipping`);
    return;
  }

  await query(
    `INSERT INTO event (supporter_id, source_system, event_type, event_time, external_id, amount, currency, metadata)
     VALUES ($1, 'futureticketing', 'TicketPurchase', $2, $3, $4, $5, $6)`,
    [
      supporterId,
      order.OrderDate,
      `order-${order.OrderID}`,
      order.TotalAmount,
      'EUR',
      JSON.stringify({
        order_id: order.OrderID,
        status: order.Status,
        items: order.Items,
      }),
    ]
  );
}

async function processEntry(entry: any) {
  const supporterResult = await query(
    `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1`,
    [entry.CustomerID]
  );

  if (supporterResult.rows.length === 0) {
    console.log(`Supporter not found for FT customer ${entry.CustomerID}, skipping entry`);
    return;
  }

  const supporterId = supporterResult.rows[0].supporter_id;

  await query(
    `INSERT INTO event (supporter_id, source_system, event_type, event_time, external_id, metadata)
     VALUES ($1, 'futureticketing', 'StadiumEntry', $2, $3, $4)
     ON CONFLICT (source_system, external_id) DO NOTHING`,
    [
      supporterId,
      entry.EntryTime,
      `entry-${entry.EntryID}`,
      JSON.stringify({
        event_id: entry.EventID,
        event_name: entry.EventName,
        gate: entry.Gate,
      }),
    ]
  );
}
