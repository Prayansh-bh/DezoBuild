import type { IncomingMessage } from 'node:http';
import { ApprovalPolicyService } from '../services/approval-policy.service.js';
import {
  createApprovalPolicySchema,
  supersedeApprovalPolicySchema,
  listApprovalPoliciesQuerySchema,
} from '../dto/approval-policy.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildApprovalContext } from '../helpers/approval-context.helper.js';

export class ApprovalPolicyController {
  constructor(private readonly policyService: ApprovalPolicyService) {}

  public async listPolicies(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'settings:view');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listApprovalPoliciesQuerySchema, req.query || {});
    const context = await buildApprovalContext(principal, req);

    const result = await this.policyService.listPolicies(context as any, query);
    return createSuccessResponse(result, 'Approval policies retrieved successfully');
  }

  public async createPolicy(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'settings:manage');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createApprovalPolicySchema, req.body || {});
    const context = await buildApprovalContext(principal, req);

    const result = await this.policyService.createDraft(context as any, dto);
    return createSuccessResponse(result, 'Draft approval policy created successfully');
  }

  public async getPolicy(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'settings:view');

    const principal = await requireAuth(req);
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.policyService.getPolicyById(context as any, id);
    return createSuccessResponse(result, 'Approval policy retrieved successfully');
  }

  public async activatePolicy(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'settings:manage');

    const principal = await requireAuth(req);
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.policyService.activatePolicy(context as any, id);
    return createSuccessResponse(result, 'Approval policy activated successfully');
  }

  public async supersedePolicy(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'settings:manage');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(supersedeApprovalPolicySchema, req.body || {});
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.policyService.supersedePolicy(context as any, id, dto.newDraftPolicyId);
    return createSuccessResponse(result, 'Approval policy superseded and new version activated successfully');
  }

  public async deactivatePolicy(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'settings:manage');

    const principal = await requireAuth(req);
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.policyService.deactivatePolicy(context as any, id);
    return createSuccessResponse(result, 'Approval policy deactivated successfully');
  }
}
