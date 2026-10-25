import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  Save,
  Send,
  History,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  DollarSign,
  HardDrive,
  Users,
  FolderKanban,
  FileText,
  Clock,
} from "lucide-react";
import {
  platformPlansApi,
  type PlatformPlanDetailDto,
  type PlanVersionDto,
  type SavePlanDraftDto,
} from "../lib/api/plans";
import { StatusBadge } from "./shared/status-badge";

export const CANONICAL_FEATURES = [
  {
    key: "projects:core",
    name: "Core Projects & DPR Mobile Logging",
    domain: "projects",
    description: "Capital project registry, site parameters, project metadata, and Daily Progress Reports.",
  },
  {
    key: "projects:wbs",
    name: "Work Breakdown Structure (WBS) & Scheduling",
    domain: "projects",
    description: "Multi-level hierarchical WBS trees, milestone scheduling, and physical activity progress.",
  },
  {
    key: "materials:core",
    name: "Materials & Store Receipts (GRN)",
    domain: "materials",
    description: "Material catalogue masters, store inventory bin tracking, and Goods Receipt Notes.",
  },
  {
    key: "materials:po_matching",
    name: "Vendor Purchase Orders & 3-Way Matching",
    domain: "materials",
    description: "Purchase order generation, vendor challan reconciliation, and 3-way delivery matching.",
  },
  {
    key: "finance:commercial",
    name: "Commercial Ledgers & Contractor RA Bills",
    domain: "finance",
    description: "Running Account (RA) bills, statutory tax compliance (TDS, Cess), retention ledgers.",
  },
  {
    key: "bim:3d_viewer",
    name: "BIM 3D Model Viewer & Clash Overlays",
    domain: "bim",
    description: "Multi-disciplinary 3D IFC model rendering, clash detection, and revision overlays.",
  },
  {
    key: "ai:schedule_forecasting",
    name: "AI Schedule Slippage & Risk Forecaster",
    domain: "ai",
    description: "Machine learning milestone variance model trained on daily execution velocity.",
  },
  {
    key: "integrations:erp_sync",
    name: "ERP & Tally Prime Sync Gateway",
    domain: "integrations",
    description: "Automated two-way ledger and voucher synchronization with Tally Prime / SAP gateways.",
  },
  {
    key: "hardware:biometric",
    name: "Biometric Turnstile Machine Bridge",
    domain: "hardware",
    description: "Direct IP and MQTT broker bridge for real-time site biometric attendance turnstiles.",
  },
  {
    key: "survey:drone_orthomosaic",
    name: "Drone Survey Volumetric Earthwork Models",
    domain: "survey",
    description: "GeoTIFF aerial point-cloud volumetric earthwork cut/fill calculation models.",
  },
  {
    key: "security:custom_domain",
    name: "Custom Domain Mapping & Dedicated SSL",
    domain: "security",
    description: "White-label custom enterprise domain routing with dedicated SSL certificates.",
  },
  {
    key: "compliance:audit_export",
    name: "Cryptographic Audit Trail Export",
    domain: "compliance",
    description: "Cryptographically signed, immutable export of platform-wide access and mutation logs.",
  },
] as const;

interface TierEditorModalProps {
  plan: PlatformPlanDetailDto;
  isOpen: boolean;
  onClose: () => void;
  onPlanUpdated: (updatedPlan: PlatformPlanDetailDto) => void;
}

