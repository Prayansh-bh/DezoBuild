-- DEZOBUILD Phase 13: QA/QC + Site Safety / Quality Management Authoritative Migration

-- 1. Inspection Requests
CREATE TABLE "inspection_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "wbs_node_id" UUID,
    "task_id" UUID,
    "material_id" UUID,
    "goods_receipt_id" UUID,
    "equipment_id" UUID,
    "original_inspection_request_id" UUID,
    "inspection_number" VARCHAR(50) NOT NULL,
    "inspection_type" VARCHAR(50) NOT NULL,
    "discipline" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "element" VARCHAR(255) NOT NULL,
    "grade_or_specification" VARCHAR(100),
    "planned_quantity" DECIMAL(12,3),
    "unit" VARCHAR(20),
    "is_hold_point" BOOLEAN NOT NULL DEFAULT false,
    "is_witness_point" BOOLEAN NOT NULL DEFAULT false,
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planned_inspection_at" TIMESTAMPTZ,
    "inspected_by_id" UUID,
    "inspected_at" TIMESTAMPTZ,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "result_remarks" TEXT,
    "conditional_remarks" TEXT,
    "conditional_action_id" UUID,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_insp_qty_non_neg" CHECK (planned_quantity IS NULL OR planned_quantity >= 0)
);

-- 2. Inspection Checklist Items
CREATE TABLE "inspection_checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "inspection_request_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "checkpoint_code" VARCHAR(50) NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "checkpoint_category" VARCHAR(100) NOT NULL,
    "checkpoint_description" TEXT NOT NULL,
    "acceptance_criteria" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "result" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "measured_value" DECIMAL(12,3),
    "unit" VARCHAR(20),
    "sample_reference" VARCHAR(100),
    "test_method" VARCHAR(100),
    "remarks" TEXT,
    "inspected_by_id" UUID,
    "inspected_at" TIMESTAMPTZ,
    "is_conforming" BOOLEAN,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_checklist_items_pkey" PRIMARY KEY ("id")
);

-- 3. Non-Conformance Reports (NCR)
CREATE TABLE "non_conformance_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "inspection_request_id" UUID,
    "ncr_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "responsible_vendor_id" UUID,
    "responsible_party" VARCHAR(255),
    "raised_by_id" UUID NOT NULL,
    "raised_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_closure_date" DATE NOT NULL,
    "root_cause" TEXT,
    "containment_action" TEXT,
    "corrective_action" TEXT,
    "preventive_action" TEXT,
    "verified_by_id" UUID,
    "closed_at" TIMESTAMPTZ,
    "closure_remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "non_conformance_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_ncr_target_date" CHECK (target_closure_date >= (raised_at::date))
);

-- 4. Quality & Safety Actions (CAPA)
CREATE TABLE "quality_safety_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "ncr_id" UUID,
    "incident_id" UUID,
    "observation_id" UUID,
    "action_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "assigned_to_id" UUID,
    "assigned_vendor_id" UUID,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "due_date" DATE NOT NULL,
    "created_by_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "completed_by_id" UUID,
    "completion_notes" TEXT,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ,
    "verification_remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_safety_actions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_act_source_xor" CHECK (
        (ncr_id IS NOT NULL AND incident_id IS NULL AND observation_id IS NULL) OR
        (ncr_id IS NULL AND incident_id IS NOT NULL AND observation_id IS NULL) OR
        (ncr_id IS NULL AND incident_id IS NULL AND observation_id IS NOT NULL)
    ),
    CONSTRAINT "chk_act_assignee_xor" CHECK (
        (assigned_to_id IS NOT NULL AND assigned_vendor_id IS NULL) OR
        (assigned_to_id IS NULL AND assigned_vendor_id IS NOT NULL)
    )
);

