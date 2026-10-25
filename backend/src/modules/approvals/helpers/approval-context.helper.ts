import type { IncomingMessage } from 'node:http';
import type { AuthenticatedPrincipal } from '../../auth/auth.guard.js';
import { AuthorizationService } from '../../rbac/services/authorization.service.js';

export interface ApprovalRequestContext {
  tenantId: string;
  user: {
    id: string;
    roles: string[];
    permissions: string[];
    projectIds: string[];
    storeIds: string[];
    isTenantAdmin: boolean;
  };
  ipAddress?: string;
}

export async function buildApprovalContext(
  principal: AuthenticatedPrincipal,
  req?: IncomingMessage
): Promise<ApprovalRequestContext> {
  const forwarded = req?.headers ? (req.headers['x-forwarded-for'] as string) : undefined;
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req?.socket?.remoteAddress || '127.0.0.1';

  const authCtx = await AuthorizationService.getInstance().getUserAuthorizationContext(
    principal.tenantId,
    principal.userId
  );

  return {
    tenantId: principal.tenantId,
    user: {
      id: principal.userId,
      roles: authCtx.roles,
      permissions: authCtx.permissions,
      projectIds: authCtx.projectIds,
      storeIds: authCtx.storeIds,
      isTenantAdmin: authCtx.isTenantAdmin,
    },
    ipAddress,
  };
}
