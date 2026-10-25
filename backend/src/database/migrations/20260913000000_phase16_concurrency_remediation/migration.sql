-- DEZOBUILD Phase 16: Concurrency Remediation Migration
-- Invariant 1: Notification Delivery Idempotency
-- Invariant 2: Alert Idempotency

-- 1. Alerts Idempotency Constraints
CREATE UNIQUE INDEX "alerts_tenant_id_source_event_id_key" ON "alerts"("tenant_id", "source_event_id");

CREATE UNIQUE INDEX "alerts_active_entity_unique_idx" ON "alerts"("tenant_id", "alert_type", "entity_type", "entity_id")
WHERE "status" IN ('OPEN', 'ACKNOWLEDGED') AND "entity_type" IS NOT NULL AND "entity_id" IS NOT NULL;

-- 2. Notification Deliveries Idempotency Constraints
CREATE UNIQUE INDEX "notification_deliveries_tenant_id_alert_id_recipient_user_id_channel_key" ON "notification_deliveries"("tenant_id", "alert_id", "recipient_user_id", "channel");

CREATE UNIQUE INDEX "notification_deliveries_tenant_id_event_id_recipient_user_id_channel_key" ON "notification_deliveries"("tenant_id", "event_id", "recipient_user_id", "channel");
