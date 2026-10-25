-- DEZOBUILD Phase 12: Equipment / Machinery / Fuel / Maintenance Authoritative Migration

-- 1. Equipment Masters
CREATE TABLE "equipment_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "equipment_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "equipment_type" VARCHAR(100) NOT NULL,
    "manufacturer" VARCHAR(100),
    "model_number" VARCHAR(100),
    "serial_number" VARCHAR(100),
    "year_of_manufacture" INTEGER,
    "registration_number" VARCHAR(50),
    "ownership_type" VARCHAR(50) NOT NULL DEFAULT 'OWNED',
    "owner_vendor_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    "meter_type" VARCHAR(50) NOT NULL DEFAULT 'HOURS',
    "current_meter_reading" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fuel_type" VARCHAR(50),
    "fuel_efficiency_norm" DECIMAL(8,2),
    "default_hourly_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monthly_rental_amount" DECIMAL(15,2),
    "current_branch_id" UUID,
    "current_project_id" UUID,
    "insurance_expiry_date" DATE,
    "fitness_expiry_date" DATE,
    "puc_expiry_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_masters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_eq_meter_non_neg" CHECK (current_meter_reading >= 0),
    CONSTRAINT "chk_eq_rates_non_neg" CHECK (
        default_hourly_rate >= 0 AND 
        (monthly_rental_amount IS NULL OR monthly_rental_amount >= 0) AND 
        (fuel_efficiency_norm IS NULL OR fuel_efficiency_norm >= 0)
    ),
    CONSTRAINT "chk_eq_year" CHECK (year_of_manufacture IS NULL OR (year_of_manufacture >= 1900 AND year_of_manufacture <= 2100))
);

-- 2. Equipment Assignments (Authoritative Deployment Ledger)
CREATE TABLE "equipment_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "assigned_from" TIMESTAMPTZ NOT NULL,
    "assigned_to" TIMESTAMPTZ,
    "actual_returned_at" TIMESTAMPTZ,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "purpose" VARCHAR(255),
    "assigned_by_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_assignment_dates" CHECK (assigned_to IS NULL OR assigned_to >= assigned_from),
    CONSTRAINT "chk_return_after_start" CHECK (actual_returned_at IS NULL OR actual_returned_at >= assigned_from)
);

-- 3. Equipment Operating Logs (Shift Meter & Lineage)
CREATE TABLE "equipment_operating_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "operator_employee_id" UUID,
    "log_date" DATE NOT NULL,
    "shift" VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    "start_meter" DECIMAL(12,2) NOT NULL,
    "end_meter" DECIMAL(12,2) NOT NULL,
    "operating_hours" DECIMAL(6,2) NOT NULL,
    "idle_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "breakdown_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "work_description" TEXT,
    "is_corrected" BOOLEAN NOT NULL DEFAULT false,
    "corrected_at" TIMESTAMPTZ,
    "corrected_by_id" UUID,
    "correction_reason" TEXT,
    "superseded_log_id" UUID,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_operating_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_operating_meter_monotonicity" CHECK (end_meter >= start_meter AND start_meter >= 0),
    CONSTRAINT "chk_operating_hours_non_neg" CHECK (operating_hours >= 0 AND idle_hours >= 0 AND breakdown_hours >= 0),
    CONSTRAINT "chk_operating_hours_daily_limit" CHECK (operating_hours + idle_hours + breakdown_hours <= 24)
);

-- 4. Equipment Fuel Logs (Fuel Dispensing & Source Integrity)
CREATE TABLE "equipment_fuel_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "store_id" UUID,
    "material_issue_id" UUID,
    "slip_number" VARCHAR(50) NOT NULL,
    "idempotency_key" VARCHAR(255),
    "fuel_date" DATE NOT NULL,
    "fuel_type" VARCHAR(50) NOT NULL DEFAULT 'DIESEL',
    "quantity_liters" DECIMAL(12,4) NOT NULL,
    "unit_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "meter_reading" DECIMAL(12,2) NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'INTERNAL_STORE',
    "supplier_vendor_id" UUID,
    "invoice_number" VARCHAR(100),
    "dispensed_by_id" UUID NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_fuel_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_fuel_qty_positive" CHECK (quantity_liters > 0),
    CONSTRAINT "chk_fuel_meter_non_neg" CHECK (meter_reading >= 0),
    CONSTRAINT "chk_fuel_costs_non_neg" CHECK (unit_rate >= 0 AND total_cost >= 0),
    CONSTRAINT "chk_fuel_source_integrity" CHECK (
        (source = 'INTERNAL_STORE' AND material_issue_id IS NOT NULL AND store_id IS NOT NULL) OR
        (source = 'EXTERNAL_VENDOR' AND (supplier_vendor_id IS NOT NULL OR invoice_number IS NOT NULL)) OR
        (source = 'SITE_BOWSER' AND (store_id IS NOT NULL OR supplier_vendor_id IS NOT NULL))
    )
);

