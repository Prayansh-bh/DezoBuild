import type { PrismaClient } from '@prisma/client';
import { ControlTowerContextBuilder } from '../context/control-tower-context.builder.js';
import { AISafetyService } from '../security/ai-safety.service.js';
import type { QueryControlTowerDto } from '../dto/ai.dto.js';

export class ControlTowerService {
  private readonly contextBuilder: ControlTowerContextBuilder;

  constructor(private readonly prisma: PrismaClient) {
    this.contextBuilder = new ControlTowerContextBuilder(this.prisma);
  }

  public async getControlTowerSummary(
    tenantId: string,
    query: QueryControlTowerDto,
    userProjectIds?: string[] | null
  ) {
    if (query.projectId) {
      AISafetyService.assertProjectAccess(query.projectId, userProjectIds);
    }

    const data = await this.contextBuilder.build(tenantId, query.projectId);

    // Calculate overall health score (0-100)
    let healthScore = 100;
    healthScore -= data.criticalAlertsCount * 15;
    healthScore -= data.safetyIncidentsCount * 25;
    healthScore -= data.openNcrsCount * 5;
    healthScore -= data.overdueRfisCount * 2;
    healthScore -= data.lowStockItemsCount * 5;
    healthScore -= data.breakdownEquipmentCount * 10;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const status =
      healthScore >= 80 ? 'HEALTHY' : healthScore >= 50 ? 'ATTENTION_REQUIRED' : 'CRITICAL_RISK';

    const rankedSignals = data.criticalSignals.sort((a, b) => {
      const rank = (s: string) => (s === 'CRITICAL' ? 3 : s === 'HIGH' ? 2 : 1);
      return rank(b.severity) - rank(a.severity);
    });

    return {
      tenantId,
      projectId: query.projectId,
      asOfDate: query.asOfDate || new Date().toISOString().split('T')[0],
      healthScore,
      status,
      metrics: {
        openAlerts: data.openAlertsCount,
        criticalAlerts: data.criticalAlertsCount,
        pendingApprovals: data.pendingApprovalsCount,
        openNcrs: data.openNcrsCount,
        criticalSafetyIncidents: data.safetyIncidentsCount,
        overdueRfis: data.overdueRfisCount,
        lowStockItems: data.lowStockItemsCount,
        breakdownEquipment: data.breakdownEquipmentCount,
      },
      rankedSignals,
      executiveSummary:
        status === 'HEALTHY'
          ? 'Operations across projects are proceeding normally with minimal variance.'
          : `Operational friction detected: ${data.criticalAlertsCount} critical alerts, ${data.safetyIncidentsCount} safety incidents, and ${data.pendingApprovalsCount} pending approval bottlenecks requiring immediate managerial intervention.`,
    };
  }
}
