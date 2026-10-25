-- CreateTable material_transfers
CREATE TABLE IF NOT EXISTS "material_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "source_store_id" UUID NOT NULL,
    "destination_store_id" UUID NOT NULL,
    "source_project_id" UUID,
    "destination_project_id" UUID,
    "transfer_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "transfer_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatch_date" TIMESTAMPTZ,
    "received_date" TIMESTAMPTZ,
    "delivery_challan_number" VARCHAR(100),
    "vehicle_number" VARCHAR(50),
    "driver_name" VARCHAR(100),
    "driver_phone" VARCHAR(50),
    "remarks" TEXT,
    "approval_remarks" TEXT,
    "rejection_reason" TEXT,
    "cancellation_reason" TEXT,
    "receipt_remarks" TEXT,
    "created_by_id" UUID NOT NULL,
    "submitted_by_id" UUID,
    "submitted_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "dispatched_by_id" UUID,
    "dispatched_at" TIMESTAMPTZ,
    "received_by_id" UUID,
    "received_at" TIMESTAMPTZ,
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMPTZ,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_transfer_lines
CREATE TABLE IF NOT EXISTS "material_transfer_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "material_transfer_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_transferred" DECIMAL(15,4) NOT NULL,
    "quantity_received" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "uom" VARCHAR(20) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_transfer_sequences
CREATE TABLE IF NOT EXISTS "material_transfer_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "scope_key" VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
    "sequence_date" VARCHAR(10) NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_transfer_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_transfers_tenant_id_transfer_number_key" ON "material_transfers"("tenant_id", "transfer_number");
CREATE INDEX IF NOT EXISTS "material_transfers_tenant_id_source_store_id_idx" ON "material_transfers"("tenant_id", "source_store_id");
CREATE INDEX IF NOT EXISTS "material_transfers_tenant_id_destination_store_id_idx" ON "material_transfers"("tenant_id", "destination_store_id");
CREATE INDEX IF NOT EXISTS "material_transfers_tenant_id_status_idx" ON "material_transfers"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "material_transfers_tenant_id_transfer_date_idx" ON "material_transfers"("tenant_id", "transfer_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "material_transfer_lines_tenant_id_material_transfer_id_idx" ON "material_transfer_lines"("tenant_id", "material_transfer_id");
CREATE INDEX IF NOT EXISTS "material_transfer_lines_tenant_id_material_id_idx" ON "material_transfer_lines"("tenant_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_transfer_sequences_tenant_id_scope_key_sequence_date_key" ON "material_transfer_sequences"("tenant_id", "scope_key", "sequence_date");
CREATE INDEX IF NOT EXISTS "material_transfer_sequences_tenant_id_scope_key_idx" ON "material_transfer_sequences"("tenant_id", "scope_key");

-- Foreign Keys for material_transfers
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_tenant_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_source_store_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_source_store_id_fkey" FOREIGN KEY ("source_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_destination_store_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_destination_store_id_fkey" FOREIGN KEY ("destination_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_source_project_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_source_project_id_fkey" FOREIGN KEY ("source_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_destination_project_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_destination_project_id_fkey" FOREIGN KEY ("destination_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_created_by_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_submitted_by_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_approved_by_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_dispatched_by_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_dispatched_by_id_fkey" FOREIGN KEY ("dispatched_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_received_by_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_rejected_by_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfers_cancelled_by_id_fkey') THEN
        ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for material_transfer_lines
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfer_lines_tenant_id_fkey') THEN
        ALTER TABLE "material_transfer_lines" ADD CONSTRAINT "material_transfer_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfer_lines_material_transfer_id_fkey') THEN
        ALTER TABLE "material_transfer_lines" ADD CONSTRAINT "material_transfer_lines_material_transfer_id_fkey" FOREIGN KEY ("material_transfer_id") REFERENCES "material_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfer_lines_material_id_fkey') THEN
        ALTER TABLE "material_transfer_lines" ADD CONSTRAINT "material_transfer_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for material_transfer_sequences
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_transfer_sequences_tenant_id_fkey') THEN
        ALTER TABLE "material_transfer_sequences" ADD CONSTRAINT "material_transfer_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
