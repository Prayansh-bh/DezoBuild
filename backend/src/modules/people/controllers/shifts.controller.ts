import type { IncomingMessage } from 'node:http';
import { ShiftService } from '../services/shift.service.js';
import { createShiftSchema, listShiftsQuerySchema } from '../dto/shift.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildPeopleContext } from '../helpers/context.helper.js';

export class ShiftsController {
  constructor(private readonly shiftService: ShiftService) {}

  public async listShifts(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listShiftsQuerySchema, req.query || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.shiftService.listShifts(context, query);
    return createSuccessResponse(result, 'Shifts retrieved successfully');
  }

  public async createShift(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createShiftSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.shiftService.createShift(context, dto);
    return createSuccessResponse(result, 'Shift created successfully');
  }
}
