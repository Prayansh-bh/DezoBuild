import type { IncomingMessage } from 'node:http';
import { ForbiddenError } from '../../../common/errors/app-error';
import { requireAuth, type AuthenticatedPrincipal } from '../../auth/auth.guard';
import { AuthorizationService } from '../services/authorization.service';
import { PrismaUserRoleRepository } from '../repositories/prisma-user-role.repository';
import { PrismaProjectMemberRepository } from '../repositories/prisma-project-member.repository';
import { PrismaStoreAccessRepository } from '../repositories/prisma-store-access.repository';
import { DatabaseService } from '../../../database/database.service';

export class RbacGuard {
  private static authService: AuthorizationService = new AuthorizationService(
    DatabaseService.getInstance().getClient(),
    new PrismaUserRoleRepository(),
    new PrismaProjectMemberRepository(),
    new PrismaStoreAccessRepository()
  );

  public static setAuthService(service: AuthorizationService): void {
    this.authService = service;
  }

  public static async requirePermission(
    req: IncomingMessage,
    permission: string
  ): Promise<AuthenticatedPrincipal> {
    const principal = await requireAuth(req);

    const hasPerm = await this.authService.hasPermission(principal.tenantId, principal.userId, permission);
    if (!hasPerm) {
      throw new ForbiddenError(`Forbidden: User lacks required permission '${permission}'.`);
    }

    return principal;
  }

  public static async requireAllPermissions(
    req: IncomingMessage,
    permissions: string[]
  ): Promise<AuthenticatedPrincipal> {
    const principal = await requireAuth(req);

    const hasAll = await this.authService.hasAllPermissions(principal.tenantId, principal.userId, permissions);
    if (!hasAll) {
      throw new ForbiddenError(`Forbidden: User lacks required permissions.`);
    }

    return principal;
  }

  public static async requireAnyPermission(
    req: IncomingMessage,
    permissions: string[]
  ): Promise<AuthenticatedPrincipal> {
    const principal = await requireAuth(req);

    const hasAny = await this.authService.hasAnyPermission(principal.tenantId, principal.userId, permissions);
    if (!hasAny) {
      throw new ForbiddenError(`Forbidden: User lacks at least one required permission.`);
    }

    return principal;
  }

  public static async requireProjectScope(
    req: IncomingMessage & { params?: Record<string, string> },
    projectId?: string,
    requiredPermission?: string
  ): Promise<AuthenticatedPrincipal> {
    const principal = await requireAuth(req);
    const resolvedProjectId = projectId || req.params?.projectId || req.params?.id;

    if (!resolvedProjectId) {
      throw new ForbiddenError('Project ID is required for project-scoped access.');
    }

    const access = await this.authService.hasProjectAccess(
      principal.tenantId,
      principal.userId,
      resolvedProjectId,
      requiredPermission
    );

    if (!access.granted) {
      throw new ForbiddenError(`Forbidden: ${access.reason || 'Project access denied.'}`);
    }

    return principal;
  }

  public static async requireStoreScope(
    req: IncomingMessage & { params?: Record<string, string> },
    storeId?: string,
    requiredPermission?: string
  ): Promise<AuthenticatedPrincipal> {
    const principal = await requireAuth(req);
    const resolvedStoreId = storeId || req.params?.storeId || req.params?.id;

    if (!resolvedStoreId) {
      throw new ForbiddenError('Store ID is required for store-scoped access.');
    }

    const access = await this.authService.hasStoreAccess(
      principal.tenantId,
      principal.userId,
      resolvedStoreId,
      requiredPermission
    );

    if (!access.granted) {
      throw new ForbiddenError(`Forbidden: ${access.reason || 'Store access denied.'}`);
    }

    return principal;
  }
}

export function requirePermission(permission: string) {
  return async (req: IncomingMessage) => RbacGuard.requirePermission(req, permission);
}

export function requireProjectScope(projectId?: string, requiredPermission?: string) {
  return async (req: IncomingMessage & { params?: Record<string, string> }) =>
    RbacGuard.requireProjectScope(req, projectId, requiredPermission);
}

export function requireStoreScope(storeId?: string, requiredPermission?: string) {
  return async (req: IncomingMessage & { params?: Record<string, string> }) =>
    RbacGuard.requireStoreScope(req, storeId, requiredPermission);
}
