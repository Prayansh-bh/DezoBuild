import type {
  PurchaseOrder,
  PurchaseOrderLine,
  Material,
  MaterialIndentLine,
  Project,
  Vendor,
  User,
} from '@prisma/client';
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ListPurchaseOrdersQueryDto,
} from '../dto/purchase-order.dto';

export type PurchaseOrderLineWithRelations = PurchaseOrderLine & {
  material: Material;
  indentLine?: MaterialIndentLine | null;
};

export type PurchaseOrderWithRelations = PurchaseOrder & {
  lines: PurchaseOrderLineWithRelations[];
  project: Pick<Project, 'id' | 'code' | 'name'>;
  vendor: Pick<Vendor, 'id' | 'code' | 'name'>;
  createdBy: Pick<User, 'id' | 'fullName' | 'email'>;
  submittedBy?: Pick<User, 'id' | 'fullName' | 'email'> | null;
  approvedBy?: Pick<User, 'id' | 'fullName' | 'email'> | null;
  rejectedBy?: Pick<User, 'id' | 'fullName' | 'email'> | null;
  cancelledBy?: Pick<User, 'id' | 'fullName' | 'email'> | null;
  orderedBy?: Pick<User, 'id' | 'fullName' | 'email'> | null;
};

export interface CalculatedLine {
  materialId: string;
  indentLineId?: string | null;
  quantityOrdered: number;
  uom: string;
  unitRate: number;
  taxRatePercent: number;
  discountRatePercent: number;
  lineTotal: number;
  expectedDeliveryDate?: string | null;
  wbsNodeId?: string | null;
  taskId?: string | null;
  remarks?: string | null;
}

export interface CalculatedTotals {
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  lines: CalculatedLine[];
}

export interface IPurchaseOrderRepository {
  findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<PurchaseOrderWithRelations | null>;

  findByPoNumber(
    tenantId: string,
    poNumber: string
  ): Promise<PurchaseOrderWithRelations | null>;

  findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListPurchaseOrdersQueryDto
  ): Promise<{ items: PurchaseOrderWithRelations[]; total: number }>;

  allocatePoNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date: Date
  ): Promise<string>;

  getCommittedIndentLineQuantity(
    tenantId: string,
    indentLineId: string,
    excludePoLineId?: string
  ): Promise<number>;

  create(
    tenantId: string,
    projectId: string,
    userId: string,
    poNumber: string,
    data: CreatePurchaseOrderDto,
    calculated: CalculatedTotals
  ): Promise<PurchaseOrderWithRelations>;

  update(
    tenantId: string,
    id: string,
    data: UpdatePurchaseOrderDto,
    calculated?: CalculatedTotals
  ): Promise<PurchaseOrderWithRelations>;

  submit(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<PurchaseOrderWithRelations>;

  approve(
    tenantId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<PurchaseOrderWithRelations>;

  reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<PurchaseOrderWithRelations>;

  order(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<PurchaseOrderWithRelations>;

  cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<PurchaseOrderWithRelations>;

  delete(tenantId: string, id: string): Promise<void>;
}
