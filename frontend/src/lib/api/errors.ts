/**
 * DEZOBUILD — Normalized API Error Model
 * 
 * Maps backend RFC 7807 problem details and application error responses
 * into a typed, structured, user-friendly frontend error.
 */

export interface InvalidParamDetail {
  name: string;
  reason: string;
}

export interface ApiErrorResponsePayload {
  success?: false | undefined;
  error?: {
    statusCode?: number | undefined;
    errorCode?: string | undefined;
    title?: string | undefined;
    message?: string | undefined;
    invalidParams?: InvalidParamDetail[] | undefined;
  } | undefined;
  meta?: {
    timestamp?: string | undefined;
    correlationId?: string | undefined;
    requestId?: string | undefined;
    message?: string | undefined;
  } | undefined;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly title: string;
  public readonly correlationId?: string | undefined;
  public readonly requestId?: string | undefined;
  public readonly invalidParams?: InvalidParamDetail[] | undefined;
  public readonly isNetworkError: boolean;

  constructor(params: {
    message: string;
    statusCode?: number | undefined;
    errorCode?: string | undefined;
    title?: string | undefined;
    correlationId?: string | undefined;
    requestId?: string | undefined;
    invalidParams?: InvalidParamDetail[] | undefined;
    isNetworkError?: boolean | undefined;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.statusCode = params.statusCode ?? 500;
    this.errorCode = params.errorCode ?? "INTERNAL_SERVER_ERROR";
    this.title = params.title ?? "An unexpected error occurred";
    this.correlationId = params.correlationId;
    this.requestId = params.requestId;
    this.invalidParams = params.invalidParams;
    this.isNetworkError = Boolean(params.isNetworkError);
  }

  public static fromResponse(statusCode: number, data: any): ApiError {
    let payload = data;
    if (typeof data === "string" && (data.trim().startsWith("{") || data.trim().startsWith("["))) {
      try {
        payload = JSON.parse(data);
      } catch {
        payload = data;
      }
    } else if (data && typeof data.message === "string" && data.message.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(data.message);
        if (parsed && typeof parsed === "object") {
          payload = parsed;
        }
      } catch {
        // keep payload
      }
    }

    const errorObj = payload?.error || payload;
    const meta = payload?.meta;

    let friendlyTitle = "Request Failed";
    switch (statusCode) {
      case 400:
        friendlyTitle = "Bad Request";
        break;
      case 401:
        friendlyTitle = "Authentication Required";
        break;
      case 403:
        friendlyTitle = "Forbidden";
        break;
      case 404:
        friendlyTitle = "Resource Not Found";
        break;
      case 409:
        friendlyTitle = "Conflict";
        break;
      case 422:
        friendlyTitle = "Validation Failed";
        break;
      case 429:
        friendlyTitle = "Rate Limit Exceeded";
        break;
      default:
        if (statusCode >= 500) {
          friendlyTitle = "Backend Service Error";
        }
    }

    let message =
      errorObj?.detail ||
      errorObj?.message ||
      meta?.message ||
      payload?.message ||
      (typeof payload === "string" ? payload : `Server returned HTTP ${statusCode}`);

    // If there are specific invalid parameter breakdown, format them for clarity
    if (errorObj?.invalidParams && Array.isArray(errorObj.invalidParams) && errorObj.invalidParams.length > 0) {
      const details = errorObj.invalidParams.map((p: any) => `${p.name}: ${p.reason}`).join(", ");
      message = `${message} (${details})`;
    }

    return new ApiError({
      message,
      statusCode,
      errorCode: errorObj?.errorCode || errorObj?.code || `HTTP_${statusCode}`,
      title: errorObj?.title || meta?.message || friendlyTitle,
      correlationId: meta?.correlationId || errorObj?.correlationId || meta?.requestId || errorObj?.requestId,
      requestId: meta?.requestId || errorObj?.requestId || meta?.correlationId || errorObj?.correlationId,
      invalidParams: errorObj?.invalidParams,
    });
  }

  public static networkError(originalError: Error): ApiError {
    return new ApiError({
      message: originalError.message || "Network connectivity failure. Unable to reach backend API.",
      statusCode: 0,
      errorCode: "NETWORK_ERROR",
      title: "Network Connection Failure",
      isNetworkError: true,
    });
  }
}
