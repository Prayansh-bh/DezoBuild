-- CreateTable material_returns
CREATE TABLE IF NOT EXISTS "material_returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "material_issue_id" UUID NOT NULL,
    "return_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "return_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_by_id" UUID NOT NULL,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ,
    "remarks" TEXT,
    "rejection_reason" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_return_lines
CREATE TABLE IF NOT EXISTS "material_return_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "material_return_id" UUID NOT NULL,
    "material_issue_line_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_returned" DECIMAL(15,4) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "condition" VARCHAR(20) NOT NULL DEFAULT 'GOOD',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_return_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_return_sequences
CREATE TABLE IF NOT EXISTS "material_return_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "sequence_date" VARCHAR(10) NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_return_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_returns_tenant_id_return_number_key" ON "material_returns"("tenant_id", "return_number");
CREATE INDEX IF NOT EXISTS "material_returns_tenant_id_project_id_idx" ON "material_returns"("tenant_id", "project_id");
CREATE INDEX IF NOT EXISTS "material_returns_tenant_id_store_id_idx" ON "material_returns"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "material_returns_tenant_id_material_issue_id_idx" ON "material_returns"("tenant_id", "material_issue_id");
CREATE INDEX IF NOT EXISTS "material_returns_tenant_id_status_idx" ON "material_returns"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "material_returns_tenant_id_return_date_idx" ON "material_returns"("tenant_id", "return_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "material_return_lines_tenant_id_material_return_id_idx" ON "material_return_lines"("tenant_id", "material_return_id");
CREATE INDEX IF NOT EXISTS "material_return_lines_tenant_id_material_issue_line_id_idx" ON "material_return_lines"("tenant_id", "material_issue_line_id");
CREATE INDEX IF NOT EXISTS "material_return_lines_tenant_id_material_id_idx" ON "material_return_lines"("tenant_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_return_sequences_tenant_id_project_id_sequence_date_key" ON "material_return_sequences"("tenant_id", "project_id", "sequence_date");
CREATE INDEX IF NOT EXISTS "material_return_sequences_tenant_id_project_id_idx" ON "material_return_sequences"("tenant_id", "project_id");

-- Foreign Keys for material_returns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_returns_tenant_id_fkey') THEN
        ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_returns_project_id_fkey') THEN
        ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_returns_store_id_fkey') THEN
        ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_returns_material_issue_id_fkey') THEN
        ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_material_issue_id_fkey" FOREIGN KEY ("material_issue_id") REFERENCES "material_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_returns_returned_by_id_fkey') THEN
        ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_returned_by_id_fkey" FOREIGN KEY ("returned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_returns_verified_by_id_fkey') THEN
        ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for material_return_lines
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_return_lines_tenant_id_fkey') THEN
        ALTER TABLE "material_return_lines" ADD CONSTRAINT "material_return_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_return_lines_material_return_id_fkey') THEN
        ALTER TABLE "material_return_lines" ADD CONSTRAINT "material_return_lines_material_return_id_fkey" FOREIGN KEY ("material_return_id") REFERENCES "material_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_return_lines_material_issue_line_id_fkey') THEN
        ALTER TABLE "material_return_lines" ADD CONSTRAINT "material_return_lines_material_issue_line_id_fkey" FOREIGN KEY ("material_issue_line_id") REFERENCES "material_issue_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_return_lines_material_id_fkey') THEN
        ALTER TABLE "material_return_lines" ADD CONSTRAINT "material_return_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for material_return_sequences
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_return_sequences_tenant_id_fkey') THEN
        ALTER TABLE "material_return_sequences" ADD CONSTRAINT "material_return_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_return_sequences_project_id_fkey') THEN
        ALTER TABLE "material_return_sequences" ADD CONSTRAINT "material_return_sequences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
