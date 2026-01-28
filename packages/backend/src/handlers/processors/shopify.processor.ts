/**
 * Shopify Event Processor
 *
 * SQS Lambda handler that processes Shopify webhook events.
 * Fetches payloads from S3, creates/updates supporters, stores events.
 *
 * Processes:
 * - orders/create: Creates ShopOrder event, updates supporter
 * - customers/create: Creates supporter with Shopify customer ID
 * - customers/update: Updates supporter contact info
 *
 * @packageDocumentation
 */

import { SQSHandler, SQSEvent, SQSRecord } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import type { Supporter } from '@supporter360/shared';

// ============================================================================
// Configuration
// ============================================================================

const s3Client = new S3Client({});
const RAW_PAYLOADS_BUCKET = process.env.RAW_PAYLOADS_BUCKET!;

const supporterRepo = new SupporterRepository();
const eventRepo = new EventRepository();

// ============================================================================
// Types
// ============================================================================

interface ShopifySqsMessage {
  topic: string;
  domain?: string;
  payload: ShopifyPayload;
  s3Key: string;
  payloadId: string;
}

interface ShopifyPayload {
  id: string | number;
  email?: string;
  customer?: ShopifyCustomer;
  created_at: string;
  updated_at: string;
  total_price?: string;
  currency?: string;
  order_number?: string | number;
  financial_status?: string;
  fulfillment_status?: string;
  line_items?: ShopifyLineItem[];
  first_name?: string;
  last_name?: string;
  phone?: string;
  [key: string]: unknown;
}

interface ShopifyCustomer {
  id: string | number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  [key: string]: unknown;
}

interface ShopifyLineItem {
  id: string | number;
  title: string;
  quantity: number;
  price: string;
  [key: string]: unknown;
}

// ============================================================================
// Lambda Handler
// ============================================================================

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  console.log(`Processing ${event.Records.length} Shopify webhook messages`);

  for (const record of event.Records) {
    try {
      await processShopifyMessage(record);
    } catch (error) {
      console.error('Error processing Shopify message:', error);
      // Re-throw to trigger DLQ
      throw error;
    }
  }

  console.log('Successfully processed all Shopify webhook messages');
};

// ============================================================================
// Message Processing
// ============================================================================

async function processShopifyMessage(record: SQSRecord): Promise<void> {
  const message: ShopifySqsMessage = JSON.parse(record.body);
  const { topic, payload, s3Key, payloadId } = message;

  console.log(`Processing Shopify webhook: ${topic} - ${payloadId}`);

  // Route to appropriate handler based on topic
  switch (topic) {
    case 'orders/create':
    case 'orders/paid':
    case 'orders/fulfilled':
      await handleOrderEvent(payload, topic, s3Key);
      break;

    case 'customers/create':
      await handleCustomerCreate(payload, s3Key);
      break;

    case 'customers/update':
      await handleCustomerUpdate(payload, s3Key);
      break;

    default:
      console.log(`Unhandled Shopify topic: ${topic}`);
  }
}

// ============================================================================
// Order Event Handler
// ============================================================================

