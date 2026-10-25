import type { IncomingMessage } from 'node:http';
import { RegularizationService } from '../services/regularization.service.js';
import { createRegularizationSchema, rejectRegularizationSchema } from '../dto/attendance.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildPeopleContext } from '../helpers/context.helper.js';

export class RegularizationsController {
  constructor(private readonly regularizationService: RegularizationService) {}

  public async createRegularization(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createRegularizationSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.regularizationService.requestRegularization(context, dto);
    return createSuccessResponse(result, 'Attendance regularization requested successfully');
  }

  public async approveRegularization(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildPeopleContext(principal, req);

    const result = await this.regularizationService.approveRegularization(context, id);
    return createSuccessResponse(result, 'Attendance regularization approved successfully');
  }

  public async rejectRegularization(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(rejectRegularizationSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.regularizationService.rejectRegularization(context, id, dto);
    return createSuccessResponse(result, 'Attendance regularization rejected successfully');
  }
}
