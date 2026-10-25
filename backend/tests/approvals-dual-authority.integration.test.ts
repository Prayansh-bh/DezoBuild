import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service.js';
import { ApprovalService } from '../src/modules/approvals/services/approval.service.js';
import { ApprovalPolicyService } from '../src/modules/approvals/services/approval-policy.service.js';
import { ApprovalRequestRepository } from '../src/modules/approvals/repositories/approval-request.repository.js';
import { ApprovalPolicyRepository } from '../src/modules/approvals/repositories/approval-policy.repository.js';
import type { ApprovalRequestContext } from '../src/modules/approvals/helpers/approval-context.helper.js';
import { PurchaseOrderService } from '../src/modules/materials/services/purchase-order.service.js';
import { RaBillService } from '../src/modules/finance/services/ra-bill.service.js';
import { InvoiceService } from '../src/modules/finance/services/invoice.service.js';
import { ExpenseService } from '../src/modules/finance/services/expense.service.js';
import { PaymentService } from '../src/modules/finance/services/payment.service.js';
import { DprService } from '../src/modules/projects/services/dpr.service.js';
import { DigitalMbService } from '../src/modules/projects/services/digital-mb.service.js';
import { InspectionService } from '../src/modules/quality/services/inspection.service.js';
import { NcrService } from '../src/modules/quality/services/ncr.service.js';
import { MaterialIndentService } from '../src/modules/materials/services/material-indent.service.js';
import { MaterialIssueService } from '../src/modules/materials/services/material-issue.service.js';
import { MaterialTransferService } from '../src/modules/materials/services/material-transfer.service.js';
import { LeaveService } from '../src/modules/people/services/leave.service.js';
import { RegularizationService } from '../src/modules/people/services/regularization.service.js';
import { MusterService } from '../src/modules/people/services/muster.service.js';
import { RaBillRepository } from '../src/modules/finance/repositories/ra-bill.repository.js';
import { InvoiceRepository } from '../src/modules/finance/repositories/invoice.repository.js';
import { ExpenseRepository } from '../src/modules/finance/repositories/expense.repository.js';
import { PaymentRepository } from '../src/modules/finance/repositories/payment.repository.js';
import { AdvanceRepository } from '../src/modules/finance/repositories/advance.repository.js';
import { RetentionRepository } from '../src/modules/finance/repositories/retention.repository.js';
import { FinanceSequenceRepository } from '../src/modules/finance/repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../src/modules/finance/repositories/finance-audit.repository.js';
import { InspectionRepository } from '../src/modules/quality/repositories/inspection.repository.js';
import { NcrRepository } from '../src/modules/quality/repositories/ncr.repository.js';
import { QualitySafetyAuditRepository } from '../src/modules/quality/repositories/quality-safety-audit.repository.js';
import { ActionRepository } from '../src/modules/quality/repositories/action.repository.js';
import { LeaveRepository } from '../src/modules/people/repositories/leave.repository.js';
import { RegularizationRepository } from '../src/modules/people/repositories/regularization.repository.js';
import { MusterRepository } from '../src/modules/people/repositories/muster.repository.js';
import { EmployeeRepository } from '../src/modules/people/repositories/employee.repository.js';
import { AttendanceRepository } from '../src/modules/people/repositories/attendance.repository.js';
import { ContractorRepository } from '../src/modules/people/repositories/contractor.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';

