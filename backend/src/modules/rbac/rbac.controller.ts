import type { IncomingMessage } from 'node:http';
import { requireAuth } from '../auth/auth.guard';
import { RbacService } from './services/rbac.service';
import { AuthorizationService } from './services/authorization.service';
import { PrismaRoleRepository } from './repositories/prisma-role.repository';
import { PrismaPermissionRepository } from './repositories/prisma-permission.repository';
import { PrismaUserRoleRepository } from './repositories/prisma-user-role.repository';
import { PrismaProjectMemberRepository } from './repositories/prisma-project-member.repository';
import { PrismaStoreAccessRepository } from './repositories/prisma-store-access.repository';
import { prisma } from '../../database/prisma.client';
import { DtoValidator } from '../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../common/dto/api-response.dto';
import { assignRoleDtoSchema, removeRoleDtoSchema } from './dto/role-assignment.dto';
import { addProjectMemberDtoSchema } from './dto/project-member.dto';
import { grantStoreAccessDtoSchema } from './dto/store-access.dto';
import { ForbiddenError, NotFoundError } from '../../common/errors/app-error';

export class RbacController {
  private readonly rbacService: RbacService;
  private readonly authService: AuthorizationService;
  private readonly roleRepo: PrismaRoleRepository;
  private readonly permissionRepo: PrismaPermissionRepository;

  constructor(
    rbacService?: RbacService,
    authService?: AuthorizationService,
    roleRepo?: PrismaRoleRepository,
    permissionRepo?: PrismaPermissionRepository
  ) {
    const userRoleRepo = new PrismaUserRoleRepository(prisma);
    const projectMemberRepo = new PrismaProjectMemberRepository(prisma);
    const storeAccessRepo = new PrismaStoreAccessRepository(prisma);

    this.roleRepo = roleRepo || new PrismaRoleRepository(prisma);
    this.permissionRepo = permissionRepo || new PrismaPermissionRepository(prisma);
    this.rbacService =
      rbacService ||
      new RbacService(prisma, userRoleRepo, this.roleRepo, projectMemberRepo, storeAccessRepo);
    this.authService =
      authService ||
      new AuthorizationService(prisma, userRoleRepo, projectMemberRepo, storeAccessRepo);
  }

  // ==========================================
  // PERMISSIONS & ROLES CATALOG
  // ==========================================

  public async listPermissions(req: IncomingMessage): Promise<ApiResponse<any>> {
    await requireAuth(req);
    const permissions = await this.permissionRepo.findMany();
    return createSuccessResponse(permissions, 'Permissions retrieved successfully');
  }

