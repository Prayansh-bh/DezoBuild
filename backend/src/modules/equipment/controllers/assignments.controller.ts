import type { IncomingMessage } from 'node:http';
import { AssignmentService } from '../services/assignment.service.js';
import {
  createAssignmentSchema,
  returnAssignmentSchema,
  listAssignmentsQuerySchema,
} from '../dto/assignment.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildEquipmentContext } from '../helpers/context.helper.js';

export class AssignmentsController {
  constructor(private readonly assignmentService: AssignmentService) {}

  public async listAssignments(
    req: IncomingMessage & { params?: { id?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const equipmentId = req.params?.id || '';
    const query = DtoValidator.validate(listAssignmentsQuerySchema, req.query || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.assignmentService.listAssignments(context, equipmentId, query);
    return createSuccessResponse(result, 'Equipment assignments retrieved successfully');
  }

  public async createAssignment(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const equipmentId = req.params?.id || '';
    const dto = DtoValidator.validate(createAssignmentSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.assignmentService.assign(context, equipmentId, dto);
    return createSuccessResponse(result, 'Equipment assigned successfully');
  }

  public async returnAssignment(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const assignmentId = req.params?.id || '';
    const dto = DtoValidator.validate(returnAssignmentSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.assignmentService.returnAssignment(context, assignmentId, dto);
    return createSuccessResponse(result, 'Equipment assignment returned successfully');
  }
}
