import type { PrismaClient } from '@prisma/client';
import type { ReportFilterDto } from '../dto/report.dto.js';
import { NotFoundError } from '../../../common/errors/app-error.js';

export class OperationalReportsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 1. PROJECT OPERATIONAL SUMMARY
   * Authoritative source: Projects, WBS/Tasks, DPR, Digital MB
   */
  public async getProjectSummary(tenantId: string, filter: ReportFilterDto) {
    if (filter.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: filter.projectId, tenantId },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          contractValue: true,
          plannedStartDate: true,
          plannedEndDate: true,
        },
      });

      if (!project) {
        throw new NotFoundError(`Project ${filter.projectId} not found`);
      }

      const [taskCounts, dprCount, approvedMbTotal] = await Promise.all([
        this.prisma.task.groupBy({
          by: ['status'],
          where: { tenantId, projectId: filter.projectId },
          _count: { id: true },
        }),
        this.prisma.dailyProgressReport.count({
          where: { tenantId, projectId: filter.projectId },
        }),
        this.prisma.digitalMbRecord.aggregate({
          where: { tenantId, projectId: filter.projectId, status: 'APPROVED' },
          _sum: { currentQuantity: true, cumulativeQuantity: true },
        }),
      ]);

      const tasksByStatus = taskCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<string, number>);

      return {
        project,
        taskStatistics: {
          total: Object.values(tasksByStatus).reduce((a, b) => a + b, 0),
          byStatus: tasksByStatus,
        },
        dprCount,
        certifiedExecutedQuantity: approvedMbTotal._sum?.cumulativeQuantity ?? '0',
      };
    }

    // Portfolio Summary across all projects in tenant
    const [projects, totalProjects] = await Promise.all([
      this.prisma.project.findMany({
        where: { tenantId },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          contractValue: true,
          plannedStartDate: true,
          plannedEndDate: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where: { tenantId } }),
    ]);

    return {
      totalProjects,
      projects,
    };
  }

  /**
   * 2. BUDGET / ACTUAL FINANCIAL SUMMARY
   * Authoritative source: Finance (Vendor Invoices, RA Bills, Expenses, Payment Vouchers, BOQ)
   */
  public async getBudgetActualSummary(tenantId: string, filter: ReportFilterDto) {
    const whereProject = filter.projectId ? { projectId: filter.projectId } : {};

    const [boqTotal, raBillsTotal, invoicesTotal, expensesTotal, paymentsTotal, retentionTotal] =
      await Promise.all([
        this.prisma.boqItem.aggregate({
          where: { tenantId, ...whereProject, status: 'ACTIVE' },
          _sum: { totalAmount: true },
        }),
        this.prisma.raBill.aggregate({
          where: { tenantId, ...whereProject, status: 'APPROVED' },
          _sum: { netPayable: true, grossAmount: true, totalDeductions: true },
        }),
        this.prisma.vendorInvoice.aggregate({
          where: { tenantId, ...whereProject, status: 'APPROVED' },
          _sum: { grossTotal: true, paidAmount: true },
        }),
        this.prisma.expenseClaim.aggregate({
          where: { tenantId, ...whereProject, status: 'APPROVED' },
          _sum: { amount: true },
        }),
        this.prisma.paymentVoucher.aggregate({
          where: { tenantId, ...whereProject, status: 'PAID' },
          _sum: { totalAmount: true },
        }),
        this.prisma.retentionRecord.aggregate({
          where: { tenantId, ...whereProject },
          _sum: { retainedAmount: true, releasedAmount: true, balanceAmount: true },
        }),
      ]);

    return {
      scope: {
        tenantId,
        projectId: filter.projectId || 'ALL_PROJECTS',
      },
      contractAndBoq: {
        totalBoqBudget: boqTotal._sum?.totalAmount ?? '0',
      },
      certifiedContractorBilling: {
        totalGrossBilled: raBillsTotal._sum?.grossAmount ?? '0',
        totalDeductions: raBillsTotal._sum?.totalDeductions ?? '0',
        totalNetPayable: raBillsTotal._sum?.netPayable ?? '0',
      },
      procurementInvoices: {
        totalInvoiced: invoicesTotal._sum?.grossTotal ?? '0',
        totalPaid: invoicesTotal._sum?.paidAmount ?? '0',
      },
      siteExpenses: {
        totalApprovedExpenses: expensesTotal._sum?.amount ?? '0',
      },
      disbursements: {
        totalDisbursedPayments: paymentsTotal._sum?.totalAmount ?? '0',
      },
      retentions: {
        totalRetained: retentionTotal._sum?.retainedAmount ?? '0',
        totalReleased: retentionTotal._sum?.releasedAmount ?? '0',
        activeRetentionBalance: retentionTotal._sum?.balanceAmount ?? '0',
      },
    };
  }

  /**
   * 3. MATERIAL CONSUMPTION & STOCK STATUS
   * Authoritative source: Materials & Inventory (Stores, Stock Balances, Stock Movements)
   */
  public async getMaterialStockSummary(tenantId: string, filter: ReportFilterDto) {
    const whereStore: any = { tenantId };
    if (filter.storeId) {
      whereStore.id = filter.storeId;
    } else if (filter.projectId) {
      whereStore.projectId = filter.projectId;
    }

    const stores = await this.prisma.store.findMany({
      where: whereStore,
      select: { id: true, code: true, name: true, storeType: true, projectId: true },
    });

    const storeIds = stores.map((s) => s.id);

    const stockBalances = await this.prisma.storeStockBalance.findMany({
      where: {
        tenantId,
        storeId: { in: storeIds },
      },
      include: {
        material: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            primaryUom: true,
            standardRate: true,
            safetyStock: true,
            reorderLevel: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const items = stockBalances.map((b) => {
      const onHand = Number(b.quantityOnHand);
      const reserved = Number(b.reservedQuantity);
      const available = onHand - reserved;
      const threshold = Number(b.material.safetyStock ?? 0);
      const rate = Number(b.material.standardRate ?? 0);

      return {
        materialId: b.material.id,
        itemCode: b.material.itemCode,
        materialName: b.material.name,
        uom: b.material.primaryUom,
        storeName: b.store.name,
        quantityOnHand: onHand,
        quantityReserved: reserved,
        quantityAvailable: available,
        safetyStock: threshold,
        isBelowSafetyStock: threshold > 0 && onHand <= threshold,
        estimatedValuation: onHand * rate,
      };
    });

    return {
      totalStores: stores.length,
      totalTrackedStockItems: items.length,
      lowStockItemsCount: items.filter((i) => i.isBelowSafetyStock).length,
      totalInventoryValuation: items.reduce((sum, i) => sum + i.estimatedValuation, 0),
      items,
    };
  }

  /**
   * 4. MANPOWER & ATTENDANCE SUMMARY
   * Authoritative source: People (Attendance Records, Daily Muster Records)
   */
  public async getManpowerAttendanceSummary(tenantId: string, filter: ReportFilterDto) {
    const targetDate = filter.date ? new Date(filter.date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const whereAttendance: any = {
      tenantId,
      attendanceDate: {
        gte: targetDate,
        lt: nextDate,
      },
    };

    const whereMuster: any = {
      tenantId,
      musterDate: {
        gte: targetDate,
        lt: nextDate,
      },
      status: 'APPROVED',
    };

    if (filter.projectId) {
      whereMuster.projectId = filter.projectId;
    }

    const [attendanceCounts, musterAggregates] = await Promise.all([
      this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: whereAttendance,
        _count: { id: true },
      }),
      this.prisma.labourMusterRecord.aggregate({
        where: whereMuster,
        _sum: {
          skilledCount: true,
          semiSkilledCount: true,
          unskilledCount: true,
          supervisorCount: true,
          totalHeadcount: true,
        },
      }),
    ]);

    const employeeAttendance = attendanceCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      date: targetDate.toISOString().split('T')[0],
      staffAttendance: {
        totalStaffRecorded: Object.values(employeeAttendance).reduce((a, b) => a + b, 0),
        breakdown: employeeAttendance,
      },
      contractorLabourMuster: {
        skilledCount: musterAggregates._sum.skilledCount ?? 0,
        semiSkilledCount: musterAggregates._sum.semiSkilledCount ?? 0,
        unskilledCount: musterAggregates._sum.unskilledCount ?? 0,
        supervisorCount: musterAggregates._sum.supervisorCount ?? 0,
        totalLabourHeadcount: musterAggregates._sum.totalHeadcount ?? 0,
      },
      totalDeployedWorkforce:
        (employeeAttendance['PRESENT'] ?? 0) +
        (musterAggregates._sum.totalHeadcount ?? 0),
    };
  }

  /**
   * 5. EQUIPMENT UTILIZATION SUMMARY
   * Authoritative source: Equipment (Equipment, Operating Logs, Work Orders)
   */
  public async getEquipmentUtilizationSummary(tenantId: string, filter: ReportFilterDto) {
    const whereEq: any = { tenantId };
    if (filter.projectId) {
      whereEq.currentProjectId = filter.projectId;
    }

    const [statusCounts, opLogsTotal, openWorkOrders] = await Promise.all([
      this.prisma.equipment.groupBy({
        by: ['status'],
        where: whereEq,
        _count: { id: true },
      }),
      this.prisma.equipmentOperatingLog.aggregate({
        where: { tenantId },
        _sum: { operatingHours: true, idleHours: true, breakdownHours: true },
      }),
      this.prisma.maintenanceWorkOrder.count({
        where: {
          tenantId,
          status: { in: ['OPEN', 'SCHEDULED', 'IN_PROGRESS'] },
        },
      }),
    ]);

    const byStatus = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEquipment: Object.values(byStatus).reduce((a, b) => a + b, 0),
      statusBreakdown: byStatus,
      cumulativeOperatingHours: opLogsTotal._sum?.operatingHours ?? '0',
      cumulativeBreakdownHours: opLogsTotal._sum?.breakdownHours ?? '0',
      cumulativeIdleHours: opLogsTotal._sum?.idleHours ?? '0',
      openMaintenanceWorkOrders: openWorkOrders,
    };
  }

  /**
   * 6. QUALITY & SAFETY SUMMARY
   * Authoritative source: Quality & Safety (NCRs, Inspections, CAPA Actions, Observations, Incidents)
   */
  public async getQualitySafetySummary(tenantId: string, filter: ReportFilterDto) {
    const whereProject = filter.projectId ? { projectId: filter.projectId } : {};

    const [openNcrs, pendingInspections, openActions, openObservations, criticalIncidents] =
      await Promise.all([
        this.prisma.nonConformanceReport.count({
          where: { tenantId, ...whereProject, status: { in: ['OPEN', 'INVESTIGATION', 'CAPA_PENDING'] } },
        }),
        this.prisma.inspectionRequest.count({
          where: { tenantId, ...whereProject, status: { in: ['DRAFT', 'SUBMITTED', 'SCHEDULED', 'IN_PROGRESS'] } },
        }),
        this.prisma.qualitySafetyAction.count({
          where: { tenantId, ...whereProject, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
        this.prisma.safetyObservation.count({
          where: { tenantId, ...whereProject, status: { in: ['OPEN', 'ACTION_REQUIRED'] } },
        }),
        this.prisma.safetyIncident.count({
          where: { tenantId, ...whereProject, severity: { in: ['MAJOR', 'CRITICAL', 'FATAL'] } },
        }),
      ]);

    return {
      quality: {
        openNcrs,
        pendingInspections,
        openCapaActions: openActions,
      },
      safety: {
        openSafetyObservations: openObservations,
        criticalSafetyIncidents: criticalIncidents,
      },
    };
  }

  /**
   * 7. PENDING RFIS SUMMARY
   * Authoritative source: Documents (Request For Information)
   */
  public async getPendingRfiSummary(tenantId: string, filter: ReportFilterDto) {
    const whereProject = filter.projectId ? { projectId: filter.projectId } : {};

    const [rfiStatusCounts, overdueRfiCount] = await Promise.all([
      this.prisma.requestForInformation.groupBy({
        by: ['status'],
        where: { tenantId, ...whereProject },
        _count: { id: true },
      }),
      this.prisma.requestForInformation.count({
        where: {
          tenantId,
          ...whereProject,
          status: { in: ['OPEN', 'UNDER_REVIEW'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const byStatus = rfiStatusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRfis: Object.values(byStatus).reduce((a, b) => a + b, 0),
      byStatus,
      overdueRfis: overdueRfiCount,
    };
  }

  /**
   * 8. PENDING APPROVALS SUMMARY
   * Authoritative source: Approval Engine (Approval Requests & Steps)
   */
  public async getPendingApprovalsSummary(tenantId: string, filter: ReportFilterDto) {
    const whereProject = filter.projectId ? { projectId: filter.projectId } : {};

    const [pendingRequests, pendingByType] = await Promise.all([
      this.prisma.approvalRequest.count({
        where: {
          tenantId,
          ...whereProject,
          status: { in: ['SUBMITTED', 'IN_REVIEW'] },
        },
      }),
      this.prisma.approvalRequest.groupBy({
        by: ['entityType'],
        where: {
          tenantId,
          ...whereProject,
          status: { in: ['SUBMITTED', 'IN_REVIEW'] },
        },
        _count: { id: true },
      }),
    ]);

    const byEntityType = pendingByType.reduce((acc, curr) => {
      acc[curr.entityType] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPendingApprovalRequests: pendingRequests,
      pendingByEntityType: byEntityType,
    };
  }

  /**
   * 9. ALERTS SUMMARY
   * Authoritative source: Alerts (Alerts)
   */
  public async getAlertsSummary(tenantId: string, filter: ReportFilterDto) {
    const whereProject = filter.projectId ? { projectId: filter.projectId } : {};

    const [byStatus, bySeverity, openCount] = await Promise.all([
      this.prisma.alert.groupBy({
        by: ['status'],
        where: { tenantId, ...whereProject },
        _count: { id: true },
      }),
      this.prisma.alert.groupBy({
        by: ['severity'],
        where: { tenantId, ...whereProject, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        _count: { id: true },
      }),
      this.prisma.alert.count({
        where: { tenantId, ...whereProject, status: 'OPEN' },
      }),
    ]);

    const statusMap = byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    const activeSeverityMap = bySeverity.reduce((acc, curr) => {
      acc[curr.severity] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      openAlerts: openCount,
      statusBreakdown: statusMap,
      activeSeverityBreakdown: activeSeverityMap,
    };
  }
}