-- 5. Maintenance Schedules (Preventive Plans)
CREATE TABLE "maintenance_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "maintenance_type" VARCHAR(50) NOT NULL DEFAULT 'PREVENTIVE',
    "interval_meter_hours" DECIMAL(10,2),
    "interval_days" INTEGER,
    "last_completed_meter" DECIMAL(12,2),
    "last_completed_date" DATE,
    "next_due_meter" DECIMAL(12,2),
    "next_due_date" DATE,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_schedule_intervals" CHECK (
        (interval_meter_hours IS NULL OR interval_meter_hours > 0) AND 
        (interval_days IS NULL OR interval_days > 0)
    ),
    CONSTRAINT "chk_schedule_meters_non_neg" CHECK (
        (last_completed_meter IS NULL OR last_completed_meter >= 0) AND 
        (next_due_meter IS NULL OR next_due_meter >= 0)
    )
);

-- 6. Maintenance Work Orders (Execution & Costs)
CREATE TABLE "maintenance_work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "project_id" UUID,
    "schedule_id" UUID,
    "work_order_number" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'PREVENTIVE',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "reported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reported_by_id" UUID NOT NULL,
    "breakdown_start_at" TIMESTAMPTZ,
    "breakdown_end_at" TIMESTAMPTZ,
    "downtime_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "symptoms" TEXT,
    "root_cause" TEXT,
    "work_done" TEXT,
    "service_provider_type" VARCHAR(50) NOT NULL DEFAULT 'INTERNAL',
    "service_vendor_id" UUID,
    "technician_name" VARCHAR(255),
    "technician_phone" VARCHAR(50),
    "material_issue_id" UUID,
    "parts_replaced_summary" TEXT,
    "meter_reading_at_service" DECIMAL(12,2),
    "labour_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "parts_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vendor_service_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "completed_by_id" UUID,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_work_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_wo_costs_non_neg" CHECK (labour_cost >= 0 AND parts_cost >= 0 AND vendor_service_cost >= 0 AND total_cost >= 0),
    CONSTRAINT "chk_breakdown_dates" CHECK (breakdown_end_at IS NULL OR breakdown_start_at IS NULL OR breakdown_end_at >= breakdown_start_at),
    CONSTRAINT "chk_wo_downtime_non_neg" CHECK (downtime_hours >= 0),
    CONSTRAINT "chk_wo_meter_non_neg" CHECK (meter_reading_at_service IS NULL OR meter_reading_at_service >= 0)
);

-- 7. Equipment Audit Logs (Append-Only)
CREATE TABLE "equipment_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "actor_id" UUID NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_audit_logs_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- UNIQUE CONSTRAINTS & INDEXES
-- ==========================================

-- Equipment Masters
CREATE UNIQUE INDEX "equipment_masters_tenant_id_equipment_code_key" ON "equipment_masters"("tenant_id", "equipment_code");
CREATE INDEX "equipment_masters_tenant_id_status_idx" ON "equipment_masters"("tenant_id", "status");
CREATE INDEX "equipment_masters_tenant_id_current_project_id_idx" ON "equipment_masters"("tenant_id", "current_project_id");

