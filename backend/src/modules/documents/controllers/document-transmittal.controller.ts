import type { IncomingMessage } from 'node:http';
import { DocumentTransmittalService } from '../services/document-transmittal.service.js';
import {
  createTransmittalSchema,
  addTransmittalItemSchema,
  issueTransmittalSchema,
  acknowledgeTransmittalSchema,
  cancelTransmittalSchema,
  listTransmittalsQuerySchema,
} from '../dto/transmittal.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildDocumentsContext } from '../helpers/documents-context.helper.js';

export class DocumentTransmittalController {
  constructor(private readonly transmittalService: DocumentTransmittalService) {}

  public async listTransmittals(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listTransmittalsQuerySchema, req.query || {});
    const context = await buildDocumentsContext(principal, req);

    const result = await this.transmittalService.list(context, query);
    return createSuccessResponse(result, 'Document transmittals retrieved successfully');
  }

  public async createTransmittal(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createTransmittalSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);

    const result = await this.transmittalService.create(context, dto);
    return createSuccessResponse(result, 'Document transmittal created successfully');
  }

  public async getTransmittal(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.transmittalService.getById(context, id);
    return createSuccessResponse(result, 'Document transmittal retrieved successfully');
  }

  public async addItem(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(addTransmittalItemSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const transmittalId = req.params?.id!;

    const result = await this.transmittalService.addItem(context, transmittalId, dto);
    return createSuccessResponse(result, 'Item added to transmittal manifest successfully');
  }

  public async removeItem(
    req: IncomingMessage & { params?: { id?: string; itemId?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const context = await buildDocumentsContext(principal, req);
    const transmittalId = req.params?.id!;
    const itemId = req.params?.itemId!;

    await this.transmittalService.removeItem(context, transmittalId, itemId);
    return createSuccessResponse(null, 'Item removed from transmittal manifest successfully');
  }

  public async issueTransmittal(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(issueTransmittalSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const transmittalId = req.params?.id!;

    const result = await this.transmittalService.issue(context, transmittalId, dto);
    return createSuccessResponse(result, 'Document transmittal issued successfully');
  }

  public async acknowledgeTransmittal(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(acknowledgeTransmittalSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const transmittalId = req.params?.id!;

    const result = await this.transmittalService.acknowledge(context, transmittalId, dto);
    return createSuccessResponse(result, 'Document transmittal acknowledged successfully');
  }

  public async cancelTransmittal(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(cancelTransmittalSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const transmittalId = req.params?.id!;

    const result = await this.transmittalService.cancel(context, transmittalId, dto);
    return createSuccessResponse(result, 'Document transmittal cancelled successfully');
  }
}
