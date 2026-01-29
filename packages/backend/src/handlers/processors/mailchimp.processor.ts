/**
 * Mailchimp Event Processor
 *
 * SQS Lambda handler that processes Mailchimp webhook events.
 * Fetches payloads from S3, links click events to supporters.
 *
 * Processes:
 * - click events: Creates EmailClick event in timeline
 * - Links to supporter by email lookup
 * - Updates mailchimp_click_count aggregate (stored in supporter metadata)
 *
 * Multi-audience handling:
 * - One supporter can have multiple mailchimp_membership records
 * - Processes clicks from all configured audiences
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
// Types
// ============================================================================

interface MailchimpSqsMessage {
  type: string;
  data: MailchimpClickData;
  s3Key: string;
  payloadId: string;
}

interface MailchimpClickData {
  email: string;
  campaign_id?: string;
  url?: string;
  timestamp: string;
  [key: string]: unknown;
}

// ============================================================================
// Lambda Handler
// ============================================================================

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log(`Processing ${event.Records.length} Mailchimp webhook messages`);

  for (const record of event.Records) {
    try {
      await processMailchimpMessage(record);
    } catch (error) {
      console.error('Error processing Mailchimp message:', error);
      // Re-throw to trigger DLQ
      throw error;
    }
  }

  console.log('Successfully processed all Mailchimp webhook messages');
};

// ============================================================================
// Message Processing
// ============================================================================

async function processMailchimpMessage(record: SQSRecord): Promise<void> {
  const message: MailchimpSqsMessage = JSON.parse(record.body);
  const { type, data, s3Key, payloadId } = message;

  console.log(`Processing Mailchimp webhook: ${type} - ${payloadId}`);

  // Only process click events for now
  if (type === 'click') {
    await handleClickEvent(data, s3Key);
  } else {
    console.log(`Unhandled Mailchimp event type: ${type}`);
  }
}

// ============================================================================
// Click Event Handler
// ============================================================================

async function handleClickEvent(data: MailchimpClickData, s3Key: string): Promise<void> {
  const email = data.email?.toLowerCase();

  if (!email) {
    console.warn('Click event without email, skipping');
    return;
  }

  // Find supporter by email (primary or alias)
  const supporters = await supporterRepo.findByEmail(email);

  if (supporters.length === 0) {
    console.log(`No supporter found for email ${email}, skipping click event`);
    return;
  }

  if (supporters.length > 1) {
    // Multiple supporters with same email - can't reliably link
    console.warn(`Multiple supporters found for email ${email}, skipping click event`);
    return;
  }

  const supporter = supporters[0];

  // Create unique external ID for idempotency
  const timestamp = data.timestamp || new Date().toISOString();
  const externalId = `mailchimp-click-${data.campaign_id || 'unknown'}-${email}-${timestamp}`;

  // Check for idempotency
  const existingEvent = await eventRepo.findByExternalId('mailchimp', externalId);

  if (existingEvent) {
    console.log(`Click event already processed for ${email}, skipping`);
    return;
  }

  // Parse timestamp
  const eventTime = new Date(timestamp);
  if (isNaN(eventTime.getTime())) {
    console.warn(`Invalid timestamp ${timestamp}, using current time`);
    eventTime.setTime(Date.now());
  }

  // Create EmailClick event
  await eventRepo.create({
    supporter_id: supporter.supporter_id,
    source_system: 'mailchimp',
    event_type: 'EmailClick',
    event_time: eventTime,
    external_id: externalId,
    amount: null,
    currency: null,
    metadata: {
      email: data.email,
      campaign_id: data.campaign_id,
      url: data.url,
    },
    raw_payload_ref: s3Key,
  });

  // Update mailchimp_click_count aggregate
  await incrementMailchimpClickCount(supporter.supporter_id);

  console.log(`Created EmailClick event for supporter ${supporter.supporter_id}`);
}

// ============================================================================
// Supporter Lookup
// ============================================================================

/**
 * Finds supporters by email address.
 * Searches both primary_email and email_alias table.
 */
async function findSupportersByEmail(email: string): Promise<Supporter[]> {
  return supporterRepo.findByEmail(email.toLowerCase());
}

// ============================================================================
// Mailchimp Click Count Tracking
// ============================================================================

/**
 * Increments the mailchimp_click_count for a supporter.
 *
 * Note: The click count is stored in the supporter metadata or a separate table.
 * For this implementation, we track it in a separate aggregate table.
 */
async function incrementMailchimpClickCount(supporterId: string): Promise<void> {
  // Try to update existing count
  const result = await query(
    `INSERT INTO supporter_mailchimp_aggregates (supporter_id, click_count, last_click_date)
     VALUES ($1, 1, CURRENT_TIMESTAMP)
     ON CONFLICT (supporter_id)
     DO UPDATE SET
       click_count = supporter_mailchimp_aggregates.click_count + 1,
       last_click_date = CURRENT_TIMESTAMP
     RETURNING click_count`,
    [supporterId]
  );

  const newCount = result.rows[0]?.click_count;
  console.log(`Updated mailchimp_click_count for supporter ${supporterId} to ${newCount}`);
}

/**
 * Gets the current mailchimp_click_count for a supporter.
 */
async function getMailchimpClickCount(supporterId: string): Promise<number> {
  const result = await query(
    `SELECT click_count FROM supporter_mailchimp_aggregates WHERE supporter_id = $1`,
    [supporterId]
  );

  return result.rows[0]?.click_count || 0;
}

// ============================================================================
// Mailchimp Membership Tracking
// ============================================================================

/**
 * Ensures a Mailchimp membership record exists for the supporter.
 * This is used to track which audiences the supporter belongs to.
 */
async function ensureMailchimpMembership(
  supporterId: string,
  audienceId: string,
  mailchimpContactId: string
): Promise<void> {
  await query(
    `INSERT INTO mailchimp_membership (supporter_id, audience_id, mailchimp_contact_id, tags)
     VALUES ($1, $2, $3, '[]')
     ON CONFLICT (supporter_id, audience_id)
     DO UPDATE SET
       mailchimp_contact_id = $3,
       last_synced_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [supporterId, audienceId, mailchimpContactId]
  );
}

/**
 * Updates tags for a Mailchimp membership.
 * Tags are stored as a JSON array in the mailchimp_membership table.
 */
async function updateMailchimpTags(
  supporterId: string,
  audienceId: string,
  tags: string[]
): Promise<void> {
  await query(
    `UPDATE mailchimp_membership
     SET tags = $1, last_synced_at = CURRENT_TIMESTAMP
     WHERE supporter_id = $2 AND audience_id = $3`,
    [JSON.stringify(tags), supporterId, audienceId]
  );
}
