import { AppShell, useNotify } from "@/components/app-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, mockStore, useMockStore } from "@/mock";
import type { AdvanceRecord, ExpenseCategory, ExpenseRecord, PaymentRecord } from "@/mock/types";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
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
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/finance/")({
  head: () => ({
    meta: [
      { title: "Finance & Cost Control | DEZOBUILD" },
      { name: "description", content: "Construction expenses, payments, contractor advances, and budget variance in DEZOBUILD." },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { expenses, payments, advances, vendors, contractors, projects } = useMockStore();
  const notify = useNotify();

  const [activeTab, setActiveTab] = useState("expenses");
  const [search, setSearch] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all");

  // Dialog States
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [addAdvanceOpen, setAddAdvanceOpen] = useState(false);

  // Add Expense State
  const [expProjId, setExpProjId] = useState(projects[0]?.id || "");
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("Fuel");
  const [expAmount, setExpAmount] = useState("35000");
  const [expVendor, setExpVendor] = useState("BPCL Fuel Station");
  const [expMode, setExpMode] = useState<ExpenseRecord["paymentMode"]>("Bank Transfer");
  const [expNotes, setExpNotes] = useState("");

  // Add Payment State
  const [payProjId, setPayProjId] = useState(projects[0]?.id || "");
  const [payeeName, setPayeeName] = useState("Shreeji Ready Mix");
  const [payeeType, setPayeeType] = useState<PaymentRecord["payeeType"]>("Vendor");
  const [payAmount, setPayAmount] = useState("250000");
  const [payDueDate, setPayDueDate] = useState("2026-09-20");
  const [payRef, setPayRef] = useState("INV-2026-091");

  // Add Advance State
  const [advProjId, setAdvProjId] = useState(projects[0]?.id || "");
  const [advParty, setAdvParty] = useState("Surya Civil Works");
  const [advType, setAdvType] = useState<AdvanceRecord["partyType"]>("Subcontractor");
  const [advAmount, setAdvAmount] = useState("500000");
  const [advTerms, setAdvTerms] = useState("10% deduction on every running bill");

  // Financial KPIs
  const totalApprovedBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalActualCost = projects.reduce((acc, p) => acc + p.actualCost, 0);
  const totalPendingPayments = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((acc, p) => acc + p.amount, 0);
  const totalOverdue = payments
    .filter((p) => p.status === "overdue")
    .reduce((acc, p) => acc + p.amount, 0);
  const totalOutstandingAdvances = advances
    .filter((a) => a.status === "active")
    .reduce((acc, a) => acc + a.outstandingBalance, 0);

  // Filtered Expenses
  const filteredExpenses = expenses.filter((e) => {
    if (selectedProjectFilter !== "all" && e.projectId !== selectedProjectFilter) return false;
    const q = search.toLowerCase();
    return (
      e.expenseNumber.toLowerCase().includes(q) ||
      e.projectName.toLowerCase().includes(q) ||
      e.vendorContractor.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
  });

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
      paidBy: "Finance Officer",
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
      invoiceRef: payRef,
      amount,
      dueDate: payDueDate,
      status: "pending",
      paymentMethod: "RTGS Transfer",
    });

    notify(`Payment voucher scheduled for ${payeeName} (${formatCurrency(amount)})`);
    setAddPaymentOpen(false);
  };

  return (
    <AppShell crumb="Finance">
      <PageHeader
        title="Finance & Commercial Cost Control"
        subtitle="Petty cash vouchers, vendor payables, subcontractor advances, and budget vs actual variance tracking."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddExpenseOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Add Expense Voucher
            </Button>
            <Button size="sm" onClick={() => setAddPaymentOpen(true)} className="gap-1.5">
              <HandCoins className="size-4" /> Create Payment Voucher
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Approved Budget",
            value: formatCurrency(totalApprovedBudget),
            hint: `Portfolio Actual: ${formatCurrency(totalActualCost)}`,
            icon: <IndianRupee className="size-4" />,
          },
          {
            label: "Pending Payables",
            value: formatCurrency(totalPendingPayments),
            hint: `${formatCurrency(totalOverdue)} overdue invoices`,
            tone: totalOverdue > 0 ? "critical" : "healthy",
            icon: <Clock className="size-4" />,
          },
          {
            label: "Subcontractor Advances",
            value: formatCurrency(totalOutstandingAdvances),
            hint: "Active recovery on running bills",
            icon: <Wallet className="size-4" />,
          },
          {
            label: "Active Commercial Vendors",
            value: vendors.length,
            hint: `${contractors.length} Subcontractors onboarded`,
            icon: <UserCheck className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Submodule Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border bg-card p-1 shadow-sm h-auto flex-wrap">
          <TabsTrigger value="expenses" className="gap-1.5 py-2">
            <Receipt className="size-4" /> Expense Ledger ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 py-2">
            <HandCoins className="size-4" /> Payments & Invoices ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="advances" className="gap-1.5 py-2">
            <Wallet className="size-4" /> Advances & Recovery ({advances.length})
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-1.5 py-2">
            <UserCheck className="size-4" /> Vendors Directory ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="contractors" className="gap-1.5 py-2">
            <Users className="size-4" /> Subcontractors ({contractors.length})
          </TabsTrigger>
          <TabsTrigger value="variance" className="gap-1.5 py-2">
            <TrendingUp className="size-4" /> Budget vs Actual Variance
          </TabsTrigger>
        </TabsList>

        {/* 1. EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search voucher #, vendor, category, project…"
            filters={
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            }
            onReset={() => {
              setSearch("");
              setSelectedProjectFilter("all");
            }}
          />

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Project Site</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor / Payee</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-primary">{exp.expenseNumber}</td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">{exp.projectName}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">{exp.category}</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium">{exp.vendorContractor}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground text-sm">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3.5">{exp.paymentMode}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{exp.date}</td>
                    <td className="px-4 py-3.5">
                      <WorkflowBadge status={exp.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {exp.status === "pending_approval" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold text-success border-success/30 hover:bg-success/10"
                          onClick={() => {
                            mockStore.updateExpenseStatus(exp.id, "approved");
                            notify(`Expense voucher ${exp.expenseNumber} approved`);
                          }}
                        >
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 2. PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Accounts Payable & Payment Schedule</h3>
            <Button size="sm" onClick={() => setAddPaymentOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Record Payment Voucher
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Payee / Beneficiary</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Invoice Ref</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3.5 font-mono font-bold text-primary">{pay.voucherNumber}</td>
                    <td className="px-4 py-3.5 font-semibold">{pay.projectName}</td>
                    <td className="px-4 py-3.5 font-bold text-foreground">{pay.payeeName}</td>
                    <td className="px-4 py-3.5">{pay.payeeType}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">{pay.invoiceRef}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-sm text-foreground">{formatCurrency(pay.amount)}</td>
                    <td className="px-4 py-3.5">{pay.dueDate}</td>
                    <td className="px-4 py-3.5">
                      <WorkflowBadge status={pay.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {pay.status !== "paid" ? (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            mockStore.updatePaymentStatus(pay.id, "paid");
                            notify(`Payment of ${formatCurrency(pay.amount)} released to ${pay.payeeName}`);
                          }}
                        >
                          Mark Paid
                        </Button>
                      ) : (
                        <span className="text-[11px] font-semibold text-success">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 3. ADVANCES TAB */}
        <TabsContent value="advances" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Mobilization & Material Advances Ledger</h3>
            <Button size="sm" onClick={() => notify("Use the Record Advance action below")} className="gap-1.5">
              <Plus className="size-4" /> Issue Advance
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Advance #</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Party Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Disbursed</th>
                  <th className="px-4 py-3">Recovered</th>
                  <th className="px-4 py-3">Outstanding Balance</th>
                  <th className="px-4 py-3">Recovery Terms</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3.5 font-mono font-bold text-primary">{adv.advanceNumber}</td>
                    <td className="px-4 py-3.5 font-semibold">{adv.projectName}</td>
                    <td className="px-4 py-3.5 font-bold text-foreground">{adv.partyName}</td>
                    <td className="px-4 py-3.5">{adv.partyType}</td>
                    <td className="px-4 py-3.5 font-mono font-bold">{formatCurrency(adv.amount)}</td>
                    <td className="px-4 py-3.5 font-mono text-success">{formatCurrency(adv.recoveredAmount)}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-danger text-sm">{formatCurrency(adv.outstandingBalance)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate">{adv.recoveryTerms}</td>
                    <td className="px-4 py-3.5">
                      <WorkflowBadge status={adv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 4. VENDORS TAB */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v) => (
              <div key={v.id} className="rounded-lg border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{v.name}</h4>
                    <p className="text-xs text-muted-foreground">{v.category}</p>
                  </div>
                  <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                    ★ {v.rating}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Contact: <strong>{v.contactPerson}</strong> ({v.phone})</p>
                  <p className="font-mono text-[11px]">GSTIN: {v.gstin}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Billed</span>
                    <p className="font-mono font-bold text-foreground">{formatCurrency(v.totalBilled)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pending Due</span>
                    <p className="font-mono font-bold text-danger">{formatCurrency(v.pendingPayment)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 5. CONTRACTORS TAB */}
        <TabsContent value="contractors" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contractors.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">{c.trade}</p>
                  </div>
                  <span className="rounded bg-success-soft text-success px-2 py-0.5 text-xs font-bold">
                    Score: {c.performanceScore}%
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Lead: <strong>{c.contactPerson}</strong> ({c.phone})</p>
                  <p>Work Orders: <strong>{c.workOrdersCount}</strong> · Active Workers: <strong>{c.activeWorkers}</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Contract Value</span>
                    <p className="font-mono font-bold text-foreground">{formatCurrency(c.totalContractValue)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Retention Held</span>
                    <p className="font-mono font-bold text-primary">{formatCurrency(c.retentionHeld)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 6. BUDGET VS ACTUAL VARIANCE TAB */}
        <TabsContent value="variance" className="space-y-4">
          <div className="rounded-lg border bg-card p-5 shadow-panel space-y-4">
            <h3 className="font-bold text-base">Portfolio Project Cost Performance & Variance Matrix</h3>
            <p className="text-xs text-muted-foreground">Detailed earned value variance analysis across all active site projects.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Approved Budget</th>
                    <th className="px-4 py-3">Actual Cost</th>
                    <th className="px-4 py-3">Committed POs</th>
                    <th className="px-4 py-3">Remaining Budget</th>
                    <th className="px-4 py-3">Cost Variance</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((p) => {
                    const remaining = p.budget - p.actualCost;
                    const isOver = p.varianceAmount > 0;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-foreground">{p.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{p.code}</p>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold">{formatCurrency(p.budget)}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-foreground">{formatCurrency(p.actualCost)}</td>
                        <td className="px-4 py-3.5 font-mono text-muted-foreground">{formatCurrency(p.committedCost)}</td>
                        <td className="px-4 py-3.5 font-mono font-medium">{formatCurrency(remaining)}</td>
                        <td className={`px-4 py-3.5 font-mono font-bold ${isOver ? "text-danger" : "text-success"}`}>
                          {isOver ? `+${formatCurrency(p.varianceAmount)}` : formatCurrency(p.varianceAmount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <HealthBadge health={p.health} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Site Expense Voucher</DialogTitle>
            <DialogDescription>Record petty cash, fuel, or site operational expense.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Project Site</Label>
              <select
                value={expProjId}
                onChange={(e) => setExpProjId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                >
                  <option>Fuel</option>
                  <option>Labour Wages</option>
                  <option>Site Amenities</option>
                  <option>Equipment Hire</option>
                  <option>Materials</option>
                  <option>Permits & Statutory</option>
                  <option>Miscellaneous</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Amount (₹)</Label>
                <Input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required className="h-9 font-mono font-bold" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Paid To / Vendor</Label>
              <Input value={expVendor} onChange={(e) => setExpVendor(e.target.value)} required className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <select
                value={expMode}
                onChange={(e) => setExpMode(e.target.value as ExpenseRecord["paymentMode"])}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                <option>Petty Cash</option>
                <option>Bank Transfer</option>
                <option>UPI</option>
                <option>Cheque</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Voucher Notes</Label>
              <Textarea value={expNotes} onChange={(e) => setExpNotes(e.target.value)} placeholder="Purpose and voucher references" className="h-16 text-xs" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Expense Voucher
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment Voucher</DialogTitle>
            <DialogDescription>Schedule running account disbursement or vendor payment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Project Site</Label>
              <select
                value={payProjId}
                onChange={(e) => setPayProjId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Payee Name</Label>
              <Input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} required className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount (₹)</Label>
                <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required className="h-9 font-mono font-bold" />
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={payDueDate} onChange={(e) => setPayDueDate(e.target.value)} required className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Invoice / RA Bill Reference</Label>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} required className="h-9 font-mono" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Schedule Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
