/**
 * Timeline API Handler
 *
 * GET /supporters/{id}/timeline?types={types}&limit={limit}&offset={offset}
 *
 * Returns a paginated timeline of events for a supporter. Supports filtering
 * by event_type and pagination. Returns events newest first.
 *
 * @packageDocumentation
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { EventRepository } from '../../db/repositories/event.repository';
import { SupporterNotFoundError } from '../../db/repositories/supporter.repository';
import { EventType } from '@supporter360/shared';
import { requireAuth, type AuthContext } from '../../middleware/auth';
import { errorResponse, successResponse } from '../../utils/api-response';

const eventRepo = new EventRepository();

// Constants
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;
const ALLOWED_EVENT_TYPES: EventType[] = [
  'TicketPurchase',
  'StadiumEntry',
  'ShopOrder',
  'MembershipEvent',
  'PaymentEvent',
  'EmailClick',
];

interface TimelineQueryParams {
  types?: string;
  type?: string;
  limit?: string;
  offset?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Parse and validate query parameters.
 */
function parseQueryParams(params: TimelineQueryParams): {
  eventTypes?: EventType[];
  limit: number;
  offset: number;
  startDate?: Date;
  endDate?: Date;
} {
  const limit = Math.min(
    parseInt(params.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const offset = parseInt(params.offset || '0', 10) || 0;

  // Parse event types - can be 'type' (single) or 'types' (comma-separated)
  let eventTypes: EventType[] | undefined;
  const typeValue = params.type || params.types;
  if (typeValue) {
    const types = typeValue.split(',').map(t => t.trim());
    const validTypes = types.filter((t): t is EventType =>
      ALLOWED_EVENT_TYPES.includes(t as EventType)
    );

    if (validTypes.length > 0) {
      eventTypes = validTypes;
    }
  }

  // Parse and validate date filters
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (params.start_date) {
    startDate = new Date(params.start_date);
    if (isNaN(startDate.getTime())) {
      throw new Error(`Invalid start_date format: ${params.start_date}`);
    }
  }

  if (params.end_date) {
    endDate = new Date(params.end_date);
    if (isNaN(endDate.getTime())) {
      throw new Error(`Invalid end_date format: ${params.end_date}`);
    }
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    throw new Error('start_date must be before or equal to end_date');
  }

  return { eventTypes, limit, offset, startDate, endDate };
}

/**
 * Convert an Event to the timeline response format.
 */
function toTimelineEvent(event: {
  event_id: string;
  supporter_id: string;
  source_system: string;
  event_type: EventType;
  event_time: Date;
  external_id: string | null;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}) {
  return {
    event_id: event.event_id,
    event_time: event.event_time.toISOString(),
    source_system: event.source_system,
    event_type: event.event_type,
    external_id: event.external_id,
    amount: event.amount,
    currency: event.currency,
    metadata: event.metadata,
    created_at: event.created_at.toISOString(),
  };
}

/**
 * Main handler for the timeline endpoint.
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

    const { eventTypes, limit, offset, startDate, endDate } =
      parseQueryParams((event.queryStringParameters || {}) as TimelineQueryParams);

    // Get timeline events
    const events = await eventRepo.findBySupporterId(
      supporterId,
      {
        event_types: eventTypes,
        start_date: startDate,
        end_date: endDate,
        limit,
        offset,
      }
    );

    // Get total count for pagination
    const total = await eventRepo.getCount(
      supporterId,
      {
        event_types: eventTypes,
        start_date: startDate,
        end_date: endDate,
      }
    );

    return successResponse({
      supporter_id: supporterId,
      events: events.map(toTimelineEvent),
      total,
      limit,
      offset,
      has_more: offset + events.length < total,
      filters: {
        event_types: eventTypes,
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null,
      },
    });
  } catch (error) {
    if (error instanceof SupporterNotFoundError) {
      return errorResponse(
        'Supporter not found',
        404,
        'SUPPORTER_NOT_FOUND'
      );
    }

    console.error('Timeline error:', error);
    return errorResponse(
      'Failed to retrieve timeline',
      500,
      'TIMELINE_ERROR'
    );
  }
});
