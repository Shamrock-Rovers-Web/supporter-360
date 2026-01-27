import { SQSHandler, SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { ShopifyWebhookPayload } from '@supporter360/shared';

const supporterRepo = new SupporterRepository();
const eventRepo = new EventRepository();

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      await processShopifyWebhook(record);
    } catch (error) {
      console.error('Error processing Shopify webhook:', error);
      throw error;
    }
  }
};

async function processShopifyWebhook(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);
  const { topic, payload, s3Key, payloadId } = message;

  console.log(`Processing Shopify webhook: ${topic} - ${payloadId}`);

  switch (topic) {
    case 'orders/create':
    case 'orders/paid':
    case 'orders/fulfilled':
      await handleOrderEvent(payload, topic, s3Key);
      break;

    case 'customers/create':
    case 'customers/update':
      await handleCustomerEvent(payload, s3Key);
      break;

    case 'orders/refunded':
      await handleRefundEvent(payload, s3Key);
      break;

    default:
      console.log(`Unhandled Shopify topic: ${topic}`);
  }
}

async function handleOrderEvent(
  order: any,
  topic: string,
  s3Key: string
): Promise<void> {
  const email = order.email?.toLowerCase();
  if (!email) {
    console.warn('Order without email, skipping:', order.id);
    return;
  }

  let supporter = await findOrCreateSupporter(email, order);

  const eventType = 'ShopOrder';
  const externalId = `shopify-order-${order.id}`;

  const items = order.line_items?.map((item: any) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    price: item.price,
  })) || [];

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'shopify',
    event_type: eventType,
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

async function handleCustomerEvent(customer: any, s3Key: string): Promise<void> {
  const email = customer.email?.toLowerCase();
  if (!email) {
    console.warn('Customer without email, skipping:', customer.id);
    return;
  }

  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 0) {
    const newSupporter = await supporterRepo.create({
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null,
      primary_email: email,
      phone: customer.phone || null,
      supporter_type: 'Shop Buyer',
      linked_ids: {
        shopify: customer.id.toString(),
      },
    });

    await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);
    console.log(`Created new supporter from Shopify customer: ${newSupporter.supporter_id}`);
  } else if (supporters.length === 1) {
    const supporter = supporters[0];
    const linkedIds = { ...supporter.linked_ids, shopify: customer.id.toString() };

    await supporterRepo.update(supporter.supporter_id, {
      linked_ids: linkedIds,
      name: supporter.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null,
      phone: supporter.phone || customer.phone || null,
    });

    console.log(`Updated supporter ${supporter.supporter_id} with Shopify customer ID`);
  } else {
    console.warn(`Multiple supporters found for email ${email}, flagging as shared`);
    for (const supporter of supporters) {
      const flags = { ...supporter.flags, shared_email: true };
      await supporterRepo.update(supporter.supporter_id, { flags });
    }
  }
}

async function handleRefundEvent(refund: any, s3Key: string): Promise<void> {
  console.log('Handling refund event:', refund.id);
}

async function findOrCreateSupporter(email: string, orderData: any): Promise<any> {
  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 1) {
    return supporters[0];
  }

  if (supporters.length > 1) {
    console.warn(`Multiple supporters for email ${email}, using first`);
    return supporters[0];
  }

  const newSupporter = await supporterRepo.create({
    name: `${orderData.customer?.first_name || ''} ${orderData.customer?.last_name || ''}`.trim() || null,
    primary_email: email,
    phone: orderData.customer?.phone || null,
    supporter_type: 'Shop Buyer',
    linked_ids: {
      shopify: orderData.customer?.id?.toString(),
    },
  });

  await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);

  return newSupporter;
}
