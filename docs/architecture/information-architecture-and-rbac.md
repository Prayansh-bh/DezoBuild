# DEZOBUILD — Authoritative Information Architecture & Role-Aware Shell

## 1. Executive Platform Architecture

DEZOBUILD is a multi-tenant construction-management SaaS operating at two distinct tiers:

```
+-----------------------------------------------------------------------------------+
| PLATFORM LEVEL: owner.dezobuild.com                                               |
| Target User: Platform Owner / Super Admin (SUPER_ADMIN)                           |
| Scope: Global SaaS governance, tenant provisioning, plan billing, telemetry        |
+-----------------------------------------------------------------------------------+

+-----------------------------------------------------------------------------------+
| CUSTOMER LEVEL: app.dezobuild.com                                                 |
| Target User: Customer Company Teams (Owner, PM, Site Engineer, Store, Finance, etc) |
| Flow: Authenticated User -> Tenant -> Role -> Permissions -> Project/Site Context   |
|       -> Workspace Projection -> Navigation Tree                                  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Terminology & Distinction

| Concept | Domain / Persona | Environment | Role Identity | Scope of Authority |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Owner** | SaaS Operator | `owner.dezobuild.com` | `SUPER_ADMIN` | Manages all tenants, subscriptions, platform billing, global audit logs |
| **Company Owner** | Construction Enterprise | `app.dezobuild.com` | `COMPANY_OWNER` | Full executive visibility across that company's projects, ledgers, and sites |

> [!IMPORTANT]
> The Platform Owner is never a customer company role. Customer companies only exist inside `app.dezobuild.com`.

---

## 3. Authoritative Customer Role Model

All customer roles are strongly typed in `frontend/src/authorization/roles.ts`:

1. **`COMPANY_OWNER`** (Company Owner / Executive)
   - Workspace Identity: *Executive Overview*
   - Purpose: Portfolio-wide cash burn, project health, executive board summaries, and unconstrained access.
2. **`COMPANY_ADMIN`** (Company Administrator)
   - Workspace Identity: *Organization Overview*
   - Purpose: Enterprise governance, company legal profile, user provisioning, RBAC matrix, and compliance settings.
3. **`PROJECT_MANAGER`** (Project Manager)
   - Workspace Identity: *Project Operations*
   - Purpose: Project schedules (WBS), DPR sign-offs, material indents, labour muster, and budget variance tracking.
4. **`SITE_ENGINEER`** (Site Engineer)
   - Workspace Identity: *Site Operations*
   - Purpose: Field execution, daily DPR submission, labour muster check-in, equipment run logs, and quality snags.
5. **`PROCUREMENT_STORE`** (Procurement & Store Manager)
   - Workspace Identity: *Procurement & Store*
   - Purpose: Stock inventory, purchase orders, GRN verification, material issues, gate passes, returns, and transfers.
6. **`ACCOUNTANT`** (Commercial & Finance Accountant)
   - Workspace Identity: *Financial Overview*
   - Purpose: Expense vouchers, vendor disbursements, contractor advances, retention ledgers, and cash flow.
7. **`HR`** (Human Resources & Payroll)
   - Workspace Identity: *People Overview*
   - Purpose: Staff directory, biometric attendance muster, subcontractor gangs, leave, and payroll processing.
8. **`EMPLOYEE`** (Employee / Field Supervisor)
   - Workspace Identity: *Employee Self-Service*
   - Purpose: Personal shift assignments, muster check-in, assigned activities, and drawing viewing.
9. **`VIEWER`** (Read-Only Stakeholder / Auditor)
   - Workspace Identity: *Auditor Overview*
   - Purpose: Read-only inspection of project progress, drawings, and compliance records.

---

## 4. Master Customer Module Catalog

Centralized in `frontend/src/config/modules.ts`:

1. **Projects**: Projects, WBS & Activities, Milestones, DPR, Progress Tracking
2. **Procurement & Store**: Inventory, Indents & Requisitions, Purchase Orders, GRN, Material Issues, Material Returns, Stock Transfers, Vendors
3. **People & HR**: Employees, Attendance & Muster, Labour Contractors, Leave Management, Payroll & Wages, Performance
4. **Plant & Equipment**: Equipment Fleet, Site Allocation, Usage & Hour Meters, Fuel Dispensing, Maintenance & Service
5. **Finance & Commercial**: Budget Control, Site Expenses, Payments & Vouchers, Advances & Recoveries, Receivables & Billing, Cost Control
6. **Issues & Alerts**: Alerts & Exceptions, Issues & Snags, Approval Workflows
7. **Analytics & Reports**: Operational Reports, Project Reports, Financial Reports, Executive Reports
8. **Documents & Drawings**: Architectural & Structural Drawings, Contracts & Agreements, Statutory & Compliance, Revisions & Transmittals
9. **Administration**: Company Profile, Users & Team, Roles & Permissions, Organization Settings, Audit Logs

---

## 5. Centralized Navigation Resolver

Navigation is resolved dynamically via `resolveNavigation()` in `frontend/src/authorization/navigation.ts`:

```typescript
resolveNavigation({
  role: user.role,
  permissions: user.customPermissions,
  tenantId: user.tenant.id,
  projectAssignments: user.assignedProjects.map(p => p.projectId),
})
```

- **Single Application Shell**: There is no duplicated sidebar or fragmented portal tree.
- **Dynamic Projections**: Each role receives its prioritized navigation sequence, filtered by granted domain capabilities.
- **Zero Role Scattering**: Page components do not contain ad-hoc role switch statements.

---

## 6. Current Development Authentication Abstraction

Located in `frontend/src/auth/`:
- `CurrentUserContext` & `useCurrentUser()`
- `MockAuthProvider` provides interactive persona switching for QA and evaluation.
- Stored in `localStorage` for testing convenience (`dezobuild_active_mock_user_id`).

### Roadmap to Production Authentication & Backend RBAC:
1. Replace `MockAuthProvider` state with session token validation from OIDC / SAML / NextAuth / Supabase Auth.
2. Hydrate `user.tenant`, `user.role`, `user.assignedProjects`, and `user.permissions` directly from the authenticated `/api/v1/auth/me` endpoint.
3. Server-side middleware validates JWT claims and enforces tenant isolation (Row-Level Security / Tenant ID filtering in Postgres).
