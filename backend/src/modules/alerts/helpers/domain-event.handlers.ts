import { EventRegistry, type EventHandlerContext } from './event.registry.js';
import { DomainEventType } from '../constants/outbox.constants.js';
import { AlertSeverity } from '../constants/alert.constants.js';
import type { OutboxEvent } from '@prisma/client';

export function registerBuiltInDomainEventHandlers(): void {
  const registry = EventRegistry.getInstance();

  // 1. Projects: Milestone Delayed
  registry.register(
    DomainEventType.PROJECT_MILESTONE_DELAYED,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'PROJECT_MILESTONE_DELAY',
        severity: AlertSeverity.WARNING,
        title: `Project Milestone Delayed: ${payload.milestoneName || 'Milestone'}`,
        message:
          payload.message ||
          `Milestone is delayed by ${payload.delayedDays ?? 'several'} days. Action required.`,
        entityType: 'PROJECT',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        assignedToId: payload.assignedToId || null,
        dueAt: payload.revisedDueDate ? new Date(payload.revisedDueDate) : null,
        metadata: payload,
      });

      if (payload.notifyUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.notifyUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 2. Projects: DPR Delayed / Missed
  registry.register(
    DomainEventType.DPR_DELAYED,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'DPR_SUBMISSION_DELAY',
        severity: AlertSeverity.WARNING,
        title: `Daily Progress Report Pending for Project`,
        message:
          payload.message ||
          `DPR for date ${payload.reportDate || 'today'} has not been submitted.`,
        entityType: 'DAILY_PROGRESS_REPORT',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        assignedToId: payload.siteEngineerId || null,
        metadata: payload,
      });

      if (payload.notifyUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.notifyUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 3. Materials: Low Stock Alert
  registry.register(
    DomainEventType.MATERIAL_LOW_STOCK,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      // Idempotency: avoid creating duplicate open alert for same material in same store
      const existing = await context.alertRepo.findActiveByEntity(
        event.tenantId,
        'MATERIAL_LOW_STOCK',
        'MATERIAL',
        event.aggregateId
      );

      if (!existing) {
        const alert = await context.alertRepo.create({
          tenantId: event.tenantId,
          projectId: event.projectId,
          branchId: event.branchId,
          alertType: 'MATERIAL_LOW_STOCK',
          severity: AlertSeverity.CRITICAL,
          title: `Low Stock: ${payload.materialName || 'Material'} (${payload.itemCode || event.aggregateId})`,
          message: `Current on-hand stock (${payload.currentStock ?? 0} ${payload.uom || ''}) is below safety threshold (${payload.minStockThreshold ?? 0}).`,
          entityType: 'MATERIAL',
          entityId: event.aggregateId,
          sourceEventId: event.id,
          assignedToId: payload.storeManagerId || null,
          metadata: payload,
        });

        if (payload.notifyUserId) {
          await context.notificationService.send({
            tenantId: event.tenantId,
            recipientUserId: payload.notifyUserId,
            title: alert.title,
            body: alert.message,
            alertId: alert.id,
            eventId: event.id,
          });
        }
      }
    }
  );

  // 4. Finance: Payment Overdue
  registry.register(
    DomainEventType.PAYMENT_OVERDUE,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'PAYMENT_OVERDUE',
        severity: AlertSeverity.CRITICAL,
        title: `Payment Overdue: ${payload.invoiceOrBillNumber || 'Invoice'}`,
        message: `Outstanding payment amount ₹${payload.amountDue ?? 0} is overdue since ${payload.dueDate || 'past due date'}.`,
        entityType: payload.entityType || 'VENDOR_INVOICE',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        assignedToId: payload.accountantId || null,
        metadata: payload,
      });

      if (payload.notifyUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.notifyUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 5. People: Attendance Anomaly
  registry.register(
    DomainEventType.ATTENDANCE_ANOMALY,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'ATTENDANCE_ANOMALY',
        severity: AlertSeverity.WARNING,
        title: `Workforce Attendance Anomaly`,
        message:
          payload.message ||
          `Significant workforce variance detected: reported muster headcount differs from biometric punch counts.`,
        entityType: 'ATTENDANCE_RECORD',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        metadata: payload,
      });

      if (payload.notifyUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.notifyUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 6. Equipment: Breakdown / Maintenance Due
  registry.register(
    DomainEventType.EQUIPMENT_BREAKDOWN,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'EQUIPMENT_BREAKDOWN',
        severity: AlertSeverity.CRITICAL,
        title: `Equipment Breakdown: ${payload.equipmentCode || event.aggregateId}`,
        message: `Breakdown reported on ${payload.equipmentName || 'Equipment'}. Work order ${payload.workOrderNumber || 'created'} is open.`,
        entityType: 'EQUIPMENT',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        assignedToId: payload.plantManagerId || null,
        metadata: payload,
      });

      if (payload.notifyUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.notifyUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 7. Quality & Safety: NCR Raised
  registry.register(
    DomainEventType.NCR_RAISED,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'NON_CONFORMANCE_REPORT',
        severity: AlertSeverity.CRITICAL,
        title: `NCR Raised: ${payload.ncrNumber || event.aggregateId}`,
        message: `Non-Conformance Report raised: ${payload.title || 'Quality deficiency detected'}. Severity: ${payload.severity || 'MAJOR'}.`,
        entityType: 'NON_CONFORMANCE_REPORT',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        assignedToId: payload.assignedToId || null,
        metadata: payload,
      });

      if (payload.notifyUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.notifyUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 8. Quality & Safety: Safety Incident Critical
  registry.register(
    DomainEventType.SAFETY_INCIDENT_CRITICAL,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'SAFETY_INCIDENT_CRITICAL',
        severity: AlertSeverity.CRITICAL,
        title: `CRITICAL Safety Incident Reported: ${payload.incidentNumber || event.aggregateId}`,
        message: `High severity safety incident reported at site. Immediate investigation and corrective action required.`,
        entityType: 'SAFETY_INCIDENT',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        assignedToId: payload.safetyOfficerId || null,
        metadata: payload,
      });

      if (payload.notifyUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.notifyUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 9. Documents & RFI: RFI Overdue
  registry.register(
    DomainEventType.RFI_OVERDUE,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'RFI_OVERDUE',
        severity: AlertSeverity.WARNING,
        title: `RFI Response Overdue: ${payload.rfiNumber || event.aggregateId}`,
        message: `Technical Request for Information (${payload.subject || 'RFI'}) has exceeded its response SLA.`,
        entityType: 'REQUEST_FOR_INFORMATION',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        assignedToId: payload.assignedToId || null,
        metadata: payload,
      });

      if (payload.notifyUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.notifyUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 10. Approvals Engine: Pending Step Notification
  registry.register(
    DomainEventType.APPROVAL_STEP_PENDING,
    async (event: OutboxEvent, context: EventHandlerContext) => {
      const payload = (event.payload as Record<string, any>) || {};
      const alert = await context.alertRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        branchId: event.branchId,
        alertType: 'APPROVAL_PENDING',
        severity: AlertSeverity.INFO,
        title: `Approval Required: ${payload.requestNumber || 'Approval Request'}`,
        message: `Step ${payload.stepOrder ?? 1} (${payload.stepName || 'Review'}) for ${payload.entityType || 'Entity'} is awaiting your decision.`,
        entityType: payload.entityType || 'APPROVAL_REQUEST',
        entityId: event.aggregateId,
        sourceEventId: event.id,
        assignedToId: payload.assignedUserId || null,
        dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
        metadata: payload,
      });

      if (payload.assignedUserId) {
        await context.notificationService.send({
          tenantId: event.tenantId,
          recipientUserId: payload.assignedUserId,
          title: alert.title,
          body: alert.message,
          alertId: alert.id,
          eventId: event.id,
        });
      }
    }
  );

  // 11. Approvals Engine: Decision Outcome Notifications (Approved / Rejected / Returned)
  const approvalOutcomeHandler = async (
    event: OutboxEvent,
    context: EventHandlerContext
  ) => {
    const payload = (event.payload as Record<string, any>) || {};
    const submitterId = payload.submittedById;

    if (submitterId) {
      const outcome = event.eventType.replace('APPROVAL_', '');
      await context.notificationService.send({
        tenantId: event.tenantId,
        recipientUserId: submitterId,
        title: `Approval Request ${payload.requestNumber || ''}: ${outcome}`,
        body: `Your approval request for ${payload.entityType || 'Entity'} has been ${outcome.toLowerCase()}.${payload.decisionReason ? ` Reason: ${payload.decisionReason}` : ''}`,
        eventId: event.id,
        metadata: payload,
      });
    }
  };

  registry.register(DomainEventType.APPROVAL_APPROVED, approvalOutcomeHandler);
  registry.register(DomainEventType.APPROVAL_REJECTED, approvalOutcomeHandler);
  registry.register(DomainEventType.APPROVAL_RETURNED, approvalOutcomeHandler);
  registry.register(DomainEventType.APPROVAL_CANCELLED, approvalOutcomeHandler);
}
