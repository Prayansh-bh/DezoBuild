import type { PrismaClient } from "@prisma/client";
import type {
  IPermissionRepository,
  PermissionEntity,
  CreatePermissionParams,
} from "./permission.repository.interface";
import { DatabaseService } from "../../../database/database.service";

export class PrismaPermissionRepository implements IPermissionRepository {
  constructor(private readonly prismaClient?: PrismaClient) { }

  private get prisma(): PrismaClient {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  public async findById(id: string): Promise<PermissionEntity | null> {
    const record = await this.prisma.permission.findUnique({
      where: { id },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findByName(name: string): Promise<PermissionEntity | null> {
    const record = await this.prisma.permission.findUnique({
      where: { name },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findMany(module?: string): Promise<PermissionEntity[]> {
    const records = await this.prisma.permission.findMany({
      where: module ? { module } : {},
      orderBy: { name: "asc" },
    });
    return records.map((r: any) => this.mapToEntity(r));
  }

  public async createMany(params: CreatePermissionParams[]): Promise<void> {
    await this.prisma.permission.createMany({
      data: params.map((p) => ({
        id: p.id,
        name: p.name.trim(),
        module: p.module.trim(),
        description: p.description?.trim() || null,
      })),
      skipDuplicates: true,
    });
  }

  public async create(params: CreatePermissionParams): Promise<PermissionEntity> {
    const record = await this.prisma.permission.create({
      data: {
        id: params.id,
        name: params.name.trim(),
        module: params.module.trim(),
        description: params.description?.trim() || null,
      },
    });
    return this.mapToEntity(record);
  }

  private mapToEntity(record: any): PermissionEntity {
    return {
      id: record.id,
      name: record.name,
      module: record.module,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
