import type { IUserRepository, TenantUserRecord } from "../repositories/user.repository.interface";
import { PrismaUserRepository } from "../repositories/prisma-user.repository";
import type { AuthenticatedPrincipal } from "../auth.guard";
import type {
  ListTenantUsersResponseData,
  TenantUserDto,
  TenantUserInvitationDto,
  TenantUserRoleDto,
} from "../dto/tenant-user.dto";
import { ROLE_HIERARCHY_RANK } from "../../rbac/services/rbac.service";

export interface TenantUserServiceDependencies {
  userRepository?: IUserRepository;
}

export class TenantUserService {
  private static instance: TenantUserService;
  private readonly userRepo: IUserRepository;

  constructor(deps?: TenantUserServiceDependencies) {
    this.userRepo = deps?.userRepository ?? new PrismaUserRepository();
  }

  public static getInstance(deps?: TenantUserServiceDependencies): TenantUserService {
    if (!TenantUserService.instance || deps) {
      TenantUserService.instance = new TenantUserService(deps);
    }
    return TenantUserService.instance;
  }

  public static resetInstance(): void {
    TenantUserService.instance = undefined as unknown as TenantUserService;
  }

  /**
   * Lists all SaaS users, role assignments, and pending invitations for the caller's tenant.
   * Strictly enforces tenant isolation at the database layer.
   */
  public async listTenantUsers(
    principal: AuthenticatedPrincipal
  ): Promise<ListTenantUsersResponseData> {
    const tenantId = principal.tenantId;
    const rawUsers: TenantUserRecord[] = await this.userRepo.findTenantUsers(tenantId);

    const now = Date.now();

    const users: TenantUserDto[] = rawUsers.map((record) => {
      // 1. Map role assignments
      const roles: TenantUserRoleDto[] = record.roleAssignments.map((ra) => ({
        id: ra.role.id,
        name: ra.role.name,
        displayName: ra.role.displayName || ra.role.name,
        scopeType: ra.scopeType,
      }));

      // 2. Deterministically select primary role
      // Priority: TENANT-scoped roles first, sorted by highest ROLE_HIERARCHY_RANK
      const tenantRoles = roles.filter((r) => r.scopeType === "TENANT");
      const candidates = tenantRoles.length > 0 ? tenantRoles : roles;
      const sortedRoles = [...candidates].sort((a, b) => {
        const rankA = ROLE_HIERARCHY_RANK[a.name] ?? 0;
        const rankB = ROLE_HIERARCHY_RANK[b.name] ?? 0;
        return rankB - rankA;
      });

      const primaryRole = sortedRoles[0]?.name || "VIEWER";
      const roleDisplayName = sortedRoles[0]?.displayName || primaryRole;

      // 3. Department (optional from Employee link)
      const department = record.employee?.department?.name ?? null;

      // 4. Assigned Site / Project
      let assignedSite: string | null = null;
      if (record.projectMembers.length === 1) {
        assignedSite = record.projectMembers[0]!.project.name;
      } else if (record.projectMembers.length > 1) {
        assignedSite = `${record.projectMembers.length} Projects`;
      }

      // 5. Invitation state & lifecycle resolution
      let invitation: TenantUserInvitationDto | null = null;
      let effectiveStatus = record.status;

      const latestInvite = record.invitations[0];
      if (record.status === "INVITED" && latestInvite) {
        const isExpired = new Date(latestInvite.expiresAt).getTime() <= now;
        invitation = {
          id: latestInvite.id,
          status: isExpired ? "EXPIRED" : latestInvite.status,
          expiresAt: new Date(latestInvite.expiresAt).toISOString(),
          createdAt: new Date(latestInvite.createdAt).toISOString(),
        };
        if (isExpired) {
          effectiveStatus = "EXPIRED";
        }
      }

      return {
        id: record.id,
        email: record.email,
        fullName: record.fullName,
        status: effectiveStatus,
        primaryRole,
        roleDisplayName,
        roles,
        department,
        assignedSite,
        invitation,
        createdAt: new Date(record.createdAt).toISOString(),
        lastLoginAt: record.lastLoginAt ? new Date(record.lastLoginAt).toISOString() : null,
      };
    });

    return {
      users,
      total: users.length,
    };
  }
}
