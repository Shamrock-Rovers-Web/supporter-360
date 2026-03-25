import { Pool } from 'pg';
import * as aws from 'aws-sdk';

const secretsManager = new aws.SecretsManager({ region: 'eu-west-1' });

async function verifyMigration() {
  console.log('🔍 Verifying database migration...\n');

  // Get database credentials from Secrets Manager
  const secretValue = await secretsManager.getSecretValue({
    SecretId: 'Supporter360StackV2Supporte-z0coczJrAOuK'
  }).promise();

  const credentials = JSON.parse(secretValue.SecretString!);

  const pool = new Pool({
    host: credentials.host,
    port: credentials.port,
    database: credentials.dbname,
    user: credentials.username,
    password: credentials.password,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

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

      console.log('📊 Database Verification Results:');
      console.log('═════════════════════════════════');
      console.log(`Total tables found: ${tables.length}`);
      console.log(`Expected tables: ${expectedTables.length}`);
      console.log(`Missing tables: ${missingTables.length || 'None'}\n`);

      if (missingTables.length > 0) {
        console.log('❌ Missing tables:');
        missingTables.forEach(t => console.log(`   - ${t}`));
      }

      console.log('\n📋 Tables created:');
      for (const table of tables) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   ✓ ${table} (${count} rows)`);
      }

      console.log('\n' + '═'.repeat(50));
      if (missingTables.length === 0) {
        console.log('✅ VERIFICATION PASSED: All tables created successfully');
        console.log('═'.repeat(50));
        process.exit(0);
      } else {
        console.log('❌ VERIFICATION FAILED: Some tables are missing');
        console.log('═'.repeat(50));
        process.exit(1);
      }

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyMigration();
