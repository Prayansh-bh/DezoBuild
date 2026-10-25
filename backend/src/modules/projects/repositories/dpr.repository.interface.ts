import type {
  DailyProgressReport,
  DprActivityProgress,
  DprManpower,
  DprEquipment,
  DprMaterial,
  DprPhoto,
} from '@prisma/client';
import type {
  CreateDprDto,
  UpdateDprDto,
  ListDprQueryDto,
} from '../dto/dpr.dto';

export type DailyProgressReportWithRelations = DailyProgressReport & {
  activityProgress: DprActivityProgress[];
  manpowerLogs: DprManpower[];
  equipmentLogs: DprEquipment[];
  materialLogs: DprMaterial[];
  photos: DprPhoto[];
};

export interface IDprRepository {
  findById(
    tenantId: string,
    projectId: string,
    id: string
  ): Promise<DailyProgressReportWithRelations | null>;

  findByDate(
    tenantId: string,
    projectId: string,
    reportDate: Date
  ): Promise<DailyProgressReportWithRelations | null>;

  findMany(
    tenantId: string,
    projectId: string,
    filter?: ListDprQueryDto
  ): Promise<{ items: DailyProgressReportWithRelations[]; total: number }>;

  create(
    tenantId: string,
    projectId: string,
    userId: string,
    dprNumber: string,
    data: CreateDprDto
  ): Promise<DailyProgressReportWithRelations>;

  update(
    tenantId: string,
    projectId: string,
    id: string,
    data: UpdateDprDto
  ): Promise<DailyProgressReportWithRelations>;

  submit(
    tenantId: string,
    projectId: string,
    id: string,
    userId: string
  ): Promise<DailyProgressReportWithRelations>;

  reject(
    tenantId: string,
    projectId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<DailyProgressReportWithRelations>;

  approveAndCommitProgress(
    tenantId: string,
    projectId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<DailyProgressReportWithRelations>;

  delete(
    tenantId: string,
    projectId: string,
    id: string
  ): Promise<void>;
}
