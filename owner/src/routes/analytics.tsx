import React from "react";
import {
  Activity,
  ArrowUpRight,
  Database,
  HardDrive,
  LineChart,
  Server,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatGrid, type StatItem } from "../components/shared/stat-grid";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_TELEMETRY } from "../mock/platform-data";

export function AnalyticsView() {
  const statItems: StatItem[] = [
    {
      label: "API Request Traffic (24h)",
      value: "—",
      hint: "Telemetry collector pending",
      tone: "default",
      icon: <Zap className="size-5" />,
    },
    {
      label: "Edge WebSocket Sessions",
      value: "—",
      hint: "No active gateway sessions",
      tone: "default",
      icon: <Activity className="size-5" />,
    },
    {
      label: "Object Storage Usage",
      value: "—",
      hint: "S3 / MinIO storage telemetry pending",
      tone: "default",
      icon: <HardDrive className="size-5" />,
    },
    {
      label: "Gateway Error Rate",
      value: "—",
      hint: "Edge metrics collector required",
      tone: "default",
      icon: <Server className="size-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Cluster Performance & Ingestion"
        title="Platform Telemetry & Usage Analytics"
        subtitle="Aggregated system request traffic, latency distributions, data ingestion rates, and storage growth curves."
      />

      {/* KPI Overview */}
      <StatGrid items={statItems} columns={4} />

      {/* Empty State Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Percentiles */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-panel space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span>API Latency Percentile Distribution</span>
          </h2>
          <EmptyState
            icon={Activity}
            title="No latency telemetry recorded"
            description="Median (p50), heavy DPR (p95), and BIM query (p99) latency percentiles will stream once the API gateway exporter is online."
          />
        </div>

        {/* Storage Distribution */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-panel space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HardDrive className="size-4 text-primary" />
            <span>Platform Cloud Storage Breakdown</span>
          </h2>
          <EmptyState
            icon={HardDrive}
            title="No storage metrics available"
            description="Object storage usage across BIM IFC models, DPR photos, and document attachments will populate from storage telemetry."
          />
        </div>
      </div>
    </div>
  );
}
