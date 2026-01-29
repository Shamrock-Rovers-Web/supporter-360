/**
 * Mailchimp Tag Syncer Scheduled Handler
 *
 * Scheduled Lambda function (runs every hour) that synchronizes supporter tags
 * to Mailchimp audiences based on supporter data and activity.
 *
 * For each supporter with an active membership or recent activity:
 * - Calculates current tags based on rules
 * - Gets their Mailchimp memberships (audiences)
 * - Updates tags in each audience
 *
 * Tag calculation rules:
 * - Member:Active|PastDue|Lapsed
 * - Member:Tier:Full|OAP|Student|Overseas
 * - ShopBuyer:Last90Days (if shop order in 90 days)
 * - TicketBuyer:Last90Days
 * - AttendedMatch:Last90Days
 * - AwaySupporter:Last365Days
 * - SeasonTicketHolder
 *
 * Only updates tags that changed.
 * Logs changes to audit_log.
 *
 * @packageDocumentation
 */

import { ScheduledEvent } from 'aws-lambda';
import { query } from '../../db/connection';
import { createMailchimpClient } from '../../integrations/mailchimp';
import { v4 as uuidv4 } from 'uuid';
import type { SupporterType, MembershipStatus, MembershipTier } from '@supporter360/shared';

/**
 * Result of a single supporter tag sync
 */
interface SupporterSyncResult {
  supporter_id: string;
  audiences_synced: number;
  tags_updated: number;
  errors: string[];
}

/**
 * Result of the Mailchimp sync operation
 */
interface MailchimpSyncResult {
  total_supporters: number;
  total_audiences: number;
  total_tags_updated: number;
  errors: number;
  duration_ms: number;
}

/**
 * Tag calculation result for a supporter
 */
interface CalculatedTags {
  membership_status?: string;
  membership_tier?: string;
  shop_buyer?: string;
  ticket_buyer?: string;
  attended_match?: string;
  away_supporter?: string;
  season_ticket_holder?: string;
}

/**
 * Loads configured Mailchimp audiences
 */
async function getConfiguredAudiences(): Promise<Array<{ id: string; name: string }>> {
  const result = await query<{ audience_id: string; audience_name: string }>(
    `SELECT audience_id, audience_name
     FROM mailchimp_membership
     GROUP BY audience_id, audience_name
     ORDER BY audience_name`
  );

  return result.rows.map(row => ({
    id: row.audience_id,
    name: row.audience_name || row.audience_id,
  }));
}

/**
 * Gets supporters who need tag syncing:
 * - Supporters with active memberships
 * - Supporters with shop orders in last 90 days
 * - Supporters with ticket purchases in last 90 days
 * - Supporters with stadium entries in last 90 days
 */
async function getSupportersToSync(): Promise<Array<{
  supporter_id: string;
  primary_email: string;
  supporter_type: string;
}>> {
  const result = await query<{
    supporter_id: string;
    primary_email: string;
    supporter_type: string;
  }>(
    `SELECT DISTINCT s.supporter_id, s.primary_email, s.supporter_type
     FROM supporter s
     LEFT JOIN membership m ON s.supporter_id = m.supporter_id
     LEFT JOIN event e ON s.supporter_id = e.supporter_id
     WHERE m.status IN ('Active', 'Past Due')
        OR e.event_time > NOW() - INTERVAL '90 days'
     ORDER BY s.supporter_id`
  );

  return result.rows;
}

/**
 * Gets membership info for a supporter
 */
async function getMembershipInfo(supporterId: string): Promise<{
  status: MembershipStatus | null;
  tier: MembershipTier | null;
}> {
  const result = await query<{ status: MembershipStatus; tier: MembershipTier }>(
    `SELECT status, tier FROM membership WHERE supporter_id = $1`,
    [supporterId]
  );

  if (result.rows.length === 0) {
    return { status: null, tier: null };
  }

  return result.rows[0];
}

/**
 * Calculates activity tags for a supporter
 */
