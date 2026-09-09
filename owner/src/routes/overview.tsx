import React from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Crown,
  Database,
  Globe,
  HardHat,
  LineChart,
  Radio,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatGrid, type StatItem } from "../components/shared/stat-grid";
import { StatusBadge } from "../components/shared/status-badge";
import { EmptyState } from "../components/shared/empty-state";
import {
  MOCK_AUDIT_LOGS,
  MOCK_HEALTH_SERVICES,
  MOCK_INVOICES,
  MOCK_TELEMETRY,
  MOCK_TENANTS,
} from "../mock/platform-data";

interface OverviewViewProps {
  onNavigate: (tabId: string) => void;
}

export function OverviewView({ onNavigate }: OverviewViewProps) {
  const hasBillingData = MOCK_TELEMETRY.totalMrr > 0;
  const hasTenants = MOCK_TENANTS.length > 0;

  const statItems: StatItem[] = [
    {
      label: "Monthly Recurring Revenue",
      value: hasBillingData ? `₹${(MOCK_TELEMETRY.totalMrr / 100000).toFixed(2)} Lakhs` : "₹0",
      hint: hasBillingData ? `ARR: ₹${(MOCK_TELEMETRY.totalArr / 10000000).toFixed(2)} Cr` : "Billing engine not connected",
      tone: hasBillingData ? "healthy" : "default",
      icon: <TrendingUp className="size-5" />,
    },
    {
      label: "Enterprise Tenant Accounts",
      value: hasTenants ? `${MOCK_TENANTS.filter((t) => t.status === "active").length} / ${MOCK_TENANTS.length}` : "0 Active",
      hint: hasTenants ? "Active tenant organizations" : "No tenant organizations provisioned",
      tone: hasTenants ? "info" : "default",
      icon: <Building2 className="size-5" />,
    },
    {
      label: "Active Field Users (24h)",
      value: MOCK_TELEMETRY.activeUsers24h > 0 ? MOCK_TELEMETRY.activeUsers24h.toLocaleString("en-IN") : "0",
      hint: "Identity telemetry not connected",
      tone: "default",
      icon: <Users className="size-5" />,
    },
    {
      label: "API Gateway Telemetry",
      value: "Not Connected",
      hint: "Production metrics collector pending",
      tone: "default",
      icon: <Activity className="size-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Platform Executive Governance"
        title="SaaS Platform Control Center"
        subtitle="Global multi-tenant governance, billing collections, feature entitlements, and operational infrastructure."
        actions={
          <>
            <button
              onClick={() => onNavigate("tenants")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 cursor-pointer"
            >
              <Building2 className="size-4" />
              <span>Provision Tenant</span>
            </button>
            <button
              onClick={() => onNavigate("health")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted cursor-pointer"
            >
              <Activity className="size-4 text-emerald-500" />
              <span>System Health</span>
            </button>
          </>
        }
      />

      {/* KPI Stat Grid */}
      <StatGrid items={statItems} columns={4} />

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enterprise Tenants Panel */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-5 shadow-panel space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span>Enterprise Customer Portfolios</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active tenant organizations and workspace deployments
              </p>
            </div>
            {hasTenants && (
              <button
                onClick={() => onNavigate("tenants")}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({MOCK_TENANTS.length})</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            )}
          </div>

          {hasTenants ? (
            <div className="space-y-2.5">
              {MOCK_TENANTS.slice(0, 5).map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{tenant.name}</span>
                      <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        {tenant.planTier}
                      </span>
                      {tenant.customDomain && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Globe className="size-3" /> {tenant.customDomain}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {tenant.activeSitesCount} active sites · {tenant.seatsUsed}/{tenant.seatsAllocated} seats · {tenant.contactPerson}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-foreground tabular-nums">
                      ₹{(tenant.mrr / 1000).toLocaleString("en-IN")}k/mo
                    </div>
                    <StatusBadge status={tenant.status} className="mt-1 text-[9px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="No tenant organizations provisioned yet"
              description="Provision customer companies to establish tenant database workspaces and assign subscription plans."
              actionLabel="Provision First Tenant"
              onAction={() => onNavigate("tenants")}
            />
          )}
        </div>

        {/* Infrastructure Node Telemetry */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-panel space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Server className="size-4 text-muted-foreground" />
                <span>Infrastructure Telemetry</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time status across multi-region nodes</p>
            </div>
            <button
              onClick={() => onNavigate("health")}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Details
            </button>
          </div>

          <div className="space-y-2.5">
            {MOCK_HEALTH_SERVICES.slice(0, 5).map((svc) => (
              <div
                key={svc.id}
                className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">{svc.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {svc.category} · {svc.region}
                  </p>
                </div>
                <span className="rounded bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Not Connected
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Live Telemetry Agent</span>
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              Configuration Required
            </span>
          </div>
        </div>
      </div>

      {/* Platform Security Audit Trail */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-panel space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <span>Platform Security & Governance Audit Log</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Immutable administrative and tenant modification events
            </p>
          </div>
          {MOCK_AUDIT_LOGS.length > 0 && (
            <button
              onClick={() => onNavigate("audit")}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Full Audit Trail →
            </button>
          )}
        </div>

        {MOCK_AUDIT_LOGS.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Actor</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Target Entity</th>
                  <th className="p-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {MOCK_AUDIT_LOGS.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-muted-foreground tabular-nums">{log.timestamp}</td>
                    <td className="p-3 font-semibold text-red-600 dark:text-red-400">{log.actorRole}</td>
                    <td className="p-3 font-semibold">{log.action}</td>
                    <td className="p-3 text-muted-foreground">{log.targetEntity}</td>
                    <td className="p-3 text-muted-foreground text-[11px] truncate max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="No audit events recorded yet"
            description="Administrative actions, tenant creations, and security policy modifications will appear here in an immutable audit ledger."
          />
        )}
      </div>
    </div>
  );
}
