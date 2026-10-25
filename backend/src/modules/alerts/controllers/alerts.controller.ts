import type { IncomingMessage } from 'node:http';
import { AlertService } from '../services/alert.service.js';
import {
  queryAlertsSchema,
  acknowledgeAlertSchema,
  resolveAlertSchema,
  dismissAlertSchema,
} from '../dto/alert.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';

export class AlertsController {
  constructor(private readonly alertService: AlertService) {}

  public async listAlerts(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'alerts:view');
    const principal = await requireAuth(req);
    const query = DtoValidator.validate(queryAlertsSchema, req.query || {});

    const result = await this.alertService.listAlerts(
      principal.tenantId,
      query
    );
    return createSuccessResponse(result, 'Alerts retrieved successfully');
  }

  public async getAlert(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'alerts:view');
    const principal = await requireAuth(req);
    const id = req.params?.id!;

    const result = await this.alertService.getAlertById(
      principal.tenantId,
      id
    );
    return createSuccessResponse(result, 'Alert retrieved successfully');
  }

  public async acknowledgeAlert(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'alerts:manage');
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const dto = DtoValidator.validate(acknowledgeAlertSchema, req.body || {});

    const result = await this.alertService.acknowledgeAlert(
      principal.tenantId,
      id,
      principal.userId,
      dto
    );
    return createSuccessResponse(result, 'Alert acknowledged successfully');
  }

  public async resolveAlert(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'alerts:manage');
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const dto = DtoValidator.validate(resolveAlertSchema, req.body || {});

    const result = await this.alertService.resolveAlert(
      principal.tenantId,
      id,
      principal.userId,
      dto
    );
    return createSuccessResponse(result, 'Alert resolved successfully');
  }

  public async dismissAlert(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'alerts:manage');
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const dto = DtoValidator.validate(dismissAlertSchema, req.body || {});

    const result = await this.alertService.dismissAlert(
      principal.tenantId,
      id,
      dto
    );
    return createSuccessResponse(result, 'Alert dismissed successfully');
  }
}
