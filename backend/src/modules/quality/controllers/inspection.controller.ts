import type { IncomingMessage } from 'node:http';
import { InspectionService } from '../services/inspection.service.js';
import {
  createInspectionSchema,
  updateDraftInspectionSchema,
  scheduleInspectionSchema,
  addCustomCheckpointSchema,
  updateCheckpointResultSchema,
  submitEvaluationSchema,
  approveInspectionSchema,
  conditionalApproveInspectionSchema,
  rejectInspectionSchema,
  cancelInspectionSchema,
  listInspectionsQuerySchema,
} from '../dto/inspection.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildQualityContext } from '../helpers/quality-context.helper.js';

export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  public async listInspections(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listInspectionsQuerySchema, req.query || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.list(context, query);
    return createSuccessResponse(result, 'Inspection requests retrieved successfully');
  }

  public async createInspection(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createInspectionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.create(context, dto);
    return createSuccessResponse(result, 'Inspection request created successfully');
  }

  public async getInspection(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.getById(context, id);
    return createSuccessResponse(result, 'Inspection request retrieved successfully');
  }

  public async updateDraft(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(updateDraftInspectionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.updateDraft(context, id, dto);
    return createSuccessResponse(result, 'Inspection draft updated successfully');
  }

  public async addCustomCheckpoint(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(addCustomCheckpointSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.addCustomCheckpoint(context, id, dto);
    return createSuccessResponse(result, 'Custom checkpoint added successfully');
  }

  public async submitInspection(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.submit(context, id);
    return createSuccessResponse(result, 'Inspection request submitted successfully');
  }

  public async scheduleInspection(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(scheduleInspectionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.schedule(context, id, dto);
    return createSuccessResponse(result, 'Inspection scheduled successfully');
  }

  public async startInspection(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.startInspection(context, id);
    return createSuccessResponse(result, 'Inspection started successfully');
  }

  public async updateCheckpointResult(
    req: IncomingMessage & { params?: { id?: string; checkpointId?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const checkpointId = req.params?.checkpointId || '';
    const dto = DtoValidator.validate(updateCheckpointResultSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.updateCheckpointResult(context, id, checkpointId, dto);
    return createSuccessResponse(result, 'Checkpoint evaluated successfully');
  }

  public async submitEvaluation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(submitEvaluationSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.submitEvaluation(context, id, dto);
    return createSuccessResponse(result, 'Inspection evaluation submitted successfully');
  }

  public async approveInspection(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(approveInspectionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.approve(context, id, dto);
    return createSuccessResponse(result, 'Inspection approved successfully');
  }

  public async conditionalApproveInspection(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(conditionalApproveInspectionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.conditionalApprove(context, id, dto);
    return createSuccessResponse(result, 'Inspection conditionally approved successfully');
  }

  public async rejectInspection(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(rejectInspectionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.reject(context, id, dto);
    return createSuccessResponse(result, 'Inspection rejected successfully');
  }

  public async cancelInspection(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(cancelInspectionSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.cancel(context, id, dto);
    return createSuccessResponse(result, 'Inspection cancelled successfully');
  }

  public async reinspect(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.reinspect(context, id);
    return createSuccessResponse(result, 'Reinspection request created successfully');
  }

  public async checkHoldPointRelease(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.inspectionService.assertHoldPointReleased(context, id);
    return createSuccessResponse(result, 'Hold point release status retrieved');
  }

  public async evaluateChecklistItems(
    req: IncomingMessage & { params?: { id?: string }; body?: { evaluations?: Array<{ checklistItemId: string; result: string; measuredValue?: number; unit?: string; remarks?: string }> } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:pour:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);
    const evaluations = (req.body as any)?.evaluations || [];

    const results = [];
    for (const item of evaluations) {
      const res = await this.inspectionService.updateCheckpointResult(context, id, item.checklistItemId, {
        result: item.result as any,
        measuredValue: item.measuredValue,
        unit: item.unit,
        remarks: item.remarks,
      });
      results.push(res);
    }

    return createSuccessResponse(results, 'Checklist items evaluated successfully');
  }

  // Method Aliases
  public async list(req: any) { return this.listInspections(req); }
  public async create(req: any) { return this.createInspection(req); }
  public async getById(req: any) { return this.getInspection(req); }
  public async submit(req: any) { return this.submitInspection(req); }
  public async schedule(req: any) { return this.scheduleInspection(req); }
  public async start(req: any) { return this.startInspection(req); }
  public async approve(req: any) { return this.approveInspection(req); }
  public async conditionalPass(req: any) { return this.conditionalApproveInspection(req); }
  public async reject(req: any) { return this.rejectInspection(req); }
  public async cancel(req: any) { return this.cancelInspection(req); }
  public async addCustomChecklistItem(req: any) { return this.addCustomCheckpoint(req); }
}
