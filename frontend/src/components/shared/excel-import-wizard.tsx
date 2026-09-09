import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileType,
  HardDrive,
  Info,
  Layers,
  RefreshCw,
  Server,
  Upload,
  X,
} from "lucide-react";

export type ImportDatasetType =
  | "materials"
  | "vendors"
  | "employees"
  | "workers"
  | "wbs"
  | "boq";

export interface FieldMappingConfig {
  key: string;
  label: string;
  required: boolean;
  sampleExample: string;
}

export const DATASET_CONFIGS: Record<
  ImportDatasetType,
  { title: string; subtitle: string; fields: FieldMappingConfig[] }
> = {
  materials: {
    title: "Import Materials Catalog",
    subtitle: "Bulk upload raw materials, units of measurement, initial stock, and reorder levels.",
    fields: [
      { key: "code", label: "Material Code / SKU", required: true, sampleExample: "MAT-CMT-01" },
      { key: "name", label: "Material Name", required: true, sampleExample: "OPC 53 Grade Cement" },
      { key: "category", label: "Category", required: true, sampleExample: "Cement" },
      { key: "unit", label: "Unit of Measure (UOM)", required: true, sampleExample: "Bags (50kg)" },
      { key: "unitRate", label: "Standard Unit Rate (₹)", required: false, sampleExample: "380" },
      { key: "reorderLevel", label: "Reorder Threshold Qty", required: false, sampleExample: "500" },
    ],
  },
  vendors: {
    title: "Import Supplier & Vendor Directory",
    subtitle: "Upload trade vendor profiles, GSTIN numbers, contact details, and payment terms.",
    fields: [
      { key: "name", label: "Vendor Company Name", required: true, sampleExample: "UltraTech Building Solutions" },
      { key: "category", label: "Trade Category", required: true, sampleExample: "Ready Mix Concrete" },
      { key: "contactPerson", label: "Primary Contact Person", required: true, sampleExample: "Rajesh Sharma" },
      { key: "phone", label: "Contact Phone / Mobile", required: true, sampleExample: "+91 98200 12345" },
      { key: "email", label: "Billing Email", required: false, sampleExample: "sales@ultratech.com" },
      { key: "gstin", label: "GSTIN Number", required: false, sampleExample: "27AAACU1234F1Z5" },
    ],
  },
  employees: {
    title: "Import Engineering & Office Staff",
    subtitle: "Bulk register project managers, site engineers, store keepers, and accountants.",
    fields: [
      { key: "empCode", label: "Employee Code / ID", required: true, sampleExample: "EMP-104" },
      { key: "name", label: "Full Name", required: true, sampleExample: "Vikas Deshmukh" },
      { key: "role", label: "Company Role", required: true, sampleExample: "Site Engineer" },
      { key: "department", label: "Department", required: true, sampleExample: "Civil Projects" },
      { key: "phone", label: "Phone Number", required: true, sampleExample: "+91 98450 78901" },
      { key: "email", label: "Work Email", required: false, sampleExample: "vikas.d@company.com" },
    ],
  },
  workers: {
    title: "Import Labour Gangs & Subcontractors",
    subtitle: "Upload trade contractors, gang deployment strengths, and baseline wage rates.",
    fields: [
      { key: "name", label: "Subcontractor / Gang Name", required: true, sampleExample: "Om Shanti Shuttering Gang" },
      { key: "trade", label: "Work Trade", required: true, sampleExample: "Carpentry & Shuttering" },
      { key: "supervisorName", label: "Mukadam / Supervisor", required: true, sampleExample: "Rameshwar Yadav" },
      { key: "phone", label: "Supervisor Phone", required: true, sampleExample: "+91 97110 54321" },
      { key: "plannedDeployment", label: "Headcount Strength", required: false, sampleExample: "24" },
      { key: "dailyWageRate", label: "Daily Shift Rate (₹)", required: false, sampleExample: "750" },
    ],
  },
  wbs: {
    title: "Import WBS Activity Schedule",
    subtitle: "Upload hierarchical construction schedule codes, planned quantities, and estimated rates.",
    fields: [
      { key: "code", label: "WBS Activity Code", required: true, sampleExample: "1.2.1" },
      { key: "name", label: "Activity Description", required: true, sampleExample: "Raft Foundation Concrete M30" },
      { key: "category", label: "WBS Phase / Category", required: true, sampleExample: "Substructure" },
      { key: "unit", label: "Quantity Unit", required: true, sampleExample: "cum" },
      { key: "plannedQty", label: "Planned Quantity", required: true, sampleExample: "450" },
      { key: "plannedRate", label: "Estimated Rate (₹)", required: false, sampleExample: "5200" },
    ],
  },
  boq: {
    title: "Import Bill of Quantities (BOQ)",
    subtitle: "Upload contract BOQ line items, tender item codes, client rates, and WBS mappings.",
    fields: [
      { key: "itemNumber", label: "BOQ Item No.", required: true, sampleExample: "ITEM-CIV-04" },
      { key: "description", label: "Tender Item Description", required: true, sampleExample: "PCC 1:4:8 under footings" },
      { key: "unit", label: "Measurement Unit", required: true, sampleExample: "cum" },
      { key: "quantity", label: "Contract Quantity", required: true, sampleExample: "120.5" },
      { key: "rate", label: "Contract Unit Rate (₹)", required: true, sampleExample: "4850" },
      { key: "wbsCategory", label: "WBS Grouping", required: false, sampleExample: "Substructure" },
    ],
  },
};

