import type {
  GoodsReceiptNote,
  GoodsReceiptLine,
  Material,
  PurchaseOrder,
  PurchaseOrderLine,
  Project,
  Store,
  Vendor,
} from '@prisma/client';
import type {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
  ListGoodsReceiptsQueryDto,
} from '../dto/goods-receipt.dto';

export type GoodsReceiptLineWithRelations = GoodsReceiptLine & {
  material: Material;
  purchaseOrderLine: PurchaseOrderLine;
};

export type GoodsReceiptWithRelations = GoodsReceiptNote & {
  lines: GoodsReceiptLineWithRelations[];
  project: Pick<Project, 'id' | 'code' | 'name'>;
  store: Pick<Store, 'id' | 'code' | 'name' | 'storeType' | 'isCentralWarehouse' | 'projectId'>;
  purchaseOrder: Pick<PurchaseOrder, 'id' | 'poNumber' | 'status' | 'vendorId' | 'projectId' | 'createdById'>;
  vendor: Pick<Vendor, 'id' | 'code' | 'name' | 'gstin'>;
  receivedBy: { id: string; fullName: string; email: string };
  submittedBy?: { id: string; fullName: string; email: string } | null;
  verifiedBy?: { id: string; fullName: string; email: string } | null;
  rejectedBy?: { id: string; fullName: string; email: string } | null;
  cancelledBy?: { id: string; fullName: string; email: string } | null;
};

export interface IGoodsReceiptRepository {
  findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<GoodsReceiptWithRelations | null>;

  findByGrnNumber(
    tenantId: string,
    grnNumber: string
  ): Promise<GoodsReceiptWithRelations | null>;

  findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListGoodsReceiptsQueryDto
  ): Promise<{ items: GoodsReceiptWithRelations[]; total: number }>;

  allocateGrnNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date?: Date
  ): Promise<string>;

  create(
    tenantId: string,
    projectId: string,
    vendorId: string,
    receivedById: string,
    grnNumber: string,
    data: CreateGoodsReceiptDto,
    unitRates: Map<string, number>
  ): Promise<GoodsReceiptWithRelations>;

  update(
    tenantId: string,
    id: string,
    data: UpdateGoodsReceiptDto,
    unitRates?: Map<string, number>
  ): Promise<GoodsReceiptWithRelations>;

  submit(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<GoodsReceiptWithRelations>;

  verify(
    tenantId: string,
    id: string,
    userId: string,
    verificationRemarks?: string | null
  ): Promise<GoodsReceiptWithRelations>;

  reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<GoodsReceiptWithRelations>;

  cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<GoodsReceiptWithRelations>;

  delete(tenantId: string, id: string): Promise<void>;
}
