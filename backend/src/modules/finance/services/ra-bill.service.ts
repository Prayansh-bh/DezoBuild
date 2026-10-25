import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../../common/errors/index.js';
import { FinanceRequestContext } from '../constants/finance.constants.js';
import {
  CreateRaBillDto,
  VerifyRaBillDto,
  ApproveRaBillDto,
  ListRaBillsQueryDto,
} from '../dto/ra-bill.dto.js';
import { RaBillRepository } from '../repositories/ra-bill.repository.js';
import { AdvanceRepository } from '../repositories/advance.repository.js';
import { RetentionRepository } from '../repositories/retention.repository.js';
import { FinanceSequenceRepository } from '../repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../repositories/finance-audit.repository.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export class RaBillService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly raBillRepo: RaBillRepository,
    private readonly advanceRepo: AdvanceRepository,
    private readonly retentionRepo: RetentionRepository,
    private readonly sequenceRepo: FinanceSequenceRepository,
    private readonly auditRepo: FinanceAuditRepository
  ) {}

  async createRaBill(context: FinanceRequestContext, dto: CreateRaBillDto) {
    // 1. Concurrency Check: Verify no active unapproved bill exists for this vendor on this project
    const activeBill = await this.raBillRepo.findActiveUnapprovedBill(
      context.tenantId,
      dto.projectId,
      dto.vendorId
    );
    if (activeBill) {
      throw new ConflictError(
        `Active unapproved RA bill '${activeBill.billNumber}' (status: ${activeBill.status}) already exists for this contractor on this project. Approve or cancel it first.`
      );
    }

    // 2. Validate Project and Vendor
    const [project, vendor] = await Promise.all([
      this.prisma.project.findFirst({ where: { id: dto.projectId, tenantId: context.tenantId } }),
      this.prisma.vendor.findFirst({ where: { id: dto.vendorId, tenantId: context.tenantId } }),
    ]);
    if (!project) throw new NotFoundError(`Project '${dto.projectId}' not found`);
    if (!vendor) throw new NotFoundError(`Vendor/Contractor '${dto.vendorId}' not found`);

    // 3. Validate Digital MB Measurement Allocations & BOQ Items
    let grossAmount = new Prisma.Decimal(0);

    for (const item of dto.items) {
      const boqItem = await this.prisma.boqItem.findFirst({
        where: { id: item.boqItemId, tenantId: context.tenantId, projectId: dto.projectId },
      });
      if (!boqItem) {
        throw new NotFoundError(`BOQ item '${item.boqItemId}' not found on project '${dto.projectId}'`);
      }

      let itemAllocatedQty = new Prisma.Decimal(0);

      for (const alloc of item.measurementAllocations) {
        const mbRecord = await this.prisma.digitalMbRecord.findFirst({
          where: {
            id: alloc.digitalMbRecordId,
            tenantId: context.tenantId,
            projectId: dto.projectId,
            boqItemId: item.boqItemId,
          },
        });

        if (!mbRecord) {
          throw new NotFoundError(
            `Digital MB record '${alloc.digitalMbRecordId}' not found for BOQ item '${item.boqItemId}'`
          );
        }

        if (mbRecord.status !== 'APPROVED') {
          throw new ConflictError(
            `Digital MB record '${mbRecord.mbNumber}' is not APPROVED (status: ${mbRecord.status})`
          );
        }

        const previouslyAllocated = await this.raBillRepo.getDigitalMbAllocatedQuantity(
          context.tenantId,
          alloc.digitalMbRecordId
        );

        const availableMbQty = mbRecord.currentQuantity.sub(previouslyAllocated);
        const reqQty = new Prisma.Decimal(alloc.allocatedQuantity);

        if (reqQty.gt(availableMbQty)) {
          throw new ConflictError(
            `Digital MB record '${mbRecord.mbNumber}' over-allocated: Requested ${reqQty}, Available ${availableMbQty}`
          );
        }

        itemAllocatedQty = itemAllocatedQty.add(reqQty);
      }

      // Verify item current bill quantity matches sum of allocations
      const itemBillQty = new Prisma.Decimal(item.currentBillQuantity);
      if (!itemBillQty.equals(itemAllocatedQty)) {
        throw new ValidationError(
          `Item '${item.description}' bill quantity (${itemBillQty}) does not match total measurement allocations (${itemAllocatedQty})`
        );
      }

      const itemGross = itemBillQty.mul(new Prisma.Decimal(item.unitRate));
      grossAmount = grossAmount.add(itemGross);
    }

    // 4. Calculate Deductions
    let totalDeductions = new Prisma.Decimal(0);
    let advanceRecoveryAmount = new Prisma.Decimal(0);

    if (dto.deductions && dto.deductions.length > 0) {
      for (const ded of dto.deductions) {
        const dedAmount = new Prisma.Decimal(ded.amount);
        totalDeductions = totalDeductions.add(dedAmount);
        if (ded.deductionType === 'MOBILIZATION_ADVANCE_RECOVERY') {
          advanceRecoveryAmount = advanceRecoveryAmount.add(dedAmount);
        }
      }
    }

    if (totalDeductions.gt(grossAmount)) {
      throw new ValidationError(
        `Total deductions (${totalDeductions}) cannot exceed gross bill amount (${grossAmount})`
      );
    }

    const netPayable = grossAmount.sub(totalDeductions);

    // 5. Check advance balance if mobilization recovery is present
    if (advanceRecoveryAmount.gt(0)) {
      if (!dto.advanceRecordId) {
        throw new ValidationError('advanceRecordId is required when MOBILIZATION_ADVANCE_RECOVERY deduction is present');
      }
      const advance = await this.advanceRepo.findAdvanceById(context.tenantId, dto.advanceRecordId);
      if (!advance) {
        throw new NotFoundError(`Advance record '${dto.advanceRecordId}' not found`);
      }
      if (advance.outstandingAmount.lt(advanceRecoveryAmount)) {
        throw new ValidationError(
          `Advance recovery (${advanceRecoveryAmount}) exceeds available advance balance (${advance.outstandingAmount})`
        );
      }
    }

    // 6. Allocate bill sequence and bill number
    const latestSeq = await this.raBillRepo.getLatestBillSequence(context.tenantId, dto.projectId, dto.vendorId);
    const billSequence = latestSeq + 1;
    const billNumber = await this.sequenceRepo.getNextSequence(context.tenantId, 'RAB');

    // 7. Create RA Bill
    const bill = await this.raBillRepo.createRaBill(
      context.tenantId,
      billNumber,
      billSequence,
      context.user.id,
      dto,
      {
        grossAmount,
        totalDeductions,
        netPayable,
        outstandingBalance: netPayable,
      }
    );

    // 8. Audit Log
    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'RA_BILL',
      entityId: bill.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: 'DRAFT',
      ipAddress: context.ipAddress,
    });

    return bill;
  }

  async getRaBillById(context: FinanceRequestContext, raBillId: string) {
    const bill = await this.raBillRepo.findRaBillById(context.tenantId, raBillId);
    if (!bill) {
      throw new NotFoundError(`Contractor RA bill '${raBillId}' not found`);
    }
    return bill;
  }

  async verifyRaBill(context: FinanceRequestContext, raBillId: string, dto: VerifyRaBillDto) {
    const bill = await this.getRaBillById(context, raBillId);

    if (bill.status !== 'DRAFT' && bill.status !== 'SUBMITTED') {
      throw new ConflictError(`Cannot verify RA bill in status '${bill.status}'`);
    }

    const updated = await this.raBillRepo.updateRaBillStatus(
      context.tenantId,
      raBillId,
      'VERIFIED',
      context.user.id
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'RA_BILL',
      entityId: raBillId,
      action: 'VERIFIED',
      actorId: context.user.id,
      previousState: bill.status,
      newState: 'VERIFIED',
      reason: dto.verificationRemarks,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async approveRaBill(context: FinanceRequestContext, raBillId: string, dto: ApproveRaBillDto) {
    const bill = await this.getRaBillById(context, raBillId);

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      context.tenantId,
      'RA_BILL',
      raBillId
    );

    if (bill.status !== 'VERIFIED') {

      throw new ConflictError(`Cannot approve RA bill in status '${bill.status}'. Bill must be VERIFIED first.`);
    }

    // Segregation of Duties: Preparer cannot approve RA Bill
    if (bill.createdById === context.user.id) {
      throw new ConflictError('Segregation of Duties Violation: You cannot approve an RA bill you created');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Process Retention if RETENTION deduction is present
      const retentionDed = bill.deductions.find((d) => d.deductionType === 'RETENTION');
      if (retentionDed && retentionDed.amount.gt(0)) {
        await this.retentionRepo.createRetentionRecord(
          context.tenantId,
          bill.projectId,
          bill.vendorId,
          retentionDed.amount,
          { raBillId },
          tx
        );
      }

      // 2. Process Mobilization Advance Recovery if present
      const advanceDed = bill.deductions.find((d) => d.deductionType === 'MOBILIZATION_ADVANCE_RECOVERY');
      if (advanceDed && advanceDed.amount.gt(0)) {
        const advance = await tx.advanceRecord.findFirst({
          where: { tenantId: context.tenantId, vendorId: bill.vendorId, status: { not: 'FULLY_RECOVERED' } },
        });

        if (advance) {
          await this.advanceRepo.createRecoveryAllocation(
            context.tenantId,
            advance.id,
            context.user.id,
            advanceDed.amount,
            { raBillId },
            tx
          );
        }
      }

      // 3. Update status to APPROVED
      const updated = await this.raBillRepo.updateRaBillStatus(
        context.tenantId,
        raBillId,
        'APPROVED',
        undefined,
        context.user.id,
        tx
      );

      // 4. Audit Log
      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          entityType: 'RA_BILL',
          entityId: raBillId,
          action: 'APPROVED',
          actorId: context.user.id,
          previousState: 'VERIFIED',
          newState: 'APPROVED',
          reason: dto.approvalRemarks,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async listRaBills(context: FinanceRequestContext, query: ListRaBillsQueryDto, allowedProjectIds?: string[]) {
    return this.raBillRepo.listRaBills(context.tenantId, query, allowedProjectIds);
  }
}
