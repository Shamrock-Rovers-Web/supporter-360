/**
 * GoCardless Event Processor
 *
 * SQS Lambda handler that processes GoCardless webhook events.
 * Fetches payloads from S3, updates membership status and payment dates.
 *
 * Processes:
 * - payment_confirmed: Updates membership last_payment_date, sets status to Active
 * - payment_failed: Sets membership status to Past Due (tracks payment failures)
 * - mandate_cancelled: Sets membership status to Cancelled
 * - subscription_created: Creates/updates membership with subscription details
 * - subscription_cancelled: Cancels membership
 *
 * @packageDocumentation
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { EventRepository } from '../../db/repositories/event.repository';
import { MembershipRepository } from '../../db/repositories/membership.repository';
import type { Supporter } from '@supporter360/shared';
import type { Membership, MembershipCadence, MembershipTier } from '@supporter360/shared';

// ============================================================================
// Configuration
// ============================================================================

const supporterRepo = new SupporterRepository();
const eventRepo = new EventRepository();
const membershipRepo = new MembershipRepository();

const GOCARDLESS_API_URL = process.env.GOCARDLESS_API_URL || 'https://api.gocardless.com';
const GOCARDLESS_ACCESS_TOKEN = process.env.GOCARDLESS_ACCESS_TOKEN;

// ============================================================================
// Types
// ============================================================================

interface GoCardlessSqsMessage {
  event: GoCardlessEvent;
  s3Key: string;
  payloadId: string;
}

interface GoCardlessEvent {
  id: string;
  created_at: string;
  resource_type: string;
  action: string;
  links: Record<string, string>;
}

interface GoCardlessPayment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  charge_date?: string;
  description?: string;
  links: {
    customer: string;
    mandate?: string;
    subscription?: string;
  };
  metadata?: Record<string, unknown>;
}

interface GoCardlessMandate {
  id: string;
  status: string;
  scheme: string;
  links: {
    customer: string;
    customer_bank_account: string;
    creditor: string;
  };
  metadata?: Record<string, unknown>;
}

interface GoCardlessSubscription {
  id: string;
  status: string;
  amount: string;
  currency: string;
  interval: number;
  interval_unit: 'monthly' | 'yearly' | 'weekly';
  day_of_month?: number;
  links: {
    customer: string;
    mandate: string;
  };
  metadata?: Record<string, unknown>;
}

interface GoCardlessCustomer {
  id: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Lambda Handler
// ============================================================================

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log(`Processing ${event.Records.length} GoCardless webhook messages`);

  for (const record of event.Records) {
    try {
      await processGoCardlessMessage(record);
    } catch (error) {
      console.error('Error processing GoCardless message:', error);
      // Re-throw to trigger DLQ
      throw error;
    }
  }

  console.log('Successfully processed all GoCardless webhook messages');
};

// ============================================================================
// Message Processing
// ============================================================================

async function processGoCardlessMessage(record: SQSRecord): Promise<void> {
  const message: GoCardlessSqsMessage = JSON.parse(record.body);
  const { event: gcEvent, s3Key, payloadId } = message;

  console.log(`Processing GoCardless webhook: ${gcEvent.resource_type}/${gcEvent.action} - ${payloadId}`);

  // Route to appropriate handler based on resource type and action
  switch (gcEvent.resource_type) {
    case 'payments':
      await handlePaymentEvent(gcEvent, s3Key);
      break;

    case 'mandates':
      await handleMandateEvent(gcEvent, s3Key);
      break;

    case 'subscriptions':
      await handleSubscriptionEvent(gcEvent, s3Key);
      break;

    case 'customers':
      await handleCustomerEvent(gcEvent, s3Key);
      break;

    default:
      console.log(`Unhandled GoCardless resource type: ${gcEvent.resource_type}`);
  }
}

// ============================================================================
// Payment Event Handlers
// ============================================================================

async function handlePaymentEvent(gcEvent: GoCardlessEvent, s3Key: string): Promise<void> {
  const paymentId = gcEvent.links.payment;

  // Fetch full payment details from GoCardless API
  const payment = await fetchGoCardlessResource<GoCardlessPayment>('payments', paymentId);
  if (!payment) {
    console.warn('Could not fetch payment:', paymentId);
    return;
  }

  const customerId = payment.links?.customer;
  if (!customerId) {
    console.warn('Payment without customer:', paymentId);
    return;
  }

  // Fetch customer details
  const customer = await fetchGoCardlessResource<GoCardlessCustomer>('customers', customerId);
  if (!customer) {
    console.warn('Could not fetch customer:', customerId);
    return;
  }

  // Find or create supporter
  const supporter = await findOrCreateSupporterFromGoCardlessCustomer(customer);
  if (!supporter) {
    console.warn('Could not find or create supporter for payment:', paymentId);
    return;
  }

  const externalId = `gocardless-payment-${paymentId}`;

  // Determine event type based on action
  const isFailure = gcEvent.action.includes('failed') || payment.status === 'failed';
  const isSuccess = gcEvent.action === 'confirmed' || gcEvent.action === 'paid_out' || payment.status === 'paid';

  // Check for idempotency
  const existingEvent = await eventRepo.findByExternalId('gocardless', externalId);
  if (existingEvent) {
    console.log(`Payment ${paymentId} already processed, skipping`);
    return;
  }

  // Create event
  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'gocardless',
    event_type: isSuccess ? 'MembershipEvent' : 'PaymentEvent',
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
      charge_date: payment.charge_date,
    },
    raw_payload_ref: s3Key,
  });

  // Update membership based on payment status
  if (isSuccess) {
    await updateMembershipFromPayment(supporter.supporter_id, payment);
    console.log(`Updated membership for supporter ${supporter.supporter_id} from successful payment`);
  } else if (isFailure) {
    await handlePaymentFailure(supporter.supporter_id, payment);
    console.log(`Handled payment failure for supporter ${supporter.supporter_id}`);
  }
}

// ============================================================================
// Mandate Event Handlers
// ============================================================================

async function handleMandateEvent(gcEvent: GoCardlessEvent, s3Key: string): Promise<void> {
  const mandateId = gcEvent.links.mandate;

  console.log(`Processing mandate event: ${gcEvent.action} - ${mandateId}`);

  const mandate = await fetchGoCardlessResource<GoCardlessMandate>('mandates', mandateId);
  if (!mandate) {
    console.warn('Could not fetch mandate:', mandateId);
    return;
  }

  const customerId = mandate.links?.customer;
  if (!customerId) {
    return;
  }

  const customer = await fetchGoCardlessResource<GoCardlessCustomer>('customers', customerId);
  if (!customer) {
    return;
  }

  const supporter = await findOrCreateSupporterFromGoCardlessCustomer(customer);
  if (!supporter) {
    return;
  }

  // Handle different mandate actions
  if (gcEvent.action === 'cancelled') {
    await membershipRepo.cancel(supporter.supporter_id);
    console.log(`Cancelled membership for supporter ${supporter.supporter_id} due to mandate cancellation`);
  } else if (gcEvent.action === 'created' || gcEvent.action === 'submitted') {
    // Mandate created/submitted - ensure membership exists
    await membershipRepo.upsert({
      supporter_id: supporter.supporter_id,
      billing_method: 'gocardless',
      status: 'Active',
    });
    console.log(`Ensured membership exists for supporter ${supporter.supporter_id}`);
  }
}

// ============================================================================
// Subscription Event Handlers
// ============================================================================

async function handleSubscriptionEvent(gcEvent: GoCardlessEvent, s3Key: string): Promise<void> {
  const subscriptionId = gcEvent.links.subscription;

  console.log(`Processing subscription event: ${gcEvent.action} - ${subscriptionId}`);

  const subscription = await fetchGoCardlessResource<GoCardlessSubscription>('subscriptions', subscriptionId);
  if (!subscription) {
    console.warn('Could not fetch subscription:', subscriptionId);
    return;
  }

  const customerId = subscription.links?.customer;
  if (!customerId) {
    return;
  }

  const customer = await fetchGoCardlessResource<GoCardlessCustomer>('customers', customerId);
  if (!customer) {
    return;
  }

  const supporter = await findOrCreateSupporterFromGoCardlessCustomer(customer);
  if (!supporter) {
    return;
  }

  // Map interval to cadence
  const cadence: MembershipCadence = subscription.interval_unit === 'monthly' ? 'Monthly' : 'Annual';

  // Determine status
  let status: Membership['status'] = 'Active';
  if (gcEvent.action === 'cancelled' || subscription.status === 'cancelled') {
    status = 'Cancelled';
  } else if (subscription.status === 'paused') {
    status = 'Past Due';
  }

  // Update membership
  await membershipRepo.upsert({
    supporter_id: supporter.supporter_id,
    cadence,
    billing_method: 'gocardless',
    status,
  });

  console.log(`Updated membership for supporter ${supporter.supporter_id} from subscription ${gcEvent.action}`);
}

// ============================================================================
// Customer Event Handlers
// ============================================================================

async function handleCustomerEvent(gcEvent: GoCardlessEvent, s3Key: string): Promise<void> {
  const customerId = gcEvent.links.customer;
  const customer = await fetchGoCardlessResource<GoCardlessCustomer>('customers', customerId);

  if (!customer || !customer.email) {
    console.warn('Customer without email, skipping:', customerId);
    return;
  }

  await findOrCreateSupporterFromGoCardlessCustomer(customer);
}

// ============================================================================
// Supporter Lookup/Creation
// ============================================================================

async function findOrCreateSupporterFromGoCardlessCustomer(
  customer: GoCardlessCustomer
): Promise<Supporter | null> {
  if (!customer.email) {
    return null;
  }

  const email = customer.email.toLowerCase();
  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 1) {
    const supporter = supporters[0];

    // Update linked_ids if GoCardless customer ID is not set
    if (customer.id && !supporter.linked_ids.gocardless) {
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        gocardless: customer.id,
      });
    }

    return supporter;
  }

  if (supporters.length > 1) {
    console.warn(`Multiple supporters for email ${email}, using first one`);
    const supporter = supporters[0];

    if (customer.id && !supporter.linked_ids.gocardless) {
      await supporterRepo.updateLinkedIds(supporter.supporter_id, {
        gocardless: customer.id,
      });
    }

    return supporter;
  }

  // Create new supporter
  const name = customer.given_name || customer.family_name || customer.company_name
    ? `${customer.given_name || ''} ${customer.family_name || ''}`.trim() || customer.company_name
    : null;

  const newSupporter = await supporterRepo.create({
    name,
    primary_email: email,
    phone: customer.phone || null,
    supporter_type: 'Member',
    supporter_type_source: 'auto',
    linked_ids: { gocardless: customer.id },
  });

  await supporterRepo.addEmailAlias(newSupporter.supporter_id, email, false);

  console.log(`Created new supporter from GoCardless customer: ${newSupporter.supporter_id}`);

  return newSupporter;
}

// ============================================================================
// Membership Updates
// ============================================================================

async function updateMembershipFromPayment(
  supporterId: string,
  payment: GoCardlessPayment
): Promise<void> {
  // Update membership payment date and status
  const membership = await membershipRepo.findBySupporterId(supporterId);

  const paymentDate = payment.charge_date
    ? new Date(payment.charge_date)
    : new Date();

  if (membership) {
    await membershipRepo.updateLastPaymentDate(supporterId, paymentDate);
    await membershipRepo.markActive(supporterId);
  } else {
    // Create membership if it doesn't exist
    await membershipRepo.upsert({
      supporter_id: supporterId,
      billing_method: 'gocardless',
      status: 'Active',
      last_payment_date: paymentDate,
    });
  }
}

async function handlePaymentFailure(
  supporterId: string,
  payment: GoCardlessPayment
): Promise<void> {
  const membership = await membershipRepo.findBySupporterId(supporterId);

  if (membership) {
    // Mark as Past Due to track payment failure
    await membershipRepo.markPastDue(supporterId);
    console.log(`Marked membership for supporter ${supporterId} as Past Due due to payment failure`);
  }
}

// ============================================================================
// GoCardless API Client
// ============================================================================

async function fetchGoCardlessResource<T>(
  resourceType: string,
  resourceId: string
): Promise<T | null> {
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
    // GoCardless returns singular resource name (e.g., { "payment": {...} })
    const singularName = resourceType.slice(0, -1);
    return (data[singularName] as T) || null;
  } catch (error) {
    console.error(`Error fetching ${resourceType}/${resourceId}:`, error);
    return null;
  }
}