async function calculateActivityTags(supporterId: string): Promise<{
  shop_buyer: boolean;
  ticket_buyer: boolean;
  attended_match: boolean;
  away_supporter: boolean;
  season_ticket_holder: boolean;
}> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const threeSixtyFiveDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Shop buyer check
  const shopResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM event
     WHERE supporter_id = $1
       AND event_type = 'ShopOrder'
       AND event_time > $2`,
    [supporterId, ninetyDaysAgo]
  );

  // Ticket buyer check
  const ticketResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM event
     WHERE supporter_id = $1
       AND event_type = 'TicketPurchase'
       AND event_time > $2`,
    [supporterId, ninetyDaysAgo]
  );

  // Attended match check (stadium entry)
  const entryResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM event
     WHERE supporter_id = $1
       AND event_type = 'StadiumEntry'
       AND event_time > $2`,
    [supporterId, ninetyDaysAgo]
  );

  // Away supporter check (via product mapping)
  const awayResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM event e
     INNER JOIN future_ticketing_product_mapping ft
       ON e.metadata->>'product_id' = ft.product_id
     WHERE e.supporter_id = $1
       AND ft.meaning = 'AwaySupporter'
       AND e.event_time > $2`,
    [supporterId, threeSixtyFiveDaysAgo]
  );

  // Season ticket holder check
  const sthResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM event e
     INNER JOIN future_ticketing_product_mapping ft
       ON e.metadata->>'product_id' = ft.product_id
     WHERE e.supporter_id = $1
       AND ft.meaning = 'SeasonTicket'
       AND e.event_type = 'TicketPurchase'
       AND e.event_time > $2`,
    [supporterId, threeSixtyFiveDaysAgo]
  );

  return {
    shop_buyer: parseInt(shopResult.rows[0].count, 10) > 0,
    ticket_buyer: parseInt(ticketResult.rows[0].count, 10) > 0,
    attended_match: parseInt(entryResult.rows[0].count, 10) > 0,
    away_supporter: parseInt(awayResult.rows[0].count, 10) > 0,
    season_ticket_holder: parseInt(sthResult.rows[0].count, 10) > 0,
  };
}

/**
 * Calculates all tags for a supporter
 */
async function calculateTags(
  supporterId: string,
  supporterType: string
): Promise<string[]> {
  const tags: string[] = [];
  const membershipInfo = await getMembershipInfo(supporterId);
  const activityTags = await calculateActivityTags(supporterId);

  // Member status tags
  if (membershipInfo.status) {
    tags.push(`Member:${membershipInfo.status}`);
  }

  // Member tier tags
  if (membershipInfo.tier) {
    tags.push(`Member:Tier:${membershipInfo.tier}`);
  }

  // Activity tags
  if (activityTags.shop_buyer) {
    tags.push('ShopBuyer:Last90Days');
  }

  if (activityTags.ticket_buyer) {
    tags.push('TicketBuyer:Last90Days');
  }

  if (activityTags.attended_match) {
    tags.push('AttendedMatch:Last90Days');
  }

  if (activityTags.away_supporter) {
    tags.push('AwaySupporter:Last365Days');
  }

  if (activityTags.season_ticket_holder) {
    tags.push('SeasonTicketHolder');
  }

  // Supporter type as a tag
  tags.push(supporterType);

  return tags;
}

/**
 * Gets the Mailchimp memberships for a supporter
 */
async function getMailchimpMemberships(
  supporterId: string
): Promise<Array<{ audience_id: string; tags: string[] }>> {
  const result = await query<{ audience_id: string; tags: string[] }>(
    `SELECT audience_id, COALESCE(tags, '[]') as tags
     FROM mailchimp_membership
     WHERE supporter_id = $1`,
    [supporterId]
  );

  return result.rows.map(row => ({
    audience_id: row.audience_id,
    tags: Array.isArray(row.tags) ? row.tags : [],
  }));
}

/**
 * Updates tags for a supporter in a specific audience
 */
async function updateSupporterTags(
  supporterId: string,
  audienceId: string,
  newTags: string[]
): Promise<{ updated: boolean; error?: string }> {
  const mailchimpClient = createMailchimpClient();

  try {
    // Get current tags from Mailchimp
    const membershipResult = await query<{ mailchimp_contact_id: string | null }>(
      `SELECT mailchimp_contact_id
       FROM mailchimp_membership
       WHERE supporter_id = $1 AND audience_id = $2`,
      [supporterId, audienceId]
    );

    if (membershipResult.rows.length === 0) {
      return { updated: false, error: 'No Mailchimp membership found' };
    }

    const membership = membershipResult.rows[0];
    if (!membership.mailchimp_contact_id) {
      return { updated: false, error: 'No Mailchimp contact ID' };
    }

    // Get supporter email
    const supporterResult = await query<{ primary_email: string | null }>(
      `SELECT primary_email FROM supporter WHERE supporter_id = $1`,
      [supporterId]
    );

    const email = supporterResult.rows[0]?.primary_email;
    if (!email) {
      return { updated: false, error: 'No email address' };
    }

    // Get current tags in Mailchimp
    const currentTags = await mailchimpClient.getMemberTags(audienceId, email);

    // Calculate tag differences
    const tagsToAdd = newTags.filter(tag => !currentTags.includes(tag));
    const tagsToRemove = currentTags.filter(tag => !newTags.includes(tag));

    // Only update if there are changes
    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
      return { updated: false };
    }

    // Update tags in Mailchimp
    await mailchimpClient.updateTags(audienceId, email, tagsToAdd, tagsToRemove);

    // Update local record
    await query(
      `UPDATE mailchimp_membership
       SET tags = $1, last_synced_at = NOW()
       WHERE supporter_id = $2 AND audience_id = $3`,
      [newTags, supporterId, audienceId]
    );

    return { updated: true };
  } catch (error) {
    return {
      updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Syncs tags for a single supporter across all their audiences
 */
async function syncSupporterTags(
  supporterId: string,
  supporterType: string
): Promise<SupporterSyncResult> {
  const result: SupporterSyncResult = {
    supporter_id: supporterId,
    audiences_synced: 0,
    tags_updated: 0,
    errors: [],
  };

  try {
    // Calculate new tags
    const newTags = await calculateTags(supporterId, supporterType);

    // Get Mailchimp memberships
    const memberships = await getMailchimpMemberships(supporterId);

    // Update tags in each audience
    for (const membership of memberships) {
      const updateResult = await updateSupporterTags(
        supporterId,
        membership.audience_id,
        newTags
      );

      if (updateResult.updated) {
        result.audiences_synced++;
        result.tags_updated++;
      }

      if (updateResult.error) {
        result.errors.push(updateResult.error);
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Main handler for Mailchimp tag syncing
 */
export const handler = async (_event: ScheduledEvent): Promise<{
  statusCode: number;
  body: string;
}> => {
  const startTime = Date.now();
  console.log('[MailchimpSyncer] Starting tag sync run');

  const finalResult: MailchimpSyncResult = {
    total_supporters: 0,
    total_audiences: 0,
    total_tags_updated: 0,
    errors: 0,
    duration_ms: 0,
  };

  try {
    // Get supporters to sync
    const supporters = await getSupportersToSync();
    finalResult.total_supporters = supporters.length;

    console.log(`[MailchimpSyncer] Syncing tags for ${supporters.length} supporters`);

    // Process each supporter
    for (const supporter of supporters) {
      if (!supporter.primary_email) {
        console.log(`[MailchimpSyncer] Skipping ${supporter.supporter_id}: no email`);
        continue;
      }

      const result = await syncSupporterTags(supporter.supporter_id, supporter.supporter_type);

      finalResult.total_audiences += result.audiences_synced;
      finalResult.total_tags_updated += result.tags_updated;
      finalResult.errors += result.errors.length;

      if (result.errors.length > 0) {
        console.error(`[MailchimpSyncer] Errors for ${supporter.supporter_id}:`, result.errors);
      }

      // Log significant changes to audit_log
      if (result.tags_updated > 0) {
        await query(
          `INSERT INTO audit_log (audit_id, actor_user_id, action_type, timestamp, before_state, after_state, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            'system',
            'mailchimp_tag_sync',
            new Date(),
            JSON.stringify({ supporter_id: supporter.supporter_id }),
            JSON.stringify({
              audiences_synced: result.audiences_synced,
              tags_updated: result.tags_updated,
            }),
            'Scheduled Mailchimp sync',
          ]
        );
      }
    }

    // Update last run timestamp in config
    await query(
      `INSERT INTO config (key, value, description)
       VALUES ('mailchimp_sync_last_run', $1, 'Last Mailchimp tag sync run')
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [new Date().toISOString()]
    );

    finalResult.duration_ms = Date.now() - startTime;

    console.log('[MailchimpSyncer] Completed:', finalResult);

    // Emit CloudWatch custom metrics
    console.log('MAILCHIMP_SYNC_METRICS', JSON.stringify({
      timestamp: new Date().toISOString(),
      ...finalResult,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Mailchimp tag sync completed',
        ...finalResult,
      }),
    };
  } catch (error) {
    finalResult.duration_ms = Date.now() - startTime;
    console.error('[MailchimpSyncer] Fatal error:', error);

    // Log error metric
    console.log('MAILCHIMP_SYNC_ERROR', JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: finalResult.duration_ms,
    }));

    throw error;
  }
};
