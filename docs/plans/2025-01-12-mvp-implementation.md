# Supporter 360 MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete single-pane-of-glass supporter data system integrating Shopify, Future Ticketing, Stripe, GoCardless, and Mailchimp with a React frontend.

**Architecture:** Serverless AWS (API Gateway, Lambda, SQS, RDS PostgreSQL, S3, EventBridge) with React + Vite frontend. Queue-first webhook ingestion, polling-based Future Ticketing integration, scheduled tag sync to Mailchimp.

**Tech Stack:** Node.js 18, TypeScript, AWS CDK 2.x, PostgreSQL 15, React 18, Vite, TanStack Query, TailwindCSS, shadcn/ui

---

## Task 1: Add API Key Authentication Middleware

**Files:**
- Create: `packages/backend/src/middleware/auth.ts`
- Create: `packages/backend/src/utils/api-response.ts`
- Create: `packages/backend/src/middleware/auth.test.ts`

**Step 1: Write API response utility**

Create `packages/backend/src/utils/api-response.ts`:

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

export function successResponse<T>(data: T, statusCode = 200): {
  statusCode: number;
  body: string;
} {
  return {
    statusCode,
    body: JSON.stringify({ success: true, data } as ApiResponse<T>),
  };
}

export function errorResponse(
  error: string,
  statusCode = 500,
  code?: string,
  details?: any
): {
  statusCode: number;
  body: string;
} {
  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      error,
      code,
      details,
    } as ApiResponse),
  };
}

export function unauthorizedResponse(): {
  statusCode: number;
  body: string;
} {
  return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
}

export function forbiddenResponse(): {
  statusCode: number;
  body: string;
} {
  return errorResponse('Forbidden', 403, 'FORBIDDEN');
}
```

**Step 2: Write auth middleware**

Create `packages/backend/src/middleware/auth.ts`:

```typescript
import { APIGatewayProxyEvent } from 'aws-lambda';
import { query } from '../db/connection';
import { unauthorizedResponse, forbiddenResponse } from '../utils/api-response';

export type ApiRole = 'staff' | 'admin';

export interface AuthContext {
  role: ApiRole;
  keyName: string;
}

const STAFF_ONLY_ENDPOINTS = new Set([
  'GET /search',
  'GET /supporters/{id}',
  'GET /supporters/{id}/timeline',
]);

const ADMIN_ENDPOINTS = new Set([
  'POST /admin/merge',
  'POST /admin/split',
  'POST /admin/override-type',
]);

export async function validateApiKey(
  event: APIGatewayProxyEvent
): Promise<{ authorized: true; context: AuthContext } | { authorized: false; response: ReturnType<typeof unauthorizedResponse | typeof forbiddenResponse> }> {
  const apiKey = event.headers['X-API-Key'] || event.headers['x-api-key'];

  if (!apiKey) {
    return { authorized: false, response: unauthorizedResponse() };
  }

  // Fetch API keys from config table
  const result = await query(
    "SELECT value FROM config WHERE key = 'api_keys'"
  );

  if (result.rows.length === 0) {
    return { authorized: false, response: unauthorizedResponse() };
  }

  const apiKeys = result.rows[0].value as Record<string, { role: ApiRole; name: string }>;
  const keyConfig = apiKeys[apiKey];

  if (!keyConfig) {
    return { authorized: false, response: unauthorizedResponse() };
  }

  // Determine endpoint pattern
  const method = event.httpMethod;
  const path = event.path;
  const endpointPattern = `${method} ${path.replace(/\/[^/]+/g, m =>
    m.startsWith('/:') ? '/{id}' : m
  )}`;

  // Check role-based access
  const requiredRole = ADMIN_ENDPOINTS.has(endpointPattern) ? 'admin' : 'staff';

  if (requiredRole === 'admin' && keyConfig.role !== 'admin') {
    return { authorized: false, response: forbiddenResponse() };
  }

  return {
    authorized: true,
    context: { role: keyConfig.role, keyName: keyConfig.name }
  };
}

export function requireAuth(handler: (event: APIGatewayProxyEvent, auth: AuthContext) => Promise<any>) {
  return async (event: APIGatewayProxyEvent) => {
    const authResult = await validateApiKey(event);

    if (!authResult.authorized) {
      return authResult.response;
    }

    return handler(event, authResult.context);
  };
}
```

**Step 3: Write auth middleware tests**

Create `packages/backend/src/middleware/auth.test.ts`:

```typescript
import { validateApiKey, AuthContext } from './auth';
import { query } from '../db/connection';

jest.mock('../db/connection');

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockApiKeys = {
    'staff-key-123': { role: 'staff' as const, name: 'Customer Service' },
    'admin-key-456': { role: 'admin' as const, name: 'Admin User' },
  };

  it('should reject request with no API key', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ value: mockApiKeys }]
    });

    const event = {
      headers: {},
      httpMethod: 'GET',
      path: '/search',
    } as any;

    const result = await validateApiKey(event);
    expect(result.authorized).toBe(false);
  });

  it('should reject invalid API key', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ value: mockApiKeys }]
    });

    const event = {
      headers: { 'X-API-Key': 'invalid-key' },
      httpMethod: 'GET',
      path: '/search',
    } as any;

    const result = await validateApiKey(event);
    expect(result.authorized).toBe(false);
  });

  it('should authorize staff key for staff endpoint', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ value: mockApiKeys }]
    });

    const event = {
      headers: { 'X-API-Key': 'staff-key-123' },
      httpMethod: 'GET',
      path: '/search',
    } as any;

    const result = await validateApiKey(event);
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.context.role).toBe('staff');
    }
  });

  it('should reject staff key for admin endpoint', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ value: mockApiKeys }]
    });

    const event = {
      headers: { 'X-API-Key': 'staff-key-123' },
      httpMethod: 'POST',
      path: '/admin/merge',
    } as any;

    const result = await validateApiKey(event);
    expect(result.authorized).toBe(false);
  });
});
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/backend && npm test -- auth.test.ts
```

**Step 5: Update existing API handlers to use auth**

Modify `packages/backend/src/handlers/api/search.handler.ts`:

```typescript
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { SupporterRepository } from '../../db/repositories/supporter.repository';
import { SearchRequest } from '@supporter360/shared';
import { requireAuth } from '../../middleware/auth';
import { errorResponse, successResponse } from '../../utils/api-response';

const supporterRepo = new SupporterRepository();

export const handler = requireAuth(async (event: APIGatewayProxyEvent, auth) => {
  try {
    const query = event.queryStringParameters?.q || '';
    const field = event.queryStringParameters?.field as SearchRequest['field'] || 'all';
    const limit = parseInt(event.queryStringParameters?.limit || '50');
    const offset = parseInt(event.queryStringParameters?.offset || '0');

    if (!query) {
      return errorResponse('Query parameter "q" is required', 400, 'MISSING_QUERY');
    }

    const results = await supporterRepo.search({
      query,
      field,
      limit,
      offset,
    });

    return successResponse(results);
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse('Search failed', 500, 'SEARCH_ERROR', { message: (error as Error).message });
  }
});
```

**Step 6: Commit**

```bash
git add packages/backend/src/middleware/ packages/backend/src/utils/ packages/backend/src/handlers/api/
git commit -m "feat: add API key authentication middleware"
```

---

## Task 2: Create Future Ticketing Client Service

**Files:**
- Create: `packages/backend/src/services/futureticketing.client.ts`
- Create: `packages/backend/src/services/futureticketing.client.test.ts`

**Step 1: Write FT client**

Create `packages/backend/src/services/futureticketing.client.ts`:

```typescript
export interface FTConfig {
  apiUrl: string;
  apiKey: string;
}

export interface FTCustomer {
  CustomerID: string;
  Email: string;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  CreatedDate: string;
}

export interface FTOrder {
  OrderID: string;
  CustomerID: string;
  OrderDate: string;
  TotalAmount: number;
  Status: string;
  Items: FTOrderItem[];
}

