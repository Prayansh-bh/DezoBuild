import React from "react";
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

export function HealthView() {
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted shadow-panel cursor-pointer"
          >
            <RefreshCw className="size-4 text-primary" />
            <span>Check Agent Status</span>
          </button>
        }
      />

      {/* Global Status Banner */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-panel">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Server className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Infrastructure Monitoring Agent: Not Connected</h3>
            <p className="text-xs text-muted-foreground">Connect Prometheus / CloudWatch telemetry agent to monitor production clusters.</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-semibold self-end sm:self-auto">
          30-Day Platform Uptime: —
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                Not Connected
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
              <span>Telemetry: <strong className="text-muted-foreground">Unavailable</strong></span>
              <span>Agent: Not Connected</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
