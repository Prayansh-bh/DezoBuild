import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";

export interface RequestContextData {
  requestId: string;
  correlationId: string;
  startTime: number;
  clientIp?: string | undefined;
  userAgent?: string | undefined;
  path?: string | undefined;
  method?: string | undefined;

  // Placeholder fields - these are strictly unavailable until Phase 02/03 authentication & tenancy
  tenantId?: string | null | undefined;
  userId?: string | null | undefined;
  sessionId?: string | null | undefined;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContextData>();

export class RequestContext {
  /**
   * Run a function within an isolated AsyncLocalStorage request context
   */
  public static run<T>(context: RequestContextData, fn: () => T): T {
    return asyncLocalStorage.run(context, fn);
  }

  /**
   * Get the current active request context, if any
   */
  public static current(): RequestContextData | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Retrieve the current request ID or generate a fallback
   */
  public static getRequestId(): string {
    return asyncLocalStorage.getStore()?.requestId || crypto.randomUUID();
  }

  /**
   * Retrieve the current correlation ID or generate a fallback
   */
  public static getCorrelationId(): string {
    return asyncLocalStorage.getStore()?.correlationId || crypto.randomUUID();
  }

  /**
   * Create a fresh RequestContextData object from HTTP request headers
   */
  public static createFromHeaders(headers: Record<string, string | string[] | undefined>, reqInfo?: {
    path?: string;
    method?: string;
    clientIp?: string;
    userAgent?: string;
  }): RequestContextData {
    const rawReqId = headers["x-request-id"];
    const rawCorrId = headers["x-correlation-id"];

    const requestId = typeof rawReqId === "string" && rawReqId.trim().length > 0 
      ? rawReqId.trim() 
      : crypto.randomUUID();

    const correlationId = typeof rawCorrId === "string" && rawCorrId.trim().length > 0
      ? rawCorrId.trim()
      : requestId;

    return {
      requestId,
      correlationId,
      startTime: Date.now(),
      path: reqInfo?.path,
      method: reqInfo?.method,
      clientIp: reqInfo?.clientIp,
      userAgent: reqInfo?.userAgent,
      // Authentication and tenant headers are strictly NOT trusted as identity in Phase 01
      tenantId: null,
      userId: null,
      sessionId: null,
    };
  }
}
