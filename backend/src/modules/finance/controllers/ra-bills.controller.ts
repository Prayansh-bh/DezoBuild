import type { IncomingMessage } from 'node:http';
import { RaBillService } from '../services/ra-bill.service.js';
import {
  createRaBillSchema,
  verifyRaBillSchema,
  approveRaBillSchema,
  listRaBillsQuerySchema,
} from '../dto/ra-bill.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildFinanceContext } from '../helpers/context.helper.js';

export class RaBillsController {
  constructor(private readonly raBillService: RaBillService) {}

  public async listRaBills(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listRaBillsQuerySchema, req.query || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.raBillService.listRaBills(context, query);
    return createSuccessResponse(result, 'Contractor RA bills retrieved successfully');
  }

  public async createRaBill(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:bill:create');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createRaBillSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.raBillService.createRaBill(context, dto);
    return createSuccessResponse(result, 'Contractor RA bill created successfully');
  }

  public async getRaBill(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildFinanceContext(principal, req);

    const result = await this.raBillService.getRaBillById(context, id);
    return createSuccessResponse(result, 'Contractor RA bill retrieved successfully');
  }

  public async verifyRaBill(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:bill:verify');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(verifyRaBillSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.raBillService.verifyRaBill(context, id, dto);
    return createSuccessResponse(result, 'Contractor RA bill verified successfully');
  }

  public async approveRaBill(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:bill:approve');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(approveRaBillSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.raBillService.approveRaBill(context, id, dto);
    return createSuccessResponse(result, 'Contractor RA bill approved successfully');
  }
}
