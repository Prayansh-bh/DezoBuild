import { PrismaClient, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../database/prisma.client';
import type { CreateApprovalPolicyDto, ListApprovalPoliciesQueryDto } from '../dto/approval-policy.dto';
import type { PrismaTransactionClient } from '../registry/domain-adapter.interface';
import { doBracketsOverlap } from '../helpers/policy-bracket.helper';

export class ApprovalPolicyRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async createDraft(
    tenantId: string,
    createdById: string,
    dto: CreateApprovalPolicyDto,
    previousPolicyId?: string,
    version = 1,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.approvalPolicy.create({
      data: {
        tenantId,
        projectId: dto.projectId ?? null,
        entityType: dto.entityType,
        name: dto.name,
        description: dto.description ?? null,
        minAmount: dto.minAmount != null ? new Prisma.Decimal(dto.minAmount) : null,
        maxAmount: dto.maxAmount != null ? new Prisma.Decimal(dto.maxAmount) : null,
        currency: dto.currency || 'INR',
        status: 'DRAFT',
        version,
        previousPolicyId: previousPolicyId ?? null,
        createdById,
        steps: {
          create: dto.steps.map((s) => ({
            stepOrder: s.stepOrder,
            stepName: s.stepName,
            requiredRoleHint: s.requiredRoleHint ?? null,
            requiredPermission: s.requiredPermission,
            enforceMakerChecker: s.enforceMakerChecker ?? true,
            enforceDistinctFromPrev: s.enforceDistinctFromPrev ?? false,
            timeoutHours: s.timeoutHours ?? null,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async findPolicyById(tenantId: string, id: string, tx?: PrismaTransactionClient) {
    const client = tx ?? this.prisma;
    return client.approvalPolicy.findFirst({
      where: { id, tenantId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        previousPolicy: { select: { id: true, name: true, version: true, status: true } },
      },
    });
  }

  async listPolicies(tenantId: string, query: ListApprovalPoliciesQueryDto) {
    const where: Prisma.ApprovalPolicyWhereInput = {
      tenantId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const [total, items] = await Promise.all([
      this.prisma.approvalPolicy.count({ where }),
      this.prisma.approvalPolicy.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ entityType: 'asc' }, { version: 'desc' }, { createdAt: 'desc' }],
        include: {
          steps: { orderBy: { stepOrder: 'asc' } },
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Finds matching active policies and checks for overlapping brackets.
   */
  async findOverlappingActivePolicies(
    tenantId: string,
    projectId: string | null | undefined,
    entityType: string,
    minAmount: number | Prisma.Decimal | null | undefined,
    maxAmount: number | Prisma.Decimal | null | undefined,
    excludePolicyId?: string,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    const activePolicies = await client.approvalPolicy.findMany({
      where: {
        tenantId,
        projectId: projectId ? projectId : null,
        entityType: entityType as any,
        status: 'ACTIVE',
        ...(excludePolicyId ? { id: { not: excludePolicyId } } : {}),
      },
    });

    const targetBracket = { minAmount, maxAmount };
    return activePolicies.filter((p) =>
      doBracketsOverlap(targetBracket, { minAmount: p.minAmount, maxAmount: p.maxAmount })
    );
  }

  /**
   * Resolves the best matching active approval policy for a submission.
   * Priority:
   * 1. Project-specific matching bracket
   * 2. Tenant-wide matching bracket (projectId is null)
   */
  async resolveActivePolicy(
    tenantId: string,
    projectId: string | null | undefined,
    entityType: string,
    monetaryAmount: number | null | undefined,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    const amt = monetaryAmount != null ? Number(monetaryAmount) : 0;

    // 1. Check project-specific policies
    if (projectId) {
      const projectPolicies = await client.approvalPolicy.findMany({
        where: {
          tenantId,
          projectId,
          entityType: entityType as any,
          status: 'ACTIVE',
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      const matched = projectPolicies.find((p) => {
        const min = p.minAmount != null ? Number(p.minAmount) : 0;
        const max = p.maxAmount != null ? Number(p.maxAmount) : Number.POSITIVE_INFINITY;
        return amt >= min && amt <= max;
      });

      if (matched) return matched;
    }

    // 2. Check tenant-wide default policies
    const tenantPolicies = await client.approvalPolicy.findMany({
      where: {
        tenantId,
        projectId: null,
        entityType: entityType as any,
        status: 'ACTIVE',
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    const matchedTenant = tenantPolicies.find((p) => {
      const min = p.minAmount != null ? Number(p.minAmount) : 0;
      const max = p.maxAmount != null ? Number(p.maxAmount) : Number.POSITIVE_INFINITY;
      return amt >= min && amt <= max;
    });

    return matchedTenant ?? null;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'INACTIVE',
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.approvalPolicy.update({
      where: { id },
      data: { status },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  async countPolicyRequests(tenantId: string, policyId: string, tx?: PrismaTransactionClient): Promise<number> {
    const client = tx ?? this.prisma;
    // Query requests where policySnapshot ->> policyId matches
    const count = await client.approvalRequest.count({
      where: {
        tenantId,
        policySnapshot: {
          path: ['policyId'],
          equals: policyId,
        },
      },
    });
    return count;
  }
}
