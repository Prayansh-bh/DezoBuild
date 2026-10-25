import type { IncomingMessage } from 'node:http';
import { LeaveService } from '../services/leave.service.js';
import { createLeaveSchema, approveLeaveSchema, listLeavesQuerySchema } from '../dto/leave.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildPeopleContext } from '../helpers/context.helper.js';

export class LeavesController {
  constructor(private readonly leaveService: LeaveService) {}

  public async listLeaves(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listLeavesQuerySchema, req.query || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.leaveService.listLeaves(context, query);
    return createSuccessResponse(result, 'Leave records retrieved successfully');
  }

  public async createLeave(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createLeaveSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.leaveService.createLeave(context, dto);
    return createSuccessResponse(result, 'Leave request submitted successfully');
  }

  public async approveLeave(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = req.body ? DtoValidator.validate(approveLeaveSchema, req.body) : undefined;
    const context = buildPeopleContext(principal, req);

    const result = await this.leaveService.approveLeave(context, id, dto);
    return createSuccessResponse(result, 'Leave request approved successfully');
  }
}
