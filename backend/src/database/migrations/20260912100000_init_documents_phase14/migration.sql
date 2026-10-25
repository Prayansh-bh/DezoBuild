-- DEZOBUILD Phase 14: Documents, Drawings, RFI & Engineering Document Control Migration

-- 1. Engineering Documents Master Table
CREATE TABLE "engineering_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "document_number" VARCHAR(100) NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "category" VARCHAR(100),
    "discipline" VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "drawing_number" VARCHAR(100),
    "sheet_number" VARCHAR(50),
    "scale" VARCHAR(50),
    "wbs_node_id" UUID,
    "task_id" UUID,
    "current_version_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engineering_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "engineering_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "engineering_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "engineering_documents_wbs_node_id_fkey" FOREIGN KEY ("wbs_node_id") REFERENCES "wbs_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "engineering_documents_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "engineering_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 2. Document Versions Table
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "revision_code" VARCHAR(20) NOT NULL,
    "issue_purpose" VARCHAR(50) NOT NULL DEFAULT 'FOR_INFORMATION',
    "issue_date" TIMESTAMPTZ,
    "storage_object_key" VARCHAR(500) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "file_extension" VARCHAR(20),
    "mime_type" VARCHAR(100) NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "file_sha256" VARCHAR(64) NOT NULL,
    "revision_notes" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "is_superseded" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID NOT NULL,
    "issued_by_id" UUID,
    "issued_at" TIMESTAMPTZ,
    "superseded_by_id" UUID,
    "superseded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "document_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "engineering_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_versions_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "document_versions_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Circular FK for current_version_id
ALTER TABLE "engineering_documents" ADD CONSTRAINT "engineering_documents_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Unique and Indexes for engineering_documents
CREATE UNIQUE INDEX "engineering_documents_current_version_id_key" ON "engineering_documents"("current_version_id");
CREATE UNIQUE INDEX "engineering_documents_tenant_id_project_id_document_number_key" ON "engineering_documents"("tenant_id", "project_id", "document_number");
CREATE UNIQUE INDEX "engineering_documents_tenant_id_project_id_drawing_number_key" ON "engineering_documents"("tenant_id", "project_id", "drawing_number");
CREATE INDEX "engineering_documents_tenant_id_project_id_status_idx" ON "engineering_documents"("tenant_id", "project_id", "status");
CREATE INDEX "engineering_documents_tenant_id_project_id_document_type_idx" ON "engineering_documents"("tenant_id", "project_id", "document_type");
CREATE INDEX "engineering_documents_tenant_id_project_id_discipline_idx" ON "engineering_documents"("tenant_id", "project_id", "discipline");

-- Unique and Indexes for document_versions
CREATE UNIQUE INDEX "document_versions_tenant_id_document_id_version_number_key" ON "document_versions"("tenant_id", "document_id", "version_number");
CREATE UNIQUE INDEX "document_versions_tenant_id_document_id_revision_code_key" ON "document_versions"("tenant_id", "document_id", "revision_code");
CREATE INDEX "document_versions_tenant_id_project_id_status_idx" ON "document_versions"("tenant_id", "project_id", "status");
CREATE INDEX "document_versions_tenant_id_document_id_status_idx" ON "document_versions"("tenant_id", "document_id", "status");

-- 3. Document Transmittals
CREATE TABLE "document_transmittals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "transmittal_number" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "issue_purpose" VARCHAR(50) NOT NULL,
    "issue_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sender_id" UUID NOT NULL,
    "recipient_organization" VARCHAR(255) NOT NULL,
    "recipient_name" VARCHAR(255) NOT NULL,
    "recipient_email" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "acknowledged_at" TIMESTAMPTZ,
    "acknowledged_by_id" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_transmittals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "document_transmittals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_transmittals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_transmittals_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_transmittals_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "document_transmittals_tenant_id_project_id_transmittal_numb_key" ON "document_transmittals"("tenant_id", "project_id", "transmittal_number");
CREATE INDEX "document_transmittals_tenant_id_project_id_status_idx" ON "document_transmittals"("tenant_id", "project_id", "status");

-- 4. Document Transmittal Items
CREATE TABLE "document_transmittal_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "transmittal_id" UUID NOT NULL,
    "document_version_id" UUID NOT NULL,
    "copy_count" INTEGER NOT NULL DEFAULT 1,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_transmittal_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "document_transmittal_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_transmittal_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_transmittal_items_transmittal_id_fkey" FOREIGN KEY ("transmittal_id") REFERENCES "document_transmittals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_transmittal_items_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "document_transmittal_items_transmittal_id_document_version_key" ON "document_transmittal_items"("transmittal_id", "document_version_id");
CREATE INDEX "document_transmittal_items_tenant_id_project_id_idx" ON "document_transmittal_items"("tenant_id", "project_id");

-- 5. Requests for Information (RFI)
CREATE TABLE "requests_for_information" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "rfi_number" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "discipline" VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    "location" VARCHAR(255),
    "technical_query" TEXT NOT NULL,
    "proposed_solution" TEXT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "wbs_node_id" UUID,
    "task_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "raised_by_id" UUID NOT NULL,
    "raised_at" TIMESTAMPTZ,
    "due_date" TIMESTAMPTZ,
    "assigned_to_id" UUID,
    "official_response" TEXT,
    "responded_by_id" UUID,
    "responded_at" TIMESTAMPTZ,
    "closed_by_id" UUID,
    "closed_at" TIMESTAMPTZ,
    "closure_remarks" TEXT,
    "reopen_reason" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requests_for_information_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "requests_for_information_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "requests_for_information_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "requests_for_information_wbs_node_id_fkey" FOREIGN KEY ("wbs_node_id") REFERENCES "wbs_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "requests_for_information_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "requests_for_information_raised_by_id_fkey" FOREIGN KEY ("raised_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "requests_for_information_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "requests_for_information_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "requests_for_information_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "requests_for_information_tenant_id_project_id_rfi_number_key" ON "requests_for_information"("tenant_id", "project_id", "rfi_number");
CREATE INDEX "requests_for_information_tenant_id_project_id_status_idx" ON "requests_for_information"("tenant_id", "project_id", "status");
CREATE INDEX "requests_for_information_tenant_id_project_id_priority_idx" ON "requests_for_information"("tenant_id", "project_id", "priority");
CREATE INDEX "requests_for_information_tenant_id_assigned_to_id_idx" ON "requests_for_information"("tenant_id", "assigned_to_id");

-- 6. RFI Document References
CREATE TABLE "rfi_document_references" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "rfi_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "document_version_id" UUID,
    "reference_type" VARCHAR(50) NOT NULL DEFAULT 'QUERY_ATTACHMENT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfi_document_references_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rfi_document_references_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rfi_document_references_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rfi_document_references_rfi_id_fkey" FOREIGN KEY ("rfi_id") REFERENCES "requests_for_information"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rfi_document_references_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "engineering_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rfi_document_references_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "rfi_doc_ref_unique_idx" ON "rfi_document_references"("rfi_id", "document_id", "document_version_id", "reference_type");
CREATE INDEX "rfi_document_references_tenant_id_project_id_idx" ON "rfi_document_references"("tenant_id", "project_id");

-- 7. Document Audit Logs Table
CREATE TABLE "document_audit_logs" (
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

    CONSTRAINT "document_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "document_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "document_audit_logs_tenant_id_project_id_created_at_idx" ON "document_audit_logs"("tenant_id", "project_id", "created_at");
CREATE INDEX "document_audit_logs_tenant_id_entity_type_entity_id_idx" ON "document_audit_logs"("tenant_id", "entity_type", "entity_id");
