import { PrismaClient } from '@prisma/client';
import { CANONICAL_PERMISSIONS } from '../constants/permissions.catalog';
import { ROLE_PERMISSION_MATRIX, ROLE_DEFINITIONS } from '../constants/role-permission.matrix';

export class RbacSeederService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Seeds permissions catalog, system roles, and role-permission mappings idempotently.
   */
  async seedAll(): Promise<{ permissionsCount: number; rolesCount: number; mappingsCount: number }> {
    const permissionsCount = await this.seedPermissions();
    const rolesCount = await this.seedSystemRoles();
    const mappingsCount = await this.seedRolePermissionMappings();

    return { permissionsCount, rolesCount, mappingsCount };
  }

  /**
   * Seeds all permissions from the canonical catalog.
   */
  async seedPermissions(): Promise<number> {
    let count = 0;
    for (const perm of CANONICAL_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { name: perm.name },
        update: {
          module: perm.module,
          description: perm.description,
        },
        create: {
          name: perm.name,
          module: perm.module,
          description: perm.description,
        },
      });
      count++;
    }
    return count;
  }

  /**
   * Seeds system-defined roles.
   */
  async seedSystemRoles(): Promise<number> {
    let count = 0;
    for (const roleDef of ROLE_DEFINITIONS) {
      const existing = await this.prisma.role.findFirst({
        where: {
          tenantId: null,
          name: roleDef.name,
        },
      });

      if (existing) {
        await this.prisma.role.update({
          where: { id: existing.id },
          data: {
            displayName: roleDef.displayName,
            description: roleDef.description,
            isSystemRole: true,
          },
        });
      } else {
        await this.prisma.role.create({
          data: {
            tenantId: null,
            name: roleDef.name,
            displayName: roleDef.displayName,
            description: roleDef.description,
            isSystemRole: true,
          },
        });
      }
      count++;
    }
    return count;
  }

  /**
   * Seeds role-to-permission mappings according to the matrix.
   */
  async seedRolePermissionMappings(): Promise<number> {
    let count = 0;
    const allPermissions = await this.prisma.permission.findMany();
    const permMap = new Map<string, string>();
    allPermissions.forEach((p: { name: string; id: string }) => permMap.set(p.name, p.id));

    const systemRoles = await this.prisma.role.findMany({
      where: { tenantId: null, isSystemRole: true },
    });

    for (const role of systemRoles) {
      const allowedPermissions = (ROLE_PERMISSION_MATRIX as Record<string, readonly string[]>)[role.name] || [];
      for (const permName of allowedPermissions) {
        const permId = permMap.get(permName);
        if (permId) {
          await this.prisma.rolePermissionMapping.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permId,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permId,
            },
          });
          count++;
        }
      }
    }

    return count;
  }
}
