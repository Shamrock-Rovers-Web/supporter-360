/**
 * Future Ticketing Integration Client
 *
 * API Documentation: https://external.futureticketing.ie/v1/
 * Base URL: https://external.futureticketing.ie/v1/private/
 *
 * Provides methods to poll the Future Ticketing system for accounts, orders,
 * events, and products. Supports incremental polling with exponential backoff retry.
 */

import type {
  FTAccount,
  FTAccountExpanded,
  FTOrder,
  FTProduct,
  FTEvent,
  FTApiResponse,
  FTConfig,
  FTStadiumEntry,
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
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

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
   * Get or fetch OAuth bearer token
   * Tokens are cached until they expire (default 1 hour)
   */
  private async getBearerToken(): Promise<string> {
    // Return cached token if still valid
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    if (!this.config.privateKey) {
      // If no private key, assume apiKey is already a bearer token
      return this.config.apiKey;
    }

    // Exchange API key + private key for bearer token
    const tokenUrl = `${this.baseUrl}/oauth/token/${this.config.apiKey}/${this.config.privateKey}`;

    const response = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new FutureTicketingApiError(
        `Failed to get OAuth token: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json() as { token?: string };
    if (!data.token) {
      throw new FutureTicketingApiError('No token in OAuth response', 0);
    }

    // Cache token for 55 minutes (tokens typically valid for 1 hour)
    this.cachedToken = data.token;
    this.tokenExpiry = Date.now() + 55 * 60 * 1000;

    return this.cachedToken;
  }

  /**
   * Get all accounts with optional filtering
   * @param options - Optional filters for the account list
   * @returns Paginated list of accounts
   */
  async getAccounts(options: {
    page?: number;
    startDate?: string;
    endDate?: string;
    updatedSince?: string;
    email?: string;
    expand?: string[];
  } = {}): Promise<FTApiResponse<FTAccountExpanded>> {
    const params: string[] = [];

    if (options.startDate) params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    if (options.endDate) params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    if (options.updatedSince) params.push(`updated_since=${encodeURIComponent(options.updatedSince)}`);
    if (options.email) params.push(`email=${encodeURIComponent(options.email)}`);
    if (options.expand?.length) {
      params.push(`expand=${encodeURIComponent(JSON.stringify(options.expand))}`);
    }

    const page = options.page || 1;
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';

    // Use POST for filters, GET for simple pagination
    const usePost = options.startDate || options.endDate || options.updatedSince || options.email || options.expand?.length;
    const endpoint = `/v1/private/account${usePost ? '' : `/${page}/${this.options.pageSize}`}`;

    if (usePost) {
      const body: Record<string, unknown> = {};
      if (options.startDate) body.start_date = options.startDate;
      if (options.endDate) body.end_date = options.endDate;
      if (options.updatedSince) body.updated_since = options.updatedSince;
      if (options.email) body.email = options.email;
      if (options.expand?.length) body.expand = options.expand;
      if (options.page) body.page = options.page;

      return this.requestWithRetry<FTApiResponse<FTAccountExpanded>>(
        endpoint,
        'POST',
        body
      );
    }

    return this.requestWithRetry<FTApiResponse<FTAccountExpanded>>(endpoint);
  }

  /**
   * Get a specific account by ID
   * @param accountId - The Future Ticketing account ID
   * @returns The account or null if not found
   */
  async getAccount(accountId: string): Promise<FTAccount | null> {
    try {
      const response = await this.requestWithRetry<FTApiResponse<FTAccount>>(
        `/v1/private/account/id/${accountId}`
      );
      return response.data?.[0] || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get orders by date range (for incremental sync)
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @param options - Additional options like page, validOrder, etc.
   * @returns Paginated list of orders
   */
  async getOrdersByDate(
    startDate: string,
    endDate: string,
    options: {
      page?: number;
      validOrder?: boolean;
      expand?: string[];
    } = {}
  ): Promise<FTApiResponse<FTOrder>> {
    const page = options.page || 1;
    const params: string[] = [];

    if (options.validOrder) params.push(`/${options.validOrder ? 1 : 0}`);

    let endpoint = `/v1/private/order/search/date/${startDate}/${endDate}`;
    if (params.length) {
      endpoint += params.join('');
    }
    endpoint += `/${page}/${this.options.pageSize}`;

    return this.requestWithRetry<FTApiResponse<FTOrder>>(endpoint);
  }

  /**
   * Get orders by event ID
   * @param eventId - The Future Ticketing event ID
   * @param options - Additional options like page
   * @returns Paginated list of orders
   */
  async getOrdersByEvent(
    eventId: string,
    options: { page?: number } = {}
  ): Promise<FTApiResponse<FTOrder>> {
    const page = options.page || 1;
    const endpoint = `/v1/private/order/search/event/${eventId}/${page}/${this.options.pageSize}`;

    return this.requestWithRetry<FTApiResponse<FTOrder>>(endpoint);
  }

  /**
   * Get orders by email address
   * @param email - The email address to search for
   * @returns List of orders for the email
   */
  async getOrdersByEmail(email: string): Promise<FTOrder[]> {
    const endpoint = `/v1/private/order/search/email/${encodeURIComponent(email)}`;

    const response = await this.requestWithRetry<FTApiResponse<FTOrder>>(endpoint);
    return response.data || [];
  }

  /**
   * Get a specific order by ID
   * @param orderId - The Future Ticketing order ID
   * @returns The order or null if not found
   */
  async getOrder(orderId: string): Promise<FTOrder | null> {
    try {
      const response = await this.requestWithRetry<FTApiResponse<FTOrder>>(
        `/v1/private/order/search/id/${orderId}`
      );
      return response.data?.[0] || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search orders with complex filters using POST
   * @param filters - Search filters
   * @returns Paginated list of orders
   */
  async searchOrders(filters: {
    orderId?: number;
    orderUuid?: string;
    email?: string;
    accountId?: number;
    firstName?: string;
    secondName?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    updatedSince?: string;
    orderStatusId?: number | number[];
    validOrder?: boolean;
    barcode?: string;
    externalBarcode?: string;
    externalCode?: string;
    eventId?: number;
    productCategoryId?: number;
    expand?: string[];
    page?: number;
  } = {}): Promise<FTApiResponse<FTOrder>> {
    const body: Record<string, unknown> = {};

    if (filters.orderId) body.order_id = filters.orderId;
    if (filters.orderUuid) body.order_uuid = filters.orderUuid;
    if (filters.email) body.email = filters.email;
    if (filters.accountId) body.account_id = filters.accountId;
    if (filters.firstName) body.first_name = filters.firstName;
    if (filters.secondName) body.second_name = filters.secondName;
    if (filters.company) body.company = filters.company;
    if (filters.startDate) body.start_date = filters.startDate;
    if (filters.endDate) body.end_date = filters.endDate;
    if (filters.updatedSince) body.updated_since = filters.updatedSince;
    if (filters.orderStatusId) body.order_status_id = filters.orderStatusId;
    if (filters.validOrder) body.valid_order = 1;
    if (filters.barcode) body.barcode = filters.barcode;
    if (filters.externalBarcode) body.external_barcode = filters.externalBarcode;
    if (filters.externalCode) body.external_code = filters.externalCode;
    if (filters.eventId) body.event_id = filters.eventId;
    if (filters.productCategoryId) body.product_category_id = filters.productCategoryId;
    if (filters.expand?.length) body.expand = filters.expand;
    if (filters.page) body.page = filters.page;

    return this.requestWithRetry<FTApiResponse<FTOrder>>(
      '/v1/private/order/search',
      'POST',
      body
    );
  }

  /**
   * Get stadium entries from orders (extracts scan data from order details)
   * Note: FT doesn't have a separate entries endpoint - scan history is embedded
   * in order detail's barcode array
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Array of stadium entries
   */
  async getStadiumEntries(startDate: string, endDate: string): Promise<FTStadiumEntry[]> {
    const entries: FTStadiumEntry[] = [];

    // Fetch orders for the date range
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getOrdersByDate(startDate, endDate, { page });

      if (response.data) {
        for (const order of response.data) {
          for (const detail of order.detail) {
            for (const barcode of detail.barcode || []) {
              // Only include entries that have been scanned
              if (barcode.scan_datetime) {
                entries.push({
                  barcode_ean13: barcode.barcode_ean13,
                  scan_datetime: barcode.scan_datetime,
                  scan_detail: barcode.scan_detail,
                  scanner_no: barcode.scanner_no,
                  order_id: order.id,
                  account_id: order.account_id,
                  event_id: detail.event_id,
                  event: detail.event,
                  event_date: detail.event_date,
                  product_id: detail.product_id,
                  product: detail.product,
                });
              }
            }
          }
        }
      }

      // Check if there are more pages
      const currentPage = response.currentpage || page;
      const limit = parseInt(response.limit || '20', 10);
      const total = parseInt(response.total || '0', 10);
      hasMore = currentPage * limit < total;
      page++;
    }

    return entries;
  }

  /**
   * Get all products
   * @param options - Pagination options
   * @returns Paginated list of products
   */
  async getProducts(options: { page?: number } = {}): Promise<FTApiResponse<FTProduct>> {
    const page = options.page || 1;
    const endpoint = `/v1/private/product/${page}/${this.options.pageSize}`;

    return this.requestWithRetry<FTApiResponse<FTProduct>>(endpoint);
  }

  /**
   * Get a specific product by ID
   * @param productId - The Future Ticketing product ID
   * @returns The product or null if not found
   */
  async getProduct(productId: string): Promise<FTProduct | null> {
    try {
      const response = await this.requestWithRetry<{ data: FTProduct[] }>(
        `/v1/private/product/id/${productId}`
      );
      return response.data?.[0] || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all events
   * @param options - Pagination options
   * @returns Paginated list of events
   */
  async getEvents(options: { page?: number } = {}): Promise<FTApiResponse<FTEvent>> {
    const page = options.page || 1;
    const endpoint = `/v1/private/event/${page}/${this.options.pageSize}`;

    return this.requestWithRetry<FTApiResponse<FTEvent>>(endpoint);
  }

  /**
   * Get a specific event by ID
   * @param eventId - The Future Ticketing event ID
   * @returns The event or null if not found
   */
  async getEvent(eventId: string): Promise<FTEvent | null> {
    try {
      const response = await this.requestWithRetry<{ data: FTEvent[] }>(
        `/v1/private/event/id/${eventId}`
      );
      return response.data?.[0] || null;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Health check to verify FT API is accessible
   * @returns True if API is accessible, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to fetch events as a simple health check
      await this.getEvents({ page: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make an authenticated request with retry logic
   */
  private async requestWithRetry<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
    timeout?: number
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const effectiveTimeout = timeout || this.options.timeout;
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

        const token = await this.getBearerToken();

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
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

        const data = await response.json() as T;

        return data;
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
  const privateKey = process.env.FUTURE_TICKETING_PRIVATE_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error(
      'Missing Future Ticketing configuration: FUTURE_TICKETING_API_URL and FUTURE_TICKETING_API_KEY are required'
    );
  }

  return new FutureTicketingClient({
    apiUrl,
    apiKey,
    privateKey,
  });
}

// Export types
export type {
  FTAccount,
  FTOrder,
  FTProduct,
  FTEvent,
  FTConfig,
};

// Export FTCustomer as alias for FTAccount for backwards compatibility
export type { FTCustomer } from './types.js';
