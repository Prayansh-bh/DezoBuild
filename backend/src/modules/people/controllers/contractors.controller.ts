import type { IncomingMessage } from 'node:http';
import { ContractorService } from '../services/contractor.service.js';
import { createContractorSchema, listContractorsQuerySchema } from '../dto/contractor.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildPeopleContext } from '../helpers/context.helper.js';

export class ContractorsController {
  constructor(private readonly contractorService: ContractorService) {}

  public async listContractors(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listContractorsQuerySchema, req.query || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.contractorService.listContractors(context, query);
    return createSuccessResponse(result, 'Labour contractors retrieved successfully');
  }

  public async createContractor(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createContractorSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.contractorService.createContractor(context, dto);
    return createSuccessResponse(result, 'Labour contractor created successfully');
  }
}
