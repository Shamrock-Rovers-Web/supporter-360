-- Supporter 360 Database Schema
-- Based on PRD v1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Supporter table (core identity)
CREATE TABLE supporter (
    supporter_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    primary_email VARCHAR(255),
    phone VARCHAR(50),
    supporter_type VARCHAR(50), -- Member, Season Ticket Holder, Ticket Buyer, Shop Buyer, Away Supporter, Staff/VIP, Unknown
    supporter_type_source VARCHAR(20) DEFAULT 'auto', -- auto | admin_override
    flags JSONB DEFAULT '{}', -- shared_email, duplicate_candidate, etc.
    linked_ids JSONB DEFAULT '{}', -- {shopify: "...", futureticketing: "...", stripe: "...", gocardless: "..."}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email alias table (supports multiple supporters per email)
CREATE TABLE email_alias (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    supporter_id UUID NOT NULL REFERENCES supporter(supporter_id) ON DELETE CASCADE,
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, supporter_id)
);

-- Event table (unified timeline)
CREATE TABLE event (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supporter_id UUID NOT NULL REFERENCES supporter(supporter_id) ON DELETE CASCADE,
    source_system VARCHAR(50) NOT NULL, -- shopify, stripe, gocardless, futureticketing, mailchimp
    event_type VARCHAR(100) NOT NULL, -- TicketPurchase, StadiumEntry, ShopOrder, MembershipEvent, PaymentEvent, EmailClick
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    external_id VARCHAR(255), -- external system's ID for deduplication
    amount DECIMAL(10, 2),
    currency VARCHAR(3),
    metadata JSONB DEFAULT '{}', -- event-specific data
    raw_payload_ref VARCHAR(500), -- S3 key for raw webhook payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_system, external_id) -- prevent duplicate ingestion
);

-- Mailchimp membership (multi-audience support)
CREATE TABLE mailchimp_membership (
    id SERIAL PRIMARY KEY,
    supporter_id UUID NOT NULL REFERENCES supporter(supporter_id) ON DELETE CASCADE,
    audience_id VARCHAR(100) NOT NULL,
    mailchimp_contact_id VARCHAR(100),
    tags TEXT[] DEFAULT '{}', -- array of tags
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supporter_id, audience_id)
);

-- Future Ticketing product mapping (for Away Supporter detection, Season Tickets, etc.)
CREATE TABLE future_ticketing_product_mapping (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100),
    category_id VARCHAR(100),
    meaning VARCHAR(50) NOT NULL, -- AwaySupporter, SeasonTicket, MatchTicket, etc.
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, category_id)
);

-- Audit log (merge, split, override tracking)
CREATE TABLE audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id VARCHAR(100), -- staff/admin user ID
    action_type VARCHAR(50) NOT NULL, -- merge, split, override_supporter_type, tag_change, etc.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    before_state JSONB,
    after_state JSONB,
    reason TEXT
);

-- Membership table (for tracking membership status)
CREATE TABLE membership (
    id SERIAL PRIMARY KEY,
    supporter_id UUID NOT NULL REFERENCES supporter(supporter_id) ON DELETE CASCADE,
    tier VARCHAR(50), -- Full, OAP, Student, Overseas
    cadence VARCHAR(20), -- Monthly, Annual
    billing_method VARCHAR(50), -- gocardless, stripe
    status VARCHAR(50), -- Active, Past Due, Cancelled, Unknown
    last_payment_date TIMESTAMP WITH TIME ZONE,
    next_expected_payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supporter_id)
);

-- Configuration table (for membership rules, tag rules, etc.)
CREATE TABLE config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_supporter_primary_email ON supporter(primary_email);
CREATE INDEX idx_supporter_name ON supporter(name);
CREATE INDEX idx_supporter_phone ON supporter(phone);
CREATE INDEX idx_supporter_type ON supporter(supporter_type);

CREATE INDEX idx_email_alias_email ON email_alias(email);
CREATE INDEX idx_email_alias_supporter_id ON email_alias(supporter_id);

CREATE INDEX idx_event_supporter_id ON event(supporter_id);
CREATE INDEX idx_event_event_time ON event(event_time DESC);
CREATE INDEX idx_event_event_type ON event(event_type);
CREATE INDEX idx_event_source_system ON event(source_system);
CREATE INDEX idx_event_external_id ON event(source_system, external_id);

CREATE INDEX idx_mailchimp_membership_supporter_id ON mailchimp_membership(supporter_id);
CREATE INDEX idx_mailchimp_membership_audience_id ON mailchimp_membership(audience_id);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);

CREATE INDEX idx_membership_supporter_id ON membership(supporter_id);
CREATE INDEX idx_membership_status ON membership(status);

-- Insert default configuration values
INSERT INTO config (key, value, description) VALUES
('paid_up_grace_days_monthly', '35', 'Grace period in days for monthly membership'),
('annual_validity_days', '365', 'Validity period in days for annual membership'),
('tag_sync_enabled', 'true', 'Enable Mailchimp tag synchronization'),
('reconciliation_lookback_hours', '24', 'Hours to look back during reconciliation');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_supporter_updated_at BEFORE UPDATE ON supporter
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mailchimp_membership_updated_at BEFORE UPDATE ON mailchimp_membership
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_updated_at BEFORE UPDATE ON membership
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
