import { appConfig } from "../../config/app.config";
import { UnauthorizedError, NotFoundError } from "../../common/errors/app-error";
import { PasswordService, type IPasswordService } from "./services/password.service";
import { TokenService, type ITokenService } from "./services/token.service";
import { RateLimiterService, type IRateLimiterService } from "./services/rate-limiter.service";
import { AuthAuditService, type IAuthAuditService } from "./services/audit.service";
import type { IUserRepository, UserEntity, CreateUserParams } from "./repositories/user.repository.interface";
import type { ISessionRepository } from "./repositories/session.repository.interface";
import { PrismaUserRepository } from "./repositories/prisma-user.repository";
import { PrismaSessionRepository } from "./repositories/prisma-session.repository";
import type { LoginDto } from "./dto/login.dto";
import type { SafeUser, LoginResponseData, RefreshResponseData } from "./dto/auth-response.dto";

export interface AuthServiceDependencies {
  userRepository?: IUserRepository | undefined;
  sessionRepository?: ISessionRepository | undefined;
  passwordService?: IPasswordService | undefined;
  tokenService?: ITokenService | undefined;
  rateLimiter?: IRateLimiterService | undefined;
  auditService?: IAuthAuditService | undefined;
}

export class AuthService {
  private static instance: AuthService;
  private readonly userRepo: IUserRepository;
  private readonly sessionRepo: ISessionRepository;
  private readonly passwordService: IPasswordService;
  private readonly tokenService: ITokenService;
  private readonly rateLimiter: IRateLimiterService;
  private readonly auditService: IAuthAuditService;

  constructor(deps?: AuthServiceDependencies) {
    this.userRepo = deps?.userRepository ?? new PrismaUserRepository();
    this.sessionRepo = deps?.sessionRepository ?? new PrismaSessionRepository();
    this.passwordService = deps?.passwordService ?? PasswordService.getInstance();
    this.tokenService = deps?.tokenService ?? TokenService.getInstance();
    this.rateLimiter = deps?.rateLimiter ?? RateLimiterService.getInstance();
    this.auditService = deps?.auditService ?? AuthAuditService.getInstance();
  }

  public static getInstance(deps?: AuthServiceDependencies): AuthService {
    if (!AuthService.instance || deps) {
      AuthService.instance = new AuthService(deps);
    }
    return AuthService.instance;
  }

  public static resetInstance(): void {
    AuthService.instance = undefined as unknown as AuthService;
  }

  public getUserRepository(): IUserRepository {
    return this.userRepo;
  }

  public getSessionRepository(): ISessionRepository {
    return this.sessionRepo;
  }

