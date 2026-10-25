import type { IncomingMessage } from 'node:http';
import { IntegrationService } from '../services/integration.service.js';
import { SyncService } from '../services/sync.service.js';
import {
  createIntegrationConnectionSchema,
  updateIntegrationConnectionSchema,
  queryIntegrationConnectionsSchema,
  triggerSyncJobSchema,
} from '../dto/integration.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';

export class IntegrationsController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly syncService: SyncService
  ) {}

  public async listConnections(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await EntitlementGuard.requireFeature(req, 'integrations:erp_sync');
    await RbacGuard.requirePermission(req, 'integrations:view');
    const principal = await requireAuth(req);
    const query = DtoValidator.validate(queryIntegrationConnectionsSchema, req.query || {});

    const result = await this.integrationService.listConnections(
      principal.tenantId,
      query
    );
    return createSuccessResponse(result, 'Integration connections retrieved successfully');
  }

  public async getConnection(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await EntitlementGuard.requireFeature(req, 'integrations:erp_sync');
    await RbacGuard.requirePermission(req, 'integrations:view');
    const principal = await requireAuth(req);
    const id = req.params?.id!;

    const result = await this.integrationService.getConnectionById(
      principal.tenantId,
      id
    );
    return createSuccessResponse(result, 'Integration connection retrieved successfully');
  }

  public async createConnection(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await EntitlementGuard.requireFeature(req, 'integrations:erp_sync');
    await RbacGuard.requirePermission(req, 'integrations:manage');
    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createIntegrationConnectionSchema, req.body || {});

    const result = await this.integrationService.createConnection(
      principal.tenantId,
      principal.userId,
      dto
    );
    return createSuccessResponse(result, 'Integration connection created successfully');
  }

  public async updateConnection(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await EntitlementGuard.requireFeature(req, 'integrations:erp_sync');
    await RbacGuard.requirePermission(req, 'integrations:manage');
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const dto = DtoValidator.validate(updateIntegrationConnectionSchema, req.body || {});

    const result = await this.integrationService.updateConnection(
      principal.tenantId,
      id,
      dto
    );
    return createSuccessResponse(result, 'Integration connection updated successfully');
  }

  public async testConnection(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await EntitlementGuard.requireFeature(req, 'integrations:erp_sync');
    await RbacGuard.requirePermission(req, 'integrations:manage');
    const principal = await requireAuth(req);
    const id = req.params?.id!;

    const result = await this.integrationService.testConnection(
      principal.tenantId,
      id
    );
    return createSuccessResponse(result, 'Integration connection tested');
  }

  public async triggerSync(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await EntitlementGuard.requireFeature(req, 'integrations:erp_sync');
    await RbacGuard.requirePermission(req, 'integrations:manage');
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const dto = DtoValidator.validate(triggerSyncJobSchema, req.body || {});

    const job = await this.syncService.queueSyncJob(
      principal.tenantId,
      id,
      dto
    );
    return createSuccessResponse(job, 'Integration sync job queued successfully');
  }
}
