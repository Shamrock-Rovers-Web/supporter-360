/**
 * CORS Configuration
 *
 * This file defines the allowed origins for CORS requests.
 * Replace ALL_ORIGINS with specific allowed origins to enhance security.
 *
 * To add a new origin:
 * 1. Add the origin to the ALLOWED_ORIGINS array
 * 2. Deploy the updated infrastructure
 *
 * Origins should include the protocol (http:// or https://)
 */

/**
 * Allowed origins for CORS requests
 *
 * Examples:
 * - Local development: 'http://localhost:3000'
 * - Production frontend: 'https://your-domain.com'
 * - CloudFront distribution: 'https://d111111abcdef8.cloudfront.net'
 */
export const ALLOWED_ORIGINS = [
  // Production S3 static website hosting
  'https://shamrockrovers.ie',

  // S3 static website URL (development/testing)
  'http://supporter360-frontend-950596328856.s3-website-eu-west-1.amazonaws.com',

  // For development only - commented out for production
  // 'http://localhost:3000',
  // 'http://localhost:5173',
];

/**
 * Check if an origin is allowed
 *
 * @param origin - The origin to check
 * @returns true if the origin is allowed, false otherwise
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }

  // Check if the origin is in the allowed list
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get the allowed origin for CORS headers
 *
 * If the request origin is allowed, return it.
 * Otherwise, return the first allowed origin (for production) or empty (for security).
 *
 * @param requestOrigin - The origin from the request
 * @returns The origin to use in CORS headers
 */
export function getAllowedOrigin(requestOrigin?: string): string {
  if (requestOrigin && isOriginAllowed(requestOrigin)) {
    return requestOrigin;
  }

  // Return the first allowed origin if available
  // This is useful for production where you want to allow specific origins
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS[0];
  }

  // If no origins are configured, return empty string for security
  // This effectively disables CORS
  return '';
}

/**
 * Get CORS headers for API responses
 *
 * @param requestOrigin - The origin from the request
 * @returns CORS headers object
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(requestOrigin);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}
