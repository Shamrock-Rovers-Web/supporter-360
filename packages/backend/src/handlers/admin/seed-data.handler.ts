import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { awsLambdaResponse } from '../../utils/api-response';

/**
 * Seed handler to add test data to the database
 * Used for development/testing
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
      // Insert test supporters
      const testSupporters = [
        {
          name: 'John Gleeson',
          primary_email: 'john.gleeson@example.com',
          phone: '+353 86 123 4567',
          supporter_type: 'Member',
          linked_ids: { shopify: '12345', futureticketing: 'ft-001' }
        },
        {
          name: 'Mary Gleeson',
          primary_email: 'mary.gleeson@example.com',
          phone: '+353 86 234 5678',
          supporter_type: 'Season Ticket Holder',
          linked_ids: { stripe: 'cus_abc123' }
        },
        {
          name: 'Patrick Murphy',
          primary_email: 'patrick.murphy@example.com',
          phone: '+353 87 345 6789',
          supporter_type: 'Ticket Buyer',
          linked_ids: {}
        },
        {
          name: 'Sarah O\'Brien',
          primary_email: 'sarah.obrien@example.com',
          phone: '+353 88 456 7890',
          supporter_type: 'Member',
          linked_ids: { gocardless: 'gc-xyz789' }
        }
      ];

      const insertedIds: string[] = [];

      for (const supporter of testSupporters) {
        const result = await client.query(`
          INSERT INTO supporter (name, primary_email, phone, supporter_type, linked_ids, supporter_type_source)
          VALUES ($1, $2, $3, $4, $5, 'admin_override')
          ON CONFLICT DO NOTHING
          RETURNING supporter_id
        `, [
          supporter.name,
          supporter.primary_email,
          supporter.phone,
          supporter.supporter_type,
          JSON.stringify(supporter.linked_ids)
        ]);

        if (result.rows.length > 0) {
          insertedIds.push(result.rows[0].supporter_id);
        }
      }

      // Insert a membership for John Gleeson
      if (insertedIds.length > 0) {
        await client.query(`
          INSERT INTO membership (supporter_id, tier, cadence, billing_method, status, last_payment_date)
          SELECT supporter_id, 'Full', 'Monthly', 'gocardless', 'Active', NOW() - INTERVAL '15 days'
          FROM supporter WHERE name = 'John Gleeson'
          ON CONFLICT (supporter_id) DO NOTHING
        `);
      }

      return awsLambdaResponse(200, {
        success: true,
        message: `Seeded ${insertedIds.length} test supporters`,
        insertedIds,
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Seed data failed:', error);
    return awsLambdaResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  } finally {
    await pool.end();
  }
};
