import { RequestContext } from "../context/request-context";

export interface ResponseMeta {
  timestamp: string;
  correlationId: string;
  requestId: string;
  message?: string | undefined;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: ResponseMeta & {
    pagination: PaginationMeta;
  };
}

export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  const reqCtx = RequestContext.current();
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      correlationId: reqCtx?.correlationId || "unknown",
      requestId: reqCtx?.requestId || "unknown",
      message,
    },
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string,
): PaginatedResponse<T> {
  const reqCtx = RequestContext.current();
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      correlationId: reqCtx?.correlationId || "unknown",
      requestId: reqCtx?.requestId || "unknown",
      message,
      pagination,
    },
  };
}
