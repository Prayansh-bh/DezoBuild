import type { IncomingMessage } from "node:http";
import { type AuthenticatedPrincipal } from "../../modules/auth/auth.guard";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error";
import { TokenService, type AccessTokenPayload } from "../../modules/auth/services/token.service";
import { PlatformSessionService } from "../../modules/platform/services/platform-session.service";
import { RequestContext } from "../context/request-context";

export class PlatformAuthGuard {
  private static tokenService: TokenService = TokenService.getInstance();
  private static sessionService: PlatformSessionService = PlatformSessionService.getInstance();

  /**
   * Cryptographically validates incoming platform session (via HTTP-Only Cookie or Bearer header)
   * and enforces that the authenticated principal possesses the SUPER_ADMIN platform context.
   *
   * Rejection criteria:
   * - Missing credential: 401 Unauthorized
   * - Revoked/logged-out session: 401 Unauthorized
   * - Expired token / invalid signature: 401 Unauthorized
   * - Ordinary customer users bound to customer tenants: 403 Forbidden
   */
  public static async authenticate(req: IncomingMessage): Promise<AuthenticatedPrincipal> {
    let token: string | undefined;

    // 1. Check HTTP-only cookie first
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      token = this.sessionService.extractPlatformTokenFromCookie(cookieHeader);
    }

    // 2. Fallback to Authorization header if not in cookies
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && typeof authHeader === "string") {
        const [scheme, headerToken] = authHeader.trim().split(" ");
        if (scheme?.toLowerCase() === "bearer" && headerToken) {
          token = headerToken;
        }
      }
    }

    if (!token) {
      throw new UnauthorizedError("Authentication token is required.");
    }

    // Cryptographically verify token signature, issuer, audience, and expiration
    const payload: AccessTokenPayload = this.tokenService.verifyAccessToken(token);

    // Verify session has not been revoked/logged out
    if (this.sessionService.isRevoked(payload.sid)) {
      throw new UnauthorizedError("Platform session has been revoked or logged out.");
    }

    const isPlatformContext =
      payload.tid === "PLATFORM" ||
      payload.tid === "00000000-0000-0000-0000-000000000000";

    if (!isPlatformContext) {
      throw new ForbiddenError("Platform governance access is strictly restricted to SUPER_ADMIN platform context.");
    }

    const principal: AuthenticatedPrincipal = {
      userId: payload.sub,
      tenantId: payload.tid,
      sessionId: payload.sid,
      sessionVersion: payload.ver,
    };

    // Inject verified identity strictly into RequestContext
    RequestContext.setAuth(principal);

    // Attach to request object for downstream route handlers
    (req as any).user = principal;

    return principal;
  }
}

/**
 * Functional helper for route handlers requiring platform Super Admin authority
 */
export async function requirePlatformAuth(req: IncomingMessage): Promise<AuthenticatedPrincipal> {
  return PlatformAuthGuard.authenticate(req);
}

