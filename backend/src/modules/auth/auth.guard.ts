import type { IncomingMessage } from "node:http";
import { UnauthorizedError } from "../../common/errors/app-error";
import { RequestContext } from "../../common/context/request-context";
import { TokenService, type AccessTokenPayload } from "./services/token.service";

export interface AuthenticatedPrincipal {
  userId: string;
  tenantId: string;
  sessionId: string;
  sessionVersion: number;
}

export class AuthGuard {
  private static tokenService: TokenService = TokenService.getInstance();

  /**
   * Authenticate incoming HTTP request by verifying JWT Bearer token
   * and injecting authenticated principal into RequestContext
   */
  public static async authenticate(req: IncomingMessage): Promise<AuthenticatedPrincipal> {
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== "string") {
      throw new UnauthorizedError("Authentication token is required.");
    }

    const [scheme, token] = authHeader.trim().split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedError("Invalid authorization format. Expected 'Bearer <token>'.");
    }

    // Cryptographically verify token signature, issuer, audience, and expiration
    const payload: AccessTokenPayload = this.tokenService.verifyAccessToken(token);

    const principal: AuthenticatedPrincipal = {
      userId: payload.sub,
      tenantId: payload.tid,
      sessionId: payload.sid,
      sessionVersion: payload.ver,
    };

    // Inject verified identity strictly into RequestContext
    // (Client-provided headers such as X-User-Id or X-Tenant-Id are strictly ignored)
    RequestContext.setAuth(principal);

    // Attach to request object for downstream route handlers
    (req as any).user = principal;

    return principal;
  }
}

/**
 * Functional helper for route handlers requiring authentication
 */
export async function requireAuth(req: IncomingMessage): Promise<AuthenticatedPrincipal> {
  return AuthGuard.authenticate(req);
}
