import type { PrismaClient } from "@prisma/client";
import type {
  IDepartmentRepository,
  DepartmentEntity,
  CreateDepartmentParams,
  UpdateDepartmentParams,
} from "./department.repository.interface";
import { DatabaseService } from "../../../database/database.service";

export class PrismaDepartmentRepository implements IDepartmentRepository {
  private get prisma(): PrismaClient {
    return DatabaseService.getInstance().getClient();
  }

  public async findById(id: string, tenantId: string): Promise<DepartmentEntity | null> {
    const record = await this.prisma.department.findFirst({
      where: { id, tenantId },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findByCode(code: string, tenantId: string): Promise<DepartmentEntity | null> {
    const record = await this.prisma.department.findFirst({
      where: {
        tenantId,
        code: { equals: code.trim().toUpperCase(), mode: "insensitive" },
      },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findManyByTenant(tenantId: string): Promise<DepartmentEntity[]> {
    const records = await this.prisma.department.findMany({
      where: { tenantId },
      orderBy: { code: "asc" },
    });
    return records.map((r: any) => this.mapToEntity(r));
  }

  public async create(params: CreateDepartmentParams): Promise<DepartmentEntity> {
    const record = await this.prisma.department.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        code: params.code.trim().toUpperCase(),
        name: params.name.trim(),
        description: params.description?.trim() || null,
      },
    });
    return this.mapToEntity(record);
  }

  public async update(
    id: string,
    tenantId: string,
    params: UpdateDepartmentParams,
  ): Promise<DepartmentEntity> {
    const record = await this.prisma.department.update({
      where: {
        id,
        tenantId,
      },
      data: {
        name: params.name?.trim(),
        description: params.description?.trim() || null,
      },
    });
    return this.mapToEntity(record);
  }

  public async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.department.delete({
      where: {
        id,
        tenantId,
      },
    });
  }

  private mapToEntity(record: any): DepartmentEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      code: record.code,
      name: record.name,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
