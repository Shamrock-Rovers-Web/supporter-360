/**
 * Rate Limiting Middleware for Supporter 360
 *
 * Implements a token bucket rate limiting algorithm to prevent API abuse
 * and ensure fair resource allocation. Uses PostgreSQL for persistent
 * storage of rate limit state across Lambda invocations.
 *
 * @packageDocumentation
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { query } from '../db/connection';
import { errorResponse } from '../utils/api-response';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Rate limit configuration for different API tiers.
 */
export interface RateLimitConfig {
  /** Number of requests allowed in the time window */
  limit: number;
  /** Time window in seconds */
  window: number;
}

/**
 * Rate limit tier definitions.
 */
export enum RateLimitTier {
  /** Default tier: 100 requests per minute */
  DEFAULT = 'default',
  /** Staff tier: 300 requests per minute */
  STAFF = 'staff',
  /** Admin tier: 1000 requests per minute */
  ADMIN = 'admin',
  /** Webhook tier: 10 requests per second */
  WEBHOOK = 'webhook',
}

/**
 * Rate limit configurations by tier.
 */
export const RATE_LIMITS: Record<RateLimitTier, RateLimitConfig> = {
  [RateLimitTier.DEFAULT]: { limit: 100, window: 60 }, // 100 requests/minute
  [RateLimitTier.STAFF]: { limit: 300, window: 60 }, // 300 requests/minute
  [RateLimitTier.ADMIN]: { limit: 1000, window: 60 }, // 1000 requests/minute
  [RateLimitTier.WEBHOOK]: { limit: 10, window: 1 }, // 10 requests/second
};

// ============================================================================
// Rate Limit State
// ============================================================================

/**
 * Current rate limit state for a client.
 */
export interface RateLimitState {
  /** Number of tokens available */
  tokens: number;
  /** Timestamp of last refill in milliseconds */
  lastRefill: number;
}

/**
 * Rate limit information for response headers.
 */
export interface RateLimitInfo {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when the window resets */
  resetAt: number;
}

// ============================================================================
// Token Bucket Algorithm
// ============================================================================

/**
 * Calculates the number of tokens to add based on elapsed time.
 *
 * Uses the token bucket algorithm where tokens are added over time
 * up to the maximum limit. This allows for bursts while maintaining
 * the overall rate limit.
 *
 * @param state - Current rate limit state
 * @param config - Rate limit configuration
 * @returns Updated rate limit state
 */
function refillTokens(state: RateLimitState, config: RateLimitConfig): RateLimitState {
  const now = Date.now();
  const elapsedMs = now - state.lastRefill;
  const elapsedSeconds = elapsedMs / 1000;

  // Calculate tokens to add based on elapsed time
  // Tokens refill linearly: limit tokens per window seconds
  const tokensToAdd = (elapsedSeconds / config.window) * config.limit;

  // Refill tokens up to the limit
  const newTokens = Math.min(config.limit, state.tokens + tokensToAdd);

  return {
    tokens: newTokens,
    lastRefill: now,
  };
}

/**
 * Checks if a request should be rate limited.
 *
 * Implements the token bucket algorithm:
 * - Each client has a bucket of tokens
 * - Each request consumes 1 token
 * - Tokens refill over time
 * - Request denied if bucket is empty
 *
 * @param identifier - Unique identifier for the client (API key, IP, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result with state and headers
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  info: RateLimitInfo;
}> {
  const now = Date.now();

  // Try to get existing rate limit state
  const result = await query(
    `SELECT state FROM rate_limits WHERE identifier = $1`,
    [identifier]
  );

  let state: RateLimitState;

  if (result.rows.length === 0) {
    // First request - initialize with full bucket
    state = {
      tokens: config.limit - 1, // Consume 1 token for this request
      lastRefill: now,
    };

    // Insert new rate limit entry
    await query(
      `INSERT INTO rate_limits (identifier, state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (identifier) DO UPDATE
       SET state = $2, updated_at = NOW()`,
      [identifier, JSON.stringify(state)]
    );
  } else {
    // Refill tokens based on elapsed time
    const existingState = JSON.parse(result.rows[0].state) as RateLimitState;
    state = refillTokens(existingState, config);

    // Check if request is allowed
    if (state.tokens >= 1) {
      state.tokens -= 1; // Consume 1 token
    }

    // Update rate limit state
    await query(
      `UPDATE rate_limits
       SET state = $1, updated_at = NOW()
       WHERE identifier = $2`,
      [JSON.stringify(state), identifier]
    );
  }

  // Calculate when the window will be fully reset
  const secondsUntilFull = ((config.limit - state.tokens) / config.limit) * config.window;
  const resetAt = Math.ceil(now + secondsUntilFull * 1000);

  return {
    allowed: state.tokens >= 0,
    info: {
      limit: config.limit,
      remaining: Math.max(0, Math.floor(state.tokens)),
      resetAt,
    },
  };
}

// ============================================================================
// Middleware Integration
// ============================================================================

/**
 * Extracts client identifier from the request.
 *
 * Priority order:
 * 1. X-API-Key header (authenticated requests)
 * 2. IP address from request context
 *
 * @param event - API Gateway event
 * @returns Client identifier string
 */
function extractIdentifier(event: APIGatewayProxyEvent): string {
  // Prefer API key for authenticated requests
  const apiKey = event.headers['X-API-Key'] || event.headers['x-api-key'];
  if (apiKey) {
    return `apikey:${apiKey}`;
  }

  // Fall back to IP address
  const ip = event.requestContext.identity.sourceIp;
  return `ip:${ip}`;
}

/**
 * Determines the rate limit tier based on the request path and method.
 *
 * @param event - API Gateway event
 * @returns Rate limit tier
 */
