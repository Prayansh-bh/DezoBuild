import { Prisma } from '@prisma/client';
import type { BoqStatus, BoqUom } from '../constants/boq.constants';

export interface BoqItemEntity {
  id: string;
  tenantId: string;
  projectId: string;
  wbsNodeId: string | null;
  parentId: string | null;
  itemNumber: string;
  description: string;
  specification: string | null;
  uom: BoqUom;
  quantity: Prisma.Decimal;
  unitRate: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  executedQuantity: Prisma.Decimal;
  status: BoqStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  wbsNode?: {
    id: string;
    code: string;
    name: string;
  } | null;
  parent?: {
    id: string;
    itemNumber: string;
    description: string;
  } | null;
  children?: BoqItemEntity[];
  _count?: {
    children?: number;
    measurementRecords?: number;
  };
}

export interface CreateBoqItemParams {
  id?: string;
  tenantId: string;
  projectId: string;
  wbsNodeId?: string | null;
  parentId?: string | null;
  itemNumber: string;
  description: string;
  specification?: string | null;
  uom: BoqUom;
  quantity: Prisma.Decimal;
  unitRate: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  createdById: string;
}

export interface UpdateBoqItemParams {
  wbsNodeId?: string | null;
  parentId?: string | null;
  description?: string;
  specification?: string | null;
  uom?: BoqUom;
  quantity?: Prisma.Decimal;
  unitRate?: Prisma.Decimal;
  totalAmount?: Prisma.Decimal;
  status?: BoqStatus;
}

export interface ListBoqFilterParams {
  status?: BoqStatus;
  wbsNodeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IBoqRepository {
  findById(tenantId: string, projectId: string, boqItemId: string): Promise<BoqItemEntity | null>;
  findByItemNumber(projectId: string, itemNumber: string): Promise<BoqItemEntity | null>;
  findAllByProject(
    tenantId: string,
    projectId: string,
    filters?: ListBoqFilterParams
  ): Promise<{ items: BoqItemEntity[]; total: number }>;
  create(params: CreateBoqItemParams): Promise<BoqItemEntity>;
  createBulk(tenantId: string, projectId: string, items: CreateBoqItemParams[]): Promise<BoqItemEntity[]>;
  update(tenantId: string, projectId: string, boqItemId: string, params: UpdateBoqItemParams): Promise<BoqItemEntity>;
  delete(tenantId: string, projectId: string, boqItemId: string): Promise<void>;
  countMeasurementRecords(tenantId: string, projectId: string, boqItemId: string): Promise<number>;
  countChildren(projectId: string, boqItemId: string): Promise<number>;
}
