import type { IncomingMessage } from 'node:http';
import { EquipmentService } from '../services/equipment.service.js';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  updateEquipmentStatusSchema,
  listEquipmentQuerySchema,
} from '../dto/equipment.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildEquipmentContext } from '../helpers/context.helper.js';

export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  public async listEquipment(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listEquipmentQuerySchema, req.query || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.equipmentService.list(context, query);
    return createSuccessResponse(result, 'Equipment retrieved successfully');
  }

  public async createEquipment(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createEquipmentSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.equipmentService.create(context, dto);
    return createSuccessResponse(result, 'Equipment created successfully');
  }

  public async getEquipment(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildEquipmentContext(principal, req);

    const result = await this.equipmentService.getById(context, id);
    return createSuccessResponse(result, 'Equipment retrieved successfully');
  }

  public async updateEquipment(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(updateEquipmentSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.equipmentService.updateMetadata(context, id, dto);
    return createSuccessResponse(result, 'Equipment updated successfully');
  }

  public async updateEquipmentStatus(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(updateEquipmentStatusSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.equipmentService.updateStatus(context, id, dto);
    return createSuccessResponse(result, 'Equipment status updated successfully');
  }
}
