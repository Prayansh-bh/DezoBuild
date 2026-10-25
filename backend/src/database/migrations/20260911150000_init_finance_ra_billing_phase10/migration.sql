-- DEZOBUILD Phase 10: Finance / RA Billing / Commercial Subledger Authoritative Migration

-- 1. Expense Categories
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- 2. Expense Claims
CREATE TABLE "expense_claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "claim_number" VARCHAR(50) NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "claim_date" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "paid_to" VARCHAR(255) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "invoice_number" VARCHAR(100),
    "receipt_url" TEXT,
    "description" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_claims_pkey" PRIMARY KEY ("id")
);

-- 3. Vendor Invoices
CREATE TABLE "vendor_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "purchase_order_id" UUID,
    "invoice_number" VARCHAR(100) NOT NULL,
    "vendor_invoice_number" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "subtotal_amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "direct_charges_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gross_total" DECIMAL(15,2) NOT NULL,
    "advance_recovery" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "retention_withheld" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tds_deducted" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deductions_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_payable" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstanding_balance" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "verified_by_id" UUID,
    "approved_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_invoice_net_payable_non_negative" CHECK (net_payable >= 0 AND outstanding_balance >= 0 AND paid_amount >= 0)
);

-- 4. Vendor Invoice Lines
CREATE TABLE "vendor_invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "po_line_id" UUID,
    "material_id" UUID,
    "description" TEXT NOT NULL,
    "is_direct_charge" BOOLEAN NOT NULL DEFAULT false,
    "billed_quantity" DECIMAL(18,4) NOT NULL,
    "unit_rate" DECIMAL(18,4) NOT NULL,
    "tax_rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "vendor_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- 5. Vendor Invoice GRN Allocations (M:N Match)
CREATE TABLE "vendor_invoice_grn_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_line_id" UUID NOT NULL,
    "grn_line_id" UUID NOT NULL,
    "allocated_quantity" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_invoice_grn_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_grn_allocation_quantity_positive" CHECK (allocated_quantity > 0)
);

-- 6. Contractor Running Account (RA) Bills
CREATE TABLE "ra_bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "bill_number" VARCHAR(50) NOT NULL,
    "bill_sequence" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "period_start_date" DATE NOT NULL,
    "period_end_date" DATE NOT NULL,
    "bill_date" DATE NOT NULL,
    "gross_amount" DECIMAL(15,2) NOT NULL,
    "total_deductions" DECIMAL(15,2) NOT NULL,
    "net_payable" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstanding_balance" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "verified_by_id" UUID,
    "approved_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ra_bills_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_ra_bill_net_payable_non_negative" CHECK (net_payable >= 0 AND outstanding_balance >= 0 AND paid_amount >= 0)
);

-- 7. RA Bill Item Lines
CREATE TABLE "ra_bill_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ra_bill_id" UUID NOT NULL,
    "boq_item_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "uom" VARCHAR(50) NOT NULL,
    "contract_quantity" DECIMAL(18,4) NOT NULL,
    "unit_rate" DECIMAL(18,4) NOT NULL,
    "previous_cumulative_quantity" DECIMAL(18,4) NOT NULL,
    "cumulative_certified_quantity" DECIMAL(18,4) NOT NULL,
    "current_bill_quantity" DECIMAL(18,4) NOT NULL,
    "current_amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "ra_bill_items_pkey" PRIMARY KEY ("id")
);

-- 8. RA Bill Measurement Allocations (MB Linkage)
CREATE TABLE "ra_bill_measurement_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ra_bill_item_id" UUID NOT NULL,
    "digital_mb_record_id" UUID NOT NULL,
    "allocated_quantity" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ra_bill_measurement_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_mb_allocation_quantity_positive" CHECK (allocated_quantity > 0)
);

-- 9. RA Bill Structured Deductions
CREATE TABLE "ra_bill_deductions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ra_bill_id" UUID NOT NULL,
    "deduction_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "calculation_base" DECIMAL(15,2),
    "rate_percent" DECIMAL(5,2),
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "ra_bill_deductions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_deduction_amount_positive" CHECK (amount >= 0)
);

