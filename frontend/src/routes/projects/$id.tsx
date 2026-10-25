import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCurrentUser } from "@/auth";
import { hasPermission } from "@/authorization/permissions";
import { CustomerRole } from "@/authorization/roles";
import { AppShell, useNotify } from "@/components/app-shell";
import { DocumentViewerDialog } from "@/components/shared/document-viewer";
import { PageHeader } from "@/components/shared/page-header";
import { PhotoGalleryDialog } from "@/components/shared/photo-gallery";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FormSection,
  FormField,
  FormRow,
  FormActions,
} from "@/components/shared/form-system";
import { ExcelImportWizard } from "@/components/shared/excel-import-wizard";
import {
  calculateMeasurementQuantity,
  calculateProjectProfitability,
  calculateEarnedValueEAC,
  calculateWorkReadinessScore,
} from "@/lib/calculations";
import { formatCurrency, mockStore, useMockStore, useContextualData } from "@/mock";
import {
  useProjectDetail,
  useProjectWbs,
  useProjectBoq,
  useProjectDprs,
  useProjectDigitalMb,
  useCreateWbsNode,
  useCreateDpr,
  useCreateBoqItem,
  useCreateDigitalMbEntry,
  useVerifyDigitalMbEntry,
} from "@/hooks/api";
import { adaptProject } from "@/lib/api/adapters";
import { downloadCsv } from "@/lib/export-utils";
import type {
  BoqItem,
  DigitalMbRecord,
  DocumentItem,
  DprPhoto,
  DprRecord,
  DrawingRecord,
  LookaheadItem,
  MeasurementType,
  NcrRecord,
  NcrSeverity,
  NcrStatus,
  PourCardRecord,
  RfiRecord,
  SafetyIncident,
  SafetyWalkthrough,
  WbsActivity,
} from "@/mock/types";
import {
  AlertTriangle,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck,
  FileCode,
  FileSpreadsheet,
  FileText,
  Gauge,
  GitBranch,
  HardHat,
  HelpCircle,
  IndianRupee,
  Layers,
  MapPin,
  MessageSquare,
  PackageCheck,
  PackageMinus,
  PieChart,
  Plus,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  User,
  Users,
  WalletCards,
  X,
} from "lucide-react";

