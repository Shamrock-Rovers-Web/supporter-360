import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { awsLambdaResponse } from '../../utils/api-response';

/**
 * Verification handler to check database tables
 * Used for post-deployment verification
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();

    try {
      // Query to get all tables
      const result = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `);

      const tables = result.rows.map(row => row.tablename);

      // Expected tables from schema.sql
      const expectedTables = [
        'supporter',
        'email_alias',
        'event',
        'mailchimp_membership',
        'future_ticketing_product_mapping',
        'audit_log',
        'membership',
        'config',
        'supporter_mailchimp_aggregates',
        'consent_record',
        'data_retention_policy',
        'data_deletion_request'
      ];

      // Check for missing tables
      const missingTables = expectedTables.filter(t => !tables.includes(t));

      // Get row counts for each table
      const tableCounts: Record<string, number> = {};
      for (const table of tables) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        tableCounts[table] = parseInt(countResult.rows[0].count);
      }

      const verificationResult = {
        success: missingTables.length === 0,
        totalTables: tables.length,
        expectedTables: expectedTables.length,
        actualTables: tables,
        missingTables,
        tableCounts,
        timestamp: new Date().toISOString()
      };

      return awsLambdaResponse(200, verificationResult);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database verification failed:', error);
    return awsLambdaResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  } finally {
    await pool.end();
  }
};
