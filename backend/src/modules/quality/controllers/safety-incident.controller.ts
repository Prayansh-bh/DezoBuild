import type { IncomingMessage } from 'node:http';
import { SafetyIncidentService } from '../services/safety-incident.service.js';
import {
  createSafetyIncidentSchema,
  startIncidentInvestigationSchema,
  addIncidentFindingsSchema,
  closeSafetyIncidentSchema,
  reopenSafetyIncidentSchema,
  listSafetyIncidentsQuerySchema,
} from '../dto/safety-incident.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildQualityContext } from '../helpers/quality-context.helper.js';

export class SafetyIncidentController {
  constructor(private readonly incidentService: SafetyIncidentService) {}

  public async listIncidents(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listSafetyIncidentsQuerySchema, req.query || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.incidentService.list(context, query);
    return createSuccessResponse(result, 'Safety incidents retrieved successfully');
  }

  public async createIncident(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:incident:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createSafetyIncidentSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.incidentService.create(context, dto);
    return createSuccessResponse(result, 'Safety incident logged successfully');
  }

  public async getIncident(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.incidentService.getById(context, id);
    return createSuccessResponse(result, 'Safety incident retrieved successfully');
  }

  public async startInvestigation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:incident:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(startIncidentInvestigationSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.incidentService.startInvestigation(context, id, dto);
    return createSuccessResponse(result, 'Incident investigation initiated');
  }

  public async addFindings(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:incident:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(addIncidentFindingsSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.incidentService.addFindings(context, id, dto);
    return createSuccessResponse(result, 'Incident findings recorded');
  }

  public async moveToCapa(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:incident:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.incidentService.moveToCapa(context, id);
    return createSuccessResponse(result, 'Incident transitioned to CAPA_IN_PROGRESS');
  }

  public async closeIncident(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:incident:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(closeSafetyIncidentSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.incidentService.close(context, id, dto);
    return createSuccessResponse(result, 'Safety incident closed successfully');
  }

  public async reopenIncident(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'safety:incident:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(reopenSafetyIncidentSchema, req.body || {});
    const context = await buildQualityContext(principal, req);

    const result = await this.incidentService.reopen(context, id, dto);
    return createSuccessResponse(result, 'Safety incident reopened successfully');
  }

  // Method Aliases
  public async list(req: any) { return this.listIncidents(req); }
  public async create(req: any) { return this.createIncident(req); }
  public async getById(req: any) { return this.getIncident(req); }
  public async addInvestigationFindings(req: any) { return this.addFindings(req); }
  public async markCapaInProgress(req: any) { return this.moveToCapa(req); }
  public async close(req: any) { return this.closeIncident(req); }
  public async reopen(req: any) { return this.reopenIncident(req); }
}
