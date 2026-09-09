import type { IncomingMessage, ServerResponse } from "node:http";
import { RequestContext, type RequestContextData } from "../context/request-context";

export function handleRequestIdMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const headers = req.headers;
  const context: RequestContextData = RequestContext.createFromHeaders(headers, {
    path: req.url?.split("?")[0],
    method: req.method,
    clientIp: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
  });

  // Attach tracking headers to response
  res.setHeader("X-Request-ID", context.requestId);
  res.setHeader("X-Correlation-ID", context.correlationId);

  RequestContext.run(context, next);
}
