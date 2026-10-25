import crypto from "node:crypto";
import { appConfig } from "../../../config/app.config";
import { UnauthorizedError } from "../../../common/errors/app-error";

export interface AccessTokenPayload {
  iss: string;
  aud: string;
  sub: string;
  tid: string;
  sid: string;
  ver: number;
  iat: number;
  exp: number;
}

export interface ITokenService {
  createAccessToken(
    params: { userId: string; tenantId: string; sessionId: string; sessionVersion: number },
    expiresInSec?: number,
  ): string;
  verifyAccessToken(token: string): AccessTokenPayload;
  generateRefreshToken(): string;
  hashRefreshToken(token: string): string;
  generateInvitationToken(): string;
  hashInvitationToken(token: string): string;
  serializeRefreshCookie(token: string, options?: { secure?: boolean; domain?: string }): string;
  serializeClearRefreshCookie(options?: { secure?: boolean; domain?: string }): string;
  extractRefreshTokenFromCookie(cookieHeader?: string): string | undefined;
}

export class TokenService implements ITokenService {
  private static instance: TokenService;
  private readonly issuer = "dezobuild-api";
  private readonly audience = "dezobuild-client";

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  private base64UrlEncode(data: string | Buffer): string {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    return buffer.toString("base64url");
  }

  private base64UrlDecodeToString(data: string): string {
    return Buffer.from(data, "base64url").toString("utf8");
  }

  private base64UrlDecodeToBuffer(data: string): Buffer {
    return Buffer.from(data, "base64url");
  }

  /**
   * Issue a short-lived JWT Access Token (15m baseline)
   */
  public createAccessToken(
    params: { userId: string; tenantId: string; sessionId: string; sessionVersion: number },
    expiresInSec = appConfig.security.accessExpiresInSec,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    const payload: AccessTokenPayload = {
      iss: this.issuer,
      aud: this.audience,
      sub: params.userId,
      tid: params.tenantId,
      sid: params.sessionId,
      ver: params.sessionVersion,
      iat: now,
      exp: now + expiresInSec,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac("sha256", appConfig.security.jwtAccessSecret)
      .update(signingInput)
      .digest();

    const encodedSignature = this.base64UrlEncode(signature);
    return `${signingInput}.${encodedSignature}`;
  }

  /**
   * Cryptographically verify and validate JWT Access Token claims
   */
  public verifyAccessToken(token: string): AccessTokenPayload {
    if (!token || typeof token !== "string") {
      throw new UnauthorizedError("Authentication token is missing or malformed.");
    }

    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      throw new UnauthorizedError("Invalid token structure.");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedError("Invalid token format.");
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
      .createHmac("sha256", appConfig.security.jwtAccessSecret)
      .update(signingInput)
      .digest();

    const providedSignature = this.base64UrlDecodeToBuffer(encodedSignature);

    if (expectedSignature.length !== providedSignature.length || !crypto.timingSafeEqual(expectedSignature, providedSignature)) {
      throw new UnauthorizedError("Invalid token signature.");
    }

    let header: { alg?: string; typ?: string };
    let payload: AccessTokenPayload;

    try {
      header = JSON.parse(this.base64UrlDecodeToString(encodedHeader));
      payload = JSON.parse(this.base64UrlDecodeToString(encodedPayload));
    } catch {
      throw new UnauthorizedError("Malformed token payload.");
    }

    if (header.alg !== "HS256") {
      throw new UnauthorizedError("Unsupported token algorithm.");
    }

    if (payload.iss !== this.issuer) {
      throw new UnauthorizedError("Invalid token issuer.");
    }

    if (payload.aud !== this.audience) {
      throw new UnauthorizedError("Invalid token audience.");
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new UnauthorizedError("Access token has expired.");
    }

    if (!payload.sub || !payload.tid || !payload.sid || typeof payload.ver !== "number") {
      throw new UnauthorizedError("Token claims are incomplete or invalid.");
    }

    return payload;
  }

  /**
   * Generate a cryptographically secure, high-entropy 256-bit random refresh token
   */
  public generateRefreshToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Compute standard SHA-256 hash of refresh token for database persistence
   */
  public hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generate a cryptographically secure, high-entropy 256-bit random invitation token
   */
  public generateInvitationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Compute standard SHA-256 hash of invitation token for database persistence
   */
  public hashInvitationToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Format Set-Cookie header string for the HttpOnly, SameSite refresh token cookie
   */
  public serializeRefreshCookie(
    token: string,
    options?: { secure?: boolean; domain?: string },
  ): string {
    const isSecure = options?.secure ?? appConfig.security.secureCookies;
    const maxAgeSeconds = appConfig.security.refreshExpiresInDays * 24 * 60 * 60;
    
    // In production with HTTPS, use __Host- prefix if root path, or standard dezo_refresh
    const cookieName = "dezo_refresh";
    const parts = [
      `${cookieName}=${token}`,
      "Path=/api/v1/auth",
      "HttpOnly",
      "SameSite=Strict",
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
   * Format Set-Cookie header string to clear/expire the refresh token cookie on logout
   */
  public serializeClearRefreshCookie(options?: { secure?: boolean; domain?: string }): string {
    const isSecure = options?.secure ?? appConfig.security.secureCookies;
    const cookieName = "dezo_refresh";
    const parts = [
      `${cookieName}=`,
      "Path=/api/v1/auth",
      "HttpOnly",
      "SameSite=Strict",
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
   * Extract refresh token value from Cookie header
   */
  public extractRefreshTokenFromCookie(cookieHeader?: string): string | undefined {
    if (!cookieHeader || typeof cookieHeader !== "string") {
      return undefined;
    }

    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.trim().split("=");
      if (name === "dezo_refresh" || name === "__Host-dezo_refresh") {
        return rest.join("=").trim() || undefined;
      }
    }
    return undefined;
  }
}