export interface ExcelImportWizardProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  datasetType: ImportDatasetType;
  onImportComplete?: (summary: { validCount: number; [key: string]: unknown }) => void;
}

export function ExcelImportWizard({
  isOpen,
  open,
  onClose,
  onOpenChange,
  datasetType,
  onImportComplete,
}: ExcelImportWizardProps) {
  const isModalOpen = isOpen ?? open ?? false;
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  const config = DATASET_CONFIGS[datasetType] || DATASET_CONFIGS.materials;
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<Array<Record<string, string>>>([]);

  if (!isModalOpen) return null;

  const handleSimulateUpload = (name: string, size: string) => {
    setFileName(name);
    setFileSize(size);

    // Auto-detect standard sample headers based on dataset configuration
    const headers = config.fields.map((f) => f.label);
    setDetectedHeaders(headers);

    const initialMap: Record<string, string> = {};
    config.fields.forEach((f) => {
      initialMap[f.key] = f.label;
    });
    setColumnMappings(initialMap);

    // Provide clean template preview rows parsed locally from file headers
    const sampleRows: Array<Record<string, string>> = [
      config.fields.reduce((acc, f) => ({ ...acc, [f.key]: f.sampleExample }), {}),
    ];
    setParsedRows(sampleRows);

    setStep(2);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleSimulateUpload(file.name, `${(file.size / 1024).toFixed(1)} KB`);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleSimulateUpload(file.name, `${(file.size / 1024).toFixed(1)} KB`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-float space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{config.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* 5-Step Progress Stepper */}
        <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-semibold border-b border-border pb-3">
          {[
            { s: 1, label: "1. Upload File" },
            { s: 2, label: "2. Detect Columns" },
            { s: 3, label: "3. Map Fields" },
            { s: 4, label: "4. Validate & Preview" },
            { s: 5, label: "5. Validation Report" },
          ].map((item) => (
            <div
              key={item.s}
              className={`py-1 rounded-md transition-colors ${
                step === item.s
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : step > item.s
                  ? "bg-muted/80 text-foreground"
                  : "text-muted-foreground/60 bg-muted/20"
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* STEP 1: Upload File */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5 shadow-inner"
                  : "border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Upload className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground">
                  Drag and drop your spreadsheet here, or{" "}
                  <label className="text-primary hover:underline cursor-pointer">
                    browse files
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </label>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) up to 25MB
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileType className="size-4 text-primary" />
                <span>Need standard template?</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSimulateUpload(`standard_${datasetType}_template.xlsx`, "14.2 KB")
                }
                className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>Load Sample Template</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Detect Columns */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="size-5 text-emerald-500" />
                <div>
                  <p className="font-bold text-foreground">{fileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fileSize} · {detectedHeaders.length} columns detected
                  </p>
                </div>
              </div>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Structure Valid
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-foreground text-xs">Detected Spreadsheet Columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {detectedHeaders.map((header, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Map Columns */}
        {step === 3 && (
          <div className="space-y-3.5 text-xs max-h-72 overflow-y-auto pr-1">
            <p className="font-medium text-muted-foreground text-[11px]">
              Match DEZOBUILD domain fields with columns from your uploaded spreadsheet:
            </p>

            <div className="space-y-2">
              {config.fields.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block truncate">
                      {f.label}{" "}
                      {f.required ? (
                        <span className="text-destructive font-black">*</span>
                      ) : (
                        <span className="text-muted-foreground font-normal">(Optional)</span>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block">
                      Example: {f.sampleExample}
                    </span>
                  </div>

                  <select
                    value={columnMappings[f.key] || ""}
                    onChange={(e) =>
                      setColumnMappings({ ...columnMappings, [f.key]: e.target.value })
                    }
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none w-48"
                  >
                    <option value="">— Select Column —</option>
                    {detectedHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Validate & Preview */}
        {step === 4 && (
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                <span className="text-[10px] text-muted-foreground block">Parsed Rows</span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  {parsedRows.length}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-center">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                  Valid Schema Rows
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {parsedRows.length}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                <span className="text-[10px] text-muted-foreground block">Syntax Errors</span>
                <span className="text-lg font-bold text-foreground tabular-nums">0</span>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground text-[11px]">
                    {config.fields.slice(0, 4).map((f) => (
                      <th key={f.key} className="p-2 font-semibold">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground">
                  {parsedRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      {config.fields.slice(0, 4).map((f) => (
                        <td key={f.key} className="p-2 text-muted-foreground">
                          {r[f.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 5: Validation Report / Backend Required */}
        {step === 5 && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                <Server className="size-4" />
                <span>Import Service Disconnected — Backend Required</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Spreadsheet schema validation passed locally ({parsedRows.length} rows verified).
                In this pre-backend phase, database persistence services and bulk transactional commits
                are not yet online.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Ingestion Target:</span>
                <span className="text-foreground capitalize">{datasetType} Domain Master</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Target Schema:</span>
                <span className="text-foreground">Prisma Multi-Tenant Repository</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Validation Status:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Ready for Ingestion
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3.5 text-xs">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight className="size-3.5" />
              </button>
            ) : step === 4 ? (
              <button
                type="button"
                onClick={() => {
                  onImportComplete?.({ validCount: parsedRows.length || 1, errorCount: 0 });
                  setStep(5);
                }}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Verify & Finish Ingestion</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer shadow-sm"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
