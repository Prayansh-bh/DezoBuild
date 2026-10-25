import type { IncomingMessage, ServerResponse } from "node:http";
import { AuthService } from "./auth.service";
import { loginDtoSchema } from "./dto/login.dto";
import { DtoValidator } from "../../common/validation/validator";
import { createSuccessResponse, type ApiResponse } from "../../common/dto/api-response.dto";
import { TokenService } from "./services/token.service";
import { requireAuth } from "./auth.guard";
import type { LoginResponseData, RefreshResponseData, LogoutResponseData, SafeUser } from "./dto/auth-response.dto";
import { UnauthorizedError } from "../../common/errors/app-error";

export class AuthController {
  private readonly authService: AuthService;
  private readonly tokenService: TokenService;

  constructor(authService?: AuthService, tokenService?: TokenService) {
    this.authService = authService || AuthService.getInstance();
    this.tokenService = tokenService || TokenService.getInstance();
  }

  /**
   * POST /api/v1/auth/login
   */
  public async login(
    req: IncomingMessage & { body?: unknown },
    res: ServerResponse,
  ): Promise<ApiResponse<LoginResponseData>> {
    const validatedDto = DtoValidator.validate(loginDtoSchema, req.body);
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.authService.login(validatedDto, {
      clientIp,
      userAgent,
    });

    // Set HttpOnly, Secure refresh token cookie
    const cookieHeader = this.tokenService.serializeRefreshCookie(result.refreshToken);
    res.setHeader("Set-Cookie", cookieHeader);

    // Omit raw refreshToken from response JSON body
    const responseData: LoginResponseData = {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      user: result.user,
    };

    return createSuccessResponse(responseData, "Authentication successful");
  }

  /**
   * POST /api/v1/auth/refresh
   */
  public async refresh(
    req: IncomingMessage & { body?: any },
    res: ServerResponse,
  ): Promise<ApiResponse<RefreshResponseData>> {
    const rawCookie = req.headers.cookie;
    const tokenFromCookie = this.tokenService.extractRefreshTokenFromCookie(rawCookie);
    const tokenFromBody = req.body && typeof req.body === "object" ? req.body.refreshToken : undefined;

    const refreshToken = tokenFromCookie || tokenFromBody;

    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token not found in cookies or request payload.");
    }

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.authService.refresh(refreshToken, {
      clientIp,
      userAgent,
    });

    // Rotate refresh cookie
    const cookieHeader = this.tokenService.serializeRefreshCookie(result.refreshToken);
    res.setHeader("Set-Cookie", cookieHeader);

    const responseData: RefreshResponseData = {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
    };

    return createSuccessResponse(responseData, "Access token refreshed successfully");
  }

  /**
   * POST /api/v1/auth/logout
   */
  public async logout(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<ApiResponse<LogoutResponseData>> {
    const rawCookie = req.headers.cookie;
    const refreshToken = this.tokenService.extractRefreshTokenFromCookie(rawCookie);

    // Optional auth token check
    const authHeader = req.headers.authorization;
    let sessionId: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = this.tokenService.verifyAccessToken(authHeader.substring(7));
        sessionId = payload.sid;
      } catch {
        // Token may already be expired during logout
      }
    }

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    await this.authService.logout(
      { sessionId, rawRefreshToken: refreshToken },
      { clientIp, userAgent },
    );

    // Clear refresh cookie
    const clearCookieHeader = this.tokenService.serializeClearRefreshCookie();
    res.setHeader("Set-Cookie", clearCookieHeader);

    return createSuccessResponse(
      { message: "Session terminated successfully." },
      "Logged out successfully",
    );
  }

  /**
   * GET /api/v1/auth/me
   */
  public async getMe(
    req: IncomingMessage & { user?: { userId: string } },
  ): Promise<ApiResponse<SafeUser>> {
    const principal = await requireAuth(req);
    const user = await this.authService.getMe(principal.userId);
    return createSuccessResponse(user, "Authenticated user profile");
  }
}
