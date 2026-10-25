import type { IncomingMessage } from 'node:http';
import { MusterService } from '../services/muster.service.js';
import { createMusterSchema, approveMusterSchema, listMustersQuerySchema } from '../dto/muster.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildPeopleContext } from '../helpers/context.helper.js';

export class MustersController {
  constructor(private readonly musterService: MusterService) {}

  public async listMusters(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listMustersQuerySchema, req.query || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.musterService.listMusters(context, query);
    return createSuccessResponse(result, 'Labour musters retrieved successfully');
  }

  public async createMuster(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createMusterSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.musterService.createMuster(context, dto);
    return createSuccessResponse(result, 'Labour muster recorded successfully');
  }

  public async approveMuster(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = req.body ? DtoValidator.validate(approveMusterSchema, req.body) : undefined;
    const context = buildPeopleContext(principal, req);

    const result = await this.musterService.approveMuster(context, id, dto);
    return createSuccessResponse(result, 'Labour muster approved successfully');
  }
}
