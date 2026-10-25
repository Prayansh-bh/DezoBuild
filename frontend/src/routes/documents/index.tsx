import { AppShell, useNotify } from "@/components/app-shell";
import { DocumentViewerDialog } from "@/components/shared/document-viewer";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FormSection,
  FormField,
  FormRow,
  FormActions,
} from "@/components/shared/form-system";
import { mockStore, useMockStore, useContextualData } from "@/mock";
import type { DocumentItem, DrawingRecord, RfiRecord } from "@/mock/types";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileCode,
  FileText,
  FolderOpen,
  Grid,
  HardHat,
  HelpCircle,
  History,
  Layers,
  LayoutList,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Upload,
  User,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/documents/")({
  head: () => ({
    meta: [
      { title: "Documents & Drawings Vault | DEZOBUILD" },
      {
        name: "description",
        content:
          "Store, version, and preview construction contracts, structural GFC drawings, and compliance approvals in DEZOBUILD.",
      },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const store = useMockStore();
  const contextual = useContextualData();
  const notify = useNotify();

  const documents = contextual.documents;
  const projects = contextual.projects;

  // Primary Section Navigation: overview | drawings | rfis | commercial | compliance | reports
  const [activeSection, setActiveSection] = useState<
    "overview" | "drawings" | "rfis" | "commercial" | "compliance" | "reports"
  >("overview");

  // Sub-tabs
  const [commercialSubTab, setCommercialSubTab] = useState<"contracts" | "commercial">("contracts");
  const [complianceSubTab, setComplianceSubTab] = useState<"approvals" | "hr" | "company">("approvals");

  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Dialog States
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Drawing Register State
  const [registerDrawingOpen, setRegisterDrawingOpen] = useState(false);
  const [dwgNum, setDwgNum] = useState("");
  const [dwgTitle, setDwgTitle] = useState("");
  const [dwgDiscipline, setDwgDiscipline] = useState<"Architecture" | "Structural" | "MEP" | "Other">("Structural");
  const [dwgRev, setDwgRev] = useState("Rev 01");
  const [dwgProjectId, setDwgProjectId] = useState(projects[0]?.id || "");
  const [dwgIssueDate, setDwgIssueDate] = useState(new Date().toISOString().slice(0, 10));

  // RFI Technical Query Desk State
  const [createRfiOpen, setCreateRfiOpen] = useState(false);
  const [selectedRfi, setSelectedRfi] = useState<RfiRecord | null>(null);
  const [rfiSubject, setRfiSubject] = useState("");
  const [rfiQuery, setRfiQuery] = useState("");
  const [rfiDiscipline, setRfiDiscipline] = useState("Structural");
  const [rfiPriority, setRfiPriority] = useState<"High" | "Medium" | "Urgent">("High");
  const [rfiDueDate, setRfiDueDate] = useState("");
  const [rfiReplyText, setRfiReplyText] = useState("");

  // Upload Form State
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<DocumentItem["type"]>("Drawing");
  const [docCategory, setDocCategory] = useState("Structural Drawings");
  const [docProjectId, setDocProjectId] = useState(projects[0]?.id || "");
  const [docVersion, setDocVersion] = useState("");
  const [docTags, setDocTags] = useState("");

  const handleRegisterDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dwgNum || !dwgTitle) return;
    const proj = projects.find((p) => p.id === dwgProjectId) ?? projects[0];
    mockStore.addDrawing({
      drawingNumber: dwgNum,
      title: dwgTitle,
      discipline: dwgDiscipline,
      revision: dwgRev,
      status: "GFC",
      issueDate: dwgIssueDate,
      isSuperseded: false,
      projectId: proj?.id || "proj-001",
      revisionHistory: [{ revision: dwgRev, issueDate: dwgIssueDate, note: "Initial GFC Release" }],
    });
    notify(`Drawing ${dwgNum} (${dwgRev}) registered in GFC vault.`);
    setRegisterDrawingOpen(false);
    setDwgNum("");
    setDwgTitle("");
  };

  const handleCreateRfi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfiSubject || !rfiQuery) return;
    const proj = projects.find((p) => p.id === docProjectId) ?? projects[0];
    mockStore.addRfi({
      rfiNumber: `RFI-${Date.now().toString().slice(-4)}`,
      subject: rfiSubject,
      technicalQuery: rfiQuery,
      project: proj?.name || "All Projects",
      discipline: rfiDiscipline,
      raisedBy: "Site Engineer",
      priority: rfiPriority,
      status: "Open",
      dueDate: rfiDueDate || "Next 7 Days",
    });
    notify(`RFI "${rfiSubject}" logged and routed to Structural Consultant.`);
    setCreateRfiOpen(false);
    setRfiSubject("");
    setRfiQuery("");
  };

  const handleReplyRfi = (rfiId: string) => {
    if (!rfiReplyText) return;
    mockStore.respondToRfi(rfiId, rfiReplyText);
    notify("Technical response recorded and RFI status updated.");
    setSelectedRfi(null);
    setRfiReplyText("");
  };

  const getFilteredDocs = () => {
    return documents.filter((d) => {
      if (activeSection === "drawings" && d.type !== "Drawing") return false;
      if (activeSection === "reports" && d.type !== "Report") return false;
      if (activeSection === "commercial") {
        if (commercialSubTab === "contracts" && d.type !== "Contract") return false;
        if (commercialSubTab === "commercial" && d.type !== "Contract" && d.category !== "Commercial") return false;
      }
      if (activeSection === "compliance") {
        if (complianceSubTab === "approvals" && d.type !== "Approval") return false;
        if (complianceSubTab === "hr" && d.category !== "HR & Compliance") return false;
        if (complianceSubTab === "company" && d.category !== "Company Profile" && d.category !== "Corporate") return false;
      }

      if (projectFilter !== "all" && d.projectId !== projectFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.projectName.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  };

  const filteredDocs = getFilteredDocs();

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === docProjectId) ?? projects[0];
    if (!proj) return;

    mockStore.addDocument({
      name: docName || "Untitled Document",
      type: docType,
      category: docCategory,
      projectId: proj.id,
      projectName: proj.name,
      size: "4.2 MB",
      fileExtension: "PDF",
      version: docVersion || "v1.0",
      uploadedBy: "Arjun Kapoor (Owner)",
      tags: docTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: "active",
    });

    notify(`Document "${docName}" uploaded and indexed successfully.`);
    setUploadOpen(false);
    setDocName("");
    setDocVersion("");
    setDocTags("");
  };

  return (
    <AppShell crumb="Documents">
      <PageHeader
        title="Document Management & Drawings"
        subtitle="Secure repository for structural GFC drawings, contract rate agreements, soil reports, municipal NOCs, and drone logs."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setRegisterDrawingOpen(true)} className="gap-1.5 text-xs font-semibold shadow-sm">
              <FileCode className="size-4" /> Register GFC Drawing
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreateRfiOpen(true)} className="gap-1.5 text-xs font-semibold shadow-sm">
              <MessageSquare className="size-4" /> Raise RFI
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5 text-xs font-semibold shadow-sm">
              <Upload className="size-4" /> Upload Document
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Stored Documents",
            value: documents.length > 0 ? `${documents.length} Files` : "0 Documents",
            hint: `${projects.length} Monitored project sites`,
            icon: <FolderOpen className="size-4" />,
          },
          {
            label: "GFC Engineering Drawings",
            value: `${store.drawings.length + documents.filter((d) => d.type === "Drawing").length} Drawings`,
            hint: "Version-controlled revisions",
            icon: <FileCode className="size-4" />,
          },
          {
            label: "Technical RFIs",
            value: `${store.rfis.length} RFIs`,
            hint: "Design queries & clarifications",
            icon: <HelpCircle className="size-4" />,
          },
          {
            label: "Contracts & PO Agreements",
            value: `${documents.filter((d) => d.type === "Contract").length} Contracts`,
            hint: "Legal & commercial records",
            icon: <FileCheck className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Section Navigation Tabs */}
      <div className="space-y-6">
        <div className="flex border-b border-border/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection("overview")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderOpen className="size-4" /> Vault Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("drawings")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "drawings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="size-4" /> Site Drawings (GFC) ({store.drawings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("rfis")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "rfis"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="size-4" /> Site Queries & Clarifications (RFI) ({store.rfis.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("commercial")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "commercial"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck className="size-4" /> Contracts & Commercial
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("compliance")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "compliance"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-4" /> Compliance & NOCs
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("reports")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "reports"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-4" /> Site Reports & Surveys
          </button>
        </div>

        {/* SECTION 1: OVERVIEW */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div
                onClick={() => setActiveSection("drawings")}
                className="p-5 rounded-xl border bg-card shadow-panel hover:border-primary/50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Engineering GFCs</span>
                  <FileCode className="size-4 text-primary" />
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {documents.filter((d) => d.type === "Drawing").length}
                </p>
                <p className="text-xs text-muted-foreground">Structural, MEP, Architectural</p>
              </div>

              <div
                onClick={() => {
                  setActiveSection("commercial");
                  setCommercialSubTab("contracts");
                }}
                className="p-5 rounded-xl border bg-card shadow-panel hover:border-primary/50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Contracts & POs</span>
                  <FileCheck className="size-4 text-sky-500" />
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {documents.filter((d) => d.type === "Contract").length}
                </p>
                <p className="text-xs text-muted-foreground">Executed legal agreements</p>
              </div>

              <div
                onClick={() => {
                  setActiveSection("compliance");
                  setComplianceSubTab("approvals");
                }}
                className="p-5 rounded-xl border bg-card shadow-panel hover:border-primary/50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Approvals & NOCs</span>
                  <ShieldCheck className="size-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {documents.filter((d) => d.type === "Approval").length}
                </p>
                <p className="text-xs text-muted-foreground">Municipal & environmental NOCs</p>
              </div>

              <div
                onClick={() => setActiveSection("reports")}
                className="p-5 rounded-xl border bg-card shadow-panel hover:border-primary/50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Site Test Reports</span>
                  <FileText className="size-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {documents.filter((d) => d.type === "Report").length}
                </p>
                <p className="text-xs text-muted-foreground">Soil tests, cube tests, drone surveys</p>
              </div>
            </div>

            {/* Recent Uploads Table */}
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Recently Indexed Documents</h3>
                  <p className="text-xs text-muted-foreground">Latest drawings and transmittals across all sites</p>
                </div>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setActiveSection("drawings")}>
                  View All Documents →
                </Button>
              </div>

              {documents.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No documents uploaded yet"
                  description="Upload structural drawings, legal contracts, or test reports to build your document vault."
                  action={{
                    label: "Upload Document",
                    onClick: () => setUploadOpen(true),
                  }}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-2.5">Document Title</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Project Site</th>
                        <th className="px-4 py-2.5">Version</th>
                        <th className="px-4 py-2.5">Uploaded By</th>
                        <th className="px-4 py-2.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {documents.slice(0, 5).map((doc) => (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDoc(doc)}
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-foreground">{doc.name}</td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">{doc.type}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-primary">{doc.projectName}</td>
                          <td className="px-4 py-3 font-mono">{doc.version}</td>
                          <td className="px-4 py-3 text-muted-foreground">{doc.uploadedBy}</td>
                          <td className="px-4 py-3 font-semibold text-primary">Preview →</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: GFC DRAWING REGISTER */}
        {activeSection === "drawings" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="font-bold text-sm text-foreground">GFC Engineering Drawing Register</h3>
                <p className="text-xs text-muted-foreground">Master register of architectural, structural, and MEP Good-For-Construction drawings</p>
              </div>
              <Button size="sm" onClick={() => setRegisterDrawingOpen(true)} className="gap-1.5 text-xs">
                <Plus className="size-3.5" /> Register GFC Drawing
              </Button>
            </div>

            {store.drawings.length === 0 ? (
              <EmptyState
                icon={FileCode}
                title="No GFC drawings registered"
                description="Register structural, MEP, and architectural drawings to maintain version-controlled revisions."
                action={{
                  label: "Register Drawing",
                  onClick: () => setRegisterDrawingOpen(true),
                }}
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Drawing Number</th>
                        <th className="px-4 py-3">Drawing Title</th>
                        <th className="px-4 py-3">Discipline</th>
                        <th className="px-4 py-3 font-mono">Current Revision</th>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3 text-center">Superseded State</th>
                        <th className="px-4 py-3 text-right">Revisions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {store.drawings.map((dwg) => (
                        <tr key={dwg.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{dwg.drawingNumber}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{dwg.title}</td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">{dwg.discipline}</span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{dwg.revision}</td>
                          <td className="px-4 py-3 text-muted-foreground">{dwg.issueDate}</td>
                          <td className="px-4 py-3 text-center">
                            {dwg.isSuperseded ? (
                              <span className="rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 text-[10px] font-bold">
                                SUPERSEDED
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                                ACTIVE GFC
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {(dwg.revisionHistory || dwg.revisions || []).length} versions
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: RFI TECHNICAL QUERY DESK */}
        {activeSection === "rfis" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="font-bold text-sm text-foreground">RFI Technical Query Desk</h3>
                <p className="text-xs text-muted-foreground">Requests For Information logged from site to structural & architectural consultants</p>
              </div>
              <Button size="sm" onClick={() => setCreateRfiOpen(true)} className="gap-1.5 text-xs">
                <Plus className="size-3.5" /> Raise New RFI
              </Button>
            </div>

            {store.rfis.length === 0 ? (
              <EmptyState
                icon={HelpCircle}
                title="No technical queries logged"
                description="Raise RFIs to clarify structural discrepancies, MEP clashes, or design ambiguities."
                action={{
                  label: "Ask Site Query (RFI)",
                  onClick: () => setCreateRfiOpen(true),
                }}
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">RFI Number</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Discipline</th>
                        <th className="px-4 py-3">Project Site</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {store.rfis.map((rfi) => (
                        <tr key={rfi.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{rfi.rfiNumber}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{rfi.subject}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rfi.discipline}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{rfi.project}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rfi.priority === "Urgent" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" : "bg-muted text-muted-foreground"
                            }`}>
                              {rfi.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{rfi.dueDate}</td>
                          <td className="px-4 py-3"><WorkflowBadge status={rfi.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRfi(rfi)}
                              className="h-7 text-[11px] px-2.5"
                            >
                              Review / Reply →
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4, 5, 6: DOCUMENT EXPLORER */}
        {(activeSection === "commercial" || activeSection === "compliance" || activeSection === "reports") && (
          <div className="space-y-4">
            {/* Sub-tabs if Commercial or Compliance */}
            {activeSection === "commercial" && (
              <div className="flex items-center gap-2 border-b pb-2">
                <Button
                  size="sm"
                  variant={commercialSubTab === "contracts" ? "default" : "outline"}
                  onClick={() => setCommercialSubTab("contracts")}
                  className="text-xs gap-1.5"
                >
                  <FileCheck className="size-3.5" /> Contracts & Agreements
                </Button>
                <Button
                  size="sm"
                  variant={commercialSubTab === "commercial" ? "default" : "outline"}
                  onClick={() => setCommercialSubTab("commercial")}
                  className="text-xs gap-1.5"
                >
                  <FileText className="size-3.5" /> Rate Schedules & PO Terms
                </Button>
              </div>
            )}

            {activeSection === "compliance" && (
              <div className="flex items-center gap-2 border-b pb-2">
                <Button
                  size="sm"
                  variant={complianceSubTab === "approvals" ? "default" : "outline"}
                  onClick={() => setComplianceSubTab("approvals")}
                  className="text-xs gap-1.5"
                >
                  <ShieldCheck className="size-3.5" /> Municipal NOCs & Clearances
                </Button>
                <Button
                  size="sm"
                  variant={complianceSubTab === "hr" ? "default" : "outline"}
                  onClick={() => setComplianceSubTab("hr")}
                  className="text-xs gap-1.5"
                >
                  <User className="size-3.5" /> HR & Labour Compliance
                </Button>
                <Button
                  size="sm"
                  variant={complianceSubTab === "company" ? "default" : "outline"}
                  onClick={() => setComplianceSubTab("company")}
                  className="text-xs gap-1.5"
                >
                  <Building2 className="size-3.5" /> Company & Corporate Docs
                </Button>
              </div>
            )}

            {/* Filter Bar & View Toggle */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search document name, tag, project, version…"
                filters={
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                }
                onReset={() => {
                  setSearch("");
                  setProjectFilter("all");
                }}
              />

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="size-3.5" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => setViewMode("table")}
                >
                  <LayoutList className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Content View */}
            {filteredDocs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents found"
                description="Upload drawings, contracts, or adjust filters to view vault files."
                action={{
                  label: "Upload Document",
                  onClick: () => setUploadOpen(true),
                }}
              />
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-panel hover:border-border hover:shadow-float transition-all cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                          {doc.type}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">{doc.version}</span>
                      </div>

                      <h4 className="mt-2.5 font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors leading-snug tracking-tight">
                        {doc.name}
                      </h4>

                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 shrink-0" />{" "}
                          <span className="font-medium text-foreground">{doc.projectName}</span>
                        </p>
                        <p>
                          Category:{" "}
                          <strong className="font-medium text-foreground">{doc.category}</strong> ·{" "}
                          {doc.size}
                        </p>
                      </div>

                      {doc.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {doc.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span className="truncate">Updated: {doc.updatedDate}</span>
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <Eye className="size-3.5" /> Preview
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Document Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Project Site</th>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">File Size</th>
                      <th className="px-4 py-3">Uploaded By</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5 font-bold text-foreground">{doc.name}</td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">
                            {doc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-primary">{doc.projectName}</td>
                        <td className="px-4 py-3.5 font-mono font-bold">{doc.version}</td>
                        <td className="px-4 py-3.5 font-mono">{doc.size}</td>
                        <td className="px-4 py-3.5">{doc.uploadedBy}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{doc.updatedDate}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-primary">Preview →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerDialog
        document={selectedDoc}
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />

      {/* Upload Document Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Upload Document / GFC Drawing</DialogTitle>
            <DialogDescription className="text-xs">
              Attach drawing revisions, contracts, test reports, or permits.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="doc-name" label="Document Title" required>
                <Input
                  id="doc-name"
                  placeholder="e.g. Orion Heights Structural Drawing R8"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="doc-type" label="Document Type" required>
                <select
                  id="doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentItem["type"])}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option>Drawing</option>
                  <option>Contract</option>
                  <option>Report</option>
                  <option>Approval</option>
                  <option>Compliance</option>
                  <option>Photo</option>
                </select>
              </FormField>

              <FormField id="doc-ver" label="Version / Revision" required>
                <Input
                  id="doc-ver"
                  value={docVersion}
                  onChange={(e) => setDocVersion(e.target.value)}
                  placeholder="e.g. R-01"
                  required
                  className="h-9 font-mono text-xs font-semibold"
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="doc-proj" label="Project Site" required>
                <select
                  id="doc-proj"
                  value={docProjectId}
                  onChange={(e) => setDocProjectId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="doc-tags" label="Search Tags (comma separated)" optional help="Add classification tags like GFC, Tower A, Structural, Rebar for fast discovery.">
                <Input
                  id="doc-tags"
                  placeholder="e.g. GFC, Tower A, Structural, Rebar"
                  value={docTags}
                  onChange={(e) => setDocTags(e.target.value)}
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setUploadOpen(false)}
              submitLabel="Upload & Save"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Register GFC Drawing Dialog */}
      <Dialog open={registerDrawingOpen} onOpenChange={setRegisterDrawingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileCode className="size-4 text-primary" /> Register GFC Drawing
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register structural, architectural, or MEP Good-For-Construction drawings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterDrawing} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="dwg-num" label="Drawing Number / Code" required>
                <Input
                  id="dwg-num"
                  placeholder="e.g. DWG-STR-T1-001"
                  value={dwgNum}
                  onChange={(e) => setDwgNum(e.target.value)}
                  required
                  className="h-9 font-mono text-xs font-bold"
                />
              </FormField>

              <FormField id="dwg-rev" label="Revision Identifier" required>
                <Input
                  id="dwg-rev"
                  placeholder="e.g. Rev 01"
                  value={dwgRev}
                  onChange={(e) => setDwgRev(e.target.value)}
                  required
                  className="h-9 font-mono text-xs font-semibold"
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="dwg-title" label="Drawing Title / Description" required>
                <Input
                  id="dwg-title"
                  placeholder="e.g. Foundation & Pile Cap Layout Plan"
                  value={dwgTitle}
                  onChange={(e) => setDwgTitle(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="dwg-disc" label="Engineering Discipline" required>
                <select
                  id="dwg-disc"
                  value={dwgDiscipline}
                  onChange={(e) => setDwgDiscipline(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Structural">Structural</option>
                  <option value="Architecture">Architecture</option>
                  <option value="MEP">MEP (Mechanical/Electrical/Plumbing)</option>
                  <option value="Other">Other / Civil</option>
                </select>
              </FormField>

              <FormField id="dwg-date" label="Issue Date" required>
                <Input
                  id="dwg-date"
                  type="date"
                  value={dwgIssueDate}
                  onChange={(e) => setDwgIssueDate(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setRegisterDrawingOpen(false)}
              submitLabel="Register Drawing"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Raise Technical RFI Dialog */}
      <Dialog open={createRfiOpen} onOpenChange={setCreateRfiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" /> Raise Technical Query (RFI)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit site clarification to consultants regarding structural drawings or specifications.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRfi} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="rfi-subj" label="Query Subject / Summary" required>
                <Input
                  id="rfi-subj"
                  placeholder="e.g. Beam B-14 lap length clarification against column grid C-3"
                  value={rfiSubject}
                  onChange={(e) => setRfiSubject(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="rfi-disc" label="Discipline" required>
                <select
                  id="rfi-disc"
                  value={rfiDiscipline}
                  onChange={(e) => setRfiDiscipline(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Structural">Structural</option>
                  <option value="Architecture">Architecture</option>
                  <option value="MEP">MEP</option>
                  <option value="Civil">Civil Works</option>
                </select>
              </FormField>

              <FormField id="rfi-prio" label="Priority" required>
                <select
                  id="rfi-prio"
                  value={rfiPriority}
                  onChange={(e) => setRfiPriority(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="High">High</option>
                  <option value="Urgent">Urgent (Pour Blocked)</option>
                  <option value="Medium">Medium</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="rfi-q" label="Technical Query Details" required help="Detail observed site discrepancy, drawing sheet reference, and required decision.">
                <Textarea
                  id="rfi-q"
                  placeholder="Detail observed site discrepancy, drawing sheet reference, and required decision..."
                  value={rfiQuery}
                  onChange={(e) => setRfiQuery(e.target.value)}
                  required
                  className="h-24 text-xs"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setCreateRfiOpen(false)}
              submitLabel="Submit RFI to Consultant"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Review / Reply RFI Drawer */}
      {selectedRfi && (
        <Dialog open={!!selectedRfi} onOpenChange={(open) => !open && setSelectedRfi(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <HelpCircle className="size-4 text-primary" /> {selectedRfi.rfiNumber}: {selectedRfi.subject}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedRfi.project} · {selectedRfi.discipline} · Priority: {selectedRfi.priority}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="font-semibold text-muted-foreground text-[11px]">Technical Query from Site</p>
                <p className="text-foreground leading-relaxed">{selectedRfi.technicalQuery}</p>
                <p className="text-[10px] text-muted-foreground pt-1">Raised By: {selectedRfi.raisedBy}</p>
              </div>

              {selectedRfi.response ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-[11px]">Consultant Response</p>
                  <p className="text-foreground leading-relaxed">{selectedRfi.response}</p>
                  <span className="rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                    Resolved & Closed
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Consultant / Engineering Response</Label>
                  <Textarea
                    placeholder="Enter official engineering instruction or revised drawing transmittal details..."
                    value={rfiReplyText}
                    onChange={(e) => setRfiReplyText(e.target.value)}
                    className="h-24 text-xs"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedRfi(null)}>
                      Close
                    </Button>
                    <Button size="sm" onClick={() => handleReplyRfi(selectedRfi.id)} className="gap-1.5 font-semibold">
                      <CheckCircle2 className="size-3.5" /> Submit Response & Close
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
