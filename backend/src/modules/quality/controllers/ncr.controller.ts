import type { IncomingMessage } from 'node:http';
import { NcrService } from '../services/ncr.service.js';
import {
  createNcrSchema,
  updateDraftNcrSchema,
  transitionActionRequiredNcrSchema,
  submitVerificationNcrSchema,
  verifyAndCloseNcrSchema,
  rejectVerificationNcrSchema,
  reopenNcrSchema,
  voidNcrSchema,
  listNcrsQuerySchema,
} from '../dto/ncr.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildQualityContext } from '../helpers/quality-context.helper.js';

export class NcrController {
  constructor(private readonly ncrService: NcrService) {}

  public async listNcrs(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listNcrsQuerySchema, req.query || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.list(context, query);
    return createSuccessResponse(result, 'Non-conformance reports retrieved successfully');
  }

  public async createNcr(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:ncr:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createNcrSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.create(context, dto);
    return createSuccessResponse(result, 'Non-conformance report created successfully');
  }

  public async getNcr(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.getById(context, id);
    return createSuccessResponse(result, 'Non-conformance report retrieved successfully');
  }

  public async updateDraft(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:ncr:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(updateDraftNcrSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.updateDraft(context, id, dto);
    return createSuccessResponse(result, 'NCR updated successfully');
  }

  public async requireAction(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:ncr:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(transitionActionRequiredNcrSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.requireAction(context, id, dto);
    return createSuccessResponse(result, 'NCR transitioned to ACTION_REQUIRED');
  }

  public async submitVerification(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:ncr:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(submitVerificationNcrSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.submitVerification(context, id, dto);
    return createSuccessResponse(result, 'NCR submitted for verification');
  }

  public async verifyAndClose(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:ncr:verify');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(verifyAndCloseNcrSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.verifyAndClose(context, id, dto);
    return createSuccessResponse(result, 'NCR verified and closed successfully');
  }

  public async rejectVerification(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:ncr:verify');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(rejectVerificationNcrSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.rejectVerification(context, id, dto);
    return createSuccessResponse(result, 'NCR verification rejected');
  }

  public async reopenNcr(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:ncr:verify');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(reopenNcrSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.reopen(context, id, dto);
    return createSuccessResponse(result, 'NCR reopened successfully');
  }

  public async voidNcr(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'quality:ncr:verify');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(voidNcrSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.ncrService.voidNcr(context, id, dto);
    return createSuccessResponse(result, 'NCR voided successfully');
  }

  // Method Aliases
  public async list(req: any) { return this.listNcrs(req); }
  public async create(req: any) { return this.createNcr(req); }
  public async getById(req: any) { return this.getNcr(req); }
  public async planActions(req: any) { return this.requireAction(req); }
  public async submitForVerification(req: any) { return this.submitVerification(req); }
  public async close(req: any) { return this.verifyAndClose(req); }
  public async reopen(req: any) { return this.reopenNcr(req); }
  public async void(req: any) { return this.voidNcr(req); }
}
