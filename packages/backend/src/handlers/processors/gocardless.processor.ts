import { SQSHandler, SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { query } from '../../db/connection';

const supporterRepo = new SupporterRepository();
const eventRepo = new EventRepository();

const GOCARDLESS_API_URL = 'https://api.gocardless.com';
const GOCARDLESS_ACCESS_TOKEN = process.env.GOCARDLESS_ACCESS_TOKEN;

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      await processGoCardlessWebhook(record);
    } catch (error) {
      console.error('Error processing GoCardless webhook:', error);
      throw error;
    }
  }
};

async function processGoCardlessWebhook(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);
  const { event: gcEvent, s3Key, payloadId } = message;

  console.log(`Processing GoCardless webhook: ${gcEvent.resource_type}/${gcEvent.action} - ${payloadId}`);

  switch (gcEvent.resource_type) {
    case 'payments':
      await handlePayment(gcEvent, s3Key);
      break;

    case 'mandates':
      await handleMandate(gcEvent, s3Key);
      break;

    case 'subscriptions':
      await handleSubscription(gcEvent, s3Key);
      break;

    case 'customers':
      await handleCustomer(gcEvent, s3Key);
      break;

    default:
      console.log(`Unhandled GoCardless resource type: ${gcEvent.resource_type}`);
  }
}

async function handlePayment(gcEvent: any, s3Key: string): Promise<void> {
  const paymentId = gcEvent.links.payment;

  const payment = await fetchGoCardlessResource('payments', paymentId);
  if (!payment) {
    console.warn('Could not fetch payment:', paymentId);
    return;
  }

  const customerId = payment.links?.customer;
  if (!customerId) {
    console.warn('Payment without customer:', paymentId);
    return;
  }

  const customer = await fetchGoCardlessResource('customers', customerId);
  if (!customer || !customer.email) {
    console.warn('Could not fetch customer or customer has no email:', customerId);
    return;
  }

  const email = customer.email.toLowerCase();
  const supporter = await findOrCreateSupporter(email, customer);

  const externalId = `gocardless-payment-${paymentId}`;

  const eventType = gcEvent.action.includes('failed') ? 'PaymentEvent' : 'MembershipEvent';

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'gocardless',
    event_type: eventType,
    event_time: new Date(gcEvent.created_at),
    external_id: externalId,
    amount: payment.amount ? parseFloat(payment.amount) / 100 : null,
    currency: payment.currency?.toUpperCase() || 'GBP',
    metadata: {
      payment_id: paymentId,
      status: payment.status,
      action: gcEvent.action,
      mandate_id: payment.links?.mandate,
      subscription_id: payment.links?.subscription,
      description: payment.description,
    },
    raw_payload_ref: s3Key,
  });

  if (gcEvent.action === 'confirmed' || gcEvent.action === 'paid_out') {
    await updateMembershipFromPayment(supporter.supporter_id, payment);
  }

  console.log(`Created ${eventType} for supporter ${supporter.supporter_id}`);
}

async function handleMandate(gcEvent: any, s3Key: string): Promise<void> {
  const mandateId = gcEvent.links.mandate;
  console.log(`Processing mandate event: ${gcEvent.action} - ${mandateId}`);

  const mandate = await fetchGoCardlessResource('mandates', mandateId);
  if (!mandate) {
    console.warn('Could not fetch mandate:', mandateId);
    return;
  }

  const customerId = mandate.links?.customer;
  if (!customerId) return;

  const customer = await fetchGoCardlessResource('customers', customerId);
  if (!customer || !customer.email) return;

  const email = customer.email.toLowerCase();
  const supporter = await findOrCreateSupporter(email, customer);

  await query(
    `INSERT INTO membership (supporter_id, billing_method, status)
     VALUES ($1, 'gocardless', $2)
     ON CONFLICT (supporter_id) DO UPDATE
     SET billing_method = 'gocardless',
         status = $2`,
    [supporter.supporter_id, gcEvent.action === 'cancelled' ? 'Cancelled' : 'Active']
  );

  console.log(`Updated membership for supporter ${supporter.supporter_id} with mandate ${gcEvent.action}`);
}

