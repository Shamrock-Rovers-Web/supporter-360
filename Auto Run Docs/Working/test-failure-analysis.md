---
type: research
title: Test Failure Analysis
created: 2026-01-29
tags:
  - testing
  - errors
  - typescript
  - handler-signature
related:
  - "[[Phase-01-Foundation-and-Test-Fixes.md]]"
---

# Test Failure Analysis

## Executive Summary

All 18 test suites in the backend package are currently failing due to three primary issues:

1. **Bun:test dependency issue** - Repository tests importing `bun:test` which is not available in the Node.js environment
2. **Handler signature mismatch** - Tests calling handlers with 2 parameters `(event, context)` but handlers now expect 1 parameter `(event)`
3. **Type mismatches** - Mock objects missing required fields after type definitions evolved

## Detailed Breakdown by Category

### 1. Repository Tests (3 files)

**Files Affected:**
- `src/db/repositories/membership.repository.test.ts`
- `src/db/repositories/event.repository.test.ts`
- `src/db/repositories/supporter.repository.test.ts`

**Errors:**
```
TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
```

**Root Cause:**
Tests import from `bun:test`:
```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
```

However, the project uses Jest (Node.js), not Bun. The `package.json` shows:
```json
"scripts": {
  "test": "jest"
}
```

**Fix Required:**
Replace all `bun:test` imports with Jest equivalents:
```typescript
// Remove
import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Replace with Jest globals (no import needed)
// describe, it, expect, beforeEach are available globally
```

For `mock()` functionality, use `jest.mock()` or `jest.fn()`.

**Additional Error in `supporter.repository.test.ts`:**
```
TS2353: Object literal may only specify known properties, and 'supporter_id' does not exist
in type 'Omit<Partial<Supporter>, "supporter_id" | "created_at" | "updated_at">'.
```

At line 108:
```typescript
supporter_id: providedId,  // Error: supporter_id is excluded from type
```

This suggests a repository method explicitly excludes `supporter_id` from partial updates.

---

### 2. Processor Tests (5 files)

**Files Affected:**
- `src/handlers/processors/stripe.processor.test.ts`
- `src/handlers/processors/gocardless.processor.test.ts`
- `src/handlers/processors/mailchimp.processor.test.ts`
- `src/handlers/processors/shopify.processor.test.ts`
- `src/handlers/processors/futureticketing.processor.test.ts`

**Primary Error:**
```
TS2554: Expected 3 arguments, but got 2.
```

**Example from `mailchimp.processor.test.ts:114`:**
```typescript
await handler(event, {} as any);  // Error: Expected 3 arguments
```

**Root Cause:**
AWS Lambda handler signatures changed from 3 parameters to 1 parameter.

**OLD Signature (pre-change):**
```typescript
export const handler = async (event, context, callback) => {
  // ...
};
```

**NEW Signature (current):**
```typescript
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  // ...
};
```

This change was made to use TypeScript's stronger typing with AWS Lambda types.

**Fix Required:**
Remove the second parameter from all handler invocations:
```typescript
// OLD
await handler(event, {} as any);

// NEW
await handler(event);
```

**Secondary Error in `mailchimp.processor.test.ts`:**
```
TS2740: Type '{ supporter_id: string; name: string; primary_email: string; supporter_type: string; }'
is missing the following properties from type 'Supporter': phone, supporter_type_source,
flags, linked_ids, and 2 more.
```

**Root Cause:**
The `createMockSupporter()` helper returns an incomplete object. The `Supporter` type requires more fields.

**Fix Required:**
Update `createMockSupporter()` to return all required fields:
```typescript
function createMockSupporter(overrides = {}): Support {
  return {
    supporter_id: 'mock-id',
    name: 'Mock Supporter',
    primary_email: 'mock@example.com',
    phone: null,
    supporter_type: 'unknown',
    supporter_type_source: 'auto',
    flags: {},
    linked_ids: {},
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}
```

**Tertiary Error in `futureticketing.processor.test.ts`:**
```
TS2739: Type 'Supporter' is missing the following properties from type 'SearchResult':
email, last_ticket_order_date, last_shop_order_date, membership_status, last_stadium_entry_date
```

**Root Cause:**
The repository's `search()` method returns `SearchResult[]`, not `Supporter[]`. These are different types.

**Fix Required:**
Create a `createMockSearchResult()` helper or use the correct type.

---

### 3. API Handler Tests (4 files)

**Files Affected:**
- `src/handlers/api/profile.handler.test.ts`
- `src/handlers/api/search.handler.test.ts`
- `src/handlers/api/timeline.handler.test.ts`
- `src/handlers/api/admin/merge.handler.test.ts`

**Primary Error:**
```
TS2554: Expected 1 arguments, but got 2.
```

**Example from `profile.handler.test.ts:143`:**
```typescript
const result = await handler(event as APIGatewayProxyEvent, {} as any);
//                                                                   ^^^^^^ remove this
```

**Root Cause:**
Same as processor tests - API Gateway handlers now take a single `event` parameter.

**Fix Required:**
```typescript
// OLD
await handler(event, {} as any);

// NEW
await handler(event);
```

