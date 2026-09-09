# DEZOBUILD — Authentication & Authorization Pipeline Specification

## 1. Authentication Pipeline

The DEZOBUILD identity architecture guarantees strict separation between the Platform Owner and Customer Tenant portals.

```text
                                USER ACCESS ATTEMPT
                                         │
                                         ▼
                      1. Open Portal (owner. or app.dezobuild.com)
                                         │
                                         ▼
                      2. Authenticate (OAuth 2.0 / OIDC / MFA)
                                         │
                                         ▼
                      3. Backend Validates Identity & Issues JWT
                                         │
                ┌────────────────────────┴────────────────────────┐
                │                                                 │
                ▼                                                 ▼
        SUPER_ADMIN Role                                   Customer Role
        (Scope: Platform)                                  (Scope: Customer Tenant)
                │                                                 │
                ▼                                                 ▼
     4a. Verify Portal Match                           4b. Verify Portal Match
         owner.dezobuild.com?                              app.dezobuild.com?
         ├── YES → Grant Platform Session                  ├── YES → Proceed to Tenant Context
         └── NO  → BLOCK & Redirect to owner               └── NO  → BLOCK & Redirect to app
                                                                  │
                                                                  ▼
                                                       5. Resolve Tenant Context
                                                          (Tenant ID, Company Name, Tier)
                                                                  │
                                                                  ▼
                                                       6. Resolve Project Assignments
                                                          (Assigned Project IDs, Site Roles)
                                                                  │
                                                                  ▼
                                                       7. Resolve Domain Capabilities
                                                          (Role Permissions + Custom Overrides)
                                                                  │
                                                                  ▼
                                                       8. Project Role Navigation
                                                          (Dynamic Sidebar Projection)
                                                                  │
                                                                  ▼
                                                       9. Render Progressive Disclosure UI
                                                          (Dedicated Role Command Center)
```

---

## 2. JWT Claims Specification

### A. Platform Owner JWT Payload (`owner.dezobuild.com`)
```json
{
  "sub": "usr_platform_super_admin_001",
  "email": "superadmin@dezobuild.com",
  "name": "Platform Administrator",
  "iss": "https://auth.dezobuild.com",
  "aud": "owner.dezobuild.com",
  "scope": "platform",
  "role": "SUPER_ADMIN",
  "iat": 1757328000,
  "exp": 1757335200
}
```

### B. Customer Tenant User JWT Payload (`app.dezobuild.com`)
```json
{
  "sub": "usr_site_eng_042",
  "email": "vikram.shenoy@apexinfra.com",
  "name": "Vikram Shenoy",
  "iss": "https://auth.dezobuild.com",
  "aud": "app.dezobuild.com",
  "scope": "customer",
  "tenantId": "tenant-apex-infra",
  "tenantName": "Apex Infra Projects Ltd.",
  "role": "SITE_ENGINEER",
  "assignedProjects": [
    {
      "projectId": "proj-001",
      "projectName": "Orion Heights",
      "siteRole": "Field Lead"
    }
  ],
  "permissions": {
    "projects": { "view": true, "create": false, "edit": true, "approve": false, "delete": false },
    "procurement_store": { "view": true, "create": true, "edit": false, "approve": false, "delete": false }
  },
  "iat": 1757328000,
  "exp": 1757356800
}
```

---

## 3. Server-Side Enforcement Directives

1. **Gateway Boundary Guard**: Reject any request where `token.aud` does not match the receiving subdomain.
2. **Tenant Scoping Guard**: Inject `tenantId` into every database transaction. Cross-tenant queries are blocked at the ORM layer.
3. **Project Scoping Guard**: If the user's role is `SITE_ENGINEER`, `PROJECT_MANAGER`, or `EMPLOYEE`, database queries automatically filter entities by `user.assignedProjects`.
4. **Action Authorization Guard**: Verify entity-level CRUD operations against the user's resolved capabilities before executing mutations.
