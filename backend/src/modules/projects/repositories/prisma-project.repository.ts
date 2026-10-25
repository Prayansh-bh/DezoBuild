import type { PrismaClient } from '@prisma/client';
import type {
  IProjectRepository,
  ProjectEntity,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectFilterParams,
  ProjectMemberSummary,
} from './project.repository.interface';
import type { ProjectStatus } from '../constants/project.constants';
import { DatabaseService } from '../../../database/database.service';

export class PrismaProjectRepository implements IProjectRepository {
  private readonly prismaClient?: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get prisma(): any {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  public async findById(tenantId: string, projectId: string): Promise<ProjectEntity | null> {
    const record = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            stores: true,
          },
        },
      },
    });

    return record ? this.mapProject(record) : null;
  }

  public async findByCode(tenantId: string, code: string): Promise<ProjectEntity | null> {
    const record = await this.prisma.project.findFirst({
      where: {
        tenantId,
        code: { equals: code.trim().toUpperCase(), mode: 'insensitive' },
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return record ? this.mapProject(record) : null;
  }

  public async findMany(tenantId: string, filters?: ProjectFilterParams): Promise<ProjectEntity[]> {
    const where: any = {
      tenantId,
      ...(filters?.companyId ? { companyId: filters.companyId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { code: { contains: filters.search, mode: 'insensitive' } },
              { name: { contains: filters.search, mode: 'insensitive' } },
              { city: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const records = await this.prisma.project.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            stores: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    });

    return records.map((r: any) => this.mapProject(r));
  }

  public async findUserAccessibleProjects(
    tenantId: string,
    userId: string,
    filters?: ProjectFilterParams
  ): Promise<ProjectEntity[]> {
    const where: any = {
      tenantId,
      members: {
        some: {
          userId,
        },
      },
      ...(filters?.companyId ? { companyId: filters.companyId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { code: { contains: filters.search, mode: 'insensitive' } },
              { name: { contains: filters.search, mode: 'insensitive' } },
              { city: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const records = await this.prisma.project.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            stores: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    });

    return records.map((r: any) => this.mapProject(r));
  }

  public async create(params: CreateProjectParams): Promise<ProjectEntity> {
    const record = await this.prisma.project.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        companyId: params.companyId,
        code: params.code.trim().toUpperCase(),
        name: params.name.trim(),
        description: params.description ?? null,
        projectType: params.projectType ?? null,
        location: params.location ?? null,
        address: params.address ?? null,
        city: params.city ?? null,
        state: params.state ?? null,
        pincode: params.pincode ?? null,
        status: params.status ?? 'PLANNING',
        plannedStartDate: params.plannedStartDate ?? null,
        plannedEndDate: params.plannedEndDate ?? null,
        actualStartDate: params.actualStartDate ?? null,
        actualEndDate: params.actualEndDate ?? null,
        estimatedBudget: params.estimatedBudget ?? null,
        contractValue: params.contractValue ?? null,
        currency: params.currency ?? 'INR',
        siteAreaSqft: params.siteAreaSqft ?? null,
        builtUpAreaSqft: params.builtUpAreaSqft ?? null,
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return this.mapProject(record);
  }

  public async update(
    tenantId: string,
    projectId: string,
    params: UpdateProjectParams
  ): Promise<ProjectEntity> {
    const data: any = {};
    if (params.name !== undefined) data.name = params.name.trim();
    if (params.description !== undefined) data.description = params.description;
    if (params.projectType !== undefined) data.projectType = params.projectType;
    if (params.location !== undefined) data.location = params.location;
    if (params.address !== undefined) data.address = params.address;
    if (params.city !== undefined) data.city = params.city;
    if (params.state !== undefined) data.state = params.state;
    if (params.pincode !== undefined) data.pincode = params.pincode;
    if (params.plannedStartDate !== undefined) data.plannedStartDate = params.plannedStartDate;
    if (params.plannedEndDate !== undefined) data.plannedEndDate = params.plannedEndDate;
    if (params.actualStartDate !== undefined) data.actualStartDate = params.actualStartDate;
    if (params.actualEndDate !== undefined) data.actualEndDate = params.actualEndDate;
    if (params.estimatedBudget !== undefined) data.estimatedBudget = params.estimatedBudget;
    if (params.contractValue !== undefined) data.contractValue = params.contractValue;
    if (params.currency !== undefined) data.currency = params.currency;
    if (params.siteAreaSqft !== undefined) data.siteAreaSqft = params.siteAreaSqft;
    if (params.builtUpAreaSqft !== undefined) data.builtUpAreaSqft = params.builtUpAreaSqft;

    const record = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return this.mapProject(record);
  }

  public async updateStatus(
    tenantId: string,
    projectId: string,
    status: ProjectStatus,
    extraUpdates?: Partial<{ actualStartDate: Date | null; actualEndDate: Date | null }>
  ): Promise<ProjectEntity> {
    const data: any = {
      status,
      updatedAt: new Date(),
    };

    if (extraUpdates?.actualStartDate !== undefined) {
      data.actualStartDate = extraUpdates.actualStartDate;
    }
    if (extraUpdates?.actualEndDate !== undefined) {
      data.actualEndDate = extraUpdates.actualEndDate;
    }

    const record = await this.prisma.project.update({
      where: { id: projectId },
      data,
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return this.mapProject(record);
  }

  public async countActive(tenantId: string): Promise<number> {
    return this.prisma.project.count({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });
  }

  public async countByTenant(tenantId: string, filters?: ProjectFilterParams): Promise<number> {
    const where: any = {
      tenantId,
      ...(filters?.companyId ? { companyId: filters.companyId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { code: { contains: filters.search, mode: 'insensitive' } },
              { name: { contains: filters.search, mode: 'insensitive' } },
              { city: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.project.count({ where });
  }

  private mapProject(record: any): ProjectEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      description: record.description ?? null,
      projectType: record.projectType ?? null,
      location: record.location ?? null,
      address: record.address ?? null,
      city: record.city ?? null,
      state: record.state ?? null,
      pincode: record.pincode ?? null,
      status: record.status as ProjectStatus,
      plannedStartDate: record.plannedStartDate ?? null,
      plannedEndDate: record.plannedEndDate ?? null,
      actualStartDate: record.actualStartDate ?? null,
      actualEndDate: record.actualEndDate ?? null,
      estimatedBudget: record.estimatedBudget ? Number(record.estimatedBudget) : null,
      contractValue: record.contractValue ? Number(record.contractValue) : null,
      currency: record.currency ?? 'INR',
      siteAreaSqft: record.siteAreaSqft ? Number(record.siteAreaSqft) : null,
      builtUpAreaSqft: record.builtUpAreaSqft ? Number(record.builtUpAreaSqft) : null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      company: record.company,
      members: record.members
        ? record.members.map((m: any): ProjectMemberSummary => ({
            id: m.id,
            userId: m.userId,
            projectRole: m.projectRole,
            isLead: m.isLead,
            joinedAt: m.joinedAt,
            user: m.user,
          }))
        : undefined,
      _count: record._count,
    };
  }
}
