# API Rate Limiting

## Overview

The Supporter 360 API implements rate limiting to ensure fair usage and system stability. Rate limits are enforced using a **token bucket algorithm**, which allows for bursts of requests while maintaining an overall rate limit.

## Rate Limit Tiers

Different endpoints have different rate limits based on their purpose and expected usage patterns.

### Default Tier
- **Limit**: 100 requests per minute
- **Endpoints**: All endpoints not covered by other tiers
- **Use Case**: General API usage

### Staff Tier
- **Limit**: 300 requests per minute
- **Endpoints**: `/api/*`, `/supporters/*`
- **Use Case**: Staff dashboard and operations

### Admin Tier
- **Limit**: 1000 requests per minute
- **Endpoints**: `/admin/*`
- **Use Case**: Administrative operations

### Webhook Tier
- **Limit**: 10 requests per second
- **Endpoints**: `/webhooks/*`
- **Use Case**: Webhook processing (high frequency, short window)

## Rate Limit Headers

Every API response includes rate limit information in the response headers:

### Headers

- **`X-RateLimit-Limit`**: The maximum number of requests allowed in the current time window
- **`X-RateLimit-Remaining`**: The number of requests remaining in the current window
- **`X-RateLimit-Reset`**: Unix timestamp (milliseconds) when the window resets

### Example Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1711286400000

{
  "success": true,
  "data": { ... }
}
```

## Rate Limit Exceeded

When you exceed your rate limit, the API returns a `429 Too Many Requests` response:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711286400000

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

## Token Bucket Algorithm

Our rate limiting uses a token bucket algorithm, which provides the following benefits:

1. **Burst Tolerance**: Allows short bursts of requests up to the full limit
2. **Fair Allocation**: Tokens refill over time, ensuring fair usage
3. **Predictable Limits**: Easy to understand when limits will reset

### How It Works

- Each API key or IP address has a bucket of tokens
- Each request consumes 1 token
- Tokens refill over time (linear refill rate)
- Requests are denied when the bucket is empty
- Maximum tokens = rate limit (e.g., 100 for default tier)

### Example

With the default tier (100 requests/minute):
- You can make 100 requests immediately
- After 30 seconds, you'll have ~50 tokens available
- After 60 seconds, you'll have all 100 tokens available again

## Best Practices

### 1. Monitor Rate Limit Headers

Always check the rate limit headers in your API responses:

```javascript
const response = await fetch('https://api.supporter360.com/supporters');
const limit = parseInt(response.headers.get('X-RateLimit-Limit'));
const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
const resetAt = parseInt(response.headers.get('X-RateLimit-Reset'));

console.log(`${remaining} requests remaining out of ${limit}`);
console.log(`Resets at: ${new Date(resetAt).toISOString()}`);
```

### 2. Implement Exponential Backoff

When you receive a 429 response, implement exponential backoff:

```javascript
async function fetchWithBackoff(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const resetAt = parseInt(response.headers.get('X-RateLimit-Reset'));
      const waitTime = Math.max(1000, resetAt - Date.now());

      console.log(`Rate limited. Waiting ${waitTime}ms...`);
      await sleep(waitTime);
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

### 3. Use Request Batching

When possible, batch multiple operations into a single request:

```javascript
// Instead of multiple requests:
for (const id of supporterIds) {
  await fetch(`/supporters/${id}`);
}

// Use a single batch request:
await fetch('/supporters', {
  method: 'POST',
  body: JSON.stringify({ ids: supporterIds })
});
```

### 4. Cache Responses

Cache API responses when appropriate to reduce request count:

```javascript
const cache = new Map();

async function getCachedSupporter(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const response = await fetch(`/supporters/${id}`);
  const data = await response.json();

  cache.set(id, data);
  return data;
}
```

### 5. Respect Rate Limits Across All Endpoints

Rate limits are enforced per API key or IP address across all endpoints. Don't assume that different endpoints have separate limits.

## Client Identification

Rate limits are applied based on:

1. **API Key** (preferred): If you provide an `X-API-Key` header, limits are applied per key
2. **IP Address**: If no API key is provided, limits are applied per IP address

### Using API Keys

```javascript
const response = await fetch('https://api.supporter360.com/supporters', {
  headers: {
    'X-API-Key': 'your-api-key-here'
  }
});
```

## Troubleshooting

### Q: I'm getting rate limited even though I haven't made many requests.

**A**: Rate limits are shared across all applications using the same API key or IP address. Make sure you're not sharing credentials across multiple services.

### Q: Can I increase my rate limit?

**A**: Contact the Supporter 360 team to discuss higher rate limits for your use case.

### Q: Do webhooks count against my rate limit?

**A**: Webhooks have their own rate limit tier (10 requests/second) which is separate from API request limits.

### Q: What happens to my tokens when I'm not making requests?

**A**: Tokens continue to refill up to the maximum limit. If you don't make any requests for a full window (e.g., 1 minute for default tier), your bucket will be full.

## Rate Limit Calculator

Use this calculator to estimate your rate limit needs:

```javascript
function calculateRequestsPerMinute(rateLimitTier) {
  const tiers = {
    default: 100,
    staff: 300,
    admin: 1000,
    webhook: 600, // 10 requests/second * 60 seconds
  };

  return tiers[rateLimitTier] || tiers.default;
}

// Example:
console.log(calculateRequestsPerMinute('default')); // 100
console.log(calculateRequestsPerMinute('staff')); // 300
console.log(calculateRequestsPerMinute('admin')); // 1000
```

## Monitoring and Alerts

We recommend setting up monitoring for your rate limit usage:

```javascript
function checkRateLimitStatus(response) {
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
  const limit = parseInt(response.headers.get('X-RateLimit-Limit'));
  const usagePercent = ((limit - remaining) / limit) * 100;

  if (usagePercent > 80) {
    console.warn(`Rate limit usage high: ${usagePercent.toFixed(1)}%`);
  }

  if (usagePercent > 95) {
    console.error(`Rate limit critical: ${usagePercent.toFixed(1)}%`);
    // Send alert to monitoring service
  }
}
```

## Support

For questions about rate limiting or to request higher limits, contact the Supporter 360 team.

## Version History

- **v1.0** (2024-03-24): Initial implementation with token bucket algorithm
