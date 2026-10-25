-- Phase 07.9 — Inventory Reservations / Material Allocations Migration

-- CreateTable inventory_reservations
CREATE TABLE IF NOT EXISTS "inventory_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "reservation_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "reservation_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "required_date" DATE,
    "expiry_date" DATE,
    "purpose" VARCHAR(255),
    "remarks" TEXT,
    "release_remarks" TEXT,
    "cancellation_reason" TEXT,
    "rejection_reason" TEXT,
    "created_by_id" UUID NOT NULL,
    "submitted_by_id" UUID,
    "submitted_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "released_by_id" UUID,
    "released_at" TIMESTAMPTZ,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable inventory_reservation_lines
CREATE TABLE IF NOT EXISTS "inventory_reservation_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_reserved" DECIMAL(15,4) NOT NULL,
    "quantity_fulfilled" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "quantity_released" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "uom" VARCHAR(20) NOT NULL,
    "wbs_node_id" UUID,
    "task_id" UUID,
    "material_indent_line_id" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable inventory_reservation_sequences
CREATE TABLE IF NOT EXISTS "inventory_reservation_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "scope_key" VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
    "sequence_date" VARCHAR(10) NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservation_sequences_pkey" PRIMARY KEY ("id")
);

-- Add column to material_issue_lines
ALTER TABLE "material_issue_lines" ADD COLUMN IF NOT EXISTS "reservation_line_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_reservations_tenant_id_reservation_number_key" ON "inventory_reservations"("tenant_id", "reservation_number");
CREATE INDEX IF NOT EXISTS "inventory_reservations_tenant_id_store_id_idx" ON "inventory_reservations"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "inventory_reservations_tenant_id_project_id_idx" ON "inventory_reservations"("tenant_id", "project_id");
CREATE INDEX IF NOT EXISTS "inventory_reservations_tenant_id_status_idx" ON "inventory_reservations"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "inventory_reservations_tenant_id_reservation_date_idx" ON "inventory_reservations"("tenant_id", "reservation_date");
CREATE INDEX IF NOT EXISTS "inventory_reservations_tenant_id_expiry_date_idx" ON "inventory_reservations"("tenant_id", "expiry_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_reservation_lines_tenant_id_reservation_id_idx" ON "inventory_reservation_lines"("tenant_id", "reservation_id");
CREATE INDEX IF NOT EXISTS "inventory_reservation_lines_tenant_id_material_id_idx" ON "inventory_reservation_lines"("tenant_id", "material_id");
CREATE INDEX IF NOT EXISTS "inventory_reservation_lines_tenant_id_wbs_node_id_idx" ON "inventory_reservation_lines"("tenant_id", "wbs_node_id");
CREATE INDEX IF NOT EXISTS "inventory_reservation_lines_tenant_id_task_id_idx" ON "inventory_reservation_lines"("tenant_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_reservation_sequences_tenant_id_scope_key_sequence_date_key" ON "inventory_reservation_sequences"("tenant_id", "scope_key", "sequence_date");
CREATE INDEX IF NOT EXISTS "inventory_reservation_sequences_tenant_id_scope_key_idx" ON "inventory_reservation_sequences"("tenant_id", "scope_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "material_issue_lines_tenant_id_reservation_line_id_idx" ON "material_issue_lines"("tenant_id", "reservation_line_id");

-- Foreign Keys for inventory_reservations
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_tenant_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_store_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_project_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_created_by_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_submitted_by_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_approved_by_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_released_by_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_released_by_id_fkey" FOREIGN KEY ("released_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_cancelled_by_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_rejected_by_id_fkey') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for inventory_reservation_lines
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_tenant_id_fkey') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_reservation_id_fkey') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "inventory_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_material_id_fkey') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_wbs_node_id_fkey') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_wbs_node_id_fkey" FOREIGN KEY ("wbs_node_id") REFERENCES "wbs_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_task_id_fkey') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for inventory_reservation_sequences
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_sequences_tenant_id_fkey') THEN
        ALTER TABLE "inventory_reservation_sequences" ADD CONSTRAINT "inventory_reservation_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Key for material_issue_lines.reservation_line_id
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_lines_reservation_line_id_fkey') THEN
        ALTER TABLE "material_issue_lines" ADD CONSTRAINT "material_issue_lines_reservation_line_id_fkey" FOREIGN KEY ("reservation_line_id") REFERENCES "inventory_reservation_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Check Constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_quantity_reserved_check') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_quantity_reserved_check" CHECK ("quantity_reserved" > 0);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_quantity_fulfilled_check') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_quantity_fulfilled_check" CHECK ("quantity_fulfilled" >= 0);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_quantity_released_check') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_quantity_released_check" CHECK ("quantity_released" >= 0);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservation_lines_fulfilled_plus_released_check') THEN
        ALTER TABLE "inventory_reservation_lines" ADD CONSTRAINT "inventory_reservation_lines_fulfilled_plus_released_check" CHECK ("quantity_fulfilled" + "quantity_released" <= "quantity_reserved");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_reservations_status_check') THEN
        ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_status_check" CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'ACTIVE', 'PARTIALLY_FULFILLED', 'FULFILLED', 'RELEASED', 'REJECTED', 'CANCELLED', 'EXPIRED'));
    END IF;
END $$;
