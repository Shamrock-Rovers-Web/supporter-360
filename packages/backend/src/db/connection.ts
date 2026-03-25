/**
 * PostgreSQL Connection Layer for Supporter 360
 *
 * This module manages the connection pool to the RDS PostgreSQL database,
 * optimized for AWS Lambda execution environment. It provides utilities
 * for single queries, client access, and transaction management.
 *
 * @packageDocumentation
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// SSL Configuration
// ============================================================================

/**
 * Gets the RDS CA certificate for SSL verification.
 *
 * This loads the AWS RDS CA bundle to enable proper certificate validation
 * when connecting to RDS PostgreSQL instances.
 *
 * @returns The CA certificate content
 * @throws {Error} If certificate file cannot be read
 */
function getRDSCACertificate(): string {
  try {
    const certPath = join(__dirname, '../../certs/rds-ca-bundle.pem');
    return readFileSync(certPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to load RDS CA certificate from ${join(__dirname, '../../certs/rds-ca-bundle.pem')}: ` +
      (error instanceof Error ? error.message : 'Unknown error')
    );
  }
}

/**
 * Gets SSL configuration for database connections.
 *
 * When DB_SSL is 'true', returns a config with proper certificate verification.
 * This prevents man-in-the-middle attacks by validating the RDS certificate.
 *
 * @returns SSL configuration object or undefined
 */
function getSSLConfig(): { ca: string; rejectUnauthorized: boolean } | undefined {
  if (process.env.DB_SSL !== 'true') {
    return undefined;
  }

  // In production, always verify certificates
  if (process.env.NODE_ENV === 'production') {
    return {
      ca: getRDSCACertificate(),
      rejectUnauthorized: true,
    };
  }

  // For development, allow skipping if explicitly requested
  if (process.env.DB_SSL_SKIP_VERIFY === 'true') {
    console.warn('⚠️  WARNING: SSL certificate verification is DISABLED (DB_SSL_SKIP_VERIFY=true)');
    return { rejectUnauthorized: false, ca: '' };
  }

  // Default: verify certificates
  return {
    ca: getRDSCACertificate(),
    rejectUnauthorized: true,
  };
}

// ============================================================================
// Environment Variable Validation
// ============================================================================

const REQUIRED_DB_VARS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;

/**
 * Validates that all required database environment variables are set.
 * Throws an error if any are missing.
 *
 * @throws {Error} If any required environment variable is missing
 */
function validateEnvironment(): void {
  const missing = REQUIRED_DB_VARS.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}`
    );
  }
}

// ============================================================================
// Connection Pool Configuration
// ============================================================================

/**
 * Serverless v2-optimized pool configuration.
 *
 * RDS Serverless v2 scales ACUs (Aurora Capacity Units), not connections.
 * Each ACU handles fewer connections than provisioned instances.
 * - Max pool size: 2 (reduced from 5) to minimize connection overhead
 * - Connection retry logic handles 1-3 second cold starts during scale-up
 * - Connection warming prevents cold connections in actual requests
 */
interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: { ca: string; rejectUnauthorized: boolean } | { rejectUnauthorized: boolean };
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Gets the pool configuration from environment variables.
 *
 * Optimized for RDS Serverless v2:
 * - Max pool size: 2 (Serverless v2 scales ACUs, fewer connections = less overhead)
 * - Idle timeout: 10s (frees connections faster during scale-down events)
 * - Connection timeout: 10s (accommodates Serverless v2 cold starts)
 *
 * @returns Pool configuration object
 * @throws {Error} If environment variables are invalid
 */
function getPoolConfig(): PoolConfig {
  validateEnvironment();

  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    // Enable SSL with proper certificate verification for RDS
    ssl: getSSLConfig(),
    // Serverless v2-optimized: max 2 connections per invocation
    // Serverless v2 scales ACUs, not connections. Fewer connections = less overhead.
    max: parseInt(process.env.DB_POOL_MAX || '2', 10),
    // Close idle connections after 10 seconds to free connections faster
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '10000', 10),
    // 10 second timeout accommodates Serverless v2 cold starts (1-3 seconds)
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '10000', 10),
  };
}

// ============================================================================
// Connection Retry Logic
// ============================================================================

/**
 * Retry configuration for connection attempts.
 */
