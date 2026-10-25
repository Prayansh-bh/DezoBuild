import { PrismaClient, Prisma } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IDprRepository,
  DailyProgressReportWithRelations,
} from './dpr.repository.interface';
import type {
  CreateDprDto,
  UpdateDprDto,
  ListDprQueryDto,
} from '../dto/dpr.dto';

export class PrismaDprRepository implements IDprRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  private get includeRelations() {
    return {
      activityProgress: true,
      manpowerLogs: true,
      equipmentLogs: true,
      materialLogs: true,
      photos: true,
    } as const;
  }

  public async findById(
    tenantId: string,
    projectId: string,
    id: string
  ): Promise<DailyProgressReportWithRelations | null> {
    return this.prisma.dailyProgressReport.findFirst({
      where: {
        id,
        tenantId,
        projectId,
      },
      include: this.includeRelations,
    });
  }

  public async findByDate(
    tenantId: string,
    projectId: string,
    reportDate: Date
  ): Promise<DailyProgressReportWithRelations | null> {
    return this.prisma.dailyProgressReport.findFirst({
      where: {
        tenantId,
        projectId,
        reportDate,
      },
      include: this.includeRelations,
    });
  }

  public async findMany(
    tenantId: string,
    projectId: string,
    filter?: ListDprQueryDto
  ): Promise<{ items: DailyProgressReportWithRelations[]; total: number }> {
    const where: Prisma.DailyProgressReportWhereInput = {
      tenantId,
      projectId,
    };

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.startDate || filter?.endDate) {
      where.reportDate = {};
      if (filter.startDate) {
        where.reportDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.reportDate.lte = new Date(filter.endDate);
      }
    }

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.dailyProgressReport.findMany({
        where,
        include: this.includeRelations,
        orderBy: { reportDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dailyProgressReport.count({ where }),
    ]);

    return { items, total };
  }

  public async create(
    tenantId: string,
    projectId: string,
    userId: string,
    dprNumber: string,
    data: CreateDprDto
  ): Promise<DailyProgressReportWithRelations> {
    const reportDate = new Date(data.reportDate);

    return this.prisma.dailyProgressReport.create({
      data: {
        tenantId,
        projectId,
        dprNumber,
        reportDate,
        status: 'DRAFT',
        weather: data.weather ?? null,
        temperature: data.temperature ?? null,
        shift: data.shift ?? null,
        safetyRemarks: data.safetyRemarks ?? null,
        delaysObstacles: data.delaysObstacles ?? null,
        generalNotes: data.generalNotes ?? null,
        createdById: userId,
        activityProgress: {
          create: data.activityProgress.map((item) => ({
            tenantId,
            taskId: item.taskId ?? null,
            wbsNodeId: item.wbsNodeId ?? null,
            activityName: item.activityName,
            workDescription: item.workDescription ?? null,
            quantityDone: item.quantityDone !== undefined && item.quantityDone !== null ? new Prisma.Decimal(item.quantityDone) : null,
            unit: item.unit ?? null,
            progressPct: new Prisma.Decimal(item.progressPct),
          })),
        },
        manpowerLogs: {
          create: data.manpowerLogs.map((item) => ({
            tenantId,
            trade: item.trade,
            skilledCount: item.skilledCount,
            unskilledCount: item.unskilledCount,
            supervisorCount: item.supervisorCount,
            remarks: item.remarks ?? null,
          })),
        },
        equipmentLogs: {
          create: data.equipmentLogs.map((item) => ({
            tenantId,
            equipmentName: item.equipmentName,
            operatingHours: new Prisma.Decimal(item.operatingHours),
            status: item.status,
            remarks: item.remarks ?? null,
          })),
        },
        materialLogs: {
          create: data.materialLogs.map((item) => ({
            tenantId,
            materialName: item.materialName,
            quantityConsumed: new Prisma.Decimal(item.quantityConsumed),
            unit: item.unit,
          })),
        },
        photos: {
          create: data.photos.map((item) => ({
            tenantId,
            photoUrl: item.photoUrl,
            caption: item.caption ?? null,
            takenAt: item.takenAt ? new Date(item.takenAt) : null,
            latitude: item.latitude !== undefined && item.latitude !== null ? new Prisma.Decimal(item.latitude) : null,
            longitude: item.longitude !== undefined && item.longitude !== null ? new Prisma.Decimal(item.longitude) : null,
            uploadedById: userId,
          })),
        },
      },
      include: this.includeRelations,
    });
  }

  public async update(
    tenantId: string,
    projectId: string,
    id: string,
    data: UpdateDprDto
  ): Promise<DailyProgressReportWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.DailyProgressReportUpdateInput = {};

      if (data.weather !== undefined) updateData.weather = data.weather;
      if (data.temperature !== undefined) updateData.temperature = data.temperature;
      if (data.shift !== undefined) updateData.shift = data.shift;
      if (data.safetyRemarks !== undefined) updateData.safetyRemarks = data.safetyRemarks;
      if (data.delaysObstacles !== undefined) updateData.delaysObstacles = data.delaysObstacles;
      if (data.generalNotes !== undefined) updateData.generalNotes = data.generalNotes;

      if (data.activityProgress !== undefined) {
        await tx.dprActivityProgress.deleteMany({ where: { dprId: id, tenantId } });
        if (data.activityProgress.length > 0) {
          await tx.dprActivityProgress.createMany({
            data: data.activityProgress.map((item) => ({
              tenantId,
              dprId: id,
              taskId: item.taskId ?? null,
              wbsNodeId: item.wbsNodeId ?? null,
              activityName: item.activityName,
              workDescription: item.workDescription ?? null,
              quantityDone: item.quantityDone !== undefined && item.quantityDone !== null ? new Prisma.Decimal(item.quantityDone) : null,
              unit: item.unit ?? null,
              progressPct: new Prisma.Decimal(item.progressPct),
            })),
          });
        }
      }

      if (data.manpowerLogs !== undefined) {
        await tx.dprManpower.deleteMany({ where: { dprId: id, tenantId } });
        if (data.manpowerLogs.length > 0) {
          await tx.dprManpower.createMany({
            data: data.manpowerLogs.map((item) => ({
              tenantId,
              dprId: id,
              trade: item.trade,
              skilledCount: item.skilledCount,
              unskilledCount: item.unskilledCount,
              supervisorCount: item.supervisorCount,
              remarks: item.remarks ?? null,
            })),
          });
        }
      }

      if (data.equipmentLogs !== undefined) {
        await tx.dprEquipment.deleteMany({ where: { dprId: id, tenantId } });
        if (data.equipmentLogs.length > 0) {
          await tx.dprEquipment.createMany({
            data: data.equipmentLogs.map((item) => ({
              tenantId,
              dprId: id,
              equipmentName: item.equipmentName,
              operatingHours: new Prisma.Decimal(item.operatingHours),
              status: item.status,
              remarks: item.remarks ?? null,
            })),
          });
        }
      }

      if (data.materialLogs !== undefined) {
        await tx.dprMaterial.deleteMany({ where: { dprId: id, tenantId } });
        if (data.materialLogs.length > 0) {
          await tx.dprMaterial.createMany({
            data: data.materialLogs.map((item) => ({
              tenantId,
              dprId: id,
              materialName: item.materialName,
              quantityConsumed: new Prisma.Decimal(item.quantityConsumed),
              unit: item.unit,
            })),
          });
        }
      }

      if (data.photos !== undefined) {
        await tx.dprPhoto.deleteMany({ where: { dprId: id, tenantId } });
        if (data.photos.length > 0) {
          await tx.dprPhoto.createMany({
            data: data.photos.map((item) => ({
              tenantId,
              dprId: id,
              photoUrl: item.photoUrl,
              caption: item.caption ?? null,
              takenAt: item.takenAt ? new Date(item.takenAt) : null,
              latitude: item.latitude !== undefined && item.latitude !== null ? new Prisma.Decimal(item.latitude) : null,
              longitude: item.longitude !== undefined && item.longitude !== null ? new Prisma.Decimal(item.longitude) : null,
            })),
          });
        }
      }

      return tx.dailyProgressReport.update({
        where: { id },
        data: updateData,
        include: this.includeRelations,
      });
    });
  }

  public async submit(
    tenantId: string,
    projectId: string,
    id: string,
    userId: string
  ): Promise<DailyProgressReportWithRelations> {
    return this.prisma.dailyProgressReport.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
        rejectedById: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: this.includeRelations,
    });
  }

  public async reject(
    tenantId: string,
    projectId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<DailyProgressReportWithRelations> {
    return this.prisma.dailyProgressReport.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason,
      },
      include: this.includeRelations,
    });
  }

  public async approveAndCommitProgress(
    tenantId: string,
    projectId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<DailyProgressReportWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const dpr = await tx.dailyProgressReport.findFirst({
        where: { id, tenantId, projectId },
        include: { activityProgress: true },
      });

      if (!dpr) {
        throw new Error('DPR_NOT_FOUND');
      }

      const updatedDpr = await tx.dailyProgressReport.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
          approvalRemarks: approvalRemarks ?? null,
        },
        include: this.includeRelations,
      });

      // Atomically commit progress to linked Tasks and WBS nodes
      for (const item of dpr.activityProgress) {
        const progressNumber = Number(item.progressPct);

        if (item.taskId) {
          const task = await tx.task.findFirst({
            where: { id: item.taskId, tenantId, projectId },
          });

          if (task) {
            const taskUpdate: Prisma.TaskUpdateInput = {
              progressPct: new Prisma.Decimal(progressNumber),
            };

            if (progressNumber === 100) {
              taskUpdate.status = 'COMPLETED';
              if (!task.actualEndDate) {
                taskUpdate.actualEndDate = dpr.reportDate;
              }
            } else if (progressNumber > 0 && task.status === 'TODO') {
              taskUpdate.status = 'IN_PROGRESS';
            }

            if (!task.actualStartDate && progressNumber > 0) {
              taskUpdate.actualStartDate = dpr.reportDate;
            }

            await tx.task.update({
              where: { id: task.id },
              data: taskUpdate,
            });
          }
        }

        if (item.wbsNodeId) {
          const wbs = await tx.wbsNode.findFirst({
            where: { id: item.wbsNodeId, tenantId, projectId },
          });

          if (wbs) {
            const wbsUpdate: Prisma.WbsNodeUpdateInput = {
              progressPct: new Prisma.Decimal(progressNumber),
            };

            if (progressNumber === 100) {
              wbsUpdate.status = 'COMPLETED';
              if (!wbs.actualEndDate) {
                wbsUpdate.actualEndDate = dpr.reportDate;
              }
            } else if (progressNumber > 0 && wbs.status === 'PLANNED') {
              wbsUpdate.status = 'IN_PROGRESS';
            }

            if (!wbs.actualStartDate && progressNumber > 0) {
              wbsUpdate.actualStartDate = dpr.reportDate;
            }

            await tx.wbsNode.update({
              where: { id: wbs.id },
              data: wbsUpdate,
            });
          }
        }
      }

      return updatedDpr;
    });
  }

  public async delete(
    tenantId: string,
    projectId: string,
    id: string
  ): Promise<void> {
    await this.prisma.dailyProgressReport.deleteMany({
      where: {
        id,
        tenantId,
        projectId,
      },
    });
  }
}
