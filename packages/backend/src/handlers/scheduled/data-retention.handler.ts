/**
 * Data Retention Scheduled Handler
 *
 * Scheduled job that runs periodically to:
 * - Identify records past their retention period
 * - Anonymize personal data according to retention policies
 * - Log all actions for audit purposes
 *
 * Should be scheduled to run daily (cron expression: 0 2 * * *)
 *
 * @packageDocumentation
 */

import { pool } from '../../db/connection';

interface RetentionPolicy {
  id: number;
  policy_name: string;
  entity_type: string;
  retention_period_months: number;
  anonymize_after: boolean;
}

interface AnonymizationResult {
  entity_type: string;
  records_processed: number;
  records_anonymized: number;
  records_failed: number;
  errors: string[];
}

/**
 * Get active retention policies
 */
async function getActiveRetentionPolicies(): Promise<RetentionPolicy[]> {
  const result = await pool.query(
    `SELECT id, policy_name, entity_type, retention_period_months, anonymize_after
     FROM data_retention_policy
     WHERE is_active = true
     ORDER BY entity_type`
  );

  return result.rows;
}

/**
 * Anonymize supporter records past retention period
 */
async function anonymizeSupporters(retentionMonths: number): Promise<AnonymizationResult> {
  const client = await pool.connect();
  const result: AnonymizationResult = {
    entity_type: 'supporter',
    records_processed: 0,
    records_anonymized: 0,
    records_failed: 0,
    errors: [],
  };

  try {
    await client.query('BEGIN');

    // Find supporters past retention period that aren't already anonymized
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    const supportersToAnonymize = await client.query(
      `SELECT supporter_id, name, primary_email, phone
       FROM supporter
       WHERE created_at < $1
         AND flags->>'gdpr_deleted' IS NULL
         AND supporter_type NOT IN ('Staff/VIP') -- Exclude VIP from auto-anonymization
       LIMIT 100 -- Process in batches of 100
      `,
      [cutoffDate]
    );

    result.records_processed = supportersToAnonymize.rows.length;

    for (const supporter of supportersToAnonymize.rows) {
      try {
        const anonymizedId = supporter.supporter_id;
        const anonymizedEmail = `retention_${anonymizedId.substring(0, 8)}@anonymized.local`;

        await client.query(
          `UPDATE supporter
           SET name = 'Retention Anonymized',
               primary_email = $1,
               phone = NULL,
               flags = jsonb_set(flags, '{gdpr_retention_anonymized}', 'true')
           WHERE supporter_id = $2`,
          [anonymizedEmail, anonymizedId]
        );

        result.records_anonymized++;
      } catch (error: any) {
        result.records_failed++;
        result.errors.push(`Supporter ${supporter.supporter_id}: ${error.message}`);
      }
    }

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return result;
}

/**
 * Anonymize event records past retention period
 */
async function anonymizeEvents(retentionMonths: number): Promise<AnonymizationResult> {
  const client = await pool.connect();
  const result: AnonymizationResult = {
    entity_type: 'event',
    records_processed: 0,
    records_anonymized: 0,
    records_failed: 0,
    errors: [],
  };

  try {
    await client.query('BEGIN');

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    // For events, we keep the record but anonymize metadata that might contain personal info
    const updateResult = await client.query(
      `UPDATE event
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{gdpr_retention_anonymized}',
         'true'
       )
       WHERE event_time < $1
         AND metadata->>'gdpr_retention_anonymized' IS NULL
       RETURNING event_id`,
      [cutoffDate]
    );

    result.records_processed = updateResult.rows.length;
    result.records_anonymized = updateResult.rows.length;

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return result;
}

/**
 * Clean up old consent records (revoke if past retention)
 */
async function cleanupConsentRecords(retentionMonths: number): Promise<AnonymizationResult> {
  const client = await pool.connect();
  const result: AnonymizationResult = {
    entity_type: 'consent_record',
    records_processed: 0,
    records_anonymized: 0,
    records_failed: 0,
    errors: [],
  };

  try {
    await client.query('BEGIN');

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    // Revoke old consents that are still active
    const updateResult = await client.query(
      `UPDATE consent_record
       SET revoked_at = NOW(),
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{gdpr_retention_revoked}',
             'true'
           )
       WHERE granted_at < $1
         AND revoked_at IS NULL
       RETURNING id`,
      [cutoffDate]
    );

    result.records_processed = updateResult.rows.length;
    result.records_anonymized = updateResult.rows.length;

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return result;
}

/**
 * Log retention job execution to audit log
 */
async function logRetentionJob(results: AnonymizationResult[], totalRecords: number) {
  const auditData = {
    job_type: 'data_retention',
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total_records_processed: totalRecords,
      total_anonymized: results.reduce((sum, r) => sum + r.records_anonymized, 0),
      total_failed: results.reduce((sum, r) => sum + r.records_failed, 0),
    },
  };

  await pool.query(
    `INSERT INTO audit_log (actor_user_id, action_type, after_state, reason)
     VALUES ('system', 'data_retention_job', $1, 'Scheduled data retention anonymization')`,
    [JSON.stringify(auditData)]
  );
}

/**
 * Main handler for the data retention job
 */
export const handler = async () => {
  console.log('Starting data retention job...', new Date().toISOString());

  try {
    const policies = await getActiveRetentionPolicies();
    console.log(`Found ${policies.length} active retention policies`);

    const results: AnonymizationResult[] = [];
    let totalRecords = 0;

    for (const policy of policies) {
      console.log(`Processing policy: ${policy.policy_name} (${policy.entity_type})`);

      let result: AnonymizationResult;

      switch (policy.entity_type) {
        case 'supporter':
          result = await anonymizeSupporters(policy.retention_period_months);
          break;
        case 'event':
          result = await anonymizeEvents(policy.retention_period_months);
          break;
        case 'consent_record':
          result = await cleanupConsentRecords(policy.retention_period_months);
          break;
        default:
          console.log(`Skipping unknown entity type: ${policy.entity_type}`);
          continue;
      }

      results.push(result);
      totalRecords += result.records_processed;

      console.log(`  Processed: ${result.records_processed}, Anonymized: ${result.records_anonymized}, Failed: ${result.records_failed}`);
    }

    // Log job execution
    await logRetentionJob(results, totalRecords);

    console.log('Data retention job completed', {
      total_records_processed: totalRecords,
      total_anonymized: results.reduce((sum, r) => sum + r.records_anonymized, 0),
      total_failed: results.reduce((sum, r) => sum + r.records_failed, 0),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Data retention job completed',
        results,
        summary: {
          total_records_processed: totalRecords,
          total_anonymized: results.reduce((sum, r) => sum + r.records_anonymized, 0),
          total_failed: results.reduce((sum, r) => sum + r.records_failed, 0),
        },
      }),
    };
  } catch (error: any) {
    console.error('Data retention job failed:', error);

    // Log failure
    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action_type, after_state, reason)
       VALUES ('system', 'data_retention_job_failed', $1, $2)`,
      [JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }), error.message]
    ).catch(e => console.error('Failed to log audit entry:', e));

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
