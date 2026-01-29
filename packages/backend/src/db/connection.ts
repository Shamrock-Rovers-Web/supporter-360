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
 * Lambda-optimized pool configuration.
 *
 * Lambda functions should use a smaller pool size since each Lambda
 * invocation gets its own pool (due to freezing/thawing of connections).
 * Max of 5 connections per invocation is sufficient.
 */
interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: { rejectUnauthorized: boolean };
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Gets the pool configuration from environment variables.
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
    // Enable SSL for RDS in production
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    // Lambda-optimized: max 5 connections per invocation
    max: parseInt(process.env.DB_POOL_MAX || '5', 10),
    // Close idle connections after 10 seconds
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '10000', 10),
    // Fail fast if connection can't be established
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '2000', 10),
  };
}

// ============================================================================
// Connection Pool Singleton
// ============================================================================

let pool: Pool | null = null;

/**
 * Gets or creates the PostgreSQL connection pool.
 *
 * The pool is a singleton to ensure reuse across multiple queries
 * within a single Lambda invocation. Connection pooling is handled
 * automatically by the pg library.
 *
 * @returns The PostgreSQL connection pool
 * @throws {Error} If environment variables are not configured
 */
export function getPool(): Pool {
  if (!pool) {
    const config = getPoolConfig();
    pool = new Pool(config);

    // Handle pool errors to prevent crashes
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
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
 * queries to prevent SQL injection attacks.
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
  return pool.query<T>(text, params);
}

// ============================================================================
// Client Management
// ============================================================================

/**
 * Gets a dedicated client from the pool.
 *
 * Use this when you need to execute multiple queries in sequence or
 * when you need transaction control. The client MUST be released
 * back to the pool when done.
 *
 * For transactions, prefer using the {@link transaction} helper
 * which handles client lifecycle automatically.
 *
 * @returns Promise resolving to a pool client
 * @see transaction
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
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
