import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequestIdMiddleware } from "../middleware/request-id.middleware";
import { handleSecurityHeadersMiddleware } from "../middleware/security-headers.middleware";
import { handleCorsMiddleware } from "../middleware/cors.middleware";
import { ProblemDetailsSerializer } from "../errors/problem-details";
import { NotFoundError } from "../errors/app-error";
import { logger } from "../logging/logger";

export type RouteHandler = (
  req: IncomingMessage & { params: Record<string, string>; query: Record<string, string>; body?: unknown },
  res: ServerResponse,
) => Promise<unknown> | unknown;

interface RouteDefinition {
  method: string;
  path: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class HttpRouter {
  private readonly routes: RouteDefinition[] = [];

  private pathToRegexp(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const patternStr = path
      .replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return "([^/]+)";
      })
      .replace(/\//g, "\\/");

    return {
      pattern: new RegExp(`^${patternStr}$`),
      paramNames,
    };
  }

  public register(method: string, path: string, handler: RouteHandler): void {
    const { pattern, paramNames } = this.pathToRegexp(path);
    this.routes.push({
      method: method.toUpperCase(),
      path,
      pattern,
      paramNames,
      handler,
    });
  }

  public get(path: string, handler: RouteHandler): void {
    this.register("GET", path, handler);
  }

  public post(path: string, handler: RouteHandler): void {
    this.register("POST", path, handler);
  }

  public put(path: string, handler: RouteHandler): void {
    this.register("PUT", path, handler);
  }

  public patch(path: string, handler: RouteHandler): void {
    this.register("PATCH", path, handler);
  }

  public delete(path: string, handler: RouteHandler): void {
    this.register("DELETE", path, handler);
  }

  private async parseRequestBody(req: IncomingMessage): Promise<unknown> {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method || "")) {
      return undefined;
    }

    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
        if (data.length > 10 * 1024 * 1024) {
          // 10MB payload cap
          reject(new Error("Payload too large"));
        }
      });

      req.on("end", () => {
        if (!data || data.trim().length === 0) {
          resolve(undefined);
          return;
        }

        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("application/json")) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        } else {
          resolve(data);
        }
      });

      req.on("error", (err) => reject(err));
    });
  }

  private parseQuery(urlStr: string): { pathname: string; query: Record<string, string> } {
    const [pathname = "/", search = ""] = urlStr.split("?");
    const query: Record<string, string> = {};

    if (search) {
      const searchParams = new URLSearchParams(search);
      searchParams.forEach((value, key) => {
        query[key] = value;
      });
    }

    return { pathname, query };
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    handleRequestIdMiddleware(req, res, async () => {
      handleSecurityHeadersMiddleware(req, res);

      // Handle CORS & preflight
      const isPreflight = handleCorsMiddleware(req, res);
      if (isPreflight) return;

      const url = req.url || "/";
      const { pathname, query } = this.parseQuery(url);
      const method = (req.method || "GET").toUpperCase();

      try {
        // Find matching route
        let matchedRoute: RouteDefinition | undefined;
        const params: Record<string, string> = {};

        for (const route of this.routes) {
          if (route.method === method) {
            const match = pathname.match(route.pattern);
            if (match) {
              matchedRoute = route;
              route.paramNames.forEach((name, index) => {
                const paramVal = match[index + 1];
                if (paramVal !== undefined) {
                  params[name] = decodeURIComponent(paramVal);
                }
              });
              break;
            }
          }
        }

        if (!matchedRoute) {
          throw new NotFoundError(`Route ${method} ${pathname} not found on this server.`);
        }

        // Parse body
        const body = await this.parseRequestBody(req);

        // Augment request object
        const enhancedReq = Object.assign(req, {
          params,
          query,
          body,
        });

        // Execute route handler
        const result = await matchedRoute.handler(enhancedReq, res);

        // If handler did not manually send response, send serialized JSON result
        if (!res.writableEnded && result !== undefined) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 200;
          res.end(JSON.stringify(result));
        }
      } catch (err: unknown) {
        logger.error(`Request error: ${method} ${pathname}`, err instanceof Error ? err : { err });

        const { statusCode, payload } = ProblemDetailsSerializer.fromError(err, pathname);
        res.setHeader("Content-Type", "application/problem+json; charset=utf-8");
        res.statusCode = statusCode;
        res.end(JSON.stringify(payload));
      }
    });
  }
}
