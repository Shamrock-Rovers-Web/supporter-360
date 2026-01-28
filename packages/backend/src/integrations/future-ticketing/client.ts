/**
 * Future Ticketing Integration Client
 *
 * Provides methods to poll the Future Ticketing system for customer, order,
 * and stadium entry data. Supports incremental polling with exponential backoff retry.
 *
 * Note: This client is designed for API access. If Future Ticketing does not
 * provide an API, it can be adapted for SFTP file downloads or screen scraping.
 */

import type {
  FTCustomer,
  FTOrder,
  FTStadiumEntry,
  FTProduct,
  FTApiResponse,
  FTConfig,
} from './types.js';

export interface FutureTicketingClientOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  pageSize?: number;
}

/**
 * Future Ticketing API Client
 */
export class FutureTicketingClient {
  private config: FTConfig;
  private options: Required<FutureTicketingClientOptions>;
  private baseUrl: string;

  constructor(config: FTConfig, options: FutureTicketingClientOptions = {}) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || 'v1',
    };
    this.options = {
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 5,
      retryDelay: options.retryDelay || 1000,
      pageSize: options.pageSize || 100,
    };
    this.baseUrl = this.config.apiUrl.replace(/\/$/, '');
  }

  /**
   * Get customers created or modified since a given date
   * @param since - ISO 8601 date string (optional)
   * @param page - Page number for pagination (default: 1)
   * @returns Array of customers
   */
  async getCustomers(since?: string, page: number = 1): Promise<FTCustomer[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: this.options.pageSize.toString(),
    });

    if (since) {
      params.set('modifiedSince', since);
    }

    const response = await this.requestWithRetry<FTApiResponse<FTCustomer>>(
      `/customers?${params.toString()}`
    );

    // Handle both array and paginated response formats
    if (Array.isArray(response)) {
      return response;
    }

    if (response.data && Array.isArray(response.data)) {
      // If there are more pages, fetch them recursively
      if (response.pagination?.hasMore && page < 10) {
        const nextPage = await this.getCustomers(since, page + 1);
        return [...response.data, ...nextPage];
      }
      return response.data;
    }

    return [];
  }

  /**
   * Get a specific customer by ID
   * @param customerId - The Future Ticketing customer ID
   * @returns The customer or null if not found
   */
  async getCustomer(customerId: string): Promise<FTCustomer | null> {
    try {
      const response = await this.requestWithRetry<FTCustomer>(
        `/customers/${encodeURIComponent(customerId)}`
      );
      return response;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Find customers by email address
   * @param email - The customer email address
   * @returns Array of matching customers
   */
  async findCustomersByEmail(email: string): Promise<FTCustomer[]> {
    const params = new URLSearchParams({
      email: email.toLowerCase(),
    });

    const response = await this.requestWithRetry<FTApiResponse<FTCustomer>>(
      `/customers/search?${params.toString()}`
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.data || [];
  }

  /**
   * Get orders created or modified since a given date
   * @param since - ISO 8601 date string (optional)
   * @param page - Page number for pagination (default: 1)
   * @returns Array of orders
   */
  async getOrders(since?: string, page: number = 1): Promise<FTOrder[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: this.options.pageSize.toString(),
    });

    if (since) {
      params.set('sinceDate', since);
    }

    const response = await this.requestWithRetry<FTApiResponse<FTOrder>>(
      `/orders?${params.toString()}`
    );

    // Handle both array and paginated response formats
    if (Array.isArray(response)) {
      return response;
    }

    if (response.data && Array.isArray(response.data)) {
      // If there are more pages, fetch them recursively
      if (response.pagination?.hasMore && page < 10) {
        const nextPage = await this.getOrders(since, page + 1);
        return [...response.data, ...nextPage];
      }
      return response.data;
    }

    return [];
  }

  /**
   * Get a specific order by ID
   * @param orderId - The Future Ticketing order ID
   * @returns The order or null if not found
   */
  async getOrder(orderId: string): Promise<FTOrder | null> {
    try {
      const response = await this.requestWithRetry<FTOrder>(
        `/orders/${encodeURIComponent(orderId)}`
      );
      return response;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get orders for a specific customer
   * @param customerId - The customer ID
   * @param since - Optional date filter for orders since this date
   * @returns Array of orders
   */
  async getCustomerOrders(customerId: string, since?: string): Promise<FTOrder[]> {
    const params = new URLSearchParams({
      customerId,
    });

    if (since) {
      params.set('sinceDate', since);
    }

    const response = await this.requestWithRetry<FTApiResponse<FTOrder>>(
      `/orders?${params.toString()}`
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.data || [];
  }

  /**
   * Get stadium entries/scans since a given date
   * @param since - ISO 8601 date string (optional)
   * @param page - Page number for pagination (default: 1)
   * @returns Array of stadium entries
   */
  async getStadiumEntries(since?: string, page: number = 1): Promise<FTStadiumEntry[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: this.options.pageSize.toString(),
    });

    if (since) {
      params.set('sinceDate', since);
    }

    const response = await this.requestWithRetry<FTApiResponse<FTStadiumEntry>>(
      `/entries?${params.toString()}`
    );

    // Handle both array and paginated response formats
    if (Array.isArray(response)) {
      return response;
    }

    if (response.data && Array.isArray(response.data)) {
      // If there are more pages, fetch them recursively
      if (response.pagination?.hasMore && page < 10) {
        const nextPage = await this.getStadiumEntries(since, page + 1);
        return [...response.data, ...nextPage];
      }
      return response.data;
    }

    return [];
  }

  /**
   * Get stadium entries for a specific customer
   * @param customerId - The customer ID
   * @param since - Optional date filter
   * @returns Array of stadium entries
   */
  async getCustomerEntries(customerId: string, since?: string): Promise<FTStadiumEntry[]> {
    const params = new URLSearchParams({
      customerId,
    });

    if (since) {
      params.set('sinceDate', since);
    }

    const response = await this.requestWithRetry<FTApiResponse<FTStadiumEntry>>(
      `/entries?${params.toString()}`
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.data || [];
  }

  /**
   * Get all available products
   * @param page - Page number for pagination (default: 1)
   * @returns Array of products
   */
  async getProducts(page: number = 1): Promise<FTProduct[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: this.options.pageSize.toString(),
    });

    const response = await this.requestWithRetry<FTApiResponse<FTProduct>>(
      `/products?${params.toString()}`
    );

    // Handle both array and paginated response formats
    if (Array.isArray(response)) {
      return response;
    }

    if (response.data && Array.isArray(response.data)) {
      // If there are more pages, fetch them recursively
      if (response.pagination?.hasMore && page < 10) {
        const nextPage = await this.getProducts(page + 1);
        return [...response.data, ...nextPage];
      }
      return response.data;
    }

    return [];
  }

  /**
   * Get events/matches
   * @param since - Optional date filter for events since this date
   * @param page - Page number for pagination
   * @returns Array of events
   */
  async getEvents(since?: string, page: number = 1): Promise<any[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: this.options.pageSize.toString(),
    });

    if (since) {
      params.set('sinceDate', since);
    }

    try {
      const response = await this.requestWithRetry<FTApiResponse<any>>(
        `/events?${params.toString()}`
      );

      if (Array.isArray(response)) {
        return response;
      }

      if (response.data && Array.isArray(response.data)) {
        if (response.pagination?.hasMore && page < 10) {
          const nextPage = await this.getEvents(since, page + 1);
          return [...response.data, ...nextPage];
        }
        return response.data;
      }

      return [];
    } catch (error) {
      // Events endpoint might not be available
      return [];
    }
  }

  /**
   * Health check to verify FT API is accessible
   * @returns True if API is accessible, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.requestWithRetry<Record<string, unknown>>('/health', 'GET', 5000);
      return true;
    } catch {
      // Try alternative health endpoint
      try {
        await this.requestWithRetry<Record<string, unknown>>('/status', 'GET', 5000);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Make an authenticated request with retry logic
   */
  private async requestWithRetry<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    timeout?: number
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const effectiveTimeout = timeout || this.options.timeout;
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle 404 gracefully
        if (response.status === 404) {
          throw new FutureTicketingApiError('Resource not found', 404);
        }

        if (!response.ok) {
          // Handle rate limiting and service unavailable
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

          const errorText = await response.text();
          throw new FutureTicketingApiError(
            `Future Ticketing API error: ${response.status} - ${errorText}`,
            response.status
          );
        }

        const data = await response.json() as { success?: boolean; message?: string } & T;

        // Handle different response formats
        if (data.success === false) {
          throw new FutureTicketingApiError(
            data.message || 'API request failed',
            response.status
          );
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (except 429)
        if (
          error instanceof FutureTicketingApiError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        ) {
          throw error;
        }

        // Retry on network errors or 5xx
        if (attempt < this.options.retryAttempts - 1) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw (
      lastError ||
      new FutureTicketingApiError('Request failed after multiple attempts', 0)
    );
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 2^attempt * baseDelay, with jitter
    const baseDelay = this.options.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
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
    return error instanceof FutureTicketingApiError && error.status === 404;
  }
}

/**
 * Custom error class for Future Ticketing API errors
 */
export class FutureTicketingApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'FutureTicketingApiError';
  }
}

/**
 * Factory function to create a configured Future Ticketing client from environment variables
 */
export function createFutureTicketingClient(): FutureTicketingClient {
  const apiUrl = process.env.FUTURE_TICKETING_API_URL;
  const apiKey = process.env.FUTURE_TICKETING_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error(
      'Missing Future Ticketing configuration: FUTURE_TICKETING_API_URL and FUTURE_TICKETING_API_KEY are required'
    );
  }

  return new FutureTicketingClient({
    apiUrl,
    apiKey,
  });
}

// Export types
export type {
  FTCustomer,
  FTOrder,
  FTStadiumEntry,
  FTProduct,
  FTConfig,
};