-- 10. Payment Vouchers
CREATE TABLE "payment_vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID,
    "voucher_number" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "payment_date" DATE NOT NULL,
    "payment_mode" VARCHAR(50) NOT NULL,
    "reference_number" VARCHAR(100) NOT NULL,
    "bank_account_ref" VARCHAR(100),
    "total_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "disbursed_by_id" UUID,
    "disbursed_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_vouchers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_voucher_total_amount_positive" CHECK (total_amount > 0)
);

-- 11. Payment Allocations
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "invoice_id" UUID,
    "ra_bill_id" UUID,
    "expense_claim_id" UUID,
    "allocated_amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_payment_allocation_single_target" CHECK (
        ((invoice_id IS NOT NULL)::int + (ra_bill_id IS NOT NULL)::int + (expense_claim_id IS NOT NULL)::int) = 1
    ),
    CONSTRAINT "chk_payment_allocation_amount_positive" CHECK (allocated_amount > 0)
);

-- 12. Advance Records
CREATE TABLE "advance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "advance_type" VARCHAR(50) NOT NULL,
    "vendor_id" UUID,
    "employee_id" UUID,
    "advance_number" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "advance_date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "recovered_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DISBURSED',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advance_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_advance_record_beneficiary" CHECK (
        ((vendor_id IS NOT NULL)::int + (employee_id IS NOT NULL)::int) = 1
    ),
    CONSTRAINT "chk_advance_record_amount_positive" CHECK (amount > 0 AND outstanding_amount >= 0 AND recovered_amount >= 0)
);

-- 13. Advance Recovery Allocations
CREATE TABLE "advance_recovery_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "advance_record_id" UUID NOT NULL,
    "invoice_id" UUID,
    "ra_bill_id" UUID,
    "recovery_amount" DECIMAL(15,2) NOT NULL,
    "recovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "advance_recovery_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_advance_recovery_single_target" CHECK (
        ((invoice_id IS NOT NULL)::int + (ra_bill_id IS NOT NULL)::int) = 1
    ),
    CONSTRAINT "chk_advance_recovery_amount_positive" CHECK (recovery_amount > 0)
);

-- 14. Retention Records
CREATE TABLE "retention_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "ra_bill_id" UUID,
    "invoice_id" UUID,
    "retained_amount" DECIMAL(15,2) NOT NULL,
    "released_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'HELD',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retention_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_retention_single_source" CHECK (
        ((ra_bill_id IS NOT NULL)::int + (invoice_id IS NOT NULL)::int) = 1
    ),
    CONSTRAINT "chk_retention_balance_non_negative" CHECK (retained_amount > 0 AND balance_amount >= 0 AND released_amount >= 0)
);

-- 15. Retention Release Allocations
CREATE TABLE "retention_release_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "retention_record_id" UUID NOT NULL,
    "payment_voucher_id" UUID NOT NULL,
    "release_amount" DECIMAL(15,2) NOT NULL,
    "released_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "retention_release_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_retention_release_amount_positive" CHECK (release_amount > 0)
);

-- 16. Applied Tax Lines
CREATE TABLE "applied_tax_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_line_id" UUID,
    "invoice_id" UUID,
    "ra_bill_id" UUID,
    "tax_type" VARCHAR(50) NOT NULL,
    "tax_rate_percent" DECIMAL(5,2) NOT NULL,
    "taxable_base_amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL,
    "jurisdiction" VARCHAR(100) NOT NULL,
    "effective_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applied_tax_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_applied_tax_single_parent" CHECK (
        ((invoice_id IS NOT NULL)::int + (ra_bill_id IS NOT NULL)::int) = 1
    )
);

-- 17. Finance Sequences
CREATE TABLE "finance_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_sequences_pkey" PRIMARY KEY ("id")
);

-- 18. Finance Audit Logs
CREATE TABLE "finance_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "actor_id" UUID NOT NULL,
    "previous_state" VARCHAR(50),
    "new_state" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- UNIQUE CONSTRAINTS & PARTIAL INDEXES
