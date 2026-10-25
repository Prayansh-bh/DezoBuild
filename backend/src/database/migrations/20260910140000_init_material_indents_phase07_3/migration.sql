-- CreateTable material_indents
CREATE TABLE IF NOT EXISTS "material_indents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "store_id" UUID,
    "indent_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "requested_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "required_by_date" DATE NOT NULL,
    "remarks" TEXT,
    "created_by_id" UUID NOT NULL,
    "submitted_by_id" UUID,
    "submitted_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "approval_remarks" TEXT,
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_indents_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_indent_lines
CREATE TABLE IF NOT EXISTS "material_indent_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "indent_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_requested" DECIMAL(15,4) NOT NULL,
    "quantity_fulfilled" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "uom" VARCHAR(20) NOT NULL,
    "purpose" VARCHAR(255),
    "wbs_node_id" UUID,
    "task_id" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_indent_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_indent_sequences
CREATE TABLE IF NOT EXISTS "material_indent_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "sequence_date" VARCHAR(10) NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_indent_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_indents_tenant_id_indent_number_key" ON "material_indents"("tenant_id", "indent_number");
CREATE INDEX IF NOT EXISTS "material_indents_tenant_id_project_id_idx" ON "material_indents"("tenant_id", "project_id");
CREATE INDEX IF NOT EXISTS "material_indents_tenant_id_status_idx" ON "material_indents"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "material_indents_project_id_status_idx" ON "material_indents"("project_id", "status");
CREATE INDEX IF NOT EXISTS "material_indents_tenant_id_required_by_date_idx" ON "material_indents"("tenant_id", "required_by_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_indent_lines_indent_id_material_id_key" ON "material_indent_lines"("indent_id", "material_id");
CREATE INDEX IF NOT EXISTS "material_indent_lines_tenant_id_indent_id_idx" ON "material_indent_lines"("tenant_id", "indent_id");
CREATE INDEX IF NOT EXISTS "material_indent_lines_tenant_id_material_id_idx" ON "material_indent_lines"("tenant_id", "material_id");
CREATE INDEX IF NOT EXISTS "material_indent_lines_tenant_id_wbs_node_id_idx" ON "material_indent_lines"("tenant_id", "wbs_node_id");
CREATE INDEX IF NOT EXISTS "material_indent_lines_tenant_id_task_id_idx" ON "material_indent_lines"("tenant_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "material_indent_sequences_tenant_id_project_id_sequence_date_key" ON "material_indent_sequences"("tenant_id", "project_id", "sequence_date");
CREATE INDEX IF NOT EXISTS "material_indent_sequences_tenant_id_project_id_idx" ON "material_indent_sequences"("tenant_id", "project_id");

-- Foreign Keys for material_indents
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indents_tenant_id_fkey') THEN
        ALTER TABLE "material_indents" ADD CONSTRAINT "material_indents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indents_project_id_fkey') THEN
        ALTER TABLE "material_indents" ADD CONSTRAINT "material_indents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indents_store_id_fkey') THEN
        ALTER TABLE "material_indents" ADD CONSTRAINT "material_indents_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indents_created_by_id_fkey') THEN
        ALTER TABLE "material_indents" ADD CONSTRAINT "material_indents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indents_submitted_by_id_fkey') THEN
        ALTER TABLE "material_indents" ADD CONSTRAINT "material_indents_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indents_approved_by_id_fkey') THEN
        ALTER TABLE "material_indents" ADD CONSTRAINT "material_indents_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indents_rejected_by_id_fkey') THEN
        ALTER TABLE "material_indents" ADD CONSTRAINT "material_indents_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indents_cancelled_by_id_fkey') THEN
        ALTER TABLE "material_indents" ADD CONSTRAINT "material_indents_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for material_indent_lines
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indent_lines_tenant_id_fkey') THEN
        ALTER TABLE "material_indent_lines" ADD CONSTRAINT "material_indent_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indent_lines_indent_id_fkey') THEN
        ALTER TABLE "material_indent_lines" ADD CONSTRAINT "material_indent_lines_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "material_indents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indent_lines_material_id_fkey') THEN
        ALTER TABLE "material_indent_lines" ADD CONSTRAINT "material_indent_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indent_lines_wbs_node_id_fkey') THEN
        ALTER TABLE "material_indent_lines" ADD CONSTRAINT "material_indent_lines_wbs_node_id_fkey" FOREIGN KEY ("wbs_node_id") REFERENCES "wbs_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indent_lines_task_id_fkey') THEN
        ALTER TABLE "material_indent_lines" ADD CONSTRAINT "material_indent_lines_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for material_indent_sequences
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indent_sequences_tenant_id_fkey') THEN
        ALTER TABLE "material_indent_sequences" ADD CONSTRAINT "material_indent_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_indent_sequences_project_id_fkey') THEN
        ALTER TABLE "material_indent_sequences" ADD CONSTRAINT "material_indent_sequences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
