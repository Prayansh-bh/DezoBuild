import { AppError, type InvalidParamDetail } from "./app-error";
import { RequestContext } from "../context/request-context";

export interface ProblemDetails {
  success: false;
  error: {
    code: string;
    title: string;
    status: number;
    detail: string;
    instance?: string | undefined;
    invalidParams?: InvalidParamDetail[] | undefined;
    timestamp: string;
    correlationId: string;
    requestId: string;
  };
}

export class ProblemDetailsSerializer {
  public static fromError(error: unknown, path = "/"): { statusCode: number; payload: ProblemDetails } {
    const reqCtx = RequestContext.current();
    const correlationId = reqCtx?.correlationId || "unknown";
    const requestId = reqCtx?.requestId || "unknown";
    const timestamp = new Date().toISOString();

    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        payload: {
          success: false,
          error: {
            code: error.errorCode,
            title: error.title,
            status: error.statusCode,
            detail: error.message,
            instance: path,
            invalidParams: error.invalidParams,
            timestamp,
            correlationId,
            requestId,
          },
        },
      };
    }

    // Handle standard generic errors safely
    const isProduction = process.env["NODE_ENV"] === "production";
    const isError = error instanceof Error;
    
    // Check if error is malformed JSON
    if (isError && error.name === "SyntaxError" && error.message.includes("JSON")) {
      return {
        statusCode: 400,
        payload: {
          success: false,
          error: {
            code: "MALFORMED_JSON",
            title: "Malformed JSON Payload",
            status: 400,
            detail: "The request body contains invalid or malformed JSON syntax.",
            instance: path,
            timestamp,
            correlationId,
            requestId,
          },
        },
      };
    }

    // Sanitize 500 errors to prevent leaking internal database / stack information
    const safeDetail = isProduction
      ? "An unexpected internal error occurred. Please contact system support with the correlation ID."
      : isError
        ? error.message
        : "Unknown internal server error";

    return {
      statusCode: 500,
      payload: {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          title: "Internal Server Error",
          status: 500,
          detail: safeDetail,
          instance: path,
          timestamp,
          correlationId,
          requestId,
        },
      },
    };
  }
}
