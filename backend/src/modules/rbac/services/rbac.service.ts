import { PrismaClient, Prisma } from '@prisma/client';
import { IUserRoleRepository } from '../repositories/user-role.repository.interface';
import { IRoleRepository } from '../repositories/role.repository.interface';
import { IProjectMemberRepository } from '../repositories/project-member.repository.interface';
import { IStoreAccessRepository } from '../repositories/store-access.repository.interface';

export const ROLE_HIERARCHY_RANK: Record<string, number> = {
  SUPER_ADMIN: 1000,
  COMPANY_OWNER: 100,
  COMPANY_ADMIN: 90,
  PROJECT_MANAGER: 70,
  ACCOUNTANT: 60,
  HR: 60,
  PROCUREMENT_STORE: 50,
  SITE_ENGINEER: 40,
  EMPLOYEE: 20,
  VIEWER: 10,
};

export interface AssignRoleRequest {
  tenantId: string;
  assignerUserId: string;
  targetUserId: string;
  roleId: string;
  scopeType?: string;
  scopeId?: string | null;
}

export interface RemoveRoleRequest {
  tenantId: string;
  assignerUserId: string;
  targetUserId: string;
  roleId: string;
  scopeType?: string;
  scopeId?: string | null;
}

export interface AddProjectMemberRequest {
  tenantId: string;
  projectId: string;
  userId: string;
  projectRole?: string;
  isLead?: boolean;
}

export interface GrantStoreAccessRequest {
  tenantId: string;
  storeId: string;
  userId: string;
  accessLevel?: string;
}

export class RbacService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly userRoleRepo: IUserRoleRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly projectMemberRepo: IProjectMemberRepository,
    private readonly storeAccessRepo: IStoreAccessRepository
  ) {}

  async getUserHighestRank(tenantId: string, userId: string): Promise<number> {
    const roles = await this.userRoleRepo.findUserRoles(tenantId, userId);
    if (!roles || roles.length === 0) return 0;

    let maxRank = 0;
    for (const r of roles) {
      const roleName = r.role?.name || '';
      const rank = ROLE_HIERARCHY_RANK[roleName] || 0;
      if (rank > maxRank) maxRank = rank;
    }
    return maxRank;
  }

  async assignRole(req: AssignRoleRequest, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const { tenantId, assignerUserId, targetUserId, roleId, scopeType = 'TENANT', scopeId = null } = req;

    const targetUser = await client.user.findFirst({
      where: { id: targetUserId, tenantId },
    });
    if (!targetUser) {
      throw new Error(`Target user ${targetUserId} does not exist in tenant ${tenantId}`);
    }

    const targetRole = await client.role.findFirst({
      where: {
        id: roleId,
        OR: [{ tenantId }, { tenantId: null, isSystemRole: true }],
      },
    });
    if (!targetRole) {
      throw new Error(`Role ${roleId} does not exist for tenant ${tenantId}`);
    }

    const assignerRank = await this.getUserHighestRank(tenantId, assignerUserId);
    const targetRoleRank = ROLE_HIERARCHY_RANK[targetRole.name] || 0;

    if (assignerRank < ROLE_HIERARCHY_RANK.COMPANY_ADMIN) {
      throw new Error('Unauthorized: Only COMPANY_OWNER or COMPANY_ADMIN can assign roles.');
    }

    if (assignerRank < ROLE_HIERARCHY_RANK.COMPANY_OWNER && targetRoleRank >= ROLE_HIERARCHY_RANK.COMPANY_ADMIN) {
      throw new Error('Unauthorized: COMPANY_ADMIN cannot assign COMPANY_OWNER or COMPANY_ADMIN roles.');
    }

    if (targetRoleRank > assignerRank) {
      throw new Error('Unauthorized: Cannot assign a role with higher privilege than your own.');
    }

    return this.userRoleRepo.assignRole({
      tenantId,
      userId: targetUserId,
      roleId,
      scopeType,
      scopeId,
    }, tx);
  }

  async removeRole(req: RemoveRoleRequest) {
    const { tenantId, assignerUserId, targetUserId, roleId, scopeType = 'TENANT', scopeId = null } = req;

    const assignerRank = await this.getUserHighestRank(tenantId, assignerUserId);
    if (assignerRank < ROLE_HIERARCHY_RANK.COMPANY_ADMIN) {
      throw new Error('Unauthorized: Only COMPANY_OWNER or COMPANY_ADMIN can remove roles.');
    }

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new Error('Role not found');
    }

    const targetRoleRank = ROLE_HIERARCHY_RANK[role.name] || 0;
    if (assignerRank < ROLE_HIERARCHY_RANK.COMPANY_OWNER && targetRoleRank >= ROLE_HIERARCHY_RANK.COMPANY_ADMIN) {
      throw new Error('Unauthorized: COMPANY_ADMIN cannot remove COMPANY_OWNER or COMPANY_ADMIN roles.');
    }

    if (role.name === 'COMPANY_OWNER') {
      const ownerRole = await this.prisma.role.findFirst({
        where: { name: 'COMPANY_OWNER', OR: [{ tenantId }, { tenantId: null }] },
      });
      if (ownerRole) {
        const ownerCount = await this.prisma.userRoleAssignment.count({
          where: { tenantId, roleId: ownerRole.id },
        });
        if (ownerCount <= 1) {
          throw new Error('Cannot remove the last COMPANY_OWNER of the tenant.');
        }
      }
    }

    return this.userRoleRepo.removeRole(tenantId, targetUserId, roleId, scopeType, scopeId);
  }

  async getUserRoles(tenantId: string, userId: string) {
    return this.userRoleRepo.findUserRoles(tenantId, userId);
  }

  async addProjectMember(req: AddProjectMemberRequest) {
    const { tenantId, projectId, userId, projectRole = 'MEMBER', isLead = false } = req;

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      throw new Error(`Project ${projectId} not found in tenant ${tenantId}`);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new Error(`User ${userId} not found in tenant ${tenantId}`);
    }

    return this.projectMemberRepo.addMember({
      tenantId,
      projectId,
      userId,
      projectRole,
      isLead,
    });
  }

  async removeProjectMember(tenantId: string, projectId: string, userId: string) {
    return this.projectMemberRepo.removeMember(tenantId, projectId, userId);
  }

  async getProjectMembers(tenantId: string, projectId: string) {
    return this.projectMemberRepo.findProjectMembers(tenantId, projectId);
  }

  async getUserProjects(tenantId: string, userId: string) {
    return this.projectMemberRepo.findUserProjects(tenantId, userId);
  }

  async grantStoreAccess(req: GrantStoreAccessRequest) {
    const { tenantId, storeId, userId, accessLevel = 'FULL' } = req;

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId },
    });
    if (!store) {
      throw new Error(`Store ${storeId} not found in tenant ${tenantId}`);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new Error(`User ${userId} not found in tenant ${tenantId}`);
    }

    return this.storeAccessRepo.grantAccess({
      tenantId,
      storeId,
      userId,
      accessLevel,
    });
  }

  async revokeStoreAccess(tenantId: string, storeId: string, userId: string) {
    return this.storeAccessRepo.revokeAccess(tenantId, storeId, userId);
  }

  async getStoreUsers(tenantId: string, storeId: string) {
    return this.storeAccessRepo.findStoreUsers(tenantId, storeId);
  }

  async getUserStores(tenantId: string, userId: string) {
    return this.storeAccessRepo.findUserStores(tenantId, userId);
  }
}
