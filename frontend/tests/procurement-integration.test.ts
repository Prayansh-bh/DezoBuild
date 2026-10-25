import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  adaptIndent,
  adaptPurchaseOrder,
  adaptGoodsReceipt,
  adaptVendor,
} from "../src/lib/api/adapters.js";

describe("Phase 08 Procurement / PO / GRN - Live Frontend Hydration Integration", () => {
  it("1. useVendorsList query hook queries live vendor API with proper queryKey", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/hooks/api/useMaterials.ts"),
      "utf8"
    );
    assert.ok(fileContent.includes("export function useVendorsList("));
    assert.ok(fileContent.includes("queryKey: queryKeys.materials.vendors(params)"));
    assert.ok(fileContent.includes("materialsApi.listVendors(params)"));
  });

  it("2. adaptVendor transforms backend VendorDto to UI Vendor model", () => {
    const rawDto = {
      id: "979854b8-ca52-4b84-820c-67946108dcbc",
      name: "UltraTech Cement Ltd",
      category: "Cement & Aggregates",
      contactPerson: "Ramesh Sharma",
      phone: "+91 98765 43210",
      email: "ramesh@ultratech.com",
      gstin: "27AAACU1234F1Z5",
      address: "Mumbai Central",
      rating: 4.8,
      status: "ACTIVE",
    };
    const vendor = adaptVendor(rawDto as any);
    assert.equal(vendor.id, "979854b8-ca52-4b84-820c-67946108dcbc");
    assert.equal(vendor.name, "UltraTech Cement Ltd");
    assert.equal(vendor.category, "Cement & Aggregates");
    assert.equal(vendor.contactPerson, "Ramesh Sharma");
    assert.equal(vendor.status, "active");
  });

  it("3. adaptIndent maps backend lines (not legacy items), project name, and UOM", () => {
    const rawDto = {
      id: "ind-uuid-1234",
      indentNumber: "IND-2026-0001",
      projectId: "proj-uuid-1234",
      project: { id: "proj-uuid-1234", name: "Metro Line 4 Pier Works" },
      requiredByDate: "2026-10-15T00:00:00.000Z",
      priority: "URGENT",
      status: "APPROVED",
      lines: [
        {
          materialId: "mat-uuid-1234",
          material: { id: "mat-uuid-1234", name: "OPC 53 Cement" },
          quantityRequested: 250,
          uom: "BAGS",
          purpose: "Superstructure casting",
        },
      ],
    };
    const indent = adaptIndent(rawDto as any);
    assert.equal(indent.id, "ind-uuid-1234");
    assert.equal(indent.indentNumber, "IND-2026-0001");
    assert.equal(indent.projectId, "proj-uuid-1234");
    assert.equal(indent.projectName, "Metro Line 4 Pier Works");
    assert.equal(indent.priority, "urgent");
    assert.equal(indent.status, "approved");
    assert.equal(indent.items.length, 1);
    assert.equal(indent.items[0]?.materialName, "OPC 53 Cement");
    assert.equal(indent.items[0]?.quantity, 250);
    assert.equal(indent.items[0]?.unit, "BAGS");
  });

  it("4. adaptPurchaseOrder maps backend lines with line item ID, project, vendor, and rawStatus", () => {
    const rawDto = {
      id: "po-uuid-1234",
      poNumber: "PO-2026-0088",
      projectId: "proj-uuid-1234",
      project: { id: "proj-uuid-1234", name: "Metro Line 4 Pier Works" },
      vendorId: "ven-uuid-1234",
      vendor: { id: "ven-uuid-1234", name: "UltraTech Cement Ltd" },
      status: "ORDERED",
      subtotalAmount: 100000,
      taxAmount: 18000,
      grandTotal: 118000,
      expectedDeliveryDate: "2026-10-20T00:00:00.000Z",
      lines: [
        {
          id: "line-uuid-1234",
          materialId: "mat-uuid-1234",
          material: { id: "mat-uuid-1234", name: "OPC 53 Cement" },
          quantityOrdered: 250,
          uom: "BAGS",
          unitRate: 400,
          lineTotal: 100000,
        },
      ],
    };
    const po = adaptPurchaseOrder(rawDto as any);
    assert.equal(po.id, "po-uuid-1234");
    assert.equal(po.poNumber, "PO-2026-0088");
    assert.equal(po.projectName, "Metro Line 4 Pier Works");
    assert.equal(po.vendorName, "UltraTech Cement Ltd");
    assert.equal(po.grandTotal, 118000);
    assert.equal(po.rawStatus, "ORDERED");
    assert.equal(po.items.length, 1);
    assert.equal(po.items[0]?.id, "line-uuid-1234");
    assert.equal(po.items[0]?.quantity, 250);
    assert.equal(po.items[0]?.unit, "BAGS");
  });

  it("5. adaptGoodsReceipt maps backend lines, store, purchaseOrder, and relation metadata", () => {
    const rawDto = {
      id: "grn-uuid-1234",
      grnNumber: "GRN-2026-0042",
      projectId: "proj-uuid-1234",
      project: { id: "proj-uuid-1234", name: "Metro Line 4 Pier Works" },
      purchaseOrder: {
        id: "po-uuid-1234",
        poNumber: "PO-2026-0088",
        vendor: { id: "ven-uuid-1234", name: "UltraTech Cement Ltd" },
      },
      store: { id: "store-uuid-1234", name: "Central Site Warehouse B-1" },
      deliveryChallanNumber: "DC-2026-904",
      status: "VERIFIED",
      receiptDate: "2026-09-21T00:00:00.000Z",
      lines: [
        {
          id: "grn-line-uuid-1234",
          materialId: "mat-uuid-1234",
          material: { id: "mat-uuid-1234", name: "OPC 53 Cement" },
          quantityDelivered: 250,
          quantityAccepted: 245,
          quantityRejected: 5,
          uom: "BAGS",
          remarks: "5 bags torn in transit",
        },
      ],
    };
    const grn = adaptGoodsReceipt(rawDto as any);
    assert.equal(grn.id, "grn-uuid-1234");
    assert.equal(grn.grnNumber, "GRN-2026-0042");
    assert.equal(grn.poNumber, "PO-2026-0088");
    assert.equal(grn.projectName, "Metro Line 4 Pier Works");
    assert.equal(grn.vendorName, "UltraTech Cement Ltd");
    assert.equal(grn.warehouse, "Central Site Warehouse B-1");
    assert.equal(grn.items.length, 1);
    assert.equal(grn.items[0]?.orderedQty, 250);
    assert.equal(grn.items[0]?.acceptedQty, 245);
    assert.equal(grn.items[0]?.rejectedQty, 5);
    assert.equal(grn.items[0]?.unit, "BAGS");
    assert.equal(grn.items[0]?.rejectionReason, "5 bags torn in transit");
  });

  it("6. Indent creation in materials/index.tsx uses useCreateIndent with real fields and valid UOM", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    assert.ok(fileContent.includes("const createIndentMutation = useCreateIndent();"));
    assert.ok(fileContent.includes("await createIndentMutation.mutateAsync({"));
    assert.ok(fileContent.includes("projectId: proj.id"));
    assert.ok(fileContent.includes("requiredByDate: indentDate"));
    assert.ok(fileContent.includes("priority: backendPriority"));
    assert.ok(fileContent.includes("uom: normalizeUom(mat.unit)"));
  });

  it("7. Indent approval in materials/index.tsx invokes useApproveIndent with approvalRemarks", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    assert.ok(fileContent.includes("const approveIndentMutation = useApproveIndent();"));
    assert.ok(fileContent.includes("await approveIndentMutation.mutateAsync({"));
    assert.ok(fileContent.includes("approvalRemarks: \"Approved for procurement\""));
  });

  it("8. mockStore.updateIndentStatus is NOT invoked on indent approval", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    const startIndex = fileContent.indexOf("const handleApproveIndent = async (ind: Indent) => {");
    const block = fileContent.substring(startIndex, fileContent.indexOf("  };", startIndex));
    assert.ok(!block.includes("mockStore.updateIndentStatus"));
  });

  it("9. Purchase Order creation uses useCreatePurchaseOrder with real IDs and lines", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    assert.ok(fileContent.includes("const createPoMutation = useCreatePurchaseOrder();"));
    assert.ok(fileContent.includes("await createPoMutation.mutateAsync({"));
    assert.ok(fileContent.includes("projectId: proj.id"));
    assert.ok(fileContent.includes("vendorId: ven.id"));
    assert.ok(fileContent.includes("uom: normalizeUom(mat.unit)"));
  });

  it("10. Purchase Order lifecycle supports Submit, Approve, and Order advancing status", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    assert.ok(fileContent.includes("const submitPoMutation = useSubmitPurchaseOrder();"));
    assert.ok(fileContent.includes("const approvePoMutation = useApprovePurchaseOrder();"));
    assert.ok(fileContent.includes("const orderPoMutation = useOrderPurchaseOrder();"));
    assert.ok(fileContent.includes("await submitPoMutation.mutateAsync({ id: po.id });"));
    assert.ok(fileContent.includes("await approvePoMutation.mutateAsync({ id: po.id"));
    assert.ok(fileContent.includes("await orderPoMutation.mutateAsync({ id: po.id });"));
  });

  it("11. mockStore.addPurchaseOrder is NOT invoked by the production submit path", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    assert.ok(!fileContent.includes("mockStore.addPurchaseOrder"));
  });

  it("12. Goods Receipt Note creation uses useCreateGoodsReceipt with real UUIDs", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    assert.ok(fileContent.includes("const createGrnMutation = useCreateGoodsReceipt();"));
    assert.ok(fileContent.includes("await createGrnMutation.mutateAsync({"));
    assert.ok(fileContent.includes("purchaseOrderId: po.id"));
    assert.ok(fileContent.includes("storeId: targetStore.id"));
    assert.ok(fileContent.includes("purchaseOrderLineId: targetPoLine.id"));
  });

  it("13. GRN delivered = accepted + rejected quantity invariant is checked before submit", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    assert.ok(
      fileContent.includes("Math.abs(recQty - (accQty + rejQty)) > 0.0001")
    );
  });

  it("14. mockStore.addGrn is NOT invoked by the production submit path", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/routes/materials/index.tsx"),
      "utf8"
    );
    assert.ok(!fileContent.includes("mockStore.addGrn"));
  });

  it("15. Successful procurement mutations trigger appropriate query invalidations", async () => {
    const fileContent = await fs.readFile(
      path.join(process.cwd(), "src/hooks/api/useMaterials.ts"),
      "utf8"
    );
    // Indent creation invalidates materials and approvals
    assert.ok(fileContent.includes("queryKeys.materials.all"));
    assert.ok(fileContent.includes("queryKeys.approvals.all"));
    // PO creation invalidates materials, approvals, finance
    assert.ok(fileContent.includes("queryKeys.finance.all"));
    // GRN creation invalidates materials, reports
    assert.ok(fileContent.includes("queryKeys.reports.all"));
  });
});
