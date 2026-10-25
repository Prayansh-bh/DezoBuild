import type { IncomingMessage } from 'node:http';
import { MaintenanceService } from '../services/maintenance.service.js';
import {
  createWorkOrderSchema,
  completeWorkOrderSchema,
  listWorkOrdersQuerySchema,
} from '../dto/maintenance.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildEquipmentContext } from '../helpers/context.helper.js';

export class WorkOrdersController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  public async listWorkOrders(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listWorkOrdersQuerySchema, req.query || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.maintenanceService.listWorkOrders(context, query);
    return createSuccessResponse(result, 'Maintenance work orders retrieved successfully');
  }

  public async createWorkOrder(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:maintenance:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createWorkOrderSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.maintenanceService.createWorkOrder(context, dto);
    return createSuccessResponse(result, 'Maintenance work order created successfully');
  }

  public async getWorkOrder(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildEquipmentContext(principal, req);

    const result = await this.maintenanceService.getWorkOrderById(context, id);
    return createSuccessResponse(result, 'Maintenance work order retrieved successfully');
  }

  public async completeWorkOrder(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(completeWorkOrderSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.maintenanceService.completeWorkOrder(context, id, dto);
    return createSuccessResponse(result, 'Maintenance work order completed successfully');
  }
}
