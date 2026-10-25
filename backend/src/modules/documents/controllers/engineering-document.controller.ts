import type { IncomingMessage } from 'node:http';
import { EngineeringDocumentService } from '../services/engineering-document.service.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  registerVersionSchema,
  issueVersionSchema,
  voidVersionSchema,
  archiveDocumentSchema,
  voidDocumentSchema,
  listDocumentsQuerySchema,
  listVersionsQuerySchema,
} from '../dto/documents.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildDocumentsContext } from '../helpers/documents-context.helper.js';

export class EngineeringDocumentController {
  constructor(private readonly documentService: EngineeringDocumentService) {}

  public async listDocuments(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listDocumentsQuerySchema, req.query || {});
    const context = await buildDocumentsContext(principal, req);

    const result = await this.documentService.list(context, query);
    return createSuccessResponse(result, 'Engineering documents retrieved successfully');
  }

  public async createDocument(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createDocumentSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);

    const result = await this.documentService.create(context, dto);
    return createSuccessResponse(result, 'Engineering document created successfully');
  }

  public async getDocument(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.documentService.getById(context, id);
    return createSuccessResponse(result, 'Engineering document retrieved successfully');
  }

  public async updateDocument(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(updateDocumentSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.documentService.update(context, id, dto);
    return createSuccessResponse(result, 'Engineering document updated successfully');
  }

  public async archiveDocument(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(archiveDocumentSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.documentService.archiveDocument(context, id, dto);
    return createSuccessResponse(result, 'Engineering document archived successfully');
  }

  public async voidDocument(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(voidDocumentSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const id = req.params?.id!;

    const result = await this.documentService.voidDocument(context, id, dto);
    return createSuccessResponse(result, 'Engineering document voided successfully');
  }

  public async registerVersion(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(registerVersionSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const documentId = req.params?.id!;

    const result = await this.documentService.registerVersion(context, documentId, dto);
    return createSuccessResponse(
      {
        ...result,
        byteSize: result.byteSize.toString(),
      },
      'Document version registered successfully'
    );
  }

  public async listVersions(
    req: IncomingMessage & { params?: { id?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listVersionsQuerySchema, req.query || {});
    const context = await buildDocumentsContext(principal, req);
    const documentId = req.params?.id!;

    const result = await this.documentService.listVersions(context, documentId, query.status);
    const formatted = result.map((v) => ({
      ...v,
      byteSize: v.byteSize.toString(),
    }));
    return createSuccessResponse(formatted, 'Document versions retrieved successfully');
  }

  public async getVersion(
    req: IncomingMessage & { params?: { id?: string; versionId?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const context = await buildDocumentsContext(principal, req);
    const documentId = req.params?.id!;
    const versionId = req.params?.versionId!;

    const result = await this.documentService.getVersionById(context, documentId, versionId);
    return createSuccessResponse(
      {
        ...result,
        byteSize: result.byteSize.toString(),
      },
      'Document version retrieved successfully'
    );
  }

  public async issueVersion(
    req: IncomingMessage & { params?: { id?: string; versionId?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(issueVersionSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const documentId = req.params?.id!;
    const versionId = req.params?.versionId!;

    const result = await this.documentService.issueVersion(context, documentId, versionId, dto);
    return createSuccessResponse(result, 'Document version issued successfully');
  }

  public async voidVersion(
    req: IncomingMessage & { params?: { id?: string; versionId?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(voidVersionSchema, req.body || {});
    const context = await buildDocumentsContext(principal, req);
    const documentId = req.params?.id!;
    const versionId = req.params?.versionId!;

    const result = await this.documentService.voidVersion(context, documentId, versionId, dto);
    return createSuccessResponse(result, 'Document version voided successfully');
  }
}
