import type { PrismaClient } from '@prisma/client';
import type {
  ITaskDependencyRepository,
  TaskDependencyEntity,
  CreateTaskDependencyParams,
} from './task-dependency.repository.interface';
import type { DependencyType } from '../constants/task-dependency.constants';
import { DatabaseService } from '../../../database/database.service';

export class PrismaTaskDependencyRepository implements ITaskDependencyRepository {
  private readonly prismaClient?: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get prisma(): any {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  async findById(
    tenantId: string,
    projectId: string,
    dependencyId: string
  ): Promise<TaskDependencyEntity | null> {
    const record = await this.prisma.taskDependency.findFirst({
      where: {
        id: dependencyId,
        projectId,
        tenantId,
      },
      include: {
        predecessorTask: {
          select: { id: true, name: true, status: true },
        },
        successorTask: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    return record ? this.mapDependency(record) : null;
  }

  async findByTasks(
    predecessorTaskId: string,
    successorTaskId: string
  ): Promise<TaskDependencyEntity | null> {
    const record = await this.prisma.taskDependency.findUnique({
      where: {
        predecessorTaskId_successorTaskId: {
          predecessorTaskId,
          successorTaskId,
        },
      },
      include: {
        predecessorTask: {
          select: { id: true, name: true, status: true },
        },
        successorTask: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    return record ? this.mapDependency(record) : null;
  }

  async findAllByProject(tenantId: string, projectId: string): Promise<TaskDependencyEntity[]> {
    const records = await this.prisma.taskDependency.findMany({
      where: {
        tenantId,
        projectId,
      },
      include: {
        predecessorTask: {
          select: { id: true, name: true, status: true },
        },
        successorTask: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r: any) => this.mapDependency(r));
  }

  async findByTaskId(
    tenantId: string,
    projectId: string,
    taskId: string
  ): Promise<TaskDependencyEntity[]> {
    const records = await this.prisma.taskDependency.findMany({
      where: {
        tenantId,
        projectId,
        OR: [
          { predecessorTaskId: taskId },
          { successorTaskId: taskId },
        ],
      },
      include: {
        predecessorTask: {
          select: { id: true, name: true, status: true },
        },
        successorTask: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r: any) => this.mapDependency(r));
  }

  async create(params: CreateTaskDependencyParams): Promise<TaskDependencyEntity> {
    const record = await this.prisma.taskDependency.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        projectId: params.projectId,
        predecessorTaskId: params.predecessorTaskId,
        successorTaskId: params.successorTaskId,
        dependencyType: params.dependencyType ?? 'FS',
        lagDays: params.lagDays ?? 0,
      },
      include: {
        predecessorTask: {
          select: { id: true, name: true, status: true },
        },
        successorTask: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    return this.mapDependency(record);
  }

  async delete(tenantId: string, projectId: string, dependencyId: string): Promise<void> {
    await this.prisma.taskDependency.delete({
      where: { id: dependencyId },
    });
  }

  private mapDependency(record: any): TaskDependencyEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      projectId: record.projectId,
      predecessorTaskId: record.predecessorTaskId,
      successorTaskId: record.successorTaskId,
      dependencyType: record.dependencyType as DependencyType,
      lagDays: record.lagDays,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      predecessorTask: record.predecessorTask,
      successorTask: record.successorTask,
    };
  }
}
