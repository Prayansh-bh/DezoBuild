export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data?: T | undefined;
  message?: string | undefined;
  timestamp: string;
  error?:
    | {
        code: string;
        details?: unknown;
      }
    | undefined;
}

export function createSuccessResponse<T>(data: T, message?: string, statusCode = 200): ApiResponse<T> {
  const res: ApiResponse<T> = {
    success: true,
    statusCode,
    data,
    timestamp: new Date().toISOString(),
  };
  if (message !== undefined) {
    res.message = message;
  }
  return res;
}

export function createErrorResponse(
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
): ApiResponse<never> {
  const res: ApiResponse<never> = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    error: {
      code,
    },
  };
  if (details !== undefined && res.error) {
    res.error.details = details;
  }
  return res;
}
