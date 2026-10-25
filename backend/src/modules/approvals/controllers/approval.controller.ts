import type { IncomingMessage } from 'node:http';
import { ApprovalService } from '../services/approval.service.js';
import { ApprovalSubjectRegistry } from '../registry/approval-subject.registry.js';
import {
  submitApprovalRequestSchema,
  approveStepSchema,
  rejectRequestSchema,
  returnRequestSchema,
  cancelRequestSchema,
  listApprovalRequestsQuerySchema,
  listPendingApprovalsQuerySchema,
} from '../dto/approval-request.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildApprovalContext } from '../helpers/approval-context.helper.js';

export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  public async submitRequest(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(submitApprovalRequestSchema, req.body || {});

    // Validate permission for the specific subject entity submit action
    const meta = ApprovalSubjectRegistry.getSubject(dto.entityType);
    await RbacGuard.requirePermission(req, meta.submitPermission);

    const context = await buildApprovalContext(principal, req);
    const result = await this.approvalService.submitForApproval(context as any, dto);

    return createSuccessResponse(result, 'Entity submitted for approval successfully');
  }

  public async listRequests(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listApprovalRequestsQuerySchema, req.query || {});
    const context = await buildApprovalContext(principal, req);

    const result = await this.approvalService.listRequests(context as any, query);
    return createSuccessResponse(result, 'Approval requests retrieved successfully');
  }

  public async listPending(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listPendingApprovalsQuerySchema, req.query || {});
    const context = await buildApprovalContext(principal, req);

    const result = await this.approvalService.listPendingApprovals(context as any, query);
    return createSuccessResponse(result, 'Pending approval queue retrieved successfully');
  }

  public async getRequest(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.approvalService.getRequestById(context as any, id);
    return createSuccessResponse(result, 'Approval request retrieved successfully');
  }

  public async approveStep(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(approveStepSchema, req.body || {});
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.approvalService.approveStep(context as any, id, dto, context.ipAddress);
    return createSuccessResponse(result, 'Approval step recorded successfully');
  }

  public async rejectRequest(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(rejectRequestSchema, req.body || {});
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.approvalService.rejectRequest(context as any, id, dto, context.ipAddress);
    return createSuccessResponse(result, 'Approval request rejected successfully');
  }

  public async returnRequest(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(returnRequestSchema, req.body || {});
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.approvalService.returnRequest(context as any, id, dto, context.ipAddress);
    return createSuccessResponse(result, 'Approval request returned for correction successfully');
  }

  public async cancelRequest(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(cancelRequestSchema, req.body || {});
    const context = await buildApprovalContext(principal, req);
    const id = req.params?.id!;

    const result = await this.approvalService.cancelRequest(context as any, id, dto, context.ipAddress);
    return createSuccessResponse(result, 'Approval request cancelled successfully');
  }
}
