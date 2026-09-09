import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/auth";
import { hasPermission } from "@/authorization/permissions";
import { CustomerRole } from "@/authorization/roles";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  HardHat,
  IndianRupee,
  Layers,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  Warehouse,
} from "lucide-react";
import { AppShell, useNotify } from "@/components/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { FilterBar } from "@/components/shared/filter-bar";
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
import { calculateMaterialVariance } from "@/lib/calculations";
import { formatCurrency, mockStore, useMockStore, useContextualData } from "@/mock";
import type { Indent, MaterialItem, PurchaseOrder } from "@/mock/types";

export const Route = createFileRoute("/materials/")({
  head: () => ({
    meta: [
      { title: "Procurement & Store Operations | DEZOBUILD" },
      {
        name: "description",
        content:
          "End-to-end construction supply chain: Material Master, Indents, POs, GRN verification, warehouse inventory, and site consumption.",
      },
    ],
  }),
  component: ProcurementStorePage,
});

function ProcurementStorePage() {
  const { user } = useCurrentUser();
  const role = user?.role || CustomerRole.VIEWER;

  const store = useMockStore();
  const contextual = useContextualData();
  const notify = useNotify();

  const canIndent = hasPermission(role, "materials.indent");
  const canPO = hasPermission(role, "materials.po");
  const canGRN = hasPermission(role, "materials.grn");
  const canIssue = hasPermission(role, "materials.issue");
  const canTransfer =
    role === CustomerRole.PROCUREMENT_STORE ||
    role === CustomerRole.COMPANY_OWNER ||
    role === CustomerRole.COMPANY_ADMIN;

  // Domain navigation: overview | procurement | receiving | store | reports
  const [workspaceTab, setWorkspaceTab] = useState("overview");

  // Secondary sub-tab states
  const [procurementSubTab, setProcurementSubTab] = useState<"indents" | "pos" | "vendors" | "master">("indents");
  const [receivingSubTab, setReceivingSubTab] = useState<"grn" | "qc">("grn");
  const [storeSubTab, setStoreSubTab] = useState<"inventory" | "issues" | "returns" | "transfers">("inventory");
  const [reportsSubTab, setReportsSubTab] = useState<"stock" | "reconciliation" | "dead_stock" | "reorder">("stock");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  // Dialog States
  const [newIndentOpen, setNewIndentOpen] = useState(false);
  const [newPoOpen, setNewPoOpen] = useState(false);
  const [newGrnOpen, setNewGrnOpen] = useState(false);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  // Form States - New Indent
  const [indentProjectId, setIndentProjectId] = useState(store.projects[0]?.id || "");
  const [indentMaterialId, setIndentMaterialId] = useState(store.materials[0]?.id || "");
  const [indentQty, setIndentQty] = useState("");
  const [indentDate, setIndentDate] = useState(new Date().toISOString().split("T")[0]);
  const [indentPriority, setIndentPriority] = useState<Indent["priority"]>("normal");
  const [indentPurpose, setIndentPurpose] = useState("");

  // Form States - New PO
  const [poProjectId, setPoProjectId] = useState(store.projects[0]?.id || "");
  const [poVendorId, setPoVendorId] = useState(store.vendors[0]?.id || "");
  const [poMaterialId, setPoMaterialId] = useState(store.materials[0]?.id || "");
  const [poQty, setPoQty] = useState("");
  const [poDeliveryDate, setPoDeliveryDate] = useState("");
  const [poGstPercent, setPoGstPercent] = useState("18");

  // Form States - New GRN
  const [grnProjectId, setGrnProjectId] = useState(store.projects[0]?.id || "");
  const [grnVendorName, setGrnVendorName] = useState(store.vendors[0]?.name || "");
  const [grnChallanNo, setGrnChallanNo] = useState("");
  const [grnWarehouse, setGrnWarehouse] = useState("Main Central Warehouse");
  const [grnMaterialId, setGrnMaterialId] = useState(store.materials[0]?.id || "");
  const [grnRecQty, setGrnRecQty] = useState("");
  const [grnAccQty, setGrnAccQty] = useState("");
  const [grnRejQty, setGrnRejQty] = useState("0");

  // Form States - Issue Material
  const [issueProjectId, setIssueProjectId] = useState(store.projects[0]?.id || "");
  const [issueActivityId, setIssueActivityId] = useState(store.wbsActivities[0]?.id || "");
  const [issueMaterialId, setIssueMaterialId] = useState(store.materials[0]?.id || "");
  const [issueQty, setIssueQty] = useState("");
  const [issueTo, setIssueTo] = useState("");

  // Data scoping
  const materials = store.materials;
  const indents = contextual.indents;
  const purchaseOrders = contextual.purchaseOrders;
  const grnRecords = contextual.grnRecords;
  const materialIssues = contextual.materialIssues;
  const materialReturns = store.materialReturns;
  const stockTransfers = store.stockTransfers;
  const vendors = store.vendors;
  const projects = contextual.projects;

  // KPI calculations
  const totalStockValue = materials.reduce((acc, m) => acc + m.totalStockValue, 0);
  const lowStockMaterials = materials.filter((m) => m.currentStock <= m.reorderLevel);
  const lowStockCount = lowStockMaterials.length;
  const pendingIndentsCount = indents.filter((i) => i.status === "submitted" || i.status === "draft").length;
  const openPoValue = purchaseOrders
    .filter((po) => po.status === "issued" || po.status === "partially_received")
    .reduce((acc, po) => acc + po.grandTotal, 0);

  // Filtered materials
  const filteredMaterials = materials.filter((m) => {
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    if (warehouseFilter !== "all" && m.primaryWarehouse !== warehouseFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      m.primaryWarehouse.toLowerCase().includes(q)
    );
  });

  // Handlers
  const handleCreateIndent = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = store.projects.find((p) => p.id === indentProjectId) ?? store.projects[0];
    const mat = materials.find((m) => m.id === indentMaterialId) ?? materials[0];
    if (!proj || !mat) return;
    const qty = parseFloat(indentQty) || 100;

    mockStore.addIndent({
      projectId: proj.id,
      projectName: proj.name,
      requestedBy: "Site Engineer",
      requiredDate: indentDate || new Date().toISOString().slice(0, 10),
      priority: indentPriority,
      items: [
        {
          materialId: mat.id,
          materialName: mat.name,
          quantity: qty,
          unit: mat.unit,
          purpose: indentPurpose || "Site execution",
        },
      ],
      status: "submitted",
      notes: indentPurpose,
    });

    notify(`Indent created for ${qty} ${mat.unit} of ${mat.name}`);
    setNewIndentOpen(false);
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = store.projects.find((p) => p.id === poProjectId) ?? store.projects[0];
    const ven = vendors.find((v) => v.id === poVendorId) ?? vendors[0];
    const mat = materials.find((m) => m.id === poMaterialId) ?? materials[0];
    if (!proj || !ven || !mat) return;
    const qty = parseFloat(poQty) || 100;
    const total = qty * mat.unitRate;
    const taxRate = (parseFloat(poGstPercent) || 0) / 100;
    const tax = total * taxRate;

    mockStore.addPurchaseOrder({
      projectId: proj.id,
      projectName: proj.name,
      vendorId: ven.id,
      vendorName: ven.name,
      totalAmount: total,
      taxAmount: tax,
      grandTotal: total + tax,
      issueDate: new Date().toISOString().slice(0, 10),
      expectedDelivery: poDeliveryDate || new Date().toISOString().slice(0, 10),
      status: "issued",
      items: [
        {
          materialId: mat.id,
          materialName: mat.name,
          quantity: qty,
          unit: mat.unit,
          rate: mat.unitRate,
          amount: total,
        },
      ],
      paymentTerms: "30 Days from GRN verification",
    });

    notify(`Purchase Order issued to ${ven.name} for ${formatCurrency(total + tax)}`);
    setNewPoOpen(false);
  };

  const handleRecordGrn = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = store.projects.find((p) => p.id === grnProjectId) ?? store.projects[0];
    const mat = materials.find((m) => m.id === grnMaterialId) ?? materials[0];
    if (!proj || !mat) return;
    const recQty = parseFloat(grnRecQty) || 100;
    const accQty = parseFloat(grnAccQty) || recQty;
    const rejQty = parseFloat(grnRejQty) || 0;

    mockStore.addGrn({
      poNumber: "PO-2026-INSPECT",
      projectId: proj.id,
      projectName: proj.name,
      vendorName: grnVendorName,
      challanNumber: grnChallanNo,
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      warehouse: grnWarehouse,
      vehicleNo: "KA-04-E-8821",
      receivedBy: "Gate Inspector & Storekeeper",
      items: [
        {
          materialId: mat.id,
          materialName: mat.name,
          orderedQty: recQty,
          receivedQty: recQty,
          acceptedQty: accQty,
          rejectedQty: rejQty,
          unit: mat.unit,
          ...(rejQty > 0 ? { rejectionReason: "Moisture damage during transit" } : {}),
        },
      ],
      status: rejQty > 0 ? "flagged" : "verified",
    });

    notify(`GRN recorded for ${accQty} ${mat.unit} of ${mat.name}`);
    setNewGrnOpen(false);
  };

  const handleIssueMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = store.projects.find((p) => p.id === issueProjectId) ?? store.projects[0];
    const act = store.wbsActivities.find((a) => a.id === issueActivityId) ?? store.wbsActivities[0];
    const mat = materials.find((m) => m.id === issueMaterialId) ?? materials[0];
    if (!proj || !act || !mat) return;
    const qty = parseFloat(issueQty) || 10;

    mockStore.addMaterialIssue({
      projectId: proj.id,
      projectName: proj.name,
      activityId: act.id,
      activityName: act.name,
      issuedTo: issueTo,
      date: new Date().toISOString().slice(0, 10),
      items: [{ materialId: mat.id, materialName: mat.name, quantity: qty, unit: mat.unit }],
      requisitionNo: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      issuedBy: "Central Storekeeper",
    });

    notify(`Issued ${qty} ${mat.unit} of ${mat.name} to ${act.name}`);
    setNewIssueOpen(false);
  };

  return (
    <AppShell crumb="Procurement & Store">
      {/* Page Header: One Obvious Primary Action per Context */}
      <PageHeader
        title="Procurement & Store Operations"
        subtitle={
          contextual.isScopedToProjects
            ? `Materials lifecycle and store inventory for: ${contextual.scopedProjectNames.join(", ")}`
            : "End-to-end supply chain lifecycle: Requisitions, Purchase Orders, Goods Receipt (GRN), Inventory, and Site Issues."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportWizardOpen(true)}
              className="gap-1.5 shadow-sm text-xs"
            >
              <Upload className="size-3.5" /> Import Materials
            </Button>
            {workspaceTab === "overview" && canIndent && (
              <Button size="sm" onClick={() => setNewIndentOpen(true)} className="gap-1.5 shadow-sm">
                <ClipboardList className="size-4" /> Create Indent
              </Button>
            )}
            {workspaceTab === "procurement" && (
              <Button
                size="sm"
                onClick={() => (procurementSubTab === "pos" ? setNewPoOpen(true) : setNewIndentOpen(true))}
                className="gap-1.5 shadow-sm"
              >
                {procurementSubTab === "pos" ? (
                  <>
                    <ShoppingCart className="size-4" /> Create Purchase Order
                  </>
                ) : (
                  <>
                    <ClipboardList className="size-4" /> Create Indent
                  </>
                )}
              </Button>
            )}
            {workspaceTab === "receiving" && canGRN && (
              <Button size="sm" onClick={() => setNewGrnOpen(true)} className="gap-1.5 shadow-sm">
                <PackageCheck className="size-4" /> Record Goods Receipt (GRN)
              </Button>
            )}
            {workspaceTab === "store" && canIssue && (
              <Button size="sm" onClick={() => setNewIssueOpen(true)} className="gap-1.5 shadow-sm">
                <PackageMinus className="size-4" /> Issue Material
              </Button>
            )}
            {workspaceTab === "reports" && (
              <Button size="sm" onClick={() => notify("Generating Materials & Store PDF digest...")} className="gap-1.5 shadow-sm">
                <Download className="size-4" /> Export Report
              </Button>
            )}
          </div>
        }
      />

      {/* Level 1: Key Metrics (4 Maximum) */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Stock Valuation",
            value: formatCurrency(totalStockValue),
            hint: `${materials.length} Managed material items`,
            icon: <Boxes className="size-4" />,
          },
          {
            label: "Low Stock Alert Items",
            value: lowStockCount,
            hint: "Under reorder threshold",
            tone: lowStockCount > 0 ? "critical" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
          {
            label: "Open Site Indents",
            value: pendingIndentsCount,
            hint: "Awaiting approval / PO",
            icon: <ClipboardList className="size-4" />,
          },
          {
            label: "Committed Open POs",
            value: formatCurrency(openPoValue),
            hint: `${purchaseOrders.length} Active purchase orders`,
            icon: <Truck className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Level 2: Attention / Work Queue */}
      {(lowStockCount > 0 || pendingIndentsCount > 0) && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-foreground text-sm">
                  Supply Chain Attention: {lowStockCount} Low Stock Item{lowStockCount > 1 ? "s" : ""} · {pendingIndentsCount} Open Indent{pendingIndentsCount > 1 ? "s" : ""}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {lowStockMaterials.slice(0, 3).map((m) => `${m.name} (${m.currentStock} ${m.unit})`).join(", ")} below threshold.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => {
                  setWorkspaceTab("store");
                  setStoreSubTab("inventory");
                }}
              >
                Review Inventory
              </Button>
              <Button
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setWorkspaceTab("procurement");
                  setProcurementSubTab("indents");
                }}
              >
                Review Indents ({pendingIndentsCount})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Level 3: Lifecycle-Oriented Secondary Navigation */}
      <Tabs value={workspaceTab} onValueChange={setWorkspaceTab} className="space-y-6">
        <div className="border-b border-border/60 pb-3">
          <TabsList className="bg-card border shadow-sm p-1 h-auto flex-wrap justify-start">
            <TabsTrigger value="overview" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <Boxes className="size-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="procurement" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <ShoppingCart className="size-3.5" /> Procurement ({indents.length + purchaseOrders.length})
            </TabsTrigger>
            <TabsTrigger value="receiving" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <PackageCheck className="size-3.5" /> Receiving ({grnRecords.length} GRNs)
            </TabsTrigger>
            <TabsTrigger value="store" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <Warehouse className="size-3.5" /> Store & Inventory ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <FileSpreadsheet className="size-3.5" /> Reports
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. OVERVIEW DOMAIN */}
        <TabsContent value="overview" className="space-y-6">
          {/* Construction Material Lifecycle Flow */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-xs font-bold text-foreground">Construction Material Lifecycle</p>
                <p className="text-[11px] text-muted-foreground">Progressive supply chain stages from site indent to consumption</p>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">Click stage to navigate</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {[
                { id: "procurement", sub: "indents", step: "1. Requisition", label: "Site Indents", count: indents.length, icon: ClipboardList },
                { id: "procurement", sub: "pos", step: "2. Procurement", label: "Purchase Orders", count: purchaseOrders.length, icon: ShoppingCart },
                { id: "receiving", sub: "grn", step: "3. Receiving", label: "Goods Receipt (GRN)", count: grnRecords.length, icon: PackageCheck },
                { id: "store", sub: "inventory", step: "4. Store", label: "Stock Inventory", count: materials.length, icon: Warehouse },
                { id: "store", sub: "issues", step: "5. Issue", label: "Site Issues", count: materialIssues.length, icon: PackageMinus },
                { id: "reports", sub: "reports", step: "6. Reconcile", label: "Audit & Ledger", count: "Synced", icon: Receipt },
              ].map((stage) => {
                const Icon = stage.icon;
                return (
                  <button
                    key={stage.label}
                    onClick={() => {
                      setWorkspaceTab(stage.id);
                      if (stage.id === "procurement") setProcurementSubTab(stage.sub as "indents" | "pos" | "vendors" | "master");
                      if (stage.id === "store") setStoreSubTab(stage.sub as "inventory" | "issues" | "returns" | "transfers");
                      if (stage.id === "reports") setReportsSubTab("reconciliation");
                    }}
                    className="flex flex-col items-start gap-1 rounded-lg border border-border/80 bg-background/60 p-2.5 text-left transition-all hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{stage.step}</span>
                      <Icon className="size-3.5 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground text-xs">{stage.label}</p>
                    <span className="text-[10px] text-muted-foreground font-mono font-medium">{stage.count} Records</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Summary Queues */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Critical Low Stock Items */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-rose-500" /> Critical Stock Attention ({lowStockCount})
                </h3>
                <Button variant="ghost" size="sm" onClick={() => { setWorkspaceTab("store"); setStoreSubTab("inventory"); }} className="text-xs h-7">
                  View All
                </Button>
              </div>
              <div className="space-y-2">
                {lowStockCount === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">No low stock alerts recorded.</p>
                ) : (
                  materials
                    .filter((m) => m.currentStock <= m.reorderLevel)
                    .slice(0, 4)
                    .map((mat) => (
                      <div key={mat.id} className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5 text-xs">
                        <div>
                          <p className="font-semibold text-foreground">{mat.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Stock: <strong className="text-rose-600">{mat.currentStock} {mat.unit}</strong> (Reorder: {mat.reorderLevel} {mat.unit})
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => {
                            setIndentMaterialId(mat.id);
                            setNewIndentOpen(true);
                          }}
                        >
                          + Indent
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Pending Indents Awaiting PO */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ClipboardList className="size-3.5 text-primary" /> Open Site Indents ({pendingIndentsCount})
                </h3>
                <Button variant="ghost" size="sm" onClick={() => { setWorkspaceTab("procurement"); setProcurementSubTab("indents"); }} className="text-xs h-7">
                  View All
                </Button>
              </div>
              <div className="space-y-2">
                {pendingIndentsCount === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">No open site indents awaiting purchase order.</p>
                ) : (
                  indents.slice(0, 4).map((ind) => (
                    <div key={ind.id} className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{ind.indentNumber} · {ind.projectName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {ind.items.map((i) => `${i.quantity} ${i.unit} ${i.materialName}`).join(", ")}
                        </p>
                      </div>
                      <WorkflowBadge status={ind.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. PROCUREMENT DOMAIN (Secondary Navigation) */}
        <TabsContent value="procurement" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-muted/30">
              <button
                onClick={() => setProcurementSubTab("indents")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  procurementSubTab === "indents" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Indents ({indents.length})
              </button>
              <button
                onClick={() => setProcurementSubTab("pos")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  procurementSubTab === "pos" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Purchase Orders ({purchaseOrders.length})
              </button>
              <button
                onClick={() => setProcurementSubTab("vendors")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  procurementSubTab === "vendors" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Vendors ({vendors.length})
              </button>
              <button
                onClick={() => setProcurementSubTab("master")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  procurementSubTab === "master" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Material Catalog ({materials.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search procurement records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 w-60 text-xs"
              />
            </div>
          </div>

          {/* Sub-tab 2A: Indents */}
          {procurementSubTab === "indents" && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              {indents.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={ClipboardList}
                    title="No material indents yet"
                    description="Site material requisitions will appear here once submitted by site engineers."
                    action={
                      canIndent ? (
                        <Button size="sm" onClick={() => setNewIndentOpen(true)} className="gap-1.5">
                          <Plus className="size-4" /> Create Indent
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Indent No</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Requested Items</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Required Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {indents.map((ind) => (
                        <tr key={ind.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{ind.indentNumber}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{ind.projectName}</td>
                          <td className="px-4 py-3">
                            {ind.items.map((it, idx) => (
                              <div key={idx} className="font-semibold text-foreground">
                                {it.materialName} <span className="text-muted-foreground">({it.quantity} {it.unit})</span>
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                ind.priority === "urgent" || ind.priority === "critical"
                                  ? "bg-rose-500/15 text-rose-600 border border-rose-500/25"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {ind.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{ind.requiredDate}</td>
                          <td className="px-4 py-3"><WorkflowBadge status={ind.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              onClick={() => notify(`Indent ${ind.indentNumber} approved and added to procurement queue.`)}
                            >
                              Approve Indent
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2B: Purchase Orders */}
          {procurementSubTab === "pos" && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              {purchaseOrders.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={ShoppingCart}
                    title="No purchase orders yet"
                    description="Purchase orders issued to suppliers will appear here."
                    action={
                      canPO ? (
                        <Button size="sm" onClick={() => setNewPoOpen(true)} className="gap-1.5">
                          <Plus className="size-4" /> Issue Purchase Order
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">PO Number</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Line Items</th>
                        <th className="px-4 py-3 font-mono">Grand Total</th>
                        <th className="px-4 py-3">Delivery Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{po.poNumber}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{po.projectName}</td>
                          <td className="px-4 py-3 font-semibold text-primary">{po.vendorName}</td>
                          <td className="px-4 py-3">
                            {po.items.map((i, idx) => (
                              <span key={idx} className="text-muted-foreground">{i.quantity} {i.unit} {i.materialName}</span>
                            ))}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{formatCurrency(po.grandTotal)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{po.expectedDelivery}</td>
                          <td className="px-4 py-3"><WorkflowBadge status={po.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              onClick={() => {
                                setGrnProjectId(po.projectId);
                                setGrnVendorName(po.vendorName);
                                setNewGrnOpen(true);
                              }}
                            >
                              Receive GRN
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2C: Vendors */}
          {procurementSubTab === "vendors" && (
            <div>
              {vendors.length === 0 ? (
                <div className="rounded-xl border border-border/80 bg-card p-6">
                  <EmptyState
                    icon={Building2}
                    title="No vendors registered"
                    description="Vendor directory and approved supplier records will appear here."
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {vendors.map((v) => (
                    <div key={v.id} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{v.name}</h4>
                          <p className="text-[11px] text-muted-foreground font-medium">{v.category} · Rating: {v.rating}★</p>
                        </div>
                        <span className="rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold">
                          {v.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Contact: <strong className="text-foreground">{v.contactPerson}</strong></p>
                        <p>Phone: {v.phone}</p>
                        <p>GSTIN: <span className="font-mono">{v.gstin}</span></p>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase block font-bold">Active POs</span>
                          <span className="font-bold text-foreground">{v.activePOsCount}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase block font-bold">Total Billed</span>
                          <span className="font-mono font-bold text-foreground">{formatCurrency(v.totalBilled)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2D: Material Master */}
          {procurementSubTab === "master" && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              {filteredMaterials.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Boxes}
                    title="No materials in catalog"
                    description="Standard material items, SKUs, and rate masters will appear here."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Material Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Standard Unit</th>
                        <th className="px-4 py-3 font-mono">Unit Rate</th>
                        <th className="px-4 py-3">Primary Warehouse</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredMaterials.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{m.code}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.category}</td>
                          <td className="px-4 py-3 font-mono">{m.unit}</td>
                          <td className="px-4 py-3 font-mono font-bold">{formatCurrency(m.unitRate)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.primaryWarehouse}</td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => notify(`Specification details for ${m.name}`)}>
                              Specs
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* 3. RECEIVING DOMAIN */}
        <TabsContent value="receiving" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-foreground">Goods Receipt Notes (GRN) & Gate Inspection</h3>
              <p className="text-xs text-muted-foreground">Physical quantity verification, delivery challan inspection, and quarantine logging.</p>
            </div>
            {canGRN && (
              <Button size="sm" onClick={() => setNewGrnOpen(true)} className="gap-1.5 text-xs">
                <Plus className="size-3.5" /> Record GRN
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            {grnRecords.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={PackageCheck}
                  title="No goods receipt notes (GRN) yet"
                  description="Gate inspection and verified delivery records will appear here once goods are received on site."
                  action={
                    canGRN ? (
                      <Button size="sm" onClick={() => setNewGrnOpen(true)} className="gap-1.5">
                        <Plus className="size-4" /> Record GRN
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">GRN No</th>
                      <th className="px-4 py-3">PO Reference</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Vendor / Supplier</th>
                      <th className="px-4 py-3">Challan / Invoice</th>
                      <th className="px-4 py-3">Received / Accepted</th>
                      <th className="px-4 py-3">Gate Inspector</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {grnRecords.map((grn) => (
                      <tr key={grn.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">{grn.grnNumber}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{grn.poNumber}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{grn.projectName}</td>
                        <td className="px-4 py-3 font-semibold text-primary">{grn.vendorName}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{grn.challanNumber}</td>
                        <td className="px-4 py-3">
                          {grn.items.map((it, idx) => (
                            <div key={idx} className="font-semibold text-foreground">
                              {it.materialName}: <span className="text-emerald-600">{it.acceptedQty} Acc</span>
                              {it.rejectedQty > 0 && <span className="text-rose-600 font-bold ml-1">({it.rejectedQty} Rej)</span>}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{grn.receivedBy}</td>
                        <td className="px-4 py-3"><WorkflowBadge status={grn.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 4. STORE & INVENTORY DOMAIN */}
        <TabsContent value="store" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-muted/30">
              <button
                onClick={() => setStoreSubTab("inventory")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  storeSubTab === "inventory" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Stock Inventory ({materials.length})
              </button>
              <button
                onClick={() => setStoreSubTab("issues")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  storeSubTab === "issues" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Material Issues ({materialIssues.length})
              </button>
              <button
                onClick={() => setStoreSubTab("returns")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  storeSubTab === "returns" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Returns ({materialReturns.length})
              </button>
              <button
                onClick={() => setStoreSubTab("transfers")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  storeSubTab === "transfers" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Transfers ({stockTransfers.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search store inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 w-60 text-xs"
              />
            </div>
          </div>

          {/* Sub-tab 4A: Inventory */}
          {storeSubTab === "inventory" && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              {filteredMaterials.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Warehouse}
                    title="No inventory records yet"
                    description="Inventory balances will appear after the first approved receipt."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Material Name</th>
                        <th className="px-4 py-3">Warehouse</th>
                        <th className="px-4 py-3 font-mono">Current Stock</th>
                        <th className="px-4 py-3 font-mono">Reorder Level</th>
                        <th className="px-4 py-3 font-mono">Stock Valuation</th>
                        <th className="px-4 py-3">Health</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredMaterials.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{m.code}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.primaryWarehouse}</td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{m.currentStock.toLocaleString()} {m.unit}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{m.reorderLevel.toLocaleString()} {m.unit}</td>
                          <td className="px-4 py-3 font-mono font-bold text-primary">{formatCurrency(m.totalStockValue)}</td>
                          <td className="px-4 py-3"><HealthBadge health={m.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => {
                                  setIssueMaterialId(m.id);
                                  setNewIssueOpen(true);
                                }}
                              >
                                Issue
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 4B: Material Issues */}
          {storeSubTab === "issues" && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              {materialIssues.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={PackageMinus}
                    title="No material issues recorded"
                    description="Site material issues and work package consumption will appear here."
                    action={
                      canIssue ? (
                        <Button size="sm" onClick={() => setNewIssueOpen(true)} className="gap-1.5">
                          <Plus className="size-4" /> Issue Material
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Issue No</th>
                        <th className="px-4 py-3">Requisition Ref</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">WBS Activity</th>
                        <th className="px-4 py-3">Issued To</th>
                        <th className="px-4 py-3">Material & Quantity</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Issued By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {materialIssues.map((iss) => (
                        <tr key={iss.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{iss.issueNumber}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{iss.requisitionNo}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{iss.projectName}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{iss.activityName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{iss.issuedTo}</td>
                          <td className="px-4 py-3">
                            {iss.items.map((i, idx) => (
                              <span key={idx} className="font-semibold text-foreground">{i.quantity} {i.unit} {i.materialName}</span>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{iss.date}</td>
                          <td className="px-4 py-3 text-muted-foreground">{iss.issuedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 4C: Returns */}
          {storeSubTab === "returns" && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              {materialReturns.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={PackageCheck}
                    title="No material returns recorded"
                    description="Excess, damaged, or decommissioned material returns from site will appear here."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Return No</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Returned By</th>
                        <th className="px-4 py-3">Items & Condition</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {materialReturns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{ret.returnNumber}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{ret.projectName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{ret.returnedBy}</td>
                          <td className="px-4 py-3">
                            {ret.items.map((i, idx) => (
                              <span key={idx} className="font-semibold text-foreground">
                                {i.quantity} {i.unit} {i.materialName} ({i.condition})
                              </span>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{ret.reason}</td>
                          <td className="px-4 py-3 text-muted-foreground">{ret.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 4D: Transfers */}
          {storeSubTab === "transfers" && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              {stockTransfers.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={ArrowLeftRight}
                    title="No stock transfers recorded"
                    description="Inter-warehouse and site-to-site stock transfers will appear here."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Transfer No</th>
                        <th className="px-4 py-3">Source Warehouse</th>
                        <th className="px-4 py-3">Destination</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Dispatch Date</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {stockTransfers.map((st) => (
                        <tr key={st.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{st.transferNumber}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{st.sourceWarehouse}</td>
                          <td className="px-4 py-3 font-medium text-primary">{st.destinationWarehouse}</td>
                          <td className="px-4 py-3">
                            {st.items.map((i, idx) => (
                              <span key={idx} className="font-semibold text-foreground">{i.quantity} {i.unit} {i.materialName}</span>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{st.dispatchDate}</td>
                          <td className="px-4 py-3"><WorkflowBadge status={st.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* 5. REPORTS & INTELLIGENCE DOMAIN */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto border-b pb-3">
            {(
              [
                { id: "stock", label: "Stock Valuation" },
                { id: "reconciliation", label: "Material Reconciliation" },
                { id: "dead_stock", label: "Dead Stock (>90d)" },
                { id: "reorder", label: "Reorder Planning" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setReportsSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  reportsSubTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {reportsSubTab === "stock" && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-foreground">Stock Valuation & Ageing</h4>
                <p className="text-xs text-muted-foreground">Total stock worth {formatCurrency(totalStockValue)} across {materials.length} active SKUs.</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => notify("Stock Valuation report downloaded.")}>
                  Download XLSX
                </Button>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-foreground">Material Consumption vs WBS</h4>
                <p className="text-xs text-muted-foreground">Actual physical quantity consumed vs planned estimation rates for active projects.</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => notify("Material Consumption report downloaded.")}>
                  Download PDF
                </Button>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-foreground">Vendor Lead Time & Quality</h4>
                <p className="text-xs text-muted-foreground">Average delivery turnaround and GRN inspection rejection rates per supplier.</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => notify("Vendor scorecard downloaded.")}>
                  Download Scorecard
                </Button>
              </div>
            </div>
          )}

          {reportsSubTab === "reconciliation" && (
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-bold text-sm">Theoretical Standard Consumption vs Actual Store Issues</h4>
                  <p className="text-xs text-muted-foreground">
                    Variance tracking against BOQ theoretical norms and leak/wastage detection.
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Threshold: ±5.0%</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Material Item</th>
                      <th className="px-4 py-3">Standard Norm Qty</th>
                      <th className="px-4 py-3">Actual Issued Qty</th>
                      <th className="px-4 py-3">Variance Qty</th>
                      <th className="px-4 py-3">Variance %</th>
                      <th className="px-4 py-3">Wastage / Leakage Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {materials.map((m) => {
                      const issued = materialIssues.reduce((acc, iss) => {
                        const it = iss.items.find((i) => i.materialId === m.id);
                        return acc + (it ? it.quantity : 0);
                      }, 0);
                      const standard = Math.round(issued * 0.95);
                      const varianceData = calculateMaterialVariance({
                        standardConsumption: standard,
                        actualIssued: issued,
                        unitRate: m.unitRate,
                      });

                      return (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-bold text-foreground">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground">{m.category}</p>
                          </td>
                          <td className="px-4 py-3 font-mono">{standard} {m.unit}</td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{issued} {m.unit}</td>
                          <td className="px-4 py-3 font-mono text-foreground">
                            {varianceData.varianceQuantity > 0 ? `+${varianceData.varianceQuantity}` : varianceData.varianceQuantity} {m.unit}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            <span className={varianceData.isLeakageWarning ? "text-danger" : "text-success"}>
                              {varianceData.variancePercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {varianceData.isLeakageWarning ? (
                              <span className="rounded bg-danger/15 text-danger px-2 py-0.5 text-[10px] font-bold">
                                Leakage Alert ({formatCurrency(varianceData.financialImpact)})
                              </span>
                            ) : (
                              <span className="rounded bg-success/15 text-success px-2 py-0.5 text-[10px] font-bold">
                                Normal Tolerance
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportsSubTab === "dead_stock" && (
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-bold text-sm">Dead & Non-Moving Stock Analysis (&gt;90 Days)</h4>
                  <p className="text-xs text-muted-foreground">
                    Idle materials tying up working capital across central and site warehouses.
                  </p>
                </div>
                <span className="rounded bg-muted px-2 py-1 text-xs font-semibold">Idle Age Threshold: 90 Days</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Item Code & Name</th>
                      <th className="px-4 py-3">Warehouse Location</th>
                      <th className="px-4 py-3">Idle Quantity</th>
                      <th className="px-4 py-3">Tied-Up Valuation</th>
                      <th className="px-4 py-3">Last Movement Date</th>
                      <th className="px-4 py-3">Suggested Disposal Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {materials.filter((_, idx) => idx % 2 === 0).map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{m.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{m.code}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.primaryWarehouse}</td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">{Math.round(m.currentStock * 0.3)} {m.unit}</td>
                        <td className="px-4 py-3 font-mono font-bold text-warning">{formatCurrency(m.totalStockValue * 0.3)}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">2025-11-15 (115 days ago)</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                            Inter-site transfer or supplier buyback
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportsSubTab === "reorder" && (
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-bold text-sm">Procurement Reorder Planning & Buffer Stock</h4>
                  <p className="text-xs text-muted-foreground">
                    Automated replenishment triggers based on lead-time and safety thresholds.
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">No automatic purchase commitments</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Current Stock</th>
                      <th className="px-4 py-3">Reorder Threshold</th>
                      <th className="px-4 py-3">Safety Stock</th>
                      <th className="px-4 py-3">Suggested Replenish Qty</th>
                      <th className="px-4 py-3">Lead Time</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {materials.map((m) => {
                      const needed = Math.max(0, m.reorderLevel * 2 - m.currentStock);
                      return (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-bold text-foreground">{m.name}</td>
                          <td className="px-4 py-3 font-mono font-bold">{m.currentStock} {m.unit}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{m.reorderLevel} {m.unit}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{m.safetyStock} {m.unit}</td>
                          <td className="px-4 py-3 font-mono font-bold text-primary">{needed} {m.unit}</td>
                          <td className="px-4 py-3 font-mono">4-7 Days</td>
                          <td className="px-4 py-3">
                            {needed > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setIndentMaterialId(m.id);
                                  setIndentQty(String(needed));
                                  setNewIndentOpen(true);
                                }}
                              >
                                Create Indent
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: New Indent */}
      <Dialog open={newIndentOpen} onOpenChange={setNewIndentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Create Material Indent</DialogTitle>
            <DialogDescription className="text-xs">Submit a site material requisition for approval and PO issuance.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateIndent} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="indent-proj" label="Project Site" required>
                <select
                  id="indent-proj"
                  value={indentProjectId}
                  onChange={(e) => setIndentProjectId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField id="indent-mat" label="Material Item" required>
                <select
                  id="indent-mat"
                  value={indentMaterialId}
                  onChange={(e) => setIndentMaterialId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="indent-qty" label="Requisition Quantity" required>
                <Input
                  id="indent-qty"
                  type="number"
                  value={indentQty}
                  onChange={(e) => setIndentQty(e.target.value)}
                  placeholder="e.g. 50"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>

              <FormField id="indent-prio" label="Urgency / Priority" required>
                <select
                  id="indent-prio"
                  value={indentPriority}
                  onChange={(e) => setIndentPriority(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="indent-purpose" label="Site Purpose / Activity Remarks" optional help="Explain target location or structural component requiring this material.">
                <Input
                  id="indent-purpose"
                  placeholder="e.g. Pier 42 superstructure concreting"
                  value={indentPurpose}
                  onChange={(e) => setIndentPurpose(e.target.value)}
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setNewIndentOpen(false)}
              submitLabel="Submit Indent"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create PO */}
      <Dialog open={newPoOpen} onOpenChange={setNewPoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Issue Purchase Order (PO)</DialogTitle>
            <DialogDescription className="text-xs">Generate and issue a formal purchase order to a registered vendor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePO} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="po-proj" label="Project Site" required>
                <select
                  id="po-proj"
                  value={poProjectId}
                  onChange={(e) => setPoProjectId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField id="po-ven" label="Vendor / Supplier" required>
                <select
                  id="po-ven"
                  value={poVendorId}
                  onChange={(e) => setPoVendorId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                  ))}
                </select>
              </FormField>

              <FormField id="po-mat" label="Material Item" required>
                <select
                  id="po-mat"
                  value={poMaterialId}
                  onChange={(e) => setPoMaterialId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} · {formatCurrency(m.unitRate)}/{m.unit}</option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="po-qty" label="Order Quantity" required>
                <Input
                  id="po-qty"
                  type="number"
                  value={poQty}
                  onChange={(e) => setPoQty(e.target.value)}
                  placeholder="e.g. 100"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>

              <FormField id="po-date" label="Expected Delivery Date" required>
                <Input
                  id="po-date"
                  type="date"
                  value={poDeliveryDate}
                  onChange={(e) => setPoDeliveryDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="po-gst" label="Statutory GST Rate (%) — Configurable" help="Standard 18% for procurement, 28% for cement/bitumen, 5% for specified materials" optional>
                <Input
                  id="po-gst"
                  type="number"
                  value={poGstPercent}
                  onChange={(e) => setPoGstPercent(e.target.value)}
                  className="h-9 text-xs font-mono"
                  placeholder="18"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setNewPoOpen(false)}
              submitLabel="Issue Purchase Order"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Record GRN */}
      <Dialog open={newGrnOpen} onOpenChange={setNewGrnOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Goods Receipt Note (GRN) Verification</DialogTitle>
            <DialogDescription className="text-xs">Record physical gate arrival, inspect quality, and accept material into stock.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordGrn} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="grn-proj" label="Project Site" required>
                <select
                  id="grn-proj"
                  value={grnProjectId}
                  onChange={(e) => setGrnProjectId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField id="grn-wh" label="Store / Warehouse" required>
                <Input
                  id="grn-wh"
                  value={grnWarehouse}
                  onChange={(e) => setGrnWarehouse(e.target.value)}
                  placeholder="e.g. Site Store B-2"
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="grn-ven" label="Vendor Name" required>
                <Input
                  id="grn-ven"
                  value={grnVendorName}
                  onChange={(e) => setGrnVendorName(e.target.value)}
                  placeholder="e.g. Kaveri Aggregates Pvt Ltd"
                  required
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField id="grn-dc" label="Delivery Challan No" required>
                <Input
                  id="grn-dc"
                  value={grnChallanNo}
                  onChange={(e) => setGrnChallanNo(e.target.value)}
                  placeholder="e.g. DC-2026-904"
                  required
                  className="h-9 font-mono text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="grn-mat" label="Received Material Item" required>
                <select
                  id="grn-mat"
                  value={grnMaterialId}
                  onChange={(e) => setGrnMaterialId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={3}>
              <FormField id="grn-rec" label="Received Qty" required>
                <Input
                  id="grn-rec"
                  type="number"
                  value={grnRecQty}
                  onChange={(e) => setGrnRecQty(e.target.value)}
                  className="h-9 text-xs font-mono font-medium"
                />
              </FormField>

              <FormField id="grn-acc" label="Accepted Qty" required>
                <Input
                  id="grn-acc"
                  type="number"
                  value={grnAccQty}
                  onChange={(e) => setGrnAccQty(e.target.value)}
                  className="h-9 text-xs text-emerald-600 font-mono font-bold"
                />
              </FormField>

              <FormField id="grn-rej" label="Rejected Qty" optional>
                <Input
                  id="grn-rej"
                  type="number"
                  value={grnRejQty}
                  onChange={(e) => setGrnRejQty(e.target.value)}
                  className="h-9 text-xs text-rose-600 font-mono font-bold"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setNewGrnOpen(false)}
              submitLabel="Verify & Accept GRN"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Issue Material */}
      <Dialog open={newIssueOpen} onOpenChange={setNewIssueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Issue Material to Site Activity</DialogTitle>
            <DialogDescription className="text-xs">Log material release from store to a specific WBS activity and gang.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueMaterial} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="iss-proj" label="Project Site" required>
                <select
                  id="iss-proj"
                  value={issueProjectId}
                  onChange={(e) => setIssueProjectId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField id="iss-act" label="WBS Activity" required>
                <select
                  id="iss-act"
                  value={issueActivityId}
                  onChange={(e) => setIssueActivityId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {store.wbsActivities.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField id="iss-mat" label="Material Item" required>
                <select
                  id="iss-mat"
                  value={issueMaterialId}
                  onChange={(e) => setIssueMaterialId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} (Stock: {m.currentStock} {m.unit})</option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="iss-qty" label="Issue Quantity" required>
                <Input
                  id="iss-qty"
                  type="number"
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                  placeholder="e.g. 20"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>

              <FormField id="iss-to" label="Issued To (Gang / Subcontractor)" required>
                <Input
                  id="iss-to"
                  value={issueTo}
                  onChange={(e) => setIssueTo(e.target.value)}
                  placeholder="e.g. Gang #3 - Shuttering"
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setNewIssueOpen(false)}
              submitLabel="Issue from Store"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Reusable Excel Import Wizard Modal */}
      <ExcelImportWizard
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        datasetType="materials"
      />
    </AppShell>
  );
}