  public async listRoles(req: IncomingMessage): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const roles = await this.roleRepo.findMany(principal.tenantId);
    return createSuccessResponse(roles, 'Roles retrieved successfully');
  }

  public async getRole(req: IncomingMessage & { params?: { id?: string } }): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const roleId = req.params?.id;
    if (!roleId) throw new NotFoundError('Role ID is required');

    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new NotFoundError('Role not found');

    // Tenant isolation: Role must be system role or belong to caller's tenant
    if (role.tenantId && role.tenantId !== principal.tenantId) {
      throw new ForbiddenError('Access to foreign tenant role is forbidden');
    }

    return createSuccessResponse(role, 'Role details retrieved');
  }

  // ==========================================
  // USER ROLES & PERMISSIONS
  // ==========================================

  public async getMyPermissions(req: IncomingMessage): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const context = await this.authService.getUserAuthorizationContext(principal.tenantId, principal.userId);
    return createSuccessResponse(context, 'Current user authorization context retrieved');
  }

  public async getUserRoles(
    req: IncomingMessage & { params?: { userId?: string } }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const targetUserId = req.params?.userId || principal.userId;

    if (targetUserId !== principal.userId) {
      const hasPerm = await this.authService.hasAnyPermission(principal.tenantId, principal.userId, [
        'settings:view',
        'settings:rbac:manage',
      ]);
      if (!hasPerm) {
        throw new ForbiddenError('Forbidden: Lacks permission to view other users roles');
      }
    }

    const roles = await this.rbacService.getUserRoles(principal.tenantId, targetUserId);
    return createSuccessResponse(roles, 'User roles retrieved');
  }

  public async getUserPermissions(
    req: IncomingMessage & { params?: { userId?: string } }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const targetUserId = req.params?.userId || principal.userId;

    if (targetUserId !== principal.userId) {
      const hasPerm = await this.authService.hasAnyPermission(principal.tenantId, principal.userId, [
        'settings:view',
        'settings:rbac:manage',
      ]);
      if (!hasPerm) {
        throw new ForbiddenError('Forbidden: Lacks permission to view other users permissions');
      }
    }

    const permissions = await this.authService.getUserPermissions(principal.tenantId, targetUserId);
    return createSuccessResponse({ userId: targetUserId, permissions }, 'User permissions retrieved');
  }

  public async assignRole(req: IncomingMessage & { body?: unknown }): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const validated = DtoValidator.validate(assignRoleDtoSchema, req.body);

    const assignment = await this.rbacService.assignRole({
      tenantId: principal.tenantId,
      assignerUserId: principal.userId,
      targetUserId: validated.userId,
      roleId: validated.roleId,
      scopeType: validated.scopeType,
      scopeId: validated.scopeId ?? null,
    });

    return createSuccessResponse(assignment, 'Role assigned successfully');
  }

  public async removeRole(
    req: IncomingMessage & { params?: { userId?: string; roleId?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const targetUserId = req.params?.userId;
    const roleId = req.params?.roleId;

    if (!targetUserId || !roleId) {
      throw new NotFoundError('Target userId and roleId are required');
    }

    const success = await this.rbacService.removeRole({
      tenantId: principal.tenantId,
      assignerUserId: principal.userId,
      targetUserId,
      roleId,
    });

    return createSuccessResponse({ success }, 'Role removed successfully');
  }

  // ==========================================
  // PROJECT MEMBERSHIP SCOPE
  // ==========================================

  public async listProjectMembers(
    req: IncomingMessage & { params?: { projectId?: string } }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const projectId = req.params?.projectId;
    if (!projectId) throw new NotFoundError('Project ID is required');

    const access = await this.authService.hasProjectAccess(principal.tenantId, principal.userId, projectId);
    if (!access.granted) {
      throw new ForbiddenError(`Forbidden: ${access.reason}`);
    }

    const members = await this.rbacService.getProjectMembers(principal.tenantId, projectId);
    return createSuccessResponse(members, 'Project members retrieved');
  }

  public async addProjectMember(
    req: IncomingMessage & { params?: { projectId?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const projectId = req.params?.projectId;
    if (!projectId) throw new NotFoundError('Project ID is required');

    const hasPerm = await this.authService.hasAnyPermission(principal.tenantId, principal.userId, [
      'projects:manage',
      'projects:create',
      'settings:rbac:manage',
    ]);
    if (!hasPerm) {
      throw new ForbiddenError('Forbidden: Lacks permission to manage project members');
    }

    const validated = DtoValidator.validate(addProjectMemberDtoSchema, req.body);
    const member = await this.rbacService.addProjectMember({
      tenantId: principal.tenantId,
      projectId,
      userId: validated.userId,
      projectRole: validated.projectRole,
      isLead: validated.isLead,
    });

    return createSuccessResponse(member, 'Project member added successfully');
  }

  public async removeProjectMember(
    req: IncomingMessage & { params?: { projectId?: string; userId?: string } }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const projectId = req.params?.projectId;
    const targetUserId = req.params?.userId;
    if (!projectId || !targetUserId) throw new NotFoundError('Project ID and User ID are required');

    const hasPerm = await this.authService.hasAnyPermission(principal.tenantId, principal.userId, [
      'projects:manage',
      'projects:create',
      'settings:rbac:manage',
    ]);
    if (!hasPerm) {
      throw new ForbiddenError('Forbidden: Lacks permission to manage project members');
    }

    const success = await this.rbacService.removeProjectMember(principal.tenantId, projectId, targetUserId);
    return createSuccessResponse({ success }, 'Project member removed successfully');
  }

  // ==========================================
  // STORE ACCESS SCOPE
  // ==========================================

  public async listStoreUsers(
    req: IncomingMessage & { params?: { storeId?: string } }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const storeId = req.params?.storeId;
    if (!storeId) throw new NotFoundError('Store ID is required');

    const access = await this.authService.hasStoreAccess(principal.tenantId, principal.userId, storeId);
    if (!access.granted) {
      throw new ForbiddenError(`Forbidden: ${access.reason}`);
    }

    const users = await this.rbacService.getStoreUsers(principal.tenantId, storeId);
    return createSuccessResponse(users, 'Store access assignments retrieved');
  }

  public async grantStoreAccess(
    req: IncomingMessage & { params?: { storeId?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const storeId = req.params?.storeId;
    if (!storeId) throw new NotFoundError('Store ID is required');

    const hasPerm = await this.authService.hasAnyPermission(principal.tenantId, principal.userId, [
      'materials:manage',
      'settings:rbac:manage',
    ]);
    if (!hasPerm) {
      throw new ForbiddenError('Forbidden: Lacks permission to manage store access');
    }

    const validated = DtoValidator.validate(grantStoreAccessDtoSchema, req.body);
    const assignment = await this.rbacService.grantStoreAccess({
      tenantId: principal.tenantId,
      storeId,
      userId: validated.userId,
      accessLevel: validated.accessLevel,
    });

    return createSuccessResponse(assignment, 'Store access granted successfully');
  }

  public async revokeStoreAccess(
    req: IncomingMessage & { params?: { storeId?: string; userId?: string } }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const storeId = req.params?.storeId;
    const targetUserId = req.params?.userId;
    if (!storeId || !targetUserId) throw new NotFoundError('Store ID and User ID are required');

    const hasPerm = await this.authService.hasAnyPermission(principal.tenantId, principal.userId, [
      'materials:manage',
      'settings:rbac:manage',
    ]);
    if (!hasPerm) {
      throw new ForbiddenError('Forbidden: Lacks permission to manage store access');
    }

    const success = await this.rbacService.revokeStoreAccess(principal.tenantId, storeId, targetUserId);
    return createSuccessResponse({ success }, 'Store access revoked successfully');
  }
}
