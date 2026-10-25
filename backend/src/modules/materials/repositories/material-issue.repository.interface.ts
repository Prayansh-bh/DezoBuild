import type {
  MaterialIssue,
  MaterialIssueLine,
  Material,
  Project,
  Store,
  WbsNode,
  Task,
} from '@prisma/client';
import type {
  CreateMaterialIssueDto,
  UpdateMaterialIssueDto,
  ListMaterialIssuesQueryDto,
} from '../dto/material-issue.dto';

export type MaterialIssueLineWithRelations = MaterialIssueLine & {
  material: Material;
  wbsNode?: Pick<WbsNode, 'id' | 'code' | 'name' | 'projectId'> | null;
  task?: Pick<Task, 'id' | 'name' | 'status' | 'projectId'> | null;
};

export type MaterialIssueWithRelations = MaterialIssue & {
  lines: MaterialIssueLineWithRelations[];
  project: Pick<Project, 'id' | 'code' | 'name'>;
  store: Pick<Store, 'id' | 'code' | 'name' | 'storeType' | 'isCentralWarehouse' | 'projectId'>;
  requestedBy: { id: string; fullName: string; email: string };
  issuedBy?: { id: string; fullName: string; email: string } | null;
  approvedBy?: { id: string; fullName: string; email: string } | null;
  cancelledBy?: { id: string; fullName: string; email: string } | null;
};

export interface IMaterialIssueRepository {
  findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<MaterialIssueWithRelations | null>;

  findByIssueNumber(
    tenantId: string,
    issueNumber: string
  ): Promise<MaterialIssueWithRelations | null>;

  findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListMaterialIssuesQueryDto
  ): Promise<{ items: MaterialIssueWithRelations[]; total: number }>;

  allocateIssueNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date?: Date
  ): Promise<string>;

  create(
    tenantId: string,
    requestedById: string,
    issueNumber: string,
    data: CreateMaterialIssueDto
  ): Promise<MaterialIssueWithRelations>;

  update(
    tenantId: string,
    id: string,
    data: UpdateMaterialIssueDto
  ): Promise<MaterialIssueWithRelations>;

  submit(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialIssueWithRelations>;

  approve(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialIssueWithRelations>;

  issue(
    tenantId: string,
    id: string,
    userId: string,
    issuedLines?: { lineId: string; quantityIssued: number }[],
    remarks?: string | null
  ): Promise<MaterialIssueWithRelations>;

  cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<MaterialIssueWithRelations>;

  delete(tenantId: string, id: string): Promise<void>;
}