-- ==========================================

-- Expense Category Uniqueness
CREATE UNIQUE INDEX "expense_categories_tenant_id_code_key" ON "expense_categories"("tenant_id", "code");
CREATE INDEX "expense_categories_tenant_id_is_active_idx" ON "expense_categories"("tenant_id", "is_active");

-- Expense Claim Uniqueness & Indexes
CREATE UNIQUE INDEX "expense_claims_tenant_id_claim_number_key" ON "expense_claims"("tenant_id", "claim_number");
CREATE INDEX "expense_claims_tenant_id_project_id_status_idx" ON "expense_claims"("tenant_id", "project_id", "status");

-- Vendor Invoice Uniqueness & Indexes
CREATE UNIQUE INDEX "vendor_invoices_tenant_id_invoice_number_key" ON "vendor_invoices"("tenant_id", "invoice_number");
CREATE UNIQUE INDEX "vendor_invoices_tenant_id_vendor_id_vendor_invoice_number_key" ON "vendor_invoices"("tenant_id", "vendor_id", "vendor_invoice_number");
CREATE INDEX "vendor_invoices_tenant_id_project_id_status_due_date_idx" ON "vendor_invoices"("tenant_id", "project_id", "status", "due_date");

-- Vendor Invoice Line Indexes
CREATE INDEX "vendor_invoice_lines_tenant_id_invoice_id_idx" ON "vendor_invoice_lines"("tenant_id", "invoice_id");

-- GRN Allocation Indexes
CREATE INDEX "vendor_invoice_grn_allocations_tenant_id_invoice_line_id_idx" ON "vendor_invoice_grn_allocations"("tenant_id", "invoice_line_id");
CREATE INDEX "vendor_invoice_grn_allocations_tenant_id_grn_line_id_idx" ON "vendor_invoice_grn_allocations"("tenant_id", "grn_line_id");

-- RA Bill Uniqueness & Indexes
CREATE UNIQUE INDEX "ra_bills_tenant_id_bill_number_key" ON "ra_bills"("tenant_id", "bill_number");
CREATE UNIQUE INDEX "ra_bills_tenant_id_project_id_vendor_id_bill_sequence_key" ON "ra_bills"("tenant_id", "project_id", "vendor_id", "bill_sequence");
CREATE INDEX "ra_bills_tenant_id_project_id_status_idx" ON "ra_bills"("tenant_id", "project_id", "status");

-- CRITICAL: PostgreSQL Partial Unique Index for Active RA Bill Concurrency Control
CREATE UNIQUE INDEX "uq_ra_bills_active_per_vendor" ON "ra_bills"("tenant_id", "project_id", "vendor_id") WHERE "status" IN ('DRAFT', 'SUBMITTED', 'VERIFIED');

-- RA Bill Item Indexes
CREATE INDEX "ra_bill_items_tenant_id_ra_bill_id_idx" ON "ra_bill_items"("tenant_id", "ra_bill_id");
CREATE INDEX "ra_bill_items_tenant_id_boq_item_id_idx" ON "ra_bill_items"("tenant_id", "boq_item_id");

-- RA Bill Measurement Allocation Indexes
CREATE INDEX "ra_bill_measurement_allocations_tenant_id_ra_bill_item_id_idx" ON "ra_bill_measurement_allocations"("tenant_id", "ra_bill_item_id");
CREATE INDEX "ra_bill_measurement_allocations_tenant_id_digital_mb_record__idx" ON "ra_bill_measurement_allocations"("tenant_id", "digital_mb_record_id");

-- RA Bill Deduction Indexes
CREATE INDEX "ra_bill_deductions_tenant_id_ra_bill_id_idx" ON "ra_bill_deductions"("tenant_id", "ra_bill_id");

-- Payment Voucher Uniqueness & Indexes
CREATE UNIQUE INDEX "payment_vouchers_tenant_id_voucher_number_key" ON "payment_vouchers"("tenant_id", "voucher_number");
CREATE INDEX "payment_vouchers_tenant_id_status_payment_date_idx" ON "payment_vouchers"("tenant_id", "status", "payment_date");

