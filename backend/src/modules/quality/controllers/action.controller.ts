import type { IncomingMessage } from 'node:http';
import { ActionService } from '../services/action.service.js';
import {
  createActionSchema,
  reassignActionSchema,
  completeActionSchema,
  verifyActionSchema,
  cancelActionSchema,
  reopenActionSchema,
  listActionsQuerySchema,
} from '../dto/action.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildQualityContext } from '../helpers/quality-context.helper.js';

export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  public async listActions(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:view', 'safety:view']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listActionsQuerySchema, req.query || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.actionService.list(context, query);
    return createSuccessResponse(result, 'CAPA actions retrieved successfully');
  }

  public async createAction(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await EntitlementGuard.requireFeature(req, 'projects:core');
    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createActionSchema, req.body || {});

    // Canonical Permission check based on source
    if (dto.ncrId) {
      await RbacGuard.requirePermission(req, 'quality:ncr:create');
    } else if (dto.incidentId) {
      await RbacGuard.requirePermission(req, 'safety:incident:create');
    } else if (dto.observationId) {
      await RbacGuard.requirePermission(req, 'safety:audit:create');
    } else {
      await RbacGuard.requireAnyPermission(req, ['quality:ncr:create', 'safety:audit:create', 'safety:incident:create']);
    }

    const context = await buildQualityContext(principal, req);
    const result = await this.actionService.create(context, dto);
    return createSuccessResponse(result, 'CAPA action created successfully');
  }

  public async getAction(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:view', 'safety:view']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.actionService.getById(context, id);
    return createSuccessResponse(result, 'CAPA action retrieved successfully');
  }

  public async reassignAction(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:ncr:create', 'safety:audit:create', 'safety:incident:create']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(reassignActionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.actionService.reassign(context, id, dto);
    return createSuccessResponse(result, 'CAPA action reassigned successfully');
  }

  public async startAction(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:ncr:create', 'safety:audit:create', 'safety:incident:create']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.actionService.start(context, id);
    return createSuccessResponse(result, 'CAPA action started successfully');
  }

  public async completeAction(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:ncr:create', 'safety:audit:create', 'safety:incident:create']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(completeActionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.actionService.complete(context, id, dto);
    return createSuccessResponse(result, 'CAPA action completed successfully');
  }

  public async verifyAction(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:ncr:verify', 'safety:audit:create', 'safety:incident:create']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(verifyActionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.actionService.verify(context, id, dto);
    return createSuccessResponse(result, 'CAPA action verified successfully');
  }

  public async cancelAction(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:ncr:create', 'safety:audit:create', 'safety:incident:create']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(cancelActionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.actionService.cancel(context, id, dto);
    return createSuccessResponse(result, 'CAPA action cancelled successfully');
  }

  public async reopenAction(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:ncr:verify', 'safety:audit:create', 'safety:incident:create']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(reopenActionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.actionService.reopen(context, id, dto);
    return createSuccessResponse(result, 'CAPA action reopened successfully');
  }

  // Method Aliases
  public async list(req: any) { return this.listActions(req); }
  public async create(req: any) { return this.createAction(req); }
  public async getById(req: any) { return this.getAction(req); }
  public async reassign(req: any) { return this.reassignAction(req); }
  public async start(req: any) { return this.startAction(req); }
  public async complete(req: any) { return this.completeAction(req); }
  public async verify(req: any) { return this.verifyAction(req); }
  public async cancel(req: any) { return this.cancelAction(req); }
  public async reopen(req: any) { return this.reopenAction(req); }
}
