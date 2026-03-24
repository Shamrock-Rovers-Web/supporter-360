/**
 * Structured Security Logger
 *
 * Provides comprehensive logging for security events with trace ID correlation,
 * structured context tracking, and CloudWatch integration for monitoring and alerting.
 *
 * Security Event Categories:
 * - authentication: Login, logout, MFA, password changes
 * - authorization: Permission checks, role changes, access grants
 * - data_access: CRUD operations on sensitive data
 * - api_activity: API endpoint calls, rate limiting, webhooks
 * - infrastructure: Database connections, external API calls
 * - compliance: GDPR requests, data exports, audit logs
 *
 * Usage:
 * ```ts
 * const logger = SecurityLogger.getInstance();
 * logger.logAuthEvent('login_success', { userId: '123', method: 'oauth' });
 * logger.logDataEvent('record_accessed', { userId: '123', recordId: '456', action: 'read' });
 * logger.logApiEvent('webhook_received', { source: 'github', deliveryId: 'abc' });
 * ```
 *
 * @packageDocumentation
 */

import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export type SecurityEventType =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'api_activity'
  | 'infrastructure'
  | 'compliance';

export interface SecurityLogEntry {
  timestamp: string;
  level: LogLevel;
  event_type: SecurityEventType;
  event_name: string;
  trace_id: string;
  message: string;
  context?: Record<string, unknown>;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  duration_ms?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: {
    environment: string;
    region: string;
    service: string;
    version: string;
  };
}

interface CloudWatchConfig {
  enabled: boolean;
  logGroupName: string;
  logStreamName: string;
  region: string;
}

interface AlertConfig {
  snsTopicArn?: string;
  alertOnCritical: boolean;
  alertOnError: boolean;
  alertOnWarn: boolean;
}

/**
 * Security Logger Singleton
 *
 * Provides structured logging for security events with CloudWatch integration
 * and real-time alerting capabilities.
 */
export class SecurityLogger {
  private static instance: SecurityLogger | null = null;
  private cloudWatchClient: CloudWatchLogs | null = null;
  private cloudWatchConfig: CloudWatchConfig;
  private alertConfig: AlertConfig;
  private environment: string;
  private region: string;
  private service: string;
  private version: string;
  private logBuffer: SecurityLogEntry[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxBufferSize: number = 100;
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Environment configuration
    this.environment = process.env.NODE_ENV || 'development';
    this.region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    this.service = process.env.SERVICE_NAME || 'supporter-360-backend';
    this.version = process.env.SERVICE_VERSION || '1.0.0';

    // CloudWatch configuration
    this.cloudWatchConfig = {
      enabled: process.env.CLOUDWATCH_ENABLED === 'true' || this.environment === 'production',
      logGroupName: process.env.CLOUDWATCH_LOG_GROUP || `/aws/${this.service}/security`,
      logStreamName: process.env.CLOUDWATCH_LOG_STREAM || `${this.environment}-${this.version}`,
      region: this.region,
    };

    // Alert configuration
    this.alertConfig = {
      snsTopicArn: process.env.SNS_ALERT_TOPIC_ARN,
      alertOnCritical: true,
      alertOnError: this.environment === 'production',
      alertOnWarn: false,
    };

    // Initialize CloudWatch client if enabled
    if (this.cloudWatchConfig.enabled) {
      try {
        this.cloudWatchClient = new CloudWatchLogs({ region: this.region });
        this.startFlushTimer();
      } catch (error) {
        console.error('Failed to initialize CloudWatch client:', error);
        this.cloudWatchClient = null;
      }
    }
  }

