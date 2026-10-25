import React, { useState, useEffect } from "react";
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
  Loader2,
  Radio,
  RefreshCw,
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
  platformTenantsApi,
  platformHealthApi,
  type PlatformTenantListItem,
  type BackendHealthDto,
} from "../lib/api";
import { MOCK_HEALTH_SERVICES } from "../mock/platform-data";

interface OverviewViewProps {
  onNavigate: (tabId: string) => void;
}

export function OverviewView({ onNavigate }: OverviewViewProps) {
  const [tenants, setTenants] = useState<PlatformTenantListItem[]>([]);
  const [healthData, setHealthData] = useState<BackendHealthDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tenantRes, healthRes] = await Promise.allSettled([
        platformTenantsApi.listTenants({ limit: 100 }),
        platformHealthApi.getHealth(),
      ]);

      if (tenantRes.status === "fulfilled") {
        setTenants(tenantRes.value.items || []);
      }
      if (healthRes.status === "fulfilled") {
        setHealthData(healthRes.value);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
  const totalUsers = tenants.reduce((acc, t) => acc + (t.userCount || 0), 0);
  const totalSites = tenants.reduce((acc, t) => acc + (t.projectCount || 0), 0);

  const statItems: StatItem[] = [
    {
      label: "Enterprise Tenant Accounts",
      value: isLoading ? "Loading…" : `${activeTenants} / ${totalTenants}`,
      hint: totalTenants > 0 ? "Authoritative PostgreSQL tenant workspaces" : "No tenant organizations provisioned",
      tone: totalTenants > 0 ? "info" : "default",
      icon: <Building2 className="size-5" />,
    },
    {
      label: "Active Field Users & Seats",
      value: isLoading ? "Loading…" : `${totalUsers.toLocaleString("en-IN")} Allocated`,
      hint: "Customer workspace user accounts",
      tone: totalUsers > 0 ? "healthy" : "default",
      icon: <Users className="size-5" />,
    },
    {
      label: "Active Construction Sites",
      value: isLoading ? "Loading…" : `${totalSites} Active Projects`,
      hint: "Multi-metro project partitions",
      tone: totalSites > 0 ? "info" : "default",
      icon: <HardHat className="size-5" />,
    },
    {
      label: "PostgreSQL Database Engine",
      value: healthData?.database.connected ? "Connected (Healthy)" : "Checking…",
      hint: healthData ? `Latency: ${healthData.database.latencyMs}ms · v${healthData.version}` : "Live backend cluster connection",
      tone: healthData?.database.connected ? "healthy" : "default",
      icon: <Database className="size-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Platform Executive Governance"
        title="SaaS Platform Control Center"
        subtitle="Global multi-tenant governance, cluster telemetry, feature entitlements, and operational infrastructure."
        actions={
          <>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
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
                Active tenant organizations and PostgreSQL workspace partitions
              </p>
            </div>
            {tenants.length > 0 && (
              <button
                onClick={() => onNavigate("tenants")}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({tenants.length})</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="size-6 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading customer tenant portfolios…</p>
            </div>
          ) : tenants.length > 0 ? (
            <div className="space-y-2.5">
              {tenants.slice(0, 5).map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-bold text-foreground">{tenant.name}</span>
                      <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-primary shrink-0">
                        {tenant.planTier}
                      </span>
                      {tenant.domain && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                          <Globe className="size-3" /> {tenant.domain}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {tenant.projectCount} active sites · {tenant.userCount} user seats · {tenant.companyCount} legal entities
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={tenant.status as any} className="text-[9px]" />
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </div>
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
            {/* Primary PostgreSQL */}
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">PostgreSQL Multi-Tenant Cluster (Primary)</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Database · {healthData ? `Latency: ${healthData.database.latencyMs}ms` : "Live"}
                </p>
              </div>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                healthData?.database.connected
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted border-border text-muted-foreground"
              }`}>
                {healthData?.database.connected ? "Operational" : "Checking…"}
              </span>
            </div>

            {/* Other nodes */}
            {MOCK_HEALTH_SERVICES.slice(1, 5).map((svc) => (
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
            <span className="text-muted-foreground">Cluster Telemetry Source</span>
            <span className="text-foreground font-semibold flex items-center gap-1 font-mono text-[11px]">
              /api/v1/health
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
