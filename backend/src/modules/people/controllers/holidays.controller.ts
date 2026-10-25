import type { IncomingMessage } from 'node:http';
import { HolidayService } from '../services/holiday.service.js';
import { createHolidaySchema, listHolidaysQuerySchema } from '../dto/holiday.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildPeopleContext } from '../helpers/context.helper.js';

export class HolidaysController {
  constructor(private readonly holidayService: HolidayService) {}

  public async listHolidays(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listHolidaysQuerySchema, req.query || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.holidayService.listHolidays(context, query);
    return createSuccessResponse(result, 'Holidays retrieved successfully');
  }

  public async createHoliday(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createHolidaySchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.holidayService.createHoliday(context, dto);
    return createSuccessResponse(result, 'Holiday created successfully');
  }
}
