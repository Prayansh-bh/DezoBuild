import type { PrismaClient } from '@prisma/client';
import type {
  IWbsRepository,
  WbsNodeEntity,
  CreateWbsNodeParams,
  UpdateWbsNodeParams,
} from './wbs.repository.interface';
import type { WbsStatus } from '../constants/wbs.constants';
import { DatabaseService } from '../../../database/database.service';

export class PrismaWbsRepository implements IWbsRepository {
  private readonly prismaClient?: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get prisma(): any {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  async findById(tenantId: string, projectId: string, nodeId: string): Promise<WbsNodeEntity | null> {
    const record = await this.prisma.wbsNode.findFirst({
      where: {
        id: nodeId,
        projectId,
        tenantId,
      },
      include: {
        _count: {
          select: {
            children: true,
            tasks: true,
          },
        },
      },
    });

    return record ? this.mapWbsNode(record) : null;
  }

  async findByCode(projectId: string, code: string): Promise<WbsNodeEntity | null> {
    const record = await this.prisma.wbsNode.findFirst({
      where: {
        projectId,
        code: { equals: code.trim(), mode: 'insensitive' },
      },
      include: {
        _count: {
          select: {
            children: true,
            tasks: true,
          },
        },
      },
    });

    return record ? this.mapWbsNode(record) : null;
  }

  async findAllByProject(tenantId: string, projectId: string): Promise<WbsNodeEntity[]> {
    const records = await this.prisma.wbsNode.findMany({
      where: {
        tenantId,
        projectId,
      },
      orderBy: [{ level: 'asc' }, { sequence: 'asc' }, { code: 'asc' }],
      include: {
        _count: {
          select: {
            children: true,
            tasks: true,
          },
        },
      },
    });

    return records.map((r: any) => this.mapWbsNode(r));
  }

  async findChildren(projectId: string, parentId: string): Promise<WbsNodeEntity[]> {
    const records = await this.prisma.wbsNode.findMany({
      where: {
        projectId,
        parentId,
      },
      orderBy: [{ sequence: 'asc' }, { code: 'asc' }],
      include: {
        _count: {
          select: {
            children: true,
            tasks: true,
          },
        },
      },
    });

    return records.map((r: any) => this.mapWbsNode(r));
  }

  async create(params: CreateWbsNodeParams): Promise<WbsNodeEntity> {
    const record = await this.prisma.wbsNode.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        projectId: params.projectId,
        parentId: params.parentId ?? null,
        code: params.code.trim(),
        name: params.name.trim(),
        description: params.description ?? null,
        level: params.level,
        sequence: params.sequence ?? 0,
        status: params.status ?? 'PLANNED',
        weightagePct: params.weightagePct ?? null,
        progressPct: params.progressPct ?? 0,
        plannedStartDate: params.plannedStartDate ?? null,
        plannedEndDate: params.plannedEndDate ?? null,
        actualStartDate: params.actualStartDate ?? null,
        actualEndDate: params.actualEndDate ?? null,
      },
      include: {
        _count: {
          select: {
            children: true,
            tasks: true,
          },
        },
      },
    });

    return this.mapWbsNode(record);
  }

  async update(
    tenantId: string,
    projectId: string,
    nodeId: string,
    params: UpdateWbsNodeParams
  ): Promise<WbsNodeEntity> {
    const data: any = { updatedAt: new Date() };

    if (params.name !== undefined) data.name = params.name.trim();
    if (params.description !== undefined) data.description = params.description;
    if (params.parentId !== undefined) data.parentId = params.parentId;
    if (params.level !== undefined) data.level = params.level;
    if (params.sequence !== undefined) data.sequence = params.sequence;
    if (params.status !== undefined) data.status = params.status;
    if (params.weightagePct !== undefined) data.weightagePct = params.weightagePct;
    if (params.progressPct !== undefined) data.progressPct = params.progressPct;
    if (params.plannedStartDate !== undefined) data.plannedStartDate = params.plannedStartDate;
    if (params.plannedEndDate !== undefined) data.plannedEndDate = params.plannedEndDate;
    if (params.actualStartDate !== undefined) data.actualStartDate = params.actualStartDate;
    if (params.actualEndDate !== undefined) data.actualEndDate = params.actualEndDate;

    const record = await this.prisma.wbsNode.update({
      where: { id: nodeId },
      data,
      include: {
        _count: {
          select: {
            children: true,
            tasks: true,
          },
        },
      },
    });

    return this.mapWbsNode(record);
  }

  async delete(tenantId: string, projectId: string, nodeId: string): Promise<void> {
    await this.prisma.wbsNode.delete({
      where: { id: nodeId },
    });
  }

  async countChildren(projectId: string, nodeId: string): Promise<number> {
    return this.prisma.wbsNode.count({
      where: {
        projectId,
        parentId: nodeId,
      },
    });
  }

  async countTasks(projectId: string, nodeId: string): Promise<number> {
    return this.prisma.task.count({
      where: {
        projectId,
        wbsNodeId: nodeId,
      },
    });
  }

  private mapWbsNode(record: any): WbsNodeEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      projectId: record.projectId,
      parentId: record.parentId ?? null,
      code: record.code,
      name: record.name,
      description: record.description ?? null,
      level: record.level,
      sequence: record.sequence,
      status: record.status as WbsStatus,
      weightagePct: record.weightagePct ? Number(record.weightagePct) : null,
      progressPct: record.progressPct ? Number(record.progressPct) : 0,
      plannedStartDate: record.plannedStartDate ?? null,
      plannedEndDate: record.plannedEndDate ?? null,
      actualStartDate: record.actualStartDate ?? null,
      actualEndDate: record.actualEndDate ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      _count: record._count,
    };
  }
}