export interface FTOrderItem {
  ProductID: string;
  CategoryID?: string;
  Quantity: number;
  Price: number;
  ProductName: string;
}

export interface FTStadiumEntry {
  EntryID: string;
  CustomerID: string;
  EventID: string;
  EventName: string;
  EntryTime: string;
  Gate?: string;
}

export interface FTCheckPoint {
  last_customer_fetch: string | null;
  last_order_fetch: string | null;
  last_entry_fetch: string | null;
}

export class FutureTicketingClient {
  private config: FTConfig;

  constructor(config?: FTConfig) {
    this.config = config || {
      apiUrl: process.env.FUTURE_TICKETING_API_URL || '',
      apiKey: process.env.FUTURE_TICKETING_API_KEY || '',
    };
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T[]> {
    const url = new URL(endpoint, this.config.apiUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FT API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  }

  async getCustomers(since?: string): Promise<FTCustomer[]> {
    return this.request<FTCustomer>('/api/customers', since
      ? { modifiedSince: since }
      : undefined
    );
  }

  async getOrders(since?: string): Promise<FTOrder[]> {
    return this.request<FTOrder>('/api/orders', since
      ? { sinceDate: since }
      : undefined
    );
  }

  async getStadiumEntries(since?: string): Promise<FTStadiumEntry[]> {
    return this.request<FTStadiumEntry>('/api/entries', since
      ? { sinceDate: since }
      : undefined
    );
  }
}
```

**Step 2: Write tests**

Create `packages/backend/src/services/futureticketing.client.test.ts`:

```typescript
import { FutureTicketingClient } from './futureticketing.client';

global.fetch = jest.fn();

describe('FutureTicketingClient', () => {
  let client: FutureTicketingClient;

  beforeEach(() => {
    client = new FutureTicketingClient({
      apiUrl: 'https://api.test.com',
      apiKey: 'test-key',
    });
    (global.fetch as jest.Mock).mockClear();
  });

  it('should fetch customers', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ CustomerID: '123', Email: 'test@example.com' }],
    });

    const customers = await client.getCustomers();
    expect(customers).toEqual([{ CustomerID: '123', Email: 'test@example.com' }]);
  });

  it('should include since parameter', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await client.getCustomers('2025-01-01T00:00:00Z');

    const url = new URL((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url.searchParams.get('modifiedSince')).toBe('2025-01-01T00:00:00Z');
  });
});
```

**Step 3: Commit**

```bash
git add packages/backend/src/services/futureticketing.client.ts
git commit -m "feat: add Future Ticketing API client"
```

---

## Task 3: Create Future Ticketing Polling Handler

**Files:**
- Create: `packages/backend/src/handlers/polling/futureticketing.handler.ts`
- Create: `packages/backend/src/handlers/polling/futureticketing.handler.test.ts`

**Step 1: Write polling handler**

Create `packages/backend/src/handlers/polling/futureticketing.handler.ts`:

```typescript
import { ScheduledHandler } from 'aws-lambda';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { query } from '../../db/connection';
import { FutureTicketingClient, FTCheckPoint } from '../../services/futureticketing.client';

const sqsClient = new SQSClient({});
const QUEUE_URL = process.env.FUTURE_TICKETING_QUEUE_URL!;
const ftClient = new FutureTicketingClient();

