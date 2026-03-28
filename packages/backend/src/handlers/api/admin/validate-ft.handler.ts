/**
 * Future Ticketing Data Validation API Handler
 *
 * GET /admin/validate-ft
 *
 * Queries database for Future Ticketing data metrics:
 * - Total FT event records from event table where source_system='futureticketing'
 * - FT events grouped by event_type (TicketPurchase, StadiumEntry, etc.)
 * - Date range of FT data (MIN and MAX event_time where source_system='futureticketing')
 * - Count of unique supporters with FT events
 * - Validation status for 2-year data requirement
 *
 * @packageDocumentation
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { query } from '../../../db/connection';
import { requireAuth, type AuthContext } from '../../../middleware/auth';
import { errorResponse, successResponse } from '../../../utils/api-response';
import { ALLOWED_ORIGINS } from '../../../config/cors';

interface FTMetrics {
  total_events: number;
  events_by_type: Record<string, number>;
  date_range: {
    earliest_event: string | null;
    latest_event: string | null;
  };
  unique_supporters: number;
  validation_status: {
    meets_two_year_requirement: boolean;
    days_covered: number | null;
    message: string;
  };
}

/**
 * Calculate the number of days between two dates.
 */
function calculateDaysCovered(earliest: Date, latest: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((latest.getTime() - earliest.getTime()) / MS_PER_DAY);
}

/**
 * Validate if the date range meets the 2-year requirement (730 days).
 */
function validateTwoYearRequirement(earliest: Date | null, latest: Date | null): {
  meets_two_year_requirement: boolean;
  days_covered: number | null;
  message: string;
} {
  if (!earliest || !latest) {
    return {
      meets_two_year_requirement: false,
      days_covered: null,
      message: 'No FT event data available to validate',
    };
  }

  const daysCovered = calculateDaysCovered(earliest, latest);
  const REQUIRED_DAYS = 730; // 2 years

  if (daysCovered >= REQUIRED_DAYS) {
    return {
      meets_two_year_requirement: true,
      days_covered: daysCovered,
      message: `FT data covers ${daysCovered} days, meeting the 2-year requirement`,
    };
  }

  return {
    meets_two_year_requirement: false,
    days_covered: daysCovered,
    message: `FT data covers only ${daysCovered} days, ${REQUIRED_DAYS - daysCovered} days short of the 2-year requirement`,
  };
}

/**
 * Main handler for the FT validation endpoint.
 */
export const handler = requireAuth(async (
  event: APIGatewayProxyEvent,
  auth: AuthContext
) => {
  const origin = event.headers.origin || event.headers.Origin;

  // Ensure only admin role can validate FT data
  if (auth.role !== 'admin') {
    return errorResponse(
      'Admin access required for FT validation',
      403,
      'FORBIDDEN',
      undefined,
      origin
    );
  }

  try {
    // Query 1: Total FT events
    const totalEventsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM event
       WHERE source_system = 'futureticketing'`
    );
    const totalEvents = parseInt(totalEventsResult.rows[0].count, 10);

    // Query 2: FT events grouped by event_type
    const eventsByTypeResult = await query<{ event_type: string; count: string }>(
      `SELECT event_type, COUNT(*) as count
       FROM event
       WHERE source_system = 'futureticketing'
       GROUP BY event_type
       ORDER BY count DESC`
    );
    const eventsByType: Record<string, number> = {};
    for (const row of eventsByTypeResult.rows) {
      eventsByType[row.event_type] = parseInt(row.count, 10);
    }

    // Query 3: Date range (MIN and MAX event_time)
    const dateRangeResult = await query<{
      min_event_time: Date;
      max_event_time: Date;
    }>(
      `SELECT MIN(event_time) as min_event_time, MAX(event_time) as max_event_time
       FROM event
       WHERE source_system = 'futureticketing'`
    );
    const earliestEvent = dateRangeResult.rows[0].min_event_time;
    const latestEvent = dateRangeResult.rows[0].max_event_time;

    // Query 4: Count of unique supporters with FT events
    const uniqueSupportersResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT supporter_id) as count
       FROM event
       WHERE source_system = 'futureticketing'`
    );
    const uniqueSupporters = parseInt(uniqueSupportersResult.rows[0].count, 10);

    // Validate 2-year requirement
    const validationStatus = validateTwoYearRequirement(earliestEvent, latestEvent);

    // Build response
    const metrics: FTMetrics = {
      total_events: totalEvents,
      events_by_type: eventsByType,
      date_range: {
        earliest_event: earliestEvent ? earliestEvent.toISOString() : null,
        latest_event: latestEvent ? latestEvent.toISOString() : null,
      },
      unique_supporters: uniqueSupporters,
      validation_status: validationStatus,
    };

    return successResponse(metrics, 200, origin);
  } catch (error) {
    console.error('FT validation error:', error);
    return errorResponse(
      'Failed to validate Future Ticketing data',
      500,
      'VALIDATION_ERROR',
      undefined,
      origin
    );
  }
});
