/**
 * DEZOBUILD Engineering & Financial Calculation Layer
 * 
 * Provides pure mathematical utility functions for construction accounting,
 * measurement quantities, fleet telematics, earned value management, and readiness scoring.
 * Keeps logic strictly decoupled from UI rendering.
 */

// 1. Digital Measurement Book (MB) Quantity Calculation
export interface MeasurementDimensions {
  length?: number;
  breadth?: number;
  depth?: number;
  quantityFactor?: number;
}

export function calculateMeasurementQuantity(
  method: "L_B_D" | "L_B" | "L" | "AREA" | "VOLUME" | "COUNT" | "WEIGHT" | "CUSTOM",
  dims: MeasurementDimensions
): number {
  const factor = dims.quantityFactor ?? 1;
  const l = dims.length ?? 0;
  const b = dims.breadth ?? 1;
  const d = dims.depth ?? 1;

  switch (method) {
    case "L_B_D":
    case "VOLUME":
      return (dims.length ?? 0) * (dims.breadth ?? 0) * (dims.depth ?? 0) * factor;
    case "L_B":
    case "AREA":
      return (dims.length ?? 0) * (dims.breadth ?? 0) * factor;
    case "L":
      return l * factor;
    case "COUNT":
    case "WEIGHT":
    case "CUSTOM":
      return factor;
    default:
      return (dims.length ?? 0) * (dims.breadth ?? 1) * (dims.depth ?? 1) * factor;
  }
}

// 2. Contractor RA Bill Calculation
export interface RaBillCalculationParams {
  grossAmount: number;
  retentionPercent: number; // e.g., 5 for 5%
  advanceRecoveryAmount: number;
  tdsPercent: number; // e.g., 2 for 2%
  labourCessPercent: number; // e.g., 1 for 1%
  otherDeductions: number;
}

export interface RaBillCalculationResult {
  grossAmount: number;
  retentionAmount: number;
  advanceRecoveryAmount: number;
  tdsAmount: number;
  labourCessAmount: number;
  otherDeductions: number;
  totalDeductions: number;
  netPayable: number;
}

export function calculateRaBillDeductions(params: RaBillCalculationParams): RaBillCalculationResult {
  const gross = Math.max(0, params.grossAmount);
  const retention = (gross * Math.max(0, params.retentionPercent)) / 100;
  const advance = Math.max(0, params.advanceRecoveryAmount);
  const tds = (gross * Math.max(0, params.tdsPercent)) / 100;
  const labourCess = (gross * Math.max(0, params.labourCessPercent)) / 100;
  const other = Math.max(0, params.otherDeductions);

  const totalDeductions = retention + advance + tds + labourCess + other;
  const netPayable = Math.max(0, gross - totalDeductions);

  return {
    grossAmount: gross,
    retentionAmount: retention,
    advanceRecoveryAmount: advance,
    tdsAmount: tds,
    labourCessAmount: labourCess,
    otherDeductions: other,
    totalDeductions,
    netPayable,
  };
}

// 3. Client Billing Calculation (with GST)
export interface ClientBillParams {
  cumulativeWorkValue: number;
  previousCertifiedValue: number;
  retentionPercent: number;
  gstPercent: number; // e.g., 18 for 18%
  otherDeductions: number;
}

export interface ClientBillResult {
  currentWorkValue: number;
  retentionAmount: number;
  deductionsAmount: number;
  taxableClaim: number;
  gstAmount: number;
  netClaim: number;
}

export function calculateClientBill(params: ClientBillParams): ClientBillResult {
  const currentWork = Math.max(0, params.cumulativeWorkValue - params.previousCertifiedValue);
  const retention = (currentWork * Math.max(0, params.retentionPercent)) / 100;
  const deductions = retention + Math.max(0, params.otherDeductions);
  const taxable = Math.max(0, currentWork - deductions);
  const gst = (taxable * Math.max(0, params.gstPercent)) / 100;
  const netClaim = taxable + gst;

  return {
    currentWorkValue: currentWork,
    retentionAmount: retention,
    deductionsAmount: deductions,
    taxableClaim: taxable,
    gstAmount: gst,
    netClaim,
  };
}

// 4. Project Commercials & Profitability
export interface ProjectProfitabilityParams {
  contractValue: number;
  budgetCost: number;
  committedCost: number;
  actualCost: number;
}

export interface ProjectProfitabilityResult {
  contractValue: number;
  actualCost: number;
  committedCost: number;
  projectedFinalCost: number;
  currentProfit: number;
  projectedProfit: number;
  currentMarginPercent: number;
  projectedMarginPercent: number;
  costVariance: number;
}