export const handler: ScheduledHandler = async (event) => {
  console.log('Future Ticketing polling triggered', JSON.stringify(event));

  try {
    // Get checkpoint
    const checkpointResult = await query(
      "SELECT value FROM config WHERE key = 'future_ticketing_checkpoint'"
    );

    let checkpoint: FTCheckPoint = {
      last_customer_fetch: null,
      last_order_fetch: null,
      last_entry_fetch: null,
    };

    if (checkpointResult.rows.length > 0) {
      checkpoint = checkpointResult.rows[0].value as FTCheckPoint;
    }

    const now = new Date().toISOString();
    const entries: any[] = [];

    // Fetch customers
    const customers = await ftClient.getCustomers(checkpoint.last_customer_fetch || undefined);
    console.log(`Fetched ${customers.length} customers`);
    customers.forEach(c => entries.push({
      type: 'customer',
      data: c,
    }));

    // Fetch orders
    const orders = await ftClient.getOrders(checkpoint.last_order_fetch || undefined);
    console.log(`Fetched ${orders.length} orders`);
    orders.forEach(o => entries.push({
      type: 'order',
      data: o,
    }));

    // Fetch stadium entries
    const stadiumEntries = await ftClient.getStadiumEntries(checkpoint.last_entry_fetch || undefined);
    console.log(`Fetched ${stadiumEntries.length} stadium entries`);
    stadiumEntries.forEach(e => entries.push({
      type: 'entry',
      data: e,
    }));

    // Send to SQS in batches
    const batchSize = 10;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      await sqsClient.send(new SendMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: batch.map((entry, idx) => ({
          Id: `${entry.type}-${entry.data.OrderID || entry.data.CustomerID || entry.data.EntryID}-${i}-${idx}`,
          MessageBody: JSON.stringify(entry),
          MessageAttributes: {
            type: { DataType: 'String', StringValue: entry.type },
            source: { DataType: 'String', StringValue: 'futureticketing' },
          },
        })),
      }));
    }

    // Update checkpoint
    const newCheckpoint: FTCheckPoint = {
      last_customer_fetch: now,
      last_order_fetch: now,
      last_entry_fetch: now,
    };

    await query(
      `INSERT INTO config (key, value, description)
       VALUES ('future_ticketing_checkpoint', $1, 'FT polling checkpoint')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(newCheckpoint)]
    );

    console.log('Polling complete, checkpoint updated');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        customersProcessed: customers.length,
        ordersProcessed: orders.length,
        entriesProcessed: stadiumEntries.length,
      }),
    };
  } catch (error) {
    console.error('FT polling error:', error);
    throw error;
  }
};
```

**Step 2: Commit**

```bash
git add packages/backend/src/handlers/polling/futureticketing.handler.ts
git commit -m "feat: add Future Ticketing polling handler"
```

---

## Task 4: Create Future Ticketing Processor

**Files:**
- Create: `packages/backend/src/handlers/processors/futureticketing.processor.ts`

**Step 1: Write processor**

Create `packages/backend/src/handlers/processors/futureticketing.processor.ts`:

```typescript
import { SQSHandler, SQSRecord } from 'aws-lambda';
import { query, transaction } from '../../db/connection';
import { v4 as uuidv4 } from 'uuid';

interface FTMessage {
  type: 'customer' | 'order' | 'entry';
  data: any;
}

export const handler: SQSHandler = async (event) => {
  console.log(`Processing ${event.Records.length} FT messages`);

  for (const record of event.Records) {
    try {
      const message: FTMessage = JSON.parse(record.body);
      await processMessage(message);
      console.log(`Processed ${message.type}: ${JSON.stringify(message.data)}`);
    } catch (error) {
      console.error('Error processing record:', error);
      throw error; // Let DLQ handle it
    }
  }
};

async function processMessage(message: FTMessage) {
  switch (message.type) {
    case 'customer':
      await processCustomer(message.data);
      break;
    case 'order':
      await processOrder(message.data);
      break;
    case 'entry':
      await processEntry(message.data);
      break;
  }
}

async function processCustomer(customer: any) {
  const existingResult = await query(
    `SELECT s.* FROM supporter s
     WHERE s.linked_ids->>'futureticketing' = $1`,
    [customer.CustomerID]
  );

  if (existingResult.rows.length === 0) {
    await query(
      `INSERT INTO supporter (name, primary_email, phone, supporter_type, linked_ids)
       VALUES ($1, $2, $3, 'Unknown', $4)`,
      [
        `${customer.FirstName || ''} ${customer.LastName || ''}`.trim() || null,
        customer.Email || null,
        customer.Phone || null,
        JSON.stringify({ futureticketing: customer.CustomerID }),
      ]
    );

    // Add email alias
    if (customer.Email) {
      const supporterResult = await query(
        `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1`,
        [customer.CustomerID]
      );
      if (supporterResult.rows.length > 0) {
        await query(
          `INSERT INTO email_alias (email, supporter_id)
           VALUES ($1, $2)
           ON CONFLICT (email, supporter_id) DO NOTHING`,
          [customer.Email, supporterResult.rows[0].supporter_id]
        );
      }
    }
  }
}

async function processOrder(order: any) {
  // Find supporter by FT customer ID
  const supporterResult = await query(
    `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1`,
    [order.CustomerID]
  );

  if (supporterResult.rows.length === 0) {
    console.log(`Supporter not found for FT customer ${order.CustomerID}, skipping order`);
    return;
  }

  const supporterId = supporterResult.rows[0].supporter_id;

  // Check for existing event
  const existingEvent = await query(
    `SELECT event_id FROM event WHERE source_system = 'futureticketing' AND external_id = $1`,
    [`order-${order.OrderID}`]
  );

  if (existingEvent.rows.length > 0) {
    console.log(`Order ${order.OrderID} already processed, skipping`);
    return;
  }

  await query(
    `INSERT INTO event (supporter_id, source_system, event_type, event_time, external_id, amount, currency, metadata)
     VALUES ($1, 'futureticketing', 'TicketPurchase', $2, $3, $4, $5, $6)`,
    [
      supporterId,
      order.OrderDate,
      `order-${order.OrderID}`,
      order.TotalAmount,
      'EUR',
      JSON.stringify({
        order_id: order.OrderID,
        status: order.Status,
        items: order.Items,
      }),
    ]
  );
}

async function processEntry(entry: any) {
  const supporterResult = await query(
    `SELECT supporter_id FROM supporter WHERE linked_ids->>'futureticketing' = $1`,
    [entry.CustomerID]
  );

  if (supporterResult.rows.length === 0) {
    console.log(`Supporter not found for FT customer ${entry.CustomerID}, skipping entry`);
    return;
  }

  const supporterId = supporterResult.rows[0].supporter_id;

  await query(
    `INSERT INTO event (supporter_id, source_system, event_type, event_time, external_id, metadata)
     VALUES ($1, 'futureticketing', 'StadiumEntry', $2, $3, $4)
     ON CONFLICT (source_system, external_id) DO NOTHING`,
    [
      supporterId,
      entry.EntryTime,
      `entry-${entry.EntryID}`,
      JSON.stringify({
        event_id: entry.EventID,
        event_name: entry.EventName,
        gate: entry.Gate,
      }),
    ]
  );
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/handlers/processors/futureticketing.processor.ts
git commit -m "feat: add Future Ticketing processor"
```

---

## Task 5: Create Mailchimp Client

**Files:**
- Create: `packages/backend/src/services/mailchimp.client.ts`

**Step 1: Write Mailchimp client**

Create `packages/backend/src/services/mailchimp.client.ts`:

```typescript
export interface MailchimpConfig {
  apiKey: string;
  dc: string; // data center, e.g., 'us1'
}

export interface MailchimpContact {
  id: string;
  email_address: string;
  tags: string[];
}

export interface MailchimpAudience {
  id: string;
  name: string;
}

export class MailchimpClient {
  private config: MailchimpConfig;
  private baseUrl: string;

  constructor(config?: MailchimpConfig) {
    const apiKey = config?.apiKey || process.env.MAILCHIMP_API_KEY || '';
    const dc = config?.dc || process.env.MAILCHIMP_DC || this.extractDcFromKey(apiKey);

    this.config = { apiKey, dc };
    this.baseUrl = `https://${dc}.api.mailchimp.com/3.0`;
  }

  private extractDcFromKey(apiKey: string): string {
    const match = apiKey.match(/-(.+)$/);
    return match ? match[1] : 'us1';
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailchimp API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getAudiences(): Promise<MailchimpAudience[]> {
    const result = await request<{ audiences: MailchimpAudience[] }>('/audiences');
    return result.audiences || [];
  }

  async getContact(audienceId: string, email: string): Promise<MailchimpContact | null> {
    const hashed = this.hashEmail(email);
    try {
      return await this.request<MailchimpContact>(`/lists/${audienceId}/members/${hashed}`);
    } catch {
      return null;
    }
  }

  async addTags(audienceId: string, subscriberHash: string, tags: string[]): Promise<void> {
    await this.request(`/lists/${audienceId}/members/${subscriberHash}/tags`, {
      method: 'POST',
      body: JSON.stringify({
        tags: tags.map(tag => ({ name: tag, status: 'active' })),
      }),
    });
  }

  async removeTags(audienceId: string, subscriberHash: string, tags: string[]): Promise<void> {
    await this.request(`/lists/${audienceId}/members/${subscriberHash}/tags`, {
      method: 'POST',
      body: JSON.stringify({
        tags: tags.map(tag => ({ name: tag, status: 'inactive' })),
      }),
    });
  }

  private hashEmail(email: string): string {
    // Simple MD5 hash for Mailchimp subscriber hash
    // In production, use crypto module
    return require('crypto')
      .createHash('md5')
      .update(email.toLowerCase().trim())
      .digest('hex');
  }
}

// Helper function for use in Lambda
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/services/mailchimp.client.ts
git commit -m "feat: add Mailchimp API client"
```

---

## Task 6: Create Mailchimp Tag Sync Service

**Files:**
- Create: `packages/backend/src/services/mailchimp-sync.service.ts`

**Step 1: Write tag sync service**

Create `packages/backend/src/services/mailchimp-sync.service.ts`:

```typescript
import { query } from '../db/connection';
import { MailchimpClient } from './mailchimp.client';
import { SourceSystem, EventType } from '@supporter360/shared';

interface TagRule {
  tag: string;
  check: (supporterId: string) => Promise<boolean>;
  audiences: string[];
}

export class MailchimpSyncService {
  private mailchimp: MailchimpClient;
  private audienceIds: Record<string, string> = {};

  constructor() {
    this.mailchimp = new MailchimpClient();
  }