export function TierEditorModal({
  plan,
  isOpen,
  onClose,
  onPlanUpdated,
}: TierEditorModalProps) {
  const [activeTab, setActiveTab] = useState<"pricing" | "features" | "history">("pricing");

  // Form State
  const [priceMonthly, setPriceMonthly] = useState<number>(0);
  const [priceAnnual, setPriceAnnual] = useState<number>(0);
  const [maxProjects, setMaxProjects] = useState<string>("");
  const [maxSeats, setMaxSeats] = useState<string>("");
  const [maxStorageGb, setMaxStorageGb] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  // Operation States
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // History State
  const [historyVersions, setHistoryVersions] = useState<PlanVersionDto[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Populate initial state from plan active draft or published version
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuccessMessage(null);
    const sourceVersion = plan.draftVersion || plan.publishedVersion;

    if (sourceVersion) {
      setPriceMonthly(Number(sourceVersion.priceMonthly) || 0);
      setPriceAnnual(Number(sourceVersion.priceAnnual) || 0);
      setMaxProjects(sourceVersion.maxProjects !== null && sourceVersion.maxProjects !== undefined ? String(sourceVersion.maxProjects) : "");
      setMaxSeats(sourceVersion.maxSeats !== null && sourceVersion.maxSeats !== undefined ? String(sourceVersion.maxSeats) : "");
      setMaxStorageGb(sourceVersion.maxStorageGb !== null && sourceVersion.maxStorageGb !== undefined ? String(sourceVersion.maxStorageGb) : "");
      setFeatures(sourceVersion.features || {});
    } else {
      setPriceMonthly(0);
      setPriceAnnual(0);
      setMaxProjects("");
      setMaxSeats("");
      setMaxStorageGb("");
      setFeatures({});
    }

    setDescription(plan.description || "");
    setHistoryVersions(plan.versions || []);
  }, [plan, isOpen]);

  // Load version history on tab switch
  useEffect(() => {
    if (activeTab === "history" && isOpen) {
      loadHistory();
    }
  }, [activeTab, isOpen]);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const history = await platformPlansApi.getVersionHistory(plan.id);
      setHistoryVersions(history);
    } catch (err: any) {
      setError(err.message || "Failed to load plan version history.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFeatureToggle = (key: string) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload: SavePlanDraftDto = {
        priceMonthly: Number(priceMonthly),
        priceAnnual: Number(priceAnnual),
        maxProjects: maxProjects.trim() === "" ? null : parseInt(maxProjects, 10),
        maxSeats: maxSeats.trim() === "" ? null : parseInt(maxSeats, 10),
        maxStorageGb: maxStorageGb.trim() === "" ? null : parseInt(maxStorageGb, 10),
        description: description.trim() || undefined,
        features,
      };

      const updated = await platformPlansApi.saveDraft(plan.id, payload);
      onPlanUpdated(updated);
      setSuccessMessage(
        `Draft v${updated.draftVersion?.versionNumber} saved successfully. Existing and new tenants remain unaffected until published.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to save plan draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setError(null);
      setSuccessMessage(null);

      // Save draft first to capture any uncommitted form changes
      const payload: SavePlanDraftDto = {
        priceMonthly: Number(priceMonthly),
        priceAnnual: Number(priceAnnual),
        maxProjects: maxProjects.trim() === "" ? null : parseInt(maxProjects, 10),
        maxSeats: maxSeats.trim() === "" ? null : parseInt(maxSeats, 10),
        maxStorageGb: maxStorageGb.trim() === "" ? null : parseInt(maxStorageGb, 10),
        description: description.trim() || undefined,
        features,
      };

      await platformPlansApi.saveDraft(plan.id, payload);
      const updated = await platformPlansApi.publishPlan(plan.id);

      onPlanUpdated(updated);
      setSuccessMessage(
        `Version v${updated.publishedVersion?.versionNumber} published successfully! New subscribers will receive this version. Existing tenants remain pinned to their historical version.`
      );
      loadHistory();
    } catch (err: any) {
      setError(err.message || "Failed to publish plan version.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] rounded-2xl border border-border/80 bg-card shadow-float flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border bg-card flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Layers className="size-4.5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{plan.name} Governance</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono font-medium">
                    {plan.code}
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>
                    Current Active:{" "}
                    <strong className="text-foreground">
                      v{plan.publishedVersion?.versionNumber || 1}
                    </strong>
                  </span>
                  <span>•</span>
                  {plan.draftVersion ? (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                      <Sparkles className="size-3" /> Draft v{plan.draftVersion.versionNumber} Pending Publication
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No draft pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-border bg-card flex items-center gap-2 sm:gap-4 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "pricing"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="size-3.5" />
            <span>Pricing & Quotas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "features"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>Feature Matrix</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-bold">
              {Object.values(features).filter(Boolean).length}/{CANONICAL_FEATURES.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-3.5" />
            <span>Version History & Lineage</span>
          </button>
        </div>

        {/* Modal Scroll Viewport */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6 space-y-6 pb-8">
            {/* Notifications */}
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Configuration Error</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5">
                <CheckCircle2 className="size-4.5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Action Completed</p>
                  <p className="mt-0.5">{successMessage}</p>
                </div>
              </div>
            )}

            {/* TAB 1: Pricing & Quotas */}
            {activeTab === "pricing" && (
              <div className="space-y-6">
                {/* Commercial Pricing Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-primary" />
                    <span>Commercial Pricing (INR ₹)</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Monthly Price (₹ / month)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={priceMonthly}
                          onChange={(e) => setPriceMonthly(parseFloat(e.target.value) || 0)}
                          className="w-full h-9 pl-7 pr-3 rounded-lg border border-border bg-card text-foreground text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="e.g. 149999"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Annual Price (₹ / year)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={priceAnnual}
                          onChange={(e) => setPriceAnnual(parseFloat(e.target.value) || 0)}
                          className="w-full h-9 pl-7 pr-3 rounded-lg border border-border bg-card text-foreground text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="e.g. 1499990"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capacity Quotas Section */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <HardDrive className="size-3.5 text-primary" />
                    <span>Baseline Capacity Constraints</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <FolderKanban className="size-3 text-muted-foreground" />
                        <span>Max Projects</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={maxProjects}
                        onChange={(e) => setMaxProjects(e.target.value)}
                        placeholder="Leave blank for Unlimited"
                        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-[10px] text-muted-foreground">Blank = Unlimited projects</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Users className="size-3 text-muted-foreground" />
                        <span>Max Seats / Users</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={maxSeats}
                        onChange={(e) => setMaxSeats(e.target.value)}
                        placeholder="Leave blank for Unlimited"
                        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-[10px] text-muted-foreground">Blank = Unlimited seats</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <HardDrive className="size-3 text-muted-foreground" />
                        <span>Storage SSD (GB)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={maxStorageGb}
                        onChange={(e) => setMaxStorageGb(e.target.value)}
                        placeholder="Leave blank for Unlimited"
                        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-[10px] text-muted-foreground">Blank = Unlimited storage</p>
                    </div>
                  </div>
                </div>

                {/* Tagline / Description */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <FileText className="size-3 text-muted-foreground" />
                    <span>Plan Description & Positioning</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. For growing general contractors and mid-scale infrastructure developers."
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Feature Matrix */}
            {activeTab === "features" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sliders className="size-4 text-primary" />
                      <span>12 Canonical Platform Features</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure modular runtime capabilities and domain entitlements for this tier.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary font-mono">
                    {Object.values(features).filter(Boolean).length} / {CANONICAL_FEATURES.length} enabled
                  </span>
                </div>

                <div className="rounded-xl border border-border divide-y divide-border/60 bg-card overflow-hidden">
                  {CANONICAL_FEATURES.map((feat) => {
                    const isChecked = Boolean(features[feat.key]);
                    return (
                      <div
                        key={feat.key}
                        onClick={() => handleFeatureToggle(feat.key)}
                        className="p-3.5 flex items-start justify-between gap-4 hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {feat.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {feat.key}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {feat.description}
                          </p>
                        </div>

                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by row onClick
                            className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Version History Tab */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Plan Revision Lineage
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Immutable contract snapshots. Tenants remain pinned to their creation version.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadHistory}
                    disabled={isLoadingHistory}
                    className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted cursor-pointer"
                  >
                    {isLoadingHistory ? "Refreshing…" : "Refresh"}
                  </button>
                </div>

                {isLoadingHistory ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Loading version lineage…
                  </div>
                ) : historyVersions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No version history records found.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Version</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Monthly Price</th>
                          <th className="px-4 py-2.5">Capacity</th>
                          <th className="px-4 py-2.5">Features</th>
                          <th className="px-4 py-2.5">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {historyVersions.map((v) => (
                          <tr key={v.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-mono font-bold text-foreground">
                              v{v.versionNumber}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={v.status} />
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums font-semibold text-foreground">
                              ₹{(Number(v.priceMonthly) / 1000).toLocaleString("en-IN")}k/mo
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {v.maxProjects !== null ? `${v.maxProjects} Proj` : "∞ Proj"} •{" "}
                              {v.maxSeats !== null ? `${v.maxSeats} Seats` : "∞ Seats"} •{" "}
                              {v.maxStorageGb !== null ? `${v.maxStorageGb} GB` : "∞ Storage"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {Object.values(v.features || {}).filter(Boolean).length} enabled
                            </td>
                            <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                              {new Date(v.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-border bg-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 relative z-10">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 order-2 sm:order-1">
            <Clock className="size-3.5 shrink-0" />
            <span>Governance Rule: Global plan changes never silently alter historical tenant contracts.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border bg-card text-foreground font-semibold text-xs hover:bg-muted cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving || isPublishing}
              onClick={handleSaveDraft}
              className="h-9 px-4 rounded-lg border border-border bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Save className="size-3.5" />
              <span>{isSaving ? "Saving…" : "Save Draft"}</span>
            </button>

            <button
              type="button"
              disabled={isSaving || isPublishing}
              onClick={handlePublish}
              className="h-9 px-4.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all disabled:opacity-50"
            >
              <Send className="size-3.5" />
              <span>{isPublishing ? "Publishing…" : "Publish Tier Rules"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