async function handleSubscription(gcEvent: any, s3Key: string): Promise<void> {
  const subscriptionId = gcEvent.links.subscription;
  console.log(`Processing subscription event: ${gcEvent.action} - ${subscriptionId}`);

  const subscription = await fetchGoCardlessResource('subscriptions', subscriptionId);
  if (!subscription) {
    console.warn('Could not fetch subscription:', subscriptionId);
    return;
  }

  const customerId = subscription.links?.customer;
  if (!customerId) return;

  const customer = await fetchGoCardlessResource('customers', customerId);
  if (!customer || !customer.email) return;

  const email = customer.email.toLowerCase();
  const supporter = await findOrCreateSupporter(email, customer);

  const cadence = subscription.interval_unit === 'monthly' ? 'Monthly' : 'Annual';
  const status = gcEvent.action === 'cancelled' ? 'Cancelled' : 'Active';

  await query(
    `INSERT INTO membership (supporter_id, cadence, billing_method, status)
     VALUES ($1, $2, 'gocardless', $3)
     ON CONFLICT (supporter_id) DO UPDATE
     SET cadence = $2,
         billing_method = 'gocardless',
         status = $3`,
    [supporter.supporter_id, cadence, status]
  );

  console.log(`Updated membership for supporter ${supporter.supporter_id} with subscription ${gcEvent.action}`);
}

async function handleCustomer(gcEvent: any, s3Key: string): Promise<void> {
  const customerId = gcEvent.links.customer;
  const customer = await fetchGoCardlessResource('customers', customerId);

  if (!customer || !customer.email) {
    console.warn('Customer without email, skipping:', customerId);
    return;
  }

  const email = customer.email.toLowerCase();
  await findOrCreateSupporter(email, customer);
}

async function findOrCreateSupporter(email: string, customer: any): Promise<any> {
  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 1) {
    const supporter = supporters[0];
    if (customer.id && !supporter.linked_ids.gocardless) {
      await supporterRepo.update(supporter.supporter_id, {
        linked_ids: { ...supporter.linked_ids, gocardless: customer.id },
      });
    }
    return supporter;
  }

  if (supporters.length > 1) {
    console.warn(`Multiple supporters for email ${email}, using first`);
    return supporters[0];
  }

  const newSupporter = await supporterRepo.create({
    name: `${customer.given_name || ''} ${customer.family_name || ''}`.trim() || null,
    primary_email: email,
    supporter_type: 'Member',
    linked_ids: { gocardless: customer.id },
  });

  await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);

  return newSupporter;
}

async function updateMembershipFromPayment(supporterId: string, payment: any): Promise<void> {
  await query(
    `INSERT INTO membership (supporter_id, billing_method, status, last_payment_date)
     VALUES ($1, 'gocardless', 'Active', $2)
     ON CONFLICT (supporter_id) DO UPDATE
     SET status = 'Active',
         last_payment_date = $2`,
    [supporterId, new Date()]
  );
}

async function fetchGoCardlessResource(resourceType: string, resourceId: string): Promise<any> {
  if (!GOCARDLESS_ACCESS_TOKEN) {
    console.error('GOCARDLESS_ACCESS_TOKEN not configured');
    return null;
  }

  try {
    const response = await fetch(`${GOCARDLESS_API_URL}/${resourceType}/${resourceId}`, {
      headers: {
        'Authorization': `Bearer ${GOCARDLESS_ACCESS_TOKEN}`,
        'GoCardless-Version': '2015-07-06',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${resourceType}/${resourceId}:`, response.status);
      return null;
    }

    const data = await response.json() as Record<string, unknown>;
    return data[resourceType.slice(0, -1)] as Record<string, unknown> | null;
  } catch (error) {
    console.error(`Error fetching ${resourceType}/${resourceId}:`, error);
    return null;
  }
}
