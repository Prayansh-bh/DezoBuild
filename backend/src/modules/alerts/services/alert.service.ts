import type { AlertRepository } from '../repositories/alert.repository.js';
import type {
  CreateAlertDto,
  QueryAlertsDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  DismissAlertDto,
} from '../dto/alert.dto.js';
import { NotFoundError, ForbiddenError } from '../../../common/errors/app-error.js';

export class AlertService {
  constructor(private readonly alertRepo: AlertRepository) {}

  public async createAlert(dto: CreateAlertDto) {
    return this.alertRepo.create(dto);
  }

  public async getAlertById(
    tenantId: string,
    alertId: string,
    userProjectIds?: string[] | null
  ) {
    const alert = await this.alertRepo.findById(tenantId, alertId);
    if (!alert) {
      throw new NotFoundError(`Alert ${alertId} not found in tenant`);
    }

    // Project-scoping check
    if (
      userProjectIds &&
      alert.projectId &&
      !userProjectIds.includes(alert.projectId)
    ) {
      throw new ForbiddenError(
        `User does not have access to project ${alert.projectId}`
      );
    }

    return alert;
  }

  public async listAlerts(
    tenantId: string,
    query: QueryAlertsDto,
    userProjectIds?: string[] | null
  ) {
    if (userProjectIds && query.projectId && !userProjectIds.includes(query.projectId)) {
      throw new ForbiddenError(
        `User does not have access to project ${query.projectId}`
      );
    }

    return this.alertRepo.findMany(tenantId, query);
  }

  public async acknowledgeAlert(
    tenantId: string,
    alertId: string,
    userId: string,
    dto: AcknowledgeAlertDto,
    userProjectIds?: string[] | null
  ) {
    const alert = await this.getAlertById(tenantId, alertId, userProjectIds);
    return this.alertRepo.acknowledge(tenantId, alert.id, userId, dto.note);
  }

  public async resolveAlert(
    tenantId: string,
    alertId: string,
    userId: string,
    dto: ResolveAlertDto,
    userProjectIds?: string[] | null
  ) {
    const alert = await this.getAlertById(tenantId, alertId, userProjectIds);
    return this.alertRepo.resolve(tenantId, alert.id, userId, dto.resolutionNote);
  }

  public async dismissAlert(
    tenantId: string,
    alertId: string,
    dto: DismissAlertDto,
    userProjectIds?: string[] | null
  ) {
    const alert = await this.getAlertById(tenantId, alertId, userProjectIds);
    return this.alertRepo.dismiss(tenantId, alert.id, dto.reason);
  }
}
