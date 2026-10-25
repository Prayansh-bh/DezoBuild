import { PrismaClient, Prisma, type User, type UserInvitation } from "@prisma/client";
import { DatabaseService } from "../../../database/database.service";
import { AuthService } from "../auth.service";
import { PasswordService, type IPasswordService } from "./password.service";
import { TokenService, type ITokenService } from "./token.service";
import { AuthAuditService, type IAuthAuditService } from "./audit.service";
import type { IUserRepository } from "../repositories/user.repository.interface";
import { PrismaUserRepository } from "../repositories/prisma-user.repository";
import type { ISessionRepository } from "../repositories/session.repository.interface";
import { PrismaSessionRepository } from "../repositories/prisma-session.repository";
import {
  RbacService,
  ROLE_HIERARCHY_RANK,
} from "../../rbac/services/rbac.service";
import { PrismaUserRoleRepository } from "../../rbac/repositories/prisma-user-role.repository";
import { PrismaRoleRepository } from "../../rbac/repositories/prisma-role.repository";
import { PrismaProjectMemberRepository } from "../../rbac/repositories/prisma-project-member.repository";
import { PrismaStoreAccessRepository } from "../../rbac/repositories/prisma-store-access.repository";
import { CapacityService } from "../../subscriptions/services/capacity.service";
import { OutboxRepository } from "../../alerts/repositories/outbox.repository";
import { appConfig } from "../../../config/app.config";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../common/errors/app-error";
import type { AuthenticatedPrincipal } from "../auth.guard";
import type {
  InviteUserDto,
  AcceptInviteDto,
  InvitationResponseData,
} from "../dto/invitation.dto";
import type { LoginResponseData } from "../dto/auth-response.dto";

export interface InvitationServiceDependencies {
  prisma?: PrismaClient | undefined;
  userRepository?: IUserRepository | undefined;
  sessionRepository?: ISessionRepository | undefined;
  passwordService?: IPasswordService | undefined;
  tokenService?: ITokenService | undefined;
  rbacService?: RbacService | undefined;
  capacityService?: CapacityService | undefined;
  outboxRepository?: OutboxRepository | undefined;
  auditService?: IAuthAuditService | undefined;
  authService?: AuthService | undefined;
}

export class InvitationService {
  private static instance: InvitationService;
  private readonly prisma: PrismaClient;
  private readonly userRepo: IUserRepository;
  private readonly sessionRepo: ISessionRepository;
  private readonly passwordService: IPasswordService;
  private readonly tokenService: ITokenService;
  private readonly rbacService: RbacService;
  private readonly capacityService: CapacityService;
  private readonly outboxRepo: OutboxRepository;
  private readonly auditService: IAuthAuditService;
  private readonly authService: AuthService;

  constructor(deps?: InvitationServiceDependencies) {
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
    this.userRepo = deps?.userRepository ?? new PrismaUserRepository();
    this.sessionRepo = deps?.sessionRepository ?? new PrismaSessionRepository();
    this.passwordService = deps?.passwordService ?? PasswordService.getInstance();
    this.tokenService = deps?.tokenService ?? TokenService.getInstance();

    const userRoleRepo = new PrismaUserRoleRepository(this.prisma);
    const roleRepo = new PrismaRoleRepository(this.prisma);
    const projectMemberRepo = new PrismaProjectMemberRepository(this.prisma);
    const storeAccessRepo = new PrismaStoreAccessRepository(this.prisma);

    this.rbacService =
      deps?.rbacService ??
      new RbacService(this.prisma, userRoleRepo, roleRepo, projectMemberRepo, storeAccessRepo);
    this.capacityService = deps?.capacityService ?? CapacityService.getInstance(this.prisma);
    this.outboxRepo = deps?.outboxRepository ?? new OutboxRepository(this.prisma);
    this.auditService = deps?.auditService ?? AuthAuditService.getInstance();
    this.authService = deps?.authService ?? AuthService.getInstance();
  }

  public static getInstance(deps?: InvitationServiceDependencies): InvitationService {
    if (!InvitationService.instance || deps) {
      InvitationService.instance = new InvitationService(deps);
    }
    return InvitationService.instance;
  }

  public static resetInstance(): void {
    InvitationService.instance = undefined as unknown as InvitationService;
  }

