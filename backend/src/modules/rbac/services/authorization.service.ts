import type { PrismaClient } from '@prisma/client';
import type { IUserRoleRepository } from '../repositories/user-role.repository.interface';
import type { IProjectMemberRepository } from '../repositories/project-member.repository.interface';
import type { IStoreAccessRepository } from '../repositories/store-access.repository.interface';
import { PrismaUserRoleRepository } from '../repositories/prisma-user-role.repository';
import { PrismaProjectMemberRepository } from '../repositories/prisma-project-member.repository';
import { PrismaStoreAccessRepository } from '../repositories/prisma-store-access.repository';
import { DatabaseService } from '../../../database/database.service';

export interface AuthorizationContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  projectIds: string[];
  storeIds: string[];
  isTenantAdmin: boolean;
}

export class AuthorizationService {
  private static instance: AuthorizationService;

  constructor(
    private readonly prisma: any,
    private readonly userRoleRepo: IUserRoleRepository,
    private readonly projectMemberRepo: IProjectMemberRepository,
    private readonly storeAccessRepo: IStoreAccessRepository
  ) {}

  public static getInstance(
    prisma?: any,
    userRoleRepo?: IUserRoleRepository,
    projectMemberRepo?: IProjectMemberRepository,
    storeAccessRepo?: IStoreAccessRepository
  ): AuthorizationService {
    if (!AuthorizationService.instance) {
      const db = prisma || DatabaseService.getInstance().getClient();
      AuthorizationService.instance = new AuthorizationService(
        db,
        userRoleRepo || new PrismaUserRoleRepository(db),
        projectMemberRepo || new PrismaProjectMemberRepository(db),
        storeAccessRepo || new PrismaStoreAccessRepository(db)
      );
    }
    return AuthorizationService.instance;
  }

  public static resetInstance(): void {
    AuthorizationService.instance = undefined as unknown as AuthorizationService;
  }

  async hasRole(tenantId: string, userId: string, roleName: string): Promise<boolean> {
    return this.userRoleRepo.hasRole(tenantId, userId, roleName);
  }

  async getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
    if (!tenantId || !userId) return [];

    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { tenantId, userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!assignments || assignments.length === 0) {
      return [];
    }

    const permissionSet = new Set<string>();
    for (const assignment of assignments) {
      if (assignment.role && assignment.role.permissions) {
        for (const mapping of assignment.role.permissions) {
          if (mapping.permission && mapping.permission.name) {
            permissionSet.add(mapping.permission.name);
          }
        }
      }
    }

    return Array.from(permissionSet);
  }

  async hasPermission(tenantId: string, userId: string, permission: string): Promise<boolean> {
    if (!tenantId || !userId || !permission) return false;

    const permissions = await this.getUserPermissions(tenantId, userId);
    return permissions.includes(permission);
  }

  async hasAllPermissions(tenantId: string, userId: string, permissions: string[]): Promise<boolean> {
    if (!tenantId || !userId || !permissions || permissions.length === 0) return false;

    const userPerms = new Set(await this.getUserPermissions(tenantId, userId));
    return permissions.every((p) => userPerms.has(p));
  }

  async hasAnyPermission(tenantId: string, userId: string, permissions: string[]): Promise<boolean> {
    if (!tenantId || !userId || !permissions || permissions.length === 0) return false;

    const userPerms = new Set(await this.getUserPermissions(tenantId, userId));
    return permissions.some((p) => userPerms.has(p));
  }

  async hasProjectAccess(
    tenantId: string,
    userId: string,
    projectId: string,
    requiredPermission?: string
  ): Promise<{ granted: boolean; reason?: string }> {
    if (!tenantId || !userId || !projectId) {
      return { granted: false, reason: 'Missing required context' };
    }

    if (requiredPermission) {
      const hasPerm = await this.hasPermission(tenantId, userId, requiredPermission);
      if (!hasPerm) {
        return { granted: false, reason: `Missing required permission: ${requiredPermission}` };
      }
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      return { granted: false, reason: 'Project not found in tenant' };
    }

    const isOwner = await this.userRoleRepo.hasRole(tenantId, userId, 'COMPANY_OWNER');
    const isAdmin = await this.userRoleRepo.hasRole(tenantId, userId, 'COMPANY_ADMIN');
    if (isOwner || isAdmin) {
      return { granted: true };
    }

    const isMember = await this.projectMemberRepo.isUserProjectMember(tenantId, projectId, userId);
    if (!isMember) {
      return { granted: false, reason: 'User is not a member of this project' };
    }

    return { granted: true };
  }

  async hasStoreAccess(
    tenantId: string,
    userId: string,
    storeId: string,
    requiredPermission?: string
  ): Promise<{ granted: boolean; reason?: string }> {
    if (!tenantId || !userId || !storeId) {
      return { granted: false, reason: 'Missing required context' };
    }

    if (requiredPermission) {
      const hasPerm = await this.hasPermission(tenantId, userId, requiredPermission);
      if (!hasPerm) {
        return { granted: false, reason: `Missing required permission: ${requiredPermission}` };
      }
    }

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId },
    });
    if (!store) {
      return { granted: false, reason: 'Store not found in tenant' };
    }

    const isOwner = await this.userRoleRepo.hasRole(tenantId, userId, 'COMPANY_OWNER');
    const isAdmin = await this.userRoleRepo.hasRole(tenantId, userId, 'COMPANY_ADMIN');
    if (isOwner || isAdmin) {
      return { granted: true };
    }

    const hasAssignment = await this.storeAccessRepo.hasStoreAccess(tenantId, storeId, userId);
    if (!hasAssignment) {
      return { granted: false, reason: 'User does not have access to this store' };
    }

    return { granted: true };
  }

  async getUserAuthorizationContext(tenantId: string, userId: string): Promise<AuthorizationContext> {
    const roles = (await this.userRoleRepo.findUserRoles(tenantId, userId)).map((r: any) => r.role?.name || '');
    const permissions = await this.getUserPermissions(tenantId, userId);
    const projects = await this.projectMemberRepo.findUserProjects(tenantId, userId);
    const stores = await this.storeAccessRepo.findUserStores(tenantId, userId);

    const isTenantAdmin = roles.includes('COMPANY_OWNER') || roles.includes('COMPANY_ADMIN');

    return {
      userId,
      tenantId,
      roles,
      permissions,
      projectIds: projects.map((p: any) => p.projectId),
      storeIds: stores.map((s: any) => s.storeId),
      isTenantAdmin,
    };
  }
}