  /**
   * Sanitize UserEntity into safe response DTO without sensitive fields
   */
  public sanitizeUser(user: UserEntity): SafeUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      role: user.role,
      roles: user.roles,
      tenantName: user.tenantName,
      tenantCode: user.tenantCode,
      planTier: user.planTier,
    };
  }

  private handleLoginFailure(
    rateLimitKey: string,
    meta?: { clientIp?: string; userAgent?: string },
    user?: UserEntity | null,
    reason = "INVALID_CREDENTIALS",
  ): never {
    this.rateLimiter.recordFailure(rateLimitKey);
    this.auditService.emit({
      eventType: "LOGIN_FAILURE",
      userId: user?.id || null,
      tenantId: user?.tenantId || null,
      clientIp: meta?.clientIp,
      userAgent: meta?.userAgent,
      reason,
    });
    throw new UnauthorizedError("Invalid credentials provided.");
  }

  /**
   * Authenticate credentials and establish an active server-side session
   */
  public async login(
    dto: LoginDto,
    meta?: { clientIp?: string; userAgent?: string },
  ): Promise<LoginResponseData & { refreshToken: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const rateLimitKey = `auth:${meta?.clientIp || "unknown"}:${normalizedEmail}`;

    // 1. Enforce brute-force rate limit
    this.rateLimiter.assertNotBlocked(rateLimitKey);

    // 2. Fetch user by normalized email
    const user = await this.userRepo.findByEmail(normalizedEmail);

    if (!user) {
      this.handleLoginFailure(rateLimitKey, meta, null, "USER_NOT_FOUND");
    }

    // 3. Verify user status
    if (user.status !== "ACTIVE") {
      this.handleLoginFailure(rateLimitKey, meta, user, "USER_DISABLED_OR_SUSPENDED");
    }

    // 4. Verify password with constant-time check
    const isPasswordValid = await this.passwordService.verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.handleLoginFailure(rateLimitKey, meta, user, "INVALID_PASSWORD");
    }

    // 5. Successful authentication: reset rate limiter
    this.rateLimiter.recordSuccess(rateLimitKey);

    // 6. Generate high-entropy refresh token and compute its SHA-256 hash
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    const refreshExpiry = new Date(
      Date.now() + appConfig.security.refreshExpiresInDays * 24 * 60 * 60 * 1000,
    );

    // 7. Persist session
    const session = await this.sessionRepo.create({
      tenantId: user.tenantId,
      userId: user.id,
      refreshTokenHash,
      userAgent: meta?.userAgent || null,
      ipAddress: meta?.clientIp || null,
      version: user.sessionVersion,
      expiresAt: refreshExpiry,
    });

    // 8. Update user login timestamp
    await this.userRepo.updateLastLogin(user.id);

    // 9. Issue short-lived JWT Access Token
    const accessToken = this.tokenService.createAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      sessionId: session.id,
      sessionVersion: user.sessionVersion,
    });

    // 10. Emit audit event
    this.auditService.emit({
      eventType: "LOGIN_SUCCESS",
      userId: user.id,
      tenantId: user.tenantId,
      clientIp: meta?.clientIp,
      userAgent: meta?.userAgent,
    });

    return {
      accessToken,
      expiresIn: appConfig.security.accessExpiresInSec,
      tokenType: "Bearer",
      user: this.sanitizeUser(user),
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Rotate refresh token and issue a fresh access token
   */
  public async refresh(
    rawRefreshToken: string,
    meta?: { clientIp?: string; userAgent?: string },
  ): Promise<RefreshResponseData & { refreshToken: string }> {
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      throw new UnauthorizedError("Refresh token is required.");
    }

    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken.trim());
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (!session) {
      this.auditService.emit({
        eventType: "LOGIN_FAILURE",
        reason: "INVALID_REFRESH_TOKEN",
        clientIp: meta?.clientIp,
      });
      throw new UnauthorizedError("Session is invalid or has expired.");
    }

    // Replay detection: If token was already revoked, immediately invalidate ALL sessions for this user!
    if (session.revokedAt) {
      await this.sessionRepo.revokeAllForUser(session.userId);
      await this.userRepo.incrementSessionVersion(session.userId);

      this.auditService.emit({
        eventType: "SESSION_REVOKED",
        userId: session.userId,
        tenantId: session.tenantId,
        reason: "REFRESH_TOKEN_REUSE_DETECTED",
        clientIp: meta?.clientIp,
      });

      throw new UnauthorizedError("Security alert: Revoked refresh token reuse detected. All sessions invalidated.");
    }

    // Expiration check
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessionRepo.revoke(session.id);
      throw new UnauthorizedError("Session has expired. Please log in again.");
    }

    // Fetch user and verify active status and session version
    const user = await this.userRepo.findById(session.userId);
    if (!user || user.status !== "ACTIVE") {
      await this.sessionRepo.revoke(session.id);
      throw new UnauthorizedError("User account is inactive or disabled.");
    }

    if (user.sessionVersion !== session.version) {
      await this.sessionRepo.revoke(session.id);
      throw new UnauthorizedError("Session is no longer valid due to security invalidation.");
    }

    // Rotate refresh token: generate new token, update hash, slide expiration
    const newRawRefreshToken = this.tokenService.generateRefreshToken();
    const newRefreshTokenHash = this.tokenService.hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(
      Date.now() + appConfig.security.refreshExpiresInDays * 24 * 60 * 60 * 1000,
    );

    await this.sessionRepo.rotateToken(session.id, newRefreshTokenHash, newExpiresAt);

    // Issue new access token
    const newAccessToken = this.tokenService.createAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      sessionId: session.id,
      sessionVersion: user.sessionVersion,
    });

    this.auditService.emit({
      eventType: "REFRESH",
      userId: user.id,
      tenantId: user.tenantId,
      clientIp: meta?.clientIp,
    });

    return {
      accessToken: newAccessToken,
      expiresIn: appConfig.security.accessExpiresInSec,
      tokenType: "Bearer",
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Terminate active server session and invalidate refresh token
   */
  public async logout(
    options: { sessionId?: string; rawRefreshToken?: string; userId?: string },
    meta?: { clientIp?: string; userAgent?: string },
  ): Promise<void> {
    if (options.sessionId) {
      await this.sessionRepo.revoke(options.sessionId);
    }

    if (options.rawRefreshToken) {
      const tokenHash = this.tokenService.hashRefreshToken(options.rawRefreshToken);
      const session = await this.sessionRepo.findByTokenHash(tokenHash);
      if (session) {
        await this.sessionRepo.revoke(session.id);
      }
    }

    this.auditService.emit({
      eventType: "LOGOUT",
      userId: options.userId,
      clientIp: meta?.clientIp,
      userAgent: meta?.userAgent,
    });
  }

  /**
   * Get sanitized profile for currently authenticated user
   */
  public async getMe(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("Authenticated user profile not found.");
    }
    return this.sanitizeUser(user);
  }

  /**
   * Invalidate all sessions for a user (password reset, security incident)
   */
  public async revokeAllSessions(userId: string, reason = "SECURITY_RESET"): Promise<void> {
    await this.sessionRepo.revokeAllForUser(userId);
    await this.userRepo.incrementSessionVersion(userId);

    this.auditService.emit({
      eventType: "SESSION_REVOKED",
      userId,
      reason,
    });
  }

  /**
   * Register a user with hashed password (safe helper for seeding/tests)
   */
  public async registerUser(
    params: Omit<CreateUserParams, "passwordHash"> & { password: string },
  ): Promise<UserEntity> {
    const passwordHash = await this.passwordService.hashPassword(params.password);
    return this.userRepo.create({
      id: params.id,
      tenantId: params.tenantId,
      email: params.email,
      phone: params.phone,
      fullName: params.fullName,
      passwordHash,
      status: params.status || "ACTIVE",
      sessionVersion: params.sessionVersion ?? 1,
    });
  }
}
