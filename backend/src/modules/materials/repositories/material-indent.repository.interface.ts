import type {
  MaterialIndent,
  MaterialIndentLine,
  Material,
} from '@prisma/client';
import type {
  CreateMaterialIndentDto,
  UpdateMaterialIndentDto,
  ListMaterialIndentQueryDto,
} from '../dto/material-indent.dto';

export type MaterialIndentLineWithRelations = MaterialIndentLine & {
  material?: Material;
};

export type MaterialIndentWithRelations = MaterialIndent & {
  lines: MaterialIndentLineWithRelations[];
  project?: {
    id: string;
    code: string;
    name: string;
  };
  store?: {
    id: string;
    code: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  submittedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  approvedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  rejectedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  cancelledBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export interface IMaterialIndentRepository {
  findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<MaterialIndentWithRelations | null>;

  findByIndentNumber(
    tenantId: string,
    indentNumber: string
  ): Promise<MaterialIndentWithRelations | null>;

  findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListMaterialIndentQueryDto
  ): Promise<{ items: MaterialIndentWithRelations[]; total: number }>;

  allocateIndentNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date: Date
  ): Promise<string>;

  create(
    tenantId: string,
    projectId: string,
    userId: string,
    indentNumber: string,
    data: CreateMaterialIndentDto
  ): Promise<MaterialIndentWithRelations>;

  update(
    tenantId: string,
    id: string,
    data: UpdateMaterialIndentDto
  ): Promise<MaterialIndentWithRelations>;

  submit(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<MaterialIndentWithRelations>;

  approve(
    tenantId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<MaterialIndentWithRelations>;

  reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<MaterialIndentWithRelations>;

  cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<MaterialIndentWithRelations>;

  delete(
    tenantId: string,
    id: string
  ): Promise<void>;
}
