import { SQSHandler, SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { query } from '../../db/connection';

const supporterRepo = new SupporterRepository();
const eventRepo = new EventRepository();

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      await processStripeWebhook(record);
    } catch (error) {
      console.error('Error processing Stripe webhook:', error);
      throw error;
    }
  }
};

async function processStripeWebhook(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);
  const { event: stripeEvent, s3Key, payloadId } = message;

  console.log(`Processing Stripe webhook: ${stripeEvent.type} - ${payloadId}`);

  switch (stripeEvent.type) {
    case 'payment_intent.succeeded':
    case 'payment_intent.created':
      await handlePaymentIntent(stripeEvent.data.object, stripeEvent.type, s3Key);
      break;

    case 'charge.succeeded':
      await handleCharge(stripeEvent.data.object, s3Key);
      break;

    case 'customer.created':
    case 'customer.updated':
      await handleCustomer(stripeEvent.data.object, s3Key);
      break;

    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      await handleInvoice(stripeEvent.data.object, s3Key);
      break;

    case 'checkout.session.completed':
      await handleCheckoutSession(stripeEvent.data.object, s3Key);
      break;

    default:
      console.log(`Unhandled Stripe event type: ${stripeEvent.type}`);
  }
}

async function handlePaymentIntent(paymentIntent: any, eventType: string, s3Key: string): Promise<void> {
  const email = paymentIntent.receipt_email || paymentIntent.customer_details?.email;

  if (!email) {
    console.warn('Payment intent without email, attempting customer lookup:', paymentIntent.id);
    if (paymentIntent.customer) {
      return;
    }
    return;
  }

  const supporter = await findOrCreateSupporter(email, {
    stripeCustomerId: paymentIntent.customer,
    name: paymentIntent.customer_details?.name,
  });

  const externalId = `stripe-pi-${paymentIntent.id}`;

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'stripe',
    event_type: 'PaymentEvent',
    event_time: new Date(paymentIntent.created * 1000),
    external_id: externalId,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency.toUpperCase(),
    metadata: {
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      payment_method: paymentIntent.payment_method,
      description: paymentIntent.description,
      metadata: paymentIntent.metadata,
      event_type: eventType,
    },
    raw_payload_ref: s3Key,
  });

  await updateMembershipFromPayment(supporter.supporter_id, paymentIntent);

  console.log(`Created PaymentEvent for supporter ${supporter.supporter_id}`);
}

async function handleCharge(charge: any, s3Key: string): Promise<void> {
  const email = charge.billing_details?.email || charge.receipt_email;

  if (!email) {
    console.warn('Charge without email, skipping:', charge.id);
    return;
  }

  const supporter = await findOrCreateSupporter(email, {
    stripeCustomerId: charge.customer,
    name: charge.billing_details?.name,
  });

  const externalId = `stripe-charge-${charge.id}`;

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'stripe',
    event_type: 'PaymentEvent',
    event_time: new Date(charge.created * 1000),
    external_id: externalId,
    amount: charge.amount / 100,
    currency: charge.currency.toUpperCase(),
    metadata: {
      charge_id: charge.id,
      status: charge.status,
      payment_method: charge.payment_method,
      description: charge.description,
      metadata: charge.metadata,
    },
    raw_payload_ref: s3Key,
  });

  console.log(`Created PaymentEvent (charge) for supporter ${supporter.supporter_id}`);
}

async function handleCustomer(customer: any, s3Key: string): Promise<void> {
  const email = customer.email?.toLowerCase();

  if (!email) {
    console.warn('Customer without email, skipping:', customer.id);
    return;
  }

  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 0) {
    const newSupporter = await supporterRepo.create({
      name: customer.name || null,
      primary_email: email,
      phone: customer.phone || null,
      supporter_type: 'Unknown',
      linked_ids: {
        stripe: customer.id,
      },
    });

    await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);
    console.log(`Created new supporter from Stripe customer: ${newSupporter.supporter_id}`);
  } else if (supporters.length === 1) {
    const supporter = supporters[0];
    const linkedIds = { ...supporter.linked_ids, stripe: customer.id };

    await supporterRepo.update(supporter.supporter_id, {
      linked_ids: linkedIds,
      name: supporter.name || customer.name || null,
      phone: supporter.phone || customer.phone || null,
    });

    console.log(`Updated supporter ${supporter.supporter_id} with Stripe customer ID`);
  } else {
    console.warn(`Multiple supporters found for email ${email}, flagging as shared`);
  }
}

async function handleInvoice(invoice: any, s3Key: string): Promise<void> {
  const email = invoice.customer_email;

  if (!email) {
    console.warn('Invoice without email, skipping:', invoice.id);
    return;
  }

  const supporter = await findOrCreateSupporter(email, {
    stripeCustomerId: invoice.customer,
  });

  const externalId = `stripe-invoice-${invoice.id}`;

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'stripe',
    event_type: 'MembershipEvent',
    event_time: new Date(invoice.created * 1000),
    external_id: externalId,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    metadata: {
      invoice_id: invoice.id,
      subscription_id: invoice.subscription,
      status: invoice.status,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
    },
    raw_payload_ref: s3Key,
  });

  console.log(`Created MembershipEvent (invoice) for supporter ${supporter.supporter_id}`);
}

async function handleCheckoutSession(session: any, s3Key: string): Promise<void> {
  const email = session.customer_details?.email || session.customer_email;

  if (!email) {
    console.warn('Checkout session without email, skipping:', session.id);
    return;
  }

  const supporter = await findOrCreateSupporter(email, {
    stripeCustomerId: session.customer,
    name: session.customer_details?.name,
  });

  console.log(`Processed checkout session for supporter ${supporter.supporter_id}`);
}

async function findOrCreateSupporter(email: string, data: any): Promise<any> {
  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 1) {
    const supporter = supporters[0];
    if (data.stripeCustomerId && !supporter.linked_ids.stripe) {
      await supporterRepo.update(supporter.supporter_id, {
        linked_ids: { ...supporter.linked_ids, stripe: data.stripeCustomerId },
      });
    }
    return supporter;
  }

  if (supporters.length > 1) {
    console.warn(`Multiple supporters for email ${email}, using first`);
    return supporters[0];
  }

  const newSupporter = await supporterRepo.create({
    name: data.name || null,
    primary_email: email,
    supporter_type: 'Unknown',
    linked_ids: data.stripeCustomerId ? { stripe: data.stripeCustomerId } : {},
  });

  await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);

  return newSupporter;
}

async function updateMembershipFromPayment(supporterId: string, paymentIntent: any): Promise<void> {
  const metadata = paymentIntent.metadata || {};

  if (metadata.membership_tier || metadata.membership_type) {
    const membershipData = {
      supporter_id: supporterId,
      tier: metadata.membership_tier || null,
      cadence: metadata.membership_cadence || null,
      billing_method: 'stripe',
      status: 'Active',
      last_payment_date: new Date(paymentIntent.created * 1000),
    };

    await query(
      `INSERT INTO membership (supporter_id, tier, cadence, billing_method, status, last_payment_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (supporter_id) DO UPDATE
       SET tier = COALESCE($2, membership.tier),
           cadence = COALESCE($3, membership.cadence),
           status = $5,
           last_payment_date = $6`,
      [
        membershipData.supporter_id,
        membershipData.tier,
        membershipData.cadence,
        membershipData.billing_method,
        membershipData.status,
        membershipData.last_payment_date,
      ]
    );
  }
}
