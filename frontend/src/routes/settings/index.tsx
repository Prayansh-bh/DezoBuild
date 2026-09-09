import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Building,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  GitBranch,
  Globe,
  HardHat,
  KeyRound,
  Layers,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Webhook,
} from "lucide-react";
import { AppShell, useNotify } from "@/components/app-shell";
import { PageHeader } from "@/components/shared/page-header";
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
import { mockStore, useMockStore } from "@/mock";
import { useTheme } from "@/hooks/use-theme";
import { ROLE_DEFINITIONS, CustomerRole } from "@/authorization";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import {
  FormSection,
  FormField,
  FormRow,
  FormActions,
  FieldGroup,
} from "@/components/shared/form-system";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "Company Administration | DEZOBUILD" },
      {
        name: "description",
        content:
          "Manage company profile, user access, role permissions, and organization defaults in DEZOBUILD.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const store = useMockStore();
  const { companySettings, rolesPermissions, employees } = store;
  const notify = useNotify();
  const { theme, setTheme } = useTheme();

  // Tab State: company | branches | approvals | api_webhooks | users | roles | organization | audit
  const [activeTab, setActiveTab] = useState("company");

  // Company Form State
  const [displayName, setDisplayName] = useState(companySettings.companyName);
  const [legalName, setLegalName] = useState(companySettings.legalName);
  const [gstin, setGstin] = useState(companySettings.gstin);
  const [pan, setPan] = useState(companySettings.panNumber);
  const [cin, setCin] = useState(companySettings.cinNumber);
  const [phone, setPhone] = useState(companySettings.phone);
  const [email, setEmail] = useState(companySettings.email);
  const [address, setAddress] = useState(companySettings.address);
  const [city, setCity] = useState(companySettings.city);
  const [stateName, setStateName] = useState("Karnataka");
  const [pincode, setPincode] = useState(companySettings.pincode);

  // Edit Company Mode State
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Multi-Company Entity State
  const [addEntityOpen, setAddEntityOpen] = useState(false);
  const [entityName, setEntityName] = useState("");
  const [entityLegalName, setEntityLegalName] = useState("");
  const [entityGstin, setEntityGstin] = useState("");
  const [entityPan, setEntityPan] = useState("");
  const [entityState, setEntityState] = useState("Maharashtra");

  // Multi-Branch State
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchState, setBranchState] = useState("");
  const [branchGstin, setBranchGstin] = useState("");

  // Custom Approval Builder State
  const [addApprovalOpen, setAddApprovalOpen] = useState(false);
  const [workflowModule, setWorkflowModule] = useState<"PO" | "Expense" | "Payment" | "GRN" | "DPR" | "Leave">("Payment");
  const [approvalStages, setApprovalStages] = useState(2);
  const [approverRoles, setApproverRoles] = useState<string[]>(["PROJECT_MANAGER", "ACCOUNTANT"]);
  const [segregationOfDuties, setSegregationOfDuties] = useState(true);

  // API Keys & Webhooks State
  const [addApiKeyOpen, setAddApiKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyScope, setKeyScope] = useState("Read-Write (All Modules)");
  const [addWebhookOpen, setAddWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("dpr.submitted, payment.approved, grn.received");

  // Invite User Modal State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Site Engineer");
  const [inviteName, setInviteName] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    setTimeout(() => {
      setIsSavingCompany(false);
      setIsEditingCompany(false);
      notify("Company profile details updated successfully.");
    }, 400);
  };

  const handleCancelCompanyEdit = () => {
    // Reset to current values
    setDisplayName(companySettings.companyName);
    setLegalName(companySettings.legalName);
    setGstin(companySettings.gstin);
    setPan(companySettings.panNumber);
    setCin(companySettings.cinNumber);
    setPhone(companySettings.phone);
    setEmail(companySettings.email);
    setAddress(companySettings.address);
    setCity(companySettings.city);
    setPincode(companySettings.pincode);
    setIsEditingCompany(false);
  };

  const handleAddEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName) return;
    mockStore.addCompany({
      code: `CORP-00${store.companies.length + 1}`,
      name: entityName,
      legalName: entityLegalName || entityName,
      gstin: entityGstin || "29AABCD1234E1Z5",
      pan: entityPan || "AABCD1234E",
      state: entityState,
      status: "active",
      projectCount: 0,
    });
    notify(`Legal entity "${entityName}" created (Enterprise Multi-Company).`);
    setAddEntityOpen(false);
    setEntityName("");
    setEntityLegalName("");
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName) return;
    mockStore.addBranch({
      code: branchCode || `BR-00${store.branches.length + 1}`,
      name: branchName,
      city: branchCity || "Bengaluru",
      state: branchState || "Karnataka",
      gstin: branchGstin || "29AABCD1234E1Z5",
      status: "active",
      projectCount: 0,
    });
    notify(`Branch hub "${branchName}" registered.`);
    setAddBranchOpen(false);
    setBranchName("");
    setBranchCode("");
  };

  const handleAddApproval = (e: React.FormEvent) => {
    e.preventDefault();
    mockStore.addCustomApprovalRule({
      module: workflowModule,
      triggerCondition: "Amount > ₹1,00,000 OR High-Risk Variance",
      stagesCount: approvalStages,
      approverRoles: approverRoles,
      segregationOfDuties: segregationOfDuties,
      status: "active",
    });
    notify(`Approval workflow configured for ${workflowModule} (Policy engine not connected).`);
    setAddApprovalOpen(false);
  };

  const handleAddApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;
    const token = `dez_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 6)}`;
    mockStore.addApiKey({
      name: keyName,
      token: token,
      maskedToken: `${token.substring(0, 12)}••••••••`,
      scope: keyScope,
      createdDate: new Date().toISOString().slice(0, 10),
      lastUsed: "Never",
      status: "active",
    });
    notify(`API Key "${keyName}" generated. Store credentials securely.`);
    setAddApiKeyOpen(false);
    setKeyName("");
  };

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl) return;
    mockStore.addWebhook({
      url: webhookUrl,
      events: webhookEvents.split(",").map((s) => s.trim()),
      secret: `whsec_${Math.random().toString(36).substring(2, 10)}`,
      status: "active",
      lastDelivery: "Never (Service disconnected)",
    });
    notify(`Webhook endpoint registered (Delivery engine not connected).`);
    setAddWebhookOpen(false);
    setWebhookUrl("");
  };

  const handleRevokeApiKey = (keyId: string) => {
    mockStore.revokeApiKey(keyId);
    notify("API Key revoked successfully.");
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setTimeout(() => {
      setIsInviting(false);
      setInviteOpen(false);
      notify(`Invitation sent to ${inviteEmail} for role ${inviteRole}.`);
      setInviteEmail("");
      setInviteName("");
    }, 300);
  };

  return (
    <AppShell crumb="Administration">
      <PageHeader
        title="Administration"
        subtitle="Manage company profile, legal entities, regional branches, approval workflows, API keys, and RBAC permissions."
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 font-semibold shadow-sm text-xs">
            <UserPlus className="size-4" /> Invite User
          </Button>
        }
      />

      {/* Main Settings Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border bg-card p-1 shadow-sm h-auto flex-wrap">
          <TabsTrigger value="company" className="gap-1.5 py-2 text-xs font-semibold">
            <Building2 className="size-4" /> Company & Legal Entities ({store.companies.length})
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-1.5 py-2 text-xs font-semibold">
            <GitBranch className="size-4" /> Branches ({store.branches.length})
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5 py-2 text-xs font-semibold">
            <SlidersHorizontal className="size-4" /> Approval Matrix ({store.customApprovalRules.length})
          </TabsTrigger>
          <TabsTrigger value="api_webhooks" className="gap-1.5 py-2 text-xs font-semibold">
            <KeyRound className="size-4" /> API Keys & Webhooks
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 py-2 text-xs font-semibold">
            <Users className="size-4" /> Team & Users ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 py-2 text-xs font-semibold">
            <Shield className="size-4" /> Roles & Permissions ({rolesPermissions.length})
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-1.5 py-2 text-xs font-semibold">
            <Sliders className="size-4" /> Organization Defaults
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 py-2 text-xs font-semibold">
            <Activity className="size-4" /> Security & Audit
          </TabsTrigger>
        </TabsList>

        {/* 1. COMPANY PROFILE */}
        <TabsContent value="company" className="space-y-6">
          {!isEditingCompany ? (
            <div className="space-y-6">
              {/* Read-Only Summary View */}
              <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <h3 className="font-bold text-base text-foreground">Company Identity & Registration</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Official corporate information used on invoices, purchase orders, and legal documents.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingCompany(true)}
                    className="gap-1.5 text-xs font-semibold self-start sm:self-auto"
                  >
                    <Edit3 className="size-3.5" /> Edit Company Profile
                  </Button>
                </div>

                {/* Read-Only Summary Grid */}
                <div className="grid gap-6 sm:grid-cols-2 text-xs">
                  {/* Identity Details */}
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                      Identity
                    </span>
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground text-[11px]">Display Name</span>
                        <p className="font-bold text-foreground text-sm">{displayName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px]">Registered Legal Entity</span>
                        <p className="font-semibold text-foreground">{legalName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px]">Corporate ID Number (CIN)</span>
                        <p className="font-mono font-medium text-foreground">{cin}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tax & Statutory */}
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                      Tax & Statutory
                    </span>
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground text-[11px]">GSTIN (India)</span>
                        <p className="font-mono font-bold text-primary text-sm">{gstin}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px]">Permanent Account Number (PAN)</span>
                        <p className="font-mono font-semibold text-foreground">{pan}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                      Contact
                    </span>
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground text-[11px]">Official Corporate Email</span>
                        <p className="font-medium text-foreground">{email}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px]">Headquarters Phone</span>
                        <p className="font-medium text-foreground">{phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Headquarters Address */}
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                      Headquarters
                    </span>
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground text-[11px]">Office Address</span>
                        <p className="font-medium text-foreground leading-relaxed">{address}</p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="text-muted-foreground text-[11px]">City & State</span>
                          <p className="font-semibold text-foreground">{city}, {stateName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[11px]">Pincode</span>
                          <p className="font-mono font-medium text-foreground">{pincode}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Company Legal Entities (Enterprise) */}
              <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4 max-w-4xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-foreground">Multi-Company & Legal Entities</h3>
                      <span className="rounded bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                        Enterprise Tier
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hierarchy model: <strong className="text-foreground">Tenant → Legal Entity / Company → Branch Hub → Project → Site</strong>
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setAddEntityOpen(true)} className="gap-1.5 text-xs font-semibold">
                    <Plus className="size-3.5" /> Add Legal Entity
                  </Button>
                </div>

                <div className="rounded-xl border bg-card overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5">Entity Code</th>
                        <th className="px-4 py-2.5">Business Name</th>
                        <th className="px-4 py-2.5">Legal Entity</th>
                        <th className="px-4 py-2.5 font-mono">GSTIN</th>
                        <th className="px-4 py-2.5">State</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-medium">
                      {store.companies.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.legalName}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{c.gstin}</td>
                          <td className="px-4 py-3 text-foreground">{c.state}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                              {c.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Dedicated Edit Company Profile View */
            <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-panel max-w-2xl">
              <div className="mb-6 pb-4 border-b border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelCompanyEdit}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 -ml-2 h-7"
                >
                  <ArrowLeft className="size-3.5" /> Back to Summary
                </Button>
                <h3 className="font-bold text-lg text-foreground">Edit Company Profile</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your company's official information used across invoices, POs, and compliance documents.
                </p>
              </div>

              <form onSubmit={handleSaveCompany} className="space-y-6">
                {/* Section 1: Company identity */}
                <FormSection
                  title="Company identity"
                  description="Primary business names and legal registration numbers."
                >
                  <FormRow columns={1}>
                    <FormField
                      id="edit-displayName"
                      label="Display name"
                      required
                      help="Common business name shown across workspace interfaces."
                    >
                      <Input
                        id="edit-displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Dezo Infra Projects Pvt. Ltd."
                        required
                        className="h-9 text-xs"
                      />
                    </FormField>

                    <FormField
                      id="edit-legalName"
                      label="Legal entity name"
                      required
                      help="Full corporate name registered with the Ministry of Corporate Affairs."
                    >
                      <Input
                        id="edit-legalName"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="Dezo Infrastructure & Engineering Pvt. Ltd."
                        required
                        className="h-9 text-xs"
                      />
                    </FormField>

                    <FormField
                      id="edit-cin"
                      label="Corporate Identification Number (CIN)"
                      optional
                    >
                      <Input
                        id="edit-cin"
                        value={cin}
                        onChange={(e) => setCin(e.target.value)}
                        placeholder="U45200KA2019PTC128456"
                        className="font-mono h-9 text-xs"
                      />
                    </FormField>
                  </FormRow>
                </FormSection>

                {/* Section 2: Tax & statutory */}
                <FormSection
                  title="Tax & statutory"
                  description="Goods and Services Tax and Permanent Account Number credentials."
                >
                  <FormRow columns={2}>
                    <FormField id="edit-gstin" label="GSTIN" required>
                      <Input
                        id="edit-gstin"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        placeholder="29AABCD1234E1Z5"
                        required
                        className="font-mono h-9 text-xs"
                      />
                    </FormField>

                    <FormField id="edit-pan" label="PAN" optional>
                      <Input
                        id="edit-pan"
                        value={pan}
                        onChange={(e) => setPan(e.target.value)}
                        placeholder="AABCD1234E"
                        className="font-mono h-9 text-xs"
                      />
                    </FormField>
                  </FormRow>
                </FormSection>

                {/* Section 3: Contact */}
                <FormSection
                  title="Contact"
                  description="Official communication channels for statutory and billing correspondence."
                >
                  <FormRow columns={2}>
                    <FormField id="edit-email" label="Official email" required>
                      <Input
                        id="edit-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@dezoinfra.com"
                        required
                        className="h-9 text-xs"
                      />
                    </FormField>

                    <FormField id="edit-phone" label="Phone" optional>
                      <Input
                        id="edit-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 80 4123 4567"
                        className="h-9 text-xs"
                      />
                    </FormField>
                  </FormRow>
                </FormSection>

                {/* Section 4: Registered address */}
                <FormSection
                  title="Registered address"
                  description="Physical head office address for statutory filings."
                >
                  <FormRow columns={1}>
                    <FormField id="edit-address" label="Registered address" required>
                      <Input
                        id="edit-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Level 4, Dezo Towers, Outer Ring Road"
                        required
                        className="h-9 text-xs"
                      />
                    </FormField>
                  </FormRow>

                  <FormRow columns={3}>
                    <FormField id="edit-city" label="City" required>
                      <Input
                        id="edit-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bengaluru"
                        required
                        className="h-9 text-xs"
                      />
                    </FormField>

                    <FormField id="edit-state" label="State" required>
                      <Input
                        id="edit-state"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="Karnataka"
                        required
                        className="h-9 text-xs"
                      />
                    </FormField>

                    <FormField id="edit-pincode" label="Pincode" required>
                      <Input
                        id="edit-pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="560103"
                        required
                        className="font-mono h-9 text-xs"
                      />
                    </FormField>
                  </FormRow>
                </FormSection>

                {/* Sticky Form Action Bar */}
                <FormActions
                  onCancel={handleCancelCompanyEdit}
                  isSubmitting={isSavingCompany}
                  submitLabel="Save Changes"
                  isDirty={true}
                />
              </form>
            </div>
          )}
        </TabsContent>

        {/* 2. BRANCHES & HUBS */}
        <TabsContent value="branches" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">Regional Operational Branches & Hubs</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Regional circles and state operating branches coordinating site projects and central stores.
                </p>
              </div>
              <Button size="sm" onClick={() => setAddBranchOpen(true)} className="gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" /> Add Operational Branch
              </Button>
            </div>

            {store.branches.length === 0 ? (
              <EmptyState
                icon={GitBranch}
                title="No branches registered"
                description="Create regional branch hubs to categorize project sites and manage localized GST tax compliance."
                action={{
                  label: "Add Branch",
                  onClick: () => setAddBranchOpen(true),
                }}
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Branch Code</th>
                      <th className="px-4 py-2.5">Branch Name</th>
                      <th className="px-4 py-2.5">City / Region</th>
                      <th className="px-4 py-2.5">State</th>
                      <th className="px-4 py-2.5 font-mono">Branch GSTIN</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {store.branches.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{b.code}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{b.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.city}</td>
                        <td className="px-4 py-3 text-foreground">{b.state}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{b.gstin}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                            {b.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. APPROVAL WORKFLOWS */}
        <TabsContent value="approvals" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">Custom Multi-Stage Approval Matrix</h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    Policy Engine Not Connected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define tiered approval stages and strict Segregation of Duties (SoD) across financial and operational documents.
                </p>
              </div>
              <Button size="sm" onClick={() => setAddApprovalOpen(true)} className="gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" /> Configure Workflow
              </Button>
            </div>

            {store.customApprovalRules.length === 0 ? (
              <EmptyState
                icon={SlidersHorizontal}
                title="No custom approval workflows configured"
                description="Set up approval hierarchies for Purchase Orders, Expenses, Payment Requests, GRNs, and DPR sign-offs."
                action={{
                  label: "Configure Workflow",
                  onClick: () => setAddApprovalOpen(true),
                }}
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Module</th>
                      <th className="px-4 py-2.5">Trigger Condition</th>
                      <th className="px-4 py-2.5 font-mono text-center">Stages</th>
                      <th className="px-4 py-2.5">Approver Role Sequence</th>
                      <th className="px-4 py-2.5">Segregation of Duties</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {store.customApprovalRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-bold text-foreground">
                          <span className="rounded bg-primary/10 text-primary px-2 py-0.5 font-mono">
                            {rule.module}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{rule.triggerCondition}</td>
                        <td className="px-4 py-3 font-mono font-bold text-center">{rule.stagesCount} Stages</td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {rule.approverRoles.join(" → ")}
                        </td>
                        <td className="px-4 py-3">
                          {rule.segregationOfDuties ? (
                            <span className="rounded bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px] font-bold">
                              Enforced (No Self-Approval)
                            </span>
                          ) : (
                            <span className="rounded bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 4. DEVELOPER API KEYS & WEBHOOKS */}
        <TabsContent value="api_webhooks" className="space-y-6">
          {/* API Keys */}
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">Developer API Keys</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate programmatic access tokens for ERP connectors and automated data sync.
                </p>
              </div>
              <Button size="sm" onClick={() => setAddApiKeyOpen(true)} className="gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" /> Generate API Key
              </Button>
            </div>

            {store.apiKeys.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="No API keys generated"
                description="Generate secure access tokens to connect external accounting software or BI dashboards."
                action={{
                  label: "Generate API Key",
                  onClick: () => setAddApiKeyOpen(true),
                }}
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Key Descriptor</th>
                      <th className="px-4 py-2.5 font-mono">Token Secret</th>
                      <th className="px-4 py-2.5">Scope</th>
                      <th className="px-4 py-2.5">Created</th>
                      <th className="px-4 py-2.5">Last Used</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {store.apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-foreground">{key.name}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{key.maskedToken}</td>
                        <td className="px-4 py-3 text-muted-foreground">{key.scope}</td>
                        <td className="px-4 py-3 text-muted-foreground">{key.createdDate}</td>
                        <td className="px-4 py-3 text-muted-foreground">{key.lastUsed}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeApiKey(key.id)}
                            className="h-7 text-rose-600 hover:text-rose-700 text-[11px] px-2"
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Webhooks */}
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">Outbound Webhooks</h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    Delivery service not connected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive real-time HTTP POST notifications when DPRs, payments, or materials are updated.
                </p>
              </div>
              <Button size="sm" onClick={() => setAddWebhookOpen(true)} className="gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" /> Register Webhook
              </Button>
            </div>

            {store.webhooks.length === 0 ? (
              <EmptyState
                icon={Webhook}
                title="No webhook endpoints registered"
                description="Register webhook URLs to stream site transactions into external enterprise applications."
                action={{
                  label: "Register Webhook",
                  onClick: () => setAddWebhookOpen(true),
                }}
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Endpoint URL</th>
                      <th className="px-4 py-2.5">Subscribed Events</th>
                      <th className="px-4 py-2.5 font-mono">Signing Secret</th>
                      <th className="px-4 py-2.5">Last Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {store.webhooks.map((wh) => (
                      <tr key={wh.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-primary truncate max-w-xs">{wh.url}</td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {wh.events.join(", ")}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{(wh.secret || "whsec_default").substring(0, 10)}••••</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{wh.lastDelivery || "Never"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 5. USERS & TEAM */}
        <TabsContent value="users" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-panel">
            <div className="p-4 border-b border-border/80 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-sm text-foreground">Active Team Members</h3>
                <p className="text-xs text-muted-foreground">
                  Personnel with active access to company workspaces.
                </p>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 text-xs">
                <UserPlus className="size-4" /> Invite User
              </Button>
            </div>

            {employees.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No team members provisioned yet"
                description="Invite project engineers, accountants, and store managers with role-scoped workspace access."
                action={{
                  label: "Invite User",
                  onClick: () => setInviteOpen(true),
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Assigned Site</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-8 place-items-center rounded-full bg-primary/10 border border-primary/20 font-bold text-primary text-xs shrink-0">
                              {emp.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{emp.name}</p>
                              <p className="text-[10px] text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded border bg-primary/10 text-primary border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{emp.department}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{emp.assignedSite}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => notify(`Managing permissions for ${emp.name}`)}
                          >
                            Permissions
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. ROLES & PERMISSIONS */}
        <TabsContent value="roles" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-panel space-y-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Role-Based Access Control (RBAC)
              </h3>
              <p className="text-xs text-muted-foreground">
                Capability permissions assigned to each role across operational domains.
              </p>
            </div>

            <div className="space-y-3">
              {rolesPermissions.map((role) => (
                <div key={role.id} className="rounded-lg border border-border/80 p-4 bg-muted/20 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{role.roleName}</h4>
                      <p className="text-muted-foreground text-xs">{role.description}</p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground font-semibold">
                      {role.usersCount} Users
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center pt-1">
                    {Object.entries(role.permissions).map(([mod, perms]) => (
                      <div key={mod} className="rounded border bg-card p-2 text-[11px]">
                        <span className="font-bold text-foreground block mb-1 truncate">{mod}</span>
                        <div className="flex justify-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                          {perms.view ? <span className="text-emerald-600 font-bold">View</span> : <span className="text-muted-foreground/40">—</span>}
                          {perms.create && <span className="text-foreground">· Create</span>}
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

        {/* 4. ORGANIZATION SETTINGS */}
        <TabsContent value="organization" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4 max-w-3xl">
            <div>
              <h3 className="font-bold text-sm text-foreground">Organization Defaults</h3>
              <p className="text-xs text-muted-foreground">
                Currency formatting, fiscal calendar, timezones, and interface preferences.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1.5">
                <Label>Operational Currency</Label>
                <Input defaultValue={companySettings.currency} disabled className="bg-muted h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Currency Symbol</Label>
                <Input defaultValue={companySettings.currencySymbol} disabled className="bg-muted h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Fiscal Year Cycle</Label>
                <Input defaultValue={companySettings.fiscalYearStart} disabled className="bg-muted h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>System Timezone</Label>
                <Input defaultValue={companySettings.timezone} disabled className="bg-muted h-9 text-xs" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-bold text-foreground mb-2">Interface Theme</h4>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="text-xs h-8"
                >
                  Light Theme
                </Button>
                <Button
                  size="sm"
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="text-xs h-8"
                >
                  Dark Theme
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. AUDIT LOGS & SECURITY */}
        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-panel space-y-3">
            <div>
              <h3 className="font-bold text-sm text-foreground">Security Audit Trail</h3>
              <p className="text-xs text-muted-foreground">
                Operational audit log of user logins, role privilege assignments, and approval sign-offs.
              </p>
            </div>

            <EmptyState
              icon={Activity}
              title="No audit events yet"
              description="User logins, administrative role changes, and workflow sign-offs will appear here once recorded."
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog (Clean 1-column layout, max-w-md) */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Invite Team Member</DialogTitle>
            <DialogDescription className="text-xs">
              Provision a user account with role-scoped workspace permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="inv-name" label="Full Name" required>
                <Input
                  id="inv-name"
                  placeholder="e.g. Anand Deshmukh"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField id="inv-email" label="Work Email" required>
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField id="inv-role" label="Assigned Role" required>
                <select
                  id="inv-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Object.values(ROLE_DEFINITIONS).map((r) => (
                    <option key={r.key} value={r.title}>
                      {r.title} ({r.shortLabel})
                    </option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setInviteOpen(false)}
              submitLabel="Send Invitation"
              isSubmitting={isInviting}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Legal Entity Modal (Enterprise Multi-Company) */}
      <Dialog open={addEntityOpen} onOpenChange={setAddEntityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Register Legal Entity</DialogTitle>
            <DialogDescription className="text-xs">
              Add a subsidiary company or corporate legal entity under this tenant.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEntity} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="entity-name" label="Entity Display Name" required>
                <Input
                  id="entity-name"
                  placeholder="e.g. Dezo Infra Maharashtra"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField id="entity-legal" label="Registered Corporate Legal Name" required>
                <Input
                  id="entity-legal"
                  placeholder="e.g. Dezo Infra Maharashtra Pvt Ltd"
                  value={entityLegalName}
                  onChange={(e) => setEntityLegalName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormRow columns={2}>
                <FormField id="entity-gstin" label="GSTIN" required>
                  <Input
                    id="entity-gstin"
                    placeholder="27AABCD1234E1Z5"
                    value={entityGstin}
                    onChange={(e) => setEntityGstin(e.target.value)}
                    required
                    className="font-mono h-9 text-xs"
                  />
                </FormField>
                <FormField id="entity-pan" label="PAN" required>
                  <Input
                    id="entity-pan"
                    placeholder="AABCD1234E"
                    value={entityPan}
                    onChange={(e) => setEntityPan(e.target.value)}
                    required
                    className="font-mono h-9 text-xs"
                  />
                </FormField>
              </FormRow>
              <FormField id="entity-state" label="State of Incorporation" required>
                <Input
                  id="entity-state"
                  placeholder="e.g. Maharashtra"
                  value={entityState}
                  onChange={(e) => setEntityState(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>
            <FormActions
              onCancel={() => setAddEntityOpen(false)}
              submitLabel="Register Entity"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Branch Hub Modal */}
      <Dialog open={addBranchOpen} onOpenChange={setAddBranchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Register Operational Branch</DialogTitle>
            <DialogDescription className="text-xs">
              Define a regional branch hub coordinating site clusters and central store depots.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBranch} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormRow columns={2}>
                <FormField id="branch-code" label="Branch Code" required>
                  <Input
                    id="branch-code"
                    placeholder="e.g. BR-MUM"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    required
                    className="font-mono h-9 text-xs"
                  />
                </FormField>
                <FormField id="branch-name" label="Branch Hub Name" required>
                  <Input
                    id="branch-name"
                    placeholder="e.g. Mumbai Regional Hub"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </FormField>
              </FormRow>
              <FormRow columns={2}>
                <FormField id="branch-city" label="City" required>
                  <Input
                    id="branch-city"
                    placeholder="Mumbai"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </FormField>
                <FormField id="branch-state" label="State" required>
                  <Input
                    id="branch-state"
                    placeholder="Maharashtra"
                    value={branchState}
                    onChange={(e) => setBranchState(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </FormField>
              </FormRow>
              <FormField id="branch-gstin" label="Branch GSTIN" required>
                <Input
                  id="branch-gstin"
                  placeholder="27AABCD1234E1Z5"
                  value={branchGstin}
                  onChange={(e) => setBranchGstin(e.target.value)}
                  required
                  className="font-mono h-9 text-xs"
                />
              </FormField>
            </FormRow>
            <FormActions
              onCancel={() => setAddBranchOpen(false)}
              submitLabel="Save Branch"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Configure Custom Approval Matrix Modal */}
      <Dialog open={addApprovalOpen} onOpenChange={setAddApprovalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Configure Custom Approval Matrix</DialogTitle>
            <DialogDescription className="text-xs">
              Define approval hierarchies and Segregation of Duties (SoD) per operational module.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddApproval} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="appr-module" label="Operational Module" required>
                <select
                  id="appr-module"
                  value={workflowModule}
                  onChange={(e) => setWorkflowModule(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Payment">Payment / Payment Request</option>
                  <option value="PO">Purchase Order</option>
                  <option value="Expense">Expense</option>
                  <option value="GRN">Material GRN</option>
                  <option value="DPR">Daily Progress Report (DPR)</option>
                  <option value="Leave">Employee Leave</option>
                </select>
              </FormField>

              <FormField id="appr-stages" label="Number of Approval Stages" required>
                <select
                  id="appr-stages"
                  value={approvalStages}
                  onChange={(e) => setApprovalStages(parseInt(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                >
                  <option value="1">1 Stage (Direct Approver)</option>
                  <option value="2">2 Stages (Peer Review → Sign-off)</option>
                  <option value="3">3 Stages (PM → Finance → Owner)</option>
                </select>
              </FormField>

              <FormField id="appr-sod" label="Segregation of Duties (SoD)" help="Prohibits document creator from self-approving.">
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="appr-sod-check"
                    checked={segregationOfDuties}
                    onChange={(e) => setSegregationOfDuties(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary size-4"
                  />
                  <label htmlFor="appr-sod-check" className="text-xs font-semibold text-foreground cursor-pointer">
                    Enforce SoD (Creator cannot approve)
                  </label>
                </div>
              </FormField>
            </FormRow>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
              Rule definition will be saved to local UI development state. Policy execution engine requires backend integration.
            </div>

            <FormActions
              onCancel={() => setAddApprovalOpen(false)}
              submitLabel="Save Approval Rule"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate API Key Modal */}
      <Dialog open={addApiKeyOpen} onOpenChange={setAddApiKeyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Generate Developer API Key</DialogTitle>
            <DialogDescription className="text-xs">
              Create an authentication token for external systems and BI integrations.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddApiKey} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="key-name" label="Key Descriptor / Application" required>
                <Input
                  id="key-name"
                  placeholder="e.g. ERP Next Connector / PowerBI Sync"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField id="key-scope" label="Access Scope" required>
                <select
                  id="key-scope"
                  value={keyScope}
                  onChange={(e) => setKeyScope(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Read-Write (All Modules)">Read-Write (All Modules)</option>
                  <option value="Read-Only (Finance & Commercial)">Read-Only (Finance & Commercial)</option>
                  <option value="Read-Only (Materials & Store)">Read-Only (Materials & Store)</option>
                  <option value="DPR Ingestion Only">DPR Ingestion Only</option>
                </select>
              </FormField>
            </FormRow>
            <FormActions
              onCancel={() => setAddApiKeyOpen(false)}
              submitLabel="Generate Secret Key"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Webhook Modal */}
      <Dialog open={addWebhookOpen} onOpenChange={setAddWebhookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Register Outbound Webhook</DialogTitle>
            <DialogDescription className="text-xs">
              Stream real-time HTTP POST events to external server endpoints.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddWebhook} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="wh-url" label="Payload URL (HTTPS)" required>
                <Input
                  id="wh-url"
                  placeholder="https://api.yourcompany.com/dezobuild-webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                  className="font-mono h-9 text-xs"
                />
              </FormField>
              <FormField id="wh-events" label="Subscribed Events (Comma separated)" required>
                <Input
                  id="wh-events"
                  placeholder="dpr.submitted, payment.approved, grn.received"
                  value={webhookEvents}
                  onChange={(e) => setWebhookEvents(e.target.value)}
                  required
                  className="font-mono h-9 text-xs"
                />
              </FormField>
            </FormRow>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
              Webhook delivery service is disconnected. Registered URLs will be saved locally until backend queue is active.
            </div>
            <FormActions
              onCancel={() => setAddWebhookOpen(false)}
              submitLabel="Register Webhook"
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
