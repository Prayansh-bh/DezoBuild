-- CreateTable material_issues
CREATE TABLE IF NOT EXISTS "material_issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "issue_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "issue_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_by_id" UUID NOT NULL,
    "issued_by_id" UUID,
    "issued_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "purpose" VARCHAR(255),
    "remarks" TEXT,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_issue_lines
CREATE TABLE IF NOT EXISTS "material_issue_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "material_issue_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_requested" DECIMAL(15,4) NOT NULL,
    "quantity_issued" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "uom" VARCHAR(20) NOT NULL,
    "wbs_node_id" UUID,
    "task_id" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_issue_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_issue_sequences
CREATE TABLE IF NOT EXISTS "material_issue_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "sequence_date" VARCHAR(10) NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_issue_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_issues_tenant_id_issue_number_key" ON "material_issues"("tenant_id", "issue_number");
CREATE INDEX IF NOT EXISTS "material_issues_tenant_id_project_id_idx" ON "material_issues"("tenant_id", "project_id");
CREATE INDEX IF NOT EXISTS "material_issues_tenant_id_store_id_idx" ON "material_issues"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "material_issues_tenant_id_status_idx" ON "material_issues"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "material_issues_tenant_id_issue_date_idx" ON "material_issues"("tenant_id", "issue_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "material_issue_lines_tenant_id_material_issue_id_idx" ON "material_issue_lines"("tenant_id", "material_issue_id");
CREATE INDEX IF NOT EXISTS "material_issue_lines_tenant_id_material_id_idx" ON "material_issue_lines"("tenant_id", "material_id");
CREATE INDEX IF NOT EXISTS "material_issue_lines_tenant_id_wbs_node_id_idx" ON "material_issue_lines"("tenant_id", "wbs_node_id");
CREATE INDEX IF NOT EXISTS "material_issue_lines_tenant_id_task_id_idx" ON "material_issue_lines"("tenant_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_issue_sequences_tenant_id_project_id_sequence_date_key" ON "material_issue_sequences"("tenant_id", "project_id", "sequence_date");
CREATE INDEX IF NOT EXISTS "material_issue_sequences_tenant_id_project_id_idx" ON "material_issue_sequences"("tenant_id", "project_id");

-- Foreign Keys for material_issues
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_tenant_id_fkey') THEN
        ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_project_id_fkey') THEN
        ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_store_id_fkey') THEN
        ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_requested_by_id_fkey') THEN
        ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_issued_by_id_fkey') THEN
        ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_approved_by_id_fkey') THEN
        ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_cancelled_by_id_fkey') THEN
        ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for material_issue_lines
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_lines_tenant_id_fkey') THEN
        ALTER TABLE "material_issue_lines" ADD CONSTRAINT "material_issue_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_lines_material_issue_id_fkey') THEN
        ALTER TABLE "material_issue_lines" ADD CONSTRAINT "material_issue_lines_material_issue_id_fkey" FOREIGN KEY ("material_issue_id") REFERENCES "material_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_lines_material_id_fkey') THEN
        ALTER TABLE "material_issue_lines" ADD CONSTRAINT "material_issue_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_lines_wbs_node_id_fkey') THEN
        ALTER TABLE "material_issue_lines" ADD CONSTRAINT "material_issue_lines_wbs_node_id_fkey" FOREIGN KEY ("wbs_node_id") REFERENCES "wbs_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_lines_task_id_fkey') THEN
        ALTER TABLE "material_issue_lines" ADD CONSTRAINT "material_issue_lines_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for material_issue_sequences
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_sequences_tenant_id_fkey') THEN
        ALTER TABLE "material_issue_sequences" ADD CONSTRAINT "material_issue_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_sequences_project_id_fkey') THEN
        ALTER TABLE "material_issue_sequences" ADD CONSTRAINT "material_issue_sequences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
