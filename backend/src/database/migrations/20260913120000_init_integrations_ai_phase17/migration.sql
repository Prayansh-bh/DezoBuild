-- DEZOBUILD Phase 17: External Integrations & AI Intelligence Control Layer Migration

-- 1. Create Enums
CREATE TYPE "IntegrationType" AS ENUM (
    'ERP',
    'ACCOUNTING',
    'DOCUMENT_STORAGE',
    'EMAIL',
    'SMS',
    'WHATSAPP',
    'PAYMENTS',
    'BIOMETRIC',
    'TELEMATICS',
    'WEBHOOK',
    'CUSTOM_API'
);

CREATE TYPE "IntegrationConnectionStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ERROR',
    'DISCONNECTED'
);

CREATE TYPE "IntegrationSyncDirection" AS ENUM (
    'INBOUND',
    'OUTBOUND'
);

CREATE TYPE "IntegrationSyncJobStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE "WebhookEventStatus" AS ENUM (
    'RECEIVED',
    'VERIFIED',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'QUARANTINED'
);

CREATE TYPE "AIRequestStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

CREATE TYPE "AIInsightStatus" AS ENUM (
    'ACTIVE',
    'ACKNOWLEDGED',
    'DISMISSED',
    'EXPIRED'
);

CREATE TYPE "AIInsightSeverity" AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);

-- 2. Create Table: integration_connections
CREATE TABLE "integration_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "integration_type" "IntegrationType" NOT NULL,
    "provider_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB NOT NULL,
    "encrypted_secret" TEXT,
    "secret_ref" VARCHAR(255),
    "created_by_id" UUID NOT NULL,
    "last_connected_at" TIMESTAMPTZ,
    "last_sync_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integration_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "integration_connections_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "integration_connections_tenant_id_provider_key_name_key" ON "integration_connections"("tenant_id", "provider_key", "name");
CREATE INDEX "integration_connections_tenant_id_status_integration_type_idx" ON "integration_connections"("tenant_id", "status", "integration_type");
CREATE INDEX "integration_connections_provider_key_status_idx" ON "integration_connections"("provider_key", "status");

-- 3. Create Table: external_references
CREATE TABLE "external_references" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "integration_connection_id" UUID NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "external_entity_type" VARCHAR(100) NOT NULL,
    "external_entity_id" VARCHAR(255) NOT NULL,
    "external_version" VARCHAR(100),
    "last_synced_at" TIMESTAMPTZ,
    "sync_status" VARCHAR(50) NOT NULL DEFAULT 'SYNCED',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_references_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "external_references_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "external_references_integration_connection_id_fkey" FOREIGN KEY ("integration_connection_id") REFERENCES "integration_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "external_references_tenant_conn_entity_key" ON "external_references"("tenant_id", "integration_connection_id", "entity_type", "entity_id");
CREATE UNIQUE INDEX "external_references_tenant_conn_external_key" ON "external_references"("tenant_id", "integration_connection_id", "external_entity_type", "external_entity_id");
CREATE INDEX "external_references_tenant_id_entity_type_entity_id_idx" ON "external_references"("tenant_id", "entity_type", "entity_id");
CREATE INDEX "external_references_tenant_id_ext_type_ext_id_idx" ON "external_references"("tenant_id", "external_entity_type", "external_entity_id");

-- 4. Create Table: integration_sync_jobs
CREATE TABLE "integration_sync_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "integration_connection_id" UUID NOT NULL,
    "direction" "IntegrationSyncDirection" NOT NULL DEFAULT 'OUTBOUND',
    "entity_type" VARCHAR(100) NOT NULL,
    "scope_metadata" JSONB,
    "status" "IntegrationSyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_sync_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integration_sync_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "integration_sync_jobs_integration_connection_id_fkey" FOREIGN KEY ("integration_connection_id") REFERENCES "integration_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "integration_sync_jobs_tenant_id_idempotency_key_key" ON "integration_sync_jobs"("tenant_id", "idempotency_key");
CREATE INDEX "integration_sync_jobs_tenant_id_status_available_at_idx" ON "integration_sync_jobs"("tenant_id", "status", "available_at");
CREATE INDEX "integration_sync_jobs_integration_connection_id_status_idx" ON "integration_sync_jobs"("integration_connection_id", "status");

-- 5. Create Table: webhook_events
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_key" VARCHAR(100) NOT NULL,
    "external_event_id" VARCHAR(255) NOT NULL,
    "tenant_id" UUID,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correlation_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "webhook_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "webhook_events_provider_key_external_event_id_key" ON "webhook_events"("provider_key", "external_event_id");
CREATE INDEX "webhook_events_tenant_id_status_received_at_idx" ON "webhook_events"("tenant_id", "status", "received_at");
CREATE INDEX "webhook_events_provider_key_status_idx" ON "webhook_events"("provider_key", "status");

-- 6. Create Table: ai_requests
CREATE TABLE "ai_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "feature_key" VARCHAR(100) NOT NULL,
    "operation" VARCHAR(100) NOT NULL,
    "provider_key" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "input_hash" VARCHAR(64) NOT NULL,
    "status" "AIRequestStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "error_code" VARCHAR(100),
    "latency_ms" INTEGER,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,
    "estimated_cost" DECIMAL(12, 6),
    "correlation_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ai_requests_tenant_id_feature_key_created_at_idx" ON "ai_requests"("tenant_id", "feature_key", "created_at");
CREATE INDEX "ai_requests_tenant_id_requested_by_id_created_at_idx" ON "ai_requests"("tenant_id", "requested_by_id", "created_at");
CREATE INDEX "ai_requests_provider_key_model_status_idx" ON "ai_requests"("provider_key", "model", "status");

-- 7. Create Table: ai_insights
CREATE TABLE "ai_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID,
    "feature_key" VARCHAR(100) NOT NULL,
    "severity" "AIInsightSeverity" NOT NULL DEFAULT 'INFO',
    "title" VARCHAR(255) NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB,
    "source_references" JSONB,
    "confidence" DECIMAL(5, 4),
    "generated_by" VARCHAR(100) NOT NULL,
    "ai_request_id" UUID,
    "status" "AIInsightStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_insights_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_insights_ai_request_id_fkey" FOREIGN KEY ("ai_request_id") REFERENCES "ai_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ai_insights_tenant_id_status_severity_idx" ON "ai_insights"("tenant_id", "status", "severity");
CREATE INDEX "ai_insights_tenant_id_project_id_status_idx" ON "ai_insights"("tenant_id", "project_id", "status");
CREATE INDEX "ai_insights_tenant_id_feature_key_created_at_idx" ON "ai_insights"("tenant_id", "feature_key", "created_at");
