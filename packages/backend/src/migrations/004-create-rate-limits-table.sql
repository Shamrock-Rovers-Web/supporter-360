-- ============================================================================
-- Rate Limiting Table Migration
-- ============================================================================
-- This migration creates the table needed for the token bucket rate limiting
-- algorithm. The rate limiter tracks request counts per client identifier
-- (API key or IP address) to prevent API abuse.
--
-- @packageDocumentation
-- ============================================================================

-- Create rate_limits table for storing token bucket state
CREATE TABLE IF NOT EXISTS rate_limits (
  -- Unique identifier for the client (apikey:xxx or ip:xxx)
  identifier VARCHAR(255) PRIMARY KEY,

  -- JSONB state containing: { tokens: number, lastRefill: timestamp }
  state JSONB NOT NULL,

  -- Track when this entry was last updated (for cleanup)
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for periodic cleanup of old entries
CREATE INDEX IF NOT EXISTS rate_limits_updated_at_idx
  ON rate_limits(updated_at);

-- Add a comment for documentation
COMMENT ON TABLE rate_limits IS 'Stores rate limit state for API clients using token bucket algorithm';
COMMENT ON COLUMN rate_limits.identifier IS 'Client identifier: apikey:xxx or ip:xxx';
COMMENT ON COLUMN rate_limits.state IS 'Token bucket state: { tokens: number, lastRefill: number }';
COMMENT ON COLUMN rate_limits.updated_at IS 'Last update timestamp for cleanup';

-- ============================================================================
-- Cleanup Job (run via cron or scheduled Lambda)
-- ============================================================================
-- Remove old rate limit entries that haven't been updated in 7 days
-- This prevents the table from growing indefinitely.
--
-- Run this periodically:
-- DELETE FROM rate_limits
-- WHERE updated_at < NOW() - INTERVAL '7 days';
--
-- Or create a scheduled Lambda function to do this automatically.
-- ============================================================================
