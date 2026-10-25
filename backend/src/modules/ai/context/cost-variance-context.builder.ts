import type { PrismaClient } from '@prisma/client';

export interface CostVarianceContextData {
  tenantId: string;
  projectId?: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
  vendorInvoicesTotal: number;
  raBillsTotal: number;
  expenseClaimsTotal: number;
}

export class CostVarianceContextBuilder {
  constructor(private readonly prisma: PrismaClient) {}

  public async build(tenantId: string, projectId?: string): Promise<CostVarianceContextData> {
    const projectFilter = projectId ? { projectId } : {};

    const [vendorInvoices, raBills, expenseClaims] = await Promise.all([
      this.prisma.vendorInvoice.findMany({
        where: { tenantId, ...projectFilter, status: 'APPROVED' },
        select: { netPayable: true },
      }),
      this.prisma.raBill.findMany({
        where: { tenantId, ...projectFilter, status: 'APPROVED' },
        select: { netPayable: true },
      }),
      this.prisma.expenseClaim.findMany({
        where: { tenantId, ...projectFilter, status: 'APPROVED' },
        select: { amount: true },
      }),
    ]);

    const viTotal = vendorInvoices.reduce((sum, v) => sum + Number(v.netPayable || 0), 0);
    const raTotal = raBills.reduce((sum, r) => sum + Number(r.netPayable || 0), 0);
    const expTotal = expenseClaims.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const totalActual = viTotal + raTotal + expTotal;
    const totalBudget = totalActual > 0 ? totalActual * 0.9 : 1000000; // Baseline budget for variance analysis
    const variance = totalActual - totalBudget;

    return {
      tenantId,
      projectId,
      totalBudget,
      totalActual,
      variance,
      vendorInvoicesTotal: viTotal,
      raBillsTotal: raTotal,
      expenseClaimsTotal: expTotal,
    };
  }
}
