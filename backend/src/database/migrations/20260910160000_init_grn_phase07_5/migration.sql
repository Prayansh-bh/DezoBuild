-- CreateTable goods_receipt_notes
CREATE TABLE IF NOT EXISTS "goods_receipt_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "grn_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "receipt_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_challan_number" VARCHAR(100),
    "delivery_challan_date" DATE,
    "vehicle_number" VARCHAR(50),
    "remarks" TEXT,
    "received_by_id" UUID NOT NULL,
    "submitted_by_id" UUID,
    "submitted_at" TIMESTAMPTZ,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ,
    "verification_remarks" TEXT,
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable goods_receipt_lines
CREATE TABLE IF NOT EXISTS "goods_receipt_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "grn_id" UUID NOT NULL,
    "purchase_order_line_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_delivered" DECIMAL(15,4) NOT NULL,
    "quantity_accepted" DECIMAL(15,4) NOT NULL,
    "quantity_rejected" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "uom" VARCHAR(20) NOT NULL,
    "unit_rate" DECIMAL(15,4) NOT NULL,
    "storage_location" VARCHAR(100),
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable goods_receipt_sequences
CREATE TABLE IF NOT EXISTS "goods_receipt_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "sequence_date" VARCHAR(10) NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_notes_tenant_id_grn_number_key" ON "goods_receipt_notes"("tenant_id", "grn_number");
CREATE INDEX IF NOT EXISTS "goods_receipt_notes_tenant_id_project_id_idx" ON "goods_receipt_notes"("tenant_id", "project_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_notes_tenant_id_store_id_idx" ON "goods_receipt_notes"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_notes_tenant_id_purchase_order_id_idx" ON "goods_receipt_notes"("tenant_id", "purchase_order_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_notes_tenant_id_status_idx" ON "goods_receipt_notes"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "goods_receipt_notes_tenant_id_receipt_date_idx" ON "goods_receipt_notes"("tenant_id", "receipt_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_tenant_id_grn_id_idx" ON "goods_receipt_lines"("tenant_id", "grn_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_tenant_id_purchase_order_line_id_idx" ON "goods_receipt_lines"("tenant_id", "purchase_order_line_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_tenant_id_material_id_idx" ON "goods_receipt_lines"("tenant_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_sequences_tenant_id_project_id_sequence_date_key" ON "goods_receipt_sequences"("tenant_id", "project_id", "sequence_date");
CREATE INDEX IF NOT EXISTS "goods_receipt_sequences_tenant_id_project_id_idx" ON "goods_receipt_sequences"("tenant_id", "project_id");

-- Foreign Keys for goods_receipt_notes
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_tenant_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_project_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_store_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_purchase_order_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_vendor_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_received_by_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_submitted_by_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_verified_by_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_rejected_by_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_notes_cancelled_by_id_fkey') THEN
        ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for goods_receipt_lines
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_lines_tenant_id_fkey') THEN
        ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_lines_grn_id_fkey') THEN
        ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_lines_purchase_order_line_id_fkey') THEN
        ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_lines_material_id_fkey') THEN
        ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for goods_receipt_sequences
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_sequences_tenant_id_fkey') THEN
        ALTER TABLE "goods_receipt_sequences" ADD CONSTRAINT "goods_receipt_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_sequences_project_id_fkey') THEN
        ALTER TABLE "goods_receipt_sequences" ADD CONSTRAINT "goods_receipt_sequences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