export function calculateProjectProfitability(params: ProjectProfitabilityParams): ProjectProfitabilityResult {
  const contract = Math.max(0, params.contractValue);
  const actual = Math.max(0, params.actualCost);
  const committed = Math.max(0, params.committedCost);
  const budget = Math.max(0, params.budgetCost);

  // Projected cost = actual + committed (or budget if higher)
  const projectedFinalCost = Math.max(actual + committed, actual, budget);
  const currentProfit = contract - actual;
  const projectedProfit = contract - projectedFinalCost;

  const currentMargin = contract > 0 ? (currentProfit / contract) * 100 : 0;
  const projectedMargin = contract > 0 ? (projectedProfit / contract) * 100 : 0;
  const costVariance = actual - budget;

  return {
    contractValue: contract,
    actualCost: actual,
    committedCost: committed,
    projectedFinalCost,
    currentProfit,
    projectedProfit,
    currentMarginPercent: currentMargin,
    projectedMarginPercent: projectedMargin,
    costVariance,
  };
}

// 5. Estimate at Completion (EAC) / Earned Value
export interface EacParams {
  budgetAtCompletion?: number | undefined; // BAC
  actualCostToDate?: number | undefined; // AC
  actualCost?: number | undefined;
  earnedValue?: number | undefined; // EV (Budget * % Complete)
  plannedValue?: number | undefined;
}

export function calculateEac(params: EacParams): {
  budgetAtCompletion: number;
  estimateAtCompletion: number;
  eac: number;
  varianceAtCompletion: number;
  vac: number;
  cpi: number; // Cost Performance Index
} {
  const bac = Math.max(0, params.budgetAtCompletion ?? 0);
  const ac = Math.max(0, params.actualCost ?? params.actualCostToDate ?? 0);
  const ev = Math.max(0, params.earnedValue ?? 0);

  const cpi = ac > 0 ? ev / ac : 1.0;
  const eac = cpi > 0 ? bac / cpi : bac;
  const vac = bac - eac;

  return {
    budgetAtCompletion: bac,
    estimateAtCompletion: eac,
    eac,
    varianceAtCompletion: vac,
    vac,
    cpi,
  };
}

// 6. Material Consumption & Variance
export interface MaterialVarianceParams {
  workOutputDone?: number | undefined;
  standardNormPerUnit?: number | undefined;
  actualIssuedQuantity?: number | undefined;
  standardConsumption?: number | undefined;
  actualIssued?: number | undefined;
  unitRate?: number | undefined;
}

export function calculateMaterialVariance(params: MaterialVarianceParams): {
  theoreticalStandard: number;
  actualIssued: number;
  varianceQuantity: number;
  variancePercent: number;
  isExcessiveWastage: boolean; // Flagged if > 5% allowable wastage
  isLeakageWarning: boolean;
  financialImpact: number;
} {
  const theoretical =
    params.standardConsumption !== undefined
      ? params.standardConsumption
      : (params.workOutputDone ?? 0) * (params.standardNormPerUnit ?? 1);
  const actual =
    params.actualIssued !== undefined
      ? params.actualIssued
      : (params.actualIssuedQuantity ?? 0);
  const rate = params.unitRate ?? 0;

  const varianceQty = actual - theoretical;
  const variancePct = theoretical > 0 ? (varianceQty / theoretical) * 100 : 0;
  const isExcessive = variancePct > 5.0;
  const financialImpact = Math.max(0, varianceQty * rate);

  return {
    theoreticalStandard: theoretical,
    actualIssued: actual,
    varianceQuantity: varianceQty,
    variancePercent: variancePct,
    isExcessiveWastage: isExcessive,
    isLeakageWarning: isExcessive,
    financialImpact,
  };
}

// 7. Equipment Fleet Telematics & Hourly Cost
export interface EquipmentCostParams {
  operatingHours: number;
  availableHours: number;
  fuelCost: number;
  operatorCost: number;
  maintenanceCost: number;
  rentalOrDepreciationCost: number;
}

export function calculateEquipmentCost(params: EquipmentCostParams): {
  utilizationPercent: number;
  totalOperatingCost: number;
  costPerHour: number;
} {
  const opHours = Math.max(0, params.operatingHours);
  const availHours = Math.max(0, params.availableHours);
  const utilization = availHours > 0 ? Math.min(100, (opHours / availHours) * 100) : 0;

  const totalCost =
    Math.max(0, params.fuelCost) +
    Math.max(0, params.operatorCost) +
    Math.max(0, params.maintenanceCost) +
    Math.max(0, params.rentalOrDepreciationCost);

  const costPerHour = opHours > 0 ? totalCost / opHours : 0;

  return {
    utilizationPercent: utilization,
    totalOperatingCost: totalCost,
    costPerHour,
  };
}

