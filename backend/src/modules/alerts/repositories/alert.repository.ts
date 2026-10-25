import { PrismaClient, Prisma, type Alert } from '@prisma/client';
import type { CreateAlertDto, QueryAlertsDto } from '../dto/alert.dto.js';
import { AlertStatus } from '../constants/alert.constants.js';

export class AlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: CreateAlertDto,
    tx?: Prisma.TransactionClient
  ): Promise<Alert> {
    const client = tx || this.prisma;

    try {
      return await client.alert.create({
        data: {
          tenantId: data.tenantId,
          projectId: data.projectId || null,
          branchId: data.branchId || null,
          alertType: data.alertType,
          severity: data.severity,
          status: AlertStatus.OPEN,
          title: data.title,
          message: data.message,
          entityType: data.entityType || null,
          entityId: data.entityId || null,
          sourceEventId: data.sourceEventId || null,
          assignedToId: data.assignedToId || null,
          dueAt: data.dueAt || null,
          metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (err: any) {
      if (
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
        err?.code === '23505'
      ) {
        if (data.sourceEventId) {
          const existingByEvent = await client.alert.findFirst({
            where: {
              tenantId: data.tenantId,
              sourceEventId: data.sourceEventId,
            },
          });
          if (existingByEvent) {
            return existingByEvent;
          }
        }

        if (data.entityType && data.entityId) {
          const activeExisting = await this.findActiveByEntity(
            data.tenantId,
            data.alertType,
            data.entityType,
            data.entityId,
            client
          );
          if (activeExisting) {
            return activeExisting;
          }
        }
      }
      throw err;
    }
  }

  public async findById(
    tenantId: string,
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<Alert | null> {
    const client = tx || this.prisma;
    return client.alert.findFirst({
      where: { id, tenantId },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        acknowledgedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  public async findMany(
    tenantId: string,
    filters: QueryAlertsDto,
    tx?: Prisma.TransactionClient
  ): Promise<{ items: Alert[]; total: number }> {
    const client = tx || this.prisma;

    const where: Prisma.AlertWhereInput = {
      tenantId,
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.alertType ? { alertType: filters.alertType } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
    };

    const [items, total] = await Promise.all([
      client.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
        include: {
          assignedTo: { select: { id: true, fullName: true, email: true } },
          acknowledgedBy: { select: { id: true, fullName: true, email: true } },
          resolvedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      client.alert.count({ where }),
    ]);

    return { items, total };
  }

  public async findActiveByEntity(
    tenantId: string,
    alertType: string,
    entityType: string,
    entityId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Alert | null> {
    const client = tx || this.prisma;
    return client.alert.findFirst({
      where: {
        tenantId,
        alertType,
        entityType,
        entityId,
        status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
      },
    });
  }

  public async acknowledge(
    tenantId: string,
    id: string,
    userId: string,
    metadataNote?: string,
    tx?: Prisma.TransactionClient
  ): Promise<Alert> {
    const client = tx || this.prisma;
    return client.alert.update({
      where: { id, tenantId },
      data: {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
        ...(metadataNote ? { metadata: { acknowledgmentNote: metadataNote } } : {}),
      },
    });
  }

  public async resolve(
    tenantId: string,
    id: string,
    userId: string,
    resolutionNote?: string,
    tx?: Prisma.TransactionClient
  ): Promise<Alert> {
    const client = tx || this.prisma;
    return client.alert.update({
      where: { id, tenantId },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: userId,
        ...(resolutionNote ? { metadata: { resolutionNote } } : {}),
      },
    });
  }

  public async dismiss(
    tenantId: string,
    id: string,
    reason?: string,
    tx?: Prisma.TransactionClient
  ): Promise<Alert> {
    const client = tx || this.prisma;
    return client.alert.update({
      where: { id, tenantId },
      data: {
        status: AlertStatus.DISMISSED,
        ...(reason ? { metadata: { dismissReason: reason } } : {}),
      },
    });
  }
}
