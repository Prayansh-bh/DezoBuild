import type { IncomingMessage, ServerResponse } from "node:http";
import { appConfig } from "../../config/app.config";

export function handleSecurityHeadersMiddleware(
  _req: IncomingMessage,
  res: ServerResponse,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (appConfig.app.isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
}