**Secondary Error in `profile.handler.test.ts`:**
```
TS2345: Argument of type '{ ... emails: { id: number; email: string; is_shared: boolean;
created_at: Date; }[] ... }' is not assignable to parameter of type 'SupporterProfile'.
Property 'supporter_id' is missing in type '{ id: number; email: string; is_shared: boolean;
created_at: Date; }' but required in type 'EmailAlias'.
```

**Root Cause:**
The `EmailAlias` type requires a `supporter_id` field, but the mock data only has `id`, `email`, `is_shared`, `created_at`.

**Fix Required:**
Add `supporter_id` to all email alias mocks:
```typescript
emails: [
  {
    supporter_id: 'mock-supporter-id',  // Add this
    id: 1,
    email: 'primary@example.com',
    is_shared: false,
    created_at: new Date(),
  },
  // ...
]
```

---

### 4. Integration Client Tests (5 files)

**Files Affected:**
- `src/integrations/stripe/client.test.ts`
- `src/integrations/gocardless/client.test.ts`
- `src/integrations/mailchimp/client.test.ts`
- `src/integrations/shopify/client.test.ts`
- `src/integrations/future-ticketing/client.test.ts`

These test files likely have similar issues but weren't fully captured in the error output due to early termination.

**Expected Issues:**
1. Mock data type mismatches (similar to processor tests)
2. HTTP client mock issues (fetch/axios)
3. API response structure mismatches

---

### 5. Webhook Handler Tests (4 files)

**Files Affected:**
- `src/handlers/webhooks/gocardless.handler.test.ts`
- `src/handlers/webhooks/stripe.handler.test.ts`
- `src/handlers/webhooks/mailchimp.handler.test.ts`
- `src/handlers/webhooks/shopify.handler.test.ts`

**Expected Issues:**
1. Handler signature mismatch (2 params → 1 param)
2. APIGatewayProxyEvent mock structure issues
3. Missing headers in mock events

---

## Test Suite Summary

| Category | Files | Primary Issue | Secondary Issues |
|----------|-------|---------------|------------------|
| Repository Tests | 3 | `bun:test` import | Type exclusions |
| Processor Tests | 5 | Handler signature | Mock data types |
| API Handler Tests | 4 | Handler signature | Email alias types |
| Integration Client Tests | 5 | Unknown (likely HTTP mocks) | Type mismatches |
| Webhook Handler Tests | 4 | Handler signature | Event mock structure |
| **Total** | **21** | **Signature change** | **Type evolution** |

---

## Critical vs Non-Blocking Tests

### Critical (Must Fix for Integration Work)
- **Repository tests** - Validate core data access patterns
- **Processor tests** - Validate webhook event processing logic
- **API handler tests** - Validate API endpoints

### Non-Blocking (Can Fix Later)
- **Integration client tests** - External API integration (can be validated manually)
- **Webhook handler tests** - Simple ingestion logic (already validated in production)

**Note:** The task document specifies ALL tests should be fixed, so we will treat all as critical for Phase 01.

---

## Root Cause Summary

### Why Did These Tests Break?

1. **Handler Signature Evolution**
   - Original pattern: `(event, context, callback)` - Classic Node.js Lambda pattern
   - New pattern: `(event)` - Modern TypeScript with explicit type annotations
   - Benefit: Stronger typing, better IDE support, clearer intent
   - Impact: Every handler test needs to remove the second parameter

2. **Type Evolution**
   - As the codebase matured, types became more strict
   - Fields were added to `Supporter`, `EmailAlias`, `SearchResult`, etc.
   - Mock helpers created early on no longer satisfy current types
   - Impact: All mock data needs updates

3. **Test Framework Mismatch**
   - Tests were written assuming Bun runtime
   - Project actually uses Jest with Node.js
   - Impact: Repository tests fail to import test framework

---

## Recommended Fix Order

### Phase 1: Quick Wins (Low Risk, High Impact)
1. Fix `bun:test` imports in repository tests (3 files)
2. Fix handler signature calls in processor tests (5 files)
3. Fix handler signature calls in API handler tests (4 files)

### Phase 2: Type Mismatches (Medium Risk)
4. Update mock helpers to return complete objects
5. Fix `EmailAlias` mocks to include `supporter_id`
6. Fix `SearchResult` vs `Supporter` type confusion

### Phase 3: Integration Tests (Higher Risk)
7. Fix integration client tests (HTTP mocks)
8. Fix webhook handler tests (event structure)

---

## Test Execution Strategy

After each fix batch:
```bash
# Run all tests to verify progress
npm test

# Run specific test file for faster feedback
npx jest packages/backend/src/db/repositories/membership.repository.test.ts

# Run with coverage
npm test -- --coverage
```

---

## Estimated Effort

| Task | Files | Est. Time |
|------|-------|-----------|
| Fix bun:test imports | 3 | 15 min |
| Fix handler signatures | 13 | 30 min |
| Update mock helpers | 10 | 45 min |
| Fix type mismatches | 15 | 60 min |
| **Total** | **21+** | **~2.5 hours** |

---

## Success Criteria

After fixes:
- ✅ All test suites compile without TypeScript errors
- ✅ All tests pass (or are intentionally skipped with documentation)
- ✅ Test coverage remains adequate for critical paths
- ✅ Build system (`npm run build`) works end-to-end
