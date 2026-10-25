import type { SupportedApprovalEntityType, ApprovalDecisionTypeEnum } from '../constants/approval.constants';

export interface ApprovalRequestSubmittedEvent {
  eventType: 'APPROVAL_REQUEST_SUBMITTED';
  requestId: string;
  tenantId: string;
  projectId?: string | null;
  requestNumber: string;
  entityType: SupportedApprovalEntityType;
  entityId: string;
  monetaryAmount?: string | null;
  submittedById: string;
  currentStepOrder: number;
  totalSteps: number;
  nextRequiredPermission: string;
  nextRequiredRoleHint?: string | null;
  timestamp: string;
}

export interface ApprovalStepApprovedEvent {
  eventType: 'APPROVAL_STEP_APPROVED';
  requestId: string;
  tenantId: string;
  projectId?: string | null;
  stepId: string;
  stepOrder: number;
  actorId: string;
  nextStepOrder?: number | null;
  nextRequiredPermission?: string | null;
  nextRequiredRoleHint?: string | null;
  timestamp: string;
}

export interface ApprovalRequestApprovedEvent {
  eventType: 'APPROVAL_REQUEST_APPROVED';
  requestId: string;
  tenantId: string;
  projectId?: string | null;
  requestNumber: string;
  entityType: SupportedApprovalEntityType;
  entityId: string;
  submittedById: string;
  finalActorId: string;
  completedAt: string;
  timestamp: string;
}

export interface ApprovalRequestRejectedEvent {
  eventType: 'APPROVAL_REQUEST_REJECTED';
  requestId: string;
  tenantId: string;
  projectId?: string | null;
  requestNumber: string;
  entityType: SupportedApprovalEntityType;
  entityId: string;
  submittedById: string;
  actorId: string;
  decisionReason: string;
  timestamp: string;
}

export interface ApprovalRequestReturnedEvent {
  eventType: 'APPROVAL_REQUEST_RETURNED';
  requestId: string;
  tenantId: string;
  projectId?: string | null;
  requestNumber: string;
  entityType: SupportedApprovalEntityType;
  entityId: string;
  submittedById: string;
  actorId: string;
  decisionReason: string;
  timestamp: string;
}

export interface ApprovalRequestCancelledEvent {
  eventType: 'APPROVAL_REQUEST_CANCELLED';
  requestId: string;
  tenantId: string;
  projectId?: string | null;
  requestNumber: string;
  entityType: SupportedApprovalEntityType;
  entityId: string;
  submittedById: string;
  actorId: string;
  decisionReason?: string | null;
  timestamp: string;
}

export type ApprovalDomainEvent =
  | ApprovalRequestSubmittedEvent
  | ApprovalStepApprovedEvent
  | ApprovalRequestApprovedEvent
  | ApprovalRequestRejectedEvent
  | ApprovalRequestReturnedEvent
  | ApprovalRequestCancelledEvent;
