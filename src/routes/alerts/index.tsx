import { AppShell, useNotify } from "@/components/app-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, mockStore, useMockStore } from "@/mock";
import type { SmartAlert } from "@/mock/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  HardHat,
  History,
  IndianRupee,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/alerts/")({
  head: () => ({
    meta: [
      { title: "Smart Alerts & Risk Mitigation | DEZOBUILD" },
      { name: "description", content: "Construction variance alerts, root cause analysis, and corrective actions in DEZOBUILD." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { alerts, projects } = useMockStore();
  const notify = useNotify();
  const navigate = useNavigate();

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // Drawer / Modal state
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);
  const [resolveNote, setResolveNote] = useState<string>("");
  const [assignUserModal, setAssignUserModal] = useState<SmartAlert | null>(null);
  const [assignedUserName, setAssignedUserName] = useState<string>("Rahul Menon");

  // Filtered Alerts
  const filteredAlerts = alerts.filter((a) => {
    // Severity tab
    if (severityFilter === "critical" && a.severity !== "critical") return false;
    if (severityFilter === "attention" && a.severity !== "attention") return false;
    if (severityFilter === "resolved" && a.status !== "resolved") return false;
    if (severityFilter === "open" && a.status === "resolved") return false;

    // Project
    if (projectFilter !== "all" && a.projectId !== projectFilter) return false;

    // Category
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;

    // Search
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.problem.toLowerCase().includes(q) ||
      a.projectName.toLowerCase().includes(q) ||
      a.suggestedAction.toLowerCase().includes(q)
    );
  });

  const totalOpen = alerts.filter((a) => a.status !== "resolved").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" && a.status !== "resolved").length;
  const attentionCount = alerts.filter((a) => a.severity === "attention" && a.status !== "resolved").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;

  const handleResolveAlert = (alertId: string) => {
    mockStore.resolveAlert(alertId, resolveNote || "Confirmed and rectified on site.");
    notify("Alert status updated to Resolved");
    setSelectedAlert(null);
    setResolveNote("");
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    mockStore.acknowledgeAlert(alertId);
    notify("Alert marked as Acknowledged by site leadership");
    setSelectedAlert(null);
  };

  return (
    <AppShell crumb="Alerts">
      <PageHeader
        title="Smart Alert Engine & Risk Mitigation"
        subtitle="Automated variance detection: root cause analysis, financial/schedule impacts, and traceable corrective action triggers."
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Critical Risks",
            value: criticalCount,
            hint: "Immediate owner intervention",
            tone: criticalCount > 0 ? "critical" : "healthy",
            icon: <ShieldAlert className="size-4" />,
          },
          {
            label: "Attention Items",
            value: attentionCount,
            hint: "Site review recommended",
            tone: attentionCount > 0 ? "attention" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
          {
            label: "Total Open Signals",
            value: totalOpen,
            hint: "Across all active projects",
            icon: <SlidersHorizontal className="size-4" />,
          },
          {
            label: "Resolved Signals",
            value: resolvedCount,
            hint: "Audited & confirmed closed",
            tone: "healthy",
            icon: <CheckCircle2 className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Filters Bar */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
            <TabsList className="bg-card border shadow-sm">
              <TabsTrigger value="all">All Alerts ({alerts.length})</TabsTrigger>
              <TabsTrigger value="critical">Critical ({criticalCount})</TabsTrigger>
              <TabsTrigger value="attention">Attention ({attentionCount})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search alerts by title, root cause, project, impact…"
          filters={
            <>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
              >
                <option value="all">All Categories</option>
                <option value="Material">Material</option>
                <option value="Schedule">Schedule</option>
                <option value="Cost">Cost</option>
                <option value="Equipment">Equipment</option>
                <option value="Payment">Payment</option>
                <option value="DPR">DPR</option>
              </select>
            </>
          }
          onReset={() => {
            setSearch("");
            setProjectFilter("all");
            setCategoryFilter("all");
            setSeverityFilter("all");
          }}
        />
      </div>

      {/* Alerts Cards List */}
      {filteredAlerts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-12 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <h3 className="mt-3 text-base font-bold">No Alerts in this View</h3>
          <p className="mt-1 text-sm text-muted-foreground">All parameters are currently within baseline thresholds.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border bg-card p-5 shadow-panel space-y-4 transition-all hover:shadow-float ${
                alert.status === "resolved"
                  ? "border-l-4 border-l-success opacity-85"
                  : alert.severity === "critical"
                  ? "border-l-4 border-l-danger"
                  : "border-l-4 border-l-warning"
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={alert.severity as any}>
                      {alert.severity === "critical" ? "Critical Priority" : "Attention"}
                    </StatusPill>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      {alert.category}
                    </span>
                    <WorkflowBadge status={alert.status} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-2">{alert.title}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Building2 className="size-3.5" /> <strong>{alert.projectName}</strong> · Detected {alert.createdAt}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedAlert(alert)}
                    className="text-xs gap-1"
                  >
                    View Audit History ({alert.history.length})
                  </Button>
                </div>
              </div>

              {/* Problem & Root Cause Grid */}
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-md border p-3 bg-muted/20">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Observed Symptom / Problem
                  </span>
                  <p className="mt-1 text-foreground leading-relaxed">{alert.problem}</p>
                </div>
                <div className="rounded-md border p-3 bg-muted/20">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Identified Root Cause
                  </span>
                  <p className="mt-1 text-foreground leading-relaxed">{alert.rootCause}</p>
                </div>
              </div>

              {/* Impact & Suggested Action */}
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-md border border-danger/20 bg-danger-soft p-3">
                  <span className="font-bold text-danger uppercase tracking-wider text-[10px]">
                    Operational & Financial Impact
                  </span>
                  <p className="mt-1 font-mono font-bold text-danger text-sm">{alert.impact}</p>
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <span className="font-bold text-primary uppercase tracking-wider text-[10px]">
                    Recommended Action
                  </span>
                  <p className="mt-1 text-foreground font-medium">{alert.suggestedAction}</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-3 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>Source:</span>
                  <span className="font-bold text-foreground underline">{alert.sourceRef.label}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (alert.sourceRef.to) {
                        navigate({ to: alert.sourceRef.to as any });
                      } else {
                        navigate({ to: `/projects/${alert.projectId}` as any });
                      }
                    }}
                    className="text-xs"
                  >
                    Review Source Transaction →
                  </Button>

                  {alert.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="text-xs"
                    >
                      Acknowledge
                    </Button>
                  )}

                  {alert.status !== "resolved" ? (
                    <Button
                      size="sm"
                      onClick={() => handleResolveAlert(alert.id)}
                      className="text-xs font-bold"
                    >
                      Resolve Alert
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-success flex items-center gap-1">
                      <CheckCircle2 className="size-4" /> Resolved at {alert.resolvedAt || "Today"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Audit Detail Drawer */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-primary" /> Alert Audit Trail & Actions
              </DialogTitle>
              <DialogDescription>{selectedAlert.title} · {selectedAlert.projectName}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Event Timeline</Label>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                  {selectedAlert.history.map((h, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <div className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{h.action}</p>
                        <p className="text-[11px] text-muted-foreground">{h.by} · {h.timestamp}</p>
                        {h.note && <p className="mt-1 text-xs text-foreground bg-card p-1.5 rounded border">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedAlert.status !== "resolved" && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs font-bold">Resolution Note</Label>
                  <Textarea
                    placeholder="Enter notes on actions taken on site to rectify this risk…"
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    className="h-18 text-xs"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAlert(null)}>
                      Close
                    </Button>
                    <Button size="sm" onClick={() => handleResolveAlert(selectedAlert.id)}>
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