-- Equipment Assignments
CREATE UNIQUE INDEX "uq_equipment_single_active_assignment" ON "equipment_assignments"("tenant_id", "equipment_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "equipment_assignments_tenant_id_equipment_id_status_idx" ON "equipment_assignments"("tenant_id", "equipment_id", "status");
CREATE INDEX "equipment_assignments_tenant_id_project_id_status_idx" ON "equipment_assignments"("tenant_id", "project_id", "status");

-- Equipment Operating Logs
CREATE UNIQUE INDEX "uq_operating_log_active_shift" ON "equipment_operating_logs"("tenant_id", "equipment_id", "log_date", "shift") WHERE "is_corrected" = false;
CREATE INDEX "equipment_operating_logs_tenant_id_equipment_id_log_date_idx" ON "equipment_operating_logs"("tenant_id", "equipment_id", "log_date");
CREATE INDEX "equipment_operating_logs_tenant_id_project_id_log_date_idx" ON "equipment_operating_logs"("tenant_id", "project_id", "log_date");

-- Equipment Fuel Logs
CREATE UNIQUE INDEX "equipment_fuel_logs_tenant_id_slip_number_key" ON "equipment_fuel_logs"("tenant_id", "slip_number");
CREATE UNIQUE INDEX "uq_fuel_log_idempotency" ON "equipment_fuel_logs"("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX "equipment_fuel_logs_tenant_id_equipment_id_fuel_date_idx" ON "equipment_fuel_logs"("tenant_id", "equipment_id", "fuel_date");
CREATE INDEX "equipment_fuel_logs_tenant_id_project_id_fuel_date_idx" ON "equipment_fuel_logs"("tenant_id", "project_id", "fuel_date");

-- Maintenance Schedules
CREATE INDEX "maintenance_schedules_tenant_id_equipment_id_idx" ON "maintenance_schedules"("tenant_id", "equipment_id");
CREATE INDEX "maintenance_schedules_tenant_id_next_due_date_idx" ON "maintenance_schedules"("tenant_id", "next_due_date");

-- Maintenance Work Orders
CREATE UNIQUE INDEX "maintenance_work_orders_tenant_id_work_order_number_key" ON "maintenance_work_orders"("tenant_id", "work_order_number");
CREATE INDEX "maintenance_work_orders_tenant_id_equipment_id_status_idx" ON "maintenance_work_orders"("tenant_id", "equipment_id", "status");
CREATE INDEX "maintenance_work_orders_tenant_id_category_idx" ON "maintenance_work_orders"("tenant_id", "category");

-- Equipment Audit Logs
CREATE INDEX "equipment_audit_logs_tenant_id_equipment_id_created_at_idx" ON "equipment_audit_logs"("tenant_id", "equipment_id", "created_at");
CREATE INDEX "equipment_audit_logs_tenant_id_entity_type_entity_id_idx" ON "equipment_audit_logs"("tenant_id", "entity_type", "entity_id");

-- ==========================================
-- FOREIGN KEY CONSTRAINTS
-- ==========================================

-- Equipment Masters
ALTER TABLE "equipment_masters" ADD CONSTRAINT "equipment_masters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_masters" ADD CONSTRAINT "equipment_masters_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_masters" ADD CONSTRAINT "equipment_masters_current_branch_id_fkey" FOREIGN KEY ("current_branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_masters" ADD CONSTRAINT "equipment_masters_current_project_id_fkey" FOREIGN KEY ("current_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_masters" ADD CONSTRAINT "equipment_masters_owner_vendor_id_fkey" FOREIGN KEY ("owner_vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Equipment Assignments
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Equipment Operating Logs
ALTER TABLE "equipment_operating_logs" ADD CONSTRAINT "equipment_operating_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_operating_logs" ADD CONSTRAINT "equipment_operating_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_operating_logs" ADD CONSTRAINT "equipment_operating_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_operating_logs" ADD CONSTRAINT "equipment_operating_logs_operator_employee_id_fkey" FOREIGN KEY ("operator_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_operating_logs" ADD CONSTRAINT "equipment_operating_logs_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_operating_logs" ADD CONSTRAINT "equipment_operating_logs_corrected_by_id_fkey" FOREIGN KEY ("corrected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_operating_logs" ADD CONSTRAINT "equipment_operating_logs_superseded_log_id_fkey" FOREIGN KEY ("superseded_log_id") REFERENCES "equipment_operating_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Equipment Fuel Logs
ALTER TABLE "equipment_fuel_logs" ADD CONSTRAINT "equipment_fuel_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_fuel_logs" ADD CONSTRAINT "equipment_fuel_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_fuel_logs" ADD CONSTRAINT "equipment_fuel_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_fuel_logs" ADD CONSTRAINT "equipment_fuel_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_fuel_logs" ADD CONSTRAINT "equipment_fuel_logs_material_issue_id_fkey" FOREIGN KEY ("material_issue_id") REFERENCES "material_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_fuel_logs" ADD CONSTRAINT "equipment_fuel_logs_supplier_vendor_id_fkey" FOREIGN KEY ("supplier_vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_fuel_logs" ADD CONSTRAINT "equipment_fuel_logs_dispensed_by_id_fkey" FOREIGN KEY ("dispensed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Maintenance Schedules
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Maintenance Work Orders
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "maintenance_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_service_vendor_id_fkey" FOREIGN KEY ("service_vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_material_issue_id_fkey" FOREIGN KEY ("material_issue_id") REFERENCES "material_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Equipment Audit Logs
ALTER TABLE "equipment_audit_logs" ADD CONSTRAINT "equipment_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_audit_logs" ADD CONSTRAINT "equipment_audit_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
