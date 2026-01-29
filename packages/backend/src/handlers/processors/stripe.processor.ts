/**
 * Stripe Event Processor
 *
 * SQS Lambda handler that processes Stripe webhook events.
 * Fetches payloads from S3, links payments to memberships, handles arrears.
 *
 * Processes:
 * - payment_intent.succeeded: Creates PaymentEvent, updates membership
 * - charge.succeeded: Creates PaymentEvent
 * - invoice.payment_succeeded: Updates membership status for recurring payments
 * - invoice.payment_failed: Marks membership as Past Due (arrears detection)
 *
 * @packageDocumentation
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { MembershipRepository, MembershipNotFoundError } from '../../db/repositories/membership.repository';
import type { Supporter } from '@supporter360/shared';
import type { Membership, MembershipTier, MembershipCadence } from '@supporter360/shared';

// ============================================================================
// Configuration
// ============================================================================

const supporterRepo = new SupporterRepository();
const eventRepo = new EventRepository();
const membershipRepo = new MembershipRepository();

// Arrears configuration (in days)
const ARREARS_GRACE_DAYS = parseInt(process.env.ARREARS_GRACE_DAYS || '7', 10);

// ============================================================================
// Types
// ============================================================================

interface StripeSqsMessage {
  event: StripeEvent;
  s3Key: string;
  payloadId: string;
}

interface StripeEvent {
  id: string;
  object: string;
  type: string;
  data: {
    object: StripeEventData;
  };
  created: number;
}

interface StripeEventData {
  id?: string;
  object?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_method?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  customer?: string;
  customer_details?: StripeCustomerDetails;
  receipt_email?: string;
  invoice?: string;
  subscription?: string;
  created?: number;
  paid?: boolean;
  charge?: string;
}

interface StripeCustomerDetails {
  email?: string;
  name?: string;
  phone?: string;
}

interface StripeInvoiceData extends StripeEventData {
  total?: number;
  amount_paid?: number;
  amount_due?: number;
  status?: string;
  subscription?: string;
  period_start?: number;
  period_end?: number;
  due_date?: number;
  hosted_invoice_url?: string;
}

// ============================================================================
// Lambda Handler
// ============================================================================

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log(`Processing ${event.Records.length} Stripe webhook messages`);

  for (const record of event.Records) {
    try {
      await processStripeMessage(record);
    } catch (error) {
      console.error('Error processing Stripe message:', error);
      // Re-throw to trigger DLQ
      throw error;
    }
  }

  console.log('Successfully processed all Stripe webhook messages');
};

// ============================================================================
// Message Processing
// ============================================================================

async function processStripeMessage(record: SQSRecord): Promise<void> {
  const message: StripeSqsMessage = JSON.parse(record.body);
  const { event: stripeEvent, s3Key, payloadId } = message;

  console.log(`Processing Stripe webhook: ${stripeEvent.type} - ${payloadId}`);

  // Route to appropriate handler based on event type
  switch (stripeEvent.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(stripeEvent.data.object, s3Key);
      break;

    case 'charge.succeeded':
      await handleChargeSucceeded(stripeEvent.data.object, s3Key);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(stripeEvent.data.object as StripeInvoiceData, s3Key);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(stripeEvent.data.object as StripeInvoiceData, s3Key);
      break;

    case 'customer.created':
      await handleCustomerCreated(stripeEvent.data.object, s3Key);
      break;

    case 'customer.updated':
      await handleCustomerUpdated(stripeEvent.data.object, s3Key);
      break;

    default:
      console.log(`Unhandled Stripe event type: ${stripeEvent.type}`);
  }
}

// ============================================================================
// Payment Intent Handler
// ============================================================================

async function handlePaymentIntentSucceeded(
  paymentIntent: StripeEventData,
  s3Key: string
): Promise<void> {
  const email = paymentIntent.receipt_email || paymentIntent.customer_details?.email;

  if (!email && !paymentIntent.customer) {
    console.warn('Payment intent without email or customer, skipping:', paymentIntent.id);
    return;
  }

  // Find or create supporter
  const supporter = await findOrCreateSupporterFromPayment(
    email || null,
    paymentIntent
  );

  // Create PaymentEvent
  const externalId = `stripe-pi-${paymentIntent.id}`;

  // Check for idempotency
  const existingEvent = await eventRepo.findByExternalId('stripe', externalId);
  if (existingEvent) {
    console.log(`Payment intent ${paymentIntent.id} already processed, skipping`);
    return;
  }

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'stripe',
    event_type: 'PaymentEvent',
    event_time: new Date((paymentIntent.created || Date.now() / 1000) * 1000),
    external_id: externalId,
    amount: paymentIntent.amount ? paymentIntent.amount / 100 : null,
    currency: paymentIntent.currency?.toUpperCase() || 'EUR',
    metadata: {
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      payment_method: paymentIntent.payment_method,
      description: paymentIntent.description,
      metadata: paymentIntent.metadata,
      customer: paymentIntent.customer,
    },
    raw_payload_ref: s3Key,
  });

  // Update membership if this is a membership payment
  await updateMembershipFromPayment(supporter.supporter_id, paymentIntent);

  console.log(`Created PaymentEvent for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Charge Handler
// ============================================================================

async function handleChargeSucceeded(
  charge: StripeEventData,
  s3Key: string
): Promise<void> {
  // Stripe Charge objects don't have billing_details at the root level
  // Email comes from receipt_email or we'd need to fetch the charge details
  const email = charge.receipt_email || charge.customer_details?.email;

  if (!email && !charge.customer) {
    console.warn('Charge without email or customer, skipping:', charge.id);
    return;
  }

  // Find or create supporter
  const supporter = await findOrCreateSupporterFromPayment(
    email || null,
    charge
  );

  // Create PaymentEvent
  const externalId = `stripe-charge-${charge.id}`;

  // Check for idempotency
  const existingEvent = await eventRepo.findByExternalId('stripe', externalId);
  if (existingEvent) {
    console.log(`Charge ${charge.id} already processed, skipping`);
    return;
  }

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'stripe',
    event_type: 'PaymentEvent',
    event_time: new Date((charge.created || Date.now() / 1000) * 1000),
    external_id: externalId,
    amount: charge.amount ? charge.amount / 100 : null,
    currency: charge.currency?.toUpperCase() || 'EUR',
    metadata: {
      charge_id: charge.id,
      status: charge.status,
      payment_method: charge.payment_method,
      description: charge.description,
      metadata: charge.metadata,
      customer: charge.customer,
    },
    raw_payload_ref: s3Key,
  });

  console.log(`Created PaymentEvent (charge) for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Invoice Payment Succeeded Handler
// ============================================================================

async function handleInvoicePaymentSucceeded(
  invoice: StripeInvoiceData,
  s3Key: string
): Promise<void> {
  // Invoice events typically don't have customer email directly
  // Need to look up by customer ID
  const stripeCustomerId = invoice.customer;

  if (!stripeCustomerId) {
    console.warn('Invoice without customer, skipping:', invoice.id);
    return;
  }

  // Find supporter by Stripe customer ID
  const supporter = await findSupporterByStripeId(stripeCustomerId.toString());

  if (!supporter) {
    console.warn(`No supporter found for Stripe customer ${stripeCustomerId}, skipping invoice`);
    return;
  }

  // Create MembershipEvent
  const externalId = `stripe-invoice-${invoice.id}`;

  // Check for idempotency
  const existingEvent = await eventRepo.findByExternalId('stripe', externalId);
  if (existingEvent) {
    console.log(`Invoice ${invoice.id} already processed, skipping`);
    return;
  }

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'stripe',
    event_type: 'MembershipEvent',
    event_time: new Date((invoice.created || Date.now() / 1000) * 1000),
    external_id: externalId,
    amount: invoice.amount_paid ? invoice.amount_paid / 100 : null,
    currency: invoice.currency?.toUpperCase() || 'EUR',
    metadata: {
      invoice_id: invoice.id,
      subscription_id: invoice.subscription,
      status: invoice.status,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      total: invoice.total,
    },
    raw_payload_ref: s3Key,
  });

  // Update membership with payment date
  await updateMembershipPaymentDate(supporter.supporter_id, new Date());

  console.log(`Created MembershipEvent (invoice paid) for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Invoice Payment Failed Handler (Arrears Detection)
// ============================================================================

async function handleInvoicePaymentFailed(
  invoice: StripeInvoiceData,
  s3Key: string
): Promise<void> {
  const stripeCustomerId = invoice.customer;

  if (!stripeCustomerId) {
    console.warn('Invoice without customer, skipping:', invoice.id);
    return;
  }

  // Find supporter by Stripe customer ID
  const supporter = await findSupporterByStripeId(stripeCustomerId.toString());

  if (!supporter) {
    console.warn(`No supporter found for Stripe customer ${stripeCustomerId}, skipping failed invoice`);
    return;
  }

  // Create MembershipEvent for the failure
  const externalId = `stripe-invoice-failed-${invoice.id}`;

  // Check for idempotency
  const existingEvent = await eventRepo.findByExternalId('stripe', externalId);
  if (existingEvent) {
    console.log(`Invoice failure ${invoice.id} already processed, skipping`);
    return;
  }

  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'stripe',
    event_type: 'MembershipEvent',
    event_time: new Date((invoice.created || Date.now() / 1000) * 1000),
    external_id: externalId,
    amount: invoice.amount_due ? invoice.amount_due / 100 : null,
    currency: invoice.currency?.toUpperCase() || 'EUR',
    metadata: {
      invoice_id: invoice.id,
      subscription_id: invoice.subscription,
      status: 'payment_failed',
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      due_date: invoice.due_date,
      hosted_invoice_url: invoice.hosted_invoice_url,
    },
    raw_payload_ref: s3Key,
  });

  // Check if membership exists and update to Past Due
  const membership = await membershipRepo.findBySupporterId(supporter.supporter_id);

  if (membership) {
    await membershipRepo.markPastDue(supporter.supporter_id);
    console.log(`Marked membership for supporter ${supporter.supporter_id} as Past Due (arrears)`);
  } else {
    console.log(`No membership found for supporter ${supporter.supporter_id}, cannot mark as Past Due`);
  }
}

// ============================================================================
// Customer Handlers
// ============================================================================

async function handleCustomerCreated(customer: StripeEventData, s3Key: string): Promise<void> {
  const email = customer.customer_details?.email || customer.receipt_email?.toLowerCase();

  if (!email && !customer.customer) {
    console.warn('Customer without email or customer ID, skipping:', customer.id);
    return;
  }

  const supporters = email ? await supporterRepo.findByEmail(email) : [];

  if (supporters.length === 0) {
    // No supporters found, create new one
    const newSupporter = await supporterRepo.create({
      name: customer.customer_details?.name || null,
      primary_email: email || null,
      phone: customer.customer_details?.phone || null,
      supporter_type: 'Unknown',
      supporter_type_source: 'auto',
      linked_ids: customer.customer ? {
        stripe: customer.customer,
      } : {},
    });

    if (email) {
      await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);
    }
    console.log(`Created new supporter from Stripe customer: ${newSupporter.supporter_id}`);
  } else if (supporters.length === 1) {
    const supporter = supporters[0];

    if (customer.customer && !supporter.linked_ids.stripe) {
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        stripe: customer.customer,
      });
      console.log(`Updated supporter ${supporter.supporter_id} with Stripe customer ID`);
    }
  } else {
    // Multiple supporters found - flag all as shared email
    console.warn(`Multiple supporters found for email ${email}, flagging as shared`);
    for (const supporter of supporters) {
      const flags = { ...supporter.flags, shared_email: true };
      await supporterRepo.update(supporter.supporter_id, { flags });
    }
  }
}

async function handleCustomerUpdated(customer: StripeEventData, s3Key: string): Promise<void> {
  const email = customer.customer_details?.email || customer.receipt_email?.toLowerCase();

  if (!email) {
    console.warn('Customer update without email, skipping:', customer.id);
    return;
  }

  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 1) {
    const supporter = supporters[0];

    // Update linked_ids if not set
    if (customer.customer && !supporter.linked_ids.stripe) {
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        stripe: customer.customer,
      });
    }

    // Update name and phone if supporter doesn't have them
    const updates: Partial<Supporter> = {};

    if (!supporter.name && customer.customer_details?.name) {
      updates.name = customer.customer_details.name;
    }

    if (!supporter.phone && customer.customer_details?.phone) {
      updates.phone = customer.customer_details.phone;
    }

    if (Object.keys(updates).length > 0) {
      await supporterRepo.update(supporter.supporter_id, updates);
    }

    console.log(`Updated supporter ${supporter.supporter_id} from Stripe customer data`);
  }
}

// ============================================================================
// Supporter Lookup/Creation
// ============================================================================

async function findOrCreateSupporterFromPayment(
  email: string | null,
  paymentData: StripeEventData
): Promise<Supporter> {
  // If we have an email, try to find by email
  if (email) {
    const supporters = await supporterRepo.findByEmail(email.toLowerCase());

    if (supporters.length === 1) {
      const supporter = supporters[0];

      // Update linked_ids if Stripe customer ID is not set
      if (paymentData.customer && !supporter.linked_ids.stripe) {
        await supporterRepo.updateLinkedIds(supporter.supporter_id, {
          stripe: paymentData.customer.toString(),
        });
      }

      return supporter;
    }

    if (supporters.length > 1) {
      console.warn(`Multiple supporters for email ${email}, using first one`);
      const supporter = supporters[0];

      if (paymentData.customer && !supporter.linked_ids.stripe) {
        await supporterRepo.updateLinkedIds(supporter.supporter_id, {
          stripe: paymentData.customer.toString(),
        });
      }

      return supporter;
    }
  }

  // Try to find by Stripe customer ID
  if (paymentData.customer) {
    const supporter = await findSupporterByStripeId(paymentData.customer.toString());
    if (supporter) {
      return supporter;
    }
  }

  // Create new supporter
  const customerName = paymentData.customer_details?.name;

  const newSupporter = await supporterRepo.create({
    name: customerName || null,
    primary_email: email?.toLowerCase() || null,
    supporter_type: 'Unknown',
    supporter_type_source: 'auto',
    linked_ids: paymentData.customer ? {
      stripe: paymentData.customer.toString(),
    } : {},
  });

  if (email) {
    await supporterRepo.addEmailAlias(newSupporter.supporter_id, email.toLowerCase(), false);
  }

  console.log(`Created new supporter from Stripe payment: ${newSupporter.supporter_id}`);

  return newSupporter;
}

async function findSupporterByStripeId(stripeCustomerId: string): Promise<Supporter | null> {
  // Query directly for supporter with this Stripe customer ID
  const result = await supporterRepo.search({
    query: stripeCustomerId,
    field: 'all',
    limit: 100,
  });

  // Find supporter with matching Stripe ID in linked_ids
  const found = result.results.find((s: any) => s.linked_ids?.stripe === stripeCustomerId);
  if (!found) return null;

  // Get full supporter profile
  return await supporterRepo.findById(found.supporter_id);
}

// ============================================================================
// Membership Updates
// ============================================================================

async function updateMembershipFromPayment(
  supporterId: string,
  paymentData: StripeEventData
): Promise<void> {
  const metadata = paymentData.metadata || {};

  // Check if this payment has membership metadata
  if (metadata.membership_tier || metadata.membership_type || metadata.is_membership === 'true') {
    // Validate tier and cadence values from metadata
    const validTiers: Set<MembershipTier> = new Set(['Full', 'OAP', 'Student', 'Overseas']);
    const validCadences: Set<MembershipCadence> = new Set(['Monthly', 'Annual']);

    const tierValue = metadata.membership_tier;
    const tier = (typeof tierValue === 'string' && validTiers.has(tierValue as MembershipTier))
      ? (tierValue as MembershipTier)
      : null;

    const cadenceValue = metadata.membership_cadence;
    const cadence = (typeof cadenceValue === 'string' && validCadences.has(cadenceValue as MembershipCadence))
      ? (cadenceValue as MembershipCadence)
      : null;

    const membershipData = {
      supporter_id: supporterId,
      tier,
      cadence,
      billing_method: 'stripe' as const,
      status: 'Active' as const,
      last_payment_date: new Date((paymentData.created || Date.now() / 1000) * 1000),
    };

    await membershipRepo.upsert(membershipData);
    console.log(`Updated membership for supporter ${supporterId} from payment metadata`);
  }
}

async function updateMembershipPaymentDate(supporterId: string, paymentDate: Date): Promise<void> {
  try {
    await membershipRepo.updateLastPaymentDate(supporterId, paymentDate);
  } catch (error) {
    // Membership might not exist yet, create it
    if (error instanceof MembershipNotFoundError) {
      await membershipRepo.upsert({
        supporter_id: supporterId,
        billing_method: 'stripe',
        status: 'Active',
        last_payment_date: paymentDate,
      });
    } else {
      throw error;
    }
  }
}
