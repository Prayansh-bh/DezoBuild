import { AppShell, useNotify } from "@/components/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, useMockStore } from "@/mock";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  HardHat,
  KeyRound,
  Lock,
  Mail,
  Plus,
  Save,
  Shield,
  Sliders,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "Settings & Enterprise Configuration | DEZOBUILD" },
      { name: "description", content: "Company profile, user management, roles & permissions matrix, subscription and alert preferences in DEZOBUILD." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { companySettings, rolesPermissions, employees } = useMockStore();
  const notify = useNotify();

  const [activeTab, setActiveTab] = useState("company");

  // Company Form State
  const [legalName, setLegalName] = useState(companySettings.legalName);
  const [gstin, setGstin] = useState(companySettings.gstin);
  const [phone, setPhone] = useState(companySettings.phone);
  const [email, setEmail] = useState(companySettings.email);
  const [address, setAddress] = useState(companySettings.address);
  const [city, setCity] = useState(companySettings.city);

  // Invite User Modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Site Engineer");

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    notify("Company profile details updated successfully.");
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    notify(`Invitation sent to ${inviteEmail} for role ${inviteRole}.`);
    setInviteOpen(false);
    setInviteEmail("");
  };

  return (
    <AppShell crumb="Settings">
      <PageHeader
        title="Settings & System Configuration"
        subtitle="Manage company legal entity, user role access permissions, subscription tiers, and alert dispatch rules."
      />

      {/* Submodule Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border bg-card p-1 shadow-sm h-auto flex-wrap">
          <TabsTrigger value="company" className="gap-1.5 py-2">
            <Building2 className="size-4" /> Company Profile
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 py-2">
            <Users className="size-4" /> Users & Team ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 py-2">
            <Shield className="size-4" /> Roles & Permissions ({rolesPermissions.length})
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5 py-2">
            <CreditCard className="size-4" /> Subscription & Limits
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 py-2">
            <Bell className="size-4" /> Alert Rules & Channels
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5 py-2">
            <Sliders className="size-4" /> Preferences & Localization
          </TabsTrigger>
        </TabsList>

        {/* 1. COMPANY PROFILE */}
        <TabsContent value="company" className="space-y-4">
          <form onSubmit={handleSaveCompany} className="rounded-lg border bg-card p-6 shadow-panel space-y-4 max-w-3xl">
            <div className="border-b pb-3">
              <h3 className="font-bold text-base">Corporate Organization Information</h3>
              <p className="text-xs text-muted-foreground">Entity registration details, statutory tax numbers, and official headquarters.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2 text-xs">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Legal Registered Name</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} required className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label>GSTIN Number</Label>
                <Input value={gstin} onChange={(e) => setGstin(e.target.value)} required className="h-9 font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label>Corporate Identity Number (CIN)</Label>
                <Input value={companySettings.cinNumber} readOnly className="h-9 font-mono bg-muted" />
              </div>

              <div className="space-y-1.5">
                <Label>Official Support Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label>Primary Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required className="h-9" />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Registered Office Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} required className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} required className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label>Fiscal Year Cycle</Label>
                <Input value={companySettings.fiscalYearStart} readOnly className="h-9 bg-muted" />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" size="sm" className="gap-1.5 font-bold">
                <Save className="size-4" /> Save Profile Changes
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* 2. USERS & ACCESS */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Team Members & Workspace Access</h3>
              <p className="text-xs text-muted-foreground">Manage authorized company seats, site assignments, and invitation statuses.</p>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
              <UserPlus className="size-4" /> Invite Member
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Assigned Site</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-foreground">{emp.name}</p>
                      <p className="text-muted-foreground text-[11px]">{emp.email}</p>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-primary">{emp.role}</td>
                    <td className="px-4 py-3.5">{emp.assignedSite}</td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">{emp.phone}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft text-success px-2 py-0.5 text-[10px] font-bold">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => notify(`Permissions modified for ${emp.name}`)}
                      >
                        Edit Access
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 3. ROLES & PERMISSIONS */}
        <TabsContent value="roles" className="space-y-4">
          <div className="rounded-lg border bg-card p-5 shadow-panel space-y-4">
            <div>
              <h3 className="font-bold text-base">Role-Based Access Control (RBAC) Permission Matrix</h3>
              <p className="text-xs text-muted-foreground">Fine-grained operational rights per domain role across all DEZOBUILD modules.</p>
            </div>

            <div className="space-y-4">
              {rolesPermissions.map((role) => (
                <div key={role.id} className="rounded-md border p-4 bg-muted/20 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{role.roleName}</h4>
                      <p className="text-muted-foreground text-xs">{role.description}</p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground font-semibold">
                      {role.usersCount} Active Members
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center pt-1">
                    {Object.entries(role.permissions).slice(0, 5).map(([mod, perms]) => (
                      <div key={mod} className="rounded border bg-card p-2 text-[11px]">
                        <span className="font-bold text-foreground block mb-1">{mod}</span>
                        <div className="flex justify-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                          {perms.view && <span className="text-success font-bold">View</span>}
                          {perms.create && <span>· Create</span>}
                          {perms.approve && <span className="text-primary font-bold">· Approve</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 4. SUBSCRIPTION & LIMITS */}
        <TabsContent value="subscription" className="space-y-4">
          <div className="rounded-lg border bg-card p-6 shadow-panel space-y-6 max-w-3xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-extrabold uppercase">
                    {companySettings.subscription.planName}
                  </span>
                  <span className="text-xs font-semibold text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Active Enterprise Contract
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-2">Unlimited Multi-Site Construction Plan</h3>
                <p className="text-xs text-muted-foreground">Renewal Date: {companySettings.subscription.renewsOn} ({companySettings.subscription.billingCycle} billing)</p>
              </div>

              <Button variant="outline" size="sm" onClick={() => notify("Enterprise plan active with full entitlement.")}>
                Manage Quotas
              </Button>
            </div>

            {/* Quota meters */}
            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Active Projects</span>
                  <span className="font-mono font-bold">
                    {companySettings.subscription.activeProjectsUsed} / {companySettings.subscription.activeProjectsLimit}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${(companySettings.subscription.activeProjectsUsed / companySettings.subscription.activeProjectsLimit) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">7 project slots available</p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Storage Cloud Space</span>
                  <span className="font-mono font-bold">
                    {companySettings.subscription.storageUsedGb} GB / {companySettings.subscription.storageLimitGb} GB
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${(companySettings.subscription.storageUsedGb / companySettings.subscription.storageLimitGb) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">135.5 GB storage remaining</p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Team Member Seats</span>
                  <span className="font-mono font-bold">
                    {companySettings.subscription.seatsUsed} / {companySettings.subscription.seatsLimit}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${(companySettings.subscription.seatsUsed / companySettings.subscription.seatsLimit) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">12 available user licenses</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="rounded-lg border bg-card p-6 shadow-panel space-y-4 max-w-3xl text-xs">
            <div className="border-b pb-3">
              <h3 className="font-bold text-base">Automated Alert Dispatch & Escalation Rules</h3>
              <p className="text-muted-foreground">Configure when the smart alert engine notifies executives and site engineers.</p>
            </div>

            <div className="space-y-3 divide-y">
              {[
                { title: "Critical Cost & Budget Variance (> 10%)", desc: "Notify Company Owner and Project Director immediately via WhatsApp and Email.", defaultChecked: true },
                { title: "Schedule Delay & Critical Path Float Breach (> 5 Days)", desc: "Trigger priority notification to PMO and Senior PM.", defaultChecked: true },
                { title: "Low Material Inventory Stock Threshold Breach", desc: "Alert Store Manager and Site Engineer to initiate Purchase Indents.", defaultChecked: true },
                { title: "Daily DPR Submission Missing past 8:00 PM IST", desc: "Send SMS and App notification to responsible Site Engineer.", defaultChecked: true },
              ].map((rule, idx) => (
                <div key={idx} className="pt-3 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{rule.title}</h4>
                    <p className="text-muted-foreground mt-0.5">{rule.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={rule.defaultChecked}
                    className="size-4 rounded accent-primary mt-1"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button size="sm" onClick={() => notify("Notification channels updated.")}>
                Save Alert Rules
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* 6. PREFERENCES */}
        <TabsContent value="preferences" className="space-y-4">
          <div className="rounded-lg border bg-card p-6 shadow-panel space-y-4 max-w-2xl text-xs">
            <div className="border-b pb-3">
              <h3 className="font-bold text-base">Localization & Display Preferences</h3>
              <p className="text-muted-foreground">Default currency format, calendar system, and timezone.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <Label>Number System</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-xs">
                  <option>Indian Number System (Lakhs & Crores · ₹1,00,000)</option>
                  <option>International Number System (Millions & Billions · 1,000,000)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Date Format</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-xs">
                  <option>DD/MM/YYYY (e.g. 07/09/2026)</option>
                  <option>YYYY-MM-DD (ISO standard)</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Default Workspace on Login</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-xs">
                  <option>Owner Executive Dashboard</option>
                  <option>Projects Directory</option>
                  <option>Site Daily Progress (DPR)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button size="sm" onClick={() => notify("Preferences saved.")}>
                Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite New Team Member</DialogTitle>
            <DialogDescription>Send email invitation to join DEZOBUILD workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Corporate Email Address *</Label>
              <Input
                type="email"
                placeholder="colleague@dezoinfra.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Role Assignment</Label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                <option>Project Manager</option>
                <option>Site Engineer</option>
                <option>Quantity Surveyor</option>
                <option>Store Manager</option>
                <option>Accountant</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Send Invitation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
