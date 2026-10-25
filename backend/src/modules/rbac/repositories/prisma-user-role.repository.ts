import { PrismaClient, Prisma } from '@prisma/client';
import {
  IUserRoleRepository,
  UserRoleAssignmentEntity,
  AssignRoleParams,
} from './user-role.repository.interface';
import { DatabaseService } from '../../../database/database.service';

export class PrismaUserRoleRepository implements IUserRoleRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  async assignRole(params: AssignRoleParams, tx?: Prisma.TransactionClient): Promise<UserRoleAssignmentEntity> {
    const client = tx || this.prisma;
    const scopeType = params.scopeType ?? 'TENANT';
    const scopeId = params.scopeId ?? null;

    const existing = await client.userRoleAssignment.findFirst({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        roleId: params.roleId,
        scopeType,
        scopeId,
      },
    });

    if (existing) {
      const updated = await client.userRoleAssignment.update({
        where: { id: existing.id },
        data: {
          updatedAt: new Date(),
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
              isSystemRole: true,
            },
          },
        },
      });
      return updated as unknown as UserRoleAssignmentEntity;
    }

    const created = await client.userRoleAssignment.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        roleId: params.roleId,
        scopeType,
        scopeId,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isSystemRole: true,
          },
        },
      },
    });

    return created as unknown as UserRoleAssignmentEntity;
  }

  async removeRole(
    tenantId: string,
    userId: string,
    roleId: string,
    scopeType = 'TENANT',
    scopeId: string | null = null
  ): Promise<boolean> {
    const deleteResult = await this.prisma.userRoleAssignment.deleteMany({
      where: {
        tenantId,
        userId,
        roleId,
        scopeType,
        scopeId,
      },
    });
    return deleteResult.count > 0;
  }

  async findUserRoles(tenantId: string, userId: string): Promise<UserRoleAssignmentEntity[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        tenantId,
        userId,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isSystemRole: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return assignments as unknown as UserRoleAssignmentEntity[];
  }

  async hasRole(tenantId: string, userId: string, roleName: string): Promise<boolean> {
    const count = await this.prisma.userRoleAssignment.count({
      where: {
        tenantId,
        userId,
        role: {
          name: roleName,
        },
      },
    });
    return count > 0;
  }

  async clearUserRoles(tenantId: string, userId: string): Promise<number> {
    const result = await this.prisma.userRoleAssignment.deleteMany({
      where: {
        tenantId,
        userId,
      },
    });
    return result.count;
  }
}
