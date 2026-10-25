import type { PrismaClient } from "@prisma/client";
import type {
  IRoleRepository,
  RoleEntity,
  CreateRoleParams,
} from "./role.repository.interface";
import { DatabaseService } from "../../../database/database.service";

export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prismaClient?: PrismaClient) { }

  private get prisma(): PrismaClient {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  public async findById(id: string, tenantId?: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: {
        id,
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  public async findByName(name: string, tenantId?: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: {
        name,
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  public async findMany(tenantId?: string): Promise<RoleEntity[]> {
    const records = await this.prisma.role.findMany({
      where: tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {},
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return records.map((r: any) => this.mapToEntity(r));
  }

  public async create(params: CreateRoleParams): Promise<RoleEntity> {
    const record = await this.prisma.role.create({
      data: {
        id: params.id,
        tenantId: params.tenantId || null,
        name: params.name.trim().toUpperCase(),
        displayName: params.displayName || params.name,
        description: params.description?.trim() || null,
        isSystemRole: params.isSystemRole ?? true,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return this.mapToEntity(record);
  }

  public async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      await tx.rolePermissionMapping.deleteMany({
        where: { roleId },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermissionMapping.createMany({
          data: permissionIds.map((permId) => ({
            roleId,
            permissionId: permId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  public async getPermissionsForRole(roleId: string): Promise<string[]> {
    const mappings = await this.prisma.rolePermissionMapping.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });

    return mappings.map((m: any) => m.permission.name);
  }

  private mapToEntity(record: any): RoleEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      displayName: record.displayName,
      description: record.description,
      isSystemRole: record.isSystemRole,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      permissions: record.permissions?.map((p: any) => p.permission.name) || [],
    };
  }
}
