/**
 * GDPR Compliance API Handler
 *
 * Provides endpoints for GDPR compliance:
 * - GET /api/admin/gdpr/personal-data/:supporter_id - Data portability (export all personal data)
 * - DELETE /api/admin/gdpr/:supporter_id - Right to be forgotten (anonymize/delete data)
 * - POST /api/admin/gdpr/consent - Record/update consent
 * - GET /api/admin/gdpr/consent/:supporter_id - Get consent history
 * - GET /api/admin/gdpr/deletion-requests - List deletion requests
 *
 * @packageDocumentation
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { requireAuth, type AuthContext } from '../../../middleware/auth';
import { errorResponse, successResponse } from '../../../utils/api-response';
import { pool } from '../../../db/connection';

/**
 * Export personal data for a supporter (GDPR data portability)
 */
async function getPersonalData(supporterId: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get supporter basic data
    const supporterResult = await client.query(
      `SELECT supporter_id, name, primary_email, phone, supporter_type,
              supporter_type_source, flags, linked_ids, created_at, updated_at
       FROM supporter WHERE supporter_id = $1`,
      [supporterId]
    );

    if (supporterResult.rows.length === 0) {
      throw new Error('Supporter not found');
    }

    // Get email aliases
    const aliasesResult = await client.query(
      'SELECT email, is_shared, created_at FROM email_alias WHERE supporter_id = $1',
      [supporterId]
    );

    // Get events (personal data)
    const eventsResult = await client.query(
      `SELECT event_id, source_system, event_type, event_time, amount, currency, metadata, created_at
       FROM event WHERE supporter_id = $1
       ORDER BY event_time DESC`,
      [supporterId]
    );

    // Get memberships
    const membershipsResult = await client.query(
      `SELECT tier, cadence, billing_method, status, last_payment_date, next_expected_payment_date, created_at
       FROM membership WHERE supporter_id = $1`,
      [supporterId]
    );

    // Get consent records
    const consentResult = await client.query(
      `SELECT consent_type, granted, granted_at, revoked_at, ip_address, user_agent, consent_document_version
       FROM consent_record WHERE supporter_id = $1
       ORDER BY granted_at DESC`,
      [supporterId]
    );

    // Get Mailchimp memberships
    const mailchimpResult = await client.query(
      `SELECT audience_id, tags, last_synced_at, created_at
       FROM mailchimp_membership WHERE supporter_id = $1`,
      [supporterId]
    );

    await client.query('COMMIT');

    return {
      supporter: supporterResult.rows[0],
      email_aliases: aliasesResult.rows,
      events: eventsResult.rows,
      memberships: membershipsResult.rows,
      consent_records: consentResult.rows,
      mailchimp_memberships: mailchimpResult.rows,
      exported_at: new Date().toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Anonymize supporter data (right to be forgotten)
 * This replaces personally identifiable information with anonymized values
 */
async function anonymizeSupporterData(supporterId: string, actor: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if supporter exists
    const supporterCheck = await client.query(
      'SELECT supporter_id FROM supporter WHERE supporter_id = $1',
      [supporterId]
    );

    if (supporterCheck.rows.length === 0) {
      throw new Error('Supporter not found');
    }

    // Anonymize supporter data
    const anonymizedEmail = `deleted_${supporterId}@anonymized.local`;
    const anonymizedName = 'Anonymized';
    const anonymizedPhone = null;

    await client.query(
      `UPDATE supporter
       SET name = $1, primary_email = $2, phone = $3,
           flags = '{"gdpr_deleted": true}',
           linked_ids = '{}'
       WHERE supporter_id = $4`,
      [anonymizedName, anonymizedEmail, anonymizedPhone, supporterId]
    );

    // Delete email aliases
    await client.query('DELETE FROM email_alias WHERE supporter_id = $1', [supporterId]);

    // Anonymize events (keep for audit, but remove sensitive metadata)
    await client.query(
      `UPDATE event
       SET metadata = jsonb_set(metadata, '{gdpr_anonymized}', 'true')
       WHERE supporter_id = $1`,
      [supporterId]
    );

    // Delete Mailchimp memberships
    await client.query('DELETE FROM mailchimp_membership WHERE supporter_id = $1', [supporterId]);

    // Delete memberships
    await client.query('DELETE FROM membership WHERE supporter_id = $1', [supporterId]);

    // Revoke all consents
    await client.query(
      `UPDATE consent_record
       SET revoked_at = NOW()
       WHERE supporter_id = $1 AND revoked_at IS NULL`,
      [supporterId]
    );

    // Record in audit log
    await client.query(
      `INSERT INTO audit_log (actor_user_id, action_type, before_state, after_state, reason)
       VALUES ($1, 'gdpr_anonymization', NULL, $2, 'GDPR right to be forgotten request')`,
      [actor, JSON.stringify({ supporter_id: supporterId })]
    );

    // Update deletion request status if exists
    await client.query(
      `UPDATE data_deletion_request
       SET status = 'completed', completed_at = NOW()
       WHERE supporter_id = $1 AND status = 'in_progress'`,
      [supporterId]
    );

    await client.query('COMMIT');

    return {
      supporter_id: supporterId,
      status: 'anonymized',
      anonymized_at: new Date().toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Record consent
 */
async function recordConsent(data: {
  supporter_id: string;
  consent_type: string;
  granted: boolean;
  ip_address?: string;
  user_agent?: string;
  consent_document_version?: string;
}) {
  const result = await pool.query(
    `INSERT INTO consent_record
     (supporter_id, consent_type, granted, ip_address, user_agent, consent_document_version)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, supporter_id, consent_type, granted, granted_at`,
    [data.supporter_id, data.consent_type, data.granted, data.ip_address, data.user_agent, data.consent_document_version]
  );

  return result.rows[0];
}

/**
 * Get consent history for a supporter
 */
async function getConsentHistory(supporterId: string) {
  const result = await pool.query(
    `SELECT id, consent_type, granted, granted_at, revoked_at,
            ip_address, user_agent, consent_document_version
     FROM consent_record
     WHERE supporter_id = $1
     ORDER BY granted_at DESC`,
    [supporterId]
  );

  return result.rows;
}

/**
 * List deletion requests
 */
async function listDeletionRequests(status?: string) {
  let query = `
    SELECT dr.id, dr.supporter_id, dr.requested_at, dr.requested_by,
           dr.status, dr.completed_at, dr.failure_reason,
           s.name, s.primary_email
    FROM data_deletion_request dr
    LEFT JOIN supporter s ON dr.supporter_id = s.supporter_id
  `;

  const params: any[] = [];

  if (status) {
    query += ' WHERE dr.status = $1';
    params.push(status);
  }

  query += ' ORDER BY dr.requested_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Handler: GET /api/admin/gdpr/personal-data/:supporter_id
 */
export const getPersonalDataHandler = requireAuth(async (
  event: APIGatewayProxyEvent,
  auth: AuthContext
) => {
  if (auth.role !== 'admin') {
    return errorResponse('Admin access required', 403, 'FORBIDDEN');
  }

  const supporterId = event.pathParameters?.supporter_id;
  if (!supporterId) {
    return errorResponse('supporter_id is required', 400, 'INVALID_REQUEST');
  }

  try {
    const data = await getPersonalData(supporterId);

    // Return as JSON with proper headers for file download
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="personal-data-${supporterId}.json"`,
      },
      body: JSON.stringify(data, null, 2),
    };
  } catch (error: any) {
    console.error('Error exporting personal data:', error);
    return errorResponse(
      error.message || 'Failed to export personal data',
      500,
      'EXPORT_ERROR'
    );
  }
});

/**
 * Handler: DELETE /api/admin/gdpr/:supporter_id
 */
export const deletePersonalDataHandler = requireAuth(async (
  event: APIGatewayProxyEvent,
  auth: AuthContext
) => {
  if (auth.role !== 'admin') {
    return errorResponse('Admin access required', 403, 'FORBIDDEN');
  }

  const supporterId = event.pathParameters?.supporter_id;
  if (!supporterId) {
    return errorResponse('supporter_id is required', 400, 'INVALID_REQUEST');
  }

  try {
    const result = await anonymizeSupporterData(supporterId, auth.keyName);

    return successResponse({
      ...result,
      message: 'Personal data anonymized successfully',
    });
  } catch (error: any) {
    console.error('Error anonymizing data:', error);
    return errorResponse(
      error.message || 'Failed to anonymize personal data',
      500,
      'ANONYMIZATION_ERROR'
    );
  }
});

/**
 * Handler: POST /api/admin/gdpr/consent
 */
export const recordConsentHandler = requireAuth(async (
  event: APIGatewayProxyEvent,
  auth: AuthContext
) => {
  if (auth.role !== 'admin') {
    return errorResponse('Admin access required', 403, 'FORBIDDEN');
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const { supporter_id, consent_type, granted, ip_address, user_agent, consent_document_version } = body;

    if (!supporter_id || !consent_type || typeof granted !== 'boolean') {
      return errorResponse(
        'supporter_id, consent_type, and granted are required',
        400,
        'INVALID_REQUEST'
      );
    }

    const consent = await recordConsent({
      supporter_id,
      consent_type,
      granted,
      ip_address,
      user_agent,
      consent_document_version,
    });

    return successResponse({
      consent,
      message: 'Consent recorded successfully',
    });
  } catch (error: any) {
    console.error('Error recording consent:', error);
    return errorResponse(
      error.message || 'Failed to record consent',
      500,
      'CONSENT_ERROR'
    );
  }
});

/**
 * Handler: GET /api/admin/gdpr/consent/:supporter_id
 */
export const getConsentHistoryHandler = requireAuth(async (
  event: APIGatewayProxyEvent,
  auth: AuthContext
) => {
  if (auth.role !== 'admin') {
    return errorResponse('Admin access required', 403, 'FORBIDDEN');
  }

  const supporterId = event.pathParameters?.supporter_id;
  if (!supporterId) {
    return errorResponse('supporter_id is required', 400, 'INVALID_REQUEST');
  }

  try {
    const history = await getConsentHistory(supporterId);

    return successResponse({
      supporter_id: supporterId,
      consent_records: history,
      total: history.length,
    });
  } catch (error: any) {
    console.error('Error fetching consent history:', error);
    return errorResponse(
      error.message || 'Failed to fetch consent history',
      500,
      'FETCH_ERROR'
    );
  }
});

/**
 * Handler: GET /api/admin/gdpr/deletion-requests
 */
export const listDeletionRequestsHandler = requireAuth(async (
  event: APIGatewayProxyEvent,
  auth: AuthContext
) => {
  if (auth.role !== 'admin') {
    return errorResponse('Admin access required', 403, 'FORBIDDEN');
  }

  try {
    const status = event.queryStringParameters?.status;
    const requests = await listDeletionRequests(status);

    return successResponse({
      deletion_requests: requests,
      total: requests.length,
    });
  } catch (error: any) {
    console.error('Error fetching deletion requests:', error);
    return errorResponse(
      error.message || 'Failed to fetch deletion requests',
      500,
      'FETCH_ERROR'
    );
  }
});
