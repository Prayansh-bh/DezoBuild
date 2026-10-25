import type { IncomingMessage } from 'node:http';
import { SafetyObservationService } from '../services/safety-observation.service.js';
import {
  createSafetyObservationSchema,
  updateDraftSafetyObservationSchema,
  closeSafetyObservationSchema,
  reopenSafetyObservationSchema,
  listSafetyObservationsQuerySchema,
} from '../dto/safety-observation.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildQualityContext } from '../helpers/quality-context.helper.js';

export class SafetyObservationController {
  constructor(private readonly observationService: SafetyObservationService) {}

  public async listObservations(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listSafetyObservationsQuerySchema, req.query || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.observationService.list(context, query);
    return createSuccessResponse(result, 'Safety observations retrieved successfully');
  }

  public async createObservation(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:audit:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createSafetyObservationSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.observationService.create(context, dto);
    return createSuccessResponse(result, 'Safety observation recorded successfully');
  }

  public async getObservation(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.observationService.getById(context, id);
    return createSuccessResponse(result, 'Safety observation retrieved successfully');
  }

  public async updateDraft(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:audit:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(updateDraftSafetyObservationSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.observationService.updateDraft(context, id, dto);
    return createSuccessResponse(result, 'Safety observation updated successfully');
  }

  public async assignAction(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:audit:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.observationService.assignAction(context, id);
    return createSuccessResponse(result, 'Observation transitioned to ACTION_REQUIRED');
  }

  public async closeObservation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:audit:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(closeSafetyObservationSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.observationService.close(context, id, dto);
    return createSuccessResponse(result, 'Safety observation closed successfully');
  }

  public async reopenObservation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:audit:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(reopenSafetyObservationSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.observationService.reopen(context, id, dto);
    return createSuccessResponse(result, 'Safety observation reopened successfully');
  }

  // Method Aliases
  public async list(req: any) { return this.listObservations(req); }
  public async create(req: any) { return this.createObservation(req); }
  public async getById(req: any) { return this.getObservation(req); }
  public async markActionRequired(req: any) { return this.assignAction(req); }
  public async close(req: any) { return this.closeObservation(req); }
  public async reopen(req: any) { return this.reopenObservation(req); }
}
