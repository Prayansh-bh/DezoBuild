import type { IncomingMessage } from 'node:http';
import { DprService } from '../services/dpr.service';
import {
  CreateDprSchema,
  UpdateDprSchema,
  SubmitDprSchema,
  ApproveDprSchema,
  RejectDprSchema,
  ListDprQuerySchema,
} from '../dto/dpr.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { DailyProgressReportWithRelations } from '../repositories/dpr.repository.interface';

export class DprController {
  private readonly dprService: DprService;

  constructor(dprService?: DprService) {
    this.dprService = dprService || DprService.getInstance();
  }

  public async listDprs(
    req: IncomingMessage & { params?: { projectId?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: DailyProgressReportWithRelations[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const query = DtoValidator.validate(ListDprQuerySchema, req.query || {});

    const result = await this.dprService.listDprs(
      principal.tenantId,
      principal.userId,
      projectId,
      query
    );

    return createSuccessResponse(result, 'Daily Progress Reports retrieved successfully');
  }

  public async getDpr(
    req: IncomingMessage & { params?: { projectId?: string; dprId?: string } }
  ): Promise<ApiResponse<DailyProgressReportWithRelations>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dprId = req.params?.dprId || '';

    const dpr = await this.dprService.getDprById(
      principal.tenantId,
      principal.userId,
      projectId,
      dprId
    );

    return createSuccessResponse(dpr, 'Daily Progress Report details retrieved successfully');
  }

  public async createDpr(
    req: IncomingMessage & { params?: { projectId?: string }; body?: unknown }
  ): Promise<ApiResponse<DailyProgressReportWithRelations>> {
    await RbacGuard.requirePermission(req, 'projects:dpr:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dto = DtoValidator.validate(CreateDprSchema, req.body || {});

    const dpr = await this.dprService.createDpr(
      principal.tenantId,
      principal.userId,
      projectId,
      dto
    );

    return createSuccessResponse(dpr, 'Daily Progress Report created successfully');
  }

  public async updateDpr(
    req: IncomingMessage & { params?: { projectId?: string; dprId?: string }; body?: unknown }
  ): Promise<ApiResponse<DailyProgressReportWithRelations>> {
    await RbacGuard.requirePermission(req, 'projects:dpr:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dprId = req.params?.dprId || '';
    const dto = DtoValidator.validate(UpdateDprSchema, req.body || {});

    const dpr = await this.dprService.updateDpr(
      principal.tenantId,
      principal.userId,
      projectId,
      dprId,
      dto
    );

    return createSuccessResponse(dpr, 'Daily Progress Report updated successfully');
  }

  public async submitDpr(
    req: IncomingMessage & { params?: { projectId?: string; dprId?: string }; body?: unknown }
  ): Promise<ApiResponse<DailyProgressReportWithRelations>> {
    await RbacGuard.requirePermission(req, 'projects:dpr:submit');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dprId = req.params?.dprId || '';
    const dto = DtoValidator.validate(SubmitDprSchema, req.body || {});

    const dpr = await this.dprService.submitDpr(
      principal.tenantId,
      principal.userId,
      projectId,
      dprId,
      dto
    );

    return createSuccessResponse(dpr, 'Daily Progress Report submitted successfully');
  }

  public async rejectDpr(
    req: IncomingMessage & { params?: { projectId?: string; dprId?: string }; body?: unknown }
  ): Promise<ApiResponse<DailyProgressReportWithRelations>> {
    await RbacGuard.requirePermission(req, 'projects:dpr:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dprId = req.params?.dprId || '';
    const dto = DtoValidator.validate(RejectDprSchema, req.body || {});

    const dpr = await this.dprService.rejectDpr(
      principal.tenantId,
      principal.userId,
      projectId,
      dprId,
      dto
    );

    return createSuccessResponse(dpr, 'Daily Progress Report rejected successfully');
  }

  public async approveDpr(
    req: IncomingMessage & { params?: { projectId?: string; dprId?: string }; body?: unknown }
  ): Promise<ApiResponse<DailyProgressReportWithRelations>> {
    await RbacGuard.requirePermission(req, 'projects:dpr:approve');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dprId = req.params?.dprId || '';
    const dto = DtoValidator.validate(ApproveDprSchema, req.body || {});

    const dpr = await this.dprService.approveDpr(
      principal.tenantId,
      principal.userId,
      projectId,
      dprId,
      dto
    );

    return createSuccessResponse(dpr, 'Daily Progress Report approved and progress committed successfully');
  }

  public async deleteDpr(
    req: IncomingMessage & { params?: { projectId?: string; dprId?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requirePermission(req, 'projects:dpr:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dprId = req.params?.dprId || '';

    await this.dprService.deleteDpr(
      principal.tenantId,
      principal.userId,
      projectId,
      dprId
    );

    return createSuccessResponse({ deleted: true }, 'Daily Progress Report deleted successfully');
  }
}
