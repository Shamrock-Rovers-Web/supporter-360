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
