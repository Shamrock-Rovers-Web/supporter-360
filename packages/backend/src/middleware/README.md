# Rate Limiting Middleware

## Overview

This module implements rate limiting for the Supporter 360 API using a token bucket algorithm. It provides middleware functions for Lambda handlers and supports multiple rate limit tiers.

## Features

- **Token Bucket Algorithm**: Allows for bursts while maintaining overall rate limits
- **Multiple Tiers**: Different limits for default, staff, admin, and webhook endpoints
- **PostgreSQL Storage**: Persistent rate limit state across Lambda invocations
- **Automatic Refill**: Tokens refill over time based on configured rate
- **Response Headers**: Includes rate limit information in all API responses

## Installation

The rate limiter is automatically included in the backend bundle. To use it:

1. Run the database migration:
   ```bash
   psql -f src/migrations/004-create-rate-limits-table.sql
   ```

2. Import the middleware in your Lambda handlers:
   ```typescript
   import { withRateLimit } from './middleware/rate-limiter';
   ```

## Usage

### Basic Middleware

```typescript
import { withRateLimit } from './middleware/rate-limiter';

export const handler = withRateLimit(async (event) => {
  // Your handler logic
  return {
    statusCode: 200,
    body: JSON.stringify({ data: 'response' }),
  };
});
```

### With Specific Tier

```typescript
import { withRateLimit, RateLimitTier } from './middleware/rate-limiter';

export const handler = withRateLimit(
  async (event) => {
    // Admin handler logic
  },
  RateLimitTier.ADMIN
);
```

### With Authentication

```typescript
import { withRateLimitAndAuth, RateLimitTier } from './middleware/rate-limiter';
import type { AuthContext } from './middleware/auth';

export const handler = withRateLimitAndAuth(
  async (event, auth: AuthContext) => {
    // Handler with auth context
  },
  (auth) => auth.role === 'admin' ? RateLimitTier.ADMIN : RateLimitTier.STAFF
);
```

## Rate Limit Tiers

| Tier    | Limit        | Window  | Endpoints          |
|---------|--------------|---------|--------------------|
| Default | 100/minute   | 60s     | All endpoints      |
| Staff   | 300/minute   | 60s     | `/api/*`, `/supporters/*` |
| Admin   | 1000/minute  | 60s     | `/admin/*`         |
| Webhook | 10/second    | 1s      | `/webhooks/*`      |

## Client Identification

Rate limits are applied based on:

1. **API Key** (preferred): Extracted from `X-API-Key` header
2. **IP Address**: Fallback for unauthenticated requests

## Response Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1711286400000
```

## Rate Limit Exceeded Response

When the limit is exceeded, returns `429 Too Many Requests`:

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please retry later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "resetAt": "2024-03-24T12:00:00.000Z"
  }
}
```

## Database Schema

The rate limiter uses a PostgreSQL table to store state:

```sql
CREATE TABLE rate_limits (
  identifier VARCHAR(255) PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Maintenance

### Cleanup Old Entries

Periodically clean up old rate limit entries:

```sql
DELETE FROM rate_limits
WHERE updated_at < NOW() - INTERVAL '7 days';
```

This can be automated with a scheduled Lambda function.

## Testing

Run the test suite:

```bash
npm test -- rate-limiter.test.ts
```

## API Documentation

See [`/docs/api-rate-limiting.md`](../../../docs/api-rate-limiting.md) for consumer-facing documentation.

## Architecture

### Token Bucket Algorithm

```
Initial State: 100 tokens
Request 1: 99 tokens remaining
Request 2: 98 tokens remaining
...
Request 100: 0 tokens remaining
Request 101: REJECTED (429)

After 30 seconds: ~50 tokens refilled
After 60 seconds: 100 tokens refilled (full)
```

### State Storage

Rate limit state is stored in PostgreSQL as JSONB:

```json
{
  "tokens": 95,
  "lastRefill": 1711286370000
}
```

## Security Considerations

1. **API Key Tracking**: Always use API keys over IP addresses for rate limiting
2. **Distributed Attacks**: Rate limiting per IP helps prevent distributed attacks
3. **Resource Exhaustion**: Token bucket prevents resource exhaustion from bursts
4. **Privacy**: IP addresses are hashed before storage (optional enhancement)

## Performance

- **Database Queries**: 1 query per request (optimized with indexes)
- **State Size**: ~50 bytes per client
- **Cleanup**: Recommended weekly cleanup of old entries
- **Lambda Cold Starts**: Minimal impact (state persists in database)

## Monitoring

Monitor rate limiting metrics:

```typescript
import { checkRateLimit } from './middleware/rate-limiter';

const result = await checkRateLimit('client-id', config);

// Log metrics
console.log({
  allowed: result.allowed,
  remaining: result.info.remaining,
  limit: result.info.limit,
});
```

## Troubleshooting

### High Database Load

If rate limiting causes high database load:

1. Add connection pooling
2. Use Redis for distributed caching (future enhancement)
3. Increase rate limit windows

### Stale State

If clients report incorrect remaining counts:

1. Check database cleanup is running
2. Verify time synchronization across Lambda functions
3. Check for concurrent request handling issues

## Future Enhancements

- [ ] Redis-based distributed rate limiting
- [ ] Sliding window algorithm
- [ ] Per-endpoint rate limits
- [ ] Rate limit burst allowances
- [ ] GraphQL rate limiting (query complexity)
- [ ] Websocket rate limiting

## Contributing

When modifying the rate limiter:

1. Update tests in `rate-limiter.test.ts`
2. Update this README
3. Update API documentation in `/docs/api-rate-limiting.md`
4. Run all tests before committing

## License

Part of the Supporter 360 project.
