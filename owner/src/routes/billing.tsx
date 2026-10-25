import React, { useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  Receipt,
  Search,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatGrid, type StatItem } from "../components/shared/stat-grid";
import { StatusBadge } from "../components/shared/status-badge";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_INVOICES, MOCK_TELEMETRY } from "../mock/platform-data";
import type { InvoiceStatus, PlatformInvoice } from "../types";
import { downloadCsv } from "../lib/export-utils";

export function BillingView() {
  const invoices = MOCK_INVOICES;
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const hasInvoices = invoices.length > 0;

  const totalCollected = invoices
    .filter((i) => i.status === "paid")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOutstanding = invoices
    .filter((i) => i.status === "open" || i.status === "overdue")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const filtered = invoices.filter((inv) => {
    const matchesFilter = filter === "all" || inv.status === filter;
    const matchesSearch =
      inv.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExportCsv = () => {
    const headers = ["Invoice #", "Tenant Organization", "Plan Tier", "Amount (INR)", "Status", "Issued Date", "Due Date", "Gateway"];
    const rows = filtered.map((inv) => [
      inv.invoiceNumber,
      inv.tenantName,
      inv.plan,
      inv.amount,
      inv.status,
      inv.issuedDate,
      inv.dueDate,
      inv.gateway,
    ]);
    downloadCsv("platform-gst-invoices.csv", headers, rows);
  };

  const statItems: StatItem[] = [
    {
      label: "Total Collected This Month",
      value: hasInvoices ? `₹${(totalCollected / 100000).toFixed(2)} Lakhs` : "₹0",
      hint: hasInvoices ? "Settled invoices" : "No billing transactions yet",
      tone: hasInvoices ? "healthy" : "default",
      icon: <Receipt className="size-5" />,
    },
    {
      label: "Outstanding Receivable",
      value: hasInvoices ? `₹${(totalOutstanding / 100000).toFixed(2)} Lakhs` : "₹0",
      hint: hasInvoices ? "Open / overdue receivables" : "No pending receivables",
      tone: hasInvoices && totalOutstanding > 0 ? "attention" : "default",
      icon: <CreditCard className="size-5" />,
    },
    {
      label: "Payment Gateway Integration",
      value: "Not Connected",
      hint: "Razorpay / Stripe integration required",
      tone: "default",
      icon: <CheckCircle2 className="size-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Revenue Operations & Invoicing"
        title="Platform Billing & SaaS Collections"
        subtitle="Global customer invoice ledger, payment gateway reconciliations, and automated dunning workflows."
        actions={
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted shadow-panel cursor-pointer"
          >
            <Download className="size-4 text-muted-foreground" />
            <span>Export Invoices (CSV)</span>
          </button>
        }
      />

      {/* KPI Stat Grid */}
      <StatGrid items={statItems} columns={3} />

      {/* Invoices List */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or tenant organization…"
              className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-panel"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(["all", "paid", "open", "overdue"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  filter === s
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="p-3.5 font-semibold">Invoice #</th>
                    <th className="p-3.5 font-semibold">Tenant Organization</th>
                    <th className="p-3.5 font-semibold">Tier</th>
                    <th className="p-3.5 font-semibold">Amount (INR)</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold">Issued Date</th>
                    <th className="p-3.5 font-semibold">Due Date</th>
                    <th className="p-3.5 font-semibold">Gateway</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-semibold text-foreground">{inv.invoiceNumber}</td>
                      <td className="p-3.5 font-semibold text-foreground">{inv.tenantName}</td>
                      <td className="p-3.5 text-muted-foreground">{inv.plan}</td>
                      <td className="p-3.5 font-bold text-foreground tabular-nums">
                        ₹{inv.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="p-3.5 text-muted-foreground tabular-nums">{inv.issuedDate}</td>
                      <td className="p-3.5 text-muted-foreground tabular-nums">{inv.dueDate}</td>
                      <td className="p-3.5 text-muted-foreground">{inv.gateway}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No billing transactions yet"
            description="Invoices and subscription collections will appear here once tenant billing schedules trigger."
          />
        )}
      </div>
    </div>
  );
}
