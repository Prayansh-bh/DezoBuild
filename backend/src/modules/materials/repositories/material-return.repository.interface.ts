import type {
  MaterialReturn,
  MaterialReturnLine,
  Material,
  Project,
  Store,
  MaterialIssue,
} from '@prisma/client';
import type {
  CreateMaterialReturnDto,
  UpdateMaterialReturnDto,
  ListMaterialReturnsQueryDto,
} from '../dto/material-return.dto';

export type MaterialReturnLineWithRelations = MaterialReturnLine & {
  material: Material;
  materialIssueLine?: {
    id: string;
    materialId: string;
    quantityRequested: any;
    quantityIssued: any;
    uom: string;
    wbsNodeId?: string | null;
    taskId?: string | null;
  } | null;
};

export type MaterialReturnWithRelations = MaterialReturn & {
  lines: MaterialReturnLineWithRelations[];
  project: Pick<Project, 'id' | 'code' | 'name'>;
  store: Pick<Store, 'id' | 'code' | 'name' | 'storeType' | 'isCentralWarehouse' | 'projectId'>;
  materialIssue: Pick<MaterialIssue, 'id' | 'issueNumber' | 'status' | 'issueDate' | 'storeId' | 'projectId'>;
  returnedBy: { id: string; fullName: string; email: string };
  verifiedBy?: { id: string; fullName: string; email: string } | null;
};

export interface IMaterialReturnRepository {
  findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<MaterialReturnWithRelations | null>;

  findByReturnNumber(
    tenantId: string,
    returnNumber: string
  ): Promise<MaterialReturnWithRelations | null>;

  findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListMaterialReturnsQueryDto
  ): Promise<{ items: MaterialReturnWithRelations[]; total: number }>;

  allocateReturnNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date?: Date
  ): Promise<string>;

  create(
    tenantId: string,
    returnedById: string,
    returnNumber: string,
    data: CreateMaterialReturnDto,
    linesData: Array<{
      materialIssueLineId: string;
      materialId: string;
      quantityReturned: number;
      uom: string;
      condition?: string;
      remarks?: string | null;
    }>
  ): Promise<MaterialReturnWithRelations>;

  update(
    tenantId: string,
    id: string,
    data: UpdateMaterialReturnDto,
    linesData?: Array<{
      materialIssueLineId: string;
      materialId: string;
      quantityReturned: number;
      uom: string;
      condition?: string;
      remarks?: string | null;
    }>
  ): Promise<MaterialReturnWithRelations>;

  submit(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialReturnWithRelations>;

  verify(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialReturnWithRelations>;

  reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<MaterialReturnWithRelations>;

  cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<MaterialReturnWithRelations>;

  delete(tenantId: string, id: string): Promise<void>;
}
