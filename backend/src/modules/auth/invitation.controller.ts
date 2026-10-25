import type { IncomingMessage, ServerResponse } from "node:http";
import { InvitationService } from "./services/invitation.service";
import { TenantUserService } from "./services/tenant-user.service";
import { TokenService } from "./services/token.service";
import { DtoValidator } from "../../common/validation/validator";
import {
  inviteUserSchema,
  acceptInviteSchema,
  revokeInviteParamsSchema,
  type InvitationResponseData,
} from "./dto/invitation.dto";
import type { ListTenantUsersResponseData } from "./dto/tenant-user.dto";
import { createSuccessResponse, type ApiResponse } from "../../common/dto/api-response.dto";
import { RbacGuard } from "../rbac/guards/rbac.guard";
import type { LoginResponseData } from "./dto/auth-response.dto";

export class InvitationController {
  private readonly invitationService: InvitationService;
  private readonly tenantUserService: TenantUserService;
  private readonly tokenService: TokenService;

  constructor(
    invitationService?: InvitationService,
    tokenService?: TokenService,
    tenantUserService?: TenantUserService
  ) {
    this.invitationService = invitationService ?? InvitationService.getInstance();
    this.tokenService = tokenService ?? TokenService.getInstance();
    this.tenantUserService = tenantUserService ?? TenantUserService.getInstance();
  }

  /**
   * GET /api/v1/tenants/users
   * Requires authenticated tenant user with 'settings:rbac:manage' permission.
   */
  public async listUsers(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<ApiResponse<ListTenantUsersResponseData>> {
    const principal = await RbacGuard.requirePermission(req, "settings:rbac:manage");
    const result = await this.tenantUserService.listTenantUsers(principal);
    res.statusCode = 200;
    return createSuccessResponse(result, "Tenant users retrieved successfully");
  }

  /**
   * POST /api/v1/tenants/users/invite
   * Requires authenticated tenant user with 'settings:rbac:manage' permission.
   */
  public async invite(
    req: IncomingMessage & { body?: unknown },
    res: ServerResponse
  ): Promise<ApiResponse<InvitationResponseData>> {
    const principal = await RbacGuard.requirePermission(req, "settings:rbac:manage");
    const validatedDto = DtoValidator.validate(inviteUserSchema, req.body);

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.invitationService.inviteUser(principal, validatedDto, {
      clientIp,
      userAgent,
    });

    res.statusCode = 201;
    return createSuccessResponse(result, "Invitation sent successfully");
  }

  /**
   * POST /api/v1/auth/accept-invite
   * Public endpoint to validate invitation token, set user password, and establish session.
   */
  public async accept(
    req: IncomingMessage & { body?: unknown },
    res: ServerResponse
  ): Promise<ApiResponse<LoginResponseData>> {
    const validatedDto = DtoValidator.validate(acceptInviteSchema, req.body);

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.invitationService.acceptInvitation(validatedDto, {
      clientIp,
      userAgent,
    });

    // Set HttpOnly, Secure refresh token cookie
    const cookieHeader = this.tokenService.serializeRefreshCookie(result.refreshToken);
    res.setHeader("Set-Cookie", cookieHeader);

    const responseData: LoginResponseData = {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      user: result.user,
    };

    return createSuccessResponse(responseData, "Invitation accepted successfully");
  }

  /**
   * POST /api/v1/tenants/users/invitations/:id/revoke
   * Requires authenticated tenant user with 'settings:rbac:manage' permission.
   */
  public async revoke(
    req: IncomingMessage & { params: Record<string, string> },
    _res: ServerResponse
  ): Promise<ApiResponse<{ message: string }>> {
    const principal = await RbacGuard.requirePermission(req, "settings:rbac:manage");
    const validatedParams = DtoValidator.validate(revokeInviteParamsSchema, req.params);

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.invitationService.revokeInvitation(
      principal,
      validatedParams.id,
      { clientIp, userAgent }
    );

    return createSuccessResponse({ message: result.message }, result.message);
  }
}
