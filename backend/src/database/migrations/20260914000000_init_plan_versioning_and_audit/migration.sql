-- ==========================================
-- PHASE 05+ — GLOBAL PLAN VERSIONING & GOVERNANCE AUDIT
-- ==========================================

-- 1. Create PlatformPlanVersion table
CREATE TABLE "platform_plan_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "price_monthly" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price_annual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "max_projects" INTEGER,
    "max_seats" INTEGER,
    "max_storage_gb" INTEGER,
    "effective_from" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_plan_versions_pkey" PRIMARY KEY ("id")
);

-- 2. Create PlanVersionFeature table
CREATE TABLE "plan_version_features" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_version_id" UUID NOT NULL,
    "feature_key" VARCHAR(100) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_version_features_pkey" PRIMARY KEY ("id")
);

-- 3. Create PlatformAuditLog table
CREATE TABLE "platform_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_tenant_id" UUID,
    "target_tenant_code" VARCHAR(50),
    "target_plan_id" UUID,
    "target_plan_code" VARCHAR(50),
    "details" JSONB,
    "ip_address" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- 4. Alter PlatformPlans & TenantSubscriptions
ALTER TABLE "platform_plans" ADD COLUMN "active_version_id" UUID;
ALTER TABLE "tenant_subscriptions" ADD COLUMN "plan_version_id" UUID;

-- 5. Indexes and Unique Constraints
CREATE UNIQUE INDEX "platform_plan_versions_plan_id_version_number_key" ON "platform_plan_versions"("plan_id", "version_number");
CREATE INDEX "platform_plan_versions_plan_id_status_idx" ON "platform_plan_versions"("plan_id", "status");

CREATE UNIQUE INDEX "plan_version_features_plan_version_id_feature_key_key" ON "plan_version_features"("plan_version_id", "feature_key");
CREATE INDEX "plan_version_features_plan_version_id_idx" ON "plan_version_features"("plan_version_id");

CREATE INDEX "platform_audit_logs_action_timestamp_idx" ON "platform_audit_logs"("action", "timestamp");
CREATE INDEX "platform_audit_logs_target_plan_code_idx" ON "platform_audit_logs"("target_plan_code");
CREATE INDEX "platform_audit_logs_target_tenant_id_idx" ON "platform_audit_logs"("target_tenant_id");

CREATE INDEX "tenant_subscriptions_plan_version_id_idx" ON "tenant_subscriptions"("plan_version_id");

-- 6. Foreign Key Constraints
ALTER TABLE "platform_plan_versions" ADD CONSTRAINT "platform_plan_versions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "platform_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_version_features" ADD CONSTRAINT "plan_version_features_plan_version_id_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "platform_plan_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_version_id_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "platform_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Backfill Existing Data: Create Version 1 for all existing PlatformPlans
DO $$
DECLARE
    plan_record RECORD;
    v1_id UUID;
BEGIN
    FOR plan_record IN SELECT * FROM "platform_plans" LOOP
        v1_id := gen_random_uuid();
        
        -- Insert Version 1 as PUBLISHED
        INSERT INTO "platform_plan_versions" (
            "id", "plan_id", "version_number", "status", "price_monthly", "price_annual",
            "max_projects", "max_seats", "max_storage_gb", "effective_from", "created_at", "updated_at"
        ) VALUES (
            v1_id, plan_record.id, 1, 'PUBLISHED', plan_record.price_monthly, plan_record.price_annual,
            plan_record.max_projects, plan_record.max_seats, plan_record.max_storage_gb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );

        -- Copy PlanFeatures into PlanVersionFeatures
        INSERT INTO "plan_version_features" ("id", "plan_version_id", "feature_key", "is_enabled", "created_at")
        SELECT gen_random_uuid(), v1_id, "feature_key", "is_enabled", CURRENT_TIMESTAMP
        FROM "plan_features"
        WHERE "plan_id" = plan_record.id;

        -- Update activeVersionId on PlatformPlan
        UPDATE "platform_plans" SET "active_version_id" = v1_id WHERE "id" = plan_record.id;

        -- Backfill TenantSubscriptions pointing to this plan
        UPDATE "tenant_subscriptions" SET "plan_version_id" = v1_id WHERE "plan_id" = plan_record.id AND "plan_version_id" IS NULL;
    END LOOP;
END $$;