-- 5. Safety Observations & Walkthroughs
CREATE TABLE "safety_observations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "equipment_id" UUID,
    "observation_number" VARCHAR(50) NOT NULL,
    "observation_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "location" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "reported_by_id" UUID NOT NULL,
    "observed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tbt_topic" VARCHAR(255),
    "tbt_supervisor_id" UUID,
    "tbt_attendee_count" INTEGER,
    "tbt_trade" VARCHAR(100),
    "ppe_compliance_percent" DECIMAL(5,2),
    "scaffolding_safe" BOOLEAN,
    "electrical_safe" BOOLEAN,
    "housekeeping_rating" INTEGER,
    "likelihood" INTEGER NOT NULL DEFAULT 1,
    "severity_rating" INTEGER NOT NULL DEFAULT 1,
    "risk_score" INTEGER NOT NULL DEFAULT 1,
    "risk_level" VARCHAR(20) NOT NULL DEFAULT 'LOW',
    "controls" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "immediate_action_taken" TEXT,
    "closed_by_id" UUID,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_observations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_obs_tbt_attendees" CHECK (tbt_attendee_count IS NULL OR tbt_attendee_count >= 0),
    CONSTRAINT "chk_obs_ppe_percent" CHECK (ppe_compliance_percent IS NULL OR (ppe_compliance_percent >= 0 AND ppe_compliance_percent <= 100)),
    CONSTRAINT "chk_obs_housekeeping" CHECK (housekeeping_rating IS NULL OR (housekeeping_rating >= 1 AND housekeeping_rating <= 5)),
    CONSTRAINT "chk_obs_risk_scores" CHECK (
        likelihood >= 1 AND likelihood <= 5 AND
        severity_rating >= 1 AND severity_rating <= 5 AND
        risk_score = likelihood * severity_rating
    ),
    CONSTRAINT "chk_obs_risk_level" CHECK (
        (risk_score BETWEEN 1 AND 6 AND risk_level = 'LOW') OR
        (risk_score BETWEEN 7 AND 12 AND risk_level = 'MEDIUM') OR
        (risk_score BETWEEN 13 AND 19 AND risk_level = 'HIGH') OR
        (risk_score BETWEEN 20 AND 25 AND risk_level = 'CRITICAL')
    )
);

-- 6. Safety Incidents (EHS Event Register)
CREATE TABLE "safety_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "incident_number" VARCHAR(50) NOT NULL,
    "incident_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "reported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "reported_by_id" UUID NOT NULL,
    "injured_employee_id" UUID,
    "injured_person_name" VARCHAR(255),
    "injured_person_trade" VARCHAR(100),
    "lost_work_days" INTEGER NOT NULL DEFAULT 0,
    "likelihood" INTEGER NOT NULL DEFAULT 1,
    "severity_rating" INTEGER NOT NULL DEFAULT 1,
    "risk_score" INTEGER NOT NULL DEFAULT 1,
    "risk_level" VARCHAR(20) NOT NULL DEFAULT 'LOW',
    "status" VARCHAR(50) NOT NULL DEFAULT 'REPORTED',
    "immediate_action_taken" TEXT,
    "root_cause" TEXT,
    "investigated_by_id" UUID,
    "investigation_findings" TEXT,
    "closed_by_id" UUID,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_inc_dates" CHECK (occurred_at <= reported_at),
    CONSTRAINT "chk_inc_lost_days" CHECK (lost_work_days >= 0),
    CONSTRAINT "chk_inc_risk_scores" CHECK (
        likelihood >= 1 AND likelihood <= 5 AND
        severity_rating >= 1 AND severity_rating <= 5 AND
        risk_score = likelihood * severity_rating
    ),
    CONSTRAINT "chk_inc_risk_level" CHECK (
        (risk_score BETWEEN 1 AND 6 AND risk_level = 'LOW') OR
        (risk_score BETWEEN 7 AND 12 AND risk_level = 'MEDIUM') OR
        (risk_score BETWEEN 13 AND 19 AND risk_level = 'HIGH') OR
        (risk_score BETWEEN 20 AND 25 AND risk_level = 'CRITICAL')
    )
);

-- 7. Quality & Safety Audit Logs
CREATE TABLE "quality_safety_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "actor_id" UUID NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_safety_audit_logs_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- UNIQUE CONSTRAINTS & INDEXES
-- ============================================================

-- Inspection Request Unique & Indexes
CREATE UNIQUE INDEX "inspection_requests_tenant_id_inspection_number_key" ON "inspection_requests"("tenant_id", "inspection_number");
CREATE INDEX "inspection_requests_tenant_id_project_id_status_idx" ON "inspection_requests"("tenant_id", "project_id", "status");
CREATE INDEX "inspection_requests_tenant_id_inspection_type_idx" ON "inspection_requests"("tenant_id", "inspection_type");
CREATE INDEX "inspection_requests_tenant_id_is_hold_point_idx" ON "inspection_requests"("tenant_id", "is_hold_point");

-- Inspection Checklist Item Unique & Indexes
CREATE UNIQUE INDEX "uq_insp_item_seq" ON "inspection_checklist_items"("tenant_id", "inspection_request_id", "sequence_number");
CREATE UNIQUE INDEX "uq_insp_item_code" ON "inspection_checklist_items"("tenant_id", "inspection_request_id", "checkpoint_code");
CREATE INDEX "inspection_checklist_items_tenant_id_inspection_request_id_result_idx" ON "inspection_checklist_items"("tenant_id", "inspection_request_id", "result");

