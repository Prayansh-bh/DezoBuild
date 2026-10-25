import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../../../common/errors/index.js';
import { FinanceRequestContext } from '../constants/finance.constants.js';
import { ProjectCostSummaryDto } from '../dto/project-cost.dto.js';

export class ProjectCostService {
  constructor(private readonly prisma: PrismaClient) {}

  async getProjectCostSummary(context: FinanceRequestContext, projectId: string): Promise<ProjectCostSummaryDto> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: context.tenantId },
    });

    if (!project) {
      throw new NotFoundError(`Project '${projectId}' not found`);
    }

    // 1. Committed Cost: Approved/Issued Purchase Orders
    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId: context.tenantId,
        projectId,
        status: { in: ['APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED'] },
      },
      select: { grandTotal: true },
    });
    let committedCost = new Prisma.Decimal(0);
    for (const po of pos) {
      committedCost = committedCost.add(po.grandTotal);
    }

    // 2. Received Physical Value from GRNs
    const grnLines = await this.prisma.goodsReceiptLine.findMany({
      where: {
        tenantId: context.tenantId,
        grn: {
          projectId,
          status: { in: ['VERIFIED', 'ACCEPTED'] },
        },
      },
      include: {
        purchaseOrderLine: { select: { unitRate: true } },
      },
    });
    let receivedPhysicalValue = new Prisma.Decimal(0);
    for (const line of grnLines) {
      if (line.purchaseOrderLine) {
        const lineVal = line.quantityAccepted.mul(line.purchaseOrderLine.unitRate);
        receivedPhysicalValue = receivedPhysicalValue.add(lineVal);
      }
    }

    // 3. Invoiced Cost: Approved/Paid Vendor Invoices + Approved/Paid RA Bills + Approved/Paid Expense Claims
    const [invoices, raBills, expenses] = await Promise.all([
      this.prisma.vendorInvoice.findMany({
        where: {
          tenantId: context.tenantId,
          projectId,
          status: { in: ['APPROVED', 'PARTIALLY_PAID', 'PAID'] },
        },
        select: { grossTotal: true, paidAmount: true },
      }),
      this.prisma.raBill.findMany({
        where: {
          tenantId: context.tenantId,
          projectId,
          status: { in: ['APPROVED', 'PARTIALLY_PAID', 'PAID'] },
        },
        select: { grossAmount: true, paidAmount: true },
      }),
      this.prisma.expenseClaim.findMany({
        where: {
          tenantId: context.tenantId,
          projectId,
          status: { in: ['APPROVED', 'PAID'] },
        },
        select: { amount: true, taxAmount: true, paidAmount: true },
      }),
    ]);

    let invoicedCost = new Prisma.Decimal(0);
    let paidCost = new Prisma.Decimal(0);

    for (const inv of invoices) {
      invoicedCost = invoicedCost.add(inv.grossTotal);
      paidCost = paidCost.add(inv.paidAmount);
    }

    for (const bill of raBills) {
      invoicedCost = invoicedCost.add(bill.grossAmount);
      paidCost = paidCost.add(bill.paidAmount);
    }

    for (const exp of expenses) {
      const expTotal = exp.amount.add(exp.taxAmount);
      invoicedCost = invoicedCost.add(expTotal);
      paidCost = paidCost.add(exp.paidAmount);
    }

    // 4. Earned Value: Sum of certified Digital MB records * BOQ Unit Rate
    const mbRecords = await this.prisma.digitalMbRecord.findMany({
      where: {
        tenantId: context.tenantId,
        projectId,
        status: 'APPROVED',
      },
      include: {
        boqItem: { select: { unitRate: true } },
      },
    });

    let earnedValue = new Prisma.Decimal(0);
    for (const mb of mbRecords) {
      if (mb.boqItem) {
        const itemVal = mb.currentQuantity.mul(mb.boqItem.unitRate);
        earnedValue = earnedValue.add(itemVal);
      }
    }

    // 5. Advances Outstanding
    const advances = await this.prisma.advanceRecord.findMany({
      where: {
        tenantId: context.tenantId,
        projectId,
        status: { in: ['DISBURSED', 'PARTIALLY_RECOVERED'] },
      },
      select: { outstandingAmount: true },
    });
    let advanceOutstanding = new Prisma.Decimal(0);
    for (const adv of advances) {
      advanceOutstanding = advanceOutstanding.add(adv.outstandingAmount);
    }

    // 6. Retention Held
    const retentions = await this.prisma.retentionRecord.findMany({
      where: {
        tenantId: context.tenantId,
        projectId,
        status: { in: ['HELD', 'PARTIALLY_RELEASED'] },
      },
      select: { balanceAmount: true },
    });
    let retentionHeld = new Prisma.Decimal(0);
    for (const ret of retentions) {
      retentionHeld = retentionHeld.add(ret.balanceAmount);
    }

    const actualCost = invoicedCost;
    const costVariance = earnedValue.sub(actualCost);
    const costPerformanceIndex = actualCost.gt(0)
      ? Number(earnedValue.div(actualCost).toFixed(4))
      : null;

    return {
      projectId: project.id,
      projectName: project.name,
      currency: 'INR',
      contractValue: 0,
      committedCost: Number(committedCost),
      receivedPhysicalValue: Number(receivedPhysicalValue),
      invoicedCost: Number(invoicedCost),
      paidCost: Number(paidCost),
      actualCost: Number(actualCost),
      earnedValue: Number(earnedValue),
      costVariance: Number(costVariance),
      costPerformanceIndex,
      advanceOutstanding: Number(advanceOutstanding),
      retentionHeld: Number(retentionHeld),
    };
  }
}
