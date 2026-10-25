-- DEZOBUILD Phase 11: People / Attendance / Workforce Authoritative Migration

-- 1. Employees Master
CREATE TABLE "employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "employee_number" VARCHAR(50) NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "department_id" UUID,
    "reporting_manager_id" UUID,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "designation" VARCHAR(100) NOT NULL,
    "employment_type" VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    "employment_status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "joining_date" DATE NOT NULL,
    "exit_date" DATE,
    "emergency_contact_name" VARCHAR(255),
    "emergency_contact_phone" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_employee_dates" CHECK (exit_date IS NULL OR exit_date >= joining_date)
);

-- 2. Shift Masters
CREATE TABLE "shift_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 15,
    "half_day_threshold_minutes" INTEGER NOT NULL DEFAULT 240,
    "full_day_threshold_minutes" INTEGER NOT NULL DEFAULT 480,
    "is_night_shift" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_masters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_shift_thresholds" CHECK (half_day_threshold_minutes >= 0 AND full_day_threshold_minutes >= half_day_threshold_minutes AND grace_period_minutes >= 0)
);

-- 3. Attendance Punches (Immutable Telemetry)
CREATE TABLE "attendance_punches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "punch_time" TIMESTAMPTZ NOT NULL,
    "punch_type" VARCHAR(20) NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'ONLINE',
    "gps_latitude" DECIMAL(10,7),
    "gps_longitude" DECIMAL(10,7),
    "accuracy_meters" DECIMAL(8,2),
    "device_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_punches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_punch_coords" CHECK (
        (gps_latitude IS NULL OR (gps_latitude >= -90 AND gps_latitude <= 90)) AND
        (gps_longitude IS NULL OR (gps_longitude >= -180 AND gps_longitude <= 180)) AND
        (accuracy_meters IS NULL OR accuracy_meters >= 0)
    )
);

-- 4. Attendance Records (Daily Synthesized State)
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "project_id" UUID,
    "shift_id" UUID,
    "attendance_date" DATE NOT NULL,
    "check_in_time" TIMESTAMPTZ,
    "check_out_time" TIMESTAMPTZ,
    "total_work_minutes" INTEGER NOT NULL DEFAULT 0,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_out_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
    "source" VARCHAR(50) NOT NULL DEFAULT 'ONLINE',
    "is_regularized" BOOLEAN NOT NULL DEFAULT false,
    "regularization_id" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_attendance_minutes_non_negative" CHECK (
        total_work_minutes >= 0 AND
        late_minutes >= 0 AND
        early_out_minutes >= 0 AND
        overtime_minutes >= 0
    )
);

-- 5. Attendance Regularizations
CREATE TABLE "attendance_regularizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_record_id" UUID,
    "requested_date" DATE NOT NULL,
    "requested_check_in" TIMESTAMPTZ,
    "requested_check_out" TIMESTAMPTZ,
    "requested_status" VARCHAR(50) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    "requested_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_regularizations_pkey" PRIMARY KEY ("id")
);

-- 6. Labour Contractors
CREATE TABLE "labour_contractors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vendor_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "trade" VARCHAR(100) NOT NULL,
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(50),
    "default_daily_wage_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labour_contractors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_wage_rate_non_negative" CHECK (default_daily_wage_rate >= 0)
);

-- 7. Labour Muster Records
CREATE TABLE "labour_muster_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,
    "shift_id" UUID,
    "muster_date" DATE NOT NULL,
    "skilled_count" INTEGER NOT NULL DEFAULT 0,
    "semi_skilled_count" INTEGER NOT NULL DEFAULT 0,
    "unskilled_count" INTEGER NOT NULL DEFAULT 0,
    "supervisor_count" INTEGER NOT NULL DEFAULT 0,
    "total_headcount" INTEGER NOT NULL DEFAULT 0,
    "regular_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "recorded_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labour_muster_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_muster_headcount_non_negative" CHECK (
        skilled_count >= 0 AND
        semi_skilled_count >= 0 AND
        unskilled_count >= 0 AND
        supervisor_count >= 0 AND
        total_headcount >= 0
    ),
    CONSTRAINT "chk_muster_headcount_sum" CHECK (
        total_headcount = skilled_count + semi_skilled_count + unskilled_count + supervisor_count
    ),
    CONSTRAINT "chk_muster_hours_non_negative" CHECK (
        regular_hours >= 0 AND
        overtime_hours >= 0
    )
);

-- 8. Leave Records
CREATE TABLE "leave_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DECIMAL(4,1) NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_leave_dates" CHECK (end_date >= start_date AND total_days > 0)
);

-- 9. Holiday Calendars
CREATE TABLE "holiday_calendars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "holiday_date" DATE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "branch_id" UUID,
    "project_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("id")
);

-- 10. People Audit Logs
CREATE TABLE "people_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "actor_id" UUID NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "people_audit_logs_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- UNIQUE CONSTRAINTS & INDEXES
-- ==========================================

-- Employees
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");
CREATE UNIQUE INDEX "employees_tenant_id_employee_number_key" ON "employees"("tenant_id", "employee_number");
CREATE INDEX "employees_tenant_id_employment_status_idx" ON "employees"("tenant_id", "employment_status");
CREATE INDEX "employees_tenant_id_company_id_idx" ON "employees"("tenant_id", "company_id");
CREATE INDEX "employees_tenant_id_department_id_idx" ON "employees"("tenant_id", "department_id");
CREATE INDEX "employees_tenant_id_reporting_manager_id_idx" ON "employees"("tenant_id", "reporting_manager_id");

