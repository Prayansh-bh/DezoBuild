import type {
  MaterialTransfer,
  MaterialTransferLine,
  Material,
  Project,
  Store,
} from '@prisma/client';
import type {
  CreateMaterialTransferDto,
  UpdateMaterialTransferDto,
  ListMaterialTransfersQueryDto,
  DispatchMaterialTransferDto,
  ReceiveMaterialTransferDto,
} from '../dto/material-transfer.dto';

export type MaterialTransferLineWithRelations = MaterialTransferLine & {
  material: Material;
};

export type MaterialTransferWithRelations = MaterialTransfer & {
  lines: MaterialTransferLineWithRelations[];
  sourceStore: Pick<Store, 'id' | 'code' | 'name' | 'storeType' | 'isCentralWarehouse' | 'projectId'>;
  destinationStore: Pick<Store, 'id' | 'code' | 'name' | 'storeType' | 'isCentralWarehouse' | 'projectId'>;
  sourceProject?: Pick<Project, 'id' | 'code' | 'name'> | null;
  destinationProject?: Pick<Project, 'id' | 'code' | 'name'> | null;
  createdBy: { id: string; fullName: string; email: string };
  submittedBy?: { id: string; fullName: string; email: string } | null;
  approvedBy?: { id: string; fullName: string; email: string } | null;
  dispatchedBy?: { id: string; fullName: string; email: string } | null;
  receivedBy?: { id: string; fullName: string; email: string } | null;
  rejectedBy?: { id: string; fullName: string; email: string } | null;
  cancelledBy?: { id: string; fullName: string; email: string } | null;
};

export interface IMaterialTransferRepository {
  findById(tenantId: string, id: string): Promise<MaterialTransferWithRelations | null>;
  findByTransferNumber(tenantId: string, transferNumber: string): Promise<MaterialTransferWithRelations | null>;
  findMany(
    tenantId: string,
    allowedStoreIds?: string[],
    filter?: ListMaterialTransfersQueryDto
  ): Promise<{ items: MaterialTransferWithRelations[]; total: number }>;
  allocateTransferNumber(tenantId: string, scopeKey: string, date?: Date): Promise<string>;
  create(
    tenantId: string,
    createdById: string,
    transferNumber: string,
    data: CreateMaterialTransferDto,
    sourceProjectId?: string | null,
    destinationProjectId?: string | null,
    linesData?: Array<{
      materialId: string;
      quantityTransferred: number;
      uom: string;
      remarks?: string | null;
    }>
  ): Promise<MaterialTransferWithRelations>;
  update(
    tenantId: string,
    id: string,
    data: UpdateMaterialTransferDto,
    sourceProjectId?: string | null,
    destinationProjectId?: string | null,
    linesData?: Array<{
      materialId: string;
      quantityTransferred: number;
      uom: string;
      remarks?: string | null;
    }>
  ): Promise<MaterialTransferWithRelations>;
  submit(tenantId: string, id: string, userId: string, remarks?: string | null): Promise<MaterialTransferWithRelations>;
  approve(tenantId: string, id: string, userId: string, approvalRemarks?: string | null): Promise<MaterialTransferWithRelations>;
  reject(tenantId: string, id: string, userId: string, rejectionReason: string): Promise<MaterialTransferWithRelations>;
  cancel(tenantId: string, id: string, userId: string, cancellationReason?: string | null): Promise<MaterialTransferWithRelations>;
  dispatch(tenantId: string, id: string, userId: string, data?: DispatchMaterialTransferDto): Promise<MaterialTransferWithRelations>;
  receive(tenantId: string, id: string, userId: string, data?: ReceiveMaterialTransferDto): Promise<MaterialTransferWithRelations>;
  delete(tenantId: string, id: string): Promise<void>;
}
