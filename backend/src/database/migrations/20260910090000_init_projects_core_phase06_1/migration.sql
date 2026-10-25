-- AlterTable
ALTER TABLE "projects"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "project_type" VARCHAR(100),
  ADD COLUMN "location" VARCHAR(255),
  ADD COLUMN "address" TEXT,
  ADD COLUMN "city" VARCHAR(100),
  ADD COLUMN "state" VARCHAR(100),
  ADD COLUMN "pincode" VARCHAR(20),
  ADD COLUMN "planned_start_date" TIMESTAMPTZ,
  ADD COLUMN "planned_end_date" TIMESTAMPTZ,
  ADD COLUMN "actual_start_date" TIMESTAMPTZ,
  ADD COLUMN "actual_end_date" TIMESTAMPTZ,
  ADD COLUMN "estimated_budget" DECIMAL(15, 2),
  ADD COLUMN "contract_value" DECIMAL(15, 2),
  ADD COLUMN "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
  ADD COLUMN "site_area_sqft" DECIMAL(12, 2),
  ADD COLUMN "built_up_area_sqft" DECIMAL(12, 2);

-- AlterTable default status
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'PLANNING';

-- CreateIndex
CREATE INDEX "projects_tenant_id_planned_start_date_idx" ON "projects"("tenant_id", "planned_start_date");
