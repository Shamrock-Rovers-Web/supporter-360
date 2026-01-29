import { Client } from 'pg';
import { query } from '../db/connection';

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Supporter table (core identity)
CREATE TABLE IF NOT EXISTS supporter (
    supporter_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    primary_email VARCHAR(255),
    phone VARCHAR(50),
    supporter_type VARCHAR(50) DEFAULT 'Unknown',
    supporter_type_source VARCHAR(20) DEFAULT 'auto',
    flags JSONB DEFAULT '{}',
    linked_ids JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email alias table
CREATE TABLE IF NOT EXISTS email_alias (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    supporter_id UUID NOT NULL REFERENCES supporter(supporter_id) ON DELETE CASCADE,
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, supporter_id)
);

-- Event table
CREATE TABLE IF NOT EXISTS event (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supporter_id UUID NOT NULL REFERENCES supporter(supporter_id) ON DELETE CASCADE,
    source_system VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    external_id VARCHAR(255),
    amount DECIMAL(10, 2),
    currency VARCHAR(3),
    metadata JSONB DEFAULT '{}',
    raw_payload_ref VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_system, external_id)
);

-- Mailchimp membership
CREATE TABLE IF NOT EXISTS mailchimp_membership (
    id SERIAL PRIMARY KEY,
    supporter_id UUID NOT NULL REFERENCES supporter(supporter_id) ON DELETE CASCADE,
    audience_id VARCHAR(100) NOT NULL,
    mailchimp_contact_id VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supporter_id, audience_id)
);

-- Future Ticketing product mapping
CREATE TABLE IF NOT EXISTS future_ticketing_product_mapping (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100),
    category_id VARCHAR(100),
    meaning VARCHAR(50) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, category_id)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    before_state JSONB,
    after_state JSONB,
    reason TEXT
);

-- Membership table
CREATE TABLE IF NOT EXISTS membership (
    id SERIAL PRIMARY KEY,
    supporter_id UUID NOT NULL REFERENCES supporter(supporter_id) ON DELETE CASCADE,
    tier VARCHAR(50),
    cadence VARCHAR(20),
    billing_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Unknown',
    last_payment_date TIMESTAMP WITH TIME ZONE,
    next_expected_payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supporter_id)
);

-- Config table
CREATE TABLE IF NOT EXISTS config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supporter_primary_email ON supporter(primary_email);
CREATE INDEX IF NOT EXISTS idx_supporter_name ON supporter(name);
CREATE INDEX IF NOT EXISTS idx_supporter_phone ON supporter(phone);
CREATE INDEX IF NOT EXISTS idx_supporter_type ON supporter(supporter_type);
CREATE INDEX IF NOT EXISTS idx_email_alias_email ON email_alias(email);
CREATE INDEX IF NOT EXISTS idx_email_alias_supporter_id ON email_alias(supporter_id);
CREATE INDEX IF NOT EXISTS idx_event_supporter_id ON event(supporter_id);
CREATE INDEX IF NOT EXISTS idx_event_event_time ON event(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_event_event_type ON event(event_type);
CREATE INDEX IF NOT EXISTS idx_event_source_system ON event(source_system);
CREATE INDEX IF NOT EXISTS idx_event_external_id ON event(source_system, external_id);
CREATE INDEX IF NOT EXISTS idx_mailchimp_membership_supporter_id ON mailchimp_membership(supporter_id);
CREATE INDEX IF NOT EXISTS idx_mailchimp_membership_audience_id ON mailchimp_membership(audience_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_membership_supporter_id ON membership(supporter_id);
CREATE INDEX IF NOT EXISTS idx_membership_status ON membership(status);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_supporter_updated_at ON supporter;
CREATE TRIGGER update_supporter_updated_at BEFORE UPDATE ON supporter
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mailchimp_membership_updated_at ON mailchimp_membership;
CREATE TRIGGER update_mailchimp_membership_updated_at BEFORE UPDATE ON mailchimp_membership
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_membership_updated_at ON membership;
CREATE TRIGGER update_membership_updated_at BEFORE UPDATE ON membership
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

const configData = `
INSERT INTO config (key, value, description) VALUES
('paid_up_grace_days_monthly', '35', 'Grace period in days for monthly membership'),
('annual_validity_days', '365', 'Validity period in days for annual membership'),
('tag_sync_enabled', 'true', 'Enable Mailchimp tag synchronization'),
('reconciliation_lookback_hours', '24', 'Hours to look back during reconciliation'),
('api_keys', '{"staff-key-prod-001": {"role": "staff", "name": "Production Staff"}, "admin-key-prod-001": {"role": "admin", "name": "Production Admin"}}', 'API keys for frontend authentication'),
('stripe_api_key', '"sk_live_YOUR_STRIPE_KEY_HERE"', 'Stripe API key'),
('future_ticketing_api_key', '"YOUR_FT_KEY_HERE"', 'Future Ticketing API key'),
('future_ticketing_api_url', '"https://api.futureticketing.com"', 'Future Ticketing API URL'),
('mailchimp_api_key', '"YOUR_MAILCHIMP_KEY-us4"', 'Mailchimp API key'),
('mailchimp_dc', '"us4"', 'Mailchimp data center'),
('mailchimp_audiences', '["434727"]', 'Mailchimp audience IDs'),
('future_ticketing_checkpoint', '{"last_customer_fetch": null, "last_order_fetch": null, "last_entry_fetch": null}', 'FT polling checkpoint')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
`;

export const handler = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Run schema
    await client.query(schema);
    console.log('Schema created successfully');

    // Insert config data
    await client.query(configData);
    console.log('Config data inserted successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Migrations completed' })
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
    };
  } finally {
    await client.end();
  }
};
