export interface IncidentRecordLike {
  id: string;
  tenantId: string;
  projectId: string;
  incidentNumber: string;
  incidentType: string;
  severity: string;
  occurredAt: Date | string;
  reportedAt: Date | string;
  location: string;
  description: string;
  reportedById: string;
  injuredEmployeeId?: string | null;
  injuredPersonName?: string | null;
  injuredPersonTrade?: string | null;
  lostWorkDays?: number;
  likelihood: number;
  severityRating: number;
  riskScore: number;
  riskLevel: string;
  status: string;
  immediateActionTaken?: string | null;
  rootCause?: string | null;
  investigatedById?: string | null;
  investigationFindings?: string | null;
  closedById?: string | null;
  closedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  [key: string]: unknown;
}

const FULL_ACCESS_ROLES = new Set(['COMPANY_OWNER', 'COMPANY_ADMIN', 'HR', 'PROJECT_MANAGER']);

export function sanitizeIncident<T extends IncidentRecordLike>(
  incident: T,
  userRole?: string
): T {
  const role = (userRole || '').toUpperCase();
  const hasFullAccess = FULL_ACCESS_ROLES.has(role);

  if (hasFullAccess) {
    return incident;
  }

  // Redacted projection for SITE_ENGINEER, PROCUREMENT_STORE, VIEWER, etc.
  return {
    ...incident,
    injuredEmployeeId: null,
    injuredPersonName: incident.injuredPersonName ? 'CONFIDENTIAL' : null,
    lostWorkDays: 0,
  };
}

export function sanitizeIncidentList<T extends IncidentRecordLike>(
  incidents: T[],
  userRole?: string
): T[] {
  return incidents.map((inc) => sanitizeIncident(inc, userRole));
}
