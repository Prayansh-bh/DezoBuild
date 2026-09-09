# DEZOBUILD — Authoritative REST API Contract Specification

**Phase**: Backend Architecture Definition  
**Mode**: Contract-First Interface Specification  
**Status**: Authoritative Blueprint (Pre-Implementation Gate)  

---

## 1. Customer REST API Endpoints (`/api/v1/*`)

Target Domain Boundary: `app.dezobuild.com`  
Base Prefix: `/api/v1`  
Authentication: `Authorization: Bearer <JWT>`  

```text
LEGEND:
• Mut?: Is state mutated? (YES / NO)
• Tx?: Requires ACID Database Transaction? (YES / NO)
• Aud?: Generates Immutable Audit Log Record? (YES / NO)
• Idem?: Requires Idempotency-Key Header? (YES / NO)
• Pag?: Supports standard cursor/page pagination? (YES / NO)
```

| HTTP Method | Path | Purpose | Required Permission | Tenant Scope | Project Scope | Site Scope | Input DTO Concept | Output DTO Concept | Mut? | Tx? | Aud? | Idem? | Pag? |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `POST` | `/auth/login` | Authenticate customer credentials | None | Public | None | None | `LoginRequestDto` | `AuthTokenResponseDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `POST` | `/auth/refresh` | Refresh access token via session | None | Public | None | None | `RefreshTokenDto` | `AuthTokenResponseDto` | YES | ❌ | ❌ | ❌ | ❌ |
| `POST` | `/auth/logout` | Revoke active session token | None | User | None | None | None | `SuccessResponseDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/dashboard/summary` | Executive / Role overview metrics | `dashboard:view` | YES | Filtered | Optional | Query Filters | `DashboardSummaryDto` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET` | `/projects` | List portfolio projects | `projects:view` | YES | Filtered | Optional | Query Filters | `PaginatedList<ProjectDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/projects` | Create new project & baselines | `projects:create` | YES | None | None | `CreateProjectDto` | `ProjectDetailDto` | YES | ✅ | ✅ | ✅ | ❌ |
| `GET` | `/projects/:id` | Read project 360 overview | `projects:view` | YES | YES | Optional | None | `ProjectDetailDto` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `PUT` | `/projects/:id` | Update project metadata | `projects:edit` | YES | YES | Optional | `UpdateProjectDto` | `ProjectDetailDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/projects/:id/wbs` | Read hierarchical WBS tree | `projects:wbs:view` | YES | YES | Optional | Query Filters | `List<WbsTreeNodeDto>` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST` | `/projects/:id/wbs` | Add WBS activity package | `projects:wbs:manage` | YES | YES | Optional | `CreateWbsActivityDto` | `WbsActivityDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/projects/:id/dprs` | List daily DPR logs | `projects:dpr:view` | YES | YES | YES | Date / Status Filters | `PaginatedList<DprSummaryDto>`| ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/projects/:id/dprs` | Submit daily progress report | `projects:dpr:create` | YES | YES | YES | `CreateDprDto` | `DprDetailDto` | YES | ✅ | ✅ | ✅ | ❌ |
| `POST` | `/projects/:id/dprs/:dprId/review` | Sign-off / Reject DPR | `projects:dpr:approve` | YES | YES | Optional | `ReviewDprDto` | `DprDetailDto` | YES | ✅ | ✅ | ❌ | ❌ |
| `GET` | `/material-requirements` | View BOQ material budgets | `materials:view` | YES | Filtered | Optional | Query Filters | `List<MaterialRequirementDto>`| ❌ | ❌ | ❌ | ❌ | ✅ |
| `GET` | `/indents` | List material requisitions | `materials:indents:view` | YES | Filtered | Optional | Query Filters | `PaginatedList<IndentDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/indents` | Submit material indent | `materials:indents:create` | YES | YES | YES | `CreateIndentDto` | `IndentDetailDto` | YES | ✅ | ✅ | ❌ | ❌ |
| `POST` | `/indents/:id/review` | Authorize / Reject indent | `materials:indents:approve`| YES | Optional | Optional | `ReviewIndentDto` | `IndentDetailDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/purchase-orders` | List purchase orders | `materials:purchase_orders:view`| YES | Filtered | Optional | Query Filters | `PaginatedList<PoSummaryDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/purchase-orders` | Issue purchase order to vendor | `materials:purchase_orders:create`| YES | YES | Optional | `CreatePoDto` | `PoDetailDto` | YES | ✅ | ✅ | ✅ | ❌ |
| `POST` | `/purchase-orders/:id/approve` | Approve PO commercial commitment | `materials:purchase_orders:approve`| YES | Optional | Optional | `ApprovePoDto` | `PoDetailDto` | YES | ✅ | ✅ | ❌ | ❌ |
| `GET` | `/grns` | List Goods Receipt Notes | `materials:grn:view` | YES | Filtered | YES | Query Filters | `PaginatedList<GrnSummaryDto>`| ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/grns` | Record physical gate arrival | `materials:grn:create` | YES | YES | YES | `CreateGrnDto` | `GrnDetailDto` | YES | ✅ | ✅ | ✅ | ❌ |
| `POST` | `/grns/:id/verify` | Verify quality & accept into stock | `materials:grn:approve` | YES | YES | YES | `VerifyGrnDto` | `GrnDetailDto` | YES | ✅ | ✅ | ❌ | ❌ |
| `GET` | `/inventory` | View store stock balances | `materials:inventory:view` | YES | Filtered | YES | Site / Material Filters | `PaginatedList<InventoryDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/materials/issues` | Issue material to site activity | `materials:issue:create` | YES | YES | YES | `IssueMaterialDto` | `MaterialIssueDto` | YES | ✅ | ✅ | ✅ | ❌ |
| `POST` | `/materials/returns` | Return unused stock to warehouse | `materials:return:create` | YES | YES | YES | `ReturnMaterialDto` | `MaterialReturnDto` | YES | ✅ | ✅ | ❌ | ❌ |
| `POST` | `/materials/transfers` | Authorize inter-site stock transfer | `materials:transfer:create`| YES | Dual Project | Dual Site | `StockTransferDto` | `StockTransferDetailDto` | YES | ✅ | ✅ | ✅ | ❌ |
| `GET` | `/vendors` | List registered vendors | `materials:vendors:view` | YES | None | None | Query Filters | `PaginatedList<VendorDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/vendors` | Onboard new vendor entity | `materials:vendors:manage` | YES | None | None | `CreateVendorDto` | `VendorDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/finance/overview` | Financial burn & budget positions | `finance:view` | YES | Filtered | Optional | Date / Project Filters | `FinanceOverviewDto` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST` | `/projects/:id/budget-lines` | Configure cost code budget lines | `finance:budget:manage` | YES | YES | Optional | `SetBudgetLinesDto` | `List<BudgetLineDto>` | YES | ✅ | ✅ | ❌ | ❌ |
| `GET` | `/expenses` | List expense vouchers | `finance:view` | YES | Filtered | Optional | Query Filters | `PaginatedList<ExpenseDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/expenses` | Submit site expense voucher | `finance:manage` | YES | YES | YES | `CreateExpenseDto` | `ExpenseDetailDto` | YES | ❌ | ✅ | ✅ | ❌ |
| `POST` | `/expenses/:id/approve` | Approve & disburse expense | `finance:approve` | YES | Optional | Optional | `ApproveExpenseDto` | `ExpenseDetailDto` | YES | ✅ | ✅ | ❌ | ❌ |
| `GET` | `/payments` | List vendor payment vouchers | `finance:view` | YES | None | None | Query Filters | `PaginatedList<PaymentDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/payments` | Schedule payment voucher | `finance:manage` | YES | Optional | Optional | `CreatePaymentDto` | `PaymentDetailDto` | YES | ❌ | ✅ | ✅ | ❌ |
| `POST` | `/payments/:id/post` | Disburse payment with UTR ref | `finance:pay` | YES | Optional | Optional | `PostPaymentDto` | `PaymentDetailDto` | YES | ✅ | ✅ | ✅ | ❌ |
| `POST` | `/advances` | Issue subcontractor advance | `finance:manage` | YES | YES | Optional | `CreateAdvanceDto` | `AdvanceDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/employees` | List staff directory | `people:view` | YES | Optional | Optional | Query Filters | `PaginatedList<EmployeeDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/employees` | Onboard staff employee | `people:manage` | YES | Optional | Optional | `CreateEmployeeDto` | `EmployeeDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `POST` | `/attendance` | Bulk save daily muster roll | `attendance:manage` | YES | Optional | Optional | `SaveAttendanceDto` | `SuccessResponseDto` | YES | ✅ | ✅ | ❌ | ❌ |
| `POST` | `/leave/requests` | Apply for employee leave | `leave:apply` | YES | None | None | `ApplyLeaveDto` | `LeaveRequestDto` | YES | ❌ | ❌ | ❌ | ❌ |
| `POST` | `/labour/gangs` | Register subcontractor gang | `people:manage` | YES | YES | YES | `RegisterGangDto` | `LabourGangDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `POST` | `/labour/muster` | Record daily gang headcount | `attendance:manage` | YES | YES | YES | `RecordMusterDto` | `MusterRecordDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/equipment` | List machinery asset fleet | `equipment:view` | YES | Optional | Optional | Query Filters | `PaginatedList<EquipmentDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/equipment` | Register equipment asset | `equipment:manage` | YES | Optional | Optional | `CreateEquipmentDto` | `EquipmentDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `POST` | `/equipment/fuel` | Log diesel dispensing bowser | `equipment:manage` | YES | YES | YES | `RecordFuelLogDto` | `FuelLogDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `POST` | `/equipment/maintenance`| Open breakdown work ticket | `equipment:manage` | YES | Optional | Optional | `CreateTicketDto` | `MaintenanceTicketDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/issues` | List site snags & safety issues | `issues:view` | YES | Filtered | Optional | Query Filters | `PaginatedList<IssueDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/issues` | Log site snag / defect blocker | `issues:create` | YES | YES | YES | `CreateIssueDto` | `IssueDetailDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `POST` | `/issues/:id/resolve` | Rectify & close site issue | `issues:resolve` | YES | YES | Optional | `ResolveIssueDto` | `IssueDetailDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/documents` | Search documents & GFC drawings | `documents:view` | YES | Filtered | Optional | Query Filters | `PaginatedList<DocumentDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/documents` | Upload document / GFC revision | `documents:create` | YES | Optional | Optional | `UploadDocumentDto` | `DocumentDetailDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `POST` | `/reports/export` | Generate PDF / XLSX audit export | `reports:export` | YES | Optional | Optional | `ReportExportRequestDto` | `ReportExportJobDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `PUT` | `/settings/company` | Update company profile & GSTIN | `admin:settings` | YES | None | None | `UpdateCompanyDto` | `CompanyProfileDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `POST` | `/settings/invitations` | Invite team member & assign role | `admin:users` | YES | None | None | `InviteUserDto` | `InvitationDto` | YES | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/settings/audit-logs` | View immutable system audit log | `admin:audit` | YES | None | None | Query Filters | `PaginatedList<AuditLogDto>` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 2. Platform Governance REST API Endpoints (`/platform/*`)

Target Domain Boundary: `owner.dezobuild.com`  
Base Prefix: `/platform`  
Authentication: `Authorization: Bearer <PLATFORM_JWT>`  

| HTTP Method | Path | Purpose | Required Platform Permission | Input DTO Concept | Output DTO Concept | Mut? | Tx? | Aud? |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `POST` | `/platform/auth/login` | Authenticate platform operator | None (Public) | `PlatformLoginDto` | `PlatformAuthTokenDto` | YES | ❌ | ✅ |
| `GET` | `/platform/tenants` | List all SaaS customer tenants | `platform:tenants:view` | Filter / Search Queries | `PaginatedList<TenantSummaryDto>` | ❌ | ❌ | ❌ |
| `POST` | `/platform/tenants` | Provision new customer tenant | `platform:tenants:manage` | `ProvisionTenantDto` | `TenantDetailDto` | YES | ✅ | ✅ |
| `GET` | `/platform/tenants/:id` | Deep tenant inspection & metrics | `platform:tenants:view` | None | `TenantDetailDto` | ❌ | ❌ | ❌ |
| `PUT` | `/platform/tenants/:id/status` | Suspend / Reactivate tenant | `platform:tenants:manage` | `UpdateTenantStatusDto` | `TenantDetailDto` | YES | ❌ | ✅ |
| `GET` | `/platform/plans` | List SaaS subscription plans | `platform:plans:view` | None | `List<PlanDto>` | ❌ | ❌ | ❌ |
| `PUT` | `/platform/plans/:id` | Update plan tier pricing & entitlements | `platform:plans:manage` | `UpdatePlanDto` | `PlanDto` | YES | ❌ | ✅ |
| `GET` | `/platform/billing/invoices` | List platform subscription invoices | `platform:billing:view` | Query Filters | `PaginatedList<PlatformInvoiceDto>` | ❌ | ❌ | ❌ |
| `GET` | `/platform/analytics/mrr` | Compute platform ARR / MRR trends | `platform:analytics:view` | Date Range Query | `PlatformRevenueAnalyticsDto` | ❌ | ❌ | ❌ |
| `GET` | `/platform/health` | Live telemetry & cluster health | `platform:health:view` | None | `PlatformHealthStatusDto` | ❌ | ❌ | ❌ |
| `GET` | `/platform/audit-logs` | Master SaaS operator audit trail | `platform:audit:view` | Query Filters | `PaginatedList<PlatformAuditLogDto>` | ❌ | ❌ | ❌ |
| `POST` | `/platform/support/tickets` | Open tenant support ticket | `platform:support:manage` | `CreateSupportTicketDto` | `SupportTicketDto` | YES | ❌ | ✅ |
| `PUT` | `/platform/settings` | Toggle global maintenance / MFA | `platform:settings:manage` | `UpdatePlatformSettingsDto` | `PlatformSettingsDto` | YES | ❌ | ✅ |
