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
  headers: Record<string, string>;
} {
  return {
    statusCode,
    body: JSON.stringify({ success: true, data } as ApiResponse<T>),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
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
  headers: Record<string, string>;
} {
  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      error,
      code,
      details,
    } as ApiResponse),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
  };
}

export function unauthorizedResponse(): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
}

export function forbiddenResponse(): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  return errorResponse('Forbidden', 403, 'FORBIDDEN');
}