function determineRateLimitTier(event: APIGatewayProxyEvent): RateLimitTier {
  const path = event.path;
  const method = event.httpMethod;

  // Webhooks get higher frequency limits but per-second window
  if (path.startsWith('/webhooks/')) {
    return RateLimitTier.WEBHOOK;
  }

  // Admin endpoints get highest limits
  if (path.startsWith('/admin/')) {
    return RateLimitTier.ADMIN;
  }

  // Staff API endpoints
  if (path.startsWith('/api/') || path.startsWith('/supporters')) {
    return RateLimitTier.STAFF;
  }

  // Default rate limit
  return RateLimitTier.DEFAULT;
}

/**
 * Rate limiting middleware for Lambda handlers.
 *
 * Checks rate limits and adds rate limit headers to responses.
 * Returns 429 Too Many Requests if limit is exceeded.
 *
 * @param handler - The Lambda handler to wrap
 * @param tier - Rate limit tier to apply
 * @returns Wrapped Lambda handler with rate limiting
 */
export function withRateLimit<T extends APIGatewayProxyEvent>(
  handler: (event: T) => Promise<any>,
  tier?: RateLimitTier
) {
  return async (event: T): Promise<any> => {
    // Determine rate limit tier
    const limitTier = tier || determineRateLimitTier(event);
    const config = RATE_LIMITS[limitTier];

    // Extract client identifier
    const identifier = extractIdentifier(event);

    // Check rate limit
    const result = await checkRateLimit(identifier, config);

    // Add rate limit headers to the response
    const addRateLimitHeaders = (response: any) => ({
      ...response,
      headers: {
        ...response.headers,
        'X-RateLimit-Limit': result.info.limit.toString(),
        'X-RateLimit-Remaining': result.info.remaining.toString(),
        'X-RateLimit-Reset': result.info.resetAt.toString(),
      },
    });

    // Return 429 if rate limit exceeded
    if (!result.allowed) {
      return addRateLimitHeaders(
        errorResponse(
          'Rate limit exceeded. Please retry later.',
          429,
          'RATE_LIMIT_EXCEEDED',
          {
            limit: result.info.limit,
            resetAt: new Date(result.info.resetAt).toISOString(),
          }
        )
      );
    }

    // Execute handler and add rate limit headers
    try {
      const response = await handler(event);
      return addRateLimitHeaders(response);
    } catch (error) {
      // Still add rate limit headers on errors
      const errorResponse = {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
        headers: {},
      };
      return addRateLimitHeaders(errorResponse);
    }
  };
}

/**
 * Rate limiting middleware for Lambda handlers with auth context.
 *
 * Similar to withRateLimit but supports handlers that receive auth context.
 *
 * @param handler - The Lambda handler with auth context
 * @param getTier - Function to determine tier from auth context
 * @returns Wrapped Lambda handler with rate limiting
 */
export function withRateLimitAndAuth<T extends APIGatewayProxyEvent, A>(
  handler: (event: T, auth: A) => Promise<any>,
  getTier?: (auth: A) => RateLimitTier
) {
  return async (event: T, auth: A): Promise<any> => {
    // Determine rate limit tier from auth context
    const limitTier = getTier ? getTier(auth) : RateLimitTier.DEFAULT;
    const config = RATE_LIMITS[limitTier];

    // Extract client identifier (prefer API key)
    const identifier = extractIdentifier(event);

    // Check rate limit
    const result = await checkRateLimit(identifier, config);

    // Add rate limit headers to the response
    const addRateLimitHeaders = (response: any) => ({
      ...response,
      headers: {
        ...response.headers,
        'X-RateLimit-Limit': result.info.limit.toString(),
        'X-RateLimit-Remaining': result.info.remaining.toString(),
        'X-RateLimit-Reset': result.info.resetAt.toString(),
      },
    });

    // Return 429 if rate limit exceeded
    if (!result.allowed) {
      return addRateLimitHeaders(
        errorResponse(
          'Rate limit exceeded. Please retry later.',
          429,
          'RATE_LIMIT_EXCEEDED',
          {
            limit: result.info.limit,
            resetAt: new Date(result.info.resetAt).toISOString(),
          }
        )
      );
    }

    // Execute handler and add rate limit headers
    try {
      const response = await handler(event, auth);
      return addRateLimitHeaders(response);
    } catch (error) {
      // Still add rate limit headers on errors
      const errorResponse = {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
        headers: {},
      };
      return addRateLimitHeaders(errorResponse);
    }
  };
}

// ============================================================================
// Database Migration
// ============================================================================

/**
 * SQL migration to create the rate_limits table.
 *
 * Run this migration to enable rate limiting:
 * ```sql
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   identifier VARCHAR(255) PRIMARY KEY,
 *   state JSONB NOT NULL,
 *   updated_at TIMESTAMP NOT NULL DEFAULT NOW()
 * );
 *
 * CREATE INDEX IF NOT EXISTS rate_limits_updated_at_idx
 *   ON rate_limits(updated_at);
 *
 * -- Clean up old entries (run periodically)
 * DELETE FROM rate_limits
 * WHERE updated_at < NOW() - INTERVAL '7 days';
 * ```
 */
export const CREATE_RATE_LIMITS_TABLE = `
CREATE TABLE IF NOT EXISTS rate_limits (
  identifier VARCHAR(255) PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limits_updated_at_idx
  ON rate_limits(updated_at);
`;

/**
 * Initializes the rate limiting database table.
 *
 * Call this during application startup or migrations.
 */
export async function initializeRateLimiting(): Promise<void> {
  await query(CREATE_RATE_LIMITS_TABLE, []);
}
