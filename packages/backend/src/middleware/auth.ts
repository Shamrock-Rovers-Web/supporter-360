import { APIGatewayProxyEvent, APIGatewayEventRequestContextV2 } from 'aws-lambda';
import { query } from '../db/connection';
import { unauthorizedResponse, forbiddenResponse } from '../utils/api-response';
import { getCorsHeaders } from '../config/cors';

export type ApiRole = 'staff' | 'admin';

export interface AuthContext {
  role: ApiRole;
  keyName: string;
  principalId?: string;
}

interface AuthorizerContext {
  role: ApiRole;
  keyName: string;
  principalId: string;
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

/**
 * Extract auth context from Lambda authorizer
 * This is called when API Gateway Lambda authorizer is enabled
 */
function getAuthorizerContext(event: APIGatewayProxyEvent): AuthContext | null {
  const requestContext = event.requestContext as any;
  const authorizer = requestContext?.authorizer as AuthorizerContext | undefined;

  if (!authorizer) {
    return null;
  }

  return {
    role: authorizer.role,
    keyName: authorizer.keyName,
    principalId: authorizer.principalId,
  };
}

export async function validateApiKey(
  event: APIGatewayProxyEvent
): Promise<{ authorized: true; context: AuthContext } | { authorized: false; response: ReturnType<typeof unauthorizedResponse | typeof forbiddenResponse> }> {
  // Extract origin from headers for CORS
  const requestOrigin = event.headers['Origin'] || event.headers['origin'];

  // First, check if Lambda authorizer has already validated the request
  const authorizerContext = getAuthorizerContext(event);
  if (authorizerContext) {
    console.log('Using Lambda authorizer context:', authorizerContext);

    // Still need to validate role-based access control for specific endpoints
    const method = event.httpMethod;
    const path = event.path;

    // Replace path segments that look like IDs with {id}
    // This handles UUIDs and numeric IDs (e.g., /supporters/123 -> /supporters/{id})
    const normalizedPath = path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/{id}')
      .replace(/\/\d+(?:\/|$)/g, '/{id}/')
      .replace(/\/{id}\/$/, '/{id}');

    const endpointPattern = `${method} ${normalizedPath}`;

    // Check role-based access
    const requiredRole = ADMIN_ENDPOINTS.has(endpointPattern) ? 'admin' : 'staff';

    if (requiredRole === 'admin' && authorizerContext.role !== 'admin') {
      console.log(`Admin endpoint access denied for ${authorizerContext.role} role`);
      return { authorized: false, response: forbiddenResponse(requestOrigin) };
    }

    return { authorized: true, context: authorizerContext };
  }

  // Fallback to API key validation (for backward compatibility or when authorizer is not enabled)
  console.log('Lambda authorizer not found, falling back to API key validation');
  const apiKey = event.headers['X-API-Key'] || event.headers['x-api-key'];

  if (!apiKey) {
    return { authorized: false, response: unauthorizedResponse(requestOrigin) };
  }

  // Fetch API keys from config table
  const result = await query(
    "SELECT value FROM config WHERE key = 'api_keys'"
  );

  if (result.rows.length === 0) {
    return { authorized: false, response: unauthorizedResponse(requestOrigin) };
  }

  const apiKeys = result.rows[0].value as Record<string, { role: ApiRole; name: string }>;
  const keyConfig = apiKeys[apiKey];

  if (!keyConfig) {
    return { authorized: false, response: unauthorizedResponse(requestOrigin) };
  }

  // Determine endpoint pattern
  // Normalize path by replacing UUID-like segments and numeric IDs with {id}
  const method = event.httpMethod;
  const path = event.path;

  // Replace path segments that look like IDs with {id}
  // This handles UUIDs and numeric IDs (e.g., /supporters/123 -> /supporters/{id})
  const normalizedPath = path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/{id}')
    .replace(/\/\d+(?:\/|$)/g, '/{id}/')
    .replace(/\/{id}\/$/, '/{id}');

  const endpointPattern = `${method} ${normalizedPath}`;

  // Check role-based access
  const requiredRole = ADMIN_ENDPOINTS.has(endpointPattern) ? 'admin' : 'staff';

  if (requiredRole === 'admin' && keyConfig.role !== 'admin') {
    return { authorized: false, response: forbiddenResponse(requestOrigin) };
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
      return (authResult as any).response;
    }

    return handler(event, authResult.context);
  };
}
