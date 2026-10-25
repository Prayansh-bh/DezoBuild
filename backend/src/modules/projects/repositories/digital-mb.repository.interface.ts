import { Prisma } from '@prisma/client';
import type { MbStatus, MeasurementType } from '../constants/boq.constants';

export interface MeasurementDimensionEntity {
  id: string;
  tenantId: string;
  digitalMbRecordId: string;
  description: string;
  count: Prisma.Decimal;
  length: Prisma.Decimal;
  breadth: Prisma.Decimal;
  depth: Prisma.Decimal;
  factor: Prisma.Decimal;
  calculatedQuantity: Prisma.Decimal;
  remarks: string | null;
  sequence: number;
  createdAt: Date;
}

export interface DigitalMbRecordEntity {
  id: string;
  tenantId: string;
  projectId: string;
  boqItemId: string;
  dprId: string | null;
  taskId: string | null;
  contractorId: string | null;
  mbNumber: string;
  measurementDate: Date;
  measurementType: MeasurementType;
  location: string;
  chainageFrom: Prisma.Decimal | null;
  chainageTo: Prisma.Decimal | null;
  gpsLatitude: Prisma.Decimal | null;
  gpsLongitude: Prisma.Decimal | null;
  witnessedBy: string | null;
  remarks: string | null;
  photoUrls: string[];
  attachmentUrls: string[];
  currentQuantity: Prisma.Decimal;
  previousCumulativeQuantity: Prisma.Decimal;
  cumulativeQuantity: Prisma.Decimal;
  isExcess: boolean;
  excessJustification: string | null;
  isCorrection: boolean;
  supersedesMbRecordId: string | null;
  correctionReason: string | null;
  status: MbStatus;
  createdById: string;
  submittedById: string | null;
  submittedAt: Date | null;
  verifiedById: string | null;
  verifiedAt: Date | null;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectedById: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  boqItem?: {
    id: string;
    itemNumber: string;
    description: string;
    uom: string;
    quantity: Prisma.Decimal;
    unitRate: Prisma.Decimal;
    executedQuantity: Prisma.Decimal;
  };
  dimensions?: MeasurementDimensionEntity[];
  createdBy?: { id: string; fullName: string; email: string };
  submittedBy?: { id: string; fullName: string; email: string } | null;
  verifiedBy?: { id: string; fullName: string; email: string } | null;
  approvedBy?: { id: string; fullName: string; email: string } | null;
  rejectedBy?: { id: string; fullName: string; email: string } | null;
  contractor?: { id: string; name: string; code: string } | null;
  dpr?: { id: string; dprNumber: string; reportDate: Date } | null;
  task?: { id: string; name: string } | null;
}

export interface CreateDimensionParams {
  description: string;
  count: Prisma.Decimal;
  length: Prisma.Decimal;
  breadth: Prisma.Decimal;
  depth: Prisma.Decimal;
  factor: Prisma.Decimal;
  calculatedQuantity: Prisma.Decimal;
  remarks?: string | null;
  sequence?: number;
}

export interface CreateDigitalMbParams {
  id?: string;
  tenantId: string;
  projectId: string;
  boqItemId: string;
  dprId?: string | null;
  taskId?: string | null;
  contractorId?: string | null;
  mbNumber: string;
  measurementDate: Date;
  measurementType: MeasurementType;
  location: string;
  chainageFrom?: Prisma.Decimal | null;
  chainageTo?: Prisma.Decimal | null;
  gpsLatitude?: Prisma.Decimal | null;
  gpsLongitude?: Prisma.Decimal | null;
  witnessedBy?: string | null;
  remarks?: string | null;
  photoUrls?: string[];
  attachmentUrls?: string[];
  currentQuantity: Prisma.Decimal;
  isExcess?: boolean;
  excessJustification?: string | null;
  isCorrection?: boolean;
  supersedesMbRecordId?: string | null;
  correctionReason?: string | null;
  createdById: string;
  dimensions?: CreateDimensionParams[];
}

export interface UpdateDigitalMbParams {
  dprId?: string | null;
  taskId?: string | null;
  contractorId?: string | null;
  measurementDate?: Date;
  measurementType?: MeasurementType;
  location?: string;
  chainageFrom?: Prisma.Decimal | null;
  chainageTo?: Prisma.Decimal | null;
  gpsLatitude?: Prisma.Decimal | null;
  gpsLongitude?: Prisma.Decimal | null;
  witnessedBy?: string | null;
  remarks?: string | null;
  photoUrls?: string[];
  attachmentUrls?: string[];
  currentQuantity?: Prisma.Decimal;
  correctionReason?: string | null;
  dimensions?: CreateDimensionParams[];
}

export interface ListDigitalMbFilterParams {
  boqItemId?: string;
  status?: MbStatus;
  measurementDateFrom?: Date;
  measurementDateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IDigitalMbRepository {
  findById(tenantId: string, projectId: string, id: string): Promise<DigitalMbRecordEntity | null>;
  findByMbNumber(projectId: string, mbNumber: string): Promise<DigitalMbRecordEntity | null>;
  findAllByProject(
    tenantId: string,
    projectId: string,
    filters?: ListDigitalMbFilterParams
  ): Promise<{ items: DigitalMbRecordEntity[]; total: number }>;
  getNextSequenceNumber(tenantId: string, projectId: string): Promise<number>;
  create(params: CreateDigitalMbParams): Promise<DigitalMbRecordEntity>;
  update(tenantId: string, projectId: string, id: string, params: UpdateDigitalMbParams): Promise<DigitalMbRecordEntity>;
  delete(tenantId: string, projectId: string, id: string): Promise<void>;
  submit(tenantId: string, projectId: string, id: string, submittedById: string): Promise<DigitalMbRecordEntity>;
  verify(tenantId: string, projectId: string, id: string, verifiedById: string): Promise<DigitalMbRecordEntity>;
  reject(tenantId: string, projectId: string, id: string, rejectedById: string, reason: string): Promise<DigitalMbRecordEntity>;
  reopenToDraft(tenantId: string, projectId: string, id: string): Promise<DigitalMbRecordEntity>;
  approveMeasurement(params: {
    tenantId: string;
    projectId: string;
    id: string;
    boqItemId: string;
    approvedById: string;
    allowExcess: boolean;
    excessJustification?: string | null;
  }): Promise<DigitalMbRecordEntity>;
  calculateApprovedCumulativeQuantity(tenantId: string, projectId: string, boqItemId: string): Promise<Prisma.Decimal>;
}
