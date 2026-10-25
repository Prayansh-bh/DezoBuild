import { PrismaClient } from '@prisma/client';
import {
  IProjectMemberRepository,
  ProjectMemberEntity,
  AddProjectMemberParams,
} from './project-member.repository.interface';
import { DatabaseService } from '../../../database/database.service';

export class PrismaProjectMemberRepository implements IProjectMemberRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  async addMember(params: AddProjectMemberParams): Promise<ProjectMemberEntity> {
    const member = await this.prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: params.projectId,
          userId: params.userId,
        },
      },
      update: {
        projectRole: params.projectRole ?? 'MEMBER',
        isLead: params.isLead ?? false,
      },
      create: {
        tenantId: params.tenantId,
        projectId: params.projectId,
        userId: params.userId,
        projectRole: params.projectRole ?? 'MEMBER',
        isLead: params.isLead ?? false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return member as unknown as ProjectMemberEntity;
  }

  async removeMember(tenantId: string, projectId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.projectMember.deleteMany({
      where: {
        tenantId,
        projectId,
        userId,
      },
    });
    return result.count > 0;
  }

  async findMember(tenantId: string, projectId: string, userId: string): Promise<ProjectMemberEntity | null> {
    const member = await this.prisma.projectMember.findFirst({
      where: {
        tenantId,
        projectId,
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
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return member as unknown as (ProjectMemberEntity | null);
  }

  async findUserProjects(tenantId: string, userId: string): Promise<ProjectMemberEntity[]> {
    const members = await this.prisma.projectMember.findMany({
      where: {
        tenantId,
        userId,
      },
      include: {
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return members as unknown as ProjectMemberEntity[];
  }

  async findProjectMembers(tenantId: string, projectId: string): Promise<ProjectMemberEntity[]> {
    const members = await this.prisma.projectMember.findMany({
      where: {
        tenantId,
        projectId,
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
        joinedAt: 'asc',
      },
    });

    return members as unknown as ProjectMemberEntity[];
  }

  async isUserProjectMember(tenantId: string, projectId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.projectMember.count({
      where: {
        tenantId,
        projectId,
        userId,
      },
    });
    return count > 0;
  }
}
