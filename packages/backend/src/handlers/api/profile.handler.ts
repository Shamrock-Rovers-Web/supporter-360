/**
 * Profile API Handler
 *
 * GET /supporters/{id}
 *
 * Returns a complete supporter profile with overview aggregates including
 * last_ticket_order, last_shop_order, membership, last_stadium_entry, and
 * mailchimp data.
 *
 * @packageDocumentation
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { SupporterRepository, SupporterNotFoundError } from '../../db/repositories/supporter.repository';
import { requireAuth, type AuthContext } from '../../middleware/auth';
import { errorResponse, successResponse } from '../../utils/api-response';

const supporterRepo = new SupporterRepository();

interface EventSummary {
  event_id: string;
  event_time: string;
  source_system: string;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Convert an Event to a summary format for the profile response.
 */
function toEventSummary(event: { event_id: string; event_time: Date; source_system: string; amount: number | null; currency: string | number | null; metadata: Record<string, unknown> } | null): EventSummary | null {
  if (!event) return null;
  return {
    event_id: event.event_id,
    event_time: event.event_time.toISOString(),
    source_system: event.source_system,
    amount: event.amount,
    currency: event.currency as string | null,
    metadata: event.metadata,
  };
}

/**
 * Main handler for the profile endpoint.
 */
export const handler = requireAuth(async (
  event: APIGatewayProxyEvent,
  _auth: AuthContext
) => {
  try {
    const supporterId = event.pathParameters?.id;

    if (!supporterId) {
      return errorResponse(
        'Supporter ID is required',
        400,
        'MISSING_SUPPORTER_ID'
      );
    }

    const profile = await supporterRepo.getProfile(supporterId);

    if (!profile) {
      return errorResponse(
        'Supporter not found',
        404,
        'SUPPORTER_NOT_FOUND',
        { supporter_id: supporterId }
      );
    }

    // Format the response
    return successResponse({
      supporter_id: profile.supporter_id,
      name: profile.name,
      primary_email: profile.primary_email,
      phone: profile.phone,
      supporter_type: profile.supporter_type,
      supporter_type_source: profile.supporter_type_source,
      flags: profile.flags,
      linked_ids: profile.linked_ids,
      emails: profile.emails.map(e => ({
        id: e.id,
        email: e.email,
        is_shared: e.is_shared,
      })),
      overview: {
        last_ticket_order: toEventSummary(profile.overview.last_ticket_order),
        last_shop_order: toEventSummary(profile.overview.last_shop_order),
        membership: profile.overview.membership ? {
          id: profile.overview.membership.id,
          tier: profile.overview.membership.tier,
          cadence: profile.overview.membership.cadence,
          billing_method: profile.overview.membership.billing_method,
          status: profile.overview.membership.status,
          last_payment_date: profile.overview.membership.last_payment_date?.toISOString() || null,
          next_expected_payment_date: profile.overview.membership.next_expected_payment_date?.toISOString() || null,
        } : null,
        last_stadium_entry: toEventSummary(profile.overview.last_stadium_entry),
        mailchimp: profile.overview.mailchimp.map(m => ({
          id: m.id,
          audience_id: m.audience_id,
          mailchimp_contact_id: m.mailchimp_contact_id,
          tags: m.tags,
          last_synced_at: m.last_synced_at?.toISOString() || null,
        })),
      },
      created_at: profile.created_at.toISOString(),
      updated_at: profile.updated_at.toISOString(),
    });
  } catch (error) {
    if (error instanceof SupporterNotFoundError) {
      return errorResponse(
        'Supporter not found',
        404,
        'SUPPORTER_NOT_FOUND'
      );
    }

    console.error('Profile error:', error);
    return errorResponse(
      'Failed to retrieve supporter profile',
      500,
      'PROFILE_ERROR'
    );
  }
});