export const Route = createFileRoute("/projects/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Project 360° Command Center | DEZOBUILD` },
      { name: "description", content: "Comprehensive Project 360° Command Center in DEZOBUILD." },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const params = useParams({ from: "/projects/$id" });
  const store = useMockStore();
  const contextual = useContextualData();
  const { data: projectDetailData, isLoading: isProjectLoading, isError: isProjectError } = useProjectDetail(params.id);

  const {
    lookaheadItems,
    pourCards,
    ncrs,
    safetyWalkthroughs,
    safetyIncidents,
    drawings,
    rfis,
    payments,
    labourContractors,
  } = store;

  const projects = contextual.projects.length > 0 ? contextual.projects : store.projects;
  const materials = contextual.materials.length > 0 ? contextual.materials : store.materials;
  const indents = contextual.indents.length > 0 ? contextual.indents : store.indents;
  const expenses = contextual.expenses.length > 0 ? contextual.expenses : store.expenses;
  const equipment = contextual.equipment.length > 0 ? contextual.equipment : store.equipment;
  const alerts = contextual.alerts.length > 0 ? contextual.alerts : store.alerts;
  const documents = contextual.documents.length > 0 ? contextual.documents : store.documents;

  const notify = useNotify();
  const { user } = useCurrentUser();
  const role = user?.role || CustomerRole.VIEWER;

  const canViewCommercial = hasPermission(role, "commercial.view");
  const canViewDpr = hasPermission(role, "dpr.view");
  const canCreateWbs = hasPermission(role, "wbs.create");
  const canCreateDpr = hasPermission(role, "dpr.create");

  // Find project by id from live backend detail or list
  const liveProject = projectDetailData ? adaptProject(projectDetailData) : projects.find((p) => p.id === params.id);
  const project = liveProject || projects[0];

  if (!project) {
    return (
      <AppShell crumb={isProjectLoading ? "Loading Project..." : "Project Not Found"}>
        <div className="p-12 text-center">
          <p className="font-bold text-base">{isProjectLoading ? "Loading project details from backend..." : "Project Not Found"}</p>
          {!isProjectLoading && (
            <Button asChild className="mt-4">
              <Link to={"/projects" as any}>Return to Projects</Link>
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  // Primary Domain Tab
  const [activeTab, setActiveTab] = useState("overview");

  // Secondary sub-tab states
  const [planningSubTab, setPlanningSubTab] = useState<
    "wbs" | "gantt" | "lookahead" | "boq" | "dmb" | "readiness" | "health"
  >("wbs");
  const [progressSubTab, setProgressSubTab] = useState<"dpr" | "weekly" | "physical" | "variance">("dpr");
  const [commercialSubTab, setCommercialSubTab] = useState<
    "profitability" | "expenses" | "payments" | "budget" | "eac"
  >("profitability");
  const [qaSafetySubTab, setQaSafetySubTab] = useState<"pour_cards" | "ncrs" | "safety_walks" | "incidents">("pour_cards");
  const [docsSubTab, setDocsSubTab] = useState<"drawings" | "rfi" | "files">("drawings");

  // API Hooks
  const { data: rawWbs = [], isLoading: isWbsLoading } = useProjectWbs(project?.id);
  const { data: rawBoq = [], isLoading: isBoqLoading } = useProjectBoq(project?.id);
  const { data: rawDprs = [], isLoading: isDprLoading } = useProjectDprs(project?.id);
  const { data: rawMbs = [], isLoading: isMbLoading } = useProjectDigitalMb(project?.id);
  
  const createWbsMutation = useCreateWbsNode();
  const createDprMutation = useCreateDpr();
  const createBoqMutation = useCreateBoqItem();
  const createMbMutation = useCreateDigitalMbEntry();
  const verifyMbMutation = useVerifyDigitalMbEntry();

  // Filtered Project-specific Data & Presentation Mapping
  const projWbs = rawWbs.map((w: any) => ({
    ...w,
    category: "WBS Node",
    unit: "-",
    plannedQty: 0,
    actualQty: 0,
    plannedCost: w.plannedBudget || 0,
    actualCost: 0,
    actualProgress: 0,
    status: "active",
    assignedGang: "-",
    startDate: "-",
    endDate: "-"
  }));

  const projBoq = rawBoq.map((b: any) => ({
    ...b,
    boqItemNo: b.itemCode,
    wbsCode: "-",
    plannedQty: b.quantity,
    plannedRate: b.rate,
    plannedAmount: b.amount,
    actualQty: 0,
    actualAmount: 0,
    status: "active"
  }));

  const projDmb = rawMbs.map((m: any) => ({
    ...m,
    boqItemNo: m.boqItemId,
    mbDate: m.createdAt,
    recordedBy: "Self"
  }));

  const projLookahead = lookaheadItems.filter((l) => l.projectId === project.id);
  const projPourCards = pourCards.filter((p) => p.projectId === project.id);
  const projNcrs = ncrs.filter((n) => n.projectId === project.id);
  const projSafetyWalks = safetyWalkthroughs.filter((s) => s.projectId === project.id);
  const projSafetyIncidents = safetyIncidents.filter((s) => s.projectId === project.id);
  const projDrawings = drawings.filter((d) => d.projectId === project.id);
  const projRfis = rfis.filter((r) => r.projectId === project.id);
  const projDprs = rawDprs.map((d: any) => ({
    ...d,
    id: d.id || `dpr-${Math.random()}`,
    projectId: project.id,
    projectName: project.name,
    dprNumber: d.dprNumber || "DPR-XXX",
    date: d.reportDate || d.date || new Date().toISOString().slice(0, 10),
    shift: d.shift || "Day",
    status: d.status || "submitted",
    submittedBy: d.submittedBy || { name: "Site Engineer", role: "Engineer" },
    weather: d.weather || "Clear",
    temperature: d.temperature || "25°C",
    manpower: d.manpower || [],
    equipment: d.equipment || [],
    materials: d.materials || [],
    workExecutedSummary: d.workExecutedSummary || [],
    safetyRemarks: d.siteConditions || "Normal working conditions.",
    attachments: d.attachments || []
  })) as DprRecord[];
  const projExpenses = expenses.filter((e) => e.projectId === project.id);
  const projPayments = payments.filter((p) => p.projectId === project.id);
  const projIndents = indents.filter((i) => i.projectId === project.id);
  const projAlerts = alerts.filter(
    (a) => a.projectId === project.id || a.projectName.includes(project.name),
  );
  const projDocs = documents.filter((d) => d.projectId === project.id);
  const projEquipment = equipment.filter(
    (eq) => eq.currentSite.includes(project.name) || eq.currentSite === project.name,
  );

  // Dialog & Modal States
  const [addWbsOpen, setAddWbsOpen] = useState(false);
  const [addBoqOpen, setAddBoqOpen] = useState(false);
  const [addMbOpen, setAddMbOpen] = useState(false);
  const [addPourCardOpen, setAddPourCardOpen] = useState(false);
  const [addNcrOpen, setAddNcrOpen] = useState(false);
  const [addSafetyIncidentOpen, setAddSafetyIncidentOpen] = useState(false);
  const [addDrawingOpen, setAddDrawingOpen] = useState(false);
  const [addRfiOpen, setAddRfiOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importDataset, setImportDataset] = useState<"boq" | "wbs">("boq");
  const [selectedPhoto, setSelectedPhoto] = useState<DprPhoto | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [viewDpr, setViewDpr] = useState<DprRecord | null>(null);
  const [selectedPourCard, setSelectedPourCard] = useState<PourCardRecord | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingRecord | null>(null);

  // Form States - WBS
  const [wbsCode, setWbsCode] = useState(`2.${projWbs.length + 1}`);
  const [wbsName, setWbsName] = useState("");
  const [wbsCategory, setWbsCategory] = useState<WbsActivity["category"]>("Superstructure");
  const [wbsUnit, setWbsUnit] = useState("cum");
  const [wbsPlannedQty, setWbsPlannedQty] = useState("1000");
  const [wbsPlannedRate, setWbsPlannedRate] = useState("4500");
  const [wbsGang, setWbsGang] = useState("Apex Formwork & Concreting");

  // Form States - BOQ Item
  const [boqItemNo, setBoqItemNo] = useState(`BOQ-${projBoq.length + 1}`);
  const [boqDesc, setBoqDesc] = useState("");
  const [boqUnit, setBoqUnit] = useState("cum");
  const [boqQty, setBoqQty] = useState("1000");
  const [boqRate, setBoqRate] = useState("5200");
  const [boqWbsCode, setBoqWbsCode] = useState("");

  // Form States - Digital MB
  const [mbType, setMbType] = useState<MeasurementType>("Length × Breadth × Depth");
  const [mbLocation, setMbLocation] = useState("");
  const [mbDesc, setMbDesc] = useState("");
  const [mbLength, setMbLength] = useState("10");
  const [mbBreadth, setMbBreadth] = useState("5");
  const [mbDepth, setMbDepth] = useState("0.5");
  const [mbCount, setMbCount] = useState("1");
  const [mbUnit, setMbUnit] = useState("cum");
  const [mbBoqId, setMbBoqId] = useState(projBoq[0]?.id || "");
  const [mbWbsId, setMbWbsId] = useState(projWbs[0]?.id || "");

  // Form States - Pour Card
  const [pourLocation, setPourLocation] = useState("");
  const [pourElement, setPourElement] = useState("Raft Slab / Column C1-C8");
  const [pourGrade, setPourGrade] = useState("M40 RMC");
  const [pourQty, setPourQty] = useState("85");
  const [pourShuttering, setPourShuttering] = useState(true);
  const [pourRebar, setPourRebar] = useState(true);
  const [pourCover, setPourCover] = useState(true);
  const [pourMep, setPourMep] = useState(true);
  const [pourClean, setPourClean] = useState(true);

  // Form States - NCR
  const [ncrTitle, setNcrTitle] = useState("");
  const [ncrDesc, setNcrDesc] = useState("");
  const [ncrLoc, setNcrLoc] = useState("");
  const [ncrSeverity, setNcrSeverity] = useState<NcrSeverity>("major");
  const [ncrParty, setNcrParty] = useState("Subcontractor Gang #1");
  const [ncrDueDate, setNcrDueDate] = useState(new Date().toISOString().slice(0, 10));

  // Form States - Drawing
  const [drwNo, setDrwNo] = useState("");
  const [drwTitle, setDrwTitle] = useState("");
  const [drwDiscipline, setDrwDiscipline] = useState<"Architecture" | "Structural" | "MEP" | "Other">("Structural");
  const [drwRev, setDrwRev] = useState("Rev 01");

  // Form States - RFI
  const [rfiSubject, setRfiSubject] = useState("");
  const [rfiQuery, setRfiQuery] = useState("");
  const [rfiDiscipline, setRfiDiscipline] = useState<"Architecture" | "Structural" | "MEP" | "Other">("Structural");
  const [rfiPriority, setRfiPriority] = useState<"low" | "medium" | "high" | "critical">("high");
  const [rfiDueDate, setRfiDueDate] = useState(new Date().toISOString().slice(0, 10));

  const handleAddWbs = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(wbsPlannedQty) || 100;
    const rate = parseFloat(wbsPlannedRate) || 1000;
    try {
      await createWbsMutation.mutateAsync({
        projectId: project.id,
        data: {
          code: wbsCode,
          name: wbsName || "New Work Activity",
          level: 2,
          sequence: projWbs.length + 1,
          plannedBudget: qty * rate,
        }
      });
      notify(`Activity "${wbsName}" added to WBS.`);
      setAddWbsOpen(false);
      setWbsName("");
    } catch (err) {
      notify(`Failed to create WBS node`);
    }
  };

  const handleAddBoq = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(boqQty) || 0;
    const rate = parseFloat(boqRate) || 0;
    try {
      await createBoqMutation.mutateAsync({
        projectId: project.id,
        data: {
          itemCode: boqItemNo,
          description: boqDesc || "Bill of Quantities Item",
          unit: boqUnit,
          quantity: qty,
          rate,
          amount: qty * rate,
        }
      });
      notify(`BOQ Item "${boqItemNo}" recorded successfully.`);
      setAddBoqOpen(false);
      setBoqDesc("");
    } catch (err) {
      notify("Failed to add BOQ Item");
    }
  };

  const handleAddMb = async (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseFloat(mbLength) || 0;
    const b = parseFloat(mbBreadth) || 0;
    const d = parseFloat(mbDepth) || 0;
    const c = parseFloat(mbCount) || 1;

    let calc = l * b * d * c;
    if (mbType === "Length × Breadth") calc = l * b * c;
    if (mbType === "Length") calc = l * c;
    if (mbType === "Count" || mbType === "Custom") calc = c;

    try {
      await createMbMutation.mutateAsync({
        projectId: project.id,
        data: {
          wbsNodeId: mbWbsId,
          boqItemId: mbBoqId,
          measurementType: mbType,
          location: mbLocation || "Grid Line A1-D4",
          description: mbDesc || "Site measurement entry",
          length: l,
          breadth: b,
          depth: d,
          count: c,
          quantity: calc,
          unit: mbUnit,
        }
      });
      notify(`Measurement recorded: ${calc.toFixed(2)} ${mbUnit} submitted for verification.`);
      setAddMbOpen(false);
      setMbDesc("");
    } catch (err) {
      notify("Failed to add MB");
    }
  };

  const handleAddPourCard = (e: React.FormEvent) => {
    e.preventDefault();
    mockStore.addPourCard({
      projectId: project.id,
      location: pourLocation || "Tower A Slab Level 14",
      element: pourElement,
      gradeOfConcrete: pourGrade,
      plannedQuantityCum: parseFloat(pourQty) || 50,
      pourDate: new Date().toISOString().slice(0, 10),
      checklist: {
        shutteringVerified: pourShuttering,
        rebarVerified: pourRebar,
        coverBlocksVerified: pourCover,
        mepInsertsVerified: pourMep,
        cleaningVerified: pourClean,
      },
      status: "submitted",
      conductedBy: "Site Engineer",
    });
    notify(`Pre-Pour Checklist & Pour Card filed for ${pourLocation || "Pour"}`);
    setAddPourCardOpen(false);
    setPourLocation("");
  };

  const handleAddNcr = (e: React.FormEvent) => {
    e.preventDefault();
    mockStore.addNcr({
      projectId: project.id,
      title: ncrTitle || "Quality Non-Conformance",
      description: ncrDesc || "Dimensional deviation detected during field inspection.",
      location: ncrLoc || "Site Zone 2",
      severity: ncrSeverity,
      responsibleParty: ncrParty,
      dueDate: ncrDueDate,
      status: "open",
    });
    notify(`NCR registered: ${ncrTitle}`);
    setAddNcrOpen(false);
    setNcrTitle("");
  };

  const handleAddDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    mockStore.addDrawing({
      projectId: project.id,
      drawingNumber: drwNo || `DWG-${projDrawings.length + 1}`,
      title: drwTitle || "GFC Structural Layout",
      discipline: drwDiscipline,
      currentRevision: drwRev,
      status: "approved",
      issueDate: new Date().toISOString().slice(0, 10),
      revisions: [
        {
          revisionCode: drwRev,
          issueDate: new Date().toISOString().slice(0, 10),
          description: "Issued for Construction (GFC)",
          status: "current",
        },
      ],
      fileSize: "4.2 MB",
    });
    notify(`Drawing "${drwNo}" registered with revision ${drwRev}`);
    setAddDrawingOpen(false);
    setDrwNo("");
    setDrwTitle("");
  };

  const handleAddRfi = (e: React.FormEvent) => {
    e.preventDefault();
    mockStore.addRfi({
      projectId: project.id,
      subject: rfiSubject || "Technical Query",
      technicalQuery: rfiQuery || "Clarification required on reinforcement detailing.",
      discipline: rfiDiscipline,
      raisedBy: "Site Engineer",
      assignedTo: "Structural Consultant",
      priority: rfiPriority,
      dueDate: rfiDueDate,
      status: "open",
    });
    notify(`RFI query submitted: ${rfiSubject}`);
    setAddRfiOpen(false);
    setRfiSubject("");
    setRfiQuery("");
  };

  // Profitability Calculations
  const profitability = calculateProjectProfitability({
    contractValue: project.budget,
    budgetCost: project.budget * 0.85,
    committedCost: project.committedCost,
    actualCost: project.actualCost,
  });

  const eacData = calculateEarnedValueEAC({
    plannedValue: (project.budget * project.plannedProgress) / 100,
    earnedValue: (project.budget * project.progress) / 100,
    actualCost: project.actualCost,
    budgetAtCompletion: project.budget,
  });

  const readinessScore = calculateWorkReadinessScore({
    materialStockAvailable: materials.length > 0,
    labourMobilizedPercent: Math.min(100, (project.activeWorkersToday / 40) * 100),
    equipmentReadyPercent: projEquipment.filter((e) => e.status === "running").length > 0 ? 100 : 80,
    drawingsApproved: projDrawings.length > 0,
    permitsStatutoryClear: true,
  });

  const remainingBudget = project.budget - project.actualCost;
  const budgetUtilization = ((project.actualCost / (project.budget || 1)) * 100).toFixed(1);

  return (
    <AppShell crumb={project.name}>
      {/* Top Breadcrumb & Page Header */}
      <PageHeader
        title={project.name}
        subtitle={`${project.code} · ${project.client} · ${project.location}`}
        breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: project.name }]}
        actions={
          <div className="flex items-center gap-2">
            <HealthBadge health={project.health} />
            <Button
              size="sm"
              onClick={() => {
                const headers = ["Project Attribute", "Value"];
                const rows = [
                  ["Project Code", project.code],
                  ["Project Name", project.name],
                  ["Client", project.client],
                  ["Location", project.location],
                  ["Total Contract Value (INR)", formatCurrency(project.budget)],
                  ["Actual Cost Incurred (INR)", formatCurrency(project.actualCost)],
                  ["Target Completion Date", project.targetCompletion],
                  ["Physical Progress", `${project.progress}%`],
                  ["Operational Health Status", project.health.toUpperCase()],
                  ["Work Packages (WBS)", String(projWbs.length)],
                  ["BOQ Line Items", String(projBoq.length)],
                  ["Registered Drawings", String(projDrawings.length)],
                  ["Filed Concrete Pour Cards", String(projPourCards.length)],
                  ["Active Quality NCRs", String(projNcrs.length)],
                  ["Safety Incidents / Observations", String(projSafetyIncidents.length + projSafetyWalks.length)],
                ];
                downloadCsv(`Project_360_Summary_${project.code}`, headers, rows);
                notify(`Project 360° Summary report exported for ${project.name}.`);
              }}
              variant="outline"
              className="gap-1.5 shadow-sm"
            >
              <Download className="size-4" /> Export 360° Report (CSV)
            </Button>
          </div>
        }
      />

      {/* Critical Alert Banner if Project has risks */}
      {project.health === "critical" && (
        <div className="mb-6 flex items-start justify-between rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-danger" />
            <div>
              <p className="font-bold text-danger text-sm">Critical Exception Active</p>
              <p className="mt-0.5 text-foreground/90 font-medium">
                {projAlerts[0]?.problem ||
                  "Material consumption or schedule milestone has exceeded baseline variance limits."}
              </p>
              <p className="mt-1 text-xs font-semibold text-rose-700">
                Financial Impact:{" "}
                <span className="font-mono">+{formatCurrency(project.varianceAmount)}</span> variance
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setActiveTab("issues")}
            className="shrink-0"
          >
            Review Issues ({projAlerts.length})
          </Button>
        </div>
      )}

      {/* Level 1: Primary KPI Ribbon */}
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

      {/* Level 2: Project 360 Contextual Domain Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Responsive Mobile Selector */}
        <div className="block lg:hidden">
          <label htmlFor="p360-tab-select" className="sr-only">
            Project Section
          </label>
          <select
            id="p360-tab-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-xs font-semibold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="overview">🏢 Overview (Project Health)</option>
            <option value="planning">📂 Planning & Tasks ({projWbs.length} Tasks)</option>
            {canViewDpr && <option value="progress">📋 Daily Progress ({projDprs.length} DPRs)</option>}
            {canViewCommercial && <option value="commercial">💳 Commercial & Profitability</option>}
            <option value="qa_safety">🛡️ Quality & Safety ({projNcrs.length} Defects)</option>
            <option value="materials">📦 Materials & Stores</option>
            <option value="people">👷 People & Manpower</option>
            <option value="equipment">🚜 Equipment ({projEquipment.length})</option>
            <option value="issues">⚠️ Issues & Alerts ({projAlerts.length})</option>
            <option value="documents">📄 Documents & Drawings ({projDocs.length + projDrawings.length})</option>
          </select>
        </div>

        {/* Desktop Tab Strip */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-border/80 bg-card p-1.5 shadow-sm overflow-x-auto">
          <TabsList className="bg-transparent p-0 gap-1 h-auto flex flex-wrap">
            <TabsTrigger
              value="overview"
              className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
            >
              <Building2 className="size-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger
              value="planning"
              className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
            >
              <Layers className="size-3.5" /> Planning & Tasks ({projWbs.length})
            </TabsTrigger>
            {canViewDpr && (
              <TabsTrigger
                value="progress"
                className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
              >
                <HardHat className="size-3.5" /> Progress ({projDprs.length})
              </TabsTrigger>
            )}
            {canViewCommercial && (
              <TabsTrigger
                value="commercial"
                className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
              >
                <WalletCards className="size-3.5" /> Commercial & Profitability
              </TabsTrigger>
            )}
            <TabsTrigger
              value="qa_safety"
              className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
            >
              <ShieldCheck className="size-3.5" /> Quality & Safety ({projNcrs.length})
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
            >
              <Boxes className="size-3.5" /> Materials
            </TabsTrigger>
            <TabsTrigger
              value="people"
              className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
            >
              <Users className="size-3.5" /> People
            </TabsTrigger>
            <TabsTrigger
              value="equipment"
              className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
            >
              <Truck className="size-3.5" /> Equipment ({projEquipment.length})
            </TabsTrigger>
            <TabsTrigger
              value="issues"
              className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
            >
              <AlertTriangle className="size-3.5" /> Issues ({projAlerts.length})
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="gap-1.5 py-1.5 px-3 text-xs rounded-lg font-medium"
            >
              <FileText className="size-3.5" /> Documents & Drawings ({projDocs.length + projDrawings.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. OVERVIEW DOMAIN */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Progress & Baseline Card */}
            <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-panel space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Project Execution Baseline & Health
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Physical progress S-Curve vs Approved Schedule Baseline
                  </p>
                </div>
                <WorkflowBadge status={project.status} />
              </div>

              {/* Progress Bar & Variance */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Physical Progress: {project.progress}%</span>
                  <span className="text-muted-foreground">
                    Planned Target: {project.plannedProgress}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${
                      project.progress < project.plannedProgress ? "bg-warning" : "bg-primary"
                    }`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Start: {project.startDate}</span>
                  <span>Target Handover: {project.targetCompletion}</span>
                </div>
              </div>

              {/* Project Health Score Grid */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Composite Work Readiness Score
                  </span>
                  <span className="font-mono text-sm font-bold text-primary">
                    {readinessScore.readinessScore}/100 ({readinessScore.status.toUpperCase()})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded border bg-card p-2">
                    <span className="text-muted-foreground text-[10px]">Materials</span>
                    <p className="font-bold text-success">Allocated</p>
                  </div>
                  <div className="rounded border bg-card p-2">
                    <span className="text-muted-foreground text-[10px]">Labour Muster</span>
                    <p className="font-bold text-foreground">{project.activeWorkersToday} Deployed</p>
                  </div>
                  <div className="rounded border bg-card p-2">
                    <span className="text-muted-foreground text-[10px]">Equipment</span>
                    <p className="font-bold text-foreground">{projEquipment.length} Units</p>
                  </div>
                  <div className="rounded border bg-card p-2">
                    <span className="text-muted-foreground text-[10px]">GFC Drawings</span>
                    <p className="font-bold text-success">{projDrawings.length} Approved</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Site Metadata & Leadership */}
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b pb-2">
                Site Coordinates & Team
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground">Address</span>
                  <p className="font-semibold">{project.address}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Built-up Area / Site</span>
                  <p className="font-semibold">{project.builtUpArea} ({project.siteArea})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Client Organization</span>
                  <p className="font-semibold">{project.client}</p>
                </div>
                <div className="border-t pt-2">
                  <span className="text-muted-foreground">Project Manager</span>
                  <p className="font-bold text-primary">{project.manager.name}</p>
                  <p className="text-[11px] text-muted-foreground">{project.manager.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. PLANNING & ENGINEERING DOMAIN */}
        <TabsContent value="planning" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: "wbs", label: `Phases & Tasks (${projWbs.length})` },
                  { id: "gantt", label: "Timeline & Schedule" },
                  { id: "lookahead", label: "Weekly Work Plan" },
                  { id: "boq", label: `Cost Estimates / BOQ (${projBoq.length})` },
                  { id: "dmb", label: `Measurement Book / MB (${projDmb.length})` },
                  { id: "readiness", label: "Pre-Start Checklist" },
                  { id: "health", label: "Project Health" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPlanningSubTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    planningSubTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {planningSubTab === "boq" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setImportDataset("boq");
                      setImportWizardOpen(true);
                    }}
                    className="gap-1.5 shadow-sm text-xs"
                  >
                    <Upload className="size-3.5" /> Import Estimates (BOQ)
                  </Button>
                  <Button size="sm" onClick={() => setAddBoqOpen(true)} className="gap-1.5 shadow-sm text-xs">
                    <Plus className="size-3.5" /> Add Estimate Item
                  </Button>
                </>
              )}
              {planningSubTab === "dmb" && (
                <Button size="sm" onClick={() => setAddMbOpen(true)} className="gap-1.5 shadow-sm text-xs">
                  <Plus className="size-3.5" /> New Measurement Entry
                </Button>
              )}
              {planningSubTab === "wbs" && canCreateWbs && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setImportDataset("wbs");
                      setImportWizardOpen(true);
                    }}
                    className="gap-1.5 shadow-sm text-xs"
                  >
                    <Upload className="size-3.5" /> Import Tasks (WBS)
                  </Button>
                  <Button size="sm" onClick={() => setAddWbsOpen(true)} className="gap-1.5 shadow-sm text-xs">
                    <Plus className="size-3.5" /> Add Task / Activity
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Subtab 1: WBS Tree */}
          {planningSubTab === "wbs" && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
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
                  {projWbs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        No WBS activities defined yet for this project.
                      </td>
                    </tr>
                  ) : (
                    projWbs.map((act) => {
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
                          <td className="px-4 py-3 font-mono font-medium">
                            {act.plannedQty.toLocaleString("en-IN")} {act.unit}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {act.actualQty.toLocaleString("en-IN")} {act.unit}
                          </td>
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtab 2: Gantt Chart */}
          {planningSubTab === "gantt" && (
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-bold text-sm">Project Timeline & Schedule</h4>
                  <p className="text-xs text-muted-foreground">
                    Critical path, milestone relationships, baseline vs actual timelines.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><div className="size-2.5 rounded bg-primary" /> Actual Progress</span>
                  <span className="flex items-center gap-1.5"><div className="size-2.5 rounded bg-danger" /> Critical Path</span>
                  <span className="flex items-center gap-1.5"><div className="size-2.5 rounded bg-muted-foreground/40" /> Planned Baseline</span>
                </div>
              </div>

              <div className="space-y-3">
                {projWbs.map((act, index) => (
                  <div key={act.id} className="rounded-lg border bg-muted/20 p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">{act.code}</span>
                        <span className="font-bold text-foreground">{act.name}</span>
                        {index === 0 && <span className="rounded bg-danger/10 text-danger px-1.5 py-0.5 text-[10px] font-bold">Critical Path</span>}
                      </div>
                      <span className="text-muted-foreground font-mono">{act.startDate} → {act.endDate}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3 text-[11px] text-muted-foreground">
                        Dependency: {index > 0 ? `FS with ${projWbs[index - 1]?.code}` : "Start Milestone"}
                      </div>
                      <div className="col-span-9">
                        <div className="h-4 rounded-md bg-muted relative overflow-hidden">
                          <div
                            className={`h-full ${index === 0 ? "bg-danger" : "bg-primary"} transition-all`}
                            style={{ width: `${Math.max(5, act.actualProgress)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 3: Lookahead Board */}
          {planningSubTab === "lookahead" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-card p-4 shadow-panel space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b pb-2 flex items-center justify-between">
                    <span>Upcoming 2-Week Plan</span>
                    <span className="text-muted-foreground font-mono text-[10px]">Short-term Work Packages</span>
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    {projWbs.slice(0, 3).map((act) => (
                      <div key={act.id} className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2.5 font-semibold">
                          <span className="min-w-0 break-words leading-snug">{act.code} · {act.name}</span>
                          <span className="rounded bg-success/15 text-success px-1.5 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap">Ready</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Assigned: {act.assignedGang} · Target: {act.plannedQty} {act.unit}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                          <span>Materials: Secured</span> · <span>Drawings: Rev 02 Approved</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-panel space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-2 flex items-center justify-between">
                    <span>Upcoming 4-Week Plan</span>
                    <span className="text-muted-foreground font-mono text-[10px]">Medium-term Clearances</span>
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    {projWbs.slice(2, 5).map((act) => (
                      <div key={act.id} className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2.5 font-semibold">
                          <span className="min-w-0 break-words leading-snug">{act.code} · {act.name}</span>
                          <span className="rounded bg-warning/15 text-warning px-1.5 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap">Pre-Requisite Pending</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Assigned: {act.assignedGang} · Target: {act.plannedQty} {act.unit}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                          <span>Materials: Indent Pending</span> · <span>Drawings: Verification Required</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 4: BOQ Register */}
          {planningSubTab === "boq" && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Item #</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Rate (₹)</th>
                    <th className="px-4 py-3">Amount (₹)</th>
                    <th className="px-4 py-3">WBS Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projBoq.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No cost estimate items registered. Click "Add Estimate Item" or "Import Estimates (BOQ)" to begin.
                      </td>
                    </tr>
                  ) : (
                    projBoq.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{b.itemNumber}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{b.description}</td>
                        <td className="px-4 py-3">{b.unit}</td>
                        <td className="px-4 py-3 font-mono font-bold">{b.quantity.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 font-mono">₹{b.rate.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 font-mono font-bold">{formatCurrency(b.amount)}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{b.wbsActivityCode || "Unlinked"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtab 5: Digital Measurement Book (DMB) */}
          {planningSubTab === "dmb" && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">MB #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Location & Item</th>
                    <th className="px-4 py-3">Method & Dims</th>
                    <th className="px-4 py-3">Calculated Qty</th>
                    <th className="px-4 py-3">Cumulative</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projDmb.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No digital measurement entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    projDmb.map((mb) => (
                      <tr key={mb.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{mb.mbNumber}</td>
                        <td className="px-4 py-3">{mb.date}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{mb.location}</p>
                          <p className="text-[11px] text-muted-foreground">{mb.description}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {mb.dimensions.length}m × {mb.dimensions.breadth}m × {mb.dimensions.depth}m (×{mb.dimensions.count})
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {mb.calculatedQty.toFixed(2)} {mb.unit}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {mb.cumulativeQty.toFixed(2)} {mb.unit}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              mb.verificationStatus === "verified"
                                ? "bg-success/15 text-success"
                                : mb.verificationStatus === "rejected"
                                  ? "bg-danger/15 text-danger"
                                  : "bg-warning/15 text-warning"
                            }`}
                          >
                            {mb.verificationStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {mb.verificationStatus === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                mockStore.updateDigitalMbStatus(mb.id, "verified", "Lead Engineer");
                                notify(`Measurement ${mb.mbNumber} verified.`);
                              }}
                            >
                              Verify
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtab 6: Work Readiness */}
          {planningSubTab === "readiness" && (
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-bold text-sm">Work Readiness Indicator & 6-Vector Assessment</h4>
                  <p className="text-xs text-muted-foreground">
                    Calculated composite score based on material, labour, plant, and drawing prerequisites.
                  </p>
                </div>
                <span className="font-mono font-bold text-base text-primary">
                  {readinessScore.readinessScore}/100
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground font-semibold">1. Materials Supply</span>
                  <p className="font-bold text-success">100% Available on Site</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground font-semibold">2. Labour Gangs</span>
                  <p className="font-bold text-foreground">{project.activeWorkersToday} Workers Deployed</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground font-semibold">3. Plant & Equipment</span>
                  <p className="font-bold text-foreground">{projEquipment.length} Machinery Active</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground font-semibold">4. GFC Drawings</span>
                  <p className="font-bold text-success">{projDrawings.length} Approved Drawings</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground font-semibold">5. Statutory Permits</span>
                  <p className="font-bold text-success">Clear & Valid</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground font-semibold">6. Site Access</span>
                  <p className="font-bold text-success">100% Ready</p>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 7: Project Health */}
          {planningSubTab === "health" && (
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <h4 className="font-bold text-sm border-b pb-3">Comprehensive Project Health Matrix</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Schedule Health</span>
                  <p className={`font-bold ${project.progress < project.plannedProgress ? "text-warning" : "text-success"}`}>
                    {project.progress >= project.plannedProgress ? "On Track" : `${project.plannedProgress - project.progress}% Schedule Lag`}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Budget Variance</span>
                  <p className={`font-bold ${project.varianceAmount > 0 ? "text-danger" : "text-success"}`}>
                    {project.varianceAmount > 0 ? `+${formatCurrency(project.varianceAmount)} Over Budget` : "Within Baseline"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Quality & NCRs</span>
                  <p className="font-bold text-foreground">{projNcrs.length} Total Registered ({projNcrs.filter((n) => n.status !== "closed").length} Open)</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Safety EHS Index</span>
                  <p className="font-bold text-success">Zero Lost Time Incidents</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Technical RFIs</span>
                  <p className="font-bold text-foreground">{projRfis.length} Queries ({projRfis.filter((r) => r.status === "open").length} Awaiting Response)</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Overall Status</span>
                  <p className="font-bold capitalize text-primary">{project.health} Condition</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 3. PROGRESS DOMAIN */}
        {canViewDpr && (
          <TabsContent value="progress" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(["dpr", "weekly", "physical", "variance"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProgressSubTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      progressSubTab === tab
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab === "dpr" ? `Daily DPR Logs (${projDprs.length})` : tab === "weekly" ? "Progress Curve (S-Curve)" : tab === "physical" ? "Physical Progress" : "Delay / Variance"}
                  </button>
                ))}
              </div>

              {canCreateDpr && (
                <Button
                  size="sm"
                  onClick={() => notify("Use Quick Add to record a new DPR")}
                  className="gap-1.5 shadow-sm text-xs"
                >
                  <Plus className="size-3.5" /> New Daily Log
                </Button>
              )}
            </div>

            {projDprs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                No DPR logs recorded yet for this project.
              </div>
            ) : (
              <div className="space-y-4">
                {projDprs.map((dpr) => (
                  <div key={dpr.id} className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {dpr.dprNumber}
                          </span>
                          <WorkflowBadge status={dpr.status} />
                        </div>
                        <h4 className="text-sm font-bold text-foreground mt-1">
                          Date: {dpr.date} · {dpr.shift}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Submitted by <strong>{dpr.submittedBy.name}</strong></span>
                        <Button size="sm" variant="outline" onClick={() => setViewDpr(dpr)}>
                          <Eye className="size-3.5 mr-1" /> View Full Sheet
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4 text-xs">
                      <div className="rounded-lg border p-2.5 bg-muted/20">
                        <span className="text-muted-foreground">Weather & Temp</span>
                        <p className="font-bold capitalize mt-0.5">{dpr.weather}, {dpr.temperature}</p>
                      </div>
                      <div className="rounded-lg border p-2.5 bg-muted/20">
                        <span className="text-muted-foreground">Total Workforce</span>
                        <p className="font-bold mt-0.5">
                          {dpr.manpower.reduce((acc, m) => acc + m.skilled + m.unskilled + m.supervisor, 0)} Workers
                        </p>
                      </div>
                      <div className="rounded-lg border p-2.5 bg-muted/20">
                        <span className="text-muted-foreground">Active Machinery</span>
                        <p className="font-bold mt-0.5">{dpr.equipment.length} Units Running</p>
                      </div>
                      <div className="rounded-lg border p-2.5 bg-muted/20">
                        <span className="text-muted-foreground">Safety Status</span>
                        <p className="font-bold text-success mt-0.5">Zero Incidents</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* 4. COMMERCIAL DOMAIN */}
        {canViewCommercial && (
          <TabsContent value="commercial" className="space-y-4">
            <div className="flex items-center gap-1.5 overflow-x-auto border-b pb-3">
              {(
                [
                  { id: "profitability", label: "Profitability & Margin" },
                  { id: "eac", label: "Earned Value & EAC" },
                  { id: "expenses", label: `Expenses (${projExpenses.length})` },
                  { id: "payments", label: `Payments (${projPayments.length})` },
                  { id: "budget", label: "Budget vs Actual" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCommercialSubTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    commercialSubTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {commercialSubTab === "profitability" && (
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
                <h4 className="font-bold text-sm border-b pb-2">Project Commercial Profitability Breakdown</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-muted-foreground">Contract Value</span>
                    <p className="font-mono text-base font-bold text-foreground">{formatCurrency(profitability.contractValue)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-muted-foreground">Actual Cost Incurred</span>
                    <p className="font-mono text-base font-bold text-foreground">{formatCurrency(profitability.actualCost)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-muted-foreground">Projected Margin %</span>
                    <p className="font-mono text-base font-bold text-success">{profitability.projectedMarginPercent.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-muted-foreground">Projected Profit</span>
                    <p className="font-mono text-base font-bold text-success">{formatCurrency(profitability.projectedProfit)}</p>
                  </div>
                </div>
              </div>
            )}

            {commercialSubTab === "eac" && (
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
                <h4 className="font-bold text-sm border-b pb-2">Cost & Budget Forecast at Completion (EAC)</h4>
                <div className="grid gap-4 sm:grid-cols-3 text-xs">
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-muted-foreground">Approved Budget (BAC)</span>
                    <p className="font-mono text-base font-bold text-foreground">{formatCurrency(eacData.budgetAtCompletion)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-muted-foreground">Projected Final Cost (EAC)</span>
                    <p className="font-mono text-base font-bold text-foreground">{formatCurrency(eacData.estimateAtCompletion)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-muted-foreground">Projected Cost Variance (VAC)</span>
                    <p className={`font-mono text-base font-bold ${eacData.varianceAtCompletion < 0 ? "text-danger" : "text-success"}`}>
                      {formatCurrency(eacData.varianceAtCompletion)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {commercialSubTab === "expenses" && (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
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
                        <td className="px-4 py-3"><WorkflowBadge status={exp.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {commercialSubTab === "payments" && (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
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
                        <td className="px-4 py-3"><WorkflowBadge status={pay.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        )}

        {/* 5. QA/QC & SAFETY DOMAIN */}
        <TabsContent value="qa_safety" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: "pour_cards", label: `Pour Checklists (${projPourCards.length})` },
                  { id: "ncrs", label: `Quality Defects / NCR (${projNcrs.length})` },
                  { id: "safety_walks", label: `Safety Inspections (${projSafetyWalks.length})` },
                  { id: "incidents", label: `Safety Incidents (${projSafetyIncidents.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setQaSafetySubTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    qaSafetySubTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {qaSafetySubTab === "pour_cards" && (
                <Button size="sm" onClick={() => setAddPourCardOpen(true)} className="gap-1.5 shadow-sm text-xs">
                  <Plus className="size-3.5" /> Pre-Pour Checklist
                </Button>
              )}
              {qaSafetySubTab === "ncrs" && (
                <Button size="sm" onClick={() => setAddNcrOpen(true)} className="gap-1.5 shadow-sm text-xs">
                  <Plus className="size-3.5" /> Report Quality Defect (NCR)
                </Button>
              )}
            </div>
          </div>

          {qaSafetySubTab === "pour_cards" && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Pour #</th>
                    <th className="px-4 py-3">Location & Element</th>
                    <th className="px-4 py-3">Grade & Qty</th>
                    <th className="px-4 py-3">Checklists Verified</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projPourCards.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No Pour Cards filed yet. Click "Pre-Pour Checklist" to initiate a concrete pour.
                      </td>
                    </tr>
                  ) : (
                    projPourCards.map((pc) => (
                      <tr key={pc.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{pc.pourNumber}</td>
                        <td className="px-4 py-3 font-bold">{pc.location} · {pc.element}</td>
                        <td className="px-4 py-3 font-mono">{pc.gradeOfConcrete} ({pc.plannedQuantityCum} cum)</td>
                        <td className="px-4 py-3 text-success font-semibold">5/5 Inspections Signed Off</td>
                        <td className="px-4 py-3"><WorkflowBadge status={pc.status} /></td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedPourCard(pc)}>
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {qaSafetySubTab === "ncrs" && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">NCR #</th>
                    <th className="px-4 py-3">Issue Title & Location</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Responsible</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projNcrs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No Non-Conformance Reports registered. Quality standards strictly maintained.
                      </td>
                    </tr>
                  ) : (
                    projNcrs.map((ncr) => (
                      <tr key={ncr.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-danger">{ncr.ncrNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{ncr.title}</p>
                          <p className="text-[11px] text-muted-foreground">{ncr.location}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              ncr.severity === "critical"
                                ? "bg-danger/15 text-danger"
                                : ncr.severity === "major"
                                  ? "bg-warning/15 text-warning"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {ncr.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">{ncr.responsibleParty}</td>
                        <td className="px-4 py-3 font-mono">{ncr.dueDate}</td>
                        <td className="px-4 py-3"><WorkflowBadge status={ncr.status} /></td>
                        <td className="px-4 py-3">
                          {ncr.status !== "closed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                mockStore.updateNcrStatus(ncr.id, "closed", "QA Manager");
                                notify(`NCR ${ncr.ncrNumber} verified and closed.`);
                              }}
                            >
                              Closeout
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {qaSafetySubTab === "safety_walks" && (
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
              <h4 className="font-bold text-sm border-b pb-2">Daily EHS Safety Walkthrough Register</h4>
              <p className="text-xs text-muted-foreground">
                Zero-incident site protocol: Daily PPE inspections, scaffolding stability, and electrical isolation checks.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 text-xs pt-2">
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="font-bold text-foreground">PPE Adherence Rate: 98%</span>
                  <p className="text-muted-foreground text-[11px]">Helmets, high-vis vests, steel-toe boots verified across all gangs.</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="font-bold text-success">Zero Lost-Time Incidents</span>
                  <p className="text-muted-foreground text-[11px]">Continuous safe man-hours logged since site commencement.</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 6. MATERIALS DOMAIN */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold">Site Materials & Stores</h3>
              <p className="text-xs text-muted-foreground">
                Stock allocated to this site, indents, and receiving receipts.
              </p>
            </div>
            <Button size="sm" asChild variant="outline" className="text-xs">
              <Link to={"/materials" as any}>Full Materials Center →</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 shadow-panel">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Stock Allocated to {project.name}
              </h4>
              <div className="divide-y text-xs">
                {materials.map((mat) => {
                  const alloc = mat.siteAllocations.find(
                    (s) => s.siteName.includes(project.name) || project.name.includes(s.siteName),
                  );
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

            <div className="rounded-xl border bg-card p-4 shadow-panel">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Site Indents ({projIndents.length})
              </h4>
              <div className="space-y-2 text-xs">
                {projIndents.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center">No open indents for this project.</p>
                ) : (
                  projIndents.map((ind) => (
                    <div key={ind.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono font-bold text-primary">{ind.indentNumber}</span>
                        <WorkflowBadge status={ind.status} />
                      </div>
                      <p className="text-muted-foreground">
                        {ind.items.map((i) => `${i.quantity} ${i.unit} of ${i.materialName}`).join(", ")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">Required by: {ind.requiredDate}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 7. PEOPLE DOMAIN */}
        <TabsContent value="people" className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold">Labour & Subcontractor Workforce</h3>
              <p className="text-xs text-muted-foreground">
                Contractor muster roll deployments, daily headcount, and assigned trades.
              </p>
            </div>
            <Button size="sm" asChild variant="outline" className="text-xs">
              <Link to={"/people" as any}>Labour Directory →</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {labourContractors
              .filter(
                (lc) =>
                  lc.assignedProject.includes(project.name) ||
                  project.name.includes(lc.assignedProject),
              )
              .map((lc) => (
                <div key={lc.id} className="rounded-xl border bg-card p-4 shadow-panel space-y-3">
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

        {/* 8. EQUIPMENT DOMAIN */}
        <TabsContent value="equipment" className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold">Plant & Machinery Deployed on Site</h3>
              <p className="text-xs text-muted-foreground">
                Operating hours, fuel consumption, and service maintenance status.
              </p>
            </div>
            <Button size="sm" asChild variant="outline" className="text-xs">
              <Link to={"/equipment" as any}>Equipment Master →</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {projEquipment.map((eq) => (
              <div key={eq.id} className="rounded-xl border bg-card p-4 shadow-panel space-y-3">
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

        {/* 9. ISSUES & ALERTS DOMAIN */}
        <TabsContent value="issues" className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold">Project Alerts & Corrective Actions</h3>
              <p className="text-xs text-muted-foreground">
                Smart variance detections, root causes, financial impacts, and action triggers.
              </p>
            </div>
            <Button size="sm" asChild variant="outline" className="text-xs">
              <Link to={"/alerts" as any}>Issues & Alerts Hub →</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {projAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border bg-card p-5 shadow-panel space-y-3 ${
                  alert.severity === "critical"
                    ? "border-l-4 border-l-danger"
                    : "border-l-4 border-l-warning"
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

                <div className="grid gap-3 sm:grid-cols-2 rounded-lg bg-muted/30 p-3 text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground">Root Cause:</span>
                    <p className="mt-0.5 text-foreground">{alert.rootCause}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Estimated Impact:</span>
                    <p className="mt-0.5 font-mono font-bold text-danger">{alert.impact}</p>
                  </div>
                </div>

                <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 text-xs">
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

        {/* 10. DOCUMENTS & DRAWINGS DOMAIN */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: "drawings", label: `Drawings (${projDrawings.length})` },
                  { id: "rfi", label: `RFI Desk (${projRfis.length})` },
                  { id: "files", label: `Site Documents (${projDocs.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDocsSubTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    docsSubTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {docsSubTab === "drawings" && (
                <Button size="sm" onClick={() => setAddDrawingOpen(true)} className="gap-1.5 shadow-sm text-xs">
                  <Plus className="size-3.5" /> Register Drawing
                </Button>
              )}
              {docsSubTab === "rfi" && (
                <Button size="sm" onClick={() => setAddRfiOpen(true)} className="gap-1.5 shadow-sm text-xs">
                  <Plus className="size-3.5" /> Raise RFI
                </Button>
              )}
            </div>
          </div>

          {docsSubTab === "drawings" && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Drawing #</th>
                    <th className="px-4 py-3">Drawing Title</th>
                    <th className="px-4 py-3">Discipline</th>
                    <th className="px-4 py-3">Current Revision</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projDrawings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No drawings registered yet. Click "Register Drawing" to track GFC revisions.
                      </td>
                    </tr>
                  ) : (
                    projDrawings.map((drw) => (
                      <tr key={drw.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{drw.drawingNumber}</td>
                        <td className="px-4 py-3 font-bold text-foreground">{drw.title}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">{drw.discipline}</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">{drw.currentRevision}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-success/15 text-success px-2 py-0.5 text-[10px] font-bold">
                            {drw.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{drw.issueDate}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedDrawing(drw)}>
                            <Eye className="size-3.5 mr-1" /> View Sheet
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {docsSubTab === "rfi" && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">RFI #</th>
                    <th className="px-4 py-3">Subject & Technical Query</th>
                    <th className="px-4 py-3">Discipline</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projRfis.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No technical RFIs open for this project.
                      </td>
                    </tr>
                  ) : (
                    projRfis.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{r.rfiNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{r.subject}</p>
                          <p className="text-[11px] text-muted-foreground">{r.technicalQuery}</p>
                        </td>
                        <td className="px-4 py-3">{r.discipline}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              r.priority === "critical" || r.priority === "high"
                                ? "bg-danger/15 text-danger"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {r.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">{r.assignedTo}</td>
                        <td className="px-4 py-3"><WorkflowBadge status={r.status} /></td>
                        <td className="px-4 py-3">
                          {r.status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                mockStore.answerRfi(
                                  r.id,
                                  "Detailing approved per IS 456 / Revision A GFC drawing notes.",
                                  "Consultant Lead",
                                );
                                notify(`RFI ${r.rfiNumber} response recorded.`);
                              }}
                            >
                              Provide Answer
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {docsSubTab === "files" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-panel hover:shadow-float transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span className="rounded bg-muted px-2 py-0.5 font-semibold text-primary">
                        {doc.type}
                      </span>
                      <span className="font-mono">{doc.version}</span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground">{doc.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {doc.category} · {doc.size}
                    </p>
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
          )}
        </TabsContent>
      </Tabs>

      {/* Add WBS Activity Dialog */}
      <Dialog open={addWbsOpen} onOpenChange={setAddWbsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Add Phase / Work Activity (WBS)</DialogTitle>
            <DialogDescription className="text-xs">
              Define planned quantities, unit rate, and assigned subcontractor gang.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddWbs} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="wbs-code" label="Activity Code" required>
                <Input
                  id="wbs-code"
                  value={wbsCode}
                  onChange={(e) => setWbsCode(e.target.value)}
                  placeholder="e.g. WBS-STR-01"
                  required
                  className="h-9 font-mono text-xs"
                />
              </FormField>

              <FormField id="wbs-cat" label="Domain Category" required>
                <select
                  id="wbs-cat"
                  value={wbsCategory}
                  onChange={(e) => setWbsCategory(e.target.value as WbsActivity["category"])}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option>Substructure</option>
                  <option>Superstructure</option>
                  <option>Finishes</option>
                  <option>MEP</option>
                  <option>External Works</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="wbs-name" label="Activity Description" required>
                <Input
                  id="wbs-name"
                  placeholder="e.g. M40 Raft Concreting / AAC Block Masonry"
                  value={wbsName}
                  onChange={(e) => setWbsName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={3}>
              <FormField id="wbs-unit" label="Unit of Measure" required>
                <Input
                  id="wbs-unit"
                  value={wbsUnit}
                  onChange={(e) => setWbsUnit(e.target.value)}
                  placeholder="e.g. cum"
                  required
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField id="wbs-qty" label="Planned Quantity" required>
                <Input
                  id="wbs-qty"
                  type="number"
                  value={wbsPlannedQty}
                  onChange={(e) => setWbsPlannedQty(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>

              <FormField id="wbs-rate" label="Unit Rate (₹)" required>
                <Input
                  id="wbs-rate"
                  type="number"
                  value={wbsPlannedRate}
                  onChange={(e) => setWbsPlannedRate(e.target.value)}
                  placeholder="e.g. 6800"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="wbs-gang" label="Assigned Subcontractor / Labour Gang" optional help="Gang responsible for physical execution of this work package.">
                <Input
                  id="wbs-gang"
                  value={wbsGang}
                  onChange={(e) => setWbsGang(e.target.value)}
                  placeholder="e.g. Gang #2 - Shuttering & Bar Bending"
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddWbsOpen(false)}
              submitLabel="Add Work Activity"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add BOQ Item Dialog */}
      <Dialog open={addBoqOpen} onOpenChange={setAddBoqOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Register Bill of Quantities (BOQ) Item</DialogTitle>
            <DialogDescription className="text-xs">
              Add a contract BOQ schedule item for measurement and certification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBoq} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="boq-item" label="Item Number" required>
                <Input
                  id="boq-item"
                  value={boqItemNo}
                  onChange={(e) => setBoqItemNo(e.target.value)}
                  placeholder="e.g. BOQ-01.04"
                  required
                  className="h-9 font-mono text-xs"
                />
              </FormField>
              <FormField id="boq-unit" label="Unit" required>
                <Input
                  id="boq-unit"
                  value={boqUnit}
                  onChange={(e) => setBoqUnit(e.target.value)}
                  placeholder="cum / sqm / MT"
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="boq-desc" label="Item Description" required>
                <Textarea
                  id="boq-desc"
                  placeholder="e.g. Providing and laying reinforced cement concrete M40 in columns and beams..."
                  value={boqDesc}
                  onChange={(e) => setBoqDesc(e.target.value)}
                  required
                  className="h-18 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="boq-qty" label="Estimated Quantity" required>
                <Input
                  id="boq-qty"
                  type="number"
                  value={boqQty}
                  onChange={(e) => setBoqQty(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField id="boq-rate" label="Contract Rate (₹)" required>
                <Input
                  id="boq-rate"
                  type="number"
                  value={boqRate}
                  onChange={(e) => setBoqRate(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddBoqOpen(false)}
              submitLabel="Save BOQ Item"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Digital MB Entry Dialog */}
      <Dialog open={addMbOpen} onOpenChange={setAddMbOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Record Measurement Book (MB) Entry</DialogTitle>
            <DialogDescription className="text-xs">
              Enter field dimensions for automated calculation and site engineer verification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMb} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="mb-type" label="Measurement Method" required>
                <select
                  id="mb-type"
                  value={mbType}
                  onChange={(e) => setMbType(e.target.value as MeasurementType)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option>Length × Breadth × Depth</option>
                  <option>Length × Breadth</option>
                  <option>Length</option>
                  <option>Area</option>
                  <option>Volume</option>
                  <option>Count</option>
                  <option>Custom</option>
                </select>
              </FormField>

              <FormField id="mb-loc" label="Location / Grid Ref" required>
                <Input
                  id="mb-loc"
                  placeholder="e.g. Tower A Floor 14 Grid 3-B"
                  value={mbLocation}
                  onChange={(e) => setMbLocation(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={4}>
              <FormField id="mb-l" label="Length (m)" required>
                <Input
                  id="mb-l"
                  type="number"
                  value={mbLength}
                  onChange={(e) => setMbLength(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField id="mb-b" label="Breadth (m)" required>
                <Input
                  id="mb-b"
                  type="number"
                  value={mbBreadth}
                  onChange={(e) => setMbBreadth(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField id="mb-d" label="Depth (m)" required>
                <Input
                  id="mb-d"
                  type="number"
                  value={mbDepth}
                  onChange={(e) => setMbDepth(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField id="mb-c" label="Units (Nos)" required>
                <Input
                  id="mb-c"
                  type="number"
                  value={mbCount}
                  onChange={(e) => setMbCount(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <div className="rounded-lg border bg-primary/5 p-3 text-xs">
              <span className="font-semibold text-muted-foreground">Calculated Output Quantity:</span>
              <p className="font-mono text-base font-bold text-primary">
                {(
                  (parseFloat(mbLength) || 0) *
                  (parseFloat(mbBreadth) || 1) *
                  (parseFloat(mbDepth) || 1) *
                  (parseFloat(mbCount) || 1)
                ).toFixed(2)}{" "}
                {mbUnit}
              </p>
            </div>

            <FormActions
              onCancel={() => setAddMbOpen(false)}
              submitLabel="Submit Measurement"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Pour Card Dialog */}
      <Dialog open={addPourCardOpen} onOpenChange={setAddPourCardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Pre-Pour Checklist & Pour Card</DialogTitle>
            <DialogDescription className="text-xs">
              Verify shuttering, rebar, cover blocks, and MEP sleeves prior to concrete casting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPourCard} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="pc-loc" label="Pour Location" required>
                <Input
                  id="pc-loc"
                  placeholder="e.g. Tower B 18th Floor Slab"
                  value={pourLocation}
                  onChange={(e) => setPourLocation(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField id="pc-elem" label="Structural Element" required>
                <Input
                  id="pc-elem"
                  value={pourElement}
                  onChange={(e) => setPourElement(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="pc-grade" label="Concrete Grade" required>
                <Input
                  id="pc-grade"
                  value={pourGrade}
                  onChange={(e) => setPourGrade(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField id="pc-qty" label="Estimated Quantity (cum)" required>
                <Input
                  id="pc-qty"
                  type="number"
                  value={pourQty}
                  onChange={(e) => setPourQty(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
              <span className="font-bold text-foreground">Pre-Pour Physical Verifications:</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pourShuttering}
                  onChange={(e) => setPourShuttering(e.target.checked)}
                />
                Shuttering alignment, line & level verified
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pourRebar}
                  onChange={(e) => setPourRebar(e.target.checked)}
                />
                Rebar diameter, spacing & lap lengths per GFC drawing
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pourCover}
                  onChange={(e) => setPourCover(e.target.checked)}
                />
                Cover blocks placed at required intervals
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pourMep}
                  onChange={(e) => setPourMep(e.target.checked)}
                />
                MEP sleeves and conduit boxes secured
              </label>
            </div>

            <FormActions
              onCancel={() => setAddPourCardOpen(false)}
              submitLabel="Submit Pour Card"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add NCR Dialog */}
      <Dialog open={addNcrOpen} onOpenChange={setAddNcrOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Report Quality Defect / Issue (NCR)</DialogTitle>
            <DialogDescription className="text-xs">
              Log quality defect, severity, and assign corrective & preventive actions (CAPA).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddNcr} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="ncr-title" label="Issue Title" required>
                <Input
                  id="ncr-title"
                  placeholder="e.g. Honeycombing in Shear Wall SW-04"
                  value={ncrTitle}
                  onChange={(e) => setNcrTitle(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField id="ncr-sev" label="Severity" required>
                <select
                  id="ncr-sev"
                  value={ncrSeverity}
                  onChange={(e) => setNcrSeverity(e.target.value as NcrSeverity)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="ncr-desc" label="Defect Description & Root Cause" required>
                <Textarea
                  id="ncr-desc"
                  placeholder="Detailed observations regarding workmanship or material deficiency..."
                  value={ncrDesc}
                  onChange={(e) => setNcrDesc(e.target.value)}
                  required
                  className="h-18 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="ncr-party" label="Responsible Subcontractor" required>
                <Input
                  id="ncr-party"
                  value={ncrParty}
                  onChange={(e) => setNcrParty(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField id="ncr-due" label="Target Closure Date" required>
                <Input
                  id="ncr-due"
                  type="date"
                  value={ncrDueDate}
                  onChange={(e) => setNcrDueDate(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddNcrOpen(false)}
              submitLabel="Report Defect (NCR)"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Drawing Dialog */}
      <Dialog open={addDrawingOpen} onOpenChange={setAddDrawingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Register Engineering GFC Drawing</DialogTitle>
            <DialogDescription className="text-xs">
              Log drawing number, discipline, and initial revision code.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDrawing} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="drw-no" label="Drawing Number" required>
                <Input
                  id="drw-no"
                  placeholder="e.g. DWG-STR-S14-001"
                  value={drwNo}
                  onChange={(e) => setDrwNo(e.target.value)}
                  required
                  className="h-9 font-mono text-xs"
                />
              </FormField>
              <FormField id="drw-disc" label="Discipline" required>
                <select
                  id="drw-disc"
                  value={drwDiscipline}
                  onChange={(e) => setDrwDiscipline(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option>Architecture</option>
                  <option>Structural</option>
                  <option>MEP</option>
                  <option>Other</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="drw-title" label="Drawing Title" required>
                <Input
                  id="drw-title"
                  placeholder="e.g. 14th Floor Slab Reinforcement Details"
                  value={drwTitle}
                  onChange={(e) => setDrwTitle(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField id="drw-rev" label="Revision Code" required>
                <Input
                  id="drw-rev"
                  placeholder="Rev 01 / GFC"
                  value={drwRev}
                  onChange={(e) => setDrwRev(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddDrawingOpen(false)}
              submitLabel="Register Drawing"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add RFI Dialog */}
      <Dialog open={addRfiOpen} onOpenChange={setAddRfiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Raise Request for Information (RFI)</DialogTitle>
            <DialogDescription className="text-xs">
              Submit a technical query to the structural/architectural consultant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRfi} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="rfi-sub" label="Subject" required>
                <Input
                  id="rfi-sub"
                  placeholder="e.g. Beam B12 depth clarification"
                  value={rfiSubject}
                  onChange={(e) => setRfiSubject(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField id="rfi-disc" label="Discipline" required>
                <select
                  id="rfi-disc"
                  value={rfiDiscipline}
                  onChange={(e) => setRfiDiscipline(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option>Architecture</option>
                  <option>Structural</option>
                  <option>MEP</option>
                  <option>Other</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="rfi-query" label="Technical Query Details" required>
                <Textarea
                  id="rfi-query"
                  placeholder="Describe conflict between architectural and structural drawings or on-site dimensions..."
                  value={rfiQuery}
                  onChange={(e) => setRfiQuery(e.target.value)}
                  required
                  className="h-20 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="rfi-pri" label="Priority" required>
                <select
                  id="rfi-pri"
                  value={rfiPriority}
                  onChange={(e) => setRfiPriority(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical (Work Blocked)</option>
                </select>
              </FormField>
              <FormField id="rfi-due" label="Required Response Date" required>
                <Input
                  id="rfi-due"
                  type="date"
                  value={rfiDueDate}
                  onChange={(e) => setRfiDueDate(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddRfiOpen(false)}
              submitLabel="Submit Technical RFI"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Reusable Excel Import Wizard Modal */}
      <ExcelImportWizard
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        datasetType={importDataset}
      />

      {/* DPR Full View Sheet */}
      {viewDpr && (
        <Dialog open={!!viewDpr} onOpenChange={(open) => !open && setViewDpr(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-bold flex items-center justify-between">
                <span>{viewDpr.dprNumber}</span>
                <WorkflowBadge status={viewDpr.status} />
              </DialogTitle>
              <DialogDescription>
                {viewDpr.projectName} · Date: {viewDpr.date} ({viewDpr.shift})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3">
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
                <div className="rounded-lg border divide-y">
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
                <div className="rounded-lg border divide-y">
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
                <p className="rounded-lg border bg-muted/20 p-2.5">{viewDpr.safetyRemarks}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Photo Inspector Modal */}
      <PhotoGalleryDialog
        photo={selectedPhoto}
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerDialog
        document={selectedDoc}
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />

      {/* Pour Card Inspect Modal */}
      {selectedPourCard && (
        <Dialog open={Boolean(selectedPourCard)} onOpenChange={(open) => !open && setSelectedPourCard(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <WorkflowBadge status={selectedPourCard.status} />
                <span className="font-mono">{selectedPourCard.pourNumber}</span>
              </div>
              <DialogTitle className="text-base font-bold">Concrete Pour Card Inspection & Signoff</DialogTitle>
              <DialogDescription className="text-xs">
                {project.name} · {selectedPourCard.location} ({selectedPourCard.element})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Grade of Concrete</span>
                  <span className="font-bold text-foreground text-sm">{selectedPourCard.gradeOfConcrete}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Planned Quantity</span>
                  <span className="font-bold text-foreground text-sm">{selectedPourCard.plannedQuantityCum} cum</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-foreground">Pre-Pour Mandatory Quality Checkpoints</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded border bg-card">
                    <span>1. Rebar diameter, spacing & lap lengths per GFC drawing</span>
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border bg-card">
                    <span>2. Formwork alignment, plumb & shuttering tape seal</span>
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border bg-card">
                    <span>3. Cover blocks (40mm/50mm) and chair supports fixed</span>
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border bg-card">
                    <span>4. Slump cone test (120mm ± 25mm) & cube sampling kit</span>
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border bg-card">
                    <span>5. Needle vibrators & standby backup operational on deck</span>
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40 text-[11px]">
                <span className="text-muted-foreground">Certified Inspection Signature:</span>
                <span className="font-semibold text-foreground">Resident Site QA Engineer (IS 456 Compliant)</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedPourCard(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    notify(`Pour Card ${selectedPourCard.pourNumber} certified and signed off.`);
                    setSelectedPourCard(null);
                  }}
                >
                  Confirm QA Sign-off
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Drawing Viewer Modal */}
      {selectedDrawing && (
        <Dialog open={Boolean(selectedDrawing)} onOpenChange={(open) => !open && setSelectedDrawing(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="font-mono">{selectedDrawing.drawingNumber}</span>
                <span>·</span>
                <span>{selectedDrawing.discipline}</span>
              </div>
              <DialogTitle className="text-base font-bold">{selectedDrawing.title}</DialogTitle>
              <DialogDescription className="text-xs">
                {project.name} · Current Revision: {selectedDrawing.currentRevision} (Issued: {selectedDrawing.issueDate})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-lg border bg-muted/30 p-8 text-center space-y-3">
                <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary mx-auto">
                  <FileText className="size-7" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{selectedDrawing.drawingNumber}.pdf</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Discipline: {selectedDrawing.discipline} · Revision: {selectedDrawing.currentRevision}</p>
                </div>
                <Button
                  size="sm"
                  className="gap-2 shadow-sm"
                  onClick={() => {
                    const headers = ["Drawing #", "Title", "Discipline", "Revision", "Issue Date", "Status"];
                    const rows = [[selectedDrawing.drawingNumber, selectedDrawing.title, selectedDrawing.discipline, selectedDrawing.currentRevision, selectedDrawing.issueDate, selectedDrawing.status]];
                    downloadCsv(`Drawing_Metadata_${selectedDrawing.drawingNumber}`, headers, rows);
                    notify(`Drawing metadata downloaded for ${selectedDrawing.drawingNumber}.`);
                  }}
                >
                  <Download className="size-4" /> Download Drawing Package (CSV)
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-card">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Release Status</span>
                  <span className="font-bold text-emerald-600">{selectedDrawing.status.toUpperCase()} FOR CONSTRUCTION</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Approval Authority</span>
                  <span className="font-bold text-foreground">Chief Structural Consultant</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedDrawing(null)}>
                  Close Viewer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}

