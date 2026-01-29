/**
 * Future Ticketing Event Processor
 *
 * SQS Lambda handler that processes Future Ticketing data.
 *
 * Processes:
 * - accounts: Creates/updates supporter with FT account ID
 * - orders: Creates TicketPurchase event with full detail, scan history
 *
 * Product Mapping:
 * - Looks up product in future_ticketing_product_mapping table
 * - Tags supporter if product is "AwaySupporter" or "SeasonTicket"
 *
 * @packageDocumentation
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
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
// Types (matching new FT API response structure)
// ============================================================================

interface FutureTicketingSqsMessage {
  type: 'account' | 'order' | 'entry';
  data: FTAccount | FTOrder | FTStadiumEntry;
  s3Key?: string;
  payloadId?: string;
}

// FT Account (was Customer)
interface FTAccount {
  id: string;
  uuid: string;
  email: string;
  title?: string | null;
  first_name?: string | null;
  second_name?: string | null;
  more_info?: string;
  more_info2?: string;
  added?: string;
  archived?: number;
  // Expanded fields
  address?: FTAccountAddress[];
  account_category?: FTAccountCategory[];
  extra_field?: FTAccountExtraField[];
  age?: number;
}

interface FTAccountAddress {
  id: string;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

interface FTAccountCategory {
  id: string;
  category_name: string;
}

interface FTAccountExtraField {
  id: string;
  extra_field_name: string;
  value: string;
}

// FT Order
interface FTOrder {
  id: string;
  account_uuid: string;
  account_id: string;
  status: string;
  order_date: string;
  order_email: string;
  email: string;
  order_amount: string;
  title?: string | null;
  first_name: string;
  second_name: string;
  address1: string;
  address2: string;
  address3: string;
  county: string;
  postcode: string;
  country: string;
  phone: string;
  payment_type: string;
  comment?: string | null;
  detail: FTOrderDetail[];
  extra_field?: FTOrderExtraField[];
}

interface FTOrderDetail {
  id: string;
  product_id: string;
  product: string;
  product_area_id: string;
  product_area_name: string;
  product_category_id: string;
  quantity: string;
  product_price: string;
  event_id: string;
  event: string;
  event_date: string;
  barcode?: FTBarcode[];
}

interface FTBarcode {
  id: string;
  uuid: string;
  barcode_ean13: string;
  barcode_external: string | null;
  scan_datetime: string | null;
  scan_detail: string | null;
  scanner_no: string | null;
  seat: string | null;
}

interface FTOrderExtraField {
  order_detail_id: string;
  barcode: string;
  barcode_external: string;
  extra_field_id: string;
  extra_field_name: string;
  value: string;
}

// FT Stadium Entry (extracted from order barcodes)
interface FTStadiumEntry {
  barcode_ean13: string;
  scan_datetime: string | null;
  scan_detail: string | null;
  scanner_no: string | null;
  order_id: string;
  account_id: string;
  event_id: string;
  event: string;
  event_date: string;
  product_id: string;
  product: string;
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

export const handler = async (event: SQSEvent): Promise<void> => {
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
  // Poller sends type in MessageAttributes, data in MessageBody
  const type = record.messageAttributes?.type?.stringValue;
  const data = JSON.parse(record.body);

  if (!type) {
    console.error('Missing type attribute in SQS message');
    return;
  }

  console.log(`Processing Future Ticketing ${type}: ${JSON.stringify(data).slice(0, 100)}`);

  // Route to appropriate handler based on type
  switch (type) {
    case 'account':
      await processAccount(data as FTAccount);
      break;

    case 'order':
      await processOrder(data as FTOrder);
      break;

    case 'entry':
      await processEntry(data as FTStadiumEntry);
      break;

    default:
      console.log(`Unhandled Future Ticketing message type: ${type}`);
  }
}

// ============================================================================
// Account Handler
// ============================================================================

async function processAccount(account: FTAccount): Promise<void> {
  const accountId = account.id;

  // Check if supporter already exists with this FT account ID
  const existingSupporter = await findSupporterByFTAccountId(accountId);

  if (existingSupporter) {
    console.log(`Supporter already exists for FT account ${accountId}, skipping`);
    return;
  }

  // Check if supporter exists with matching email
  if (account.email) {
    const supporters = await supporterRepo.findByEmail(account.email);

    if (supporters.length === 1) {
      // Update existing supporter with FT account ID
      const supporter = supporters[0];
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        futureticketing: accountId,
      });
      console.log(`Updated supporter ${supporter.supporter_id} with FT account ID ${accountId}`);
      return;
    }

    if (supporters.length > 1) {
      console.warn(`Multiple supporters for email ${account.email}, cannot link FT account ${accountId}`);
      return;
    }
  }

  // Create new supporter
  const name = `${account.first_name || ''} ${account.second_name || ''}`.trim() || null;

  const newSupporter = await supporterRepo.create({
    name,
    primary_email: account.email || null,
    phone: null, // FT doesn't provide phone at account level
    supporter_type: 'Unknown',
    supporter_type_source: 'auto',
    linked_ids: {
      futureticketing: accountId,
    },
  });

  if (account.email) {
    await supporterRepo.addEmailAlias(newSupporter.supporter_id, account.email, false);
  }

  console.log(`Created new supporter from FT account: ${newSupporter.supporter_id}`);
}

// ============================================================================
// Order Handler
// ============================================================================

async function processOrder(order: FTOrder): Promise<void> {
  const accountId = order.account_id;

  // Find supporter by FT account ID
  let supporter = await findSupporterByFTAccountId(accountId);

  if (!supporter) {
    // Try to create supporter from order data
    console.log(`Supporter not found for FT account ${accountId}, attempting to create`);
    await processAccount({
      id: accountId,
      uuid: order.account_uuid,
      email: order.email,
      first_name: order.first_name,
      second_name: order.second_name,
    });
    supporter = await findSupporterByFTAccountId(accountId);
  }

  if (!supporter) {
    console.warn(`Could not find or create supporter for FT account ${accountId}, skipping order`);
    return;
  }

  // Check for idempotency
  const externalId = `ft-order-${order.id}`;
  const existingEvent = await eventRepo.findByExternalId('futureticketing', externalId);

  if (existingEvent) {
    console.log(`Order ${order.id} already processed, skipping`);
    return;
  }

  // Check product mappings for all items
  const productMeanings = new Set<ProductMeaning>();

  if (order.detail && order.detail.length > 0) {
    for (const item of order.detail) {
      const meaning = await getProductMeaning(item.product_id, item.product_category_id);
      if (meaning) {
        productMeanings.add(meaning);
      }
    }
  }

  // Parse amount - FT returns it as a string
  const amount = order.order_amount ? parseFloat(order.order_amount) : null;

  // Create TicketPurchase event with rich FT detail
  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'futureticketing',
    event_type: 'TicketPurchase',
    event_time: new Date(order.order_date),
    external_id: externalId,
    amount: amount,
    currency: 'EUR',
    metadata: {
      order_id: order.id,
      account_id: order.account_id,
      status: order.status,
      detail: order.detail,
      extra_field: order.extra_field,
      product_meanings: Array.from(productMeanings),
      // Legacy fields for compatibility
      items: order.detail.map(d => ({
        product_id: d.product_id,
        product_name: d.product,
        category_id: d.product_category_id,
        quantity: parseInt(d.quantity, 10),
        price: parseFloat(d.product_price),
        event_id: d.event_id,
        event_name: d.event,
        event_date: d.event_date,
      })),
    },
    raw_payload_ref: null,
  });

  // Update supporter type based on product meanings
  await updateSupporterTypeFromProducts(supporter, productMeanings);

  console.log(`Created TicketPurchase event for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Entry Handler
// ============================================================================

async function processEntry(entry: FTStadiumEntry): Promise<void> {
  const accountId = entry.account_id;

  // Find supporter by FT account ID
  const supporter = await findSupporterByFTAccountId(accountId);

  if (!supporter) {
    console.log(`Supporter not found for FT account ${accountId}, skipping entry`);
    return;
  }

  // Create unique external ID from barcode + scan time
  const uniqueId = entry.scan_datetime
    ? `ft-entry-${entry.barcode_ean13}-${entry.scan_datetime}`
    : `ft-entry-${entry.barcode_ean13}`;

  const existingEvent = await eventRepo.findByExternalId('futureticketing', uniqueId);

  if (existingEvent) {
    console.log(`Entry ${uniqueId} already processed, skipping`);
    return;
  }

  // Create StadiumEntry event
  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'futureticketing',
    event_type: 'StadiumEntry',
    event_time: entry.scan_datetime ? new Date(entry.scan_datetime) : new Date(entry.event_date),
    external_id: uniqueId,
    amount: null,
    currency: null,
    metadata: {
      barcode: entry.barcode_ean13,
      account_id: entry.account_id,
      event_id: entry.event_id,
      event_name: entry.event,
      scanner_no: entry.scanner_no,
      scan_detail: entry.scan_detail,
      product_id: entry.product_id,
      product: entry.product,
    },
    raw_payload_ref: null,
  });

  console.log(`Created StadiumEntry event for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Supporter Lookup
// ============================================================================

async function findSupporterByFTAccountId(accountId: string): Promise<Supporter | null> {
  // Query directly by linked_ids JSONB field
  const result = await query<{ supporter_id: string }>(
    `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1`,
    [accountId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Get full supporter profile
  return await supporterRepo.findById(result.rows[0].supporter_id);
}

// Legacy alias for old CustomerID-based lookups
async function findSupporterByFTCustomerId(customerId: string): Promise<Supporter | null> {
  return findSupporterByFTAccountId(customerId);
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
