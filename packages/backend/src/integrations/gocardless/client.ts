/**
 * GoCardless Integration Client
 *
 * Provides methods to interact with the GoCardless API and verify webhooks.
 * API Documentation: https://developer.gocardless.com/api-reference
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  GCCustomer,
  GCPayment,
  GCMandate,
  GCSubscription,
  GCListResponse,
  GCWebhookEvent,
} from './types.js';

export interface GoCardlessConfig {
  accessToken: string;
  environment?: 'sandbox' | 'live';
}

export interface GoCardlessClientOptions {
  timeout?: number;
  retryAttempts?: number;
}

/**
 * GoCardless API Client
 */
export class GoCardlessClient {
  private config: GoCardlessConfig;
  private options: Required<GoCardlessClientOptions>;
  private baseUrl: string;

  constructor(config: GoCardlessConfig, options: GoCardlessClientOptions = {}) {
    this.config = {
      ...config,
      environment: config.environment || 'sandbox',
    };
    this.options = {
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
    };
    this.baseUrl =
      this.config.environment === 'live'
        ? 'https://api.gocardless.com'
        : 'https://api-sandbox.gocardless.com';
  }

  /**
   * Get a customer by ID
   * @param customerId - The GoCardless customer ID
   * @returns The customer object or null if not found
   */
  async getCustomer(customerId: string): Promise<GCCustomer | null> {
    try {
      const response = await this.request<{ customers: GCCustomer[] }>(
        `/customers/${encodeURIComponent(customerId)}`
      );
      return response.customers?.[0] || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List customers with optional pagination
   * @param limit - Number of records per page (default: 50, max: 500)
   * @param after - Cursor for pagination (fetch records after this cursor)
   * @returns List of customers
   */
  async listCustomers(limit: number = 50, after?: string): Promise<{
    customers: GCCustomer[];
    meta?: { cursors?: { before?: string; after?: string } };
  }> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 500).toString(),
    });

    if (after) {
      params.set('after', after);
    }

    const response = await this.request<GCListResponse<GCCustomer>>(
      `/customers?${params.toString()}`
    );

    return {
      customers: response.customers || [],
      meta: response.meta,
    };
  }

  /**
   * Get a payment by ID
   * @param paymentId - The GoCardless payment ID
   * @returns The payment object or null if not found
   */
  async getPayment(paymentId: string): Promise<GCPayment | null> {
    try {
      const response = await this.request<{ payments: GCPayment[] }>(
        `/payments/${encodeURIComponent(paymentId)}`
      );
      return response.payments?.[0] || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List payments for a customer
   * @param customerId - The GoCardless customer ID
   * @param limit - Number of records per page (default: 50, max: 500)
   * @param after - Cursor for pagination
   * @returns List of payments with pagination metadata
   */
  async listPayments(
    customerId?: string,
    limit: number = 50,
    after?: string
  ): Promise<{
    payments: GCPayment[];
    meta?: { cursors?: { before?: string; after?: string } };
  }> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 500).toString(),
    });

    if (customerId) {
      params.set('customer', customerId);
    }

    if (after) {
      params.set('after', after);
    }

    const response = await this.request<GCListResponse<GCPayment>>(
      `/payments?${params.toString()}`
    );

    return {
      payments: response.payments || [],
      meta: response.meta,
    };
  }

  /**
   * List payments created or updated after a given date
   * @param since - ISO 8601 date string
   * @param limit - Number of records per page
   * @returns List of payments with pagination metadata
   */
  async listPaymentsSince(
    since: string,
    limit: number = 50
  ): Promise<{
    payments: GCPayment[];
    meta?: { cursors?: { before?: string; after?: string } };
  }> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 500).toString(),
      'created_at[gt]': since,
    });

    const response = await this.request<GCListResponse<GCPayment>>(
      `/payments?${params.toString()}`
    );

    return {
      payments: response.payments || [],
      meta: response.meta,
    };
  }

  /**
   * Get a mandate by ID
   * @param mandateId - The GoCardless mandate ID
   * @returns The mandate object or null if not found
   */
  async getMandate(mandateId: string): Promise<GCMandate | null> {
    try {
      const response = await this.request<{ mandates: GCMandate[] }>(
        `/mandates/${encodeURIComponent(mandateId)}`
      );
      return response.mandates?.[0] || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List mandates for a customer
   * @param customerId - The GoCardless customer ID
   * @param limit - Number of records per page
   * @param after - Cursor for pagination
   * @returns List of mandates with pagination metadata
   */
  async listMandates(
    customerId?: string,
    limit: number = 50,
    after?: string
  ): Promise<{
    mandates: GCMandate[];
    meta?: { cursors?: { before?: string; after?: string } };
  }> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 500).toString(),
    });

    if (customerId) {
      params.set('customer', customerId);
    }

    if (after) {
      params.set('after', after);
    }

    const response = await this.request<GCListResponse<GCMandate>>(
      `/mandates?${params.toString()}`
    );

    return {
      mandates: response.mandates || [],
      meta: response.meta,
    };
  }

  /**
   * Get a subscription by ID
   * @param subscriptionId - The GoCardless subscription ID
   * @returns The subscription object or null if not found
   */
  async getSubscription(subscriptionId: string): Promise<GCSubscription | null> {
    try {
      const response = await this.request<{ subscriptions: GCSubscription[] }>(
        `/subscriptions/${encodeURIComponent(subscriptionId)}`
      );
      return response.subscriptions?.[0] || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List subscriptions for a customer
   * @param customerId - The GoCardless customer ID
   * @param limit - Number of records per page
   * @param after - Cursor for pagination
   * @returns List of subscriptions with pagination metadata
   */
  async listSubscriptions(
    customerId: string,
    limit: number = 50,
    after?: string
  ): Promise<{
    subscriptions: GCSubscription[];
    meta?: { cursors?: { before?: string; after?: string } };
  }> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 500).toString(),
      customer: customerId,
    });

    if (after) {
      params.set('after', after);
    }

    const response = await this.request<GCListResponse<GCSubscription>>(
      `/subscriptions?${params.toString()}`
    );

    return {
      subscriptions: response.subscriptions || [],
      meta: response.meta,
    };
  }

  /**
   * Cancel a subscription
   * @param subscriptionId - The subscription ID
   * @returns The cancelled subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<GCSubscription> {
    const response = await this.request<{ subscriptions: GCSubscription[] }>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/actions/cancel`,
      'POST'
    );
    return response.subscriptions[0];
  }

  /**
   * Verify a GoCardless webhook signature
   * @param requestBody - The raw webhook payload as a string
   * @param signature - The signature from the Webhook-Signature header
   * @param secret - The webhook secret
   * @returns True if the signature is valid, false otherwise
   */
  verifyWebhook(requestBody: string, signature: string, secret: string): boolean {
    // GoCardless webhook signatures are in the format: "sha256 {signature}"
    // Extract the signature part
    const match = signature.match(/^sha256 (.+)$/);
    if (!match) {
      return false;
    }

    const providedSignature = match[1];

    // Compute HMAC SHA-256
    const hmac = createHmac('sha256', secret);
    hmac.update(requestBody);
    const computedSignature = hmac.digest('hex');

    // Use timing-safe comparison
    const providedBuffer = Buffer.from(providedSignature);
    const computedBuffer = Buffer.from(computedSignature);

    if (providedBuffer.length !== computedBuffer.length) {
      return false;
    }

    try {
      return timingSafeEqual(providedBuffer, computedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Verify webhook and parse the payload
   * @param requestBody - The raw webhook payload
   * @param signature - The Webhook-Signature header
   * @param secret - The webhook secret
   * @returns The parsed webhook events or null if invalid
   */
  parseWebhook(
    requestBody: string,
    signature: string,
    secret: string
  ): { valid: boolean; events: GCWebhookEvent[] | null; error?: string } {
    if (!this.verifyWebhook(requestBody, signature, secret)) {
      return { valid: false, events: null, error: 'Invalid webhook signature' };
    }

    try {
      const payload = JSON.parse(requestBody) as { events?: GCWebhookEvent[] };
      if (!payload.events || !Array.isArray(payload.events)) {
        return { valid: false, events: null, error: 'Invalid webhook payload' };
      }

      return { valid: true, events: payload.events };
    } catch {
      return { valid: false, events: null, error: 'Invalid JSON payload' };
    }
  }

  /**
   * Make an authenticated request to the GoCardless API
   */
  private async request<T>(endpoint: string, method: 'GET' | 'POST' = 'GET'): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
            'GoCardless-Version': '2015-07-06',
          },
          signal: controller.signal,
          body: method === 'POST' ? '{}' : undefined,
        } as RequestInit);

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429 || response.status === 503) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : this.calculateBackoff(attempt);

            if (attempt < this.options.retryAttempts - 1) {
              await this.sleep(delay);
              continue;
            }
          }

          const error = await response.text();
          throw new GoCardlessApiError(
            `GoCardless API error: ${response.status} - ${error}`,
            response.status
          );
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (except 429)
        if (
          error instanceof GoCardlessApiError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        ) {
          throw error;
        }

        // Retry on network errors or 5xx
        if (attempt < this.options.retryAttempts - 1) {
          await this.sleep(this.calculateBackoff(attempt));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 2^attempt * 100ms, with jitter
    const baseDelay = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 100;
    return Math.min(baseDelay + jitter, 5000); // Cap at 5 seconds
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is a "not found" error
   */
  private isNotFoundError(error: unknown): boolean {
    return error instanceof GoCardlessApiError && error.status === 404;
  }
}

/**
 * Custom error class for GoCardless API errors
 */
export class GoCardlessApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'GoCardlessApiError';
  }
}

/**
 * Factory function to create a configured GoCardless client from environment variables
 */
export function createGoCardlessClient(): GoCardlessClient {
  const accessToken = process.env.GOCARDLESS_ACCESS_TOKEN;
  const environment = (process.env.GOCARDLESS_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox';

  if (!accessToken) {
    throw new Error('Missing GoCardless configuration: GOCARDLESS_ACCESS_TOKEN is required');
  }

  return new GoCardlessClient({ accessToken, environment });
}

/**
 * Factory function to get the GoCardless webhook secret from environment variables
 */
export function createGoCardlessWebhookSecret(): string {
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('Missing GoCardless configuration: GOCARDLESS_WEBHOOK_SECRET is required');
  }

  return secret;
}

// Export types
export type {
  GCCustomer,
  GCPayment,
  GCMandate,
  GCSubscription,
  GCWebhookEvent,
};
