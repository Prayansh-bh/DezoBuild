import type { IncomingMessage } from 'node:http';
import { DigitalMbService } from '../services/digital-mb.service';
import {
  CreateDigitalMbSchema,
  UpdateDigitalMbSchema,
  ApproveDigitalMbSchema,
  RejectDigitalMbSchema,
  ListDigitalMbQuerySchema,
} from '../dto/digital-mb.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { DigitalMbRecordEntity } from '../repositories/digital-mb.repository.interface';

export class DigitalMbController {
  private readonly mbService: DigitalMbService;

  constructor(mbService?: DigitalMbService) {
    this.mbService = mbService || DigitalMbService.getInstance();
  }

  public async listMeasurements(
    req: IncomingMessage & { params?: { projectId?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: DigitalMbRecordEntity[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const query = DtoValidator.validate(ListDigitalMbQuerySchema, req.query || {});

    const result = await this.mbService.listMeasurements(
      principal.tenantId,
      principal.userId,
      projectId,
      query
    );

    return createSuccessResponse(result, 'Digital MB records retrieved successfully');
  }

  public async getMeasurement(
    req: IncomingMessage & { params?: { projectId?: string; measurementId?: string } }
  ): Promise<ApiResponse<DigitalMbRecordEntity>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const measurementId = req.params?.measurementId || '';

    const record = await this.mbService.getMeasurement(
      principal.tenantId,
      principal.userId,
      projectId,
      measurementId
    );

    return createSuccessResponse(record, 'Digital MB record details retrieved successfully');
  }

  public async createMeasurement(
    req: IncomingMessage & { params?: { projectId?: string }; body?: unknown }
  ): Promise<ApiResponse<DigitalMbRecordEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:dpr:create', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dto = DtoValidator.validate(CreateDigitalMbSchema, req.body || {});

    const record = await this.mbService.createMeasurement(
      principal.tenantId,
      principal.userId,
      projectId,
      dto
    );

    return createSuccessResponse(record, 'Digital MB record created successfully');
  }

  public async updateMeasurement(
    req: IncomingMessage & { params?: { projectId?: string; measurementId?: string }; body?: unknown }
  ): Promise<ApiResponse<DigitalMbRecordEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:dpr:create', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const measurementId = req.params?.measurementId || '';
    const dto = DtoValidator.validate(UpdateDigitalMbSchema, req.body || {});

    const record = await this.mbService.updateMeasurement(
      principal.tenantId,
      principal.userId,
      projectId,
      measurementId,
      dto
    );

    return createSuccessResponse(record, 'Digital MB record updated successfully');
  }

  public async deleteMeasurement(
    req: IncomingMessage & { params?: { projectId?: string; measurementId?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requireAnyPermission(req, ['projects:dpr:create', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const measurementId = req.params?.measurementId || '';

    await this.mbService.deleteMeasurement(
      principal.tenantId,
      principal.userId,
      projectId,
      measurementId
    );

    return createSuccessResponse({ deleted: true }, 'Digital MB record deleted successfully');
  }

  public async submitMeasurement(
    req: IncomingMessage & { params?: { projectId?: string; measurementId?: string } }
  ): Promise<ApiResponse<DigitalMbRecordEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:dpr:submit', 'projects:dpr:create', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const measurementId = req.params?.measurementId || '';

    const record = await this.mbService.submitMeasurement(
      principal.tenantId,
      principal.userId,
      projectId,
      measurementId
    );

    return createSuccessResponse(record, 'Digital MB record submitted for verification successfully');
  }

  public async verifyMeasurement(
    req: IncomingMessage & { params?: { projectId?: string; measurementId?: string } }
  ): Promise<ApiResponse<DigitalMbRecordEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:dpr:approve', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const measurementId = req.params?.measurementId || '';

    const record = await this.mbService.verifyMeasurement(
      principal.tenantId,
      principal.userId,
      projectId,
      measurementId
    );

    return createSuccessResponse(record, 'Digital MB record verified successfully');
  }

  public async approveMeasurement(
    req: IncomingMessage & { params?: { projectId?: string; measurementId?: string }; body?: unknown }
  ): Promise<ApiResponse<DigitalMbRecordEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:dpr:approve', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const measurementId = req.params?.measurementId || '';
    const dto = DtoValidator.validate(ApproveDigitalMbSchema, req.body || {});

    const record = await this.mbService.approveMeasurement(
      principal.tenantId,
      principal.userId,
      projectId,
      measurementId,
      dto
    );

    return createSuccessResponse(record, 'Digital MB record approved and certified successfully');
  }

  public async rejectMeasurement(
    req: IncomingMessage & { params?: { projectId?: string; measurementId?: string }; body?: unknown }
  ): Promise<ApiResponse<DigitalMbRecordEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:dpr:approve', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const measurementId = req.params?.measurementId || '';
    const dto = DtoValidator.validate(RejectDigitalMbSchema, req.body || {});

    const record = await this.mbService.rejectMeasurement(
      principal.tenantId,
      principal.userId,
      projectId,
      measurementId,
      dto
    );

    return createSuccessResponse(record, 'Digital MB record rejected successfully');
  }

  public async reopenMeasurement(
    req: IncomingMessage & { params?: { projectId?: string; measurementId?: string } }
  ): Promise<ApiResponse<DigitalMbRecordEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:dpr:create', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const measurementId = req.params?.measurementId || '';

    const record = await this.mbService.reopenToDraft(
      principal.tenantId,
      principal.userId,
      projectId,
      measurementId
    );

    return createSuccessResponse(record, 'Digital MB record reopened to DRAFT status successfully');
  }
}
