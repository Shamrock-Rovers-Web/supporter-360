/**
 * Future Ticketing Event Processor
 *
 * SQS Lambda handler that processes Future Ticketing data.
 * Fetches payloads from S3, looks up product mappings, tags supporters.
 *
 * Processes:
 * - orders: Creates TicketPurchase event, looks up product mapping
 * - customers: Creates/updates supporter with FT customer ID
 * - entries: Creates StadiumEntry event
 *
 * Product Mapping:
 * - Looks up product in future_ticketing_product_mapping table
 * - Tags supporter if product is "AwaySupporter" or "SeasonTicket"
 *
 * @packageDocumentation
 */

import { SQSHandler, SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { query } from '../../db/connection';
import type { Supporter } from '@supporter360/shared';

// ============================================================================
// Configuration
// ============================================================================

const supporterRepo = new SupporterRepository();
const eventRepo = new EventRepository();

// ============================================================================
// Types
// ============================================================================

interface FutureTicketingSqsMessage {
  type: 'customer' | 'order' | 'entry';
  data: FTCustomer | FTOrder | FTEntry;
  s3Key?: string;
  payloadId?: string;
}

interface FTCustomer {
  CustomerID: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  [key: string]: unknown;
}

interface FTOrder {
  OrderID: string;
  CustomerID: string;
  OrderDate: Date | string;
  TotalAmount?: number;
  Status?: string;
  Items?: FTOrderItem[];
  [key: string]: unknown;
}

interface FTOrderItem {
  ProductID?: string;
  CategoryID?: string;
  ProductName?: string;
  Quantity?: number;
  Price?: number;
  [key: string]: unknown;
}

interface FTEntry {
  EntryID: string;
  CustomerID: string;
  EntryTime: Date | string;
  EventID?: string;
  EventName?: string;
  Gate?: string;
  [key: string]: unknown;
}

interface FTProductMapping {
  id: number;
  product_id: string | null;
  category_id: string | null;
  meaning: string;
  effective_from: Date;
  notes: string | null;
}

// Supported product meanings for tagging
type ProductMeaning = 'AwaySupporter' | 'SeasonTicket' | 'HomeTicket' | 'Other';

// ============================================================================
// Lambda Handler
// ============================================================================

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  console.log(`Processing ${event.Records.length} Future Ticketing messages`);

  for (const record of event.Records) {
    try {
      await processFTMessage(record);
    } catch (error) {
      console.error('Error processing Future Ticketing message:', error);
      // Re-throw to trigger DLQ
      throw error;
    }
  }

  console.log('Successfully processed all Future Ticketing messages');
};

// ============================================================================
// Message Processing
// ============================================================================

async function processFTMessage(record: SQSRecord): Promise<void> {
  const message: FutureTicketingSqsMessage = JSON.parse(record.body);
  const { type, data } = message;

  console.log(`Processing Future Ticketing ${type}: ${JSON.stringify(data).slice(0, 100)}`);

  // Route to appropriate handler based on type
  switch (type) {
    case 'customer':
      await processCustomer(data as FTCustomer);
      break;

    case 'order':
      await processOrder(data as FTOrder);
      break;

    case 'entry':
      await processEntry(data as FTEntry);
      break;

    default:
      console.log(`Unhandled Future Ticketing message type: ${type}`);
  }
}

// ============================================================================
// Customer Handler
// ============================================================================

async function processCustomer(customer: FTCustomer): Promise<void> {
  const customerId = customer.CustomerID;

  // Check if supporter already exists with this FT customer ID
  const existingSupporter = await findSupporterByFTCustomerId(customerId);

  if (existingSupporter) {
    console.log(`Supporter already exists for FT customer ${customerId}, skipping`);
    return;
  }

  // Check if supporter exists with matching email
  if (customer.Email) {
    const supporters = await supporterRepo.findByEmail(customer.Email);

    if (supporters.length === 1) {
      // Update existing supporter with FT customer ID
      const supporter = supporters[0];
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        futureticketing: customerId,
      });
      console.log(`Updated supporter ${supporter.supporter_id} with FT customer ID ${customerId}`);
      return;
    }

    if (supporters.length > 1) {
      console.warn(`Multiple supporters for email ${customer.Email}, cannot link FT customer ${customerId}`);
      return;
    }
  }

  // Create new supporter
  const name = `${customer.FirstName || ''} ${customer.LastName || ''}`.trim() || null;

  const newSupporter = await supporterRepo.create({
    name,
    primary_email: customer.Email || null,
    phone: customer.Phone || null,
    supporter_type: 'Unknown',
    supporter_type_source: 'auto',
    linked_ids: {
      futureticketing: customerId,
    },
  });

  if (customer.Email) {
    await supporterRepo.addEmailAlias(newSupporter.supporter_id, customer.Email, false);
  }

  console.log(`Created new supporter from FT customer: ${newSupporter.supporter_id}`);
}

// ============================================================================
// Order Handler
// ============================================================================

