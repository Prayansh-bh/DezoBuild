import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { MOCK_HEALTH_SERVICES } from "../mock/platform-data";
import { platformHealthApi, type BackendHealthDto } from "../lib/api";

export function HealthView() {
  const [healthData, setHealthData] = useState<BackendHealthDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await platformHealthApi.getHealth();
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || "Failed to reach backend health endpoint");
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Infrastructure & Edge Operations"
        title="Infrastructure Health & Cluster Telemetry"
        subtitle="Live service health, CPU/Memory telemetry, database connection pools, and edge uptime across multi-region nodes."
        actions={
          <button
            type="button"
            disabled={isLoading}
            onClick={fetchHealth}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted shadow-panel cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-4 text-primary ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Checking Status…" : "Check Agent Status"}</span>
          </button>
        }
      />

      {/* Global Status Banner */}
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-panel transition-all ${
          healthData?.status === "ok"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : healthData
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border bg-muted/20"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`grid size-9 place-items-center rounded-lg ${
              healthData?.status === "ok"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Server className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {healthData
                ? `Core Platform API: ${healthData.status.toUpperCase()} (${healthData.service} v${healthData.version})`
                : error
                ? `Core Platform API: Offline (${error})`
                : "Core Platform API: Connecting…"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {healthData ? (
                <>
                  PostgreSQL DB:{" "}
                  <strong className={healthData.database.connected ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                    {healthData.database.connected ? "Connected" : "Disconnected"}
                  </strong>{" "}
                  · Latency: <span className="font-mono font-semibold">{healthData.database.latencyMs ?? 0}ms</span> · Environment:{" "}
                  <span className="font-mono">{healthData.environment}</span>
                </>
              ) : (
                "Authoritative backend health telemetry via /api/v1/health."
              )}
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-semibold self-end sm:self-auto text-right">
          <div>Uptime: {healthData ? `${Math.floor(healthData.uptimeSeconds / 60)}m ${healthData.uptimeSeconds % 60}s` : "—"}</div>
          {lastChecked && <div className="text-[10px] text-muted-foreground font-normal">Last Checked: {lastChecked}</div>}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Authoritative PostgreSQL Cluster Card */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3.5 shadow-panel">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Database className="size-3.5 text-primary" />
                <span>Primary PostgreSQL Database</span>
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Multi-Tenant Core Storage · ap-south-1
              </p>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                healthData?.database.connected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {healthData?.database.connected ? "Operational" : "Not Connected"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            <div className="rounded-lg border border-border bg-muted/40 p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">Latency</span>
              <span className="font-bold text-foreground tabular-nums">
                {healthData?.database.latencyMs !== undefined ? `${healthData.database.latencyMs} ms` : "—"}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">Status</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {healthData?.database.status || "—"}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">Pool</span>
              <span className="font-bold text-foreground tabular-nums">
                {healthData?.database.connected ? "Active" : "—"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Schema: <strong className="text-foreground">Prisma Multi-Tenant</strong></span>
            <span>Live Health Telemetry</span>
          </div>
        </div>

        {MOCK_HEALTH_SERVICES.map((svc) => (
          <div
            key={svc.id}
            className="rounded-xl border border-border/80 bg-card p-4 space-y-3.5 shadow-panel"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">{svc.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {svc.category} · {svc.region}
                </p>
              </div>
              <span className="rounded bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Agent Not Configured
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-center">
                <span className="text-[10px] text-muted-foreground block">Latency</span>
                <span className="font-bold text-muted-foreground tabular-nums">—</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-center">
                <span className="text-[10px] text-muted-foreground block">CPU</span>
                <span className="font-bold text-muted-foreground tabular-nums">—</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-center">
                <span className="text-[10px] text-muted-foreground block">Memory</span>
                <span className="font-bold text-muted-foreground tabular-nums">—</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Telemetry: <strong className="text-muted-foreground">Prometheus Pending</strong></span>
              <span>Cluster Node</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
