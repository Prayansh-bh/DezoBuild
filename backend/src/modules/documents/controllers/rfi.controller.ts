import type { IncomingMessage } from 'node:http';
import { RfiService } from '../services/rfi.service.js';
import {
  createRfiSchema,
  submitRfiSchema,
  assignRfiSchema,
  respondRfiSchema,
  closeRfiSchema,
  reopenRfiSchema,
  cancelRfiSchema,
  addRfiReferenceSchema,
  listRfisQuerySchema,
} from '../dto/rfi.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildDocumentsContext } from '../helpers/documents-context.helper.js';

export class RfiController {
  constructor(private readonly rfiService: RfiService) {}

  public async listRfis(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listRfisQuerySchema, req.query || {});
    const context = await buildDocumentsContext(principal, req);

    const result = await this.rfiService.list(context, query);
    return createSuccessResponse(result, 'Requests for Information retrieved successfully');
  }

  public async createRfi(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:rfi:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createRfiSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);

    const result = await this.rfiService.create(context, dto);
    return createSuccessResponse(result, 'Request for Information created successfully');
  }

  public async getRfi(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.rfiService.getById(context, id);
    return createSuccessResponse(result, 'Request for Information retrieved successfully');
  }

  public async submitRfi(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:rfi:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(submitRfiSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.rfiService.submit(context, id, dto);
    return createSuccessResponse(result, 'Request for Information submitted successfully');
  }

  public async assignRfi(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:rfi:respond');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(assignRfiSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.rfiService.assign(context, id, dto);
    return createSuccessResponse(result, 'Request for Information assigned successfully');
  }

  public async respondRfi(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:rfi:respond');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(respondRfiSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.rfiService.respond(context, id, dto);
    return createSuccessResponse(result, 'Response recorded for RFI successfully');
  }

  public async closeRfi(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:rfi:respond');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(closeRfiSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.rfiService.close(context, id, dto);
    return createSuccessResponse(result, 'Request for Information closed successfully');
  }

  public async reopenRfi(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    // Either documents:rfi:create or documents:rfi:respond is permitted to request/execute reopen
    await RbacGuard.requireAnyPermission(req, ['documents:rfi:create', 'documents:rfi:respond']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(reopenRfiSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.rfiService.reopen(context, id, dto);
    return createSuccessResponse(result, 'Request for Information reopened successfully');
  }

  public async cancelRfi(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:rfi:respond');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(cancelRfiSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.rfiService.cancel(context, id, dto);
    return createSuccessResponse(result, 'Request for Information cancelled successfully');
  }

  public async addReference(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['documents:rfi:create', 'documents:rfi:respond']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(addRfiReferenceSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.rfiService.addReference(context, id, dto);
    return createSuccessResponse(result, 'Document reference added to RFI successfully');
  }

  public async removeReference(
    req: IncomingMessage & { params?: { id?: string; referenceId?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['documents:rfi:create', 'documents:rfi:respond']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;
    const referenceId = req.params?.referenceId!;

    await this.rfiService.removeReference(context, id, referenceId);
    return createSuccessResponse(null, 'Document reference removed from RFI successfully');
  }
}