async function processOrder(order: FTOrder): Promise<void> {
  const customerId = order.CustomerID;

  // Find supporter by FT customer ID
  let supporter = await findSupporterByFTCustomerId(customerId);

  if (!supporter) {
    // Try to create supporter from minimal customer data
    console.log(`Supporter not found for FT customer ${customerId}, attempting to create`);
    await processCustomer({ CustomerID: customerId });
    supporter = await findSupporterByFTCustomerId(customerId);
  }

  if (!supporter) {
    console.warn(`Could not find or create supporter for FT customer ${customerId}, skipping order`);
    return;
  }

  // Check for idempotency
  const externalId = `ft-order-${order.OrderID}`;
  const existingEvent = await eventRepo.findByExternalId('futureticketing', externalId);

  if (existingEvent) {
    console.log(`Order ${order.OrderID} already processed, skipping`);
    return;
  }

  // Check product mappings for all items
  const productMeanings = new Set<ProductMeaning>();

  if (order.Items && order.Items.length > 0) {
    for (const item of order.Items) {
      const meaning = await getProductMeaning(item.ProductID, item.CategoryID);
      if (meaning) {
        productMeanings.add(meaning);
      }
    }
  }

  // Create TicketPurchase event
  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'futureticketing',
    event_type: 'TicketPurchase',
    event_time: new Date(order.OrderDate),
    external_id: externalId,
    amount: order.TotalAmount || null,
    currency: 'EUR',
    metadata: {
      order_id: order.OrderID,
      customer_id: order.CustomerID,
      status: order.Status,
      items: order.Items,
      product_meanings: Array.from(productMeanings),
    },
    raw_payload_ref: null, // FT poller doesn't use S3
  });

  // Update supporter type based on product meanings
  await updateSupporterTypeFromProducts(supporter, productMeanings);

  console.log(`Created TicketPurchase event for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Entry Handler
// ============================================================================

async function processEntry(entry: FTEntry): Promise<void> {
  const customerId = entry.CustomerID;

  // Find supporter by FT customer ID
  const supporter = await findSupporterByFTCustomerId(customerId);

  if (!supporter) {
    console.log(`Supporter not found for FT customer ${customerId}, skipping entry`);
    return;
  }

  // Check for idempotency
  const externalId = `ft-entry-${entry.EntryID}`;
  const existingEvent = await eventRepo.findByExternalId('futureticketing', externalId);

  if (existingEvent) {
    console.log(`Entry ${entry.EntryID} already processed, skipping`);
    return;
  }

  // Create StadiumEntry event
  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'futureticketing',
    event_type: 'StadiumEntry',
    event_time: new Date(entry.EntryTime),
    external_id: externalId,
    amount: null,
    currency: null,
    metadata: {
      entry_id: entry.EntryID,
      customer_id: entry.CustomerID,
      event_id: entry.EventID,
      event_name: entry.EventName,
      gate: entry.Gate,
    },
    raw_payload_ref: null,
  });

  console.log(`Created StadiumEntry event for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Supporter Lookup
// ============================================================================

async function findSupporterByFTCustomerId(customerId: string): Promise<Supporter | null> {
  // Search for supporter with this FT customer ID in linked_ids
  const result = await supporterRepo.search({
    query: customerId,
    field: 'all',
    limit: 100,
  });

  // Find supporter with matching FT customer ID
  const found = result.results.find((s: any) => s.linked_ids?.futureticketing === customerId);
  if (!found) return null;

  // Get full supporter profile
  return await supporterRepo.findById(found.supporter_id);
}

// ============================================================================
// Product Mapping
// ============================================================================

async function getProductMeaning(
  productId?: string,
  categoryId?: string
): Promise<ProductMeaning | null> {
  if (!productId && !categoryId) {
    return null;
  }

  // Look up product mapping by product_id first, then category_id
  const mappings = await query<FTProductMapping>(
    `SELECT * FROM future_ticketing_product_mapping
     WHERE effective_from <= CURRENT_TIMESTAMP
     AND (product_id = $1 OR category_id = $2)
     ORDER BY effective_from DESC
     LIMIT 5`,
    [productId || null, categoryId || null]
  );

  if (mappings.rows.length === 0) {
    return null;
  }

  // Return the most recent mapping
  const mapping = mappings.rows[0];

  // Map to our supported meanings
  const meaning = mapping.meaning.toLowerCase();

  if (meaning.includes('away') && meaning.includes('supporter')) {
    return 'AwaySupporter';
  }

  if (meaning.includes('season') && meaning.includes('ticket')) {
    return 'SeasonTicket';
  }

  if (meaning.includes('home') && meaning.includes('ticket')) {
    return 'HomeTicket';
  }

  return 'Other';
}

// ============================================================================
// Supporter Type Updates
// ============================================================================

async function updateSupporterTypeFromProducts(
  supporter: Supporter,
  productMeanings: Set<ProductMeaning>
): Promise<void> {
  if (productMeanings.size === 0) {
    return;
  }

  // Update supporter type based on products
  let newType: Supporter['supporter_type'] = supporter.supporter_type;

  // Priority order for supporter types
  if (productMeanings.has('SeasonTicket')) {
    newType = 'Season Ticket Holder';
  } else if (productMeanings.has('AwaySupporter')) {
    newType = 'Away Supporter';
  } else if (productMeanings.has('HomeTicket') && newType === 'Unknown') {
    newType = 'Ticket Buyer';
  }

  // Only update if the new type is more specific than current
  if (
    newType !== supporter.supporter_type &&
    supporter.supporter_type_source === 'auto'
  ) {
    await supporterRepo.update(supporter.supporter_id, {
      supporter_type: newType,
    });
    console.log(`Updated supporter ${supporter.supporter_id} type to ${newType}`);
  }
}
