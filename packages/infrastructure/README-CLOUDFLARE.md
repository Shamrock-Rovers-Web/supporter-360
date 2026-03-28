# CloudFlare + S3 + React Router SPA Setup

This document explains how Supporter 360's React SPA is served via S3 and CloudFlare, with special attention to SPA routing requirements.

## Architecture Overview

```
User → CloudFlare (360.shamrockrovers.ie)
       ↓
     S3 REST API (bucket: 360.shamrockrovers.ie)
       ↓
  React SPA (React Router handles client-side routing)
```

**Key Design Decision:** S3 REST API endpoint (not static website hosting) with CloudFlare proxy.

---

## 1. S3 Bucket Configuration

### Bucket Details

- **Bucket Name:** `360.shamrockrovers.ie` (matches custom domain for virtual-hosted-style requests)
- **Region:** `eu-west-1`
- **Endpoint Type:** REST API endpoint (NOT static website hosting)
- **Public Access:** Blocked (only CloudFlare IPs allowed via bucket policy)

### Why REST API Instead of Static Website Hosting?

**Static Website Hosting** issues:
- ❌ HTTP-only (can't use HTTPS with custom domain)
- ❌ Returns XML error pages for missing objects
- ❌ No access control per IP

**REST API Endpoint** benefits:
- ✅ HTTPS support via CloudFlare proxy
- ✅ IP-based access control (CloudFlare IPs only)
- ✅ CloudFlare Workers can intercept 404s for SPA routing
- ✅ Better caching control via CloudFlare

### Bucket Policy (CloudFlare IP Whitelist)

Located in `packages/infrastructure/lib/supporter360-stack.ts`:

```typescript
frontendBucket.addToResourcePolicy(new iam.PolicyStatement({
  sid: 'AllowCloudFlareHTTPSRead',
  effect: iam.Effect.ALLOW,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:GetObject'],
  resources: [frontendBucket.arnForObjects('*')],
  conditions: {
    IpAddress: {
      'aws:SourceIp': [
        // CloudFlare IPv4 ranges
        '173.245.48.0/20',
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '141.101.64.0/18',
        '108.162.192.0/18',
        '190.93.240.0/20',
        '188.114.96.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17',
        '162.158.0.0/15',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '172.64.0.0/13',
        '131.0.72.0/22',
      ],
    },
  },
}));
```

**⚠️ IMPORTANT:** Keep CloudFlare IP ranges updated! They change occasionally. Check: https://www.cloudflare.com/ips-v4

---

## 2. CloudFlare DNS Configuration

### Required DNS Records

Configure these in CloudFlare Dashboard → DNS → Records:

| Type | Name | Target | Proxy Status | TTL |
|------|------|--------|--------------|-----|
| **CNAME** | `360` | `360.shamrockrovers.ie.s3-website-eu-west-1.amazonaws.com` | ✅ Proxied (Orange cloud) | Auto |

**Note:** The S3 static website endpoint is used in the CNAME target, but the actual traffic flows through CloudFlare's proxy to the S3 REST API endpoint via the bucket name.

### SSL/TLS Configuration

- **Mode:** Full (or Full Strict if S3 certificate is validated)
- **Always Use HTTPS:** ON
- **Automatic HTTPS Rewrites:** ON

---

## 3. SPA Routing with CloudFlare Workers

### The Problem

React Router uses client-side routing (e.g., `/profile/abc123`). When users:
1. Navigate directly to `https://360.shamrockrovers.ie/profile/abc123`
2. Refresh the page on a non-root route
3. Click a deep link from external sites

**S3 returns 403 AccessDenied** because `/profile/abc123` doesn't exist as an object.

### Solution: CloudFlare Workers Rewrite

Create a CloudFlare Worker to intercept 404/403 errors and serve `index.html`:

```javascript
// CloudFlare Worker Script
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Allow existing assets to pass through
  if (url.pathname.startsWith('/assets/') ||
      url.pathname === '/index.html' ||
      url.pathname === '/favicon.ico' ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return fetch(request)
  }

  // For all other paths, serve index.html (SPA routing)
  url.pathname = '/index.html'

  // Create new request with modified URL
  const indexRequest = new Request(url, {
    method: request.method,
    headers: request.headers,
    redirect: 'manual'
  })

  return fetch(indexRequest)
}
```

### Deploying the Worker

1. Go to CloudFlare Dashboard → Workers & Pages
2. Create new Service → Name: `supporter360-spa-router`
3. Paste the worker script above
4. Deploy worker
5. Go to Workers Routes → Add route
   - **Route:** `360.shamrockrovers.ie/*`
   - **Service:** `supporter360-spa-router`

---

## 4. Cache Settings

### CloudFlare Cache Rules

Configure these cache rules for optimal performance:

#### Rule 1: HTML Files (No Cache)
- **URL Pattern:** `*.html`
- **Cache Level:** Bypass
- **Reason:** Ensure users always get latest `index.html`

#### Rule 2: Static Assets (Aggressive Cache)
- **URL Pattern:** `/assets/*`
- **Cache Level:** Cache Everything
- **Edge Cache TTL:** 1 month
- **Browser Cache TTL:** 1 year
- **Reason:** Build hashes in filenames (e.g., `index-BcfP1w4m.js`) guarantee cache busting

#### Rule 3: Images/Fonts (Standard Cache)
- **URL Pattern:** `*.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$`
- **Cache Level:** Standard
- **Edge Cache TTL:** 1 month
- **Browser Cache TTL:** 1 year

### S3 Object Metadata

When deploying frontend files to S3, ensure proper metadata:

```bash
# Example deployment script
aws s3 sync dist/ s3://360.shamrockrovers.ie \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --include "*"

# HTML files get shorter cache
aws s3 sync dist/ s3://360.shamrockrovers.ie \
  --cache-control "public, max-age=0, must-revalidate" \
  --exclude "*" \
  --include "*.html"
```

---

## 5. React Router Configuration

### Build Configuration (Vite)

The `vite.config.ts` is intentionally minimal:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**Note:** No `base` path needed since the app is served from root domain.

### BrowserRouter Setup

Ensure React Router is using `BrowserRouter` (not `HashRouter`):

```tsx
// src/main.tsx
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

**HashRouter** would work without CloudFlare Workers but creates ugly URLs (`/#/profile/abc123`).

---

## 6. Troubleshooting

### Issue 1: AccessDenied / 403 Errors

**Symptoms:**
- Browser shows `403 Forbidden` or `AccessDenied`
- S3 logs show 403 status

**Causes:**
1. CloudFlare IP ranges outdated in bucket policy
2. Request hitting S3 directly (bypassing CloudFlare)
3. Bucket policy misconfigured

**Solutions:**
1. Update CloudFlare IP ranges: https://www.cloudflare.com/ips-v4
2. Verify bucket policy in AWS Console → S3 → Permissions → Bucket Policy
3. Check CloudFlare SSL/TLS mode (try "Full" if "Full Strict" fails)

### Issue 2: Deep Links Return 404

**Symptoms:**
- Root path works: `https://360.shamrockrovers.ie/`
- Deep links fail: `https://360.shamrockrovers.ie/profile/abc123`
- Refresh on non-root route shows 404

**Causes:**
1. CloudFlare Worker not deployed or route not configured
2. Worker script has syntax errors
3. Worker route pattern doesn't match requests

**Solutions:**
1. Verify Worker is deployed in CloudFlare Dashboard → Workers
2. Check Worker logs for errors
3. Verify route pattern: `360.shamrockrovers.ie/*` (with wildcard)
4. Test worker in Quick Edit mode with preview URL

### Issue 3: Assets Not Loading

**Symptoms:**
- Page loads but CSS/JS files return 403
- Browser console shows mixed content errors

**Causes:**
1. CloudFlare cache rules blocking assets
2. Worker script redirecting asset requests to `index.html`
3. HTTPS/HTTP mixed content

**Solutions:**
1. Review Worker script - ensure asset paths are excluded
2. Check CloudFlare cache rules
3. Verify all URLs use HTTPS (no `http:` in asset links)
4. Clear CloudFlare cache: Caching → Configuration → Purge Everything

### Issue 4: Old Version Served After Deploy

**Symptoms:**
- New code deployed to S3
- Browser still loads old `index-*.js` files
- Changes not visible to users

**Causes:**
1. CloudFlare edge cache serving stale HTML
2. Browser cache ignoring cache headers
3. S3 sync didn't upload all files

**Solutions:**
1. Purge CloudFlare cache: Caching → Configuration → Purge Everything
2. Verify S3 upload: `aws s3 ls s3://360.shamrockrovers.ie/assets/`
3. Check `Cache-Control` headers on `index.html` should be `no-cache`
4. Users: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Issue 5: CORS Errors from API

**Symptoms:**
- Frontend loads but API calls fail
- Browser console: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Causes:**
1. API Gateway CORS misconfigured
2. Origin not in allowedOrigins list
3. Preflight OPTIONS request failing

**Solutions:**
1. Verify CORS in `packages/infrastructure/lib/supporter360-stack.ts`
2. Check allowedOrigins includes `https://360.shamrockrovers.ie`
3. Redeploy CDK stack after CORS changes: `cdk deploy`

---

## 7. Deployment Verification

After deploying frontend changes, verify:

```bash
# 1. Check S3 objects uploaded
aws s3 ls s3://360.shamrockrovers.ie/ --recursive --human-readable

# 2. Check index.html metadata
aws s3api head-object \
  --bucket 360.shamrockrovers.ie \
  --key index.html \
  --query 'CacheControl'

# 3. Test from CloudFlare (should return 200)
curl -I https://360.shamrockrovers.ie/

# 4. Test deep link (should return 200, not 404)
curl -I https://360.shamrockrovers.ie/profile/test

# 5. Verify API CORS
curl -H "Origin: https://360.shamrockrovers.ie" \
  -H "X-API-Key: your-key" \
  -v https://api.execute-api.eu-west-1.amazonaws.com/prod/search?q=test
```

---

## 8. Performance Monitoring

### CloudFlare Analytics

Monitor these metrics:
- **Edge Response Ratio:** Should be >90% (good cache hit rate)
- **Bandwidth Saved:** Shows caching effectiveness
- **Top URLs:** Identify heavy assets
- **Status Codes:** Watch for 403/404 spikes

### S3 Metrics

Check AWS CloudWatch:
- **Bucket Size Metrics:** Monitor growth
- **Number of Objects:** Should be stable after deploy
- **GetRequests:** Counter for API calls from CloudFlare

---

## 9. Cost Optimization

Current setup costs (~$2-3/month):
- **S3 Storage:** $0.023/GB × ~5MB = ~$0.12/month
- **S3 Requests:** 10,000 GET requests free, then $0.0004/1K
- **CloudFlare:** Free tier sufficient for current traffic

**Cost-saving tips:**
1. Enable CloudFlare "Auto Minify" for CSS/JS
2. Use CloudFlare Polish for image optimization (paid plan)
3. Set appropriate cache TTLs to reduce S3 GET requests
4. Monitor S3 lifecycle rules for old object cleanup

---

## 10. Alternative: S3 Static Website Hosting

If CloudFlare Workers approach is too complex, S3 static website hosting is simpler but has limitations:

**Pros:**
- ✅ Built-in SPA redirect (add redirect rule for `404` → `/index.html`)
- ✅ No CloudFlare Worker needed
- ✅ Simpler setup

**Cons:**
- ❌ HTTP only (no HTTPS support)
- ❌ No IP-based access control
- ❌ Public bucket required
- ❌ XML error pages (not customizable)

**To switch to static hosting:**
1. Enable "Static website hosting" in S3 bucket properties
2. Set index document: `index.html`, error document: `index.html`
3. Make bucket public (update block public access settings)
4. Update bucket policy to allow all `s3:GetObject` (remove IP condition)
5. Update CloudFlare CNAME to target static website endpoint

**NOT RECOMMENDED** for production due to HTTP-only limitation.

---

## Summary

The current setup (S3 REST API + CloudFlare Workers) provides:
- ✅ HTTPS-only access
- ✅ IP-based access control (CloudFlare only)
- ✅ SPA routing support via Workers
- ✅ Aggressive caching for assets
- ✅ Fast cache purging via CloudFlare

**Key maintenance tasks:**
1. Update CloudFlare IP ranges in bucket policy quarterly
2. Monitor CloudFlare Worker logs for errors
3. Purge CloudFlare cache after `index.html` deployments
4. Verify CORS settings after API Gateway changes

**Files involved:**
- `packages/infrastructure/lib/supporter360-stack.ts` - S3 bucket + policy
- `packages/frontend/vite.config.ts` - Build config
- `packages/frontend/src/main.tsx` - React Router setup
- CloudFlare Worker script (deployed separately)