-- NCR Unique & Indexes
CREATE UNIQUE INDEX "non_conformance_reports_tenant_id_ncr_number_key" ON "non_conformance_reports"("tenant_id", "ncr_number");
CREATE INDEX "non_conformance_reports_tenant_id_project_id_status_idx" ON "non_conformance_reports"("tenant_id", "project_id", "status");
CREATE INDEX "non_conformance_reports_tenant_id_severity_idx" ON "non_conformance_reports"("tenant_id", "severity");

-- Action Unique & Indexes
CREATE UNIQUE INDEX "quality_safety_actions_tenant_id_action_number_key" ON "quality_safety_actions"("tenant_id", "action_number");
CREATE INDEX "quality_safety_actions_tenant_id_project_id_status_idx" ON "quality_safety_actions"("tenant_id", "project_id", "status");
CREATE INDEX "quality_safety_actions_tenant_id_ncr_id_idx" ON "quality_safety_actions"("tenant_id", "ncr_id");
CREATE INDEX "quality_safety_actions_tenant_id_incident_id_idx" ON "quality_safety_actions"("tenant_id", "incident_id");
CREATE INDEX "quality_safety_actions_tenant_id_observation_id_idx" ON "quality_safety_actions"("tenant_id", "observation_id");

-- Safety Observation Unique & Indexes
CREATE UNIQUE INDEX "safety_observations_tenant_id_observation_number_key" ON "safety_observations"("tenant_id", "observation_number");
CREATE INDEX "safety_observations_tenant_id_project_id_status_idx" ON "safety_observations"("tenant_id", "project_id", "status");
CREATE INDEX "safety_observations_tenant_id_observation_type_idx" ON "safety_observations"("tenant_id", "observation_type");
CREATE INDEX "safety_observations_tenant_id_risk_level_idx" ON "safety_observations"("tenant_id", "risk_level");

-- Safety Incident Unique & Indexes
CREATE UNIQUE INDEX "safety_incidents_tenant_id_incident_number_key" ON "safety_incidents"("tenant_id", "incident_number");
CREATE INDEX "safety_incidents_tenant_id_project_id_status_idx" ON "safety_incidents"("tenant_id", "project_id", "status");
CREATE INDEX "safety_incidents_tenant_id_incident_type_idx" ON "safety_incidents"("tenant_id", "incident_type");
CREATE INDEX "safety_incidents_tenant_id_risk_level_idx" ON "safety_incidents"("tenant_id", "risk_level");

-- Audit Log Indexes
CREATE INDEX "quality_safety_audit_logs_tenant_id_project_id_created_at_idx" ON "quality_safety_audit_logs"("tenant_id", "project_id", "created_at");
CREATE INDEX "quality_safety_audit_logs_tenant_id_entity_type_entity_id_idx" ON "quality_safety_audit_logs"("tenant_id", "entity_type", "entity_id");

-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================

-- Inspection Request FKs
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_wbs_node_id_fkey" FOREIGN KEY ("wbs_node_id") REFERENCES "wbs_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipt_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_original_inspection_request_id_fkey" FOREIGN KEY ("original_inspection_request_id") REFERENCES "inspection_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_inspected_by_id_fkey" FOREIGN KEY ("inspected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Inspection Checklist Item FKs
ALTER TABLE "inspection_checklist_items" ADD CONSTRAINT "inspection_checklist_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_checklist_items" ADD CONSTRAINT "inspection_checklist_items_inspection_request_id_fkey" FOREIGN KEY ("inspection_request_id") REFERENCES "inspection_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NCR FKs
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_inspection_request_id_fkey" FOREIGN KEY ("inspection_request_id") REFERENCES "inspection_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_responsible_vendor_id_fkey" FOREIGN KEY ("responsible_vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_raised_by_id_fkey" FOREIGN KEY ("raised_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformance_reports" ADD CONSTRAINT "non_conformance_reports_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Action FKs
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_ncr_id_fkey" FOREIGN KEY ("ncr_id") REFERENCES "non_conformance_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "safety_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "safety_observations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_assigned_vendor_id_fkey" FOREIGN KEY ("assigned_vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quality_safety_actions" ADD CONSTRAINT "quality_safety_actions_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Safety Observation FKs
ALTER TABLE "safety_observations" ADD CONSTRAINT "safety_observations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_observations" ADD CONSTRAINT "safety_observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_observations" ADD CONSTRAINT "safety_observations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safety_observations" ADD CONSTRAINT "safety_observations_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_observations" ADD CONSTRAINT "safety_observations_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Safety Incident FKs
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_injured_employee_id_fkey" FOREIGN KEY ("injured_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_investigated_by_id_fkey" FOREIGN KEY ("investigated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Audit Log FKs
ALTER TABLE "quality_safety_audit_logs" ADD CONSTRAINT "quality_safety_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_safety_audit_logs" ADD CONSTRAINT "quality_safety_audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
