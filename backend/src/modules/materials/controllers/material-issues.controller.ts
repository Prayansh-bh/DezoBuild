import type { IncomingMessage } from 'node:http';
import { MaterialIssueService } from '../services/material-issue.service';
import {
  CreateMaterialIssueSchema,
  UpdateMaterialIssueSchema,
  SubmitMaterialIssueSchema,
  ApproveMaterialIssueSchema,
  IssueMaterialIssueSchema,
  CancelMaterialIssueSchema,
  ListMaterialIssuesQuerySchema,
} from '../dto/material-issue.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import {
  createSuccessResponse,
  type ApiResponse,
} from '../../../common/dto/api-response.dto';
import type { MaterialIssueWithRelations } from '../repositories/material-issue.repository.interface';
import {
  MATERIAL_ISSUE_PERMISSIONS,
  MATERIAL_ISSUE_ENTITLEMENT,
} from '../constants/material-issue.constants';

export class MaterialIssuesController {
  private readonly issueService: MaterialIssueService;

  constructor(issueService?: MaterialIssueService) {
    this.issueService =
      issueService || MaterialIssueService.getInstance();
  }

  public async listMaterialIssues(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<
    ApiResponse<{ items: MaterialIssueWithRelations[]; total: number }>
  > {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.VIEW);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(
      ListMaterialIssuesQuerySchema,
      req.query || {}
    );

    const result = await this.issueService.listMaterialIssues(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(
      result,
      'Material issues retrieved successfully'
    );
  }

  public async getMaterialIssue(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<MaterialIssueWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.VIEW);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const issue = await this.issueService.getMaterialIssueById(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(
      issue,
      'Material issue details retrieved successfully'
    );
  }

  public async createMaterialIssue(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<MaterialIssueWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(
      CreateMaterialIssueSchema,
      req.body || {}
    );

    const issue = await this.issueService.createMaterialIssue(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(
      issue,
      'Material issue created successfully'
    );
  }

  public async updateMaterialIssue(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIssueWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      UpdateMaterialIssueSchema,
      req.body || {}
    );

    const issue = await this.issueService.updateMaterialIssue(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      issue,
      'Material issue updated successfully'
    );
  }

  public async submitMaterialIssue(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIssueWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      SubmitMaterialIssueSchema,
      req.body || {}
    );

    const issue = await this.issueService.submitMaterialIssue(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      issue,
      'Material issue submitted successfully'
    );
  }

  public async approveMaterialIssue(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIssueWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      ApproveMaterialIssueSchema,
      req.body || {}
    );

    const issue = await this.issueService.approveMaterialIssue(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      issue,
      'Material issue approved successfully'
    );
  }

  public async issueMaterialIssue(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIssueWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      IssueMaterialIssueSchema,
      req.body || {}
    );

    const issue = await this.issueService.issueMaterialIssue(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      issue,
      'Material issue issued successfully'
    );
  }

  public async cancelMaterialIssue(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIssueWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      CancelMaterialIssueSchema,
      req.body || {}
    );

    const issue = await this.issueService.cancelMaterialIssue(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      issue,
      'Material issue cancelled successfully'
    );
  }

  public async deleteMaterialIssue(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requirePermission(req, MATERIAL_ISSUE_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_ISSUE_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    await this.issueService.deleteMaterialIssue(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(
      { deleted: true },
      'Material issue deleted successfully'
    );
  }
}