-- Shift Masters
CREATE UNIQUE INDEX "shift_masters_tenant_id_code_key" ON "shift_masters"("tenant_id", "code");
CREATE INDEX "shift_masters_tenant_id_is_active_idx" ON "shift_masters"("tenant_id", "is_active");

-- Attendance Punches
CREATE UNIQUE INDEX "attendance_punches_tenant_id_employee_id_punch_time_punch_t_key" ON "attendance_punches"("tenant_id", "employee_id", "punch_time", "punch_type");
CREATE INDEX "attendance_punches_tenant_id_employee_id_punch_time_idx" ON "attendance_punches"("tenant_id", "employee_id", "punch_time");

-- Attendance Records
CREATE UNIQUE INDEX "attendance_records_tenant_id_employee_id_attendance_date_key" ON "attendance_records"("tenant_id", "employee_id", "attendance_date");
CREATE INDEX "attendance_records_tenant_id_attendance_date_idx" ON "attendance_records"("tenant_id", "attendance_date");
CREATE INDEX "attendance_records_tenant_id_project_id_attendance_date_idx" ON "attendance_records"("tenant_id", "project_id", "attendance_date");
CREATE INDEX "attendance_records_tenant_id_employee_id_attendance_date_idx" ON "attendance_records"("tenant_id", "employee_id", "attendance_date");

-- Attendance Regularizations
CREATE INDEX "attendance_regularizations_tenant_id_employee_id_status_idx" ON "attendance_regularizations"("tenant_id", "employee_id", "status");
CREATE INDEX "attendance_regularizations_tenant_id_status_idx" ON "attendance_regularizations"("tenant_id", "status");

-- Labour Contractors
CREATE UNIQUE INDEX "labour_contractors_tenant_id_code_key" ON "labour_contractors"("tenant_id", "code");
CREATE INDEX "labour_contractors_tenant_id_status_idx" ON "labour_contractors"("tenant_id", "status");

-- Labour Muster Records
CREATE UNIQUE INDEX "labour_muster_records_tenant_id_project_id_contractor_id_mu_key" ON "labour_muster_records"("tenant_id", "project_id", "contractor_id", "muster_date", "shift_id");
CREATE UNIQUE INDEX "uq_muster_shift_null" ON "labour_muster_records"("tenant_id", "project_id", "contractor_id", "muster_date") WHERE "shift_id" IS NULL;
CREATE INDEX "labour_muster_records_tenant_id_project_id_muster_date_idx" ON "labour_muster_records"("tenant_id", "project_id", "muster_date");
CREATE INDEX "labour_muster_records_tenant_id_status_idx" ON "labour_muster_records"("tenant_id", "status");

-- Leave Records
CREATE INDEX "leave_records_tenant_id_employee_id_status_idx" ON "leave_records"("tenant_id", "employee_id", "status");
CREATE INDEX "leave_records_tenant_id_status_idx" ON "leave_records"("tenant_id", "status");

-- Holiday Calendars (Scoped Partial Unique Indexes)
CREATE INDEX "holiday_calendars_tenant_id_holiday_date_idx" ON "holiday_calendars"("tenant_id", "holiday_date");
CREATE INDEX "holiday_calendars_tenant_id_branch_id_idx" ON "holiday_calendars"("tenant_id", "branch_id");
CREATE INDEX "holiday_calendars_tenant_id_project_id_idx" ON "holiday_calendars"("tenant_id", "project_id");
CREATE UNIQUE INDEX "uq_holidays_tenant_global" ON "holiday_calendars"("tenant_id", "holiday_date") WHERE "branch_id" IS NULL AND "project_id" IS NULL;
CREATE UNIQUE INDEX "uq_holidays_branch" ON "holiday_calendars"("tenant_id", "branch_id", "holiday_date") WHERE "branch_id" IS NOT NULL AND "project_id" IS NULL;
CREATE UNIQUE INDEX "uq_holidays_project" ON "holiday_calendars"("tenant_id", "project_id", "holiday_date") WHERE "project_id" IS NOT NULL;

-- People Audit Logs
CREATE INDEX "people_audit_logs_tenant_id_entity_type_entity_id_idx" ON "people_audit_logs"("tenant_id", "entity_type", "entity_id");
CREATE INDEX "people_audit_logs_tenant_id_created_at_idx" ON "people_audit_logs"("tenant_id", "created_at");

-- ==========================================
-- FOREIGN KEY CONSTRAINTS
-- ==========================================

-- Employees
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shift Masters
ALTER TABLE "shift_masters" ADD CONSTRAINT "shift_masters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Attendance Punches
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Attendance Records
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_regularization_id_fkey" FOREIGN KEY ("regularization_id") REFERENCES "attendance_regularizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Attendance Regularizations
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Labour Contractors
ALTER TABLE "labour_contractors" ADD CONSTRAINT "labour_contractors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "labour_contractors" ADD CONSTRAINT "labour_contractors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Labour Muster Records
ALTER TABLE "labour_muster_records" ADD CONSTRAINT "labour_muster_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "labour_muster_records" ADD CONSTRAINT "labour_muster_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "labour_muster_records" ADD CONSTRAINT "labour_muster_records_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "labour_contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "labour_muster_records" ADD CONSTRAINT "labour_muster_records_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "labour_muster_records" ADD CONSTRAINT "labour_muster_records_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "labour_muster_records" ADD CONSTRAINT "labour_muster_records_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Leave Records
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Holiday Calendars
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- People Audit Logs
ALTER TABLE "people_audit_logs" ADD CONSTRAINT "people_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
