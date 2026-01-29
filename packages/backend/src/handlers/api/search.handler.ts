/**
 * Search API Handler
 *
 * GET /search?q={query}&field={field}&type={type}&limit={limit}&offset={offset}
 *
 * Search for supporters by email, name, or phone. Supports filtering by
 * supporter_type and pagination.
 *
 * @packageDocumentation
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { SupporterType } from '@supporter360/shared';
import { requireAuth, type AuthContext } from '../../middleware/auth';
import { errorResponse, successResponse } from '../../utils/api-response';

const supporterRepo = new SupporterRepository();

// Constants
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const ALLOWED_FIELDS = ['email', 'name', 'phone', 'all'] as const;
const ALLOWED_TYPES: SupporterType[] = [
  'Member',
  'Season Ticket Holder',
  'Ticket Buyer',
  'Shop Buyer',
  'Away Supporter',
  'Staff/VIP',
  'Unknown',
];

interface SearchQueryParams {
  q?: string;
  field?: 'email' | 'name' | 'phone' | 'all';
  type?: string;
  types?: string;
  limit?: string;
  offset?: string;
}

/**
 * Parse and validate query parameters.
 */
function parseQueryParams(params: SearchQueryParams): {
  query: string;
  field: 'email' | 'name' | 'phone' | 'all';
  supporterType?: SupporterType | SupporterType[];
  limit: number;
  offset: number;
} | null {
  const query = params.q?.trim() || '';
  if (!query) {
    return null;
  }

  const fieldParam = params.field || 'all';
  if (!ALLOWED_FIELDS.includes(fieldParam as any)) {
    return null;
  }

  const limit = parseInt(params.limit || String(DEFAULT_LIMIT), 10);
  if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
    return null;
  }

  const offset = parseInt(params.offset || '0', 10);
  if (isNaN(offset) || offset < 0) {
    return null;
  }

  // Parse supporter type filter - can be 'type' (single) or 'types' (comma-separated)
  let supporterType: SupporterType | SupporterType[] | undefined;
  const typeValue = params.type || params.types;
  if (typeValue) {
    const types = typeValue.split(',').map(t => t.trim());
    const validTypes = types.filter((t): t is SupporterType =>
      ALLOWED_TYPES.includes(t as SupporterType)
    );

    if (validTypes.length > 0) {
      supporterType = validTypes.length === 1 ? validTypes[0] : validTypes;
    }
  }

  return {
    query,
    field: fieldParam as 'email' | 'name' | 'phone' | 'all',
    supporterType,
    limit,
    offset,
  };
}

/**
 * Main handler for the search endpoint.
 */
export const handler = requireAuth(async (
  event: APIGatewayProxyEvent,
  _auth: AuthContext
) => {
  try {
    const parsed = parseQueryParams(event.queryStringParameters as SearchQueryParams);

    if (!parsed) {
      return errorResponse(
        'Invalid query parameters. q is required, field must be one of: email, name, phone, all',
        400,
        'INVALID_PARAMETERS'
      );
    }

    const { query, field, supporterType, limit, offset } = parsed;

    // Perform search with timing
    const startTime = Date.now();
    const { results, total } = await supporterRepo.search({
      query,
      field,
      supporter_type: supporterType,
      limit,
      offset,
    });
    const duration = Date.now() - startTime;

    // Log slow queries
    if (duration > 1000) {
      console.warn(`Slow search query: ${duration}ms for query: "${query}"`);
    }

    return successResponse({
      results: results.map(r => ({
        supporter_id: r.supporter_id,
        name: r.name,
        email: r.email,
        supporter_type: r.supporter_type,
        last_ticket_order: r.last_ticket_order_date?.toISOString() || null,
        last_shop_order: r.last_shop_order_date?.toISOString() || null,
        membership_status: r.membership_status,
      })),
      total,
      limit,
      offset,
      has_more: offset + results.length < total,
    });
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse(
      'Search failed',
      500,
      'SEARCH_ERROR'
    );
  }
});
