import { AppShell, useNotify } from "@/components/app-shell";
import { DocumentViewerDialog } from "@/components/shared/document-viewer";
import { PageHeader } from "@/components/shared/page-header";
import { PhotoGalleryDialog } from "@/components/shared/photo-gallery";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, mockStore, useMockStore } from "@/mock";
import type { DocumentItem, DprPhoto, DprRecord, WbsActivity, WbsStatus } from "@/mock/types";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileBarChart,
  FileText,
  HardHat,
  IndianRupee,
  Layers,
  MapPin,
  Plus,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/projects/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Project Details | DEZOBUILD` },
      { name: "description", content: "Comprehensive Project 360° Command Center in DEZOBUILD." },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const params = useParams({ from: "/projects/$id" });
  const {
    projects,
    wbsActivities,
    dprRecords,
    materials,
    indents,
    expenses,
    payments,
    labourContractors,
    equipment,
    alerts,
    documents,
  } = useMockStore();

  const notify = useNotify();

  // Find project by id or fallback to first
  const project = projects.find((p) => p.id === params.id) || projects[0];

  if (!project) {
    return (
      <AppShell crumb="Project Not Found">
        <div className="p-12 text-center">
          <p className="font-bold text-base">Project Not Found</p>
          <Button asChild className="mt-4">
            <Link to={"/projects" as any}>Return to Projects</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  // Active Tab
  const [activeTab, setActiveTab] = useState("overview");

  // Filtered Project-specific Data
  const projWbs = wbsActivities.filter((w) => w.projectId === project.id);
  const projDprs = dprRecords.filter((d) => d.projectId === project.id);
  const projExpenses = expenses.filter((e) => e.projectId === project.id);
  const projPayments = payments.filter((p) => p.projectId === project.id);
  const projIndents = indents.filter((i) => i.projectId === project.id);
  const projAlerts = alerts.filter((a) => a.projectId === project.id || a.projectName.includes(project.name));
  const projDocs = documents.filter((d) => d.projectId === project.id);
  const projEquipment = equipment.filter((eq) => eq.currentSite.includes(project.name) || eq.currentSite === project.name);

  // Dialog States
  const [addWbsOpen, setAddWbsOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DprPhoto | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [viewDpr, setViewDpr] = useState<DprRecord | null>(null);

  // New WBS Activity Form State
  const [wbsCode, setWbsCode] = useState(`2.${projWbs.length + 1}`);
  const [wbsName, setWbsName] = useState("");
  const [wbsCategory, setWbsCategory] = useState<WbsActivity["category"]>("Superstructure");
  const [wbsUnit, setWbsUnit] = useState("cum");
  const [wbsPlannedQty, setWbsPlannedQty] = useState("1000");
  const [wbsPlannedRate, setWbsPlannedRate] = useState("4500");
  const [wbsGang, setWbsGang] = useState("Apex Formwork & Concreting");

  const handleAddWbs = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(wbsPlannedQty) || 100;
    const rate = parseFloat(wbsPlannedRate) || 1000;
    mockStore.addWbsActivity({
      projectId: project.id,
      parentId: null,
      code: wbsCode,
      name: wbsName || "New Work Activity",
      category: wbsCategory,
      unit: wbsUnit,
      plannedQty: qty,
      actualQty: 0,
      plannedRate: rate,
      actualRate: rate,
      plannedCost: qty * rate,
      actualCost: 0,
      plannedProgress: 0,
      actualProgress: 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: project.targetCompletion,
      status: "not_started",
      assignedGang: wbsGang,
    });
    notify(`Activity "${wbsName}" added to WBS tree.`);
    setAddWbsOpen(false);
    setWbsName("");
  };

  const remainingBudget = project.budget - project.actualCost;
  const budgetUtilization = ((project.actualCost / project.budget) * 100).toFixed(1);

  return (
    <AppShell crumb={project.name}>
      {/* Top Breadcrumb & Actions Page Header */}
      <PageHeader
        title={project.name}
        subtitle={`${project.code} · ${project.client} · ${project.location}`}
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <HealthBadge health={project.health} />
            <Button size="sm" onClick={() => notify(`Exported Project 360 Summary PDF for ${project.name}`)} variant="outline">
              <Download className="size-4" /> Export 360° Report
            </Button>
          </div>
        }
      />

      {/* Critical Alert Banner if Project has risks */}
      {project.health === "critical" && (
        <div className="mb-6 flex items-start justify-between rounded-lg border border-danger/30 bg-danger-soft p-4 text-xs">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-danger" />
            <div>
              <p className="font-bold text-danger text-sm">Critical Attention Required</p>
              <p className="mt-0.5 text-foreground/90 font-medium">
                {projAlerts[0]?.problem || "Material consumption or schedule milestone has exceeded baseline variance limits."}
              </p>
              <p className="mt-1 font-mono font-semibold text-danger">
                Financial Impact: +{formatCurrency(project.varianceAmount)} variance
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setActiveTab("alerts")}
            className="shrink-0"
          >
            Review Alerts ({projAlerts.length})
          </Button>
        </div>
      )}

      {/* Primary KPI Ribbon */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Approved Budget",
            value: formatCurrency(project.budget),
            hint: `Remaining: ${formatCurrency(remainingBudget)}`,
            icon: <IndianRupee className="size-4" />,
          },
          {
            label: "Incurred Cost",
            value: formatCurrency(project.actualCost),
            hint: `${budgetUtilization}% Budget Utilized`,
            tone: project.varianceAmount > 0 ? "critical" : "healthy",
            icon: <TrendingUp className="size-4" />,
          },
          {
            label: "Physical Progress",
            value: `${project.progress}%`,
            hint: `Planned Baseline: ${project.plannedProgress}%`,
            tone: project.progress < project.plannedProgress ? "attention" : "healthy",
            icon: <Layers className="size-4" />,
          },
          {
            label: "Workforce on Site Today",
            value: `${project.activeWorkersToday} Workers`,
            hint: `Weather: ${project.weatherToday.temp} (${project.weatherToday.condition})`,
            icon: <HardHat className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Comprehensive 10-Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border bg-card p-1 shadow-sm h-auto flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5 py-2">
            <Building2 className="size-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="wbs" className="gap-1.5 py-2">
            <Layers className="size-4" /> WBS & Activities ({projWbs.length})
          </TabsTrigger>
          <TabsTrigger value="dpr" className="gap-1.5 py-2">
            <HardHat className="size-4" /> Daily Progress / DPR ({projDprs.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5 py-2">
            <Boxes className="size-4" /> Materials & Stores
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5 py-2">
            <WalletCards className="size-4" /> Expenses & Cost ({projExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="labour" className="gap-1.5 py-2">
            <Users className="size-4" /> Labour & Manpower
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-1.5 py-2">
            <Truck className="size-4" /> Equipment ({projEquipment.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 py-2">
            <IndianRupee className="size-4" /> Billing & Payments ({projPayments.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 py-2">
            <FileText className="size-4" /> Drawings & Docs ({projDocs.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 py-2">
            <AlertTriangle className="size-4" /> Alerts ({projAlerts.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Progress & Baseline Card */}
            <div className="lg:col-span-2 rounded-lg border bg-card p-5 shadow-panel space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base">Construction Progress vs Schedule Baseline</h3>
                <span className="text-xs font-semibold text-muted-foreground">Target: {project.targetCompletion}</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span>Actual Cumulative Progress</span>
                  <span className="font-mono font-bold text-foreground">{project.progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${
                      project.health === "critical"
                        ? "bg-danger"
                        : project.health === "attention"
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Mobilization: {project.startDate}</span>
                  <span>Planned Baseline: {project.plannedProgress}%</span>
                  <span>Variance: {project.progress - project.plannedProgress}%</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t pt-4 text-xs">
                <div className="rounded-md bg-muted/40 p-3">
                  <span className="text-muted-foreground">Site Footprint</span>
                  <p className="font-bold text-foreground mt-0.5">{project.siteArea}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <span className="text-muted-foreground">Built-up Area</span>
                  <p className="font-bold text-foreground mt-0.5">{project.builtUpArea}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <span className="text-muted-foreground">Live Weather</span>
                  <p className="font-bold text-foreground mt-0.5 capitalize">{project.weatherToday.condition}, {project.weatherToday.temp}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Scope & Engineering Summary
                </h4>
                <p className="text-xs leading-relaxed text-foreground/90 bg-muted/20 p-3 rounded border">
                  {project.description}
                </p>
              </div>
            </div>

            {/* Site Team Contacts Card */}
            <div className="rounded-lg border bg-card p-5 shadow-panel space-y-4">
              <h3 className="font-bold text-base border-b pb-3">Project Leadership & Team</h3>

              <div className="space-y-3 text-xs">
                <div className="rounded-md border p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
                      {project.manager.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{project.manager.name}</p>
                      <p className="text-muted-foreground">{project.manager.role}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    <p>Phone: {project.manager.phone}</p>
                    <p>Email: {project.manager.email}</p>
                  </div>
                </div>

                {project.team.filter((t) => t.id !== project.manager.id).map((member) => (
                  <div key={member.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-semibold text-foreground">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground">{member.role}</p>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">{member.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. WBS / ACTIVITIES TAB */}
        <TabsContent value="wbs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Work Breakdown Structure (WBS)</h3>
              <p className="text-xs text-muted-foreground">Track planned vs actual physical quantities, unit rates, and cost variance per work package.</p>
            </div>
            <Button size="sm" onClick={() => setAddWbsOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Add WBS Activity
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Activity Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Planned Qty</th>
                  <th className="px-4 py-3">Actual Qty</th>
                  <th className="px-4 py-3">Planned Cost</th>
                  <th className="px-4 py-3">Actual Cost</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projWbs.map((act) => {
                  const isOverBudget = act.actualCost > act.plannedCost;
                  return (
                    <tr key={act.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold">{act.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground">{act.name}</p>
                        <p className="text-[11px] text-muted-foreground">Gang: {act.assignedGang}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">
                          {act.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">{act.plannedQty.toLocaleString("en-IN")} {act.unit}</td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">{act.actualQty.toLocaleString("en-IN")} {act.unit}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(act.plannedCost)}</td>
                      <td className={`px-4 py-3 font-mono font-bold ${isOverBudget ? "text-danger" : "text-foreground"}`}>
                        {formatCurrency(act.actualCost)}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="font-bold">{act.actualProgress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${
                              act.status === "delayed"
                                ? "bg-danger"
                                : act.status === "completed"
                                ? "bg-success"
                                : "bg-primary"
                            }`}
                            style={{ width: `${act.actualProgress}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <WorkflowBadge status={act.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 3. DAILY PROGRESS / DPR TAB */}
        <TabsContent value="dpr" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Daily Progress Reports (DPR)</h3>
              <p className="text-xs text-muted-foreground">Field logs, weather logs, manpower muster, equipment logs, and site photos.</p>
            </div>
            <Button size="sm" onClick={() => notify("Use Quick Add (Top right) to log a new DPR")} className="gap-1.5">
              <Plus className="size-4" /> New Daily Log
            </Button>
          </div>

          {projDprs.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-xs text-muted-foreground">
              No DPR logs recorded yet for this project. Use the Quick Add menu to record today's site activity.
            </div>
          ) : (
            <div className="space-y-4">
              {projDprs.map((dpr) => (
                <div key={dpr.id} className="rounded-lg border bg-card p-5 shadow-panel space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{dpr.dprNumber}</span>
                        <WorkflowBadge status={dpr.status} />
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-1">Date: {dpr.date} · {dpr.shift}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Submitted by <strong>{dpr.submittedBy.name}</strong> ({dpr.submittedBy.role})</span>
                      <Button size="sm" variant="outline" onClick={() => setViewDpr(dpr)}>
                        <Eye className="size-3.5 mr-1" /> View Full Sheet
                      </Button>
                    </div>
                  </div>

                  {/* Summary grid */}
                  <div className="grid gap-3 sm:grid-cols-4 text-xs">
                    <div className="rounded-md border p-2.5 bg-muted/20">
                      <span className="text-muted-foreground">Weather & Temp</span>
                      <p className="font-bold capitalize mt-0.5">{dpr.weather}, {dpr.temperature}</p>
                    </div>
                    <div className="rounded-md border p-2.5 bg-muted/20">
                      <span className="text-muted-foreground">Total Workforce Deployed</span>
                      <p className="font-bold mt-0.5">
                        {dpr.manpower.reduce((acc, m) => acc + m.skilled + m.unskilled + m.supervisor, 0)} Craftsmen
                      </p>
                    </div>
                    <div className="rounded-md border p-2.5 bg-muted/20">
                      <span className="text-muted-foreground">Active Equipment</span>
                      <p className="font-bold mt-0.5">{dpr.equipment.length} Units Running</p>
                    </div>
                    <div className="rounded-md border p-2.5 bg-muted/20">
                      <span className="text-muted-foreground">Safety Incidents</span>
                      <p className="font-bold text-success mt-0.5">Zero Incidents</p>
                    </div>
                  </div>

                  {/* Accomplishments */}
                  <div>
                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Key Activities Executed Today
                    </h5>
                    <div className="space-y-1.5 text-xs">
                      {dpr.progressItems.map((item, idx) => (
                        <div key={idx} className="rounded border bg-muted/10 p-2 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-foreground">{item.activityName}: </span>
                            <span className="text-muted-foreground">{item.workCompleted}</span>
                          </div>
                          <span className="font-mono font-bold shrink-0 ml-3">
                            {item.quantityDone} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Photos */}
                  {dpr.photos.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Site Inspection Photos ({dpr.photos.length})
                      </h5>
                      <div className="flex flex-wrap gap-3">
                        {dpr.photos.map((photo) => (
                          <button
                            key={photo.id}
                            onClick={() => setSelectedPhoto(photo)}
                            className="group relative h-20 w-28 overflow-hidden rounded-md border bg-black shadow-sm"
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="size-4 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 4. MATERIALS TAB */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Site Materials & Stores</h3>
              <p className="text-xs text-muted-foreground">Stock levels, site indents, and recent material issues.</p>
            </div>
            <Button size="sm" asChild>
              <Link to={"/materials" as any}>Open Materials Workspace →</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-4 shadow-panel">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Current Stock Allocated to this Site
              </h4>
              <div className="divide-y text-xs">
                {materials.map((mat) => {
                  const alloc = mat.siteAllocations.find((s) => s.siteName.includes(project.name) || project.name.includes(s.siteName));
                  const qty = alloc ? alloc.quantity : 0;
                  return (
                    <div key={mat.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{mat.name}</p>
                        <p className="text-[11px] text-muted-foreground">{mat.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold">{qty} {mat.unit}</p>
                        <p className="text-[10px] text-muted-foreground">Rate: ₹{mat.unitRate}/{mat.unit}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-panel">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Pending Site Material Indents ({projIndents.length})
              </h4>
              <div className="space-y-2 text-xs">
                {projIndents.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center">No open indents for this project.</p>
                ) : (
                  projIndents.map((ind) => (
                    <div key={ind.id} className="rounded border bg-muted/20 p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono font-bold text-primary">{ind.indentNumber}</span>
                        <WorkflowBadge status={ind.status} />
                      </div>
                      <p className="text-muted-foreground">{ind.items.map((i) => `${i.quantity} ${i.unit} of ${i.materialName}`).join(", ")}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Required by: {ind.requiredDate}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. EXPENSES & COST TAB */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Project Expense Register</h3>
              <p className="text-xs text-muted-foreground">Petty cash, fuel, statutory permits, and site vouchers.</p>
            </div>
            <Button size="sm" asChild>
              <Link to={"/finance" as any}>Manage in Finance →</Link>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor / Payee</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{exp.expenseNumber}</td>
                    <td className="px-4 py-3">{exp.date}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">{exp.category}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{exp.vendorContractor}</td>
                    <td className="px-4 py-3 font-mono font-bold">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3">{exp.paymentMode}</td>
                    <td className="px-4 py-3">
                      <WorkflowBadge status={exp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 6. LABOUR & MANPOWER TAB */}
        <TabsContent value="labour" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Labour & Subcontractor Workforce</h3>
              <p className="text-xs text-muted-foreground">Contractor muster roll deployments, daily attendance, and wage bills.</p>
            </div>
            <Button size="sm" asChild>
              <Link to={"/people" as any}>Labour Directory →</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {labourContractors
              .filter((lc) => lc.assignedProject.includes(project.name) || project.name.includes(lc.assignedProject))
              .map((lc) => (
                <div key={lc.id} className="rounded-lg border bg-card p-4 shadow-panel space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="font-bold text-sm">{lc.name}</h4>
                      <p className="text-xs text-muted-foreground">{lc.trade}</p>
                    </div>
                    <WorkflowBadge status={lc.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Deployed Today</span>
                      <p className="font-bold font-mono text-sm">{lc.currentDeployment} Workers</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Planned Muster</span>
                      <p className="font-bold font-mono text-sm">{lc.plannedDeployment} Workers</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supervisor</span>
                      <p className="font-medium">{lc.supervisorName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Daily Wage</span>
                      <p className="font-mono font-bold">₹{lc.dailyWageRate}/day</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* 7. EQUIPMENT TAB */}
        <TabsContent value="equipment" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Plant & Machinery Deployed</h3>
              <p className="text-xs text-muted-foreground">Operating hours, fuel consumption, and service status.</p>
            </div>
            <Button size="sm" asChild>
              <Link to={"/equipment" as any}>Equipment Master →</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {projEquipment.map((eq) => (
              <div key={eq.id} className="rounded-lg border bg-card p-4 shadow-panel space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">{eq.assetCode}</span>
                    <h4 className="font-bold text-sm">{eq.name}</h4>
                  </div>
                  <WorkflowBadge status={eq.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Operating Hours</span>
                    <p className="font-mono font-bold text-sm">{eq.totalOperatingHours} hrs</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Service In</span>
                    <p className="font-mono font-bold text-sm">{eq.nextServiceInHours} hrs</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Operator</span>
                    <p className="font-medium">{eq.operator.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ownership</span>
                    <p className="font-medium">{eq.ownership}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 8. PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Running Account (RA) Bills & Payments</h3>
              <p className="text-xs text-muted-foreground">Certifications, vendor payments, and retention money ledgers.</p>
            </div>
            <Button size="sm" asChild>
              <Link to={"/finance" as any}>Finance Ledger →</Link>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Voucher Ref</th>
                  <th className="px-4 py-3">Payee Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Invoice Ref</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{pay.voucherNumber}</td>
                    <td className="px-4 py-3 font-bold">{pay.payeeName}</td>
                    <td className="px-4 py-3">{pay.payeeType}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">{pay.invoiceRef}</td>
                    <td className="px-4 py-3 font-mono font-bold">{formatCurrency(pay.amount)}</td>
                    <td className="px-4 py-3">{pay.dueDate}</td>
                    <td className="px-4 py-3">
                      <WorkflowBadge status={pay.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 9. DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Drawings & Technical Documents</h3>
              <p className="text-xs text-muted-foreground">Structural drawings, GFC revisions, geotechnical reports, and compliance approvals.</p>
            </div>
            <Button size="sm" asChild>
              <Link to={"/documents" as any}>All Documents →</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="flex flex-col justify-between rounded-lg border bg-card p-4 shadow-panel hover:shadow-float transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="rounded bg-muted px-2 py-0.5 font-semibold text-primary">{doc.type}</span>
                    <span className="font-mono">{doc.version}</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{doc.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{doc.category} · {doc.size}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
                  <span>Updated: {doc.updatedDate}</span>
                  <span className="font-semibold text-primary flex items-center gap-1">
                    <Eye className="size-3.5" /> Preview
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 10. ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Project Alerts & Corrective Actions</h3>
              <p className="text-xs text-muted-foreground">Smart variance detections, root causes, financial impacts, and action triggers.</p>
            </div>
          </div>

          <div className="space-y-3">
            {projAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border bg-card p-5 shadow-panel space-y-3 ${
                  alert.severity === "critical" ? "border-l-4 border-l-danger" : "border-l-4 border-l-warning"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <StatusPill tone={alert.severity as any}>
                      {alert.severity === "critical" ? "Critical Priority" : "Attention"}
                    </StatusPill>
                    <span className="text-xs text-muted-foreground">{alert.createdAt}</span>
                  </div>
                  <WorkflowBadge status={alert.status} />
                </div>

                <h4 className="text-base font-bold text-foreground">{alert.title}</h4>
                <p className="text-xs text-muted-foreground">{alert.problem}</p>

                <div className="grid gap-3 sm:grid-cols-2 rounded-md bg-muted/30 p-3 text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground">Root Cause:</span>
                    <p className="mt-0.5 text-foreground">{alert.rootCause}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Estimated Impact:</span>
                    <p className="mt-0.5 font-mono font-bold text-danger">{alert.impact}</p>
                  </div>
                </div>

                <div className="rounded-md border bg-primary/5 border-primary/20 p-3 text-xs">
                  <span className="font-bold text-primary">Recommended Action:</span>
                  <p className="mt-0.5 text-foreground">{alert.suggestedAction}</p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {alert.status !== "resolved" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        mockStore.resolveAlert(alert.id);
                        notify(`Alert "${alert.title}" resolved.`);
                      }}
                    >
                      Mark as Resolved
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add WBS Activity Dialog */}
      <Dialog open={addWbsOpen} onOpenChange={setAddWbsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Work Breakdown Structure (WBS) Activity</DialogTitle>
            <DialogDescription>Define planned quantities, unit rate, and assigned subcontractor gang.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddWbs} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Activity Code</Label>
                <Input value={wbsCode} onChange={(e) => setWbsCode(e.target.value)} required className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={wbsCategory}
                  onChange={(e) => setWbsCategory(e.target.value as WbsActivity["category"])}
                  className="h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                >
                  <option>Substructure</option>
                  <option>Superstructure</option>
                  <option>Finishes</option>
                  <option>MEP</option>
                  <option>External Works</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Activity Description *</Label>
              <Input
                placeholder="e.g. M40 Raft Concreting / AAC Block Masonry"
                value={wbsName}
                onChange={(e) => setWbsName(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Unit</Label>
                <Input value={wbsUnit} onChange={(e) => setWbsUnit(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Planned Qty</Label>
                <Input
                  type="number"
                  value={wbsPlannedQty}
                  onChange={(e) => setWbsPlannedQty(e.target.value)}
                  required
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Unit Rate (₹)</Label>
                <Input
                  type="number"
                  value={wbsPlannedRate}
                  onChange={(e) => setWbsPlannedRate(e.target.value)}
                  required
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Assigned Subcontractor / Labour Gang</Label>
              <Input value={wbsGang} onChange={(e) => setWbsGang(e.target.value)} className="h-9" />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddWbsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Add Activity
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DPR Full View Sheet */}
      {viewDpr && (
        <Dialog open={!!viewDpr} onOpenChange={(open) => !open && setViewDpr(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-bold flex items-center justify-between">
                <span>{viewDpr.dprNumber}</span>
                <WorkflowBadge status={viewDpr.status} />
              </DialogTitle>
              <DialogDescription>{viewDpr.projectName} · Date: {viewDpr.date} ({viewDpr.shift})</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3">
                <div>
                  <span className="text-muted-foreground">Weather & Temperature</span>
                  <p className="font-bold capitalize">{viewDpr.weather}, {viewDpr.temperature}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted By</span>
                  <p className="font-bold">{viewDpr.submittedBy.name} ({viewDpr.submittedBy.role})</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-2">Manpower Muster</h4>
                <div className="rounded border divide-y">
                  {viewDpr.manpower.map((m, idx) => (
                    <div key={idx} className="p-2 flex justify-between">
                      <span className="font-semibold">{m.trade}</span>
                      <span>Skilled: {m.skilled} | Helpers: {m.unskilled} | Supervisors: {m.supervisor}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-2">Materials Consumed Today</h4>
                <div className="rounded border divide-y">
                  {viewDpr.materials.map((mat, idx) => (
                    <div key={idx} className="p-2 flex justify-between">
                      <span>{mat.materialName}</span>
                      <span className="font-mono font-bold">{mat.quantity} {mat.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-2">Safety & Site Observations</h4>
                <p className="rounded border bg-muted/20 p-2.5">{viewDpr.safetyRemarks}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Photo Inspector Modal */}
      <PhotoGalleryDialog photo={selectedPhoto} isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} />

      {/* Document Viewer Modal */}
      <DocumentViewerDialog document={selectedDoc} isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} />
    </AppShell>
  );
}
