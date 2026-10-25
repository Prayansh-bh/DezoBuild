import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service.js';
import { OperationalReportsService } from '../src/modules/reports/services/operational-reports.service.js';
import { AlertRepository } from '../src/modules/alerts/repositories/alert.repository.js';
import { AlertSeverity } from '../src/modules/alerts/constants/alert.constants.js';

describe('DEZOBUILD Phase 16 — Operational Reporting & Source-of-Truth Aggregation Suite', () => {
  const db = DatabaseService.getInstance();
  const prisma = db.getClient();

  let tenantId: string;
  let projectId: string;
  let vendorId: string;
  let storeId: string;
  let materialId: string;
  let reportsService: OperationalReportsService;
  let alertRepo: AlertRepository;

  before(async () => {
    await db.connect();
    reportsService = new OperationalReportsService(prisma);
    alertRepo = new AlertRepository(prisma);

    const timestamp = Date.now();

    // 1. Tenant
    const tenant = await prisma.tenant.create({
      data: {
        code: `RPT-TN-${timestamp}`,
        name: 'Reporting Test Tenant',
        planTier: 'ENTERPRISE',
      },
    });
    tenantId = tenant.id;

    // 2. Company
    const company = await prisma.company.create({
      data: {
        tenantId,
        code: `CMP-RPT-${timestamp}`,
        name: 'Reporting Company',
        legalName: 'Reporting Company Ltd',
        panNumber: 'AAAAA0000A',
        gstin: '27AAAAA0000A1Z5',
        email: 'reportcompany@test.com',
        phone: '9876543210',
        address: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });

    // 3. Project
    const project = await prisma.project.create({
      data: {
        tenantId,
        companyId: company.id,
        code: `PRJ-RPT-${timestamp}`,
        name: 'Metro Line Package 4',
        contractValue: 50000000,
        status: 'ACTIVE',
        plannedStartDate: new Date('2026-01-01'),
        plannedEndDate: new Date('2027-12-31'),
      },
    });
    projectId = project.id;

    // 3. User
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: `reporter-${timestamp}@dezobuild.test`,
        fullName: 'Rita Report Lead',
        passwordHash: 'dummy',
      },
    });

    // 4. Vendor
    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        code: `VEND-RPT-${timestamp}`,
        name: 'Apex Civil Infra Ltd',
        gstin: '27AAAAA0000A1Z5',
        contactPerson: 'Apex Contact',
        email: 'apex@test.com',
        phone: '9876543210',
        address: 'Mumbai',
        status: 'ACTIVE',
      },
    });
    vendorId = vendor.id;

    // 5. Store & Material
    const store = await prisma.store.create({
      data: {
        tenantId,
        projectId,
        code: `STR-RPT-${timestamp}`,
        name: 'Main Site Yard Store',
        storeType: 'PROJECT_SITE',
      },
    });
    storeId = store.id;

    const material = await prisma.material.create({
      data: {
        tenantId,
        itemCode: `MAT-RPT-${timestamp}`,
        name: 'Structural Steel Fe500',
        category: 'STEEL',
        primaryUom: 'MT',
        standardRate: 65000,
        safetyStock: 10,
        reorderLevel: 25,
      },
    });
    materialId = material.id;

    await prisma.storeStockBalance.create({
      data: {
        tenantId,
        storeId,
        materialId,
        quantityOnHand: 8, // Below safetyStock (10)
        reservedQuantity: 2,
      },
    });

    // 6. BOQ Item
    const boqItem = await prisma.boqItem.create({
      data: {
        tenantId,
        projectId,
        itemNumber: 'BOQ-01',
        description: 'Excavation in Hard Rock',
        uom: 'CUM',
        quantity: 1000,
        unitRate: 450,
        totalAmount: 450000,
        status: 'ACTIVE',
        createdById: user.id,
      },
    });

    // 7. Approved MB Record
    await prisma.digitalMbRecord.create({
      data: {
        tenantId,
        projectId,
        boqItemId: boqItem.id,
        mbNumber: `MB-RPT-${timestamp}`,
        measurementDate: new Date(),
        location: 'Main Pier P1',
        currentQuantity: 150,
        previousCumulativeQuantity: 0,
        cumulativeQuantity: 150,
        status: 'APPROVED',
        createdById: user.id,
        approvedById: user.id,
      },
    });

    // 8. Approved RA Bill
    await prisma.raBill.create({
      data: {
        tenantId,
        projectId,
        vendorId,
        billNumber: `RA-RPT-${timestamp}`,
        billSequence: 1,
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
        billDate: new Date('2026-01-31'),
        grossAmount: 300000,
        totalDeductions: 21000,
        netPayable: 279000,
        outstandingBalance: 279000,
        status: 'APPROVED',
        createdById: user.id,
      },
    });

    // 9. Approved Vendor Invoice
    await prisma.vendorInvoice.create({
      data: {
        tenantId,
        projectId,
        vendorId,
        invoiceNumber: `INV-RPT-${timestamp}`,
        vendorInvoiceNumber: `VINV-RPT-${timestamp}`,
        invoiceDate: new Date('2026-02-01'),
        dueDate: new Date('2026-03-01'),
        subtotalAmount: 100000,
        taxAmount: 18000,
        grossTotal: 118000,
        netPayable: 118000,
        paidAmount: 50000,
        outstandingBalance: 68000,
        status: 'APPROVED',
        createdById: user.id,
      },
    });

    // 10. Daily Progress Report
    await prisma.dailyProgressReport.create({
      data: {
        tenantId,
        projectId,
        reportDate: new Date(),
        dprNumber: `DPR-RPT-${timestamp}`,
        weather: 'Sunny',
        generalNotes: 'Normal progress',
        createdById: user.id,
        status: 'APPROVED',
      },
    });

    // 11. Equipment & Operating Log
    const equipment = await prisma.equipment.create({
      data: {
        tenantId,
        companyId: company.id,
        currentProjectId: projectId,
        equipmentCode: `EQ-RPT-${timestamp}`,
        name: 'Hydraulic Excavator EX200',
        category: 'EARTHMOVING',
        equipmentType: 'EXCAVATOR',
        status: 'ASSIGNED',
      },
    });

    await prisma.equipmentOperatingLog.create({
      data: {
        tenantId,
        equipmentId: equipment.id,
        projectId,
        logDate: new Date(),
        startMeter: 1000,
        endMeter: 1008,
        operatingHours: 8,
        idleHours: 1,
        breakdownHours: 0,
        recordedById: user.id,
      },
    });

    // 12. Quality & Safety items
    await prisma.nonConformanceReport.create({
      data: {
        tenantId,
        projectId,
        ncrNumber: `NCR-RPT-${timestamp}`,
        title: 'Rebar spacing deviation',
        description: 'Spacing exceeds 200mm',
        location: 'Pier P3',
        category: 'DIMENSIONAL_DEVIATION',
        severity: 'CRITICAL',
        status: 'OPEN',
        targetClosureDate: new Date('2026-12-31'),
        raisedById: user.id,
      },
    });

    await prisma.safetyIncident.create({
      data: {
        tenantId,
        projectId,
        incidentNumber: `INC-RPT-${timestamp}`,
        occurredAt: new Date(),
        incidentType: 'PROPERTY_DAMAGE',
        severity: 'CRITICAL',
        location: 'Pier P3',
        description: 'Scaffold clamp failure',
        reportedById: user.id,
      },
    });

    // 13. Request For Information (RFI)
    await prisma.requestForInformation.create({
      data: {
        tenantId,
        projectId,
        rfiNumber: `RFI-RPT-${timestamp}`,
        subject: 'Foundation depth revision at Ch. 12+400',
        technicalQuery: 'Confirm bearing capacity rock level',
        priority: 'HIGH',
        status: 'OPEN',
        dueDate: new Date(Date.now() - 24 * 3600 * 1000), // Overdue by 1 day
        raisedById: user.id,
      },
    });

    // 14. Approval Request
    await prisma.approvalRequest.create({
      data: {
        tenantId,
        projectId,
        requestNumber: `APP-RPT-${timestamp}`,
        entityType: 'PURCHASE_ORDER',
        entityId: vendor.id,
        title: 'PO for Ready Mix Concrete',
        status: 'SUBMITTED',
        currentStepOrder: 1,
        totalSteps: 1,
        policySnapshot: {},
        submittedById: user.id,
      },
    });

    // 15. Operational Alert
    await alertRepo.create({
      tenantId,
      projectId,
      alertType: 'MATERIAL_LOW_STOCK',
      severity: AlertSeverity.CRITICAL,
      title: 'Low Stock Alert',
      message: 'Rebar stock is below minimum safety threshold',
      entityType: 'MATERIAL',
      entityId: materialId,
    });
  });

  after(async () => {
    await prisma.alert.deleteMany({ where: { tenantId } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId } });
    await prisma.requestForInformation.deleteMany({ where: { tenantId } });
    await prisma.safetyIncident.deleteMany({ where: { tenantId } });
    await prisma.nonConformanceReport.deleteMany({ where: { tenantId } });
    await prisma.equipmentOperatingLog.deleteMany({ where: { tenantId } });
    await prisma.equipment.deleteMany({ where: { tenantId } });
    await prisma.dailyProgressReport.deleteMany({ where: { tenantId } });
    await prisma.vendorInvoice.deleteMany({ where: { tenantId } });
    await prisma.raBill.deleteMany({ where: { tenantId } });
    await prisma.digitalMbRecord.deleteMany({ where: { tenantId } });
    await prisma.boqItem.deleteMany({ where: { tenantId } });
    await prisma.storeStockBalance.deleteMany({ where: { tenantId } });
    await prisma.store.deleteMany({ where: { tenantId } });
    await prisma.material.deleteMany({ where: { tenantId } });
    await prisma.vendor.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.project.deleteMany({ where: { tenantId } });
    await prisma.company.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await db.disconnect();
  });

  it('1. Project Operational Summary Report', async () => {
    const summary = await reportsService.getProjectSummary(tenantId, { projectId });
    assert.ok(summary.project);
    assert.strictEqual(summary.project.name, 'Metro Line Package 4');
    assert.strictEqual(summary.dprCount, 1);
    assert.strictEqual(Number(summary.certifiedExecutedQuantity), 150);
  });

  it('2. Budget vs Actual Financial Summary Report', async () => {
    const report = await reportsService.getBudgetActualSummary(tenantId, { projectId });
    assert.strictEqual(Number(report.contractAndBoq.totalBoqBudget), 450000);
    assert.strictEqual(Number(report.certifiedContractorBilling.totalGrossBilled), 300000);
    assert.strictEqual(Number(report.certifiedContractorBilling.totalNetPayable), 279000);
    assert.strictEqual(Number(report.procurementInvoices.totalInvoiced), 118000);
    assert.strictEqual(Number(report.procurementInvoices.totalPaid), 50000);
  });

  it('3. Material Consumption & Stock Status Report', async () => {
    const report = await reportsService.getMaterialStockSummary(tenantId, { projectId });
    assert.strictEqual(report.totalStores, 1);
    assert.strictEqual(report.totalTrackedStockItems, 1);
    assert.strictEqual(report.lowStockItemsCount, 1, '1 item below safety threshold');
    assert.strictEqual(report.items[0]?.isBelowSafetyStock, true);
    assert.strictEqual(report.items[0]?.quantityOnHand, 8);
    assert.strictEqual(report.items[0]?.quantityReserved, 2);
    assert.strictEqual(report.items[0]?.quantityAvailable, 6);
  });

  it('4. Equipment Utilization Summary Report', async () => {
    const report = await reportsService.getEquipmentUtilizationSummary(tenantId, { projectId });
    assert.strictEqual(report.totalEquipment, 1);
    assert.strictEqual(report.statusBreakdown['ASSIGNED'], 1);
    assert.strictEqual(Number(report.cumulativeOperatingHours), 8);
  });

  it('5. Quality & Safety Operational Summary Report', async () => {
    const report = await reportsService.getQualitySafetySummary(tenantId, { projectId });
    assert.strictEqual(report.quality.openNcrs, 1);
    assert.strictEqual(report.safety.criticalSafetyIncidents, 1);
  });

  it('6. Pending RFIs Summary Report', async () => {
    const report = await reportsService.getPendingRfiSummary(tenantId, { projectId });
    assert.strictEqual(report.totalRfis, 1);
    assert.strictEqual(report.byStatus['OPEN'], 1);
    assert.strictEqual(report.overdueRfis, 1);
  });

  it('7. Pending Approvals Summary Report', async () => {
    const report = await reportsService.getPendingApprovalsSummary(tenantId, { projectId });
    assert.strictEqual(report.totalPendingApprovalRequests, 1);
    assert.strictEqual(report.pendingByEntityType['PURCHASE_ORDER'], 1);
  });

  it('8. Alerts Operational Summary Report', async () => {
    const report = await reportsService.getAlertsSummary(tenantId, { projectId });
    assert.strictEqual(report.openAlerts, 1);
    assert.strictEqual(report.activeSeverityBreakdown['CRITICAL'], 1);
  });
});
