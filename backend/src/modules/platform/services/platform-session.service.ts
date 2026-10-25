import { appConfig } from "../../../config/app.config";

export interface RevokedSessionInfo {
  revokedAt: number; // timestamp in ms
  expiresAt: number; // timestamp in ms
}

export class PlatformSessionService {
  private static instance: PlatformSessionService;
  private readonly revokedSessions: Map<string, RevokedSessionInfo> = new Map();
  private readonly cookieName = "dezo_platform_session";

  public static getInstance(): PlatformSessionService {
    if (!PlatformSessionService.instance) {
      PlatformSessionService.instance = new PlatformSessionService();
    }
    return PlatformSessionService.instance;
  }

  /**
   * Format Set-Cookie header string for the HttpOnly, Secure, SameSite platform session cookie
   */
  public serializePlatformCookie(
    token: string,
    options?: { secure?: boolean; domain?: string; maxAgeSeconds?: number }
  ): string {
    const isSecure = options?.secure ?? appConfig.security.secureCookies;
    const maxAgeSeconds = options?.maxAgeSeconds ?? appConfig.security.accessExpiresInSec;

    const parts = [
      `${this.cookieName}=${token}`,
      "Path=/api/v1/platform",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAgeSeconds}`,
    ];

    if (isSecure) {
      parts.push("Secure");
    }

    if (options?.domain || appConfig.security.cookieDomain) {
      parts.push(`Domain=${options?.domain || appConfig.security.cookieDomain}`);
    }

    return parts.join("; ");
  }

  /**
   * Format Set-Cookie header string to clear/expire the platform session cookie on logout
   */
  public serializeClearPlatformCookie(options?: { secure?: boolean; domain?: string }): string {
    const isSecure = options?.secure ?? appConfig.security.secureCookies;
    const parts = [
      `${this.cookieName}=`,
      "Path=/api/v1/platform",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ];

    if (isSecure) {
      parts.push("Secure");
    }

    if (options?.domain || appConfig.security.cookieDomain) {
      parts.push(`Domain=${options?.domain || appConfig.security.cookieDomain}`);
    }

    return parts.join("; ");
  }

  /**
   * Extract platform session token value from Cookie header
   */
  public extractPlatformTokenFromCookie(cookieHeader?: string): string | undefined {
    if (!cookieHeader || typeof cookieHeader !== "string") {
      return undefined;
    }

    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.trim().split("=");
      if (name === this.cookieName || name === `__Host-${this.cookieName}`) {
        return rest.join("=").trim() || undefined;
      }
    }
    return undefined;
  }

  /**
   * Mark a platform session ID as explicitly revoked/logged out
   */
  public revokeSession(sessionId: string, expiresAtMs: number): void {
    this.cleanExpiredRevocations();
    this.revokedSessions.set(sessionId, {
      revokedAt: Date.now(),
      expiresAt: expiresAtMs,
    });
  }

  /**
   * Check if a platform session ID has been revoked
   */
  public isRevoked(sessionId: string): boolean {
    const info = this.revokedSessions.get(sessionId);
    if (!info) {
      return false;
    }

    if (Date.now() > info.expiresAt) {
      this.revokedSessions.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Evict stale session revocations to prevent unbounded memory growth
   */
  private cleanExpiredRevocations(): void {
    const now = Date.now();
    for (const [sid, info] of this.revokedSessions.entries()) {
      if (now > info.expiresAt) {
        this.revokedSessions.delete(sid);
      }
    }
  }

  /**
   * Reset revocation table (used in tests)
   */
  public clearRevocations(): void {
    this.revokedSessions.clear();
  }
}
