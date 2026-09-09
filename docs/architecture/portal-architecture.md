# DEZOBUILD — Authoritative Portal Architecture

## 1. Executive Summary & Topology

DEZOBUILD is a multi-tenant construction management operating system structured around **two strictly separated portals**:

```text
                                DEZOBUILD PLATFORM
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        │                                                               │
        ▼                                                               ▼
1. owner.dezobuild.com                                        2. app.dezobuild.com
   PLATFORM OWNER PORTAL                                         CUSTOMER / TENANT PORTAL
   (SaaS Governance & Administration)                            (Construction Company Operations)
   ══════════════════════════════════                            ═════════════════════════════════
   Role Scope: SUPER_ADMIN Only                                  Role Scope: 9 Customer Roles Only
   - Tenant Provisioning & Lifecycle                             - Executive & Organization Management
   - Subscription Tiers & Feature Flags                          - Project 360 & WBS Scheduling
   - SaaS Billing & Revenue Telemetry                            - Procurement, Indents & Stores
   - Global System Health & Audit Logs                           - Finance, Payables & RA Invoices
   - Platform Level Configurations                               - Field DPRs, Labour & Equipment
```

---

## 2. Mandatory Portal Isolation Rules

### A. Non-Overlapping User Roles
1. **Platform Layer**:
   - Exactly **1 Platform Role**: `SUPER_ADMIN`.
   - Has zero access to customer construction operations (no DPR creation, no material requisitions, no contractor gang deployments, no project commercial ledger editing).
   - Operates exclusively on `owner.dezobuild.com`.
2. **Customer Layer**:
   - Exactly **9 Customer Roles**: `COMPANY_OWNER`, `COMPANY_ADMIN`, `PROJECT_MANAGER`, `SITE_ENGINEER`, `PROCUREMENT_STORE`, `ACCOUNTANT`, `HR`, `EMPLOYEE`, `VIEWER`.
   - Operate inside customer tenant organizations on `app.dezobuild.com`.
   - Have zero access to the Platform Owner portal.

### B. Portal Boundary Enforcement
- **Client-Side Enforcement**:
  - `app.dezobuild.com` detects if the authenticated identity is `SUPER_ADMIN` and blocks access, rendering the Portal Isolation screen directing the user to `owner.dezobuild.com`.
  - `owner.dezobuild.com` detects if the authenticated identity belongs to a customer role and blocks access, redirecting to `app.dezobuild.com`.
- **Server-Side Enforcement**:
  - Backend API gateways strictly validate JWT audience and issuer claims:
    - Platform management endpoints (`/api/v1/owner/*`) require `aud: "owner.dezobuild.com"` and `role: "SUPER_ADMIN"`.
    - Tenant business endpoints (`/api/v1/tenant/*`) require `aud: "app.dezobuild.com"`, a valid `tenantId`, and a valid customer role.
  - Cross-portal token exchange is strictly prohibited.

---

## 3. Dedicated Portal Specifications

### A. Platform Owner Portal (`owner.dezobuild.com`)
- **Primary Mission**: Manage the DEZOBUILD SaaS business, monitor platform infrastructure, and govern tenant contracts.
- **Top-Level Navigation Modules**:
  1. **Platform Overview**: Global SaaS KPIs (Total Tenants, Active MRR, Total Monitored Projects, System Health, API Latency).
  2. **Companies & Tenants**: Tenant provisioning, account statuses, subscription tiers, seat usage, custom domain bindings.
  3. **Subscriptions & Plans**: Plan definitions (Starter, Growth, Enterprise), pricing models, add-on packages.
  4. **Platform Billing**: Aggregated SaaS revenue, payment gateway settlements, overdue invoices, dunning workflows.
  5. **Users & Seats**: Global seat allocation across tenants, license limits, security policy enforcement (MFA, SSO).
  6. **Feature Entitlements**: Modular feature toggle engine (BIM 3D viewer, AI Schedule Forecaster, Drone Photogrammetry, SAP Export).
  7. **Platform Analytics**: Daily active construction users, storage consumption, request throughput, global activity trends.
  8. **System Health & Telemetry**: Database connection pool status, background worker queue latency, edge CDN uptime.
  9. **Global Audit Logs**: Platform-level security events, administrative tenant impersonation trails, subscription upgrades.
  10. **Support & Operations**: Tenant support ticket tracking, data export/backup requests, maintenance window notices.
  11. **Platform Settings**: Global SMTP, payment gateway credentials, webhook integrations, system constants.

### B. Customer Application Portal (`app.dezobuild.com`)
- **Primary Mission**: End-to-end construction project delivery, supply chain, site execution, commercial control, and workforce management.
- **Unified Single Shell Architecture**:
  - No duplicate portals (`/owner`, `/admin`, `/pm`, `/engineer`).
  - Dynamic navigation projection (`resolveNavigation()`) projects role-tailored menus.
  - Progressive disclosure workspaces with role-scoped capabilities and dedicated role command centers (`/`).