// 8. Workforce Productivity
export interface WorkforceProductivityParams {
  outputQuantityAchieved: number;
  manDaysExpended: number;
  standardNormOutputPerManDay: number;
}

export function calculateWorkforceProductivity(params: WorkforceProductivityParams): {
  actualOutputPerManDay: number;
  standardNorm: number;
  productivityIndex: number; // actual / standard (> 1.0 is ahead)
  variancePercent: number;
} {
  const output = Math.max(0, params.outputQuantityAchieved);
  const manDays = Math.max(0, params.manDaysExpended);
  const standard = Math.max(0, params.standardNormOutputPerManDay);

  const actualPerManDay = manDays > 0 ? output / manDays : 0;
  const index = standard > 0 ? actualPerManDay / standard : 1.0;
  const variance = standard > 0 ? ((actualPerManDay - standard) / standard) * 100 : 0;

  return {
    actualOutputPerManDay: actualPerManDay,
    standardNorm: standard,
    productivityIndex: index,
    variancePercent: variance,
  };
}

// 9. Work Readiness Composite Score
export interface ReadinessFactors {
  materialReady?: boolean | undefined;
  gangsMobilized?: boolean | undefined;
  drawingsGfcAvailable?: boolean | undefined;
  approvalsCleared?: boolean | undefined;
  equipmentReady?: boolean | undefined;
  materialStockAvailable?: boolean | undefined;
  labourMobilizedPercent?: number | undefined;
  equipmentReadyPercent?: number | undefined;
  drawingsApproved?: boolean | undefined;
  permitsStatutoryClear?: boolean | undefined;
}

export function calculateWorkReadiness(factors: ReadinessFactors): {
  score: number; // 0 to 100%
  readinessScore: number;
  status: "ready" | "at_risk" | "blocked";
  blockedReasons: string[];
} {
  const items = [
    {
      ready:
        factors.materialReady ??
        factors.materialStockAvailable ??
        true,
      label: "Materials not available on site",
    },
    {
      ready:
        factors.gangsMobilized ??
        (factors.labourMobilizedPercent !== undefined ? factors.labourMobilizedPercent >= 50 : true),
      label: "Labour gang not mobilized",
    },
    {
      ready:
        factors.drawingsGfcAvailable ??
        factors.drawingsApproved ??
        true,
      label: "GFC drawings not released",
    },
    {
      ready:
        factors.approvalsCleared ??
        factors.permitsStatutoryClear ??
        true,
      label: "Work permit / approvals pending",
    },
    {
      ready:
        factors.equipmentReady ??
        (factors.equipmentReadyPercent !== undefined ? factors.equipmentReadyPercent >= 50 : true),
      label: "Required machinery unavailable",
    },
  ];

  const readyCount = items.filter((i) => i.ready).length;
  const score = Math.round((readyCount / items.length) * 100);
  const blockedReasons = items.filter((i) => !i.ready).map((i) => i.label);

  const status: "ready" | "at_risk" | "blocked" =
    score === 100 ? "ready" : score >= 60 ? "at_risk" : "blocked";

  return {
    score,
    readinessScore: score,
    status,
    blockedReasons,
  };
}

// Aliases for compatibility
export const calculateEarnedValueEAC = calculateEac;
export const calculateWorkReadinessScore = calculateWorkReadiness;

export function calculateEquipmentUtilization(operatingHours: number, availableHours: number): {
  utilizationPercent: number;
  idleHours: number;
  operatingHours: number;
} {
  const op = Math.max(0, operatingHours);
  const avail = Math.max(0, availableHours);
  const idle = Math.max(0, avail - op);
  const pct = avail > 0 ? Math.min(100, (op / avail) * 100) : 0;
  return {
    utilizationPercent: pct,
    idleHours: idle,
    operatingHours: op,
  };
}

export function calculateEquipmentHourlyCost(
  operatingHours: number,
  fuelCost: number = 0,
  operatorCost: number = 0,
  maintenanceCost: number = 0,
  rentalCost: number = 0
): {
  totalOperatingCost: number;
  hourlyCost: number;
  costPerHour: number;
} {
  const op = Math.max(0, operatingHours);
  const total = Math.max(0, fuelCost) + Math.max(0, operatorCost) + Math.max(0, maintenanceCost) + Math.max(0, rentalCost);
  const hourly = op > 0 ? total / op : 0;
  return {
    totalOperatingCost: total,
    hourlyCost: hourly,
    costPerHour: hourly,
  };
}

