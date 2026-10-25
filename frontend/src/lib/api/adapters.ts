/**
 * DEZOBUILD — DTO to UI View Model Adapters
 * 
 * Safe transformers converting frozen Backend API DTOs into
 * UI presentation models expected by the approved frontend baseline.
 */

import type {
  ProjectDto,
  MaterialDto,
  StoreDto,
  VendorDto,
  MaterialIndentDto,
  PurchaseOrderDto,
  GoodsReceiptDto,
  MaterialIssueDto,
  ExpenseDto,
  AttendanceRecordDto,
  EmployeeDto,
  EquipmentDto,
  AlertDto,
  EngineeringDocumentDto,
  RfiDto,
} from "./types";

import type {
  Project,
  MaterialItem,
  Vendor,
  Indent,
  PurchaseOrder,
  GrnRecord,
  MaterialIssue,
  ExpenseRecord,
  AttendanceRecord,
  EquipmentAsset,
  SmartAlert,
  DocumentItem,
  RfiRecord,
} from "@/mock/types";

export function adaptProject(dto: ProjectDto): Project {
  const d = dto as Record<string, any>;
  const budget = Number(d["totalBudget"] || d["budget"] || 0);
  const actualCost = Number(d["spentBudget"] || d["actualCost"] || 0);
  const committedCost = Number(d["committedCost"] || 0);
  const progress = Number(d["progress"] || d["progressPercent"] || 0);

  return {
    id: d["id"] || "proj-001",
    name: d["name"] || "Project",
    code: d["code"] || "PRJ",
    client: d["clientName"] || d["client"] || "Client Organization",
    location: d["location"] || `${d["city"] || "Mumbai"}, ${d["state"] || "Maharashtra"}`,
    address: d["address"] || d["location"] || "Site Office",
    city: d["city"] || "Mumbai",
    state: d["state"] || "Maharashtra",
    startDate: d["startDate"] || d["plannedStartDate"] ? new Date(d["startDate"] || d["plannedStartDate"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    targetCompletion: d["targetDate"] || d["plannedEndDate"]
      ? new Date(d["targetDate"] || d["plannedEndDate"]).toISOString().slice(0, 10)
      : d["targetCompletion"] || "2026-12-31",
    status: (d["status"] ? String(d["status"]).toLowerCase() : "active") as any,
    health: (d["health"] ? String(d["health"]).toLowerCase() : "healthy") as any,
    budget,
    actualCost,
    committedCost,
    progress,
    plannedProgress: Number(d["plannedProgress"] || progress),
    manager: d["manager"] || {
      id: "mgr-01",
      name: "Project Manager",
      role: "Project Manager",
      phone: "+91 98765 43210",
      email: "pm@dezobuild.com",
    },
    team: d["team"] || [],
    siteArea: d["siteArea"] || "10,000 sq.ft",
    builtUpArea: d["builtUpArea"] || "45,000 sq.ft",
    description: d["description"] || "",
    criticalIssuesCount: Number(d["criticalIssuesCount"] || 0),
    varianceAmount: actualCost - budget,
    activeWorkersToday: Number(d["activeWorkersToday"] || 0),
    weatherToday: d["weatherToday"] || { condition: "sunny", temp: "32°C" },
  };
}

export function adaptMaterial(dto: MaterialDto): MaterialItem {
  const d = dto as Record<string, any>;
  const currentStock = Number(d["currentStock"] || d["stockLevel"] || 0);
  const minStock = Number(d["reorderLevel"] || d["reorderThreshold"] || d["minStock"] || 0);
  const standardRate = Number(d["unitPrice"] || d["standardRate"] || d["unitRate"] || 0);

  return {
    id: d["id"] || "mat-001",
    code: d["code"] || d["itemCode"] || "MAT",
    name: d["name"] || "Material Item",
    category: (d["category"] || "Consumables") as any,
    unit: d["primaryUom"] || d["unitOfMeasure"] || d["unit"] || "Units",
    currentStock,
    reorderLevel: minStock,
    safetyStock: Number(d["safetyStock"] || minStock / 2),
    unitRate: standardRate,
    totalStockValue: currentStock * standardRate,
    primaryWarehouse: d["primaryWarehouse"] || "Central Store",
    siteAllocations: d["siteAllocations"] || [],
    status: (d["status"] || (currentStock <= minStock ? "attention" : "healthy")) as any,
    specification: d["specifications"] || d["specification"] || "",
  };
}

export function adaptVendor(dto: VendorDto): Vendor {
  const d = dto as Record<string, any>;
  return {
    id: d["id"] || "ven-001",
    name: d["name"] || "Vendor",
    category: d["category"] || "Supplier",
    contactPerson: d["contactPerson"] || "Contact Person",
    phone: d["phone"] || "",
    email: d["email"] || "",
    gstin: d["gstin"] || "",
    address: d["address"] || "",
    rating: Number(d["rating"] || 5.0),
    activePOsCount: Number(d["activePOsCount"] || (Array.isArray(d["purchaseOrders"]) ? d["purchaseOrders"].length : 0)),
    totalBilled: Number(d["totalBilled"] || 0),
    pendingPayment: Number(d["pendingPayment"] || 0),
    status: d["status"] === "INACTIVE" ? "blocked" : "active",
  };
}

export function adaptIndent(dto: MaterialIndentDto): Indent {
  const d = dto as Record<string, any>;
  const rawLines = Array.isArray(d["lines"]) ? d["lines"] : (Array.isArray(d["items"]) ? d["items"] : []);
  return {
    id: d["id"] || "ind-001",
    indentNumber: d["indentNumber"] || d["indentNo"] || `IND-${String(d["id"] || "").slice(0, 6)}`,
    projectId: d["projectId"] || d["project"]?.["id"] || "proj-001",
    projectName: d["project"]?.["name"] || d["projectName"] || "Project",
    requestedBy: d["createdBy"]?.["fullName"] || d["requestedBy"] || "Site Engineer",
    requiredDate: d["requiredByDate"]
      ? new Date(d["requiredByDate"]).toISOString().slice(0, 10)
      : (d["requiredDate"] ? new Date(d["requiredDate"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    priority: (d["priority"] ? String(d["priority"]).toLowerCase() : "normal") as any,
    items: rawLines.map((item: any) => ({
      materialId: item.materialId || item.material?.id || "mat-001",
      materialName: item.material?.name || item.materialName || "Material Item",
      quantity: Number(item.quantityRequested ?? item.quantity ?? item.requestedQty ?? 0),
      unit: item.uom || item.unit || "Units",
      purpose: item.purpose || "Construction activity",
    })),
    status: (d["status"] ? String(d["status"]).toLowerCase() : "submitted") as any,
    createdAt: d["createdAt"] ? new Date(d["createdAt"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    notes: d["remarks"] || d["notes"] || "",
  };
}

export function adaptPurchaseOrder(dto: PurchaseOrderDto): PurchaseOrder {
  const d = dto as Record<string, any>;
  const totalAmount = Number(d["subtotalAmount"] ?? d["totalAmount"] ?? 0);
  const taxAmount = Number(d["taxAmount"] ?? d["taxTotal"] ?? 0);
  const grandTotal = Number(d["grandTotal"] ?? (totalAmount + taxAmount));
  const rawLines = Array.isArray(d["lines"]) ? d["lines"] : (Array.isArray(d["items"]) ? d["items"] : []);

  return {
    id: d["id"] || "po-001",
    poNumber: d["poNumber"] || d["poNo"] || `PO-${String(d["id"] || "").slice(0, 6)}`,
    indentId: d["indentId"],
    projectId: d["projectId"] || d["project"]?.["id"] || "proj-001",
    projectName: d["project"]?.["name"] || d["projectName"] || "Project",
    vendorId: d["vendorId"] || d["vendor"]?.["id"] || "ven-001",
    vendorName: d["vendor"]?.["name"] || d["vendorName"] || "Vendor",
    totalAmount,
    taxAmount,
    grandTotal,
    issueDate: d["createdAt"] ? new Date(d["createdAt"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    expectedDelivery: d["expectedDeliveryDate"]
      ? new Date(d["expectedDeliveryDate"]).toISOString().slice(0, 10)
      : (d["deliveryDate"] ? new Date(d["deliveryDate"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    status: (d["status"] ? String(d["status"]).toLowerCase() : "issued") as any,
    rawStatus: d["status"] || "DRAFT",
    items: rawLines.map((item: any) => ({
      id: item.id,
      materialId: item.materialId || item.material?.id || "mat-001",
      materialName: item.material?.name || item.materialName || "Material Item",
      quantity: Number(item.quantityOrdered ?? item.quantity ?? item.orderedQty ?? 0),
      unit: item.uom || item.unit || "Units",
      rate: Number(item.unitRate ?? item.unitPrice ?? item.rate ?? 0),
      amount: Number(item.lineTotal ?? item.totalAmount ?? item.amount ?? 0),
    })),
    paymentTerms: d["paymentTerms"] || "Net 30",
  };
}

export function adaptGoodsReceipt(dto: GoodsReceiptDto): GrnRecord {
  const d = dto as Record<string, any>;
  const rawLines = Array.isArray(d["lines"]) ? d["lines"] : (Array.isArray(d["items"]) ? d["items"] : []);

  return {
    id: d["id"] || "grn-001",
    grnNumber: d["grnNumber"] || d["grnNo"] || `GRN-${String(d["id"] || "").slice(0, 6)}`,
    poNumber: d["purchaseOrder"]?.["poNumber"] || d["poNo"] || d["poNumber"] || "PO",
    projectId: d["projectId"] || d["project"]?.["id"] || d["purchaseOrder"]?.["projectId"] || "",
    projectName: d["project"]?.["name"] || d["projectName"] || "Project",
    vendorName: d["vendor"]?.["name"] || d["purchaseOrder"]?.["vendor"]?.["name"] || d["vendorName"] || "Vendor",
    challanNumber: d["deliveryChallanNumber"] || d["deliveryChallanNo"] || d["challanNumber"] || "",
    invoiceNumber: d["invoiceNumber"] || "",
    date: d["receiptDate"] ? new Date(d["receiptDate"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    warehouse: d["store"]?.["name"] || d["storeName"] || d["warehouse"] || "Central Store",
    vehicleNo: d["vehicleNumber"] || d["vehicleNo"] || "",
    receivedBy: d["receivedBy"]?.["fullName"] || d["receivedBy"] || "Store Manager",
    items: rawLines.map((item: any) => ({
      materialId: item.materialId || item.material?.id || "mat-001",
      materialName: item.material?.name || item.materialName || "Material Item",
      orderedQty: Number(item.quantityDelivered ?? item.orderedQty ?? 0),
      receivedQty: Number(item.quantityDelivered ?? item.receivedQuantity ?? item.receivedQty ?? 0),
      acceptedQty: Number(item.quantityAccepted ?? item.acceptedQuantity ?? item.acceptedQty ?? 0),
      rejectedQty: Number(item.quantityRejected ?? item.rejectedQuantity ?? item.rejectedQty ?? 0),
      unit: item.uom || item.unit || "Units",
      rejectionReason: item.remarks || item.rejectionReason,
    })),
    status: (d["status"] ? String(d["status"]).toLowerCase() : "verified") as any,
  };
}

export function adaptMaterialIssue(dto: MaterialIssueDto): MaterialIssue {
  const d = dto as Record<string, any>;
  const rawLines = Array.isArray(d["lines"]) ? d["lines"] : (Array.isArray(d["items"]) ? d["items"] : []);
  return {
    id: d["id"] || "iss-001",
    issueNumber: d["issueNumber"] || d["issueNo"] || `ISS-${String(d["id"] || "").slice(0, 6)}`,
    projectId: d["projectId"] || d["project"]?.["id"] || "proj-001",
    projectName: d["project"]?.["name"] || d["projectName"] || "Project",
    activityId: d["wbsActivityId"] || d["wbsNodeId"] || rawLines[0]?.wbsNodeId || "wbs-001",
    activityName: d["wbsActivityName"] || d["wbsNode"]?.["name"] || rawLines[0]?.wbsNode?.name || "General Site Use",
    issuedTo: d["issuedTo"] || d["purpose"] || "Site Supervisor",
    date: d["issueDate"] || d["issuedAt"] ? new Date(d["issueDate"] || d["issuedAt"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    items: rawLines.map((item: any) => ({
      materialId: item.materialId || item.material?.id || "mat-001",
      materialName: item.material?.name || item.materialName || "Material Item",
      quantity: Number(item.quantityIssued ?? item.quantityRequested ?? item.quantity ?? 0),
      unit: item.uom || item.unit || "Units",
    })),
    requisitionNo: d["requisitionNo"] || `REQ-${String(d["id"] || "").slice(0, 4)}`,
    issuedBy: d["issuedBy"]?.["fullName"] || d["issuedBy"] || d["requestedBy"]?.["fullName"] || "Store Keeper",
  };
}

export function adaptExpense(dto: ExpenseDto): ExpenseRecord {
  const d = dto as Record<string, any>;
  return {
    id: d["id"] || "exp-001",
    expenseNumber: d["expenseNumber"] || d["expenseNo"] || `EXP-${String(d["id"] || "").slice(0, 6)}`,
    projectId: d["projectId"] || "proj-001",
    projectName: d["projectName"] || "Project",
    category: (d["category"] || "Miscellaneous") as any,
    amount: Number(d["amount"] || 0),
    vendorContractor: d["vendorContractor"] || d["vendor"] || "Direct Vendor",
    paidBy: d["paidBy"] || d["submittedBy"] || "Staff",
    paymentMode: (d["paymentMode"] ? "Bank Transfer" : "Petty Cash") as any,
    date: d["incurredDate"] ? new Date(d["incurredDate"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    receiptAttached: Boolean(d["receiptUrl"] || d["receiptAttached"]),
    receiptName: d["receiptName"],
    status: (d["status"] ? String(d["status"]).toLowerCase() : "approved") as any,
    notes: d["description"] || d["notes"] || d["remarks"] || "",
  };
}

export function adaptAttendance(dto: AttendanceRecordDto, employee?: EmployeeDto): AttendanceRecord {
  const d = dto as Record<string, any>;
  const totalHours = Number(d["totalHours"] || 8);
  const wageRate = Number(d["wageRate"] || 750);

  return {
    id: d["id"] || "att-001",
    date: d["date"] ? new Date(d["date"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    projectId: d["projectId"] || "proj-001",
    projectName: d["projectName"] || "Project",
    totalWorkforce: Number(d["totalWorkforce"] || 1),
    totalPresent: Number(d["totalPresent"] || (d["status"] === "PRESENT" ? 1 : 0)),
    totalAbsent: Number(d["totalAbsent"] || (d["status"] === "ABSENT" ? 1 : 0)),
    regularHours: totalHours,
    overtimeHours: Number(d["overtimeHours"] || 0),
    totalWageImpact: (totalHours / 8) * wageRate,
    entries: d["entries"] || [
      {
        workerId: d["employeeId"] || "emp-001",
        workerName: employee ? `${employee["firstName"]} ${employee["lastName"]}` : d["workerName"] || "Worker",
        trade: employee?.["designation"] || d["trade"] || "Mason",
        contractorName: d["contractorName"] || "Direct Site Labour",
        status: (d["status"] ? String(d["status"]).toLowerCase() : "present") as any,
        hours: totalHours,
        otHours: Number(d["overtimeHours"] || 0),
        wageRate,
      },
    ],
    submittedBy: d["submittedBy"] || "Site Supervisor",
  };
}

export function adaptEquipment(dto: EquipmentDto): EquipmentAsset {
  const d = dto as Record<string, any>;
  return {
    id: d["id"] || "eq-001",
    assetCode: d["code"] || d["assetCode"] || "EQ-01",
    name: d["name"] || "Equipment",
    type: (d["category"] || d["type"] || "Excavator") as any,
    ownership: (d["ownershipType"] ? (String(d["ownershipType"]).toLowerCase() === "owned" ? "Owned" : "Rented") : "Owned") as any,
    currentSite: d["projectName"] || d["currentSite"] || "Central Yard",
    status: (d["status"] ? String(d["status"]).toLowerCase() : "idle") as any,
    totalOperatingHours: Number(d["totalHoursOperated"] || d["totalOperatingHours"] || 0),
    currentHourMeter: Number(d["currentHourMeter"] || 100),
    fuelEfficiencyLph: Number(d["fuelEfficiencyLph"] || 12),
    hourlyRate: Number(d["hourlyRate"] || 1500),
    nextServiceInHours: Number(d["nextServiceInHours"] || 500),
    lastServiceDate: d["lastMaintenanceDate"] || d["lastServiceDate"] || "2026-08-01",
    operator: d["operator"] || { name: d["operatorName"] || "Primary Operator", phone: d["operatorPhone"] || "+91 98765 00000" },
    monthlyRental: Number(d["monthlyRentalCost"] || d["monthlyRental"] || 0),
  };
}

export function adaptAlert(dto: AlertDto): SmartAlert {
  const d = dto as Record<string, any>;
  return {
    id: d["id"] || "alt-001",
    title: d["title"] || "Alert",
    projectId: d["projectId"] || "proj-001",
    projectName: d["projectName"] || "Project",
    severity: (d["severity"] ? String(d["severity"]).toLowerCase() : "attention") as any,
    category: (d["category"] || "Material") as any,
    problem: d["message"] || d["problem"] || "Identified operational issue",
    rootCause: d["rootCause"] || "Threshold breached in module.",
    impact: d["impact"] || "Potential schedule or cost deviation",
    suggestedAction: d["suggestedAction"] || "Review and take corrective action.",
    sourceRef: d["sourceRef"] || { type: "Module", id: d["entityId"] || "", label: "Details", to: "/alerts" },
    status: (d["status"] ? String(d["status"]).toLowerCase() : "open") as any,
    createdAt: d["createdAt"] ? new Date(d["createdAt"]).toISOString() : new Date().toISOString(),
    history: d["history"] || [],
  };
}

export function adaptDocument(dto: EngineeringDocumentDto): DocumentItem {
  const d = dto as Record<string, any>;
  return {
    id: d["id"] || "doc-001",
    name: d["title"] || d["name"] || "Document",
    type: (d["category"] || "Drawing") as any,
    category: d["category"] || "General",
    projectId: d["projectId"] || "proj-001",
    projectName: d["projectName"] || "Project",
    size: d["size"] || "2.4 MB",
    fileExtension: d["fileExtension"] || "pdf",
    version: d["latestVersionNumber"] ? `v${d["latestVersionNumber"]}` : "v1.0",
    updatedDate: d["updatedAt"] ? new Date(d["updatedAt"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    uploadedBy: d["uploadedBy"] || "Lead Engineer",
    tags: d["tags"] || [],
    status: (d["status"] ? String(d["status"]).toLowerCase() : "active") as any,
  };
}

export function adaptRfi(dto: RfiDto): RfiRecord {
  const d = dto as Record<string, any>;
  return {
    id: d["id"] || "rfi-001",
    projectId: d["projectId"] || "proj-001",
    project: d["projectName"] || "Project",
    rfiNumber: d["rfiNumber"] || `RFI-${String(d["id"] || "").slice(0, 6)}`,
    subject: d["subject"] || "Technical Query",
    technicalQuery: d["technicalQuery"] || d["question"] || "",
    discipline: (d["discipline"] || d["category"] || "Structural") as any,
    raisedBy: d["raisedBy"] || "Site Engineer",
    assignedTo: d["assignedTo"] || "Lead Consultant",
    priority: (d["priority"] ? String(d["priority"]).toLowerCase() : "medium") as any,
    dueDate: d["dueDate"] ? new Date(d["dueDate"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: (d["status"] ? String(d["status"]).toLowerCase() : "open") as any,
    response: d["officialResponse"] || d["response"],
    respondedBy: d["respondedBy"],
    respondedAt: d["respondedAt"] ? new Date(d["respondedAt"]).toISOString().slice(0, 10) : undefined,
    createdAt: d["createdAt"] ? new Date(d["createdAt"]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}
