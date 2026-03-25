import { getCorsHeaders } from '../config/cors';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

/**
 * Rate limit information for response headers.
 */
export interface RateLimitInfo {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when the window resets */
  resetAt: number;
}

export function successResponse<T>(
  data: T,
  statusCode = 200,
  requestOrigin?: string,
  rateLimitInfo?: RateLimitInfo
): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  const headers = getCorsHeaders(requestOrigin);

  // Add rate limit headers if provided
  if (rateLimitInfo) {
    headers['X-RateLimit-Limit'] = rateLimitInfo.limit.toString();
    headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
    headers['X-RateLimit-Reset'] = rateLimitInfo.resetAt.toString();
  }

  return {
    statusCode,
    body: JSON.stringify({ success: true, data } as ApiResponse<T>),
    headers,
  };
}

export function errorResponse(
  error: string,
  statusCode = 500,
  code?: string,
  details?: any,
  requestOrigin?: string,
  rateLimitInfo?: RateLimitInfo
): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  const headers = getCorsHeaders(requestOrigin);

  // Add rate limit headers if provided
  if (rateLimitInfo) {
    headers['X-RateLimit-Limit'] = rateLimitInfo.limit.toString();
    headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
    headers['X-RateLimit-Reset'] = rateLimitInfo.resetAt.toString();
  }

  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      error,
      code,
      details,
    } as ApiResponse),
    headers,
  };
}

export function unauthorizedResponse(requestOrigin?: string): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  return errorResponse('Unauthorized', 401, 'UNAUTHORIZED', undefined, requestOrigin);
}

export function forbiddenResponse(requestOrigin?: string): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  return errorResponse('Forbidden', 403, 'FORBIDDEN', undefined, requestOrigin);
}

/**
 * Simple AWS Lambda response helper
 */
export function awsLambdaResponse(statusCode: number, body: any, requestOrigin?: string): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  const headers = getCorsHeaders(requestOrigin);
  return {
    statusCode,
    body: JSON.stringify(body),
    headers,
  };
}
