/**
 * Admin Merge API Handler
 *
 * POST /admin/merge
 *
 * Merges two supporter records into one. Admin-only endpoint that:
 * - Validates both supporters exist
 * - Checks for shared email conflicts (returns 409)
 * - Reassigns all events from source to target
 * - Merges linked_ids and email_aliases
 * - Writes an audit log entry
 * - Deletes the source supporter
 *
 * @packageDocumentation
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  SupporterRepository,
  SupporterNotFoundError,
  MergeConflictError,
} from '../../../db/repositories/supporter.repository';
import { AdminMergeRequest } from '@supporter360/shared';
import { requireAuth, type AuthContext } from '../../../middleware/auth';
import { errorResponse, successResponse } from '../../../utils/api-response';

const supporterRepo = new SupporterRepository();

interface MergeRequestBody {
  source_id: string;
  target_id: string;
  reason?: string;
}

/**
 * Create a 409 Conflict response for merge conflicts.
 */
function conflictResponse(message: string, details?: unknown) {
  return {
    statusCode: 409,
    body: JSON.stringify({
      success: false,
      error: message,
      code: 'MERGE_CONFLICT',
      details,
    }),
  };
}

/**
 * Validate the merge request body.
 */
function validateMergeBody(body: Partial<MergeRequestBody>): { valid: boolean; error?: string } {
  if (!body.source_id || typeof body.source_id !== 'string') {
    return { valid: false, error: 'source_id is required and must be a string' };
  }

  if (!body.target_id || typeof body.target_id !== 'string') {
    return { valid: false, error: 'target_id is required and must be a string' };
  }

  if (body.source_id === body.target_id) {
    return { valid: false, error: 'source_id and target_id cannot be the same' };
  }

  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    return { valid: false, error: 'reason is required and must be a non-empty string' };
  }

  return { valid: true };
}

/**
 * Main handler for the admin merge endpoint.
 */
export const handler = requireAuth(async (
  event: APIGatewayProxyEvent,
  auth: AuthContext
) => {
  // Ensure only admin role can perform merges
  if (auth.role !== 'admin') {
    return errorResponse(
      'Admin access required for merge operations',
      403,
      'FORBIDDEN'
    );
  }

  try {
    // Parse request body
    let body: Partial<MergeRequestBody>;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(
        'Invalid JSON in request body',
        400,
        'INVALID_JSON'
      );
    }

    // Validate request
    const validation = validateMergeBody(body);
    if (!validation.valid) {
      return errorResponse(
        validation.error || 'Invalid request',
        400,
        'INVALID_REQUEST'
      );
    }

    const { source_id, target_id, reason } = body as MergeRequestBody;

    // Perform the merge
    const mergedSupporter = await supporterRepo.merge(
      source_id,
      target_id,
      auth.keyName, // Use API key name as actor
      reason
    );

    return successResponse({
      supporter_id: mergedSupporter.supporter_id,
      name: mergedSupporter.name,
      primary_email: mergedSupporter.primary_email,
      supporter_type: mergedSupporter.supporter_type,
      message: 'Supporters merged successfully',
    });
  } catch (error) {
    if (error instanceof SupporterNotFoundError) {
      return errorResponse(
        'One or more supporters not found',
        404,
        'SUPPORTER_NOT_FOUND'
      );
    }

    if (error instanceof MergeConflictError) {
      // Merge conflict messages are user-facing and safe to expose
      return conflictResponse(
        error.message,
        { code: 'MERGE_CONFLICT' }
      );
    }

    console.error('Merge error:', error);
    return errorResponse(
      'Failed to merge supporters',
      500,
      'MERGE_ERROR'
    );
  }
});
