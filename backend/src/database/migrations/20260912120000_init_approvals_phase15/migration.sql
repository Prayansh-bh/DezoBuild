-- DEZOBUILD Phase 15: Central Approval Engine & Controlled Workflow Governance Migration

-- 1. Create Enums
CREATE TYPE "ApprovalPolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'INACTIVE');
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED');
CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED', 'SKIPPED');
CREATE TYPE "ApprovalDecisionType" AS ENUM ('APPROVE', 'REJECT', 'RETURN', 'CANCEL');
CREATE TYPE "ApprovalEntityType" AS ENUM (
    'PURCHASE_ORDER',
    'RA_BILL',
    'VENDOR_INVOICE',
    'EXPENSE_CLAIM',
    'PAYMENT_VOUCHER',
    'DAILY_PROGRESS_REPORT',
    'DIGITAL_MB',
    'INSPECTION_REQUEST',
    'NON_CONFORMANCE_REPORT',
    'MATERIAL_INDENT',
    'MATERIAL_ISSUE',
    'MATERIAL_TRANSFER',
    'LEAVE_RECORD',
    'ATTENDANCE_REGULARIZATION',
    'LABOUR_MUSTER_RECORD'
);

-- 2. Create Table: approval_policies
CREATE TABLE "approval_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID,
    "entity_type" "ApprovalEntityType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "min_amount" DECIMAL(15, 2),
    "max_amount" DECIMAL(15, 2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" "ApprovalPolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "previous_policy_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approval_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_policies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_policies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_policies_previous_policy_id_fkey" FOREIGN KEY ("previous_policy_id") REFERENCES "approval_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "approval_policies_tenant_id_entity_type_status_idx" ON "approval_policies"("tenant_id", "entity_type", "status");
CREATE INDEX "approval_policies_tenant_id_project_id_idx" ON "approval_policies"("tenant_id", "project_id");

-- 3. Create Table: approval_policy_steps
CREATE TABLE "approval_policy_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "step_name" VARCHAR(100) NOT NULL,
    "required_role_hint" VARCHAR(50),
    "required_permission" VARCHAR(100) NOT NULL,
    "enforce_maker_checker" BOOLEAN NOT NULL DEFAULT true,
    "enforce_distinct_from_prev" BOOLEAN NOT NULL DEFAULT false,
    "timeout_hours" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_policy_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approval_policy_steps_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "approval_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "approval_policy_steps_policy_id_step_order_key" ON "approval_policy_steps"("policy_id", "step_order");

-- 4. Create Table: approval_requests
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID,
    "request_number" VARCHAR(100) NOT NULL,
    "entity_type" "ApprovalEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "monetary_amount" DECIMAL(15, 2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "current_step_order" INTEGER NOT NULL DEFAULT 1,
    "total_steps" INTEGER NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "policy_snapshot" JSONB NOT NULL,
    "submission_remarks" TEXT,
    "previous_request_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approval_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_requests_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_requests_previous_request_id_fkey" FOREIGN KEY ("previous_request_id") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "approval_requests_tenant_id_request_number_key" ON "approval_requests"("tenant_id", "request_number");
CREATE INDEX "approval_requests_tenant_id_project_id_status_idx" ON "approval_requests"("tenant_id", "project_id", "status");
CREATE INDEX "approval_requests_tenant_id_entity_type_entity_id_idx" ON "approval_requests"("tenant_id", "entity_type", "entity_id");

-- Partial Unique Index for Single Active Request per (tenant_id, entity_type, entity_id)
CREATE UNIQUE INDEX "approval_requests_active_entity_unique" ON "approval_requests"("tenant_id", "entity_type", "entity_id") WHERE "status" IN ('SUBMITTED', 'IN_REVIEW');

-- 5. Create Table: approval_steps
CREATE TABLE "approval_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "step_name" VARCHAR(100) NOT NULL,
    "required_role_hint" VARCHAR(50),
    "required_permission" VARCHAR(100) NOT NULL,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_user_id" UUID,
    "due_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approval_steps_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "approval_steps_request_id_step_order_key" ON "approval_steps"("request_id", "step_order");
CREATE INDEX "approval_steps_request_id_status_idx" ON "approval_steps"("request_id", "status");

-- 6. Create Table: approval_decisions
CREATE TABLE "approval_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "step_id" UUID,
    "step_order" INTEGER NOT NULL,
    "actor_id" UUID NOT NULL,
    "decision" "ApprovalDecisionType" NOT NULL,
    "decision_reason" TEXT,
    "policy_context" JSONB,
    "previous_state" VARCHAR(50) NOT NULL,
    "resulting_state" VARCHAR(50) NOT NULL,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approval_decisions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_decisions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "approval_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_decisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "approval_decisions_request_id_created_at_idx" ON "approval_decisions"("request_id", "created_at");
CREATE INDEX "approval_decisions_actor_id_created_at_idx" ON "approval_decisions"("actor_id", "created_at");