-- Payment Allocation Indexes
CREATE INDEX "payment_allocations_tenant_id_voucher_id_idx" ON "payment_allocations"("tenant_id", "voucher_id");
CREATE INDEX "payment_allocations_tenant_id_invoice_id_idx" ON "payment_allocations"("tenant_id", "invoice_id");
CREATE INDEX "payment_allocations_tenant_id_ra_bill_id_idx" ON "payment_allocations"("tenant_id", "ra_bill_id");
CREATE INDEX "payment_allocations_tenant_id_expense_claim_id_idx" ON "payment_allocations"("tenant_id", "expense_claim_id");

-- Advance Record Uniqueness & Indexes
CREATE UNIQUE INDEX "advance_records_tenant_id_advance_number_key" ON "advance_records"("tenant_id", "advance_number");
CREATE INDEX "advance_records_tenant_id_project_id_status_idx" ON "advance_records"("tenant_id", "project_id", "status");

-- Advance Recovery Indexes
CREATE INDEX "advance_recovery_allocations_tenant_id_advance_record_id_idx" ON "advance_recovery_allocations"("tenant_id", "advance_record_id");
CREATE INDEX "advance_recovery_allocations_tenant_id_invoice_id_idx" ON "advance_recovery_allocations"("tenant_id", "invoice_id");
CREATE INDEX "advance_recovery_allocations_tenant_id_ra_bill_id_idx" ON "advance_recovery_allocations"("tenant_id", "ra_bill_id");

-- Retention Record Indexes
CREATE INDEX "retention_records_tenant_id_project_id_vendor_id_status_idx" ON "retention_records"("tenant_id", "project_id", "vendor_id", "status");

-- Retention Release Indexes
CREATE INDEX "retention_release_allocations_tenant_id_retention_record_id_idx" ON "retention_release_allocations"("tenant_id", "retention_record_id");
CREATE INDEX "retention_release_allocations_tenant_id_payment_voucher_id_idx" ON "retention_release_allocations"("tenant_id", "payment_voucher_id");

-- Applied Tax Line Indexes
CREATE INDEX "applied_tax_lines_tenant_id_invoice_id_idx" ON "applied_tax_lines"("tenant_id", "invoice_id");
CREATE INDEX "applied_tax_lines_tenant_id_ra_bill_id_idx" ON "applied_tax_lines"("tenant_id", "ra_bill_id");

-- Sequence Uniqueness
CREATE UNIQUE INDEX "finance_sequences_tenant_id_prefix_year_key" ON "finance_sequences"("tenant_id", "prefix", "year");

-- Audit Log Indexes
CREATE INDEX "finance_audit_logs_tenant_id_entity_type_entity_id_idx" ON "finance_audit_logs"("tenant_id", "entity_type", "entity_id");
CREATE INDEX "finance_audit_logs_tenant_id_created_at_idx" ON "finance_audit_logs"("tenant_id", "created_at");

-- ==========================================
-- FOREIGN KEY CONSTRAINTS
-- ==========================================

