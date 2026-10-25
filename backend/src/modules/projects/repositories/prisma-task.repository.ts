import type { PrismaClient } from '@prisma/client';
import type {
  ITaskRepository,
  TaskEntity,
  CreateTaskParams,
  UpdateTaskParams,
  TaskFilterParams,
} from './task.repository.interface';
import type { TaskStatus, TaskPriority } from '../constants/task.constants';
import { DatabaseService } from '../../../database/database.service';

export class PrismaTaskRepository implements ITaskRepository {
  private readonly prismaClient?: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get prisma(): any {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  async findById(tenantId: string, projectId: string, taskId: string): Promise<TaskEntity | null> {
    const record = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        tenantId,
      },
      include: {
        wbsNode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            predecessors: true,
            successors: true,
          },
        },
      },
    });

    return record ? this.mapTask(record) : null;
  }

  async findMany(
    tenantId: string,
    projectId: string,
    filters?: TaskFilterParams
  ): Promise<TaskEntity[]> {
    const where: any = {
      tenantId,
      projectId,
      ...(filters?.wbsNodeId ? { wbsNodeId: filters.wbsNodeId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.priority ? { priority: filters.priority } : {}),
      ...(filters?.isMilestone !== undefined ? { isMilestone: filters.isMilestone } : {}),
      ...(filters?.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const records = await this.prisma.task.findMany({
      where,
      include: {
        wbsNode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            predecessors: true,
            successors: true,
          },
        },
      },
      orderBy: [{ plannedStartDate: 'asc' }, { createdAt: 'desc' }],
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    });

    return records.map((r: any) => this.mapTask(r));
  }

  async create(params: CreateTaskParams): Promise<TaskEntity> {
    const record = await this.prisma.task.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        projectId: params.projectId,
        wbsNodeId: params.wbsNodeId ?? null,
        name: params.name.trim(),
        description: params.description ?? null,
        status: params.status ?? 'TODO',
        priority: params.priority ?? 'MEDIUM',
        isMilestone: params.isMilestone ?? false,
        progressPct: params.progressPct ?? 0,
        plannedStartDate: params.plannedStartDate ?? null,
        plannedEndDate: params.plannedEndDate ?? null,
        actualStartDate: params.actualStartDate ?? null,
        actualEndDate: params.actualEndDate ?? null,
        assignedUserId: params.assignedUserId ?? null,
      },
      include: {
        wbsNode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            predecessors: true,
            successors: true,
          },
        },
      },
    });

    return this.mapTask(record);
  }

  async update(
    tenantId: string,
    projectId: string,
    taskId: string,
    params: UpdateTaskParams
  ): Promise<TaskEntity> {
    const data: any = { updatedAt: new Date() };

    if (params.name !== undefined) data.name = params.name.trim();
    if (params.description !== undefined) data.description = params.description;
    if (params.wbsNodeId !== undefined) data.wbsNodeId = params.wbsNodeId;
    if (params.status !== undefined) data.status = params.status;
    if (params.priority !== undefined) data.priority = params.priority;
    if (params.isMilestone !== undefined) data.isMilestone = params.isMilestone;
    if (params.progressPct !== undefined) data.progressPct = params.progressPct;
    if (params.plannedStartDate !== undefined) data.plannedStartDate = params.plannedStartDate;
    if (params.plannedEndDate !== undefined) data.plannedEndDate = params.plannedEndDate;
    if (params.actualStartDate !== undefined) data.actualStartDate = params.actualStartDate;
    if (params.actualEndDate !== undefined) data.actualEndDate = params.actualEndDate;
    if (params.assignedUserId !== undefined) data.assignedUserId = params.assignedUserId;

    const record = await this.prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        wbsNode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            predecessors: true,
            successors: true,
          },
        },
      },
    });

    return this.mapTask(record);
  }

  async delete(tenantId: string, projectId: string, taskId: string): Promise<void> {
    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  async countByProject(
    tenantId: string,
    projectId: string,
    filters?: TaskFilterParams
  ): Promise<number> {
    const where: any = {
      tenantId,
      projectId,
      ...(filters?.wbsNodeId ? { wbsNodeId: filters.wbsNodeId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.priority ? { priority: filters.priority } : {}),
      ...(filters?.isMilestone !== undefined ? { isMilestone: filters.isMilestone } : {}),
      ...(filters?.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
    };

    return this.prisma.task.count({ where });
  }

  private mapTask(record: any): TaskEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      projectId: record.projectId,
      wbsNodeId: record.wbsNodeId ?? null,
      name: record.name,
      description: record.description ?? null,
      status: record.status as TaskStatus,
      priority: record.priority as TaskPriority,
      isMilestone: record.isMilestone,
      progressPct: record.progressPct ? Number(record.progressPct) : 0,
      plannedStartDate: record.plannedStartDate ?? null,
      plannedEndDate: record.plannedEndDate ?? null,
      actualStartDate: record.actualStartDate ?? null,
      actualEndDate: record.actualEndDate ?? null,
      assignedUserId: record.assignedUserId ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      wbsNode: record.wbsNode,
      assignedUser: record.assignedUser,
      _count: record._count,
    };
  }
}
