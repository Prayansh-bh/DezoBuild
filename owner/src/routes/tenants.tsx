import React, { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Filter,
  Globe,
  MoreVertical,
  Plus,
  Search,
  Shield,
  Sliders,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatusBadge } from "../components/shared/status-badge";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_TENANTS } from "../mock/platform-data";
import type { PlatformTenant, SubscriptionTier, TenantStatus } from "../types";

export function TenantsView() {
  const [tenants, setTenants] = useState<PlatformTenant[]>(MOCK_TENANTS);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Provision Form State
  const [newTenantName, setNewTenantName] = useState("");
  const [newLegalName, setNewLegalName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newTier, setNewTier] = useState<SubscriptionTier>("Enterprise");
  const [newSeats, setNewSeats] = useState(100);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newContactEmail) return;

    const newTenant: PlatformTenant = {
      id: `tenant-${Date.now().toString().slice(-4)}`,
      name: newTenantName,
      slug: newSlug || newTenantName.toLowerCase().replace(/\s+/g, "-"),
      legalName: newLegalName || newTenantName,
      planTier: newTier,
      status: "active",
      seatsAllocated: Number(newSeats),
      seatsUsed: 1,
      mrr: newTier === "Enterprise" ? 399999 : newTier === "Professional" ? 149999 : 49999,
      activeSitesCount: 1,
      contactEmail: newContactEmail,
      contactPhone: "+91 98000 00000",
      contactPerson: newContactPerson || "Primary Admin",
      region: "ap-south-1 (Mumbai)",
      createdAt: new Date().toISOString().split("T")[0] || "",
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] || "",
    };

    setTenants([newTenant, ...tenants]);
    setIsProvisionOpen(false);
    setNewTenantName("");
    setNewLegalName("");
    setNewSlug("");
    setNewContactEmail("");
    setNewContactPerson("");
    showToast(`Successfully provisioned tenant: ${newTenant.name}`);
  };

  const filtered = tenants.filter((t) => {
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.contactEmail.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-float flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        eyebrow="Tenant Lifecycle & Multi-Tenancy"
        title="Companies & Tenant Workspaces"
        subtitle="Provision, inspect, isolate, and manage construction tenant organizations across multi-region infrastructure."
        actions={
          <button
            onClick={() => setIsProvisionOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Provision Tenant</span>
          </button>
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
            placeholder="Filter by company name, slug, or contact email…"
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

      {/* Tenants Table or Empty State */}
      {filtered.length > 0 ? (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="p-3.5 font-semibold">Tenant Organization</th>
                  <th className="p-3.5 font-semibold">Plan Tier</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold">Seat Quota</th>
                  <th className="p-3.5 font-semibold">Monthly MRR</th>
                  <th className="p-3.5 font-semibold">Sites</th>
                  <th className="p-3.5 font-semibold">Primary Contact</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {filtered.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-foreground text-xs">{tenant.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {tenant.slug} · {tenant.region}
                      </div>
                      {tenant.customDomain && (
                        <div className="text-[10px] text-primary flex items-center gap-1 mt-0.5 font-medium">
                          <Globe className="size-3" /> {tenant.customDomain}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {tenant.planTier}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="p-3.5 tabular-nums">
                      <div className="text-foreground font-medium">
                        {tenant.seatsUsed} / {tenant.seatsAllocated}
                      </div>
                      <div className="w-20 bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${Math.min(100, (tenant.seatsUsed / tenant.seatsAllocated) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-foreground tabular-nums">
                      ₹{(tenant.mrr / 1000).toLocaleString("en-IN")}k
                    </td>
                    <td className="p-3.5 text-muted-foreground tabular-nums font-medium">
                      {tenant.activeSitesCount} sites
                    </td>
                    <td className="p-3.5">
                      <div className="text-foreground font-medium">{tenant.contactPerson}</div>
                      <div className="text-[10px] text-muted-foreground">{tenant.contactEmail}</div>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => showToast(`Isolated schema verified for ${tenant.name}`)}
                        className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold text-foreground cursor-pointer transition-colors"
                      >
                        Audit
                      </button>
                      <button
                        onClick={() => showToast(`Entitlements opened for ${tenant.name}`)}
                        className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-[11px] font-semibold text-primary cursor-pointer transition-colors"
                      >
                        Entitlements
                      </button>
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
          title={tenants.length === 0 ? "No tenants provisioned yet" : "No tenant organizations found"}
          description={
            tenants.length === 0
              ? "Provision your first tenant to begin managing customer organizations."
              : "No tenants match the current search criteria or status filter."
          }
          actionLabel="Provision Tenant"
          onAction={() => setIsProvisionOpen(true)}
        />
      )}

      {/* Provision Tenant Modal */}
      {isProvisionOpen && (
        <div
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-center justify-center p-4"
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

            <form onSubmit={handleProvision} className="space-y-4 text-xs">
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
                    Workspace Subdomain Slug
                  </label>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="e.g. shapoorji-coastal"
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-foreground focus:border-primary focus:outline-none font-mono text-xs"
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

              <div className="space-y-1.5">
                <label className="block font-medium text-foreground text-xs">
                  Initial User Seat Allocation
                </label>
                <input
                  type="number"
                  min={5}
                  max={2000}
                  value={newSeats}
                  onChange={(e) => setNewSeats(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-foreground focus:border-primary focus:outline-none font-mono text-xs"
                />
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
                  className="h-9 px-5 rounded-lg bg-primary hover:bg-primary/90 font-bold text-primary-foreground text-xs shadow-sm cursor-pointer"
                >
                  Confirm Provisioning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