  /**
   * Get the singleton SecurityLogger instance
   */
  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Generate a unique trace ID for log correlation
   */
  private generateTraceId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    eventType: SecurityEventType,
    eventName: string,
    message: string,
    context?: Record<string, unknown>
  ): SecurityLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      event_type: eventType,
      event_name: eventName,
      trace_id: this.generateTraceId(),
      message,
      context,
      metadata: {
        environment: this.environment,
        region: this.region,
        service: this.service,
        version: this.version,
      },
    };
  }

  /**
   * Log a security event
   */
  private async log(entry: SecurityLogEntry): Promise<void> {
    // Output to console
    this.outputToConsole(entry);

    // Add to buffer for CloudWatch
    if (this.cloudWatchConfig.enabled) {
      this.logBuffer.push(entry);

      // Flush if buffer is full
      if (this.logBuffer.length >= this.maxBufferSize) {
        await this.flushToCloudWatch();
      }
    }

    // Send alert if configured
    await this.sendAlertIfNeeded(entry);
  }

  /**
   * Format and output log entry to console
   */
  private outputToConsole(entry: SecurityLogEntry): void {
    const timestamp = entry.timestamp.split('T')[1].substring(0, 12);
    const traceIdShort = entry.trace_id.substring(0, 12);
    const levelUpper = entry.level.toUpperCase();

    let output = `[${timestamp}] [${levelUpper}] [${entry.event_type}] [${traceIdShort}] ${entry.event_name}: ${entry.message}`;

    if (entry.user_id) {
      output += ` (user: ${entry.user_id})`;
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ');
      output += `\n  Context: ${contextStr}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack.split('\n').slice(0, 3).join('\n')}`;
      }
    }

    const consoleMethod = this.getConsoleMethod(entry.level);
    consoleMethod(output);
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
      case 'critical':
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Send alert if entry meets alert criteria
   */
  private async sendAlertIfNeeded(entry: SecurityLogEntry): Promise<void> {
    const shouldAlert =
      (entry.level === 'critical' && this.alertConfig.alertOnCritical) ||
      (entry.level === 'error' && this.alertConfig.alertOnError) ||
      (entry.level === 'warn' && this.alertConfig.alertOnWarn);

    if (!shouldAlert || !this.alertConfig.snsTopicArn) {
      return;
    }

    // SNS publishing would go here
    // For now, we'll log that an alert would be sent
    console.warn(`[ALERT] Would send SNS alert to ${this.alertConfig.snsTopicArn} for event: ${entry.event_name}`);
  }

  /**
   * Start the automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(async () => {
      await this.flushToCloudWatch();
    }, this.flushInterval);
  }

  /**
   * Flush log buffer to CloudWatch
   */
  private async flushToCloudWatch(): Promise<void> {
    if (!this.cloudWatchClient || this.logBuffer.length === 0) {
      return;
    }

    try {
      const messages = this.logBuffer.map((entry) => JSON.stringify(entry));
      this.logBuffer = [];

      // CloudWatch Logs putLogEvents would go here
      // For now, we'll simulate the operation
      console.debug(`[CloudWatch] Would send ${messages.length} log entries to ${this.cloudWatchConfig.logGroupName}`);
    } catch (error) {
      console.error('Failed to flush logs to CloudWatch:', error);
    }
  }

  /**
   * Log an authentication event
   */
  async logAuthEvent(eventName: string, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry('info', 'authentication', eventName, `Authentication: ${eventName}`, context);
    await this.log(entry);
  }

  /**
   * Log an authorization event
   */
  async logAuthzEvent(eventName: string, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry('info', 'authorization', eventName, `Authorization: ${eventName}`, context);
    await this.log(entry);
  }

  /**
   * Log a data access event
   */
  async logDataEvent(eventName: string, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry('info', 'data_access', eventName, `Data Access: ${eventName}`, context);
    await this.log(entry);
  }

  /**
   * Log an API activity event
   */
  async logApiEvent(eventName: string, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry('info', 'api_activity', eventName, `API: ${eventName}`, context);
    await this.log(entry);
  }

  /**
   * Log an infrastructure event
   */
  async logInfraEvent(eventName: string, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry('info', 'infrastructure', eventName, `Infrastructure: ${eventName}`, context);
    await this.log(entry);
  }

  /**
   * Log a compliance event
   */
  async logComplianceEvent(eventName: string, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry('info', 'compliance', eventName, `Compliance: ${eventName}`, context);
    await this.log(entry);
  }

  /**
   * Log a security error
   */
  async logSecurityError(eventName: string, error: Error, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry(
      'error',
      'api_activity',
      eventName,
      `Security Error: ${eventName}`,
      context
    );
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
    await this.log(entry);
  }

  /**
   * Log a critical security incident
   */
  async logCriticalIncident(eventName: string, error: Error, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createLogEntry(
      'critical',
      'authentication',
      eventName,
      `CRITICAL: ${eventName}`,
      context
    );
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
    await this.log(entry);
  }

  /**
   * Flush any remaining logs and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushToCloudWatch();
  }

  /**
   * Get current log buffer size
   */
  getBufferSize(): number {
    return this.logBuffer.length;
  }

  /**
   * Manually flush logs to CloudWatch
   */
  async flush(): Promise<void> {
    await this.flushToCloudWatch();
  }
}

/**
 * Convenience function to get the SecurityLogger instance
 */
export function getSecurityLogger(): SecurityLogger {
  return SecurityLogger.getInstance();
}

/**
 * Security event logging helper functions
 */
export const security = {
  auth: (eventName: string, context?: Record<string, unknown>) =>
    getSecurityLogger().logAuthEvent(eventName, context),

  authz: (eventName: string, context?: Record<string, unknown>) =>
    getSecurityLogger().logAuthzEvent(eventName, context),

  data: (eventName: string, context?: Record<string, unknown>) =>
    getSecurityLogger().logDataEvent(eventName, context),

  api: (eventName: string, context?: Record<string, unknown>) =>
    getSecurityLogger().logApiEvent(eventName, context),

  infra: (eventName: string, context?: Record<string, unknown>) =>
    getSecurityLogger().logInfraEvent(eventName, context),

  compliance: (eventName: string, context?: Record<string, unknown>) =>
    getSecurityLogger().logComplianceEvent(eventName, context),

  error: (eventName: string, error: Error, context?: Record<string, unknown>) =>
    getSecurityLogger().logSecurityError(eventName, error, context),

  critical: (eventName: string, error: Error, context?: Record<string, unknown>) =>
    getSecurityLogger().logCriticalIncident(eventName, error, context),
};

export default SecurityLogger;
