import type { IncomingMessage } from 'node:http';
import { PayableService } from '../services/payable.service.js';
import { listPayablesQuerySchema } from '../dto/payable.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildFinanceContext } from '../helpers/context.helper.js';

export class PayablesController {
  constructor(private readonly payableService: PayableService) {}

  public async listPayables(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listPayablesQuerySchema, req.query || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.payableService.listPayables(context, query);
    return createSuccessResponse(result, 'Commercial payables retrieved successfully');
  }
}
