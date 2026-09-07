import { AppShell, useNotify } from "@/components/app-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, useMockStore } from "@/mock";
import { createFileRoute } from "@tanstack/react-router";
import {
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  HardHat,
  IndianRupee,
  Layers,
  Printer,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "Analytical Reports & Exports | DEZOBUILD" },
      { name: "description", content: "Construction progress, cost-to-complete, material wastage, and labour productivity reports in DEZOBUILD." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { reports, projects, materials, expenses, labourContractors, equipment } = useMockStore();
  const notify = useNotify();

  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("This Month");
  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  if (!activeReport) {
    return (
      <AppShell crumb="Reports">
        <div className="p-12 text-center text-muted-foreground">No reports configured</div>
      </AppShell>
    );
  }

  const handleExport = (format: "PDF" | "XLSX") => {
    notify(`Generating and exporting ${activeReport.name} in ${format} format…`);
  };

  return (
    <AppShell crumb="Reports">
      <PageHeader
        title="Analytical Reports & Intelligence"
        subtitle="Standardized construction analytical reports: Progress S-curves, cost-to-complete, material reconciliations, and payroll audits."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleExport("PDF")} className="gap-1.5">
              <Download className="size-4" /> Export PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport("XLSX")} className="gap-1.5">
              <FileSpreadsheet className="size-4" /> Export XLSX
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Configured Standard Reports",
            value: reports.length,
            hint: "Weekly & monthly cadences",
            icon: <FileBarChart className="size-4" />,
          },
          {
            label: "Projects Audited",
            value: projects.length,
            hint: "Live connected data sync",
            icon: <Building2 className="size-4" />,
          },
          {
            label: "Generated This Month",
            value: "28 Reports",
            hint: "Exported to PDF & Excel",
            icon: <FileText className="size-4" />,
          },
          {
            label: "Data Accuracy",
            value: "100%",
            hint: "Verified against site transactions",
            tone: "healthy",
            icon: <CheckCircle2 className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Report Selector Sidebar */}
        <div className="rounded-lg border bg-card p-4 shadow-panel h-fit space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">
            Standard Reports Catalog
          </h3>

          <div className="space-y-1">
            {reports.map((rep) => {
              const isSelected = rep.id === selectedReportId;
              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`w-full text-left p-3 rounded-md border text-xs transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold border-primary shadow-sm"
                      : "bg-card hover:bg-muted text-foreground border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase opacity-80">{rep.category}</span>
                    <span className="rounded bg-black/10 px-1.5 py-0.5 text-[9px] font-mono">{rep.format}</span>
                  </div>
                  <p className="font-bold text-sm mt-1 leading-snug">{rep.name}</p>
                  <p className={`mt-1 text-[11px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Cadence: {rep.cadence}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Viewer / Preview Body */}
        <div className="rounded-lg border bg-card p-6 shadow-panel space-y-6">
          {/* Header of selected report */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground uppercase">
                  {activeReport.category}
                </span>
                <span className="text-xs text-muted-foreground">Cadence: {activeReport.cadence}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground mt-1">{activeReport.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{activeReport.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs font-semibold"
              >
                <option value="all">All Portfolio Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs font-semibold"
              >
                <option>This Month</option>
                <option>Last 30 Days</option>
                <option>Year to Date (FY26)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Report Preview Content depending on selected report */}
          {activeReport.id === "rep-001" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-foreground">Project S-Curve & Milestone Progress Matrix</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Planned Baseline</th>
                      <th className="px-4 py-3">Actual Physical Progress</th>
                      <th className="px-4 py-3">Schedule Variance</th>
                      <th className="px-4 py-3">Target Handover</th>
                      <th className="px-4 py-3">Health Tone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projects.map((p) => {
                      const varDays = p.health === "critical" ? "-14 Days" : p.health === "attention" ? "-6 Days" : "+4 Days";
                      return (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-bold text-foreground">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.client}</td>
                          <td className="px-4 py-3 font-mono font-semibold">{p.plannedProgress}%</td>
                          <td className="px-4 py-3 font-mono font-bold text-sm">{p.progress}%</td>
                          <td className={`px-4 py-3 font-mono font-bold ${p.health === "critical" ? "text-danger" : p.health === "attention" ? "text-warning" : "text-success"}`}>
                            {varDays}
                          </td>
                          <td className="px-4 py-3">{p.targetCompletion}</td>
                          <td className="px-4 py-3">
                            <HealthBadge health={p.health} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeReport.id === "rep-002" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-foreground">Earned Value Cost-to-Complete (EAC / ETC) Analysis</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Approved Budget (BAC)</th>
                      <th className="px-4 py-3">Actual Cost (ACWP)</th>
                      <th className="px-4 py-3">Estimate to Complete (ETC)</th>
                      <th className="px-4 py-3">Estimate at Completion (EAC)</th>
                      <th className="px-4 py-3">Projected Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projects.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-bold text-foreground">{p.name}</td>
                        <td className="px-4 py-3 font-mono font-bold">{formatCurrency(p.budget)}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(p.actualCost)}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(p.budget - p.actualCost)}</td>
                        <td className="px-4 py-3 font-mono font-bold">{formatCurrency(p.budget + p.varianceAmount)}</td>
                        <td className={`px-4 py-3 font-mono font-bold ${p.varianceAmount > 0 ? "text-danger" : "text-success"}`}>
                          {p.varianceAmount > 0 ? "11.2% (Depleted)" : "14.8% (Target)"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeReport.id === "rep-003" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-foreground">Material Consumption & Wastage Variance Audit</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Material Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Stock on Hand</th>
                      <th className="px-4 py-3">Unit Rate</th>
                      <th className="px-4 py-3">Total Value</th>
                      <th className="px-4 py-3">Wastage % vs BBS</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {materials.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-bold">{m.name}</td>
                        <td className="px-4 py-3">{m.category}</td>
                        <td className="px-4 py-3 font-mono font-bold">{m.currentStock} {m.unit}</td>
                        <td className="px-4 py-3 font-mono">₹{m.unitRate}</td>
                        <td className="px-4 py-3 font-mono font-bold">{formatCurrency(m.totalStockValue)}</td>
                        <td className={`px-4 py-3 font-mono font-bold ${m.status === "critical" ? "text-danger" : "text-success"}`}>
                          {m.status === "critical" ? "4.8% (Excess)" : "1.8% (Normal)"}
                        </td>
                        <td className="px-4 py-3">
                          <HealthBadge health={m.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeReport.id !== "rep-001" && activeReport.id !== "rep-002" && activeReport.id !== "rep-003" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-foreground">{activeReport.name} Live Summary Rollup</h3>
              <div className="rounded-lg border bg-muted/20 p-8 text-center text-xs text-muted-foreground space-y-3">
                <FileBarChart className="size-10 mx-auto text-primary" />
                <p className="font-bold text-sm text-foreground">Interactive Dataset Loaded ({dateRange})</p>
                <p>Showing full consolidated dataset across {projects.length} sites and 48 work packages.</p>
                <Button size="sm" onClick={() => handleExport("PDF")} className="gap-2">
                  <Download className="size-4" /> Download Complete Compiled {activeReport.format}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
