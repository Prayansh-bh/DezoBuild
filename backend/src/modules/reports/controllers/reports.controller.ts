import type { IncomingMessage } from 'node:http';
import { OperationalReportsService } from '../services/operational-reports.service.js';
import { reportFilterSchema } from '../dto/report.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';

export class ReportsController {
  constructor(private readonly reportsService: OperationalReportsService) {}

  public async getProjectSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getProjectSummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Project operational summary generated');
  }

  public async getBudgetActualSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getBudgetActualSummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Budget vs Actual financial summary generated');
  }

  public async getMaterialStockSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getMaterialStockSummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Material stock status generated');
  }

  public async getManpowerAttendanceSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getManpowerAttendanceSummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Manpower & attendance summary generated');
  }

  public async getEquipmentUtilizationSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getEquipmentUtilizationSummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Equipment utilization summary generated');
  }

  public async getQualitySafetySummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getQualitySafetySummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Quality & Safety summary generated');
  }

  public async getPendingRfiSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getPendingRfiSummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Pending RFIs summary generated');
  }

  public async getPendingApprovalsSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getPendingApprovalsSummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Pending approvals summary generated');
  }

  public async getAlertsSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'reports:view');
    const principal = await requireAuth(req);
    const filter = DtoValidator.validate(reportFilterSchema, req.query || {});

    const result = await this.reportsService.getAlertsSummary(
      principal.tenantId,
      filter
    );
    return createSuccessResponse(result, 'Alerts operational summary generated');
  }
}
