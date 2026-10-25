import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/auth";
import { hasPermission } from "@/authorization/permissions";
import { CustomerRole } from "@/authorization/roles";
import { AppShell, useNotify } from "@/components/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
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
  calculateRaBillDeductions,
  calculateClientBill,
  calculateProjectProfitability,
  calculateEarnedValueEAC,
} from "@/lib/calculations";
import { downloadCsv } from "@/lib/export-utils";
import { formatCurrency, mockStore, useMockStore, useContextualData } from "@/mock";
import type {
  AdvanceRecord,
  ClientBillingRecord,
  ContractorRaBill,
  ExpenseCategory,
  ExpenseRecord,
  FinalBillRecord,
  PaymentRecord,
} from "@/mock/types";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HandCoins,
  IndianRupee,
  Layers,
  PieChart,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/finance/")({
  head: () => ({
    meta: [
      { title: "Finance & Commercial Management | DEZOBUILD" },
      {
        name: "description",
        content:
          "Construction expenses, contractor RA bills, client claims, final bill closeout, cash flow, and project P&L in DEZOBUILD.",
      },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { user } = useCurrentUser();
  const role = user?.role || CustomerRole.VIEWER;

  const store = useMockStore();
  const contextual = useContextualData();
  const notify = useNotify();

  // Top-level Section Navigation: overview | vouchers | cash_flow | pnl_eac | directory | reports
  const [activeSection, setActiveSection] = useState<
    "overview" | "vouchers" | "cash_flow" | "pnl_eac" | "directory" | "reports"
  >("overview");

  // Sub-tab Navigation
  const [voucherSubTab, setVoucherSubTab] = useState<
    "expenses" | "payments" | "advances" | "contractor_ra" | "client_billing" | "final_bills"
  >("expenses");
  const [cashFlowWindow, setCashFlowWindow] = useState<"30" | "60" | "90">("30");
  const [agingTab, setAgingTab] = useState<"payables" | "receivables">("payables");
  const [directorySubTab, setDirectorySubTab] = useState<"vendors" | "contractors">("vendors");

  const [search, setSearch] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all");

  const canAddExpense = hasPermission(role, "commercial.expense");
  const canAddPayment =
    role === CustomerRole.ACCOUNTANT ||
    role === CustomerRole.COMPANY_OWNER ||
    role === CustomerRole.COMPANY_ADMIN;
  const isPM = role === CustomerRole.PROJECT_MANAGER;

  const expenses = contextual.expenses;
  const projects = contextual.projects;
  const payments = store.payments;
  const advances = store.advances;
  const contractorRaBills = store.contractorRaBills;
  const clientBillings = store.clientBillings;
  const finalBills = store.finalBills;
  const purchaseOrders = contextual.purchaseOrders;
  const vendors = store.vendors;
  const contractors = store.contractors;

  // Dialog States
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [addAdvanceOpen, setAddAdvanceOpen] = useState(false);
  const [addRaBillOpen, setAddRaBillOpen] = useState(false);
  const [addClientBillOpen, setAddClientBillOpen] = useState(false);
  const [addFinalBillOpen, setAddFinalBillOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  // Form States - Expense
  const [expProjId, setExpProjId] = useState(projects[0]?.id || "");
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("Fuel");
  const [expAmount, setExpAmount] = useState("");
  const [expVendor, setExpVendor] = useState("");
  const [expMode, setExpMode] = useState<ExpenseRecord["paymentMode"]>("Bank Transfer");
  const [expNotes, setExpNotes] = useState("");

  // Form States - Payment
  const [payProjId, setPayProjId] = useState(projects[0]?.id || "");
  const [payeeName, setPayeeName] = useState("");
  const [payeeType, setPayeeType] = useState<PaymentRecord["payeeType"]>("Vendor");
  const [payAmount, setPayAmount] = useState("");
  const [payDueDate, setPayDueDate] = useState("");
  const [payRef, setPayRef] = useState("");

  // Form States - Advance
  const [advProjId, setAdvProjId] = useState(projects[0]?.id || "");
  const [advParty, setAdvParty] = useState("");
  const [advType, setAdvType] = useState<AdvanceRecord["partyType"]>("Subcontractor");
  const [advAmount, setAdvAmount] = useState("");
  const [advTerms, setAdvTerms] = useState("");

  // Form States - Contractor RA Bill
  const [raProjId, setRaProjId] = useState(projects[0]?.id || "");
  const [raContractorName, setRaContractorName] = useState(contractors[0]?.name || "Apex Formwork & Concreting");
  const [raPeriod, setRaPeriod] = useState("March 2026 / RA Bill #04");
  const [raGross, setRaGross] = useState("1250000");
  const [raRetentionPct, setRaRetentionPct] = useState("5");
  const [raAdvanceRecovery, setRaAdvanceRecovery] = useState("50000");
  const [raTdsPct, setRaTdsPct] = useState("2");
  const [raLabourCessPct, setRaLabourCessPct] = useState("1");
  const [raOtherDeductions, setRaOtherDeductions] = useState("10000");
  const [raMeasurementRef, setRaMeasurementRef] = useState("MB-2026-0104 · Level 14 Slab");

  // Form States - Client Billing
  const [clProjId, setClProjId] = useState(projects[0]?.id || "");
  const [clPeriod, setClPeriod] = useState("March 2026 / Client RA Claim #06");
  const [clCumulative, setClCumulative] = useState("45000000");
  const [clPrevCertified, setClPrevCertified] = useState("38000000");
  const [clGstPercent, setClGstPercent] = useState("18");

  // Form States - Final Bill
  const [fbProjId, setFbProjId] = useState(projects[0]?.id || "");
  const [fbContractorName, setFbContractorName] = useState("Apex Formwork & Concreting");
  const [fbContractVal, setFbContractVal] = useState("25000000");
  const [fbGrossTotal, setFbGrossTotal] = useState("24800000");
  const [fbRetentionHeld, setFbRetentionHeld] = useState("1240000");
  const [fbRetentionReleased, setFbRetentionReleased] = useState("1240000");
  const [fbRecoveries, setFbRecoveries] = useState("150000");
  const [fbNoClaim, setFbNoClaim] = useState(true);

  // Financial KPIs
  const totalApprovedBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalActualCost = projects.reduce((acc, p) => acc + p.actualCost, 0);
  const totalCommitted = purchaseOrders
    .filter((p) => p.status === "issued" || p.status === "partially_received")
    .reduce((acc, p) => acc + p.grandTotal, 0);
  const totalPendingPayments = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((acc, p) => acc + p.amount, 0);

  const budgetUtilisedPercent =
    totalApprovedBudget > 0 ? ((totalActualCost / totalApprovedBudget) * 100).toFixed(1) : "0.0";
  const committedPercent =
    totalApprovedBudget > 0 ? ((totalCommitted / totalApprovedBudget) * 100).toFixed(1) : "0.0";

  // RA Bill Calculation Preview
  const raCalculation = calculateRaBillDeductions({
    grossAmount: parseFloat(raGross) || 0,
    retentionPercent: parseFloat(raRetentionPct) || 0,
    advanceRecoveryAmount: parseFloat(raAdvanceRecovery) || 0,
    tdsPercent: parseFloat(raTdsPct) || 0,
    labourCessPercent: parseFloat(raLabourCessPct) || 0,
    otherDeductions: parseFloat(raOtherDeductions) || 0,
  });

  // Client Claim Calculation Preview
  const clientBillCalculation = calculateClientBill({
    cumulativeWorkValue: parseFloat(clCumulative) || 0,
    previousCertifiedValue: parseFloat(clPrevCertified) || 0,
    retentionPercent: 5,
    gstPercent: parseFloat(clGstPercent) || 0,
    otherDeductions: 0,
  });

  // Handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === expProjId) ?? projects[0];
    if (!proj) return;
    const amount = parseFloat(expAmount) || 0;

    mockStore.addExpense({
      projectId: proj.id,
      projectName: proj.name,
      category: expCategory,
      amount,
      vendorContractor: expVendor,
      paidBy: user?.name || "Finance Officer",
      paymentMode: expMode,
      date: new Date().toISOString().slice(0, 10),
      receiptAttached: true,
      receiptName: "voucher_receipt.pdf",
      status: "approved",
      notes: expNotes || "Recorded via Finance module",
    });

    notify(`Expense voucher recorded for ${formatCurrency(amount)}`);
    setAddExpenseOpen(false);
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === payProjId) ?? projects[0];
    if (!proj) return;
    const amount = parseFloat(payAmount) || 0;

    mockStore.addPayment({
      projectId: proj.id,
      projectName: proj.name,
      payeeName,
      payeeType,
      invoiceRef: payRef || `INV-${Date.now().toString().slice(-4)}`,
      amount,
      dueDate: payDueDate || new Date().toISOString().slice(0, 10),
      status: "pending",
      paymentMethod: "Bank Transfer",
    });

    notify(`Payment voucher of ${formatCurrency(amount)} registered for ${payeeName}`);
    setAddPaymentOpen(false);
  };

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === advProjId) ?? projects[0];
    if (!proj) return;
    const amount = parseFloat(advAmount) || 0;

    const newAdv: AdvanceRecord = {
      id: `adv-${Date.now().toString().slice(-4)}`,
      advanceNumber: `ADV-2026-${Date.now().toString().slice(-4)}`,
      projectId: proj.id,
      projectName: proj.name,
      partyName: advParty,
      partyType: advType,
      amount,
      recoveredAmount: 0,
      outstandingBalance: amount,
      disbursementDate: new Date().toISOString().slice(0, 10),
      recoveryTerms: advTerms || "Recoverable in 4 monthly RA bill deductions",
      status: "active",
    };

    notify(`Contractor advance of ${formatCurrency(amount)} sanctioned for ${advParty}`);
    setAddAdvanceOpen(false);
  };

  const handleAddRaBill = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === raProjId) ?? projects[0];
    if (!proj) return;

    mockStore.addContractorRaBill({
      projectId: proj.id,
      projectName: proj.name,
      contractorId: "cnt-01",
      contractorName: raContractorName,
      billingPeriod: raPeriod,
      measurementRef: raMeasurementRef,
      grossBill: raCalculation.grossAmount,
      retentionPercent: parseFloat(raRetentionPct) || 0,
      retentionAmount: raCalculation.retentionAmount,
      advanceRecovery: raCalculation.advanceRecoveryAmount,
      tdsPercent: parseFloat(raTdsPct) || 0,
      tdsAmount: raCalculation.tdsAmount,
      labourCessPercent: parseFloat(raLabourCessPct) || 0,
      labourCessAmount: raCalculation.labourCessAmount,
      otherDeductions: raCalculation.otherDeductions,
      netPayable: raCalculation.netPayable,
      status: "submitted",
      submittedDate: new Date().toISOString().slice(0, 10),
    });

    notify(
      `Contractor RA Bill created for ${raContractorName}: Net Payable ${formatCurrency(raCalculation.netPayable)}`,
    );
    setAddRaBillOpen(false);
  };

  const handleAddClientBill = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === clProjId) ?? projects[0];
    if (!proj) return;

    mockStore.addClientBilling({
      projectId: proj.id,
      projectName: proj.name,
      claimPeriod: clPeriod,
      cumulativeWork: parseFloat(clCumulative) || 0,
      previousCertified: parseFloat(clPrevCertified) || 0,
      currentClaim: clientBillCalculation.currentWorkValue,
      grossClaim: clientBillCalculation.taxableClaim,
      gstPercent: parseFloat(clGstPercent) || 0,
      gstAmount: clientBillCalculation.gstAmount,
      netClaim: clientBillCalculation.netClaim,
      status: "submitted",
      submittedDate: new Date().toISOString().slice(0, 10),
    });

    notify(`Client RA Claim filed for ${proj.name}: Net Claim ${formatCurrency(clientBillCalculation.netClaim)}`);
    setAddClientBillOpen(false);
  };

  const handleAddFinalBill = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === fbProjId) ?? projects[0];
    if (!proj) return;

    const gross = parseFloat(fbGrossTotal) || 0;
    const retReleased = parseFloat(fbRetentionReleased) || 0;
    const recoveries = parseFloat(fbRecoveries) || 0;
    const settlement = gross + retReleased - recoveries;

    mockStore.addFinalBill({
      projectId: proj.id,
      projectName: proj.name,
      contractorName: fbContractorName,
      contractValue: parseFloat(fbContractVal) || 0,
      grossTotalExecuted: gross,
      totalRetentionHeld: parseFloat(fbRetentionHeld) || 0,
      retentionReleased: retReleased,
      totalRecoveries: recoveries,
      otherDeductions: 0,
      netSettlement: settlement,
      noClaimCertificateReceived: fbNoClaim,
      status: "under_audit",
      closeoutDate: new Date().toISOString().slice(0, 10),
    });

    notify(`Final Bill Settlement lodged for ${fbContractorName}`);
    setAddFinalBillOpen(false);
  };

  return (
    <AppShell crumb="Finance & Commercial">
      {/* Page Header */}
      <PageHeader
        title="Finance & Commercial Command Center"
        subtitle="Construction accounting, contractor RA billing, client certification, 30/60/90 cash flow, and project P&L."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportWizardOpen(true)}
              className="gap-1.5 shadow-sm text-xs"
            >
              <Upload className="size-3.5" /> Import Vendors
            </Button>
            {canAddExpense && (
              <Button size="sm" onClick={() => setAddExpenseOpen(true)} className="gap-1.5 shadow-sm text-xs">
                <Receipt className="size-3.5" /> Record Expense
              </Button>
            )}
            {canAddPayment && (
              <Button size="sm" onClick={() => setAddPaymentOpen(true)} className="gap-1.5 shadow-sm text-xs">
                <WalletCards className="size-3.5" /> New Payment Voucher
              </Button>
            )}
            <Button size="sm" onClick={() => setAddRaBillOpen(true)} className="gap-1.5 shadow-sm text-xs">
              <Plus className="size-3.5" /> Contractor Progress Bill (RA)
            </Button>
          </div>
        }
      />

      {/* Level 1: Primary Metrics */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Portfolio Budget Exposure",
            value: formatCurrency(totalApprovedBudget),
            hint: `${projects.length} Active commercial sites`,
            icon: <IndianRupee className="size-4" />,
          },
          {
            label: "Actual Cost Incurred",
            value: formatCurrency(totalActualCost),
            hint: `${budgetUtilisedPercent}% Total budget consumed`,
            tone: "healthy",
            icon: <TrendingUp className="size-4" />,
          },
          {
            label: "Committed Purchase Orders",
            value: formatCurrency(totalCommitted),
            hint: `${committedPercent}% Encumbered commitments`,
            icon: <Layers className="size-4" />,
          },
          {
            label: "Pending Payables",
            value: formatCurrency(totalPendingPayments),
            hint: "Awaiting approval / payment",
            tone: totalPendingPayments > 0 ? "attention" : "healthy",
            icon: <Clock className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Navigation Sections */}
      <div className="space-y-6">
        <div className="flex border-b border-border/80 overflow-x-auto">
          {[
            { id: "overview", label: "Financial Overview", icon: PieChart },
            { id: "vouchers", label: `Bills & Progress Invoices (${expenses.length + payments.length + contractorRaBills.length})`, icon: Receipt },
            { id: "cash_flow", label: "Cash Flow & Overdue Bills", icon: Calendar },
            { id: "pnl_eac", label: "Project P&L & Cost Forecast", icon: TrendingUp },
            { id: "directory", label: `Vendor Directory (${vendors.length + contractors.length})`, icon: Users },
            { id: "reports", label: "Commercial Reports", icon: FileText },
          ].map((sec) => {
            const Icon = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" /> {sec.label}
              </button>
            );
          })}
        </div>

        {/* SECTION 1: OVERVIEW */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Portfolio Financial Exposure & Variance</h3>
                  <p className="text-xs text-muted-foreground">Approved Budget vs. Actual Incurred Cost vs. Encumbered POs</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><div className="size-2.5 rounded-sm bg-primary" /> Actual: {budgetUtilisedPercent}%</span>
                  <span className="flex items-center gap-1.5"><div className="size-2.5 rounded-sm bg-sky-500" /> Committed: {committedPercent}%</span>
                </div>
              </div>

              <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted/60 flex">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, parseFloat(budgetUtilisedPercent))}%` }} />
                <div className="h-full bg-sky-500" style={{ width: `${Math.min(100 - parseFloat(budgetUtilisedPercent), parseFloat(committedPercent))}%` }} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-4 shadow-panel space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Contractor RA Bills</span>
                <p className="text-2xl font-bold font-mono text-foreground">{contractorRaBills.length} Bills</p>
                <p className="text-xs text-muted-foreground">Structured deductions: Retention, Advance, TDS, Labour Cess</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-panel space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Client Billing Claims</span>
                <p className="text-2xl font-bold font-mono text-foreground">{clientBillings.length} Claims</p>
                <p className="text-xs text-muted-foreground">Cumulative certified work with 18% GST claims</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-panel space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Final Bill Closeouts</span>
                <p className="text-2xl font-bold font-mono text-foreground">{finalBills.length} Settlements</p>
                <p className="text-xs text-muted-foreground">Full retention release and no-claim closeouts</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: VOUCHERS & RA BILLING */}
        {activeSection === "vouchers" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(
                  [
                    { id: "expenses", label: `Expenses (${expenses.length})` },
                    { id: "payments", label: `Payments (${payments.length})` },
                    { id: "advances", label: `Advances (${advances.length})` },
                    { id: "contractor_ra", label: `Contractor Progress Bills (RA) (${contractorRaBills.length})` },
                    { id: "client_billing", label: `Client Claims (${clientBillings.length})` },
                    { id: "final_bills", label: `Final Bills (${finalBills.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setVoucherSubTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      voucherSubTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {voucherSubTab === "contractor_ra" && (
                  <Button size="sm" onClick={() => setAddRaBillOpen(true)} className="gap-1.5 shadow-sm text-xs">
                    <Plus className="size-3.5" /> New RA Bill
                  </Button>
                )}
                {voucherSubTab === "client_billing" && (
                  <Button size="sm" onClick={() => setAddClientBillOpen(true)} className="gap-1.5 shadow-sm text-xs">
                    <Plus className="size-3.5" /> New Client Claim
                  </Button>
                )}
                {voucherSubTab === "final_bills" && (
                  <Button size="sm" onClick={() => setAddFinalBillOpen(true)} className="gap-1.5 shadow-sm text-xs">
                    <Plus className="size-3.5" /> New Final Bill Closeout
                  </Button>
                )}
              </div>
            </div>

            {/* Subtab 2A: Contractor RA Bills */}
            {voucherSubTab === "contractor_ra" && (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Bill #</th>
                      <th className="px-4 py-3">Project & Contractor</th>
                      <th className="px-4 py-3">Billing Period</th>
                      <th className="px-4 py-3 font-mono">Gross Bill</th>
                      <th className="px-4 py-3 font-mono">Retention (5%)</th>
                      <th className="px-4 py-3 font-mono">Adv Recovery</th>
                      <th className="px-4 py-3 font-mono">TDS & Cess</th>
                      <th className="px-4 py-3 font-mono">Net Payable</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contractorRaBills.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                          No Contractor RA Bills registered yet. Click "New RA Bill" to create.
                        </td>
                      </tr>
                    ) : (
                      contractorRaBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{bill.billNumber}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-foreground">{bill.contractorName}</p>
                            <p className="text-[11px] text-muted-foreground">{bill.projectName}</p>
                          </td>
                          <td className="px-4 py-3">{bill.billingPeriod}</td>
                          <td className="px-4 py-3 font-mono font-bold">{formatCurrency(bill.grossBill)}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">-{formatCurrency(bill.retentionAmount)}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">-{formatCurrency(bill.advanceRecovery)}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">-{formatCurrency(bill.tdsAmount + bill.labourCessAmount)}</td>
                          <td className="px-4 py-3 font-mono font-bold text-success">{formatCurrency(bill.netPayable)}</td>
                          <td className="px-4 py-3"><WorkflowBadge status={bill.status} /></td>
                          <td className="px-4 py-3">
                            {bill.status === "submitted" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  mockStore.updateRaBillStatus(bill.id, "approved");
                                  notify(`RA Bill ${bill.billNumber} approved for payment.`);
                                }}
                              >
                                Approve
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

            {/* Subtab 2B: Client Billing */}
            {voucherSubTab === "client_billing" && (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Claim #</th>
                      <th className="px-4 py-3">Project Site</th>
                      <th className="px-4 py-3">Claim Period</th>
                      <th className="px-4 py-3 font-mono">Cumulative Value</th>
                      <th className="px-4 py-3 font-mono">Current Claim</th>
                      <th className="px-4 py-3 font-mono">GST (18%)</th>
                      <th className="px-4 py-3 font-mono">Net Receivable</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clientBillings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          No Client Billing claims filed yet. Click "New Client Claim" to begin.
                        </td>
                      </tr>
                    ) : (
                      clientBillings.map((cl) => (
                        <tr key={cl.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{cl.claimNumber}</td>
                          <td className="px-4 py-3 font-bold text-foreground">{cl.projectName}</td>
                          <td className="px-4 py-3">{cl.claimPeriod}</td>
                          <td className="px-4 py-3 font-mono">{formatCurrency(cl.cumulativeWork)}</td>
                          <td className="px-4 py-3 font-mono font-bold">{formatCurrency(cl.currentClaim)}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">+{formatCurrency(cl.gstAmount)}</td>
                          <td className="px-4 py-3 font-mono font-bold text-primary">{formatCurrency(cl.netClaim)}</td>
                          <td className="px-4 py-3"><WorkflowBadge status={cl.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subtab 2C: Final Bills */}
            {voucherSubTab === "final_bills" && (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Final Bill #</th>
                      <th className="px-4 py-3">Contractor & Project</th>
                      <th className="px-4 py-3 font-mono">Contract Value</th>
                      <th className="px-4 py-3 font-mono">Gross Executed</th>
                      <th className="px-4 py-3 font-mono">Retention Released</th>
                      <th className="px-4 py-3 font-mono">Net Settlement</th>
                      <th className="px-4 py-3">No-Claim Cert</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {finalBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          No final bill settlements registered.
                        </td>
                      </tr>
                    ) : (
                      finalBills.map((fb) => (
                        <tr key={fb.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{fb.finalBillNumber}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-foreground">{fb.contractorName}</p>
                            <p className="text-[11px] text-muted-foreground">{fb.projectName}</p>
                          </td>
                          <td className="px-4 py-3 font-mono">{formatCurrency(fb.contractValue)}</td>
                          <td className="px-4 py-3 font-mono font-bold">{formatCurrency(fb.grossTotalExecuted)}</td>
                          <td className="px-4 py-3 font-mono text-success">+{formatCurrency(fb.retentionReleased)}</td>
                          <td className="px-4 py-3 font-mono font-bold text-primary">{formatCurrency(fb.netSettlement)}</td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-success/15 text-success px-2 py-0.5 text-[10px] font-bold">Received</span>
                          </td>
                          <td className="px-4 py-3"><WorkflowBadge status={fb.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subtab 2D: Expenses */}
            {voucherSubTab === "expenses" && (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Voucher #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Vendor / Payee</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Payment Mode</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{exp.expenseNumber}</td>
                        <td className="px-4 py-3">{exp.date}</td>
                        <td className="px-4 py-3 font-medium">{exp.projectName}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">{exp.category}</span>
                        </td>
                        <td className="px-4 py-3">{exp.vendorContractor}</td>
                        <td className="px-4 py-3 font-mono font-bold">{formatCurrency(exp.amount)}</td>
                        <td className="px-4 py-3">{exp.paymentMode}</td>
                        <td className="px-4 py-3"><WorkflowBadge status={exp.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subtab 2E: Payments */}
            {voucherSubTab === "payments" && (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Voucher Ref</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Payee Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Invoice Ref</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{p.voucherNumber}</td>
                        <td className="px-4 py-3 font-medium">{p.projectName}</td>
                        <td className="px-4 py-3 font-bold">{p.payeeName}</td>
                        <td className="px-4 py-3">{p.payeeType}</td>
                        <td className="px-4 py-3 font-mono text-[11px]">{p.invoiceRef}</td>
                        <td className="px-4 py-3 font-mono font-bold">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3">{p.dueDate}</td>
                        <td className="px-4 py-3"><WorkflowBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: CASH FLOW & AGING */}
        {activeSection === "cash_flow" && (
          <div className="space-y-6">
            {/* 30/60/90 Days Cash Flow Projection */}
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Multi-Horizon Cash Flow Forecast</h3>
                  <p className="text-xs text-muted-foreground">Projected commercial inflow vs contractor/procurement outflow</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(["30", "60", "90"] as const).map((win) => (
                    <button
                      key={win}
                      onClick={() => setCashFlowWindow(win)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold ${
                        cashFlowWindow === win
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {win} Days Horizon
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <div className="rounded-lg border bg-success/5 border-success/20 p-4 space-y-1">
                  <span className="text-muted-foreground font-semibold">Projected Cash Inflow ({cashFlowWindow}d)</span>
                  <p className="font-mono text-xl font-bold text-success">
                    {formatCurrency(cashFlowWindow === "30" ? 18500000 : cashFlowWindow === "60" ? 38000000 : 59000000)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">From certified client RA billing disbursements</p>
                </div>
                <div className="rounded-lg border bg-danger/5 border-danger/20 p-4 space-y-1">
                  <span className="text-muted-foreground font-semibold">Projected Outflow ({cashFlowWindow}d)</span>
                  <p className="font-mono text-xl font-bold text-danger">
                    {formatCurrency(cashFlowWindow === "30" ? 14200000 : cashFlowWindow === "60" ? 29500000 : 46000000)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Vendor PO invoices, labour muster & subcontractor bills</p>
                </div>
                <div className="rounded-lg border bg-primary/5 border-primary/20 p-4 space-y-1">
                  <span className="text-muted-foreground font-semibold">Net Projected Surplus</span>
                  <p className="font-mono text-xl font-bold text-primary">
                    {formatCurrency(cashFlowWindow === "30" ? 4300000 : cashFlowWindow === "60" ? 8500000 : 13000000)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Positive working capital coverage</p>
                </div>
              </div>
            </div>

            {/* Receivables & Payables Aging Buckets */}
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-foreground">Commercial Aging Analysis</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setAgingTab("payables")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      agingTab === "payables"
                        ? "bg-primary text-primary-foreground"
                        : "border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Payables Aging
                  </button>
                  <button
                    onClick={() => setAgingTab("receivables")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      agingTab === "receivables"
                        ? "bg-primary text-primary-foreground"
                        : "border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Receivables Aging
                  </button>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-5 text-xs">
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Current (0-30 Days)</span>
                  <p className="font-mono font-bold text-base text-foreground">{formatCurrency(12000000)}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">31–60 Days</span>
                  <p className="font-mono font-bold text-base text-foreground">{formatCurrency(4500000)}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">61–90 Days</span>
                  <p className="font-mono font-bold text-base text-warning">{formatCurrency(1800000)}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">90+ Days (Overdue)</span>
                  <p className="font-mono font-bold text-base text-danger">{formatCurrency(750000)}</p>
                </div>
                <div className="rounded-lg border bg-primary/10 border-primary/20 p-3 space-y-1">
                  <span className="text-primary font-semibold">Total Outstanding</span>
                  <p className="font-mono font-bold text-base text-primary">{formatCurrency(19050000)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: PROJECT P&L & EAC */}
        {activeSection === "pnl_eac" && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b pb-3">Project Profit & Loss (P&L) Statement</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Revenue Certified</span>
                  <p className="font-mono text-base font-bold text-foreground">{formatCurrency(totalApprovedBudget * 0.45)}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Direct Costs (Materials + Labour)</span>
                  <p className="font-mono text-base font-bold text-foreground">{formatCurrency(totalActualCost * 0.85)}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground">Indirect Site Overheads</span>
                  <p className="font-mono text-base font-bold text-foreground">{formatCurrency(totalActualCost * 0.15)}</p>
                </div>
                <div className="rounded-lg border bg-success/10 border-success/20 p-3 space-y-1">
                  <span className="text-success font-semibold">Gross Profit Margin</span>
                  <p className="font-mono text-base font-bold text-success">
                    {formatCurrency(totalApprovedBudget * 0.45 - totalActualCost)} (18.4%)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: DIRECTORY */}
        {activeSection === "directory" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDirectorySubTab("vendors")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    directorySubTab === "vendors"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Suppliers & Vendors ({vendors.length})
                </button>
                <button
                  onClick={() => setDirectorySubTab("contractors")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    directorySubTab === "contractors"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Subcontractors ({contractors.length})
                </button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportWizardOpen(true)}
                className="gap-1.5 shadow-sm text-xs"
              >
                <Upload className="size-3.5" /> Import Vendors XLSX
              </Button>
            </div>

            {directorySubTab === "vendors" ? (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Vendor Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">GSTIN</th>
                      <th className="px-4 py-3 font-mono">Total Billed</th>
                      <th className="px-4 py-3 font-mono">Pending Payment</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vendors.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-bold text-foreground">{v.name}</td>
                        <td className="px-4 py-3">{v.category}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.contactPerson} ({v.phone})</td>
                        <td className="px-4 py-3 font-mono text-[11px]">{v.gstin}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(v.totalBilled)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-primary">{formatCurrency(v.pendingPayment)}</td>
                        <td className="px-4 py-3"><WorkflowBadge status={v.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-panel">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Contractor Name</th>
                      <th className="px-4 py-3">Trade Scope</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 font-mono">Contract Value</th>
                      <th className="px-4 py-3 font-mono">Paid to Date</th>
                      <th className="px-4 py-3 font-mono">Retention Held</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contractors.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-bold text-foreground">{c.name}</td>
                        <td className="px-4 py-3">{c.trade}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.contactPerson} ({c.phone})</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(c.totalContractValue)}</td>
                        <td className="px-4 py-3 font-mono font-bold">{formatCurrency(c.paidToDate)}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{formatCurrency(c.retentionHeld)}</td>
                        <td className="px-4 py-3"><WorkflowBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: REPORTS */}
        {activeSection === "reports" && (
          <div className="grid gap-4 md:grid-cols-3 text-xs">
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
              <h4 className="font-bold text-sm">Contractor Ledger & Retention Statement</h4>
              <p className="text-muted-foreground">Certified work, advance deductions, and cumulative retention balance.</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const headers = ["Bill #", "Contractor", "Project", "Gross Certified (INR)", "Retention (INR)", "TDS (INR)", "Net Payable (INR)", "Status"];
                  const rows = store.contractorRaBills.map((b) => [
                    b.billNumber,
                    b.contractorName,
                    b.projectName,
                    b.grossBill,
                    b.retentionAmount,
                    b.tdsAmount,
                    b.netPayable,
                    b.status,
                  ]);
                  downloadCsv("Contractor_Ledger_Retention_Statement", headers, rows);
                  notify("Contractor Ledger & Retention Statement downloaded.");
                }}
              >
                Download CSV Ledger
              </Button>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
              <h4 className="font-bold text-sm">Client RA Claim Certificate</h4>
              <p className="text-muted-foreground">Official measurement certified claim with GST breakdown.</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const headers = ["Claim #", "Project", "Location", "Cumulative Work (INR)", "Retention (INR)", "Net Claim (INR)", "Status"];
                  const rows = contextual.projects.map((p, idx) => [
                    `CLM-2026-00${idx + 1}`,
                    p.name,
                    p.location,
                    p.budget * (p.progress / 100),
                    p.budget * (p.progress / 100) * 0.05,
                    p.budget * (p.progress / 100) * 0.95,
                    "Certified",
                  ]);
                  downloadCsv("Client_RA_Claim_Certificate", headers, rows);
                  notify("Client RA Claim Certificate downloaded.");
                }}
              >
                Download CSV Certificate
              </Button>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
              <h4 className="font-bold text-sm">Project P&L Statement</h4>
              <p className="text-muted-foreground">Gross profit margin and direct vs indirect cost breakdown.</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const headers = ["Project Code", "Project Name", "Client", "Contract Value (INR)", "Total Incurred (INR)", "Gross Margin %", "Status"];
                  const rows = contextual.projects.map((p) => [
                    p.code,
                    p.name,
                    p.client,
                    p.budget,
                    p.actualCost,
                    p.budget > 0 ? (((p.budget - p.actualCost) / p.budget) * 100).toFixed(1) : "0.0",
                    p.status,
                  ]);
                  downloadCsv("Project_PnL_Financial_Statement", headers, rows);
                  notify("Project P&L Statement exported.");
                }}
              >
                Export CSV Statement
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contractor RA Bill Dialog */}
      <Dialog open={addRaBillOpen} onOpenChange={setAddRaBillOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Create Contractor Progress Bill (RA)</DialogTitle>
            <DialogDescription className="text-xs">
              Calculate net payable with statutory and contractual deductions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRaBill} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="ra-proj" label="Project Site" required>
                <select
                  id="ra-proj"
                  value={raProjId}
                  onChange={(e) => setRaProjId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="ra-contractor" label="Subcontractor" required>
                <Input
                  id="ra-contractor"
                  value={raContractorName}
                  onChange={(e) => setRaContractorName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="ra-period" label="Billing Period / RA Bill #" required>
                <Input
                  id="ra-period"
                  value={raPeriod}
                  onChange={(e) => setRaPeriod(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField id="ra-mb" label="Measurement Book (MB) Ref" required>
                <Input
                  id="ra-mb"
                  value={raMeasurementRef}
                  onChange={(e) => setRaMeasurementRef(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="ra-gross" label="Gross Bill Value (₹)" required>
                <Input
                  id="ra-gross"
                  type="number"
                  value={raGross}
                  onChange={(e) => setRaGross(e.target.value)}
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>
              <FormField id="ra-adv" label="Advance Recovery (₹)" optional>
                <Input
                  id="ra-adv"
                  type="number"
                  value={raAdvanceRecovery}
                  onChange={(e) => setRaAdvanceRecovery(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormRow columns={3}>
              <FormField id="ra-ret" label="Retention %" required>
                <Input
                  id="ra-ret"
                  type="number"
                  value={raRetentionPct}
                  onChange={(e) => setRaRetentionPct(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField id="ra-tds" label="TDS %" required>
                <Input
                  id="ra-tds"
                  type="number"
                  value={raTdsPct}
                  onChange={(e) => setRaTdsPct(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField id="ra-cess" label="Labour Cess %" required>
                <Input
                  id="ra-cess"
                  type="number"
                  value={raLabourCessPct}
                  onChange={(e) => setRaLabourCessPct(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            {/* Live Calculation Preview */}
            <div className="rounded-lg border bg-primary/5 p-3 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Gross Bill:</span>
                <span className="font-mono">{formatCurrency(raCalculation.grossAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Retention Deduction:</span>
                <span className="font-mono">-{formatCurrency(raCalculation.retentionAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Advance Recovery:</span>
                <span className="font-mono">-{formatCurrency(raCalculation.advanceRecoveryAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>TDS & Labour Cess:</span>
                <span className="font-mono">-{formatCurrency(raCalculation.tdsAmount + raCalculation.labourCessAmount)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-bold text-sm text-primary">
                <span>Net Payable:</span>
                <span className="font-mono">{formatCurrency(raCalculation.netPayable)}</span>
              </div>
            </div>

            <FormActions
              onCancel={() => setAddRaBillOpen(false)}
              submitLabel="Submit Contractor Progress Bill (RA)"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Client Bill Dialog */}
      <Dialog open={addClientBillOpen} onOpenChange={setAddClientBillOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Raise Client RA Billing Claim</DialogTitle>
            <DialogDescription className="text-xs">
              Generate progressive claim based on certified cumulative work and GST (18%).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddClientBill} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="cl-proj" label="Project Site" required>
                <select
                  id="cl-proj"
                  value={clProjId}
                  onChange={(e) => setClProjId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="cl-period" label="Claim Period" required>
                <Input
                  id="cl-period"
                  value={clPeriod}
                  onChange={(e) => setClPeriod(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="cl-cum" label="Cumulative Work Certified (₹)" required>
                <Input
                  id="cl-cum"
                  type="number"
                  value={clCumulative}
                  onChange={(e) => setClCumulative(e.target.value)}
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>
              <FormField id="cl-prev" label="Previous Certified (₹)" required>
                <Input
                  id="cl-prev"
                  type="number"
                  value={clPrevCertified}
                  onChange={(e) => setClPrevCertified(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="cl-gst" label="Statutory GST Rate (%) — Configurable" help="Standard 18% for works contracts, 12% for affordable housing, 0% for SEZ">
                <Input
                  id="cl-gst"
                  type="number"
                  value={clGstPercent}
                  onChange={(e) => setClGstPercent(e.target.value)}
                  className="h-9 text-xs font-mono"
                  placeholder="18"
                />
              </FormField>
            </FormRow>

            <div className="rounded-lg border bg-primary/5 p-3 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Current Claim Amount:</span>
                <span className="font-mono">{formatCurrency(clientBillCalculation.currentWorkValue)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST ({clGstPercent || 0}%):</span>
                <span className="font-mono">+{formatCurrency(clientBillCalculation.gstAmount)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-bold text-sm text-primary">
                <span>Total Net Claim:</span>
                <span className="font-mono">{formatCurrency(clientBillCalculation.netClaim)}</span>
              </div>
            </div>

            <FormActions
              onCancel={() => setAddClientBillOpen(false)}
              submitLabel="Submit Client Claim"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Final Bill Closeout Dialog */}
      <Dialog open={addFinalBillOpen} onOpenChange={setAddFinalBillOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Contractor Final Bill Settlement Closeout</DialogTitle>
            <DialogDescription className="text-xs">
              Release held retention, deduct final recoveries, and verify No-Claim certificate.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddFinalBill} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="fb-proj" label="Project Site" required>
                <select
                  id="fb-proj"
                  value={fbProjId}
                  onChange={(e) => setFbProjId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="fb-contractor" label="Subcontractor" required>
                <Input
                  id="fb-contractor"
                  value={fbContractorName}
                  onChange={(e) => setFbContractorName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="fb-gross" label="Gross Total Executed (₹)" required>
                <Input
                  id="fb-gross"
                  type="number"
                  value={fbGrossTotal}
                  onChange={(e) => setFbGrossTotal(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField id="fb-ret-rel" label="Retention Released (₹)" required>
                <Input
                  id="fb-ret-rel"
                  type="number"
                  value={fbRetentionReleased}
                  onChange={(e) => setFbRetentionReleased(e.target.value)}
                  required
                  className="h-9 text-xs font-mono font-bold text-success"
                />
              </FormField>
            </FormRow>

            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={fbNoClaim}
                onChange={(e) => setFbNoClaim(e.target.checked)}
              />
              No-Claim Certificate (NCC) and final measurement reconciliation received
            </label>

            <FormActions
              onCancel={() => setAddFinalBillOpen(false)}
              submitLabel="Lodge Final Settlement"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Expense Voucher Dialog */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Record Site Expense Voucher</DialogTitle>
            <DialogDescription className="text-xs">Log petty cash, fuel, amenities, or statutory payments.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddExpense} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="exp-proj" label="Project Site" required>
                <select
                  id="exp-proj"
                  value={expProjId}
                  onChange={(e) => setExpProjId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="exp-cat" label="Expense Category" required>
                <select
                  id="exp-cat"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option>Fuel</option>
                  <option>Labour Wages</option>
                  <option>Site Amenities</option>
                  <option>Equipment Hire</option>
                  <option>Materials</option>
                  <option>Permits & Statutory</option>
                  <option>Miscellaneous</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="exp-amt" label="Amount (₹)" required>
                <Input
                  id="exp-amt"
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>
              <FormField id="exp-ven" label="Vendor / Payee" required>
                <Input
                  id="exp-ven"
                  value={expVendor}
                  onChange={(e) => setExpVendor(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddExpenseOpen(false)}
              submitLabel="Record Expense"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Voucher Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Record Payment Voucher</DialogTitle>
            <DialogDescription className="text-xs">Schedule vendor or contractor disbursement against verified invoice.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPayment} className="space-y-4 pt-2">
            <FormRow columns={2}>
              <FormField id="pay-type" label="Payee Type" required>
                <select
                  id="pay-type"
                  value={payeeType}
                  onChange={(e) => setPayeeType(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="Vendor">Vendor</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Staff">Staff</option>
                </select>
              </FormField>
              <FormField id="pay-name" label="Payee Name" required>
                <Input
                  id="pay-name"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="pay-amt" label="Amount (₹)" required>
                <Input
                  id="pay-amt"
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>
              <FormField id="pay-due" label="Due Date" required>
                <Input
                  id="pay-due"
                  type="date"
                  value={payDueDate}
                  onChange={(e) => setPayDueDate(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddPaymentOpen(false)}
              submitLabel="Register Payment"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Reusable Excel Import Wizard Modal */}
      <ExcelImportWizard
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        datasetType="vendors"
      />
    </AppShell>
  );
}