-- Expense Category FKs
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Expense Claim FKs
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Vendor Invoice FKs
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Vendor Invoice Line FKs
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Vendor Invoice GRN Allocation FKs
ALTER TABLE "vendor_invoice_grn_allocations" ADD CONSTRAINT "vendor_invoice_grn_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_invoice_grn_allocations" ADD CONSTRAINT "vendor_invoice_grn_allocations_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "vendor_invoice_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_invoice_grn_allocations" ADD CONSTRAINT "vendor_invoice_grn_allocations_grn_line_id_fkey" FOREIGN KEY ("grn_line_id") REFERENCES "goods_receipt_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RA Bill FKs
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ra_bills" ADD CONSTRAINT "ra_bills_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RA Bill Item FKs
ALTER TABLE "ra_bill_items" ADD CONSTRAINT "ra_bill_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ra_bill_items" ADD CONSTRAINT "ra_bill_items_ra_bill_id_fkey" FOREIGN KEY ("ra_bill_id") REFERENCES "ra_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ra_bill_items" ADD CONSTRAINT "ra_bill_items_boq_item_id_fkey" FOREIGN KEY ("boq_item_id") REFERENCES "boq_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RA Bill Measurement Allocation FKs
ALTER TABLE "ra_bill_measurement_allocations" ADD CONSTRAINT "ra_bill_measurement_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ra_bill_measurement_allocations" ADD CONSTRAINT "ra_bill_measurement_allocations_ra_bill_item_id_fkey" FOREIGN KEY ("ra_bill_item_id") REFERENCES "ra_bill_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ra_bill_measurement_allocations" ADD CONSTRAINT "ra_bill_measurement_allocations_digital_mb_record_id_fkey" FOREIGN KEY ("digital_mb_record_id") REFERENCES "digital_mb_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RA Bill Deduction FKs
ALTER TABLE "ra_bill_deductions" ADD CONSTRAINT "ra_bill_deductions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ra_bill_deductions" ADD CONSTRAINT "ra_bill_deductions_ra_bill_id_fkey" FOREIGN KEY ("ra_bill_id") REFERENCES "ra_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Payment Voucher FKs
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_disbursed_by_id_fkey" FOREIGN KEY ("disbursed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payment Allocation FKs
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "payment_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_ra_bill_id_fkey" FOREIGN KEY ("ra_bill_id") REFERENCES "ra_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_expense_claim_id_fkey" FOREIGN KEY ("expense_claim_id") REFERENCES "expense_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Advance Record FKs
ALTER TABLE "advance_records" ADD CONSTRAINT "advance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_records" ADD CONSTRAINT "advance_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_records" ADD CONSTRAINT "advance_records_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_records" ADD CONSTRAINT "advance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Advance Recovery FKs
ALTER TABLE "advance_recovery_allocations" ADD CONSTRAINT "advance_recovery_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_recovery_allocations" ADD CONSTRAINT "advance_recovery_allocations_advance_record_id_fkey" FOREIGN KEY ("advance_record_id") REFERENCES "advance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_recovery_allocations" ADD CONSTRAINT "advance_recovery_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_recovery_allocations" ADD CONSTRAINT "advance_recovery_allocations_ra_bill_id_fkey" FOREIGN KEY ("ra_bill_id") REFERENCES "ra_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Retention Record FKs
ALTER TABLE "retention_records" ADD CONSTRAINT "retention_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retention_records" ADD CONSTRAINT "retention_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retention_records" ADD CONSTRAINT "retention_records_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retention_records" ADD CONSTRAINT "retention_records_ra_bill_id_fkey" FOREIGN KEY ("ra_bill_id") REFERENCES "ra_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retention_records" ADD CONSTRAINT "retention_records_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Retention Release FKs
ALTER TABLE "retention_release_allocations" ADD CONSTRAINT "retention_release_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retention_release_allocations" ADD CONSTRAINT "retention_release_allocations_retention_record_id_fkey" FOREIGN KEY ("retention_record_id") REFERENCES "retention_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retention_release_allocations" ADD CONSTRAINT "retention_release_allocations_payment_voucher_id_fkey" FOREIGN KEY ("payment_voucher_id") REFERENCES "payment_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Applied Tax Line FKs
ALTER TABLE "applied_tax_lines" ADD CONSTRAINT "applied_tax_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applied_tax_lines" ADD CONSTRAINT "applied_tax_lines_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "vendor_invoice_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applied_tax_lines" ADD CONSTRAINT "applied_tax_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applied_tax_lines" ADD CONSTRAINT "applied_tax_lines_ra_bill_id_fkey" FOREIGN KEY ("ra_bill_id") REFERENCES "ra_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Finance Sequence FKs
ALTER TABLE "finance_sequences" ADD CONSTRAINT "finance_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Finance Audit Log FKs
ALTER TABLE "finance_audit_logs" ADD CONSTRAINT "finance_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
