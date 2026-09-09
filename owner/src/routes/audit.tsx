import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Filter,
  Info,
  Search,
  Shield,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatusBadge } from "../components/shared/status-badge";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_AUDIT_LOGS } from "../mock/platform-data";
import type { PlatformAuditLog } from "../types";

export function AuditView() {
  const [logs, setLogs] = useState<PlatformAuditLog[]>(MOCK_AUDIT_LOGS);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filtered = logs.filter((l) => {
    const matchesSev = severityFilter === "all" || l.severity === severityFilter;
    const matchesSearch =
      l.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.targetEntity.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase());
    return matchesSev && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Compliance & Security Telemetry"
        title="Platform Security Audit Trail"
        subtitle="Cryptographically signed, immutable log of all platform-level administrative actions, tenant provisioning, and entitlement mutations."
      />

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, target tenant, or IP…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-panel"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(["all", "info", "warning", "critical"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                severityFilter === s
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table or Empty State */}
      {filtered.length > 0 ? (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="p-3.5 font-semibold">Timestamp (UTC)</th>
                  <th className="p-3.5 font-semibold">Severity</th>
                  <th className="p-3.5 font-semibold">Actor</th>
                  <th className="p-3.5 font-semibold">Action</th>
                  <th className="p-3.5 font-semibold">Target Entity</th>
                  <th className="p-3.5 font-semibold">IP Address</th>
                  <th className="p-3.5 font-semibold">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap tabular-nums">{log.timestamp}</td>
                    <td className="p-3.5">
                      <StatusBadge status={log.severity} />
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-red-600 dark:text-red-400 text-xs">{log.actorRole}</div>
                      <div className="text-[10px] text-muted-foreground">{log.actorEmail}</div>
                    </td>
                    <td className="p-3.5 font-bold text-foreground">{log.action}</td>
                    <td className="p-3.5 text-foreground">{log.targetEntity}</td>
                    <td className="p-3.5 text-muted-foreground tabular-nums">{log.ipAddress}</td>
                    <td className="p-3.5 text-muted-foreground text-[11px] leading-relaxed max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title="No platform audit events yet"
          description="Administrative mutations, tenant lifecycle events, and security policy adjustments will be appended to this immutable audit ledger."
        />
      )}
    </div>
  );
}
