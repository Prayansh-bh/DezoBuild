import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  IDigitalMbRepository,
  DigitalMbRecordEntity,
  MeasurementDimensionEntity,
  CreateDigitalMbParams,
  UpdateDigitalMbParams,
  ListDigitalMbFilterParams,
} from './digital-mb.repository.interface';
import type { MbStatus, MeasurementType } from '../constants/boq.constants';
import { DatabaseService } from '../../../database/database.service';
import { BadRequestError, NotFoundError } from '../../../common/errors/app-error';

export class PrismaDigitalMbRepository implements IDigitalMbRepository {
  private readonly prismaClient?: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get prisma(): any {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  async findById(tenantId: string, projectId: string, id: string): Promise<DigitalMbRecordEntity | null> {
    const record = await this.prisma.digitalMbRecord.findFirst({
      where: {
        id,
        tenantId,
        projectId,
      },
      include: {
        boqItem: true,
        dimensions: {
          orderBy: { sequence: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        rejectedBy: { select: { id: true, fullName: true, email: true } },
        contractor: { select: { id: true, name: true, code: true } },
        dpr: { select: { id: true, dprNumber: true, reportDate: true } },
        task: { select: { id: true, name: true } },
      },
    });

    return record ? this.mapDigitalMbRecord(record) : null;
  }

  async findByMbNumber(projectId: string, mbNumber: string): Promise<DigitalMbRecordEntity | null> {
    const record = await this.prisma.digitalMbRecord.findFirst({
      where: {
        projectId,
        mbNumber: { equals: mbNumber.trim(), mode: 'insensitive' },
      },
      include: {
        boqItem: true,
        dimensions: {
          orderBy: { sequence: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        rejectedBy: { select: { id: true, fullName: true, email: true } },
        contractor: { select: { id: true, name: true, code: true } },
        dpr: { select: { id: true, dprNumber: true, reportDate: true } },
        task: { select: { id: true, name: true } },
      },
    });

    return record ? this.mapDigitalMbRecord(record) : null;
  }

  async findAllByProject(
    tenantId: string,
    projectId: string,
    filters?: ListDigitalMbFilterParams
  ): Promise<{ items: DigitalMbRecordEntity[]; total: number }> {
    const where: any = {
      tenantId,
      projectId,
    };

    if (filters?.boqItemId) {
      where.boqItemId = filters.boqItemId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.measurementDateFrom || filters?.measurementDateTo) {
      where.measurementDate = {};
      if (filters.measurementDateFrom) {
        where.measurementDate.gte = filters.measurementDateFrom;
      }
      if (filters.measurementDateTo) {
        where.measurementDate.lte = filters.measurementDateTo;
      }
    }

    if (filters?.search) {
      where.OR = [
        { mbNumber: { contains: filters.search.trim(), mode: 'insensitive' } },
        { location: { contains: filters.search.trim(), mode: 'insensitive' } },
        { remarks: { contains: filters.search.trim(), mode: 'insensitive' } },
      ];
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      this.prisma.digitalMbRecord.count({ where }),
      this.prisma.digitalMbRecord.findMany({
        where,
        orderBy: [{ measurementDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          boqItem: true,
          dimensions: {
            orderBy: { sequence: 'asc' },
          },
          createdBy: { select: { id: true, fullName: true, email: true } },
          submittedBy: { select: { id: true, fullName: true, email: true } },
          verifiedBy: { select: { id: true, fullName: true, email: true } },
          approvedBy: { select: { id: true, fullName: true, email: true } },
          rejectedBy: { select: { id: true, fullName: true, email: true } },
          contractor: { select: { id: true, name: true, code: true } },
          dpr: { select: { id: true, dprNumber: true, reportDate: true } },
          task: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: records.map((r: any) => this.mapDigitalMbRecord(r)),
      total,
    };
  }

  async getNextSequenceNumber(tenantId: string, projectId: string): Promise<number> {
    const seq = await this.prisma.digitalMbSequence.upsert({
      where: {
        tenantId_projectId: {
          tenantId,
          projectId,
        },
      },
      create: {
        tenantId,
        projectId,
        currentNumber: 1,
      },
      update: {
        currentNumber: { increment: 1 },
      },
    });

    return seq.currentNumber;
  }

  async create(params: CreateDigitalMbParams): Promise<DigitalMbRecordEntity> {
    const record = await this.prisma.digitalMbRecord.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        projectId: params.projectId,
        boqItemId: params.boqItemId,
        dprId: params.dprId ?? null,
        taskId: params.taskId ?? null,
        contractorId: params.contractorId ?? null,
        mbNumber: params.mbNumber,
        measurementDate: params.measurementDate,
        measurementType: params.measurementType,
        location: params.location.trim(),
        chainageFrom: params.chainageFrom ?? null,
        chainageTo: params.chainageTo ?? null,
        gpsLatitude: params.gpsLatitude ?? null,
        gpsLongitude: params.gpsLongitude ?? null,
        witnessedBy: params.witnessedBy ?? null,
        remarks: params.remarks ?? null,
        photoUrls: params.photoUrls ?? [],
        attachmentUrls: params.attachmentUrls ?? [],
        currentQuantity: params.currentQuantity,
        previousCumulativeQuantity: new Prisma.Decimal(0),
        cumulativeQuantity: new Prisma.Decimal(0),
        isExcess: params.isExcess ?? false,
        excessJustification: params.excessJustification ?? null,
        isCorrection: params.isCorrection ?? false,
        supersedesMbRecordId: params.supersedesMbRecordId ?? null,
        correctionReason: params.correctionReason ?? null,
        status: 'DRAFT',
        createdById: params.createdById,
        dimensions: params.dimensions && params.dimensions.length > 0
          ? {
              create: params.dimensions.map((d, index) => ({
                tenantId: params.tenantId,
                description: d.description.trim(),
                count: d.count,
                length: d.length,
                breadth: d.breadth,
                depth: d.depth,
                factor: d.factor,
                calculatedQuantity: d.calculatedQuantity,
                remarks: d.remarks ?? null,
                sequence: d.sequence ?? index,
              })),
            }
          : undefined,
      },
      include: {
        boqItem: true,
        dimensions: {
          orderBy: { sequence: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        rejectedBy: { select: { id: true, fullName: true, email: true } },
        contractor: { select: { id: true, name: true, code: true } },
        dpr: { select: { id: true, dprNumber: true, reportDate: true } },
        task: { select: { id: true, name: true } },
      },
    });

    return this.mapDigitalMbRecord(record);
  }

  async update(
    tenantId: string,
    projectId: string,
    id: string,
    params: UpdateDigitalMbParams
  ): Promise<DigitalMbRecordEntity> {
    return this.prisma.$transaction(async (tx: any) => {
      const data: any = { updatedAt: new Date() };

      if (params.dprId !== undefined) data.dprId = params.dprId;
      if (params.taskId !== undefined) data.taskId = params.taskId;
      if (params.contractorId !== undefined) data.contractorId = params.contractorId;
      if (params.measurementDate !== undefined) data.measurementDate = params.measurementDate;
      if (params.measurementType !== undefined) data.measurementType = params.measurementType;
      if (params.location !== undefined) data.location = params.location.trim();
      if (params.chainageFrom !== undefined) data.chainageFrom = params.chainageFrom;
      if (params.chainageTo !== undefined) data.chainageTo = params.chainageTo;
      if (params.gpsLatitude !== undefined) data.gpsLatitude = params.gpsLatitude;
      if (params.gpsLongitude !== undefined) data.gpsLongitude = params.gpsLongitude;
      if (params.witnessedBy !== undefined) data.witnessedBy = params.witnessedBy;
      if (params.remarks !== undefined) data.remarks = params.remarks;
      if (params.photoUrls !== undefined) data.photoUrls = params.photoUrls;
      if (params.attachmentUrls !== undefined) data.attachmentUrls = params.attachmentUrls;
      if (params.currentQuantity !== undefined) data.currentQuantity = params.currentQuantity;
      if (params.correctionReason !== undefined) data.correctionReason = params.correctionReason;

      if (params.dimensions !== undefined) {
        // Delete existing dimensions and replace
        await tx.measurementDimension.deleteMany({
          where: { digitalMbRecordId: id },
        });

        if (params.dimensions.length > 0) {
          await tx.measurementDimension.createMany({
            data: params.dimensions.map((d, index) => ({
              tenantId,
              digitalMbRecordId: id,
              description: d.description.trim(),
              count: d.count,
              length: d.length,
              breadth: d.breadth,
              depth: d.depth,
              factor: d.factor,
              calculatedQuantity: d.calculatedQuantity,
              remarks: d.remarks ?? null,
              sequence: d.sequence ?? index,
            })),
          });
        }
      }

      const updated = await tx.digitalMbRecord.update({
        where: { id },
        data,
        include: {
          boqItem: true,
          dimensions: {
            orderBy: { sequence: 'asc' },
          },
          createdBy: { select: { id: true, fullName: true, email: true } },
          submittedBy: { select: { id: true, fullName: true, email: true } },
          verifiedBy: { select: { id: true, fullName: true, email: true } },
          approvedBy: { select: { id: true, fullName: true, email: true } },
          rejectedBy: { select: { id: true, fullName: true, email: true } },
          contractor: { select: { id: true, name: true, code: true } },
          dpr: { select: { id: true, dprNumber: true, reportDate: true } },
          task: { select: { id: true, name: true } },
        },
      });

      return this.mapDigitalMbRecord(updated);
    });
  }

  async delete(tenantId: string, projectId: string, id: string): Promise<void> {
    await this.prisma.digitalMbRecord.delete({
      where: { id },
    });
  }

  async submit(
    tenantId: string,
    projectId: string,
    id: string,
    submittedById: string
  ): Promise<DigitalMbRecordEntity> {
    const record = await this.prisma.digitalMbRecord.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedById,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        boqItem: true,
        dimensions: {
          orderBy: { sequence: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        rejectedBy: { select: { id: true, fullName: true, email: true } },
        contractor: { select: { id: true, name: true, code: true } },
        dpr: { select: { id: true, dprNumber: true, reportDate: true } },
        task: { select: { id: true, name: true } },
      },
    });

    return this.mapDigitalMbRecord(record);
  }

  async verify(
    tenantId: string,
    projectId: string,
    id: string,
    verifiedById: string
  ): Promise<DigitalMbRecordEntity> {
    const record = await this.prisma.digitalMbRecord.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedById,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        boqItem: true,
        dimensions: {
          orderBy: { sequence: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        rejectedBy: { select: { id: true, fullName: true, email: true } },
        contractor: { select: { id: true, name: true, code: true } },
        dpr: { select: { id: true, dprNumber: true, reportDate: true } },
        task: { select: { id: true, name: true } },
      },
    });

    return this.mapDigitalMbRecord(record);
  }

  async reject(
    tenantId: string,
    projectId: string,
    id: string,
    rejectedById: string,
    reason: string
  ): Promise<DigitalMbRecordEntity> {
    const record = await this.prisma.digitalMbRecord.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
        updatedAt: new Date(),
      },
      include: {
        boqItem: true,
        dimensions: {
          orderBy: { sequence: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        rejectedBy: { select: { id: true, fullName: true, email: true } },
        contractor: { select: { id: true, name: true, code: true } },
        dpr: { select: { id: true, dprNumber: true, reportDate: true } },
        task: { select: { id: true, name: true } },
      },
    });

    return this.mapDigitalMbRecord(record);
  }

  async reopenToDraft(
    tenantId: string,
    projectId: string,
    id: string
  ): Promise<DigitalMbRecordEntity> {
    const record = await this.prisma.digitalMbRecord.update({
      where: { id },
      data: {
        status: 'DRAFT',
        updatedAt: new Date(),
      },
      include: {
        boqItem: true,
        dimensions: {
          orderBy: { sequence: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true, email: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        rejectedBy: { select: { id: true, fullName: true, email: true } },
        contractor: { select: { id: true, name: true, code: true } },
        dpr: { select: { id: true, dprNumber: true, reportDate: true } },
        task: { select: { id: true, name: true } },
      },
    });

    return this.mapDigitalMbRecord(record);
  }

  async approveMeasurement(params: {
    tenantId: string;
    projectId: string;
    id: string;
    boqItemId: string;
    approvedById: string;
    allowExcess: boolean;
    excessJustification?: string | null;
  }): Promise<DigitalMbRecordEntity> {
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Lock BoqItem FOR UPDATE
      const lockedBoqItems: any[] = await tx.$queryRaw(
        Prisma.sql`SELECT * FROM boq_items WHERE id = ${params.boqItemId}::uuid AND tenant_id = ${params.tenantId}::uuid FOR UPDATE`
      );

      if (!lockedBoqItems || lockedBoqItems.length === 0) {
        throw new NotFoundError('Parent BOQ item not found for locking');
      }

      const lockedBoq = lockedBoqItems[0];

      // 2. Re-read MB inside transaction
      const mb = await tx.digitalMbRecord.findFirst({
        where: {
          id: params.id,
          tenantId: params.tenantId,
          projectId: params.projectId,
        },
      });

      if (!mb) {
        throw new NotFoundError('Digital MB record not found');
      }

      if (mb.status !== 'VERIFIED') {
        throw new BadRequestError(
          `Cannot approve measurement: Current status is ${mb.status}, expected VERIFIED`
        );
      }

      const previousCumulative = new Prisma.Decimal(lockedBoq.executed_quantity.toString());
      const currentQuantity = new Prisma.Decimal(mb.currentQuantity.toString());
      const newCumulative = previousCumulative.plus(currentQuantity);
      const boqContractQuantity = new Prisma.Decimal(lockedBoq.quantity.toString());

      const isExcess = newCumulative.greaterThan(boqContractQuantity);

      if (isExcess) {
        if (!params.allowExcess) {
          throw new BadRequestError(
            `Cannot approve measurement: Cumulative quantity (${newCumulative.toString()}) exceeds BOQ contracted quantity (${boqContractQuantity.toString()}). Explicit excess authorization required.`
          );
        }

        if (!params.excessJustification || params.excessJustification.trim().length < 10) {
          throw new BadRequestError(
            'Excess justification (minimum 10 characters) is mandatory when authorizing excess measurement.'
          );
        }
      }

      // 3. Update DigitalMbRecord
      const updatedMb = await tx.digitalMbRecord.update({
        where: { id: params.id },
        data: {
          previousCumulativeQuantity: previousCumulative,
          cumulativeQuantity: newCumulative,
          isExcess,
          excessJustification: isExcess ? params.excessJustification?.trim() : null,
          status: 'APPROVED',
          approvedById: params.approvedById,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          boqItem: true,
          dimensions: {
            orderBy: { sequence: 'asc' },
          },
          createdBy: { select: { id: true, fullName: true, email: true } },
          submittedBy: { select: { id: true, fullName: true, email: true } },
          verifiedBy: { select: { id: true, fullName: true, email: true } },
          approvedBy: { select: { id: true, fullName: true, email: true } },
          rejectedBy: { select: { id: true, fullName: true, email: true } },
          contractor: { select: { id: true, name: true, code: true } },
          dpr: { select: { id: true, dprNumber: true, reportDate: true } },
          task: { select: { id: true, name: true } },
        },
      });

      // 4. Update BoqItem.executedQuantity atomically
      await tx.boqItem.update({
        where: { id: params.boqItemId },
        data: {
          executedQuantity: newCumulative,
          updatedAt: new Date(),
        },
      });

      return this.mapDigitalMbRecord(updatedMb);
    });
  }

  async calculateApprovedCumulativeQuantity(
    tenantId: string,
    projectId: string,
    boqItemId: string
  ): Promise<Prisma.Decimal> {
    const result: any[] = await this.prisma.$queryRaw(
      Prisma.sql`SELECT COALESCE(SUM(current_quantity), 0) as total FROM digital_mb_records WHERE tenant_id = ${tenantId}::uuid AND project_id = ${projectId}::uuid AND boq_item_id = ${boqItemId}::uuid AND status = 'APPROVED'`
    );

    return new Prisma.Decimal(result[0]?.total?.toString() || '0');
  }

  private mapDigitalMbRecord(record: any): DigitalMbRecordEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      projectId: record.projectId,
      boqItemId: record.boqItemId,
      dprId: record.dprId ?? null,
      taskId: record.taskId ?? null,
      contractorId: record.contractorId ?? null,
      mbNumber: record.mbNumber,
      measurementDate: record.measurementDate,
      measurementType: record.measurementType as MeasurementType,
      location: record.location,
      chainageFrom: record.chainageFrom ?? null,
      chainageTo: record.chainageTo ?? null,
      gpsLatitude: record.gpsLatitude ?? null,
      gpsLongitude: record.gpsLongitude ?? null,
      witnessedBy: record.witnessedBy ?? null,
      remarks: record.remarks ?? null,
      photoUrls: record.photoUrls || [],
      attachmentUrls: record.attachmentUrls || [],
      currentQuantity: record.currentQuantity,
      previousCumulativeQuantity: record.previousCumulativeQuantity,
      cumulativeQuantity: record.cumulativeQuantity,
      isExcess: record.isExcess,
      excessJustification: record.excessJustification ?? null,
      isCorrection: record.isCorrection,
      supersedesMbRecordId: record.supersedesMbRecordId ?? null,
      correctionReason: record.correctionReason ?? null,
      status: record.status as MbStatus,
      createdById: record.createdById,
      submittedById: record.submittedById ?? null,
      submittedAt: record.submittedAt ?? null,
      verifiedById: record.verifiedById ?? null,
      verifiedAt: record.verifiedAt ?? null,
      approvedById: record.approvedById ?? null,
      approvedAt: record.approvedAt ?? null,
      rejectedById: record.rejectedById ?? null,
      rejectedAt: record.rejectedAt ?? null,
      rejectionReason: record.rejectionReason ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      boqItem: record.boqItem
        ? {
            id: record.boqItem.id,
            itemNumber: record.boqItem.itemNumber,
            description: record.boqItem.description,
            uom: record.boqItem.uom,
            quantity: record.boqItem.quantity,
            unitRate: record.boqItem.unitRate,
            executedQuantity: record.boqItem.executedQuantity,
          }
        : undefined,
      dimensions: record.dimensions
        ? record.dimensions.map((d: any) => ({
            id: d.id,
            tenantId: d.tenantId,
            digitalMbRecordId: d.digitalMbRecordId,
            description: d.description,
            count: d.count,
            length: d.length,
            breadth: d.breadth,
            depth: d.depth,
            factor: d.factor,
            calculatedQuantity: d.calculatedQuantity,
            remarks: d.remarks ?? null,
            sequence: d.sequence,
            createdAt: d.createdAt,
          }))
        : [],
      createdBy: record.createdBy ?? undefined,
      submittedBy: record.submittedBy ?? null,
      verifiedBy: record.verifiedBy ?? null,
      approvedBy: record.approvedBy ?? null,
      rejectedBy: record.rejectedBy ?? null,
      contractor: record.contractor ?? null,
      dpr: record.dpr ?? null,
      task: record.task ?? null,
    };
  }
}
