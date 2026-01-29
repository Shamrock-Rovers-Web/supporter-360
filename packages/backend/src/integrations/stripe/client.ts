/**
 * Stripe Integration Client
 *
 * Provides methods to interact with the Stripe API and verify webhooks.
 * API Documentation: https://stripe.com/docs/api
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  StripeCustomer,
  StripePaymentIntent,
  StripeCharge,
  StripeListResponse,
  StripeEvent,
} from './types.js';

export interface StripeConfig {
  apiKey: string;
  apiVersion?: string;
}

export interface StripeClientOptions {
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Stripe API Client
 */
export class StripeClient {
  private config: StripeConfig;
  private options: Required<StripeClientOptions>;
  private baseUrl: string;

  constructor(config: StripeConfig, options: StripeClientOptions = {}) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || 'v1',
    };
    this.options = {
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
    };
    this.baseUrl = `https://api.stripe.com/${this.config.apiVersion}`;
  }

  /**
   * Get the API mode (test or live) based on the API key
   * @returns 'test' or 'live'
   */
  getApiMode(): 'test' | 'live' {
    return this.config.apiKey.startsWith('sk_test_') ? 'test' : 'live';
  }

  /**
   * Get a customer by ID
   * @param customerId - The Stripe customer ID
   * @returns The customer object or null if not found
   */
  async getCustomer(customerId: string): Promise<StripeCustomer | null> {
    try {
      const response = await this.request<{ customer?: StripeCustomer }>(
        `/customers/${encodeURIComponent(customerId)}`
      );
      return response.customer || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search for a customer by email
   * @param email - The customer email address
   * @returns Array of matching customers
   */
  async findCustomerByEmail(email: string): Promise<StripeCustomer[]> {
    try {
      const response = await this.request<{ data: StripeCustomer[] }>(
        `/customers/search?query=${encodeURIComponent('email:\'' + email + '\'')}`
      );
      return response.data;
    } catch (error) {
      // Search endpoint might not be enabled, fall back to list
      return this.listCustomers({ email, limit: 10 });
    }
  }

  /**
   * List customers with optional filters
   * @param filters - Optional filters
   * @returns List of customers
   */
  async listCustomers(filters?: {
    email?: string;
    limit?: number;
    startingAfter?: string;
  }): Promise<StripeCustomer[]> {
    const params = new URLSearchParams();
    if (filters?.email) params.set('email', filters.email);
    if (filters?.limit) params.set('limit', Math.min(filters.limit, 100).toString());
    if (filters?.startingAfter) params.set('starting_after', filters.startingAfter);

    const queryString = params.toString();
    const response = await this.request<StripeListResponse<StripeCustomer>>(
      `/customers${queryString ? '?' + queryString : ''}`
    );
    return response.data;
  }

  /**
   * Get a payment intent by ID
   * @param paymentIntentId - The payment intent ID
   * @returns The payment intent object or null if not found
   */
  async getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent | null> {
    try {
      const response = await this.request<{ payment_intent?: StripePaymentIntent }>(
        `/payment_intents/${encodeURIComponent(paymentIntentId)}`
      );
      return response.payment_intent || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List charges for a customer
   * @param customerId - The customer ID
   * @param limit - Maximum number of charges to return (default: 100, max: 100)
   * @returns Array of charges
   */
  async listCharges(customerId: string, limit: number = 100): Promise<StripeCharge[]> {
    const params = new URLSearchParams({
      customer: customerId,
      limit: Math.min(limit, 100).toString(),
    });

    const response = await this.request<StripeListResponse<StripeCharge>>(
      `/charges?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get a specific charge by ID
   * @param chargeId - The charge ID
   * @returns The charge object or null if not found
   */
  async getCharge(chargeId: string): Promise<StripeCharge | null> {
    try {
      const response = await this.request<{ charge?: StripeCharge }>(
        `/charges/${encodeURIComponent(chargeId)}`
      );
      return response.charge || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List charges created after a given timestamp
   * @param createdAfter - Unix timestamp
   * @param limit - Maximum number of charges to return
   * @returns Array of charges
   */
  async listChargesSince(createdAfter: number, limit: number = 100): Promise<StripeCharge[]> {
    const params = new URLSearchParams({
      'gt[created]': createdAfter.toString(),
      limit: Math.min(limit, 100).toString(),
    });

    const response = await this.request<StripeListResponse<StripeCharge>>(
      `/charges?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Verify a Stripe webhook signature
   * @param payload - The raw request body as a buffer or string
   * @param signature - The signature from the Stripe-Signature header
   * @param secret - The webhook secret (endpoint secret)
   * @returns The verified event object or null if verification fails
   */
  verifyWebhook(payload: Buffer | string, signature: string, secret: string): StripeEvent | null {
    // Ensure payload is a buffer for consistent hashing
    const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);

    // Extract timestamp and signature from the Stripe-Signature header
    const signatureElements = signature.split(',');
    let timestamp = '';
    let expectedSignature = '';

    for (const element of signatureElements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        expectedSignature = value;
      }
    }

    if (!timestamp || !expectedSignature) {
      return null;
    }

    // Check timestamp to prevent replay attacks (tolerate 5 minutes skew)
    const now = Math.floor(Date.now() / 1000);
    const timestampAge = now - parseInt(timestamp, 10);
    if (Math.abs(timestampAge) > 300) { // 5 minutes
      return null;
    }

    // Construct the signed payload
    const signedPayload = `${timestamp}.${payloadBuffer.toString('utf-8')}`;

    // Compute HMAC SHA-256
    const hmac = createHmac('sha256', secret);
    hmac.update(signedPayload);
    const computedSignature = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature);
    const computedBuffer = Buffer.from(computedSignature);

    if (expectedBuffer.length !== computedBuffer.length) {
      return null;
    }

    try {
      if (!timingSafeEqual(expectedBuffer, computedBuffer)) {
        return null;
      }
    } catch {
      return null;
    }

    // Signature is valid, parse the payload
    try {
      return JSON.parse(payloadBuffer.toString('utf-8')) as StripeEvent;
    } catch {
      return null;
    }
  }

  /**
   * Verify webhook and return the event with type checking
   * @param payload - The raw request body
   * @param signature - The Stripe-Signature header
   * @param secret - The webhook signing secret
   * @param allowedTypes - Optional list of allowed event types
   * @returns The verified event or null
   */
  verifyAndParseWebhook(
    payload: Buffer | string,
    signature: string,
    secret: string,
    allowedTypes?: string[]
  ): StripeEvent | null {
    const event = this.verifyWebhook(payload, signature, secret);

    if (!event) {
      return null;
    }

    // Check if event type is allowed
    if (allowedTypes && !allowedTypes.includes(event.type)) {
      return null;
    }

    return event;
  }

  /**
   * Make an authenticated request to the Stripe API
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Stripe-Version': this.config.apiVersion || '2023-10-16',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : this.calculateBackoff(attempt);

            if (attempt < this.options.retryAttempts - 1) {
              await this.sleep(delay);
              continue;
            }
          }

          const error = await response.text();
          throw new StripeApiError(
            `Stripe API error: ${response.status} - ${error}`,
            response.status
          );
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (except 429)
        if (error instanceof StripeApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
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
    return error instanceof StripeApiError && error.status === 404;
  }
}

/**
 * Custom error class for Stripe API errors
 */
export class StripeApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'StripeApiError';
  }
}

/**
 * Factory function to create a configured Stripe client from environment variables
 */
export function createStripeClient(): StripeClient {
  const apiKey = process.env.STRIPE_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Stripe configuration: STRIPE_API_KEY is required');
  }

  return new StripeClient({ apiKey });
}

/**
 * Factory function to create a configured Stripe webhook verifier from environment variables
 */
export function createStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('Missing Stripe configuration: STRIPE_WEBHOOK_SECRET is required');
  }

  return secret;
}

// Export types
export type { StripeCustomer, StripePaymentIntent, StripeCharge, StripeEvent };
