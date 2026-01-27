import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { SearchRequest } from '@supporter360/shared';
import { requireAuth } from '../../middleware/auth';
import { errorResponse, successResponse } from '../../utils/api-response';

const supporterRepo = new SupporterRepository();
const MAX_LIMIT = 1000;
const ALLOWED_FIELDS = ['email', 'name', 'phone', 'all'] as const;

export const handler = requireAuth(async (event: APIGatewayProxyEvent, auth) => {
  try {
    const query = event.queryStringParameters?.q || '';
    const field = event.queryStringParameters?.field as SearchRequest['field'] || 'all';
    const limitParam = event.queryStringParameters?.limit || '50';
    const offsetParam = event.queryStringParameters?.offset || '0';

    if (!query) {
      return errorResponse('Query parameter "q" is required', 400, 'MISSING_QUERY');
    }

    // Validate field parameter
    if (field && !ALLOWED_FIELDS.includes(field as any)) {
      return errorResponse(`Invalid field parameter. Must be one of: ${ALLOWED_FIELDS.join(', ')}`, 400, 'INVALID_FIELD');
    }

    // Validate and parse limit
    const limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
      return errorResponse(`Limit must be between 1 and ${MAX_LIMIT}`, 400, 'INVALID_LIMIT');
    }

    // Validate and parse offset
    const offset = parseInt(offsetParam, 10);
    if (isNaN(offset) || offset < 0) {
      return errorResponse('Offset must be a non-negative number', 400, 'INVALID_OFFSET');
    }

    const results = await supporterRepo.search({
      query,
      field,
      limit,
      offset,
    });

    return successResponse(results);
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse('Search failed', 500, 'SEARCH_ERROR', { message: (error as Error).message });
  }
});
