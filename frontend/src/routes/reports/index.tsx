import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HardHat,
  IndianRupee,
  Layers,
  PieChart,
  Printer,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AppShell, useNotify } from "@/components/app-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, useMockStore, useContextualData } from "@/mock";
import { useCurrentUser } from "@/auth";
import { CustomerRole, hasPermission } from "@/authorization";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "Analytics & Reports Intelligence | DEZOBUILD" },
      {
        name: "description",
        content:
          "Construction progress, cost-to-complete, material wastage, and labour productivity reports in DEZOBUILD.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const store = useMockStore();
  const contextual = useContextualData();
  const { user } = useCurrentUser();
  const notify = useNotify();

  const allReports = store.reports;
  const projects = contextual.projects;
  const materials = store.materials;
  const expenses = contextual.expenses;
  const labourContractors = store.labourContractors;
  const equipment = store.equipment;

  // Primary Section Navigation: overview | project | financial | procurement | people | equipment | operational
  const [reportCategoryTab, setReportCategoryTab] = useState("overview");

  // Role-based permitted reports filtering
  const reports = allReports.filter((r) => {
    if (user.role === CustomerRole.HR) {
      return r.category === "People & HR" || r.category === "Operations";
    }
    if (user.role === CustomerRole.ACCOUNTANT) {
      return r.category === "Cost & Commercial" || r.category === "Finance & Accounts" || r.category === "Progress";
    }
    if (user.role === CustomerRole.PROCUREMENT_STORE) {
      return r.category === "Materials & Stores" || r.category === "Plant & Machinery" || r.category === "Operations";
    }
    if (user.role === CustomerRole.SITE_ENGINEER) {
      return r.category === "Progress" || r.category === "Operations" || r.category === "People & HR";
    }
    return true;
  });

  const filteredReports = reports.filter((r) => {
    if (reportCategoryTab === "project" && r.category !== "Progress") return false;
    if (reportCategoryTab === "financial" && r.category !== "Cost & Commercial" && r.category !== "Finance & Accounts") return false;
    if (reportCategoryTab === "procurement" && r.category !== "Materials & Stores") return false;
    if (reportCategoryTab === "people" && r.category !== "People & HR") return false;
    if (reportCategoryTab === "equipment" && r.category !== "Plant & Machinery") return false;
    if (reportCategoryTab === "operational" && r.category !== "Operations") return false;
    return true;
  });

  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || "");
  const [dateRange, setDateRange] = useState<string>("This Month");
  const activeReport = reports.find((r) => r.id === selectedReportId) || filteredReports[0] || reports[0];

  if (!activeReport) {
    return (
      <AppShell crumb="Reports">
        <div className="p-12 text-center text-muted-foreground">No reports permitted for active role scope.</div>
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
            <Button
              size="sm"
              onClick={() => handleExport("PDF")}
              className="gap-1.5 shadow-sm"
            >
              <Download className="size-4" /> Export Report (PDF)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport("XLSX")}
              className="gap-1.5"
            >
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
            label: "Standard Reports Catalog",
            value: `${reports.length} Reports`,
            hint: "Role-permitted report templates",
            icon: <BarChart3 className="size-4" />,
          },
          {
            label: "Portfolio Scope",
            value: `${projects.length} Active Sites`,
            hint: "Aggregated site data models",
            icon: <Building2 className="size-4" />,
          },
          {
            label: "Export Formats",
            value: "PDF & Excel",
            hint: "Executive & tabular layouts",
            icon: <FileText className="size-4" />,
          },
          {
            label: "Report Status",
            value: "Ready",
            hint: "Analytical dataset verified",
            tone: "healthy",
            icon: <CheckCircle2 className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Section Navigation Tabs */}
      <div className="space-y-6">
        <div className="flex border-b border-border/80">
          <button
            type="button"
            onClick={() => setReportCategoryTab("overview")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              reportCategoryTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <PieChart className="size-4" /> Intelligence Overview
          </button>
          <button
            type="button"
            onClick={() => setReportCategoryTab("project")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              reportCategoryTab === "project"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="size-4" /> Project & Progress
          </button>
          <button
            type="button"
            onClick={() => setReportCategoryTab("financial")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              reportCategoryTab === "financial"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <IndianRupee className="size-4" /> Financial & Cost
          </button>
          <button
            type="button"
            onClick={() => setReportCategoryTab("procurement")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              reportCategoryTab === "procurement"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="size-4" /> Materials & Stores
          </button>
          <button
            type="button"
            onClick={() => setReportCategoryTab("people")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              reportCategoryTab === "people"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HardHat className="size-4" /> People & Workforce
          </button>
          <button
            type="button"
            onClick={() => setReportCategoryTab("equipment")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              reportCategoryTab === "equipment"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="size-4" /> Equipment & Fleet
          </button>
        </div>

        {/* SECTION 1: OVERVIEW */}
        {reportCategoryTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div
                onClick={() => setReportCategoryTab("project")}
                className="p-5 rounded-xl border bg-card shadow-panel hover:border-primary/50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Progress & S-Curves</span>
                  <TrendingUp className="size-4 text-primary" />
                </div>
                <p className="text-base font-bold text-foreground">Earned Value & Physical Progress</p>
                <p className="text-xs text-muted-foreground">Milestone tracking, baseline variances, and completion forecasts.</p>
              </div>

              <div
                onClick={() => setReportCategoryTab("financial")}
                className="p-5 rounded-xl border bg-card shadow-panel hover:border-primary/50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Cost-to-Complete</span>
                  <IndianRupee className="size-4 text-sky-500" />
                </div>
                <p className="text-base font-bold text-foreground">Commercial & Budget Variance</p>
                <p className="text-xs text-muted-foreground">EAC calculations, committed PO exposures, and subcontractor advances.</p>
              </div>

              <div
                onClick={() => setReportCategoryTab("procurement")}
                className="p-5 rounded-xl border bg-card shadow-panel hover:border-primary/50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Material Reconciliation</span>
                  <Layers className="size-4 text-amber-500" />
                </div>
                <p className="text-base font-bold text-foreground">Store Stock & Wastage Audit</p>
                <p className="text-xs text-muted-foreground">Theoretical vs actual consumption, cement/steel reconciliations.</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-panel space-y-4">
              <h3 className="font-bold text-sm text-foreground">Available Analytics Catalog</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {reports.slice(0, 6).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedReportId(r.id);
                      setReportCategoryTab("project");
                    }}
                    className="p-3.5 rounded-lg border bg-muted/20 hover:border-primary/40 cursor-pointer transition-all flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-foreground text-xs">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.category} · {r.cadence}</p>
                    </div>
                    <span className="text-primary font-bold text-xs flex items-center gap-1">
                      Preview <ChevronRight className="size-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2..7: REPORT DETAIL CANVAS */}
        {reportCategoryTab !== "overview" && (
          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Report Selector Sidebar */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-panel h-fit space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">
                Reports in this Domain
              </h3>

              <div className="space-y-1.5">
                {filteredReports.map((rep) => {
                  const active = rep.id === activeReport.id;
                  return (
                    <button
                      key={rep.id}
                      onClick={() => setSelectedReportId(rep.id)}
                      className={`flex w-full flex-col rounded-lg p-2.5 text-left text-xs transition-all ${
                        active
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate">{rep.name}</span>
                      </div>
                      <span
                        className={`mt-1 text-[10px] ${
                          active ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {rep.cadence}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Report Preview Canvas */}
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                    {activeReport.category}
                  </span>
                  <h2 className="text-lg font-bold text-foreground mt-0.5">{activeReport.name}</h2>
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{activeReport.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="h-8 rounded-md border bg-background px-2 text-xs font-semibold"
                  >
                    <option>This Month</option>
                    <option>Last Quarter</option>
                    <option>Financial Year 2026</option>
                  </select>
                </div>
              </div>

              {/* Sample Report Live Rollup */}
              <div className="rounded-lg border bg-muted/20 p-8 text-center text-xs text-muted-foreground space-y-3">
                <BarChart3 className="size-10 mx-auto text-primary" />
                <p className="font-bold text-sm text-foreground">
                  {activeReport.name} ({dateRange})
                </p>
                <p>
                  {projects.length > 0
                    ? `Consolidated data aggregated across ${projects.length} sites and verified work packages.`
                    : "No operational data recorded for the selected period yet."}
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <Button size="sm" onClick={() => handleExport("PDF")} className="gap-2 shadow-sm">
                    <Download className="size-4" /> Download Compiled PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport("XLSX")} className="gap-2">
                    <FileSpreadsheet className="size-4" /> Export XLSX
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