  async initialize(): Promise<void> {
    // Fetch audience IDs from config or API
    const result = await query("SELECT value FROM config WHERE key = 'mailchimp_audiences'");
    if (result.rows.length > 0) {
      this.audienceIds = result.rows[0].value;
    } else {
      // Fetch from Mailchimp API
      const audiences = await this.mailchimp.getAudiences();
      this.audienceIds = {
        shop: audiences.find(a => a.name.toLowerCase().includes('shop'))?.id || '',
        members: audiences.find(a => a.name.toLowerCase().includes('member'))?.id || '',
        sth: audiences.find(a => a.name.toLowerCase().includes('season'))?.id || '',
        everyone_else: audiences.find(a => a.name.toLowerCase().includes('everyone'))?.id || audiences[0]?.id || '',
      };
      await query(
        `INSERT INTO config (key, value, description) VALUES ('mailchimp_audiences', $1, 'Mailchimp audience IDs')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [JSON.stringify(this.audienceIds)]
      );
    }
  }

  async syncAll(): Promise<void> {
    await this.initialize();

    // Get all supporters
    const supporters = await query(
      `SELECT supporter_id, primary_email FROM supporter WHERE primary_email IS NOT NULL`
    );

    console.log(`Syncing tags for ${supporters.rows.length} supporters`);

    for (const supporter of supporters.rows) {
      await this.syncSupporter(supporter.supporter_id, supporter.primary_email);
    }

    // Update last run time
    await query(
      `INSERT INTO config (key, value, description) VALUES ('mailchimp_sync_last_run', $1, 'Last Mailchimp sync')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [new Date().toISOString()]
    );
  }

  private async syncSupporter(supporterId: string, email: string): Promise<void> {
    const tags = await this.calculateTags(supporterId);

    // Add tags to appropriate audiences
    for (const [audienceKey, audienceId] of Object.entries(this.audienceIds)) {
      if (!audienceId) continue;

      const subscriberHash = this.hashEmail(email);

      try {
        await this.mailchimp.addTags(audienceId, subscriberHash, tags);
      } catch (error) {
        console.error(`Failed to sync tags for ${email} to ${audienceKey}:`, error);
      }
    }

    // Update mailchimp_membership table
    for (const [audienceKey, audienceId] of Object.entries(this.audienceIds)) {
      if (!audienceId) continue;

      await query(
        `INSERT INTO mailchimp_membership (supporter_id, audience_id, tags, last_synced_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (supporter_id, audience_id) DO UPDATE
         SET tags = $3, last_synced_at = NOW()`,
        [supporterId, audienceId, tags]
      );
    }
  }

  private async calculateTags(supporterId: string): Promise<string[]> {
    const tags: string[] = [];

    // Membership tags
    const membership = await query(
      'SELECT tier, status FROM membership WHERE supporter_id = $1',
      [supporterId]
    );

    if (membership.rows.length > 0) {
      const m = membership.rows[0];
      tags.push(`Member:${m.status || 'Unknown'}`);
      if (m.tier) {
        tags.push(`Member:Tier:${m.tier}`);
      }
    }

    // Shop buyer tag (last 90 days)
    const shopPurchase = await query(
      `SELECT 1 FROM event
       WHERE supporter_id = $1 AND event_type = 'ShopOrder'
       AND event_time > NOW() - INTERVAL '90 days'
       LIMIT 1`,
      [supporterId]
    );
    if (shopPurchase.rows.length > 0) {
      tags.push('ShopBuyer:Last90Days');
    }

    // Ticket buyer tag (last 90 days)
    const ticketPurchase = await query(
      `SELECT 1 FROM event
       WHERE supporter_id = $1 AND event_type = 'TicketPurchase'
       AND event_time > NOW() - INTERVAL '90 days'
       LIMIT 1`,
      [supporterId]
    );
    if (ticketPurchase.rows.length > 0) {
      tags.push('TicketBuyer:Last90Days');
    }

    // Stadium entry tag (last 90 days)
    const stadiumEntry = await query(
      `SELECT 1 FROM event
       WHERE supporter_id = $1 AND event_type = 'StadiumEntry'
       AND event_time > NOW() - INTERVAL '90 days'
       LIMIT 1`,
      [supporterId]
    );
    if (stadiumEntry.rows.length > 0) {
      tags.push('AttendedMatch:Last90Days');
    }

    // Away Supporter tag (last 365 days)
    const awaySupporter = await query(
      `SELECT 1 FROM event e
       JOIN future_ticketing_product_mapping ft ON e.metadata->>'product_id' = ft.product_id
       WHERE e.supporter_id = $1 AND ft.meaning = 'AwaySupporter'
       AND e.event_time > NOW() - INTERVAL '365 days'
       LIMIT 1`,
      [supporterId]
    );
    if (awaySupporter.rows.length > 0) {
      tags.push('AwaySupporter:Last365Days');
    }

    // Season Ticket Holder tag
    const stHolder = await query(
      `SELECT 1 FROM event e
       JOIN future_ticketing_product_mapping ft ON e.metadata->>'product_id' = ft.product_id
       WHERE e.supporter_id = $1 AND ft.meaning = 'SeasonTicket'
       LIMIT 1`,
      [supporterId]
    );
    if (stHolder.rows.length > 0) {
      tags.push('SeasonTicketHolder');
    }

    return tags;
  }

  private hashEmail(email: string): string {
    return require('crypto')
      .createHash('md5')
      .update(email.toLowerCase().trim())
      .digest('hex');
  }
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/services/mailchimp-sync.service.ts
git commit -m "feat: add Mailchimp tag sync service"
```

---

## Task 7: Create Mailchimp Webhook Handler

**Files:**
- Create: `packages/backend/src/handlers/webhooks/mailchimp.handler.ts`

**Step 1: Write handler**

Create `packages/backend/src/handlers/webhooks/mailchimp.handler.ts`:

```typescript
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

const sqsClient = new SQSClient({});
const QUEUE_URL = process.env.MAILCHIMP_QUEUE_URL!;

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    // Mailchimp webhooks are form-encoded
    const body = event.body || '';
    const params = new URLSearchParams(body);

    const type = params.get('type');
    const data = JSON.parse(params.get('data') || '{}');

    if (!type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing type' }),
      };
    }