  /**
   * Invites a new team member into the caller's tenant.
   * Runs atomically inside a single Prisma interactive transaction.
   */
  public async inviteUser(
    caller: AuthenticatedPrincipal,
    dto: InviteUserDto,
    meta?: { clientIp?: string; userAgent?: string }
  ): Promise<InvitationResponseData> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const tenantId = caller.tenantId;

    // 1. Pre-check existing user in tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      if (existingUser.status === "ACTIVE") {
        throw new ConflictError("User with this email already exists in this organization.");
      }
      if (existingUser.status === "INVITED") {
        throw new ConflictError("An active invitation already exists for this email address.");
      }
      if (existingUser.status === "SUSPENDED") {
        throw new ConflictError("User with this email is currently suspended in this organization.");
      }
    }

    // 2. Pre-check existing unexpired pending invitation
    const pendingInvite = await this.prisma.userInvitation.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvite) {
      throw new ConflictError("An active invitation already exists for this email address.");
    }

    // 3. Execute atomic invitation transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 3a. Lock tenant subscription & enforce seat capacity
      await this.capacityService.enforceSeatCapacity(tenantId, tx);

      // 3b. Verify target role exists and belongs to tenant (or global system role)
      const targetRole = await tx.role.findFirst({
        where: {
          id: dto.roleId,
          OR: [{ tenantId }, { tenantId: null, isSystemRole: true }],
        },
      });

      if (!targetRole) {
        throw new NotFoundError(`Role ${dto.roleId} does not exist for this tenant.`);
      }

      // 3c. Validate assigner and target role hierarchy
      const assignerRank = await this.rbacService.getUserHighestRank(tenantId, caller.userId);
      const targetRoleRank = ROLE_HIERARCHY_RANK[targetRole.name] || 0;

      if (assignerRank < ROLE_HIERARCHY_RANK.COMPANY_ADMIN) {
        throw new ForbiddenError(
          "Unauthorized: Only COMPANY_OWNER or COMPANY_ADMIN can invite team members."
        );
      }

      if (
        assignerRank < ROLE_HIERARCHY_RANK.COMPANY_OWNER &&
        targetRoleRank >= ROLE_HIERARCHY_RANK.COMPANY_ADMIN
      ) {
        throw new ForbiddenError(
          "Unauthorized: COMPANY_ADMIN cannot assign COMPANY_OWNER or COMPANY_ADMIN roles."
        );
      }

      if (targetRoleRank > assignerRank) {
        throw new ForbiddenError(
          "Unauthorized: Cannot assign a role with higher privilege than your own."
        );
      }

      // 3d. Create or reactivate User record with INVITED status
      let user: { id: string; fullName: string; tenantId: string; status: string; email: string };
      if (existingUser && existingUser.status === "REVOKED") {
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            fullName: dto.fullName.trim(),
            status: "INVITED",
            updatedAt: new Date(),
          },
        });
      } else {
        user = await this.userRepo.create(
          {
            tenantId,
            email: normalizedEmail,
            fullName: dto.fullName.trim(),
            passwordHash: "!INVITED_UNSET_PASSWORD!",
            status: "INVITED",
            sessionVersion: 1,
          },
          tx
        );
      }

      // 3e. Assign role via RbacService using transaction client
      await this.rbacService.assignRole(
        {
          tenantId,
          assignerUserId: caller.userId,
          targetUserId: user.id,
          roleId: dto.roleId,
          scopeType: "TENANT",
          scopeId: null,
        },
        tx
      );

      // 3f. Generate cryptographically secure opaque token (256 bits)
      const rawToken = this.tokenService.generateInvitationToken();
      const tokenHash = this.tokenService.hashInvitationToken(rawToken);
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

      // 3g. Persist UserInvitation record
      const invitation = await tx.userInvitation.create({
        data: {
          tenantId,
          userId: user.id,
          email: normalizedEmail,
          roleId: dto.roleId,
          tokenHash,
          status: "PENDING",
          expiresAt,
          invitedById: caller.userId,
        },
        include: {
          role: true,
        },
      });

      // 3h. Atomically emit durable Outbox event for asynchronous notification
      const idempotencyKey = `invite:${invitation.id}`;
      await this.outboxRepo.create(
        {
          tenantId,
          eventType: "user.invited",
          aggregateType: "UserInvitation",
          aggregateId: invitation.id,
          payload: {
            invitationId: invitation.id,
            tenantId,
            userId: user.id,
            email: normalizedEmail,
            fullName: user.fullName,
            roleId: dto.roleId,
            roleName: targetRole.name,
            token: rawToken, // ONLY transient in outbox payload for email worker, never stored in DB
            expiresAt: expiresAt.toISOString(),
            invitedById: caller.userId,
          },
          idempotencyKey,
        },
        tx
      );

      return {
        invitation,
        user,
        roleName: targetRole.name,
      };
    });

    // 4. Record audit event
    this.auditService.emit({
      eventType: "INVITATION_CREATED",
      userId: caller.userId,
      tenantId: caller.tenantId,
      clientIp: meta?.clientIp,
      userAgent: meta?.userAgent,
      metadata: {
        invitationId: result.invitation.id,
        targetEmail: normalizedEmail,
        roleId: dto.roleId,
      },
    });

    return {
      id: result.invitation.id,
      email: result.invitation.email,
      fullName: result.user.fullName,
      roleId: result.invitation.roleId,
      roleName: result.roleName,
      status: result.invitation.status,
      expiresAt: result.invitation.expiresAt.toISOString(),
      createdAt: result.invitation.createdAt.toISOString(),
    };
  }

  /**
   * Accepts an invitation using a raw opaque token, sets the password,
   * transitions User from INVITED to ACTIVE, and establishes an authenticated session.
   * Concurrency-safe against duplicate acceptance races.
   */
  public async acceptInvitation(
    dto: AcceptInviteDto,
    meta?: { clientIp?: string; userAgent?: string }
  ): Promise<LoginResponseData & { refreshToken: string }> {
    const tokenHash = this.tokenService.hashInvitationToken(dto.token.trim());

    // Execute atomic acceptance transaction
    const { user, invitation } = await this.prisma.$transaction(async (tx) => {
      // 1. Locate invitation by token hash
      const invite = await tx.userInvitation.findFirst({
        where: { tokenHash },
        include: {
          user: true,
          role: true,
          tenant: true,
        },
      });

      if (!invite) {
        throw new NotFoundError("Invalid or expired invitation token.");
      }

      // 2. Validate status and expiration
      const now = new Date();
      if (invite.status === "EXPIRED" || (invite.status === "PENDING" && invite.expiresAt <= now)) {
        if (invite.status === "PENDING") {
          await tx.userInvitation.update({
            where: { id: invite.id },
            data: { status: "EXPIRED" },
          });
        }
        throw new BadRequestError("This invitation has expired.");
      }

      if (invite.status === "REVOKED" || invite.revokedAt !== null) {
        throw new ConflictError("This invitation has been revoked.");
      }

      if (invite.status === "ACCEPTED" || invite.acceptedAt !== null) {
        throw new ConflictError("This invitation has already been accepted.");
      }

      // 3. Acquire pessimistic row lock to serialize concurrent acceptance requests
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM user_invitations
        WHERE id = ${invite.id}::uuid AND status = 'PENDING'
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new ConflictError("This invitation has already been accepted.");
      }

      // 4. Verify associated User record is in INVITED status
      const targetUser = await tx.user.findUnique({
        where: { id: invite.userId },
      });

      if (!targetUser || targetUser.status !== "INVITED") {
        throw new ConflictError("User is not in an invitable state.");
      }

      // 5. Hash password with bcrypt
      const passwordHash = await this.passwordService.hashPassword(dto.password);

      // 6. Transition User from INVITED to ACTIVE (seat count unchanged: ONE USER = ONE SEAT)
      const updatedUser = await tx.user.update({
        where: { id: targetUser.id },
        data: {
          passwordHash,
          status: "ACTIVE",
          fullName: dto.fullName?.trim() || targetUser.fullName,
          sessionVersion: { increment: 1 },
          updatedAt: now,
        },
      });

      // 7. Mark invitation ACCEPTED
      const updatedInvitation = await tx.userInvitation.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      // 8. Create durable Outbox event
      const idempotencyKey = `accept:${invite.id}`;
      await this.outboxRepo.create(
        {
          tenantId: invite.tenantId,
          eventType: "invitation.accepted",
          aggregateType: "UserInvitation",
          aggregateId: invite.id,
          payload: {
            invitationId: invite.id,
            tenantId: invite.tenantId,
            userId: updatedUser.id,
            email: updatedUser.email,
            acceptedAt: now.toISOString(),
          },
          idempotencyKey,
        },
        tx
      );

      return {
        user: updatedUser,
        invitation: updatedInvitation,
      };
    });

    // 9. Establish authenticated session
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const refreshExpiry = new Date(
      Date.now() + appConfig.security.refreshExpiresInDays * 24 * 60 * 60 * 1000
    );

    const session = await this.sessionRepo.create({
      tenantId: user.tenantId,
      userId: user.id,
      refreshTokenHash,
      userAgent: meta?.userAgent || null,
      ipAddress: meta?.clientIp || null,
      version: user.sessionVersion,
      expiresAt: refreshExpiry,
    });

    await this.userRepo.updateLastLogin(user.id);

    const accessToken = this.tokenService.createAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      sessionId: session.id,
      sessionVersion: user.sessionVersion,
    });

    // Fetch full user with tenant and roles for safe sanitization
    const fullUser = await this.userRepo.findById(user.id);
    const sanitizedUser = this.authService.sanitizeUser(fullUser || (user as any));

    // 10. Audit logging
    this.auditService.emit({
      eventType: "INVITATION_ACCEPTED",
      userId: user.id,
      tenantId: user.tenantId,
      clientIp: meta?.clientIp,
      userAgent: meta?.userAgent,
      metadata: {
        invitationId: invitation.id,
      },
    });

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
      user: sanitizedUser,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Revokes a pending invitation.
   * Atomically updates UserInvitation to REVOKED, transitions associated User
   * status to REVOKED (releasing reserved seat capacity), and creates an Outbox event.
   */
  public async revokeInvitation(
    caller: AuthenticatedPrincipal,
    invitationId: string,
    meta?: { clientIp?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = caller.tenantId;

    // Check assigner rank
    const assignerRank = await this.rbacService.getUserHighestRank(tenantId, caller.userId);
    if (assignerRank < ROLE_HIERARCHY_RANK.COMPANY_ADMIN) {
      throw new ForbiddenError(
        "Unauthorized: Only COMPANY_OWNER or COMPANY_ADMIN can revoke invitations."
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Lock invitation row
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM user_invitations
        WHERE id = ${invitationId}::uuid AND tenant_id = ${tenantId}::uuid
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundError("Invitation not found.");
      }

      // 2. Fetch invitation details
      const invitation = await tx.userInvitation.findFirst({
        where: {
          id: invitationId,
          tenantId,
        },
        include: {
          role: true,
        },
      });

      if (!invitation) {
        throw new NotFoundError("Invitation not found.");
      }

      if (invitation.status !== "PENDING") {
        throw new ConflictError(`Cannot revoke invitation with status '${invitation.status}'.`);
      }

      // 3. Validate role hierarchy rank
      const targetRoleRank = ROLE_HIERARCHY_RANK[invitation.role.name] || 0;
      if (
        assignerRank < ROLE_HIERARCHY_RANK.COMPANY_OWNER &&
        targetRoleRank >= ROLE_HIERARCHY_RANK.COMPANY_ADMIN
      ) {
        throw new ForbiddenError(
          "Unauthorized: COMPANY_ADMIN cannot revoke COMPANY_OWNER or COMPANY_ADMIN invitations."
        );
      }

      if (targetRoleRank > assignerRank) {
        throw new ForbiddenError(
          "Unauthorized: Cannot revoke an invitation for a role with higher privilege than your own."
        );
      }

      const now = new Date();

      // 4. Update UserInvitation to REVOKED
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "REVOKED",
          revokedAt: now,
        },
      });

      // 5. Update User status to REVOKED (releases reserved seat capacity immediately)
      await tx.user.update({
        where: { id: invitation.userId },
        data: {
          status: "REVOKED",
          updatedAt: now,
        },
      });

      // 6. Emit Outbox event
      const idempotencyKey = `revoke:${invitation.id}`;
      await this.outboxRepo.create(
        {
          tenantId,
          eventType: "invitation.revoked",
          aggregateType: "UserInvitation",
          aggregateId: invitation.id,
          payload: {
            invitationId: invitation.id,
            tenantId,
            userId: invitation.userId,
            revokedById: caller.userId,
            revokedAt: now.toISOString(),
          },
          idempotencyKey,
        },
        tx
      );
    });

    // 7. Audit log
    this.auditService.emit({
      eventType: "INVITATION_REVOKED",
      userId: caller.userId,
      tenantId: caller.tenantId,
      clientIp: meta?.clientIp,
      userAgent: meta?.userAgent,
      metadata: {
        invitationId,
      },
    });

    return {
      success: true,
      message: "Invitation revoked successfully.",
    };
  }
}
