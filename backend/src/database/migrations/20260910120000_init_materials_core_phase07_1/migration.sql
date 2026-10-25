-- AlterTable stores
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "location" VARCHAR(255);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "store_type" VARCHAR(50) NOT NULL DEFAULT 'PROJECT_SITE';

CREATE INDEX IF NOT EXISTS "stores_tenant_id_status_idx" ON "stores"("tenant_id", "status");

-- CreateTable materials
CREATE TABLE IF NOT EXISTS "materials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "specification" TEXT,
    "primary_uom" VARCHAR(20) NOT NULL,
    "secondary_uom" VARCHAR(20),
    "conversion_factor" DECIMAL(12,4),
    "hsn_code" VARCHAR(20),
    "standard_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reorder_level" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "safety_stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_batch_tracked" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable vendors
CREATE TABLE IF NOT EXISTS "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "gstin" VARCHAR(50),
    "pan" VARCHAR(50),
    "contact_person" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "payment_terms" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "materials_tenant_id_item_code_key" ON "materials"("tenant_id", "item_code");
CREATE INDEX IF NOT EXISTS "materials_tenant_id_status_idx" ON "materials"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "materials_tenant_id_category_idx" ON "materials"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vendors_tenant_id_code_key" ON "vendors"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "vendors_tenant_id_status_idx" ON "vendors"("tenant_id", "status");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'materials_tenant_id_fkey') THEN
        ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_tenant_id_fkey') THEN
        ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