    // Process click events
    if (type === 'click') {
      const payloadId = uuidv4();

      await sqsClient.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          type: 'click',
          data: {
            email: data.email,
            campaign_id: data.campaign_id,
            url: data.url,
            timestamp: data.fired_at || new Date().toISOString(),
          },
        }),
        MessageAttributes: {
          type: { DataType: 'String', StringValue: 'click' },
          source: { DataType: 'String', StringValue: 'mailchimp' },
        },
      }));

      console.log(`Queued Mailchimp click event: ${payloadId}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Mailchimp webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

**Step 2: Commit**

```bash
git add packages/backend/src/handlers/webhooks/mailchimp.handler.ts
git commit -m "feat: add Mailchimp webhook handler"
```

---

## Task 8: Create Mailchimp Processor

**Files:**
- Create: `packages/backend/src/handlers/processors/mailchimp.processor.ts`

**Step 1: Write processor**

Create `packages/backend/src/handlers/processors/mailchimp.processor.ts`:

```typescript
import { SQSHandler } from 'aws-lambda';
import { query } from '../../db/connection';

interface MailchimpMessage {
  type: 'click';
  data: {
    email: string;
    campaign_id?: string;
    url?: string;
    timestamp: string;
  };
}

export const handler: SQSHandler = async (event) => {
  console.log(`Processing ${event.Records.length} Mailchimp messages`);

  for (const record of event.Records) {
    try {
      const message: MailchimpMessage = JSON.parse(record.body);
      await processClick(message.data);
      console.log(`Processed click event for ${message.data.email}`);
    } catch (error) {
      console.error('Error processing record:', error);
      throw error;
    }
  }
};

async function processClick(data: MailchimpMessage['data']) {
  // Find supporter by email
  const supporterResult = await query(
    `SELECT s.supporter_id FROM supporter s
     JOIN email_alias ea ON s.supporter_id = ea.supporter_id
     WHERE ea.email = $1`,
    [data.email]
  );

  if (supporterResult.rows.length === 0) {
    console.log(`Supporter not found for email ${data.email}, skipping click event`);
    return;
  }

  const supporterId = supporterResult.rows[0].supporter_id;

  await query(
    `INSERT INTO event (supporter_id, source_system, event_type, event_time, metadata)
     VALUES ($1, 'mailchimp', 'EmailClick', $2, $3)`,
    [
      supporterId,
      data.timestamp,
      JSON.stringify({
        campaign_id: data.campaign_id,
        url: data.url,
        email: data.email,
      }),
    ]
  );
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/handlers/processors/mailchimp.processor.ts
git commit -m "feat: add Mailchimp processor"
```

---

## Task 9: Create Supporter Type Derivation Service

**Files:**
- Create: `packages/backend/src/services/supporter-type.service.ts`

**Step 1: Write service**

Create `packages/backend/src/services/supporter-type.service.ts`:

```typescript
import { query, transaction } from '../db/connection';
import { SupporterType } from '@supporter360/shared';

export class SupporterTypeService {
  async deriveAll(): Promise<{ updated: number }> {
    // Get all supporters that need derivation (auto or not recently updated)
    const result = await query(`
      SELECT supporter_id
      FROM supporter
      WHERE supporter_type_source = 'auto'
         OR updated_at < NOW() - INTERVAL '1 hour'
    `);

    let updated = 0;
    for (const row of result.rows) {
      const newType = await this.deriveForSupporter(row.supporter_id);
      await query(
        `UPDATE supporter
         SET supporter_type = $1, supporter_type_source = 'auto', updated_at = NOW()
         WHERE supporter_id = $2`,
        [newType, row.supporter_id]
      );
      updated++;
    }

    // Update last run time
    await query(
      `INSERT INTO config (key, value, description)
       VALUES ('supporter_type_last_run', $1, 'Last supporter type derivation')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [new Date().toISOString()]
    );

    return { updated };
  }

  async deriveForSupporter(supporterId: string): Promise<SupporterType> {
    // Check if admin override exists
    const supporter = await query(
      `SELECT supporter_type_source FROM supporter WHERE supporter_id = $1`,
      [supporterId]
    );

    if (supporter.rows[0]?.supporter_type_source === 'admin_override') {
      // Return existing type, don't change
      const existing = await query(
        `SELECT supporter_type FROM supporter WHERE supporter_id = $1`,
        [supporterId]
      );
      return existing.rows[0].supporter_type as SupporterType;
    }

    // Rule 1: Season Ticket Holder
    const stHolderCheck = await query(`
      SELECT 1 FROM event e
      JOIN future_ticketing_product_mapping ft
        ON e.metadata->>'product_id' = ft.product_id
      WHERE e.supporter_id = $1
        AND ft.meaning = 'SeasonTicket'
      LIMIT 1
    `, [supporterId]);

    if (stHolderCheck.rows.length > 0) {
      return 'Season Ticket Holder';
    }

    // Rule 2: Member (Active membership or within grace)
    const membershipCheck = await query(`
      SELECT m.status,
             (SELECT value::numeric FROM config WHERE key = 'paid_up_grace_days_monthly') as grace_days
      FROM membership m
      WHERE m.supporter_id = $1
    `, [supporterId]);

    if (membershipCheck.rows.length > 0) {
      const m = membershipCheck.rows[0];
      if (m.status === 'Active') {
        return 'Member';
      }
      if (m.status === 'Past Due' && m.last_payment_date) {
        const graceDays = parseInt(m.grace_days || '35');
        const lastPayment = new Date(m.last_payment_date);
        const daysSince = Math.floor((Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince <= graceDays) {
          return 'Member';
        }
      }
    }

    // Rule 3: Away Supporter (primary activity)
    const awayCheck = await query(`
      SELECT COUNT(*) as count FROM event e
      JOIN future_ticketing_product_mapping ft
        ON e.metadata->>'product_id' = ft.product_id
      WHERE e.supporter_id = $1
        AND ft.meaning = 'AwaySupporter'
        AND e.event_time > NOW() - INTERVAL '365 days'
    `, [supporterId]);

    const otherActivityCheck = await query(`
      SELECT COUNT(*) as count FROM event
      WHERE supporter_id = $1
        AND event_type IN ('TicketPurchase', 'ShopOrder')
        AND event_time > NOW() - INTERVAL '365 days'
    `, [supporterId]);

    if (parseInt(awayCheck.rows[0].count) > 0 &&
        parseInt(otherActivityCheck.rows[0].count) === 0) {
      return 'Away Supporter';
    }

    // Rule 4: Ticket Buyer
    const ticketCheck = await query(`
      SELECT 1 FROM event
      WHERE supporter_id = $1
        AND event_type = 'TicketPurchase'
        AND event_time > NOW() - INTERVAL '365 days'
      LIMIT 1
    `, [supporterId]);

    if (ticketCheck.rows.length > 0) {
      return 'Ticket Buyer';
    }

    // Rule 5: Shop Buyer
    const shopCheck = await query(`
      SELECT 1 FROM event
      WHERE supporter_id = $1
        AND event_type = 'ShopOrder'
        AND event_time > NOW() - INTERVAL '365 days'
      LIMIT 1
    `, [supporterId]);

    if (shopCheck.rows.length > 0) {
      return 'Shop Buyer';
    }

    // Default
    return 'Unknown';
  }
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/services/supporter-type.service.ts
git commit -m "feat: add supporter type derivation service"
```

---

## Task 10: Create Reconciliation Service

**Files:**
- Create: `packages/backend/src/services/reconciler.service.ts`

**Step 1: Write service**

Create `packages/backend/src/services/reconciler.service.ts`:

```typescript
import { query } from '../db/connection';

export interface ReconciliationResult {
  source: string;
  eventsFound: number;
  eventsCreated: number;
  errors: string[];
}

export class ReconcilerService {
  async reconcileAll(): Promise<ReconciliationResult[]> {
    const results: ReconciliationResult[] = [];

    // Get lookback hours from config
    const lookbackResult = await query(
      "SELECT value::numeric as hours FROM config WHERE key = 'reconciliation_lookback_hours'"
    );
    const lookbackHours = lookbackResult.rows[0]?.hours || 24;

    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

    // Note: Actual reconciliation would call external APIs
    // For now, this is a placeholder structure

    return results;
  }

  private async reconcileShopify(since: string): Promise<ReconciliationResult> {
    // Placeholder for Shopify reconciliation
    return {
      source: 'shopify',
      eventsFound: 0,
      eventsCreated: 0,
      errors: [],
    };
  }

  private async reconcileStripe(since: string): Promise<ReconciliationResult> {
    // Placeholder for Stripe reconciliation
    return {
      source: 'stripe',
      eventsFound: 0,
      eventsCreated: 0,
      errors: [],
    };
  }

  private async reconcileGoCardless(since: string): Promise<ReconciliationResult> {
    // Placeholder for GoCardless reconciliation
    return {
      source: 'gocardless',
      eventsFound: 0,
      eventsCreated: 0,
      errors: [],
    };
  }
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/services/reconciler.service.ts
git commit -m "feat: add reconciliation service scaffold"
```

---

## Task 11: Create Scheduled Lambda Handlers

**Files:**
- Create: `packages/backend/src/handlers/scheduled/mailchimp-sync.handler.ts`
- Create: `packages/backend/src/handlers/scheduled/supporter-type.handler.ts`
- Create: `packages/backend/src/handlers/scheduled/reconciliation.handler.ts`

**Step 1: Create Mailchimp sync handler**

Create `packages/backend/src/handlers/scheduled/mailchimp-sync.handler.ts`:

```typescript
import { ScheduledHandler } from 'aws-lambda';
import { MailchimpSyncService } from '../../services/mailchimp-sync.service';

const syncService = new MailchimpSyncService();

export const handler: ScheduledHandler = async (event) => {
  console.log('Mailchimp sync triggered', JSON.stringify(event));

  try {
    await syncService.syncAll();
    console.log('Mailchimp sync complete');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Mailchimp sync error:', error);
    throw error;
  }
};
```

**Step 2: Create supporter type handler**

Create `packages/backend/src/handlers/scheduled/supporter-type.handler.ts`:

```typescript
import { ScheduledHandler } from 'aws-lambda';
import { SupporterTypeService } from '../../services/supporter-type.service';

const typeService = new SupporterTypeService();

export const handler: ScheduledHandler = async (event) => {
  console.log('Supporter type derivation triggered', JSON.stringify(event));

  try {
    const result = await typeService.deriveAll();
    console.log(`Derived types for ${result.updated} supporters`);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Supporter type derivation error:', error);
    throw error;
  }
};
```

**Step 3: Create reconciliation handler**

Create `packages/backend/src/handlers/scheduled/reconciliation.handler.ts`:

```typescript
import { ScheduledHandler } from 'aws-lambda';
import { ReconcilerService } from '../../services/reconciler.service';

const reconciler = new ReconcilerService();

export const handler: ScheduledHandler = async (event) => {
  console.log('Reconciliation triggered', JSON.stringify(event));

  try {
    const results = await reconciler.reconcileAll();
    console.log('Reconciliation complete', results);
    return {
      statusCode: 200,
      body: JSON.stringify({ results }),
    };
  } catch (error) {
    console.error('Reconciliation error:', error);
    throw error;
  }
};
```

**Step 4: Commit**

```bash
git add packages/backend/src/handlers/scheduled/
git commit -m "feat: add scheduled handlers for sync, type derivation, reconciliation"
```

---

## Task 12: Update CDK Stack with New Resources

**Files:**
- Modify: `packages/infrastructure/lib/supporter360-stack.ts`

**Step 1: Read existing stack**

Read the current stack file to understand structure.

**Step 2: Add new queues**

Add to `packages/infrastructure/lib/supporter360-stack.ts` after existing queues:

```typescript
// Add after gocardlessQueue definition (around line 107)

const ftDLQ = new sqs.Queue(this, 'FutureTicketingDLQ', {
  queueName: 'supporter360-ft-dlq',
  retentionPeriod: cdk.Duration.days(14),
});

const ftQueue = new sqs.Queue(this, 'FutureTicketingQueue', {
  queueName: 'supporter360-ft-queue',
  visibilityTimeout: cdk.Duration.seconds(300),
  deadLetterQueue: { queue: ftDLQ, maxReceiveCount: 3 },
});

const mailchimpDLQ = new sqs.Queue(this, 'MailchimpDLQ', {
  queueName: 'supporter360-mailchimp-dlq',
  retentionPeriod: cdk.Duration.days(14),
});

const mailchimpQueue = new sqs.Queue(this, 'MailchimpQueue', {
  queueName: 'supporter360-mailchimp-queue',
  visibilityTimeout: cdk.Duration.seconds(300),
  deadLetterQueue: { queue: mailchimpDLQ, maxReceiveCount: 3 },
});
```

**Step 3: Add webhook handler for Mailchimp**

Add after existing webhook handlers (around line 160):

```typescript
const mailchimpWebhookHandler = new lambda.Function(this, 'MailchimpWebhookHandler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'handlers/webhooks/mailchimp.handler',
  code: lambda.Code.fromAsset('../backend/dist'),
  timeout: cdk.Duration.seconds(30),
  environment: {
    ...commonEnvironment,
    MAILCHIMP_QUEUE_URL: mailchimpQueue.queueUrl,
  },
});

mailchimpQueue.grantSendMessages(mailchimpWebhookHandler);
rawPayloadsBucket.grantWrite(mailchimpWebhookHandler);

// Add API route
const mailchimpResource = webhooksResource.addResource('mailchimp');
mailchimpResource.addMethod('POST', new apigateway.LambdaIntegration(mailchimpWebhookHandler));
```

**Step 4: Add processors**

Add after existing processors (around line 200):

```typescript
const ftProcessor = new lambda.Function(this, 'FutureTicketingProcessor', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'handlers/processors/futureticketing.processor.handler',
  code: lambda.Code.fromAsset('../backend/dist'),
  timeout: cdk.Duration.seconds(300),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  environment: commonEnvironment,
});

ftProcessor.addEventSource(new lambdaEventSources.SqsEventSource(ftQueue, { batchSize: 10 }));

const mailchimpProcessor = new lambda.Function(this, 'MailchimpProcessor', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'handlers/processors/mailchimp.processor.handler',
  code: lambda.Code.fromAsset('../backend/dist'),
  timeout: cdk.Duration.seconds(300),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  environment: commonEnvironment,
});

mailchimpProcessor.addEventSource(new lambdaEventSources.SqsEventSource(mailchimpQueue, { batchSize: 10 }));
```

**Step 5: Add scheduled functions**

Add before API Gateway creation (around line 257):

```typescript
// Future Ticketing polling - every 15 minutes
const ftPollingHandler = new lambda.Function(this, 'FutureTicketingPollingHandler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'handlers/polling/futureticketing.handler',
  code: lambda.Code.fromAsset('../backend/dist'),
  timeout: cdk.Duration.minutes(5),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  environment: {
    ...commonEnvironment,
    FUTURE_TICKETING_QUEUE_URL: ftQueue.queueUrl,
    FUTURE_TICKETING_API_URL: cdk.SecretValue.secretsManager('future-ticketing/api-url').toString(),
    FUTURE_TICKETING_API_KEY: cdk.SecretValue.secretsManager('future-ticketing/api-key').toString(),
  },
});

ftQueue.grantSendMessages(ftPollingHandler);

new events.Rule(this, 'FutureTicketingPollingRule', {
  schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
  targets: [new targets.LambdaFunction(ftPollingHandler)],
});

// Mailchimp sync - every 10 minutes
const mailchimpSyncHandler = new lambda.Function(this, 'MailchimpSyncHandler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'handlers/scheduled/mailchimp-sync.handler',
  code: lambda.Code.fromAsset('../backend/dist'),
  timeout: cdk.Duration.minutes(5),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  environment: {
    ...commonEnvironment,
    MAILCHIMP_API_KEY: cdk.SecretValue.secretsManager('mailchimp/api-key').toString(),
    MAILCHIMP_DC: 'us1',
  },
});

new events.Rule(this, 'MailchimpSyncRule', {
  schedule: events.Schedule.rate(cdk.Duration.minutes(10)),
  targets: [new targets.LambdaFunction(mailchimpSyncHandler)],
});

// Supporter type derivation - every hour
const supporterTypeHandler = new lambda.Function(this, 'SupporterTypeHandler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'handlers/scheduled/supporter-type.handler',
  code: lambda.Code.fromAsset('../backend/dist'),
  timeout: cdk.Duration.minutes(5),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  environment: commonEnvironment,
});

new events.Rule(this, 'SupporterTypeRule', {
  schedule: events.Schedule.rate(cdk.Duration.hours(1)),
  targets: [new targets.LambdaFunction(supporterTypeHandler)],
});

// Reconciliation - daily
const reconciliationHandler = new lambda.Function(this, 'ReconciliationHandler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'handlers/scheduled/reconciliation.handler',
  code: lambda.Code.fromAsset('../backend/dist'),
  timeout: cdk.Duration.minutes(15),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  environment: commonEnvironment,
});

new events.Rule(this, 'ReconciliationRule', {
  schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
  targets: [new targets.LambdaFunction(reconciliationHandler)],
});
```

**Step 6: Add S3 bucket for frontend**

Add after rawPayloadsBucket (around line 65):

```typescript
const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
  bucketName: `supporter360-frontend-${this.account}`,
  websiteIndexDocument: 'index.html',
  websiteErrorDocument: 'index.html',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

const frontendOAI = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI');

const frontendDistribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(frontendBucket, { originAccessIdentity: frontendOAI }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
  },
  errorResponses: [
    {
      httpStatus: 403,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
    },
    {
      httpStatus: 404,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
    },
  ],
});

// Grant CloudFront access to S3
frontendBucket.addToResourcePolicy(
  new iam.PolicyStatement({
    actions: ['s3:GetObject'],
    resources: [frontendBucket.arnForObject('*')],
    principals: [new iam.CanonicalUserPrincipal(frontendOAI.cloudFrontOriginAccessIdentityId)],
  })
);

new cdk.CfnOutput(this, 'FrontendUrl', {
  value: `https://${frontendDistribution.distributionDomainName}`,
  description: 'Frontend URL',
});
```

**Step 7: Add imports at top of file**

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
```

**Step 8: Commit**

```bash
git add packages/infrastructure/lib/supporter360-stack.ts
git commit -m "feat: add FT, Mailchimp integrations and scheduled jobs to CDK"
```

---

## Task 13: Create Frontend Package Structure

**Files:**
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/tsconfig.json`
- Create: `packages/frontend/vite.config.ts`
- Create: `packages/frontend/index.html`
- Create: `packages/frontend/src/main.tsx`
- Create: `packages/frontend/src/App.tsx`
- Create: `packages/frontend/src/styles.css`

**Step 1: Create package.json**

Create `packages/frontend/package.json`:

```json
{
  "name": "@supporter360/frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "@supporter360/shared": "^1.0.0",
    "@tanstack/react-query": "^5.17.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^7.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `packages/frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: Create tsconfig.node.json**

Create `packages/frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 4: Create vite.config.ts**

Create `packages/frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

**Step 5: Create index.html**

Create `packages/frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Supporter 360</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create main entry point**

Create `packages/frontend/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 7: Create App component**

Create `packages/frontend/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-green-700 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Supporter 360</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/supporters/:id" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

**Step 8: Create base styles**

Create `packages/frontend/src/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Step 9: Create Tailwind config**

Create `packages/frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 10: Create PostCSS config**

Create `packages/frontend/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 11: Commit**

```bash
git add packages/frontend/
git commit -m "feat: add frontend package structure with Vite + React"
```

---

## Task 14: Create API Client Service

**Files:**
- Create: `packages/frontend/src/services/api.ts`
- Create: `packages/frontend/src/services/api.test.ts`

**Step 1: Create API client**

Create `packages/frontend/src/services/api.ts`:

```typescript
import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// Search
export async function searchSupporters(query: string, field?: string) {
  const params = new URLSearchParams({ q: query });
  if (field) params.set('field', field);
  const response = await apiClient.get(`/search?${params}`);
  return response.data.data;
}

// Profile
export async function getSupporterProfile(id: string) {
  const response = await apiClient.get(`/supporters/${id}`);
  return response.data.data;
}

// Timeline
export async function getSupporterTimeline(id: string, eventTypes?: string[]) {
  const params = new URLSearchParams();
  if (eventTypes?.length) {
    eventTypes.forEach(t => params.append('event_types', t));
  }
  const response = await apiClient.get(`/supporters/${id}/timeline?${params}`);
  return response.data.data;
}

// Admin - Merge
export async function mergeSupporters(primaryId: string, secondaryId: string) {
  const response = await apiClient.post('/admin/merge', {
    primary_supporter_id: primaryId,
    secondary_supporter_id: secondaryId,
  });
  return response.data.data;
}
```

**Step 12: Commit**

```bash
git add packages/frontend/src/services/
git commit -m "feat: add API client service"
```

---

## Task 15: Create React Query Hooks

**Files:**
- Create: `packages/frontend/src/hooks/useSupporters.ts`

**Step 1: Create hooks**

Create `packages/frontend/src/hooks/useSupporters.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';

export function useSearch(query: string, field?: string) {
  return useQuery({
    queryKey: ['search', query, field],
    queryFn: () => api.searchSupporters(query, field),
    enabled: query.length > 0,
    staleTime: 5000,
  });
}

export function useSupporterProfile(id: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.getSupporterProfile(id),
    enabled: !!id,
  });
}

export function useSupporterTimeline(id: string, eventTypes?: string[]) {
  return useQuery({
    queryKey: ['timeline', id, eventTypes],
    queryFn: () => api.getSupporterTimeline(id, eventTypes),
    enabled: !!id,
  });
}

export function useMergeSupporters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) =>
      api.mergeSupporters(primaryId, secondaryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/hooks/
git commit -m "feat: add React Query hooks"
```

---

## Task 16: Create Search Page

**Files:**
- Create: `packages/frontend/src/pages/SearchPage.tsx`
- Create: `packages/frontend/src/components/search/SearchBar.tsx`
- Create: `packages/frontend/src/components/search/SearchResultCard.tsx`

**Step 1: Create SearchBar component**

Create `packages/frontend/src/components/search/SearchBar.tsx`:

```typescript
import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, or phone..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Create SearchResultCard component**

Create `packages/frontend/src/components/search/SearchResultCard.tsx`:

```typescript
import { Link } from 'react-router-dom';
import { SearchResult } from '@supporter360/shared';

interface SearchResultCardProps {
  result: SearchResult;
}

const typeColors: Record<string, string> = {
  'Member': 'bg-blue-100 text-blue-800',
  'Season Ticket Holder': 'bg-purple-100 text-purple-800',
  'Ticket Buyer': 'bg-green-100 text-green-800',
  'Shop Buyer': 'bg-orange-100 text-orange-800',
  'Away Supporter': 'bg-red-100 text-red-800',
  'Unknown': 'bg-gray-100 text-gray-800',
};

export function SearchResultCard({ result }: SearchResultCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-GB');
  };

  return (
    <Link
      to={`/supporters/${result.supporter_id}`}
      className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">
            {result.name || 'Unknown Name'}
          </h3>
          <p className="text-gray-600">{result.email || 'No email'}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded ${typeColors[result.supporter_type] || typeColors.Unknown}`}>
          {result.supporter_type}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4 text-sm text-gray-600">
        <div>
          <span className="font-medium">Last Ticket:</span>{' '}
          {formatDate(result.last_ticket_order_date)}
        </div>
        <div>
          <span className="font-medium">Last Shop:</span>{' '}
          {formatDate(result.last_shop_order_date)}
        </div>
        <div>
          <span className="font-medium">Membership:</span>{' '}
          {result.membership_status || 'Unknown'}
        </div>
      </div>
    </Link>
  );
}
```

**Step 3: Create SearchPage**

Create `packages/frontend/src/pages/SearchPage.tsx`:

```typescript
import { useState } from 'react';
import { useSearch } from '../hooks/useSupporters';
import { SearchBar } from '../components/search/SearchBar';
import { SearchResultCard } from '../components/search/SearchResultCard';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const { data: results, isLoading, error } = useSearch(query);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Search Supporters</h2>
      <SearchBar onSearch={setQuery} loading={isLoading} />

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
          {error.message}
        </div>
      )}

      {query && results && (
        <div className="space-y-3">
          <p className="text-gray-600">{results.length} results found</p>
          {results.length > 0 ? (
            results.map((result: any) => (
              <SearchResultCard key={result.supporter_id} result={result} />
            ))
          ) : (
            <p className="text-gray-500">No supporters found matching "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add packages/frontend/src/pages/ packages/frontend/src/components/search/
git commit -m "feat: add search page with results"
```

---

## Task 17: Create Profile Page

**Files:**
- Create: `packages/frontend/src/pages/ProfilePage.tsx`
- Create: `packages/frontend/src/components/profile/ProfileHeader.tsx`
- Create: `packages/frontend/src/components/profile/TimelineTab.tsx`

**Step 1: Create ProfileHeader component**

Create `packages/frontend/src/components/profile/ProfileHeader.tsx`:

```typescript
import { SupporterProfile } from '@supporter360/shared';

interface ProfileHeaderProps {
  profile: SupporterProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {profile.name || 'Unknown Name'}
          </h2>
          <p className="text-gray-600">{profile.primary_email || 'No email'}</p>
          {profile.phone && (
            <p className="text-gray-600">{profile.phone}</p>
          )}
          {profile.emails.length > 1 && (
            <p className="text-sm text-gray-500 mt-1">
              +{profile.emails.length - 1} additional email(s)
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {profile.supporter_type}
          </span>
          {profile.flags.shared_email && (
            <span className="ml-2 inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
              Shared Email
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create TimelineTab component**

Create `packages/frontend/src/components/profile/TimelineTab.tsx`:

```typescript
import { useSupporterTimeline } from '../../hooks/useSupporters';
import { Event } from '@supporter360/shared';

interface TimelineTabProps {
  supporterId: string;
}

const eventTypeColors: Record<string, string> = {
  'TicketPurchase': 'border-green-500 bg-green-50',
  'StadiumEntry': 'border-blue-500 bg-blue-50',
  'ShopOrder': 'border-orange-500 bg-orange-50',
  'MembershipEvent': 'border-purple-500 bg-purple-50',
  'PaymentEvent': 'border-yellow-500 bg-yellow-50',
  'EmailClick': 'border-pink-500 bg-pink-50',
};

const eventTypeLabels: Record<string, string> = {
  'TicketPurchase': 'Ticket Purchase',
  'StadiumEntry': 'Stadium Entry',
  'ShopOrder': 'Shop Order',
  'MembershipEvent': 'Membership',
  'PaymentEvent': 'Payment',
  'EmailClick': 'Email Click',
};

export function TimelineTab({ supporterId }: TimelineTabProps) {
  const { data: events, isLoading } = useSupporterTimeline(supporterId);

  if (isLoading) {
    return <div className="text-gray-500">Loading timeline...</div>;
  }

  if (!events || events.length === 0) {
    return <div className="text-gray-500">No events found</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event: Event) => (
        <div
          key={event.event_id}
          className={`flex items-start p-4 rounded-lg border-l-4 ${eventTypeColors[event.event_type] || 'border-gray-500 bg-gray-50'}`}
        >
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {eventTypeLabels[event.event_type] || event.event_type}
                </h4>
                <p className="text-sm text-gray-500 capitalize">{event.source_system}</p>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(event.event_time).toLocaleString('en-GB')}
              </span>
            </div>
            {event.amount && (
              <p className="mt-1 font-medium">
                €{event.amount.toFixed(2)}
              </p>
            )}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <details className="mt-2">
                <summary className="text-sm text-gray-600 cursor-pointer">
                  Details
                </summary>
                <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create ProfilePage**

Create `packages/frontend/src/pages/ProfilePage.tsx`:

```typescript
import { useParams, useState } from 'react';
import { useSupporterProfile } from '../hooks/useSupporters';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { TimelineTab } from '../components/profile/TimelineTab';

type Tab = 'overview' | 'timeline' | 'purchases' | 'membership' | 'stadium' | 'mailchimp';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: profile, isLoading, error } = useSupporterProfile(id || '');

  if (isLoading) {
    return <div className="text-gray-500">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        {error.message}
      </div>
    );
  }

  if (!profile) {
    return <div className="text-gray-500">Profile not found</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'membership', label: 'Membership' },
    { key: 'stadium', label: 'Stadium Entry' },
    { key: 'mailchimp', label: 'Mailchimp' },
  ];

  return (
    <div>
      <ProfileHeader profile={profile} />

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'timeline' && <TimelineTab supporterId={profile.supporter_id} />}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium text-gray-700">Last Ticket Order</h3>
                <p className="text-lg font-semibold">
                  {profile.last_ticket_order
                    ? new Date(profile.last_ticket_order.event_time).toLocaleDateString('en-GB')
                    : 'Never'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium text-gray-700">Last Shop Order</h3>
                <p className="text-lg font-semibold">
                  {profile.last_shop_order
                    ? new Date(profile.last_shop_order.event_time).toLocaleDateString('en-GB')
                    : 'Never'}
                </p>
              </div>
            </div>
          )}
          {activeTab !== 'overview' && activeTab !== 'timeline' && (
            <p className="text-gray-500">Coming soon</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add packages/frontend/src/pages/ProfilePage.tsx packages/frontend/src/components/profile/
git commit -m "feat: add profile page with timeline"
```

---

## Task 18: Create Admin Page

**Files:**
- Create: `packages/frontend/src/pages/AdminPage.tsx`

**Step 1: Create AdminPage**

Create `packages/frontend/src/pages/AdminPage.tsx`:

```typescript
import { useState } from 'react';
import { useMergeSupporters } from '../hooks/useSupporters';

export function AdminPage() {
  const [primaryId, setPrimaryId] = useState('');
  const [secondaryId, setSecondaryId] = useState('');
  const mergeMutation = useMergeSupporters();

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryId || !secondaryId) {
      alert('Please enter both supporter IDs');
      return;
    }
    if (primaryId === secondaryId) {
      alert('Primary and secondary IDs must be different');
      return;
    }
    try {
      await mergeMutation.mutateAsync({ primaryId, secondaryId });
      alert('Supporters merged successfully');
      setPrimaryId('');
      setSecondaryId('');
    } catch (error) {
      alert(`Merge failed: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Admin Panel</h2>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Merge Supporters</h3>
        <form onSubmit={handleMerge} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Supporter ID (to keep)
            </label>
            <input
              type="text"
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="UUID of supporter to keep"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Supporter ID (to merge)
            </label>
            <input
              type="text"
              value={secondaryId}
              onChange={(e) => setSecondaryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="UUID of supporter to merge"
            />
          </div>
          <button
            type="submit"
            disabled={mergeMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {mergeMutation.isPending ? 'Merging...' : 'Merge Supporters'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Audit Log</h3>
        <p className="text-gray-500">Coming soon</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/pages/AdminPage.tsx
git commit -m "feat: add admin page with merge functionality"
```

---

## Task 19: Update Root Workspace

**Files:**
- Modify: `package.json`

**Step 1: Add frontend to workspaces**

Update root `package.json` to ensure frontend is included:

```json
{
  "name": "supporter360",
  "version": "1.0.0",
  "description": "Supporter 360 - Single pane of glass for Shamrock Rovers supporter data",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "dev:frontend": "npm run dev --workspace=@supporter360/frontend"
  }
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add frontend workspace script"
```

---

## Task 20: Create Environment Configuration Template

**Files:**
- Create: `.env.example`

**Step 1: Create env template**

Create `.env.example`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supporter360
DB_USER=postgres
DB_PASSWORD=
DB_SSL=false

# AWS
AWS_REGION=eu-west-1

# SQS Queue URLs (set by CDK)
SHOPIFY_QUEUE_URL=
STRIPE_QUEUE_URL=
GOCARDLESS_QUEUE_URL=
FUTURE_TICKETING_QUEUE_URL=
MAILCHIMP_QUEUE_URL=

# S3
RAW_PAYLOADS_BUCKET=

# Future Ticketing
FUTURE_TICKETING_API_URL=
FUTURE_TICKETING_API_KEY=

# Mailchimp
MAILCHIMP_API_KEY=
MAILCHIMP_DC=us1

# Frontend
VITE_API_URL=
VITE_API_KEY=
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add environment configuration template"
```

---

## Task 21: Create Deployment Documentation

**Files:**
- Create: `docs/deployment.md`

**Step 1: Create deployment guide**

Create `docs/deployment.md`:

```markdown
# Deployment Guide

## Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK installed: `npm install -g aws-cdk`
- PostgreSQL 15+

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (first time only)

```bash
cd packages/infrastructure
npx cdk bootstrap
```

### 3. Configure Secrets

Create secrets in AWS Secrets Manager:

```bash
aws secretsmanager create-secret --name supporter360/db-password --secret-string "your-password"
aws secretsmanager create-secret --name future-ticketing/api-key --secret-string "your-ft-key"
aws secretsmanager create-secret --name mailchimp/api-key --secret-string "your-mailchimp-key"
```

### 4. Deploy Infrastructure

```bash
cd packages/infrastructure
npx cdk deploy
```

Note the following outputs:
- API Gateway URL
- Database endpoint
- Frontend URL

### 5. Run Database Migrations

```bash
psql -h <DB_HOST> -U <DB_USER> -d supporter360 -f packages/database/schema.sql
```

### 6. Configure Webhooks

**Shopify:**
- Admin → Settings → Notifications → Webhooks
- Add webhook: `{API_URL}/webhooks/shopify`

**Stripe:**
- Dashboard → Developers → Webhooks
- Add endpoint: `{API_URL}/webhooks/stripe`

**GoCardless:**
- Dashboard → Developers → Webhooks
- Add endpoint: `{API_URL}/webhooks/gocardless`

**Mailchimp:**
- Audience → Settings → Webhooks
- Add endpoint: `{API_URL}/webhooks/mailchimp`

### 7. Build and Deploy Frontend

```bash
cd packages/frontend
npm run build
aws s3 sync dist/ s3://supporter360-frontend-{ACCOUNT_ID}
```

## Environment Variables

Set these in Lambda function environment or `.env` for local development.

See `.env.example` for full list.

## Monitoring

- CloudWatch Logs: `/aws/lambda/*`
- CloudWatch Metrics: API Gateway, Lambda
- DLQs: Check for failed events

## Troubleshooting

**Events in DLQ:**
- View in SQS Console
- Check CloudWatch Logs for error details
- Replay after fixing issue

**Frontend not loading:**
- Check CloudFront distribution
- Verify S3 bucket contents
- Check API Gateway URL in VITE_API_URL
```

**Step 2: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: add deployment guide"
```

---

## End of Implementation Plan

All tasks are now documented. Run `git log` to review commits.

To execute this plan:
1. Use `superpowers:executing-plans` in a new session
2. Or use `superpowers:subagent-driven-development` in this session for task-by-task execution with review