interface RetryConfig {
  maxRetries: number;
  delays: number[];
}

/**
 * Default retry configuration for Serverless v2 cold starts.
 *
 * Serverless v2 can take 1-3 seconds to scale up during cold starts.
 * This retry logic handles temporary connection failures during scale-up.
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delays: [100, 500, 2000], // Exponential backoff: 100ms, 500ms, 2s
};

/**
 * Sleep function for retry delays.
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a function with retry logic on connection errors.
 *
 * This is specifically designed to handle Serverless v2 cold starts
 * where the database may take 1-3 seconds to become available.
 *
 * @template T - Return type of the function
 * @param fn - Function to execute (typically pool.connect or pool.query)
 * @param retryConfig - Retry configuration
 * @returns Promise resolving to the function result
 * @throws {Error} If all retry attempts fail
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await fn();

      // Log successful retry (not first attempt)
      if (attempt > 0) {
        console.log(`[Serverless v2] Connection succeeded on attempt ${attempt + 1}/${retryConfig.maxRetries + 1}`);
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is a connection error that warrants retry
      const isConnectionError =
        lastError.message.includes('ECONNREFUSED') ||
        lastError.message.includes('connect') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('Connection terminated');

      if (!isConnectionError || attempt >= retryConfig.maxRetries) {
        throw lastError;
      }

      // Log retry attempt
      const delay = retryConfig.delays[attempt] || retryConfig.delays[retryConfig.delays.length - 1];
      console.warn(
        `[Serverless v2] Connection attempt ${attempt + 1}/${retryConfig.maxRetries + 1} failed: ${lastError.message}. ` +
        `Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError || new Error('Connection failed after all retry attempts');
}

// ============================================================================
// Connection Warming
// ============================================================================

/**
 * Warms up the database connection pool.
 *
 * Creates a single connection to initialize the pool and trigger
 * any Serverless v2 scale-up events before actual requests arrive.
 * This should be called during Lambda initialization (outside the handler).
 *
 * @returns Promise that resolves when the connection is warmed
 */
export async function warmupConnection(): Promise<void> {
  try {
    console.log('[Serverless v2] Warming up database connection...');
    const pool = getPool();

    // Create and release a single connection to trigger scale-up
    await withRetry(async () => {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      // Log pool statistics after warmup
      const totalCount = pool.totalCount;
      const idleCount = pool.idleCount;
      const waitingCount = pool.waitingCount;

      console.log(
        `[Serverless v2] Connection warmed successfully. ` +
        `Pool stats: ${totalCount} total, ${idleCount} idle, ${waitingCount} waiting`
      );

      return true;
    });
  } catch (error) {
    console.error('[Serverless v2] Connection warmup failed:', error);
    // Don't throw - warmup failure shouldn't prevent Lambda startup
    // The retry logic will handle connection failures during actual requests
  }
}

// ============================================================================
// Connection Pool Singleton
// ============================================================================

export let pool: Pool | null = null;

/**
 * Gets or creates the PostgreSQL connection pool.
 *
 * The pool is a singleton to ensure reuse across multiple queries
 * within a single Lambda invocation. Connection pooling is handled
 * automatically by the pg library.
 *
 * Serverless v2 optimizations:
 * - Reduced pool size (2) to minimize connection overhead
 * - Retry logic handles cold starts during scale-up events
 * - Pool statistics logged for monitoring
 *
 * @returns The PostgreSQL connection pool
 * @throws {Error} If environment variables are not configured
 */
export function getPool(): Pool {
  if (!pool) {
    const config = getPoolConfig();
    pool = new Pool(config);

    console.log(
      `[Serverless v2] Connection pool created. ` +
      `Max: ${config.max}, ` +
      `Idle timeout: ${config.idleTimeoutMillis}ms, ` +
      `Connection timeout: ${config.connectionTimeoutMillis}ms`
    );

    // Handle pool errors to prevent crashes
    pool.on('error', (err) => {
      console.error('[Serverless v2] Pool error:', err);
    });

    // Log when new connections are created (useful for monitoring scale-up)
    pool.on('connect', (client) => {
      console.log(`[Serverless v2] New connection established. Total: ${pool.totalCount}`);
    });

    // Log when connections are removed (useful for monitoring scale-down)
    pool.on('remove', () => {
      console.log(`[Serverless v2] Connection removed. Total: ${pool.totalCount}`);
    });
  }

  return pool;
}

