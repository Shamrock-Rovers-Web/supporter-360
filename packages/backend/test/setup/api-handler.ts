/**
 * API Handler Test Utilities
 *
 * Helpers for creating API Gateway proxy events and validating
 * Lambda responses for integration testing of API handlers.
 *
 * @packageDocumentation
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * HTTP Method enum
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

/**
 * API Gateway proxy event builder for testing
 */
export class ApiEventBuilder {
  private event: Partial<APIGatewayProxyEvent> = {};

  constructor() {
    // Default values
    this.event = {
      httpMethod: 'GET',
      path: '/',
      headers: {},
      queryStringParameters: {},
      pathParameters: {},
      body: null,
      isBase64Encoded: false,
      requestContext: {
        accountId: '123456789012',
        requestId: `test-request-${Date.now()}`,
        apiId: 'test-api',
        stage: 'test',
      },
    };
  }

  /**
   * Set HTTP method
   */
  method(method: HttpMethod): this {
    this.event.httpMethod = method;
    return this;
  }

  /**
   * Set request path
   */
  path(path: string): this {
    this.event.path = path;
    return this;
  }

  /**
   * Set path parameters
   */
  pathParams(params: Record<string, string>): this {
    this.event.pathParameters = params;
    return this;
  }

  /**
   * Set query string parameters
   */
  queryParams(params: Record<string, string>): this {
    this.event.queryStringParameters = params;
    return this;
  }

  /**
   * Set request headers
   */
  headers(headers: Record<string, string>): this {
    this.event.headers = headers;
    return this;
  }

  /**
   * Set request body
   */
  body(body: string | Record<string, unknown> | null): this {
    this.event.body = typeof body === 'string' ? body : JSON.stringify(body);
    return this;
  }

  /**
   * Set authorization header (simulated authenticated request)
   */
  authorized(role: 'staff' | 'admin' = 'staff', keyName = 'test-key'): this {
    this.event.headers = {
      ...this.event.headers,
      'X-Auth-Role': role,
      'X-Auth-Key-Name': keyName,
    };
    return this;
  }

  /**
   * Build the final API Gateway event
   */
  build(): APIGatewayProxyEvent {
    return this.event as APIGatewayProxyEvent;
  }
}

/**
 * Create an API Gateway event for testing
 */
export function createApiEvent(overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent {
  const builder = new ApiEventBuilder();

  if (overrides) {
    if (overrides.httpMethod) builder.method(overrides.httpMethod as HttpMethod);
    if (overrides.path) builder.path(overrides.path);
    if (overrides.pathParameters) builder.pathParams(overrides.pathParameters);
    if (overrides.queryStringParameters) builder.queryParams(overrides.queryStringParameters);
    if (overrides.headers) builder.headers(overrides.headers);
    if (overrides.body !== undefined) builder.body(overrides.body);
  }

  return builder.build();
}

/**
 * Parse Lambda response body safely
 */
export function parseResponseBody<T = unknown>(result: APIGatewayProxyResult): T | null {
  if (!result.body) {
    return null;
  }

  try {
    return JSON.parse(result.body) as T;
  } catch {
    return result.body as T;
  }
}

/**
 * Response validator for API Gateway results
 */
export class ApiResponseValidator {
  /**
   * Validate successful response
   */
  static isSuccess(result: APIGatewayProxyResult, expectedStatus = 200): boolean {
    return result.statusCode === expectedStatus;
  }

  /**
   * Validate error response
   */
  static isError(result: APIGatewayProxyResult, errorStatus = 400 | 401 | 404 | 500): boolean {
    return result.statusCode === errorStatus;
  }

  /**
   * Validate response body structure
   */
  static hasBodyShape<T>(result: APIGatewayProxyResult, shape: Record<string, unknown>): boolean {
    const body = parseResponseBody(result);
    if (!body) return false;

    for (const key in shape) {
      if (!(key in body)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract specific field from response body
   */
  static getBodyField<T = unknown>(result: APIGatewayProxyResult, field: string): T | null {
    const body = parseResponseBody(result);
    if (!body) return null;

    return (body as Record<string, T>)[field] || null;
  }

  /**
   * Get all items from a paginated response
   */
  static getPaginatedItems<T>(result: APIGatewayProxyResult): T[] {
    const body = parseResponseBody<{ results?: T[] }>(result);
    return body?.results || [];
  }

  /**
   * Get total count from a paginated response
   */
  static getTotalCount(result: APIGatewayProxyResult): number {
    const body = parseResponseBody<{ total?: number }>(result);
    return body?.total || 0;
  }
}

/**
 * Common assertions for API responses
 */
export class ApiAssertions {
  /**
   * Assert response is successful
   */
  static assertSuccess(result: APIGatewayProxyResult, expectedStatus = 200): void {
    if (!ApiResponseValidator.isSuccess(result, expectedStatus)) {
      throw new Error(`Expected status ${expectedStatus}, got ${result.statusCode}. Body: ${result.body}`);
    }
  }

  /**
   * Assert response is an error
   */
  static assertError(result: APIGatewayProxyResult, errorStatus: number): void {
    if (!ApiResponseValidator.isError(result, errorStatus)) {
      throw new Error(`Expected status ${errorStatus}, got ${result.statusCode}. Body: ${result.body}`);
    }
  }

  /**
   * Assert response body contains specific field
   */
  static assertHasField(result: APIGatewayProxyResult, field: string): void {
    if (!ApiResponseValidator.hasBodyShape(result, { [field]: true })) {
      throw new Error(`Expected field "${field}" in response body. Body: ${result.body}`);
    }
  }

  /**
   * Assert response equals expected value
   */
  static assertBodyEquals<T>(result: APIGatewayProxyResult, expected: T): void {
    const body = parseResponseBody<T>(result);
    if (JSON.stringify(body) !== JSON.stringify(expected)) {
      throw new Error(`Response body mismatch. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(body)}`);
    }
  }

  /**
   * Assert paginated response has specific count
   */
  static assertHasCount(result: APIGatewayProxyResult, expectedCount: number): void {
    const count = ApiResponseValidator.getTotalCount(result);
    if (count !== expectedCount) {
      throw new Error(`Expected ${expectedCount} total results, got ${count}`);
    }
  }
}
