/**
 * Test Database Setup
 *
 * Provides database connection utilities for integration and real unit tests.
 * Uses environment variables or defaults to connect to test database.
 *
 * Before running tests:
 * 1. Start PostgreSQL: docker-compose up -d postgres
 * 2. Or ensure TEST_DB_* environment variables are set
 *
 * @packageDocumentation
 */

import { Client, ClientConfig } from 'pg';

/**
 * Test database configuration from environment
 */
interface TestDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Get test database configuration from environment or defaults
 */
export function getTestDbConfig(): TestDbConfig {
  return {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    database: process.env.TEST_DB_NAME || 'supporter360_test',
    user: process.env.TEST_DB_USER || 'supporter',
    password: process.env.TEST_DB_PASSWORD || 'supporter360_dev_password',
  };
}

/**
 * Create a new PostgreSQL client for testing
 */
export function createTestClient(config?: TestDbConfig): Client {
  const dbConfig = config || getTestDbConfig();

  const clientConfig: ClientConfig = {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    // Enable query logging for debugging
    statement_timeout: 30000, // 30 second timeout
    query_timeout: 30000,
  };

  return new Client(clientConfig);
}

/**
 * Connect to test database and optionally initialize schema
 */
export async function connectTestDatabase(initializeSchema = true): Promise<Client> {
  const client = createTestClient();

  try {
    await client.connect();

    if (initializeSchema) {
      await initializeTestSchema(client);
    }

    return client;
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}

/**
 * Initialize test database schema
 * Creates necessary tables, types, and indexes for testing
 */
async function initializeTestSchema(client: Client): Promise<void> {
  const config = getTestDbConfig();

  // Check if database exists, if not create it
  await client.query(`SELECT 1 FROM pg_database WHERE datname = '${config.database}'`);

  if (process.env.SKIP_DB_CREATE !== '1') {
    // Create test database if it doesn't exist
    await client.query(`CREATE DATABASE ${config.database}`)
      .catch((err) => {
        // Ignore error if database already exists
        if (!err.message.includes('already exists')) {
          throw err;
        }
      });

    // Connect to the test database and create schema
    await client.end();

    const testClient = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });

    await testClient.connect();

    // Apply schema from schema.sql file if it exists
    const fs = await import('fs');
    const path = await import('path');

    const schemaPath = path.resolve(process.cwd(), '../../database/schema.sql');

    try {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await testClient.query(schemaSql);
      console.log('Test database schema initialized');
    } catch (err) {
      console.warn('Could not load schema.sql, tables may not exist:', err);
    }

    await testClient.end();

    // Reconnect to the test database
    return createTestClient();
  }

  return client;
}

/**
 * Clean test database by truncating all tables
 * Use this between tests to ensure clean state
 */
export async function cleanTestDatabase(client: Client): Promise<void> {
  const tables = [
    'audit_log',
    'event',
    'email_alias',
    'membership',
    'mailchimp_membership',
    'supporter',
  ];

  for (const table of tables) {
    await client.query(`TRUNCATE TABLE ${table} CASCADE`);
  }

  // Reset sequences
  await client.query(`DO $$
    DECLARE
      seq RECORD pg_sequence;
    BEGIN
      FOR seq IN SELECT sequence_name FROM information_schema.sequences
        WHERE sequence_schema = 'public'
      LOOP
        EXECUTE format('ALTER SEQUENCE %s RESTART WITH 1;', seq.sequence_name);
      END LOOP;
    END $$`);
}

/**
 * Disconnect and release test database connection
 */
export async function disconnectTestDatabase(client: Client): Promise<void> {
  try {
    await client.end();
  } catch (error) {
    // Ignore connection errors during cleanup
    console.warn('Warning during database disconnect:', error);
  }
}

/**
 * Test database helper class with automatic cleanup
 */
export class TestDatabase {
  private client: Client | null = null;
  private connected = false;

  /**
   * Connect to test database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.client = createTestClient();
    await this.client.connect();
    this.connected = true;
  }

  /**
   * Get the underlying pg client
   */
  getClient(): Client {
    if (!this.client || !this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Execute a query with typed results
   */
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = this.getClient();
    const result = await client.query<T>(sql, params);
    return result.rows;
  }

  /**
   * Clean all tables (for test isolation)
   */
  async clean(): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }
    await cleanTestDatabase(this.client);
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await disconnectTestDatabase(this.client);
      this.client = null;
      this.connected = false;
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    await this.query('BEGIN');
  }

  /**
   * Commit current transaction
   */
  async commit(): Promise<void> {
    await this.query('COMMIT');
  }

  /**
   * Rollback current transaction
   */
  async rollback(): Promise<void> {
    await this.query('ROLLBACK');
  }
}

/**
 * Create a test database helper instance
 */
export function createTestDatabase(): TestDatabase {
  return new TestDatabase();
}