/**
 * Alias for getPool() for semantic clarity in some contexts.
 *
 * @returns The PostgreSQL connection pool
 */
export function getConnection(): Pool {
  return getPool();
}

// ============================================================================
// Query Execution
// ============================================================================

/**
 * Executes a single SQL query with optional parameters.
 *
 * This is the primary method for executing queries. It uses parameterized
 * queries to prevent SQL injection attacks. Includes retry logic for
 * Serverless v2 cold starts.
 *
 * @template T - The expected row type
 * @param text - The SQL query string
 * @param params - Query parameters (will be properly escaped)
 * @returns Promise resolving to the query result
 *
 * @example
 * ```ts
 * const result = await query<Supporter>(
 *   'SELECT * FROM supporter WHERE supporter_id = $1',
 *   [supporterId]
 * );
 * ```
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();

  return withRetry(async () => {
    const result = await pool.query<T>(text, params);

    // Log query execution with pool stats (useful for monitoring)
    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;

    console.log(
      `[Serverless v2] Query executed. ` +
      `Pool stats: ${totalCount} total, ${idleCount} idle, ${waitingCount} waiting`
    );

    return result;
  });
}

// ============================================================================
// Client Management
// ============================================================================

/**
 * Gets a dedicated client from the pool.
 *
 * Use this when you need to execute multiple queries in sequence or
 * when you need transaction control. The client MUST be released
 * back to the pool when done. Includes retry logic for Serverless v2.
 *
 * For transactions, prefer using the {@link transaction} helper
 * which handles client lifecycle automatically.
 *
 * @returns Promise resolving to a pool client
 * @see transaction
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();

  return withRetry(async () => {
    const client = await pool.connect();

    // Log client acquisition with pool stats
    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;

    console.log(
      `[Serverless v2] Client acquired. ` +
      `Pool stats: ${totalCount} total, ${idleCount} idle, ${waitingCount} waiting`
    );

    return client;
  });
}

// ============================================================================
// Transaction Management
// ============================================================================

/**
 * Result type for transaction operations.
 */
export interface TransactionResult<T> {
  /** The result returned from the transaction callback */
  data: T;
  /** The client that was used (useful for additional queries) */
  client: PoolClient;
}

/**
 * Executes a callback within a database transaction.
 *
 * The transaction will be committed if the callback succeeds,
 * or rolled back if it throws an error. The client is automatically
 * released back to the pool in either case.
 *
 * @template T - The type of value returned from the callback
 * @param callback - Function to execute within the transaction
 * @returns Promise resolving to the callback's return value
 * @throws {Error} If the callback fails (transaction is rolled back)
 *
 * @example
 * ```ts
 * const result = await transaction(async (client) => {
 *   await client.query('UPDATE supporter SET name = $1 WHERE id = $2', ['New Name', id]);
 *   await client.query('INSERT INTO audit_log (action) VALUES ($1)', ['update']);
 *   return { success: true };
 * });
 * ```
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// Pool Lifecycle
// ============================================================================

/**
 * Closes the connection pool and all its connections.
 *
 * This should be called when shutting down the application or in
 * Lambda freeze context (though Lambda handles this automatically).
 * After calling this, you must call getPool() again to create a new pool.
 *
 * @returns Promise that resolves when the pool is closed
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Health check for the database connection.
 *
 * Executes a simple query to verify the database is accessible.
 *
 * @returns Promise resolving to true if connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health_check');
    return result.rows[0]?.health_check === 1;
  } catch {
    return false;
  }
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Helper type for database row results.
 *
 * Use this when you need to specify the exact shape of rows returned
 * from a query.
 *
 * @template T - The row type
 * @example
 * ```ts
 * interface SupporterRow {
 *   supporter_id: string;
 *   name: string | null;
 *   primary_email: string | null;
 * }
 *
 * const result = await query<SupporterRow>(sql, params);
 * ```
 */
export type DbRow<T = Record<string, unknown>> = T;

/**
 * Helper type for parameter arrays in queries.
 *
 * @example
 * ```ts
 * const params: QueryParams = [supporterId, email, limit];
 * await query(sql, params);
 * ```
 */
export type QueryParams = unknown[];
