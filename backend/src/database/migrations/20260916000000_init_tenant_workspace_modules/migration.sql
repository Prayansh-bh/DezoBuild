-- ==========================================
-- PHASE 05+ — TIER 2 TENANT WORKSPACE MODULE ACTIVATION
-- ==========================================

-- 1. Create tenant_workspace_modules table
CREATE TABLE "tenant_workspace_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "feature_key" VARCHAR(100) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_workspace_modules_pkey" PRIMARY KEY ("id")
);

-- 2. Indexes and Unique Constraints
CREATE UNIQUE INDEX "tenant_workspace_modules_tenant_id_feature_key_key" ON "tenant_workspace_modules"("tenant_id", "feature_key");
CREATE INDEX "tenant_workspace_modules_tenant_id_idx" ON "tenant_workspace_modules"("tenant_id");

-- 3. Foreign Key Constraint
ALTER TABLE "tenant_workspace_modules" ADD CONSTRAINT "tenant_workspace_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
