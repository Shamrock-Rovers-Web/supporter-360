/**
 * Audit Repository
 *
 * Provides methods for logging and querying audit trails,
 * with specialized methods for GDPR compliance tracking.
 *
 * @packageDocumentation
 */

import { pool } from '../connection';

export interface AuditLogEntry {
  audit_id: string;
  actor_user_id: string | null;
  action_type: string;
  timestamp: Date;
  before_state: unknown;
  after_state: unknown;
  reason: string | null;
}

export interface GDPRAuditLog {
  audit_id: string;
  actor_user_id: string;
  action_type: 'gdpr_anonymization' | 'gdpr_data_export' | 'gdpr_consent_change' | 'data_retention_job' | 'data_retention_job_failed';
  timestamp: Date;
  supporter_id?: string;
  details: unknown;
}

export class AuditRepository {
  /**
   * Log a general audit entry
   */
  async log(params: {
    actor_user_id: string | null;
    action_type: string;
    before_state?: unknown;
    after_state?: unknown;
    reason?: string;
  }): Promise<string> {
    const result = await pool.query(
      `INSERT INTO audit_log (actor_user_id, action_type, before_state, after_state, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING audit_id`,
      [params.actor_user_id, params.action_type, JSON.stringify(params.before_state), JSON.stringify(params.after_state), params.reason || null]
    );

    return result.rows[0].audit_id;
  }

  /**
   * Log GDPR data export (data portability)
   */
  async logGDPRDataExport(params: {
    actor_user_id: string;
    supporter_id: string;
    exported_fields: string[];
  }): Promise<string> {
    return this.log({
      actor_user_id: params.actor_user_id,
      action_type: 'gdpr_data_export',
      after_state: {
        supporter_id: params.supporter_id,
        exported_fields: params.exported_fields,
        timestamp: new Date().toISOString(),
      },
      reason: 'GDPR data portability request',
    });
  }

  /**
   * Log GDPR data anonymization (right to be forgotten)
   */
  async logGDPRAnonymization(params: {
    actor_user_id: string;
    supporter_id: string;
    before_state?: unknown;
  }): Promise<string> {
    return this.log({
      actor_user_id: params.actor_user_id,
      action_type: 'gdpr_anonymization',
      before_state: params.before_state,
      after_state: {
        supporter_id: params.supporter_id,
        status: 'anonymized',
        timestamp: new Date().toISOString(),
      },
      reason: 'GDPR right to be forgotten request',
    });
  }

  /**
   * Log GDPR consent change
   */
  async logGDPRConsentChange(params: {
    actor_user_id: string;
    supporter_id: string;
    consent_type: string;
    granted: boolean;
    previous_value?: boolean;
  }): Promise<string> {
    return this.log({
      actor_user_id: params.actor_user_id,
      action_type: 'gdpr_consent_change',
      before_state: params.previous_value !== undefined ? {
        supporter_id: params.supporter_id,
        consent_type: params.consent_type,
        granted: params.previous_value,
      } : undefined,
      after_state: {
        supporter_id: params.supporter_id,
        consent_type: params.consent_type,
        granted: params.granted,
        timestamp: new Date().toISOString(),
      },
      reason: `Consent ${params.granted ? 'granted' : 'revoked'} for ${params.consent_type}`,
    });
  }

  /**
   * Log data retention job execution
   */
  async logDataRetentionJob(params: {
    records_processed: number;
    records_anonymized: number;
    records_failed: number;
    entity_types: string[];
  }): Promise<string> {
    return this.log({
      actor_user_id: 'system',
      action_type: 'data_retention_job',
      after_state: {
        summary: params,
        timestamp: new Date().toISOString(),
      },
      reason: 'Scheduled data retention anonymization',
    });
  }

  /**
   * Log data retention job failure
   */
  async logDataRetentionJobFailure(params: {
    error_message: string;
    entity_types: string[];
  }): Promise<string> {
    return this.log({
      actor_user_id: 'system',
      action_type: 'data_retention_job_failed',
      after_state: {
        error: params.error_message,
        entity_types: params.entity_types,
        timestamp: new Date().toISOString(),
      },
      reason: 'Scheduled data retention job failed',
    });
  }

  /**
   * Query audit logs by action type
   */
  async findByActionType(actionType: string, limit = 100): Promise<AuditLogEntry[]> {
    const result = await pool.query(
      `SELECT audit_id, actor_user_id, action_type, timestamp, before_state, after_state, reason
       FROM audit_log
       WHERE action_type = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [actionType, limit]
    );

    return result.rows;
  }

  /**
   * Query audit logs by actor
   */
  async findByActor(actorUserId: string, limit = 100): Promise<AuditLogEntry[]> {
    const result = await pool.query(
      `SELECT audit_id, actor_user_id, action_type, timestamp, before_state, after_state, reason
       FROM audit_log
       WHERE actor_user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [actorUserId, limit]
    );

    return result.rows;
  }

  /**
   * Query GDPR-related audit logs
   */
  async findGDPRLogs(limit = 100): Promise<AuditLogEntry[]> {
    const result = await pool.query(
      `SELECT audit_id, actor_user_id, action_type, timestamp, before_state, after_state, reason
       FROM audit_log
       WHERE action_type LIKE 'gdpr_%' OR action_type LIKE 'data_retention%'
       ORDER BY timestamp DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Query audit logs for a specific supporter (from before_state/after_state)
   */
  async findBySupporterId(supporterId: string, limit = 100): Promise<AuditLogEntry[]> {
    const result = await pool.query(
      `SELECT audit_id, actor_user_id, action_type, timestamp, before_state, after_state, reason
       FROM audit_log
       WHERE (before_state::text LIKE $1 OR after_state::text LIKE $1)
       ORDER BY timestamp DESC
       LIMIT $2`,
      [`%${supporterId}%`, limit]
    );

    return result.rows;
  }

  /**
   * Get audit log by ID
   */
  async findById(auditId: string): Promise<AuditLogEntry | null> {
    const result = await pool.query(
      `SELECT audit_id, actor_user_id, action_type, timestamp, before_state, after_state, reason
       FROM audit_log
       WHERE audit_id = $1`,
      [auditId]
    );

    return result.rows[0] || null;
  }
}
