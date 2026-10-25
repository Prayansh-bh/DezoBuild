-- Phase 07 — Bill of Quantities (BOQ) & Digital Measurement Book (MB) Migration

-- CreateTable boq_items
CREATE TABLE IF NOT EXISTS "boq_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "wbs_node_id" UUID,
    "parent_id" UUID,
    "item_number" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "specification" TEXT,
    "uom" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_rate" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "executed_quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable digital_mb_records
CREATE TABLE IF NOT EXISTS "digital_mb_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "boq_item_id" UUID NOT NULL,
    "dpr_id" UUID,
    "task_id" UUID,
    "contractor_id" UUID,
    "mb_number" VARCHAR(50) NOT NULL,
    "measurement_date" DATE NOT NULL,
    "measurement_type" VARCHAR(50) NOT NULL DEFAULT 'DIMENSIONAL',
    "location" VARCHAR(255) NOT NULL,
    "chainage_from" DECIMAL(12,4),
    "chainage_to" DECIMAL(12,4),
    "gps_latitude" DECIMAL(10,8),
    "gps_longitude" DECIMAL(11,8),
    "witnessed_by" VARCHAR(255),
    "remarks" TEXT,
    "photo_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "attachment_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "current_quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "previous_cumulative_quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "cumulative_quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "is_excess" BOOLEAN NOT NULL DEFAULT false,
    "excess_justification" TEXT,
    "is_correction" BOOLEAN NOT NULL DEFAULT false,
    "supersedes_mb_record_id" UUID,
    "correction_reason" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "submitted_by_id" UUID,
    "submitted_at" TIMESTAMPTZ,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_mb_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable measurement_dimensions
CREATE TABLE IF NOT EXISTS "measurement_dimensions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "digital_mb_record_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "count" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "length" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "breadth" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "depth" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "factor" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "calculated_quantity" DECIMAL(15,4) NOT NULL,
    "remarks" VARCHAR(255),
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable digital_mb_sequences
CREATE TABLE IF NOT EXISTS "digital_mb_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "current_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_mb_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "boq_items_project_id_item_number_key" ON "boq_items"("project_id", "item_number");
CREATE INDEX IF NOT EXISTS "boq_items_tenant_id_project_id_idx" ON "boq_items"("tenant_id", "project_id");
CREATE INDEX IF NOT EXISTS "boq_items_project_id_wbs_node_id_idx" ON "boq_items"("project_id", "wbs_node_id");
CREATE INDEX IF NOT EXISTS "boq_items_project_id_status_idx" ON "boq_items"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "digital_mb_records_project_id_mb_number_key" ON "digital_mb_records"("project_id", "mb_number");
CREATE INDEX IF NOT EXISTS "digital_mb_records_tenant_id_project_id_idx" ON "digital_mb_records"("tenant_id", "project_id");
CREATE INDEX IF NOT EXISTS "digital_mb_records_project_id_boq_item_id_idx" ON "digital_mb_records"("project_id", "boq_item_id");
CREATE INDEX IF NOT EXISTS "digital_mb_records_project_id_status_idx" ON "digital_mb_records"("project_id", "status");
CREATE INDEX IF NOT EXISTS "digital_mb_records_tenant_id_measurement_date_idx" ON "digital_mb_records"("tenant_id", "measurement_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "measurement_dimensions_tenant_id_digital_mb_record_id_idx" ON "measurement_dimensions"("tenant_id", "digital_mb_record_id");
CREATE INDEX IF NOT EXISTS "measurement_dimensions_digital_mb_record_id_idx" ON "measurement_dimensions"("digital_mb_record_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "digital_mb_sequences_tenant_id_project_id_key" ON "digital_mb_sequences"("tenant_id", "project_id");

-- Foreign Keys for boq_items
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boq_items_tenant_id_fkey') THEN
        ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boq_items_project_id_fkey') THEN
        ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boq_items_wbs_node_id_fkey') THEN
        ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_wbs_node_id_fkey" FOREIGN KEY ("wbs_node_id") REFERENCES "wbs_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boq_items_parent_id_fkey') THEN
        ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "boq_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boq_items_created_by_id_fkey') THEN
        ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for digital_mb_records
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_tenant_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_project_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_boq_item_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_boq_item_id_fkey" FOREIGN KEY ("boq_item_id") REFERENCES "boq_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_dpr_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_dpr_id_fkey" FOREIGN KEY ("dpr_id") REFERENCES "daily_progress_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_task_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_contractor_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_supersedes_mb_record_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_supersedes_mb_record_id_fkey" FOREIGN KEY ("supersedes_mb_record_id") REFERENCES "digital_mb_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_created_by_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_submitted_by_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_verified_by_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_approved_by_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_records_rejected_by_id_fkey') THEN
        ALTER TABLE "digital_mb_records" ADD CONSTRAINT "digital_mb_records_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for measurement_dimensions
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'measurement_dimensions_tenant_id_fkey') THEN
        ALTER TABLE "measurement_dimensions" ADD CONSTRAINT "measurement_dimensions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'measurement_dimensions_digital_mb_record_id_fkey') THEN
        ALTER TABLE "measurement_dimensions" ADD CONSTRAINT "measurement_dimensions_digital_mb_record_id_fkey" FOREIGN KEY ("digital_mb_record_id") REFERENCES "digital_mb_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for digital_mb_sequences
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_sequences_tenant_id_fkey') THEN
        ALTER TABLE "digital_mb_sequences" ADD CONSTRAINT "digital_mb_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_mb_sequences_project_id_fkey') THEN
        ALTER TABLE "digital_mb_sequences" ADD CONSTRAINT "digital_mb_sequences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
