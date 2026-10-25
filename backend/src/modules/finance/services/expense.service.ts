import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../../common/errors/index.js';
import { FinanceRequestContext } from '../constants/finance.constants.js';
import {
  CreateExpenseCategoryDto,
  CreateExpenseClaimDto,
  ListExpensesQueryDto,
} from '../dto/expense.dto.js';
import { ExpenseRepository } from '../repositories/expense.repository.js';
import { FinanceSequenceRepository } from '../repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../repositories/finance-audit.repository.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export class ExpenseService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly expenseRepo: ExpenseRepository,
    private readonly sequenceRepo: FinanceSequenceRepository,
    private readonly auditRepo: FinanceAuditRepository
  ) {}

  async createCategory(context: FinanceRequestContext, dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findUnique({
      where: {
        tenantId_code: {
          tenantId: context.tenantId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Expense category with code '${dto.code}' already exists`);
    }

    return this.expenseRepo.createCategory(context.tenantId, dto);
  }

  async listCategories(context: FinanceRequestContext) {
    return this.expenseRepo.listCategories(context.tenantId);
  }

  async createClaim(context: FinanceRequestContext, dto: CreateExpenseClaimDto) {
    // 1. Verify Category is active
    const category = await this.expenseRepo.findCategoryById(context.tenantId, dto.categoryId);
    if (!category || !category.isActive) {
      throw new ValidationError('Expense category is invalid or inactive', [
        { name: 'categoryId', reason: 'Category not found or inactive' },
      ]);
    }

    // 2. Verify Project exists in tenant
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId: context.tenantId },
    });
    if (!project) {
      throw new NotFoundError(`Project '${dto.projectId}' not found`);
    }

    // 3. Allocate unique claim number
    const claimNumber = await this.sequenceRepo.getNextSequence(context.tenantId, 'EXP');

    // 4. Create Claim in DRAFT state
    const claim = await this.expenseRepo.createClaim(
      context.tenantId,
      claimNumber,
      context.user.id,
      dto
    );

    // 5. Audit Log
    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'EXPENSE',
      entityId: claim.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: 'DRAFT',
      ipAddress: context.ipAddress,
    });

    return claim;
  }

  async getClaimById(context: FinanceRequestContext, claimId: string) {
    const claim = await this.expenseRepo.findClaimById(context.tenantId, claimId);
    if (!claim) {
      throw new NotFoundError(`Expense claim '${claimId}' not found`);
    }
    return claim;
  }

  async submitClaim(context: FinanceRequestContext, claimId: string) {
    const claim = await this.getClaimById(context, claimId);

    if (claim.status !== 'DRAFT') {
      throw new ConflictError(`Cannot submit expense claim in status '${claim.status}'`);
    }

    const updated = await this.expenseRepo.updateClaimStatus(
      context.tenantId,
      claimId,
      'SUBMITTED'
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'EXPENSE',
      entityId: claimId,
      action: 'SUBMITTED',
      actorId: context.user.id,
      previousState: 'DRAFT',
      newState: 'SUBMITTED',
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async approveClaim(context: FinanceRequestContext, claimId: string, remarks?: string) {
    const claim = await this.getClaimById(context, claimId);

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      context.tenantId,
      'EXPENSE_CLAIM',
      claimId
    );

    if (claim.status !== 'SUBMITTED') {

      throw new ConflictError(`Cannot approve expense claim in status '${claim.status}'`);
    }

    // Segregation of Duties (SoD): Creator cannot approve own claim
    if (claim.submittedById === context.user.id) {
      throw new ConflictError('Segregation of Duties Violation: You cannot approve your own expense claim');
    }

    const updated = await this.expenseRepo.updateClaimStatus(
      context.tenantId,
      claimId,
      'APPROVED',
      context.user.id
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'EXPENSE',
      entityId: claimId,
      action: 'APPROVED',
      actorId: context.user.id,
      previousState: 'SUBMITTED',
      newState: 'APPROVED',
      reason: remarks,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async rejectClaim(context: FinanceRequestContext, claimId: string, rejectionReason: string) {
    const claim = await this.getClaimById(context, claimId);

    if (claim.status !== 'SUBMITTED') {
      throw new ConflictError(`Cannot reject expense claim in status '${claim.status}'`);
    }

    if (claim.submittedById === context.user.id) {
      throw new ConflictError('Segregation of Duties Violation: You cannot reject your own submitted claim (cancel instead)');
    }

    const updated = await this.expenseRepo.updateClaimStatus(
      context.tenantId,
      claimId,
      'REJECTED',
      context.user.id,
      rejectionReason
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'EXPENSE',
      entityId: claimId,
      action: 'REJECTED',
      actorId: context.user.id,
      previousState: 'SUBMITTED',
      newState: 'REJECTED',
      reason: rejectionReason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async listClaims(context: FinanceRequestContext, query: ListExpensesQueryDto, allowedProjectIds?: string[]) {
    return this.expenseRepo.listClaims(context.tenantId, query, allowedProjectIds);
  }
}
