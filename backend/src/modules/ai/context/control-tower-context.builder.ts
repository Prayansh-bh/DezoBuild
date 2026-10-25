import type { PrismaClient } from '@prisma/client';

export interface ControlTowerContextData {
  tenantId: string;
  projectId?: string;
  openAlertsCount: number;
  criticalAlertsCount: number;
  pendingApprovalsCount: number;
  openNcrsCount: number;
  safetyIncidentsCount: number;
  overdueRfisCount: number;
  lowStockItemsCount: number;
  breakdownEquipmentCount: number;
  criticalSignals: Array<{ type: string; title: string; severity: string; referenceId?: string }>;
}

export class ControlTowerContextBuilder {
  constructor(private readonly prisma: PrismaClient) {}

  public async build(tenantId: string, projectId?: string): Promise<ControlTowerContextData> {
    const projectFilter = projectId ? { projectId } : {};

    const [
      openAlerts,
      pendingApprovals,
      openNcrs,
      safetyIncidents,
      overdueRfis,
    ] = await Promise.all([
      this.prisma.alert.findMany({
        where: {
          tenantId,
          ...projectFilter,
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
        take: 50,
      }),
      this.prisma.approvalRequest.findMany({
        where: {
          tenantId,
          ...projectFilter,
          status: { in: ['SUBMITTED', 'IN_REVIEW'] },
        },
        take: 50,
      }),
      this.prisma.nonConformanceReport.findMany({
        where: {
          tenantId,
          ...projectFilter,
          status: { in: ['OPEN', 'UNDER_REVIEW'] },
        },
        take: 50,
      }),
      this.prisma.safetyIncident.findMany({
        where: {
          tenantId,
          ...projectFilter,
          severity: 'CRITICAL',
        },
        take: 50,
      }),
      this.prisma.requestForInformation.findMany({
        where: {
          tenantId,
          ...projectFilter,
          status: 'OPEN',
        },
        take: 50,
      }),
    ]);

    const criticalAlerts = openAlerts.filter((a) => a.severity === 'CRITICAL');
    const criticalSignals: Array<{ type: string; title: string; severity: string; referenceId?: string }> = [];

    for (const a of criticalAlerts) {
      criticalSignals.push({
        type: 'CRITICAL_ALERT',
        title: a.title,
        severity: 'CRITICAL',
        referenceId: a.id,
      });
    }

    for (const s of safetyIncidents) {
      criticalSignals.push({
        type: 'SAFETY_INCIDENT',
        title: `Critical Safety Incident: ${s.incidentNumber}`,
        severity: 'CRITICAL',
        referenceId: s.id,
      });
    }

    for (const n of openNcrs) {
      if (n.severity === 'MAJOR' || n.severity === 'CRITICAL') {
        criticalSignals.push({
          type: 'QUALITY_NCR',
          title: `Major NCR: ${n.ncrNumber}`,
          severity: 'HIGH',
          referenceId: n.id,
        });
      }
    }

    return {
      tenantId,
      projectId,
      openAlertsCount: openAlerts.length,
      criticalAlertsCount: criticalAlerts.length,
      pendingApprovalsCount: pendingApprovals.length,
      openNcrsCount: openNcrs.length,
      safetyIncidentsCount: safetyIncidents.length,
      overdueRfisCount: overdueRfis.length,
      lowStockItemsCount: openAlerts.filter((a) => a.alertType === 'MATERIAL_LOW_STOCK').length,
      breakdownEquipmentCount: openAlerts.filter((a) => a.alertType === 'EQUIPMENT_BREAKDOWN').length,
      criticalSignals,
    };
  }
}
