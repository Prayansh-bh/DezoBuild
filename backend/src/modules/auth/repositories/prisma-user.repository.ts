import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  IUserRepository,
  UserEntity,
  CreateUserParams,
  TenantUserRecord,
} from "./user.repository.interface";
import { DatabaseService } from "../../../database/database.service";

export class PrismaUserRepository implements IUserRepository {
  private get prisma(): PrismaClient {
    return DatabaseService.getInstance().getClient();
  }

  public async findById(id: string, tx?: Prisma.TransactionClient): Promise<UserEntity | null> {
    const client = tx || this.prisma;
    const user = await client.user.findUnique({
      where: { id },
      include: {
        tenant: true,
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });
    return user ? this.mapToEntity(user) : null;
  }

  public async findByEmail(email: string, tenantId?: string, tx?: Prisma.TransactionClient): Promise<UserEntity | null> {
    const client = tx || this.prisma;
    const normalizedEmail = email.trim().toLowerCase();
    if (tenantId) {
      const user = await client.user.findFirst({
        where: {
          tenantId,
          email: { equals: normalizedEmail, mode: "insensitive" },
        },
        include: {
          tenant: true,
          roleAssignments: {
            include: {
              role: true,
            },
          },
        },
      });
      return user ? this.mapToEntity(user) : null;
    }

    const user = await client.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
      include: {
        tenant: true,
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });
    return user ? this.mapToEntity(user) : null;
  }

  public async create(params: CreateUserParams, tx?: Prisma.TransactionClient): Promise<UserEntity> {
    const client = tx || this.prisma;
    const user = await client.user.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        email: params.email.trim().toLowerCase(),
        phone: params.phone,
        fullName: params.fullName.trim(),
        passwordHash: params.passwordHash,
        status: params.status || "ACTIVE",
        sessionVersion: params.sessionVersion ?? 1,
      },
      include: {
        tenant: true,
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });
    return this.mapToEntity(user);
  }

  public async updateLastLogin(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  public async incrementSessionVersion(id: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || this.prisma;
    const user = await client.user.update({
      where: { id },
      data: { sessionVersion: { increment: 1 } },
    });
    return user.sessionVersion;
  }

  public async updateStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "INVITED", tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.user.update({
      where: { id },
      data: { status },
    });
  }

  public async findTenantUsers(
    tenantId: string,
    limit = 200,
    tx?: Prisma.TransactionClient
  ): Promise<TenantUserRecord[]> {
    const client = tx || this.prisma;
    const records = await client.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        roleAssignments: {
          select: {
            id: true,
            scopeType: true,
            scopeId: true,
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        invitations: {
          where: {
            status: { in: ["PENDING", "EXPIRED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        employee: {
          select: {
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        projectMembers: {
          select: {
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });

    return records as unknown as TenantUserRecord[];
  }

  private mapToEntity(record: any): UserEntity {
    const roles: string[] = Array.isArray(record.roleAssignments)
      ? record.roleAssignments
          .map((ra: any) => ra.role?.name)
          .filter((name: any): name is string => typeof name === "string" && name.length > 0)
      : [];

    return {
      id: record.id,
      tenantId: record.tenantId,
      email: record.email,
      phone: record.phone,
      fullName: record.fullName,
      passwordHash: record.passwordHash,
      status: record.status,
      sessionVersion: record.sessionVersion,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastLoginAt: record.lastLoginAt,
      role: roles[0] || undefined,
      roles: roles.length > 0 ? roles : undefined,
      tenantName: record.tenant?.name || undefined,
      tenantCode: record.tenant?.code || undefined,
      planTier: record.tenant?.planTier || undefined,
    };
  }
}