async function handleOrderEvent(
  order: ShopifyPayload,
  topic: string,
  s3Key: string
): Promise<void> {
  const email = order.email?.toLowerCase();
  if (!email) {
    console.warn('Order without email, skipping:', order.id);
    return;
  }

  // Find or create supporter
  const supporter = await findOrCreateSupporterFromOrder(email, order);

  // Create ShopOrder event
  const externalId = `shopify-order-${order.id}`;

  // Check for idempotency
  const existingEvent = await eventRepo.findByExternalId('shopify', externalId);
  if (existingEvent) {
    console.log(`Order ${order.id} already processed, skipping event creation`);
    return;
  }

  const items = order.line_items?.map((item: ShopifyLineItem) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    price: item.price,
  })) || [];

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'shopify',
    event_type: 'ShopOrder',
    event_time: new Date(order.created_at),
    external_id: externalId,
    amount: parseFloat(order.total_price || '0'),
    currency: order.currency || 'EUR',
    metadata: {
      order_id: order.id,
      order_number: order.order_number,
      items,
      fulfillment_status: order.fulfillment_status,
      financial_status: order.financial_status,
      topic,
    },
    raw_payload_ref: s3Key,
  });

  console.log(`Created ShopOrder event for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Customer Create Handler
// ============================================================================

async function handleCustomerCreate(customer: ShopifyPayload, s3Key: string): Promise<void> {
  const email = customer.email?.toLowerCase();
  if (!email) {
    console.warn('Customer without email, skipping:', customer.id);
    return;
  }

  // Check if supporter already exists
  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 0) {
    // Create new supporter
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null;

    const newSupporter = await supporterRepo.create({
      name,
      primary_email: email,
      phone: customer.phone || null,
      supporter_type: 'Shop Buyer',
      supporter_type_source: 'auto',
      linked_ids: {
        shopify: customer.id?.toString(),
      },
    });

    await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);

    console.log(`Created new supporter from Shopify customer: ${newSupporter.supporter_id}`);
  } else if (supporters.length === 1) {
    // Update existing supporter with Shopify customer ID
    const supporter = supporters[0];

    if (!supporter.linked_ids.shopify) {
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        shopify: customer.id?.toString(),
      });
      console.log(`Updated supporter ${supporter.supporter_id} with Shopify customer ID`);
    }
  } else {
    // Multiple supporters with same email - flag as shared
    console.warn(`Multiple supporters found for email ${email}, flagging as shared`);
    for (const supporter of supporters) {
      const flags = { ...supporter.flags, shared_email: true };
      await supporterRepo.update(supporter.supporter_id, { flags });
    }
  }
}

// ============================================================================
// Customer Update Handler
// ============================================================================

async function handleCustomerUpdate(customer: ShopifyPayload, s3Key: string): Promise<void> {
  const email = customer.email?.toLowerCase();
  if (!email) {
    console.warn('Customer update without email, skipping:', customer.id);
    return;
  }

  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 1) {
    const supporter = supporters[0];
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null;

    // Update supporter details
    const updates: Partial<Supporter> = {
      linked_ids: { ...supporter.linked_ids, shopify: customer.id?.toString() },
    };

    // Only update name if supporter doesn't have one
    if (!supporter.name && name) {
      updates.name = name;
    }

    // Only update phone if supporter doesn't have one
    if (!supporter.phone && customer.phone) {
      updates.phone = customer.phone;
    }

    await supporterRepo.update(supporter.supporter_id, updates);
    console.log(`Updated supporter ${supporter.supporter_id} from Shopify customer data`);
  } else if (supporters.length > 1) {
    console.warn(`Multiple supporters for email ${email}, skipping customer update`);
  }
}

// ============================================================================
// Supporter Lookup/Creation
// ============================================================================

async function findOrCreateSupporterFromOrder(
  email: string,
  order: ShopifyPayload
): Promise<Supporter> {
  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 1) {
    const supporter = supporters[0];

    // Update linked_ids if Shopify customer ID is not set
    if (order.customer?.id && !supporter.linked_ids.shopify) {
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        shopify: order.customer.id.toString(),
      });
    }

    return supporter;
  }

  if (supporters.length > 1) {
    console.warn(`Multiple supporters for email ${email}, using first one`);
    const supporter = supporters[0];

    if (order.customer?.id && !supporter.linked_ids.shopify) {
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        shopify: order.customer.id.toString(),
      });
    }

    return supporter;
  }

  // Create new supporter
  const customerName = order.customer
    ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
    : null;

  const newSupporter = await supporterRepo.create({
    name: customerName,
    primary_email: email,
    phone: order.customer?.phone || null,
    supporter_type: 'Shop Buyer',
    supporter_type_source: 'auto',
    linked_ids: {
      shopify: order.customer?.id?.toString(),
    },
  });

  await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);

  console.log(`Created new supporter from Shopify order: ${newSupporter.supporter_id}`);

  return newSupporter;
}

// ============================================================================
// S3 Payload Utilities
// ============================================================================

async function getS3Payload(key: string): Promise<unknown> {
  const command = new GetObjectCommand({
    Bucket: RAW_PAYLOADS_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`Empty S3 object body: ${key}`);
  }

  const bodyString = await response.Body.transformToString();
  return JSON.parse(bodyString);
}
