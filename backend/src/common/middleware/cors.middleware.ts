import type { IncomingMessage, ServerResponse } from "node:http";
import { appConfig } from "../../config/app.config";

export function handleCorsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const origin = req.headers.origin;

  if (origin && appConfig.cors.isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Tenant-ID, Idempotency-Key, X-Correlation-ID, X-Request-ID",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  // Handle preflight OPTIONS requests immediately
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Content-Length", "0");
    res.end();
    return true; // Request terminated
  }

  return false; // Proceed to next middleware
}
