import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { SchedulesController } from '../src/modules/equipment/controllers/schedules.controller.js';
import { WorkOrdersController } from '../src/modules/equipment/controllers/work-orders.controller.js';
import { MaintenanceService } from '../src/modules/equipment/services/maintenance.service.js';
import { EquipmentRepository } from '../src/modules/equipment/repositories/equipment.repository.js';
import { MaintenanceScheduleRepository } from '../src/modules/equipment/repositories/maintenance-schedule.repository.js';
import { WorkOrderRepository } from '../src/modules/equipment/repositories/work-order.repository.js';
import { EquipmentAuditRepository } from '../src/modules/equipment/repositories/equipment-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 12 — Maintenance Schedules & Work Orders Integration Suite', () => {
  let dbService: DatabaseService;
  let schedulesController: SchedulesController;
  let workOrdersController: WorkOrdersController;
  let maintenanceService: MaintenanceService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee120005-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee120005-1111-0001-aaaa-111111111111';
  const pmAId = 'ee120005-2222-0001-aaaa-111111111111';
  const viewerAId = 'ee120005-3333-0001-aaaa-111111111111';

  const tenantBId = 'ee120005-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'ee120005-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let projectAId: string;
  let vendorAId: string;
  let equipmentId: string;

  function createAuthReq(
    token: string,
    options?: { body?: unknown; params?: Record<string, string>; query?: Record<string, string> }
  ): IncomingMessage {
    return {
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: options?.body || {},
      params: options?.params || {},
      query: options?.query || {},
    } as unknown as IncomingMessage;
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();

    const auditRepo = new EquipmentAuditRepository(prisma);
    const equipmentRepo = new EquipmentRepository(prisma);
    const scheduleRepo = new MaintenanceScheduleRepository(prisma);
    const workOrderRepo = new WorkOrderRepository(prisma);
    maintenanceService = new MaintenanceService(prisma, equipmentRepo, scheduleRepo, workOrderRepo, auditRepo);
    schedulesController = new SchedulesController(maintenanceService);
    workOrdersController = new WorkOrdersController(maintenanceService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.equipmentAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.maintenanceWorkOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.maintenanceSchedule.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Setup Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'Apex Infrastructure Corp',
        code: 'APEX_EQ_MAINT_A',
        status: 'ACTIVE',
      },
    });

    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'APEX_HQ',
        name: 'Apex HQ',
        legalName: 'Apex Infrastructure Ltd',
        gstin: '27AAAAA0000A1Z5',
        panNumber: 'AAAAA0000A',
        email: 'hq@apex.com',
        phone: '9999999991',
        address: '100 Apex Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyAId = companyA.id;

    const projectA = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJ-MUM-BRIDGES',
        name: 'Thane Creek Bridge Expansion',
        status: 'ACTIVE',
      },
    });
    projectAId = projectA.id;

    const vendorA = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        code: 'VEND_JCB_SERVICE',
        name: 'JCB Authorized Service Station',
      },
    });
    vendorAId = vendorA.id;

    await prisma.user.createMany({
      data: [
        {
          id: ownerAId,
          tenantId: tenantAId,
          email: 'owner@apex.com',
          fullName: 'Apex Owner',
          passwordHash: 'dummy',
        },
        {
          id: pmAId,
          tenantId: tenantAId,
          email: 'pm@apex.com',
          fullName: 'Apex Project Manager',
          passwordHash: 'dummy',
        },
        {
          id: viewerAId,
          tenantId: tenantAId,
          email: 'viewer@apex.com',
          fullName: 'Apex Auditor',
          passwordHash: 'dummy',
        },
      ],
    });

    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole!.id },
        { tenantId: tenantAId, userId: viewerAId, roleId: viewerRole!.id },
      ],
    });

    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: entPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'session-own-a',
      sessionVersion: 1,
    });

    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'session-pm-a',
      sessionVersion: 1,
    });

    tokenViewerA = tokenService.createAccessToken({
      userId: viewerAId,
      tenantId: tenantAId,
      sessionId: 'session-view-a',
      sessionVersion: 1,
    });

    const eq = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'BHL-JCB-3DX',
        name: 'JCB 3DX Super Backhoe Loader',
        category: 'EARTHMOVING',
        equipmentType: 'Backhoe Loader',
        meterType: 'HOURS',
        currentMeterReading: 500.0,
        status: 'AVAILABLE',
      },
    });
    equipmentId = eq.id;

    // Setup Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Beta Builders Ltd',
        code: 'BETA_EQ_MAINT_B',
        status: 'ACTIVE',
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: entPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner@beta.com',
        fullName: 'Beta Owner',
        passwordHash: 'dummy',
      },
    });

    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: ownerBId, roleId: ownerRole!.id },
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'session-own-b',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  let createdScheduleId: string;
  let pmWorkOrderId: string;
  let breakdownWorkOrderId: string;

  it('1. should create a preventive maintenance schedule with 250 hour and 90 day intervals', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { id: equipmentId },
      body: {
        title: '250-Hour Engine & Hydraulic Service',
        maintenanceType: 'PREVENTIVE',
        intervalMeterHours: 250.0,
        intervalDays: 90,
        description: 'Engine oil, oil filter, primary fuel filter and hydraulic return filter replacement',
      },
    });

    const res = await schedulesController.createSchedule(req);
    assert.strictEqual(res.success, true);
    const sch = res.data as any;
    assert.strictEqual(sch.title, '250-Hour Engine & Hydraulic Service');
    assert.strictEqual(Number(sch.intervalMeterHours), 250.0);
    assert.strictEqual(sch.intervalDays, 90);
    assert.strictEqual(Number(sch.nextDueMeter), 750.0); // 500 initial + 250
    createdScheduleId = sch.id;
  });

  it('2. should list maintenance schedules for equipment', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { id: equipmentId },
    });

    const res = await schedulesController.listSchedules(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.items.length, 1);
    assert.strictEqual(data.items[0].id, createdScheduleId);
  });

  it('3. should create a PREVENTIVE maintenance work order linked to schedule', async () => {
    const req = createAuthReq(tokenPmA, {
      body: {
        equipmentId,
        projectId: projectAId,
        scheduleId: createdScheduleId,
        workOrderNumber: 'WO-PM-2026-001',
        category: 'PREVENTIVE',
        priority: 'MEDIUM',
        serviceProviderType: 'VENDOR',
        serviceVendorId: vendorAId,
        technicianName: 'Sanjay Verma',
        technicianPhone: '9876500112',
      },
    });

    const res = await workOrdersController.createWorkOrder(req);
    assert.strictEqual(res.success, true);
    const wo = res.data as any;
    assert.strictEqual(wo.workOrderNumber, 'WO-PM-2026-001');
    assert.strictEqual(wo.category, 'PREVENTIVE');
    assert.strictEqual(wo.status, 'OPEN');
    pmWorkOrderId = wo.id;
  });

  it('4. should create a BREAKDOWN work order, atomically updating Equipment.status to BREAKDOWN', async () => {
    const req = createAuthReq(tokenPmA, {
      body: {
        equipmentId,
        projectId: projectAId,
        workOrderNumber: 'WO-BD-2026-001',
        category: 'BREAKDOWN',
        priority: 'CRITICAL',
        breakdownStartAt: new Date().toISOString(),
        symptoms: 'Main hydraulic cylinder burst during digging, high oil leakage',
      },
    });

    const res = await workOrdersController.createWorkOrder(req);
    assert.strictEqual(res.success, true);
    const wo = res.data as any;
    assert.strictEqual(wo.category, 'BREAKDOWN');
    breakdownWorkOrderId = wo.id;

    // Verify Equipment status changed to BREAKDOWN
    const eq = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    assert.strictEqual(eq.status, 'BREAKDOWN');

    // Verify Audit
    const audits = await prisma.equipmentAuditLog.findMany({
      where: { tenantId: tenantAId, equipmentId, action: 'BREAKDOWN_REPORT' },
    });
    assert.strictEqual(audits.length, 1);
  });

  it('5. should complete the BREAKDOWN work order: record operational costs, downtime hours and restore Equipment.status to AVAILABLE', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: breakdownWorkOrderId },
      body: {
        workDone: 'Replaced main boom hydraulic seal kit and hose assembly. Flushed and topped hydraulic oil (40L). Tested under load.',
        breakdownEndAt: new Date().toISOString(),
        downtimeHours: 6.5,
        meterReadingAtService: 520.0,
        partsReplacedSummary: 'Hydraulic Seal Kit (Part #JCB-5544), High Pressure Hose 1-inch (2m)',
        labourCost: 3500.0,
        partsCost: 8200.0,
        vendorServiceCost: 0.0,
        totalCost: 11700.0,
      },
    });

    const res = await workOrdersController.completeWorkOrder(req);
    assert.strictEqual(res.success, true);
    const completedWo = res.data as any;
    assert.strictEqual(completedWo.status, 'COMPLETED');
    assert.strictEqual(Number(completedWo.downtimeHours), 6.5);
    assert.strictEqual(Number(completedWo.totalCost), 11700.0);

    // Verify Equipment restored to AVAILABLE and meter updated
    const eq = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    assert.strictEqual(eq.status, 'AVAILABLE');
    assert.strictEqual(Number(eq.currentMeterReading), 520.0);
  });

  it('6. should complete PREVENTIVE work order and advance next due dates on linked schedule', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: pmWorkOrderId },
      body: {
        workDone: 'Complete 250hr service executed by JCB authorized engineer. All filters and fluids replaced.',
        meterReadingAtService: 750.0,
        labourCost: 2000.0,
        partsCost: 6500.0,
        vendorServiceCost: 3000.0,
        totalCost: 11500.0,
      },
    });

    const res = await workOrdersController.completeWorkOrder(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual((res.data as any).status, 'COMPLETED');

    // Verify MaintenanceSchedule updated
    const sch = await prisma.maintenanceSchedule.findUnique({ where: { id: createdScheduleId } });
    assert.strictEqual(Number(sch.lastCompletedMeter), 750.0);
    assert.strictEqual(Number(sch.nextDueMeter), 1000.0); // 750 + 250
    assert.ok(sch.lastCompletedDate !== null);
    assert.ok(sch.nextDueDate !== null);
  });

  it('7. should reject duplicate completion on already COMPLETED work order (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: pmWorkOrderId },
      body: {
        workDone: 'Trying to complete again',
      },
    });

    await assert.rejects(async () => workOrdersController.completeWorkOrder(req), BadRequestError);
  });

  it('8. should list work orders with category and status filters', async () => {
    const req = createAuthReq(tokenPmA, {
      query: {
        equipmentId,
        status: 'COMPLETED',
      },
    });

    const res = await workOrdersController.listWorkOrders(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.items.length, 2);
  });

  it('9. Security: VIEWER role cannot create work orders (403 Forbidden)', async () => {
    const req = createAuthReq(tokenViewerA, {
      body: {
        equipmentId,
        workOrderNumber: 'WO-HACK',
        category: 'PREVENTIVE',
      },
    });

    await assert.rejects(async () => workOrdersController.createWorkOrder(req), ForbiddenError);
  });
});
