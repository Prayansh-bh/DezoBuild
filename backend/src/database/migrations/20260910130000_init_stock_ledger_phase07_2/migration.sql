-- CreateTable store_stock_balances
CREATE TABLE IF NOT EXISTS "store_stock_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_on_hand" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "reserved_quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable stock_movements
CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "movement_type" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "unit_rate" DECIMAL(12,2),
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "reason" TEXT,
    "performed_by_id" UUID,
    "idempotency_key" VARCHAR(255),
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "store_stock_balances_store_id_material_id_key" ON "store_stock_balances"("store_id", "material_id");
CREATE INDEX IF NOT EXISTS "store_stock_balances_tenant_id_store_id_idx" ON "store_stock_balances"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "store_stock_balances_tenant_id_material_id_idx" ON "store_stock_balances"("tenant_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movements_tenant_id_idempotency_key_key" ON "stock_movements"("tenant_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_store_id_material_id_occurred_at_idx" ON "stock_movements"("tenant_id", "store_id", "material_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_store_id_idx" ON "stock_movements"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_material_id_idx" ON "stock_movements"("tenant_id", "material_id");
CREATE INDEX IF NOT EXISTS "stock_movements_idempotency_key_idx" ON "stock_movements"("idempotency_key");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_stock_balances_tenant_id_fkey') THEN
        ALTER TABLE "store_stock_balances" ADD CONSTRAINT "store_stock_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_stock_balances_store_id_fkey') THEN
        ALTER TABLE "store_stock_balances" ADD CONSTRAINT "store_stock_balances_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_stock_balances_material_id_fkey') THEN
        ALTER TABLE "store_stock_balances" ADD CONSTRAINT "store_stock_balances_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_tenant_id_fkey') THEN
        ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_store_id_fkey') THEN
        ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_material_id_fkey') THEN
        ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_performed_by_id_fkey') THEN
        ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