describe('DEZOBUILD Phase 15 — Dual Approval Authority & Concurrency Audit Suite', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let approvalService: ApprovalService;
  let policyService: ApprovalPolicyService;

  // Domain Services
  let poService: PurchaseOrderService;
  let raBillService: RaBillService;
  let invoiceService: InvoiceService;
  let expenseService: ExpenseService;
  let paymentService: PaymentService;
  let dprService: DprService;
  let digitalMbService: DigitalMbService;
  let inspectionService: InspectionService;
  let ncrService: NcrService;
  let indentService: MaterialIndentService;
  let issueService: MaterialIssueService;
  let transferService: MaterialTransferService;
  let leaveService: LeaveService;
  let regularizationService: RegularizationService;
  let musterService: MusterService;

  const tenantId = 'e1500004-aaaa-0001-aaaa-444444444444';
  const submitterId = 'e1500004-1111-0001-aaaa-444444444444';
  const approverId = 'e1500004-2222-0001-aaaa-444444444444';

  let projectId: string;
  let vendorId: string;
  let storeId: string;
  let destStoreId: string;
  let employeeId: string;
  let contractorId: string;
  let materialId: string;
  let boqItemId: string;
  let expenseCategoryId: string;

  function makeReqCtx(userId: string, permissions: string[] = [], roles: string[] = ['SITE_ENGINEER']): ApprovalRequestContext {
    return {
      tenantId,
      user: {
        id: userId,
        roles,
        permissions,
        projectIds: [projectId],
        storeIds: [storeId, destStoreId],
        isTenantAdmin: true,
      },
    };
  }

  async function cleanupTenant() {
    try {
      await prisma.approvalDecision.deleteMany({ where: { request: { tenantId } } });
      await prisma.approvalStep.deleteMany({ where: { request: { tenantId } } });
      await prisma.approvalRequest.deleteMany({ where: { tenantId } });
      await prisma.approvalPolicyStep.deleteMany({ where: { policy: { tenantId } } });
      await prisma.approvalPolicy.deleteMany({ where: { tenantId } });
      await prisma.purchaseOrderLine.deleteMany({ where: { tenantId } });
      await prisma.purchaseOrder.deleteMany({ where: { tenantId } });
      await prisma.raBill.deleteMany({ where: { tenantId } });
      await prisma.vendorInvoice.deleteMany({ where: { tenantId } });
      await prisma.expenseClaim.deleteMany({ where: { tenantId } });
      await prisma.expenseCategory.deleteMany({ where: { tenantId } });
      await prisma.paymentVoucher.deleteMany({ where: { tenantId } });
      await prisma.dailyProgressReport.deleteMany({ where: { tenantId } });
      await prisma.digitalMbRecord.deleteMany({ where: { tenantId } });
      await prisma.boqItem.deleteMany({ where: { tenantId } });
      await prisma.inspectionChecklistItem.deleteMany({ where: { tenantId } });
      await prisma.inspectionRequest.deleteMany({ where: { tenantId } });
      await prisma.qualitySafetyAction.deleteMany({ where: { tenantId } });
      await prisma.nonConformanceReport.deleteMany({ where: { tenantId } });
      await prisma.materialIndentLine.deleteMany({ where: { tenantId } });
      await prisma.materialIndent.deleteMany({ where: { tenantId } });
      await prisma.materialIssueLine.deleteMany({ where: { tenantId } });
      await prisma.materialIssue.deleteMany({ where: { tenantId } });
      await prisma.materialTransferLine.deleteMany({ where: { tenantId } });
      await prisma.materialTransfer.deleteMany({ where: { tenantId } });
      await prisma.leaveRecord.deleteMany({ where: { tenantId } });
      await prisma.attendanceRecord.deleteMany({ where: { tenantId } });
      await prisma.attendanceRegularization.deleteMany({ where: { tenantId } });
      await prisma.labourMusterRecord.deleteMany({ where: { tenantId } });
      await prisma.labourContractor.deleteMany({ where: { tenantId } });
      await prisma.employee.deleteMany({ where: { tenantId } });
      await prisma.material.deleteMany({ where: { tenantId } });
      await prisma.store.deleteMany({ where: { tenantId } });
      await prisma.vendor.deleteMany({ where: { tenantId } });
      await prisma.projectMember.deleteMany({ where: { tenantId } });
      await prisma.project.deleteMany({ where: { tenantId } });
      await prisma.branch.deleteMany({ where: { tenantId } });
      await prisma.company.deleteMany({ where: { tenantId } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId } });
      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch (_err) {
      // Ignore cleanup error if already removed
    }
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();

    const policyRepo = new ApprovalPolicyRepository(prisma);
    const requestRepo = new ApprovalRequestRepository(prisma);
    policyService = new ApprovalPolicyService(policyRepo, prisma);
    approvalService = new ApprovalService(requestRepo, policyRepo, prisma);

    // Repositories
    const finSeqRepo = new FinanceSequenceRepository(prisma);
    const finAuditRepo = new FinanceAuditRepository(prisma);
    const advanceRepo = new AdvanceRepository(prisma);
    const retentionRepo = new RetentionRepository(prisma);
    const raBillRepo = new RaBillRepository(prisma);
    const invoiceRepo = new InvoiceRepository(prisma);
    const expenseRepo = new ExpenseRepository(prisma);
    const paymentRepo = new PaymentRepository(prisma);

    const qsAuditRepo = new QualitySafetyAuditRepository(prisma);
    const actionRepo = new ActionRepository(prisma);
    const inspectionRepo = new InspectionRepository(prisma);
    const ncrRepo = new NcrRepository(prisma);

    const peopleAuditRepo = new PeopleAuditRepository(prisma);
    const employeeRepo = new EmployeeRepository(prisma);
    const attendanceRepo = new AttendanceRepository(prisma);
    const leaveRepo = new LeaveRepository(prisma);
    const regRepo = new RegularizationRepository(prisma);
    const contractorRepo = new ContractorRepository(prisma);
    const musterRepo = new MusterRepository(prisma);

    // Services
    poService = new PurchaseOrderService();
    raBillService = new RaBillService(prisma, raBillRepo, advanceRepo, retentionRepo, finSeqRepo, finAuditRepo);
    invoiceService = new InvoiceService(prisma, invoiceRepo, advanceRepo, retentionRepo, finSeqRepo, finAuditRepo);
    expenseService = new ExpenseService(prisma, expenseRepo, finSeqRepo, finAuditRepo);
    paymentService = new PaymentService(prisma, paymentRepo, finSeqRepo, finAuditRepo);
    dprService = new DprService();
    digitalMbService = DigitalMbService.getInstance();
    inspectionService = new InspectionService(prisma, inspectionRepo, qsAuditRepo, actionRepo);
    ncrService = new NcrService(prisma, ncrRepo, qsAuditRepo);
    indentService = new MaterialIndentService();
    issueService = new MaterialIssueService();
    transferService = new MaterialTransferService();
    leaveService = new LeaveService(prisma, leaveRepo, employeeRepo, attendanceRepo, peopleAuditRepo);
    regularizationService = new RegularizationService(prisma, regRepo, attendanceRepo, employeeRepo, peopleAuditRepo);
    musterService = new MusterService(prisma, musterRepo, contractorRepo, peopleAuditRepo);

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean previous test data
    await cleanupTenant();

    // 1. Create Tenant & Users
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Phase 15 Dual Authority Audit Corp',
        code: 'TNT-P15-DUAL',
        status: 'ACTIVE',
      },
    });

    const enterprisePlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: enterprisePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.create({
      data: {
        id: submitterId,
        tenantId,
        email: 'submitter.dual@dezobuild.com',
        passwordHash: 'hash',
        fullName: 'Dual Submitter',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: approverId,
        tenantId,
        email: 'approver.dual@dezobuild.com',
        passwordHash: 'hash',
        fullName: 'Dual Approver',
        status: 'ACTIVE',
      },
    });

    const company = await prisma.company.create({
      data: {
        tenantId,
        code: 'COMP-DUAL-01',
        name: 'Dual Audit Corp',
        legalName: 'Dual Audit Pvt Ltd',
        panNumber: 'AAACD2222A',
        gstin: '27AABCA2222A1Z2',
        email: 'workflow@dezobuild.com',
        phone: '9988776655',
        address: '100 Workflow Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });

    await prisma.branch.create({
      data: {
        tenantId,
        companyId: company.id,
        name: 'Central HQ',
        code: 'CHQ-01',
        gstin: '27AABCA2222A1Z2',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });

    const project = await prisma.project.create({
      data: {
        tenantId,
        companyId: company.id,
        name: 'Dual Audit Project Alpha',
        code: 'DAP-01',
        status: 'ACTIVE',
      },
    });
    projectId = project.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        name: 'Dual Test Vendor',
        code: 'VEND-DUAL-01',
      },
    });
    vendorId = vendor.id;

    const store1 = await prisma.store.create({
      data: {
        tenantId,
        projectId,
        name: 'Main Store 1',
        code: 'STR-D01',
      },
    });
    storeId = store1.id;

    const store2 = await prisma.store.create({
      data: {
        tenantId,
        projectId,
        name: 'Main Store 2',
        code: 'STR-D02',
      },
    });
    destStoreId = store2.id;

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        companyId: company.id,
        userId: submitterId,
        employeeNumber: 'EMP-DUAL-01',
        fullName: 'John Doe',
        designation: 'Site Engineer',
        joiningDate: new Date(),
        employmentStatus: 'ACTIVE',
      },
    });
    employeeId = employee.id;

    const contractor = await prisma.labourContractor.create({
      data: {
        tenantId,
        code: 'LC-DUAL-01',
        name: 'Premier Gang',
        trade: 'MASONRY',
      },
    });
    contractorId = contractor.id;

    const material = await prisma.material.create({
      data: {
        tenantId,
        itemCode: 'MAT-DUAL-01',
        name: 'Cement 53 Grade',
        category: 'CEMENT',
        primaryUom: 'BAG',
        status: 'ACTIVE',
      },
    });
    materialId = material.id;

    const boq = await prisma.boqItem.create({
      data: {
        tenantId,
        projectId,
        itemNumber: '1.01',
        description: 'Excavation in hard soil',
        uom: 'CUM',
        quantity: 1000,
        unitRate: 250,
        totalAmount: 250000,
        createdById: submitterId,
      },
    });
    boqItemId = boq.id;

    const expCat = await prisma.expenseCategory.create({
      data: {
        tenantId,
        code: 'CAT-EXP-01',
        name: 'Site Supplies',
      },
    });
    expenseCategoryId = expCat.id;

    // RBAC Role Assignments for Approver
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    if (ownerRole) {
      await prisma.userRoleAssignment.create({
        data: {
          tenantId,
          userId: approverId,
          roleId: ownerRole.id,
        },
      });
    }

    await prisma.projectMember.create({
      data: {
        tenantId,
        projectId,
        userId: approverId,
        projectRole: 'PROJECT_MANAGER',
      },
    });
  });

  after(async () => {
    await cleanupTenant();
    await dbService.disconnect();
  });

  describe('1. Active Central Workflow Interference Matrix across All 15 Subjects', () => {
    // 1. PURCHASE_ORDER
    it('1. blocks legacy PURCHASE_ORDER approval when active central approval exists', async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId,
          projectId,
          vendorId,
          poNumber: 'PO-DUAL-001',
          status: 'SUBMITTED',
          createdById: submitterId,
          submittedById: submitterId,
          expectedDeliveryDate: new Date(),
          grandTotal: 100000,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['materials:po:create'], ['SITE_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'PURCHASE_ORDER',
        entityId: po.id,
        monetaryAmount: 100000,
      });

      await assert.rejects(
        async () => {
          await poService.approvePurchaseOrder(tenantId, approverId, po.id);
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*PURCHASE_ORDER/i,
        }
      );
    });

    // 2. RA_BILL
    it('2. blocks legacy RA_BILL approval when active central approval exists', async () => {
      const bill = await prisma.raBill.create({
        data: {
          tenantId,
          projectId,
          vendorId,
          billNumber: 'RAB-DUAL-001',
          billSequence: 1,
          periodStartDate: new Date(),
          periodEndDate: new Date(),
          billDate: new Date(),
          grossAmount: 250000,
          totalDeductions: 0,
          netPayable: 250000,
          outstandingBalance: 250000,
          status: 'VERIFIED',
          createdById: submitterId,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['finance:bill:create'], ['PROJECT_MANAGER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'RA_BILL',
        entityId: bill.id,
        monetaryAmount: 250000,
      });

      const finCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['finance:bill:approve'] },
      };

      await assert.rejects(
        async () => {
          await raBillService.approveRaBill(finCtx, bill.id, {});
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*RA_BILL/i,
        }
      );
    });

    // 3. VENDOR_INVOICE
    it('3. blocks legacy VENDOR_INVOICE approval when active central approval exists', async () => {
      const inv = await prisma.vendorInvoice.create({
        data: {
          tenantId,
          projectId,
          vendorId,
          invoiceNumber: 'INV-DUAL-001',
          vendorInvoiceNumber: 'VINV-001',
          invoiceDate: new Date(),
          dueDate: new Date(),
          subtotalAmount: 50000,
          taxAmount: 0,
          grossTotal: 50000,
          netPayable: 50000,
          outstandingBalance: 50000,
          status: 'VERIFIED',
          createdById: submitterId,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['finance:bill:create'], ['ACCOUNTANT']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'VENDOR_INVOICE',
        entityId: inv.id,
        monetaryAmount: 50000,
      });

      const finCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['finance:bill:approve'] },
      };

      await assert.rejects(
        async () => {
          await invoiceService.approveInvoice(finCtx, inv.id, {});
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*VENDOR_INVOICE/i,
        }
      );
    });

    // 4. EXPENSE_CLAIM
    it('4. blocks legacy EXPENSE_CLAIM approval when active central approval exists', async () => {
      const claim = await prisma.expenseClaim.create({
        data: {
          tenantId,
          projectId,
          categoryId: expenseCategoryId,
          claimNumber: 'EXP-DUAL-001',
          claimDate: new Date(),
          paidTo: 'Site Safety Supplies Vendor',
          description: 'Site Safety Equipment Purchase',
          amount: 12000,
          status: 'SUBMITTED',
          submittedById: submitterId,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['finance:expense:create'], ['SITE_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'EXPENSE_CLAIM',
        entityId: claim.id,
        monetaryAmount: 12000,
      });

      const finCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['finance:expense:approve'] },
      };

      await assert.rejects(
        async () => {
          await expenseService.approveClaim(finCtx, claim.id, 'Direct Approval Attempt');
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*EXPENSE_CLAIM/i,
        }
      );
    });

    // 5. PAYMENT_VOUCHER
    it('5. blocks legacy PAYMENT_VOUCHER approval when active central approval exists', async () => {
      const voucher = await prisma.paymentVoucher.create({
        data: {
          tenantId,
          projectId,
          voucherNumber: 'PV-DUAL-001',
          paymentDate: new Date(),
          paymentMode: 'BANK_TRANSFER',
          referenceNumber: 'REF-001',
          totalAmount: 150000,
          status: 'DRAFT',
          createdById: submitterId,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['finance:payment:create'], ['ACCOUNTANT']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'PAYMENT_VOUCHER',
        entityId: voucher.id,
        monetaryAmount: 150000,
      });

      const finCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['finance:payment:disburse'] },
      };

      await assert.rejects(
        async () => {
          await paymentService.approveVoucher(finCtx, voucher.id, { approvalRemarks: 'Direct approve' });
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*PAYMENT_VOUCHER/i,
        }
      );
    });

    // 6. DAILY_PROGRESS_REPORT
    it('6. blocks legacy DAILY_PROGRESS_REPORT approval when active central approval exists', async () => {
      const dpr = await prisma.dailyProgressReport.create({
        data: {
          tenantId,
          projectId,
          dprNumber: 'DPR-DUAL-001',
          reportDate: new Date(),
          status: 'SUBMITTED',
          createdById: submitterId,
          submittedById: submitterId,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['projects:dpr:submit'], ['SITE_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'DAILY_PROGRESS_REPORT',
        entityId: dpr.id,
      });

      await assert.rejects(
        async () => {
          await dprService.approveDpr(tenantId, approverId, projectId, dpr.id);
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*DAILY_PROGRESS_REPORT/i,
        }
      );
    });

    // 7. DIGITAL_MB
    it('7. blocks legacy DIGITAL_MB approval when active central approval exists', async () => {
      const mb = await prisma.digitalMbRecord.create({
        data: {
          tenantId,
          projectId,
          boqItemId,
          mbNumber: 'MB-DUAL-001',
          measurementDate: new Date(),
          measurementType: 'DIMENSIONAL',
          location: 'Zone 1',
          currentQuantity: 50,
          status: 'VERIFIED',
          createdById: submitterId,
          submittedById: submitterId,
          verifiedById: approverId,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['projects:dpr:submit'], ['SITE_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'DIGITAL_MB',
        entityId: mb.id,
      });

      await assert.rejects(
        async () => {
          await digitalMbService.approveMeasurement(tenantId, approverId, projectId, mb.id, { allowExcess: false });
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*DIGITAL_MB/i,
        }
      );
    });

    // 8. INSPECTION_REQUEST
    it('8. blocks legacy INSPECTION_REQUEST approval when active central approval exists', async () => {
      const insp = await prisma.inspectionRequest.create({
        data: {
          tenantId,
          projectId,
          inspectionNumber: 'IR-DUAL-001',
          title: 'Foundation Rebar Inspection',
          inspectionType: 'REBAR',
          discipline: 'STRUCTURAL',
          location: 'Grid A1-B3',
          element: 'Footing F1',
          status: 'PENDING_APPROVAL',
          requestedById: submitterId,
          inspectedById: submitterId,
          inspectedAt: new Date(),
          checklistItems: {
            create: [
              {
                tenantId,
                sequenceNumber: 1,
                checkpointCode: 'REBAR-01',
                checkpointCategory: 'Reinforcement',
                checkpointDescription: 'Bar diameter check',
                itemType: 'VISUAL_CHECK',
                isMandatory: true,
                result: 'PASS',
              },
            ],
          },
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['quality:inspection:create'], ['QUALITY_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'INSPECTION_REQUEST',
        entityId: insp.id,
      });

      const qualityCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['quality:inspection:approve'] },
      };

      await assert.rejects(
        async () => {
          await inspectionService.approve(qualityCtx, insp.id, { approvalRemarks: 'Unconditional Pass' });
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*INSPECTION_REQUEST/i,
        }
      );
    });

    // 9. NON_CONFORMANCE_REPORT
    it('9. blocks legacy NON_CONFORMANCE_REPORT closure when active central approval exists', async () => {
      const ncr = await prisma.nonConformanceReport.create({
        data: {
          tenantId,
          projectId,
          ncrNumber: 'NCR-DUAL-001',
          title: 'Concrete Honeycombing at Column C2',
          description: 'Honeycombing discovered after stripping formwork',
          location: 'First Floor Column C2',
          category: 'WORKMANSHIP',
          severity: 'MAJOR',
          status: 'UNDER_VERIFICATION',
          raisedById: submitterId,
          targetClosureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['quality:ncr:create'], ['QUALITY_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'NON_CONFORMANCE_REPORT',
        entityId: ncr.id,
      });

      const qualityCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['quality:ncr:close'] },
      };

      await assert.rejects(
        async () => {
          await ncrService.verifyAndClose(qualityCtx, ncr.id, { closureRemarks: 'Verified remediation' });
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*NON_CONFORMANCE_REPORT/i,
        }
      );
    });

    // 10. MATERIAL_INDENT
    it('10. blocks legacy MATERIAL_INDENT approval when active central approval exists', async () => {
      const indent = await prisma.materialIndent.create({
        data: {
          tenantId,
          projectId,
          indentNumber: 'IND-DUAL-001',
          status: 'SUBMITTED',
          createdById: submitterId,
          submittedById: submitterId,
          requiredByDate: new Date(),
          lines: {
            create: [
              {
                tenantId,
                materialId,
                quantityRequested: 100,
                uom: 'BAG',
              },
            ],
          },
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['materials:indent:create'], ['SITE_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'MATERIAL_INDENT',
        entityId: indent.id,
      });

      await assert.rejects(
        async () => {
          await indentService.approveIndent(tenantId, approverId, indent.id);
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*MATERIAL_INDENT/i,
        }
      );
    });

    // 11. MATERIAL_ISSUE
    it('11. blocks legacy MATERIAL_ISSUE approval when active central approval exists', async () => {
      const issue = await prisma.materialIssue.create({
        data: {
          tenantId,
          projectId,
          storeId,
          issueNumber: 'ISS-DUAL-001',
          issueDate: new Date(),
          status: 'SUBMITTED',
          requestedById: submitterId,
          lines: {
            create: [
              {
                tenantId,
                materialId,
                quantityRequested: 10,
                quantityIssued: 10,
                uom: 'BAG',
              },
            ],
          },
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['materials:issue:create'], ['SITE_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'MATERIAL_ISSUE',
        entityId: issue.id,
      });

      await assert.rejects(
        async () => {
          await issueService.approveMaterialIssue(tenantId, approverId, issue.id);
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*MATERIAL_ISSUE/i,
        }
      );
    });

    // 12. MATERIAL_TRANSFER
    it('12. blocks legacy MATERIAL_TRANSFER approval when active central approval exists', async () => {
      const transfer = await prisma.materialTransfer.create({
        data: {
          tenantId,
          sourceProjectId: projectId,
          destinationProjectId: projectId,
          sourceStoreId: storeId,
          destinationStoreId: destStoreId,
          transferNumber: 'TRN-DUAL-001',
          transferDate: new Date(),
          status: 'SUBMITTED',
          createdById: submitterId,
          lines: {
            create: [
              {
                tenantId,
                materialId,
                quantityTransferred: 20,
                uom: 'BAG',
              },
            ],
          },
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['materials:transfer:create'], ['SITE_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'MATERIAL_TRANSFER',
        entityId: transfer.id,
      });

      await assert.rejects(
        async () => {
          await transferService.approveMaterialTransfer(tenantId, approverId, transfer.id);
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*MATERIAL_TRANSFER/i,
        }
      );
    });

    // 13. LEAVE_RECORD
    it('13. blocks legacy LEAVE_RECORD approval when active central approval exists', async () => {
      const leave = await prisma.leaveRecord.create({
        data: {
          tenantId,
          employeeId,
          leaveType: 'CASUAL',
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-02'),
          totalDays: 2,
          reason: 'Personal leave for family function',
          status: 'SUBMITTED',
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['people:leave:apply'], ['EMPLOYEE']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'LEAVE_RECORD',
        entityId: leave.id,
      });

      const peopleCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['people:leave:approve'] },
      };

      await assert.rejects(
        async () => {
          await leaveService.approveLeave(peopleCtx, leave.id);
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*LEAVE_RECORD/i,
        }
      );
    });

    // 14. ATTENDANCE_REGULARIZATION
    it('14. blocks legacy ATTENDANCE_REGULARIZATION approval when active central approval exists', async () => {
      const reg = await prisma.attendanceRegularization.create({
        data: {
          tenantId,
          employeeId,
          requestedDate: new Date('2026-09-01'),
          requestedStatus: 'PRESENT',
          reason: 'Biometric fingerprint reader failed on site entry',
          status: 'SUBMITTED',
          requestedById: submitterId,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['people:regularization:create'], ['EMPLOYEE']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'ATTENDANCE_REGULARIZATION',
        entityId: reg.id,
      });

      const peopleCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['people:regularization:approve'] },
      };

      await assert.rejects(
        async () => {
          await regularizationService.approveRegularization(peopleCtx, reg.id);
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*ATTENDANCE_REGULARIZATION/i,
        }
      );
    });

    // 15. LABOUR_MUSTER_RECORD
    it('15. blocks legacy LABOUR_MUSTER_RECORD approval when active central approval exists', async () => {
      const muster = await prisma.labourMusterRecord.create({
        data: {
          tenantId,
          projectId,
          contractorId,
          musterDate: new Date('2026-09-01'),
          skilledCount: 10,
          semiSkilledCount: 10,
          unskilledCount: 5,
          supervisorCount: 0,
          totalHeadcount: 25,
          regularHours: 8,
          overtimeHours: 0,
          status: 'SUBMITTED',
          recordedById: submitterId,
        },
      });

      const reqCtx = makeReqCtx(submitterId, ['people:muster:create'], ['SITE_ENGINEER']);
      await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'LABOUR_MUSTER_RECORD',
        entityId: muster.id,
      });

      const peopleCtx = {
        tenantId,
        user: { id: approverId, email: 'app@dezo.com', roles: ['COMPANY_OWNER'], permissions: ['people:muster:approve'] },
      };

      await assert.rejects(
        async () => {
          await musterService.approveMuster(peopleCtx, muster.id);
        },
        {
          name: 'ConflictError',
          message: /Dual Approval Authority Blocked.*LABOUR_MUSTER_RECORD/i,
        }
      );
    });
  });

  describe('2. Concurrent Central Approval Decision vs Legacy Direct Approval', () => {
    it('ensures atomic locking: maximum 1 authority executes, zero split-brain decisions', async () => {
      // 1. Create fresh PO
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId,
          projectId,
          vendorId,
          poNumber: 'PO-CONCUR-001',
          status: 'SUBMITTED',
          createdById: submitterId,
          submittedById: submitterId,
          expectedDeliveryDate: new Date(),
          grandTotal: 50000,
        },
      });

      // 2. Submit Central ApprovalRequest
      const reqCtx = makeReqCtx(submitterId, ['materials:po:create'], ['SITE_ENGINEER']);
      const createdReq = await approvalService.submitForApproval(reqCtx, {
        projectId,
        entityType: 'PURCHASE_ORDER',
        entityId: po.id,
        monetaryAmount: 50000,
      });

      const approverCtx = makeReqCtx(approverId, ['materials:po:approve', 'materials:po:create'], ['COMPANY_OWNER']);

      // 3. Execute Central Approve (Request A) and Legacy Approve (Request B) concurrently
      const results = await Promise.allSettled([
        approvalService.approveStep(approverCtx, createdReq.id, { stepOrder: 1, decisionReason: 'Central Win' }),
        poService.approvePurchaseOrder(tenantId, approverId, po.id),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one succeeds
      assert.equal(fulfilled.length, 1, 'Exactly one approval authority must succeed');
      assert.equal(rejected.length, 1, 'Conflicting approval authority must be rejected');

      // Check DB State
      const updatedPo = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
      assert.equal(updatedPo?.status, 'APPROVED', 'PO must be in APPROVED status');

      const decisions = await prisma.approvalDecision.findMany({ where: { requestId: createdReq.id } });
      assert.equal(decisions.length, 1, 'Exactly 1 authoritative decision written');
    });
  });
});
