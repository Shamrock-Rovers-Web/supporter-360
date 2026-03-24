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

// Data quality metrics
interface DataQualityMetrics {
  records_processed: number;
  records_skipped: number;
  records_with_errors: number;
  validation_warnings: string[];
}

const metrics: DataQualityMetrics = {
  records_processed: 0,
  records_skipped: 0,
  records_with_errors: 0,
  validation_warnings: [],
};

/**
 * Validate email address format
 */
function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date string is valid ISO format
 */
function isValidISODate(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Sanitize string value (trim, remove null bytes)
 */
function sanitizeString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return String(value);
  }
  return value.trim().replace(/\0/g, '') || null;
}

/**
 * Safe parseFloat with validation
 */
function safeParseFloat(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Safe parseInt with validation
 */
function safeParseInt(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

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

  // Reset metrics for this invocation
  metrics.records_processed = 0;
  metrics.records_skipped = 0;
  metrics.records_with_errors = 0;
  metrics.validation_warnings = [];

  for (const record of event.Records) {
    try {
      await processFTMessage(record);
      metrics.records_processed++;
    } catch (error) {
      metrics.records_with_errors++;
      console.error('Error processing Future Ticketing message:', error);
      // Re-throw to trigger DLQ
      throw error;
    }
  }

  console.log('Successfully processed all Future Ticketing messages');

  // Log data quality metrics
  if (metrics.records_skipped > 0 || metrics.validation_warnings.length > 0) {
    console.log('[FTProcessor] Data Quality Metrics:', {
      processed: metrics.records_processed,
      skipped: metrics.records_skipped,
      errors: metrics.records_with_errors,
      warnings: metrics.validation_warnings.length,
    });

    if (metrics.validation_warnings.length > 0) {
      console.warn('[FTProcessor] Validation warnings:', metrics.validation_warnings);
    }
  }
};

// ============================================================================
// Message Processing
// ============================================================================

async function processFTMessage(record: SQSRecord): Promise<void> {
  // Poller sends type in MessageAttributes, data in MessageBody
  const type = record.messageAttributes?.type?.stringValue;

  if (!type) {
    console.error('Missing type attribute in SQS message');
    metrics.records_skipped++;
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(record.body);
  } catch (error) {
    console.error('Failed to parse SQS message body:', error);
    metrics.records_skipped++;
    return;
  }

  // Validate data is an object
  if (!data || typeof data !== 'object') {
    console.error('Invalid message data: not an object');
    metrics.records_skipped++;
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
  // Validate required fields
  if (!account.id || typeof account.id !== 'string') {
    console.error('[FTProcessor] Account missing required field: id');
    metrics.records_skipped++;
    return;
  }

  // Validate and sanitize email
  const email = sanitizeString(account.email);
  if (!isValidEmail(email)) {
    metrics.validation_warnings.push(`Account ${account.id} has invalid email: ${email}`);
  }

  const accountId = account.id;

  // Check if supporter already exists with this FT account ID
  const existingSupporter = await findSupporterByFTAccountId(accountId);

  if (existingSupporter) {
    console.log(`Supporter already exists for FT account ${accountId}, skipping`);
    return;
  }

  // Check if supporter exists with matching email
  if (email) {
    const supporters = await supporterRepo.findByEmail(email);

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
  const firstName = sanitizeString(account.first_name);
  const secondName = sanitizeString(account.second_name);
  const name = [firstName, secondName].filter(Boolean).join(' ') || null;

  const newSupporter = await supporterRepo.create({
    name,
    primary_email: email,
    phone: null, // FT doesn't provide phone at account level
    supporter_type: 'Unknown',
    supporter_type_source: 'auto',
    linked_ids: {
      futureticketing: accountId,
    },
  });

  if (email) {
    await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);
  }

  console.log(`Created new supporter from FT account: ${newSupporter.supporter_id}`);
}

// ============================================================================
// Order Handler
// ============================================================================

async function processOrder(order: FTOrder): Promise<void> {
  // Validate required fields
  if (!order.id || typeof order.id !== 'string') {
    console.error('[FTProcessor] Order missing required field: id');
    metrics.records_skipped++;
    return;
  }

  if (!order.account_id || typeof order.account_id !== 'string') {
    console.error('[FTProcessor] Order missing required field: account_id');
    metrics.records_skipped++;
    return;
  }

  // Validate date fields
  if (!isValidISODate(order.order_date)) {
    console.error(`[FTProcessor] Order ${order.id} has invalid order_date: ${order.order_date}`);
    metrics.records_skipped++;
    return;
  }

  const accountId = order.account_id;

  // Find supporter by FT account ID
  let supporter = await findSupporterByFTAccountId(accountId);

  if (!supporter) {
    // Try to create supporter from order data
    console.log(`Supporter not found for FT account ${accountId}, attempting to create`);
    const email = sanitizeString(order.email);
    await processAccount({
      id: accountId,
      uuid: order.account_uuid || '',
      email: email || '',
      first_name: order.first_name || '',
      second_name: order.second_name || '',
      more_info: '',
      more_info2: '',
      added: '',
      archived: 0,
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
  const amount = safeParseFloat(order.order_amount);

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
  // Validate required fields
  if (!entry.account_id || typeof entry.account_id !== 'string') {
    console.error('[FTProcessor] Entry missing required field: account_id');
    metrics.records_skipped++;
    return;
  }

  if (!entry.barcode_ean13 || typeof entry.barcode_ean13 !== 'string') {
    console.error('[FTProcessor] Entry missing required field: barcode_ean13');
    metrics.records_skipped++;
    return;
  }

  // Validate event_date if scan_datetime is missing
  if (!entry.scan_datetime && !isValidISODate(entry.event_date)) {
    console.error(`[FTProcessor] Entry has invalid event_date: ${entry.event_date}`);
    metrics.records_skipped++;
    return;
  }

  const accountId = entry.account_id;

  // Find supporter by FT account ID
  const supporter = await findSupporterByFTAccountId(accountId);

  if (!supporter) {
    console.log(`Supporter not found for FT account ${accountId}, skipping entry`);
    return;
  }

  // Create unique external ID from barcode + scan time
  const scanDateTime = sanitizeString(entry.scan_datetime);
  const uniqueId = scanDateTime
    ? `ft-entry-${entry.barcode_ean13}-${scanDateTime}`
    : `ft-entry-${entry.barcode_ean13}`;

  const existingEvent = await eventRepo.findByExternalId('futureticketing', uniqueId);

  if (existingEvent) {
    console.log(`Entry ${uniqueId} already processed, skipping`);
    return;
  }

  // Determine event time - prefer scan_datetime, fallback to event_date
  let eventTime: Date;
  if (scanDateTime && isValidISODate(scanDateTime)) {
    eventTime = new Date(scanDateTime);
  } else if (isValidISODate(entry.event_date)) {
    eventTime = new Date(entry.event_date);
  } else {
    console.error(`[FTProcessor] Entry has invalid dates: scan_datetime=${scanDateTime}, event_date=${entry.event_date}`);
    metrics.records_skipped++;
    return;
  }

  // Create StadiumEntry event
  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'futureticketing',
    event_type: 'StadiumEntry',
    event_time: eventTime,
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
