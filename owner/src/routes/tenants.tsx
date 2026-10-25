import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Database,
  Filter,
  Globe,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatusBadge } from "../components/shared/status-badge";
import { EmptyState } from "../components/shared/empty-state";
import {
  platformTenantsApi,
  platformHealthApi,
  type PlatformTenantListItem,
  type BackendHealthDto,
} from "../lib/api";
import type { SubscriptionTier } from "../types";

export function mapTenantFilterToStatus(filter: string): string | undefined {
  switch (filter.toLowerCase()) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIAL";
    case "delinquent":
      return "DELINQUENT";
    case "suspended":
      return "SUSPENDED";
    case "all":
    default:
      return undefined;
  }
}

export function TenantsView() {
  const [tenants, setTenants] = useState<PlatformTenantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auditTenant, setAuditTenant] = useState<PlatformTenantListItem | null>(null);
  const [auditHealth, setAuditHealth] = useState<BackendHealthDto | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Provision Form State
  const [newTenantName, setNewTenantName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newTier, setNewTier] = useState<SubscriptionTier>("Enterprise");
  const [newSeats, setNewSeats] = useState(100);

  const loadTenants = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await platformTenantsApi.listTenants({
        search: search.trim() || undefined,
        status: mapTenantFilterToStatus(filterStatus),
      });
      setTenants(res.items || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load platform tenants from PostgreSQL cluster.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [filterStatus, search]);

  const handleAuditClick = async (tenant: PlatformTenantListItem) => {
    setAuditTenant(tenant);
    setIsAuditing(true);
    try {
      const health = await platformHealthApi.getHealth();
      setAuditHealth(health);
    } catch {
      setAuditHealth(null);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const slug =
        newSlug.trim() ||
        newTenantName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-");

      await platformTenantsApi.provisionTenant({
        code: slug.toUpperCase(),
        name: newTenantName.trim(),
        planTier: newTier.toUpperCase() as any,
        adminName: newContactPerson.trim(),
        adminEmail: newContactEmail.trim(),
      });

      alert(`Tenant workspace '${newTenantName}' provisioned successfully in PostgreSQL cluster!`);
      setIsProvisionOpen(false);
      setNewTenantName("");
      setNewSlug("");
      setNewContactEmail("");
      setNewContactPerson("");
      await loadTenants();
    } catch (err: any) {
      alert(`Provisioning failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Tenant Lifecycle & Multi-Tenancy"
        title="Companies & Tenant Workspaces"
        subtitle="Provision, inspect, isolate, and manage construction tenant organizations across multi-region infrastructure."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadTenants}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:bg-muted/50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsProvisionOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Provision Tenant</span>
            </button>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by company name, slug, or domain…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-panel"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(["all", "active", "trialing", "delinquent", "suspended"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                filterStatus === status
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tenants Table or Empty State */}
      {isLoading ? (
        <div className="rounded-xl border border-border/80 bg-card p-12 text-center shadow-panel flex flex-col items-center justify-center space-y-3">
          <Loader2 className="size-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading authoritative tenant workspaces from cluster…</p>
        </div>
      ) : tenants.length > 0 ? (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="p-3.5 font-semibold">Tenant Organization</th>
                  <th className="p-3.5 font-semibold">Plan Tier</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold">Legal Entities</th>
                  <th className="p-3.5 font-semibold">Users</th>
                  <th className="p-3.5 font-semibold">Sites</th>
                  <th className="p-3.5 font-semibold">Created</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-foreground text-xs">{tenant.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {tenant.code} · {tenant.timezone}
                      </div>
                      {tenant.domain && (
                        <div className="text-[10px] text-primary flex items-center gap-1 mt-0.5 font-medium">
                          <Globe className="size-3" /> {tenant.domain}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {tenant.planTier}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={tenant.status as any} />
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {tenant.companyCount} {tenant.companyCount === 1 ? "Company" : "Companies"}
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {tenant.userCount} Seats
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {tenant.projectCount} Active Sites
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAuditClick(tenant)}
                          className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Database className="size-3 text-primary" />
                          <span>Audit</span>
                        </button>
                        <a
                          href="#entitlements"
                          className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Sliders className="size-3" />
                          <span>Entitlements</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No construction tenant workspaces provisioned yet"
          description="Provision customer tenant organizations with dedicated database partitioning, enterprise entitlements, and owner administrative credentials."
          actionLabel="Provision First Tenant"
          onAction={() => setIsProvisionOpen(true)}
        />
      )}

      {/* Tenant Schema & Isolation Audit Modal */}
      {auditTenant && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAuditTenant(null)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-float space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-base font-bold text-foreground">
                <Database className="size-5 text-primary" />
                <span>Tenant Isolation & Database Schema Audit</span>
              </div>
              <button
                onClick={() => setAuditTenant(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Tenant Organization:</span>
                  <span className="font-bold text-foreground">{auditTenant.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Tenant UUID:</span>
                  <span className="font-mono text-foreground font-semibold">{auditTenant.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Isolation Strategy:</span>
                  <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary font-bold">
                    Row-Level Discriminator (`tenant_id` Foreign Key)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">Plan Tier / Cycle:</span>
                  <span className="font-semibold text-foreground">
                    {auditTenant.planTier} ({auditTenant.subscription?.billingCycle || "ANNUAL"})
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-2">
                <div className="font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <Shield className="size-3.5 text-emerald-500" />
                  <span>Authoritative Backend PostgreSQL Telemetry</span>
                </div>
                {isAuditing ? (
                  <p className="text-muted-foreground">Inspecting database connectivity…</p>
                ) : auditHealth ? (
                  <div className="space-y-1 text-muted-foreground font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>PostgreSQL Status:</span>
                      <strong className="text-emerald-500 font-bold">CONNECTED ({auditHealth.database.status})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Query Latency:</span>
                      <span className="text-foreground">{auditHealth.database.latencyMs} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Version:</span>
                      <span className="text-foreground">{auditHealth.service} v{auditHealth.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>System Uptime:</span>
                      <span className="text-foreground">{Math.floor(auditHealth.uptimeSeconds / 60)} minutes</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-destructive font-semibold">Unable to fetch live database telemetry.</p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setAuditTenant(null)}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Tenant Modal */}
      {isProvisionOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsProvisionOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-float space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Building2 className="size-4.5 text-primary" />
                  <span>Provision New Enterprise Tenant</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deploy dedicated organization workspace, admin credentials, and entitlement tier.
                </p>
              </div>
              <button
                onClick={() => setIsProvisionOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-medium text-foreground text-xs">
                  Company / Organization Name <span className="text-destructive font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="e.g. Shapoorji Coastal Projects"
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-foreground focus:border-primary focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-xs">
                    Workspace Code / Slug
                  </label>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="e.g. SHAPOORJI-COASTAL"
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-foreground focus:border-primary focus:outline-none font-mono text-xs uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-xs">
                    Subscription Tier <span className="text-destructive font-bold">*</span>
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as SubscriptionTier)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-foreground focus:border-primary focus:outline-none text-xs"
                  >
                    <option value="Starter">Starter (₹49,999/mo)</option>
                    <option value="Professional">Professional (₹1,49,999/mo)</option>
                    <option value="Enterprise">Enterprise (₹3,99,999/mo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-xs">
                    Primary Admin Name <span className="text-destructive font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    placeholder="e.g. Arjun Kapoor"
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-foreground focus:border-primary focus:outline-none text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-medium text-foreground text-xs">
                    Admin Work Email <span className="text-destructive font-bold">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-foreground focus:border-primary focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-5 rounded-lg bg-primary hover:bg-primary/90 font-bold text-primary-foreground text-xs shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Provisioning in Cluster…" : "Provision Workspace"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
