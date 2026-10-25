import { PrismaClient } from '@prisma/client';
import {
  IStoreAccessRepository,
  StoreAccessAssignmentEntity,
  GrantStoreAccessParams,
} from './store-access.repository.interface';
import { DatabaseService } from '../../../database/database.service';

export class PrismaStoreAccessRepository implements IStoreAccessRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  async grantAccess(params: GrantStoreAccessParams): Promise<StoreAccessAssignmentEntity> {
    const assignment = await this.prisma.storeAccessAssignment.upsert({
      where: {
        storeId_userId: {
          storeId: params.storeId,
          userId: params.userId,
        },
      },
      update: {
        accessLevel: params.accessLevel ?? 'FULL',
        updatedAt: new Date(),
      },
      create: {
        tenantId: params.tenantId,
        storeId: params.storeId,
        userId: params.userId,
        accessLevel: params.accessLevel ?? 'FULL',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            isCentralWarehouse: true,
            projectId: true,
          },
        },
      },
    });

    return assignment as unknown as StoreAccessAssignmentEntity;
  }

  async revokeAccess(tenantId: string, storeId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.storeAccessAssignment.deleteMany({
      where: {
        tenantId,
        storeId,
        userId,
      },
    });
    return result.count > 0;
  }

  async findAccess(tenantId: string, storeId: string, userId: string): Promise<StoreAccessAssignmentEntity | null> {
    const assignment = await this.prisma.storeAccessAssignment.findFirst({
      where: {
        tenantId,
        storeId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            isCentralWarehouse: true,
            projectId: true,
          },
        },
      },
    });

    return assignment as unknown as (StoreAccessAssignmentEntity | null);
  }

  async findUserStores(tenantId: string, userId: string): Promise<StoreAccessAssignmentEntity[]> {
    const assignments = await this.prisma.storeAccessAssignment.findMany({
      where: {
        tenantId,
        userId,
      },
      include: {
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            isCentralWarehouse: true,
            projectId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return assignments as unknown as StoreAccessAssignmentEntity[];
  }

  async findStoreUsers(tenantId: string, storeId: string): Promise<StoreAccessAssignmentEntity[]> {
    const assignments = await this.prisma.storeAccessAssignment.findMany({
      where: {
        tenantId,
        storeId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return assignments as unknown as StoreAccessAssignmentEntity[];
  }

  async hasStoreAccess(tenantId: string, storeId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.storeAccessAssignment.count({
      where: {
        tenantId,
        storeId,
        userId,
      },
    });
    return count > 0;
  }
}
