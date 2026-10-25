import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { EquipmentController } from '../src/modules/equipment/controllers/equipment.controller.js';
import { AssignmentsController } from '../src/modules/equipment/controllers/assignments.controller.js';
import { OperatingLogsController } from '../src/modules/equipment/controllers/operating-logs.controller.js';
import { FuelLogsController } from '../src/modules/equipment/controllers/fuel-logs.controller.js';
import { WorkOrdersController } from '../src/modules/equipment/controllers/work-orders.controller.js';

import { EquipmentService } from '../src/modules/equipment/services/equipment.service.js';
import { AssignmentService } from '../src/modules/equipment/services/assignment.service.js';
import { OperatingLogService } from '../src/modules/equipment/services/operating-log.service.js';
import { FuelLogService } from '../src/modules/equipment/services/fuel-log.service.js';
import { MaintenanceService } from '../src/modules/equipment/services/maintenance.service.js';

import { EquipmentRepository } from '../src/modules/equipment/repositories/equipment.repository.js';
import { AssignmentRepository } from '../src/modules/equipment/repositories/assignment.repository.js';
import { OperatingLogRepository } from '../src/modules/equipment/repositories/operating-log.repository.js';
import { FuelLogRepository } from '../src/modules/equipment/repositories/fuel-log.repository.js';
import { MaintenanceScheduleRepository } from '../src/modules/equipment/repositories/maintenance-schedule.repository.js';
import { WorkOrderRepository } from '../src/modules/equipment/repositories/work-order.repository.js';
import { EquipmentAuditRepository } from '../src/modules/equipment/repositories/equipment-audit.repository.js';

import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';

describe('DEZOBUILD Phase 12 — Equipment Concurrency & Forensic Audit Integration Suite', () => {
  let dbService: DatabaseService;
  let equipmentController: EquipmentController;
  let assignmentsController: AssignmentsController;
  let operatingLogsController: OperatingLogsController;
  let fuelLogsController: FuelLogsController;
  let workOrdersController: WorkOrdersController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee120006-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee120006-1111-0001-aaaa-111111111111';
  const pmAId = 'ee120006-2222-0001-aaaa-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;

  let companyAId: string;
  let projectAId: string;
  let storeAId: string;
  let materialIssueAId: string;

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
    const assignmentRepo = new AssignmentRepository(prisma);
    const operatingLogRepo = new OperatingLogRepository(prisma);
    const fuelLogRepo = new FuelLogRepository(prisma);
    const scheduleRepo = new MaintenanceScheduleRepository(prisma);
    const workOrderRepo = new WorkOrderRepository(prisma);

    const equipmentService = new EquipmentService(prisma, equipmentRepo, auditRepo);
    const assignmentService = new AssignmentService(prisma, equipmentRepo, assignmentRepo, auditRepo);
    const operatingLogService = new OperatingLogService(prisma, equipmentRepo, operatingLogRepo, auditRepo);
    const fuelLogService = new FuelLogService(prisma, equipmentRepo, fuelLogRepo, auditRepo);
    const maintenanceService = new MaintenanceService(prisma, equipmentRepo, scheduleRepo, workOrderRepo, auditRepo);

    equipmentController = new EquipmentController(equipmentService);
    assignmentsController = new AssignmentsController(assignmentService);
    operatingLogsController = new OperatingLogsController(operatingLogService);
    fuelLogsController = new FuelLogsController(fuelLogService);
    workOrdersController = new WorkOrdersController(maintenanceService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.equipmentAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.maintenanceWorkOrder.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.maintenanceSchedule.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.equipmentFuelLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.equipmentOperatingLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.equipmentAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.equipment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.materialIssueLine.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.materialIssue.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.store.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });

    // Setup Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'Apex Infrastructure Corp',
        code: 'APEX_EQ_CONC_A',
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
        code: 'PRJ-MUM-HARBOUR',
        name: 'Mumbai Trans Harbour Link Phase 3',
        status: 'ACTIVE',
      },
    });
    projectAId = projectA.id;

    // Create users FIRST so FKs are satisfied
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
      ],
    });

    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole!.id },
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

    const storeA = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        code: 'STR-HARBOUR-01',
        name: 'Harbour Yard Fuel Depot',
      },
    });
    storeAId = storeA.id;

    const issueA = await prisma.materialIssue.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        storeId: storeAId,
        issueNumber: 'ISS-CONC-001',
        status: 'ISSUED',
        requestedById: pmAId,
        issuedById: pmAId,
        purpose: 'Bulk refuel',
      },
    });
    materialIssueAId = issueA.id;

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
  });

  after(async () => {
    await dbService.disconnect();
  });

  it('1. Concurrency: Two simultaneous assignment requests for same equipment -> exactly one succeeds, one fails', async () => {
    const eq = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'CRANE-CONC-01',
        name: 'Kobelco Crawler Crane 100T',
        category: 'LIFTING',
        equipmentType: 'Crawler Crane',
        status: 'AVAILABLE',
      },
    });

    const req1 = createAuthReq(tokenOwnerA, {
      params: { id: eq.id },
      body: { projectId: projectAId, assignedFrom: new Date().toISOString() },
    });
    const req2 = createAuthReq(tokenOwnerA, {
      params: { id: eq.id },
      body: { projectId: projectAId, assignedFrom: new Date().toISOString() },
    });

    const results = await Promise.allSettled([
      assignmentsController.createAssignment(req1),
      assignmentsController.createAssignment(req2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one assignment must succeed');
    assert.strictEqual(rejected.length, 1, 'Exactly one assignment must be rejected');

    const activeAssignments = await prisma.equipmentAssignment.count({
      where: { tenantId: tenantAId, equipmentId: eq.id, status: 'ACTIVE' },
    });
    assert.strictEqual(activeAssignments, 1);
  });

  it('2. Concurrency: Two simultaneous returns for same assignment -> exactly one succeeds, one fails', async () => {
    const eq = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'DOZER-CONC-01',
        name: 'CAT D6 Bulldozer',
        category: 'EARTHMOVING',
        equipmentType: 'Bulldozer',
        status: 'AVAILABLE',
      },
    });

    const asgRes = await assignmentsController.createAssignment(
      createAuthReq(tokenOwnerA, {
        params: { id: eq.id },
        body: { projectId: projectAId, assignedFrom: new Date().toISOString() },
      })
    );
    const asgId = (asgRes.data as any).id;

    const req1 = createAuthReq(tokenOwnerA, { params: { id: asgId }, body: { notes: 'Return 1' } });
    const req2 = createAuthReq(tokenOwnerA, { params: { id: asgId }, body: { notes: 'Return 2' } });

    const results = await Promise.allSettled([
      assignmentsController.returnAssignment(req1),
      assignmentsController.returnAssignment(req2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);
  });

  it('3. Concurrency: Two simultaneous operating logs for same equipment on same date & shift -> exactly one succeeds', async () => {
    const eq = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'ROLLER-CONC-01',
        name: 'HAMM Tandem Roller',
        category: 'COMPACTION_ROAD',
        equipmentType: 'Tandem Roller',
        meterType: 'HOURS',
        currentMeterReading: 100.0,
      },
    });

    const req1 = createAuthReq(tokenPmA, {
      params: { id: eq.id },
      body: {
        projectId: projectAId,
        logDate: '2026-09-15',
        shift: 'GENERAL',
        startMeter: 100.0,
        endMeter: 108.0,
        operatingHours: 8.0,
      },
    });
    const req2 = createAuthReq(tokenPmA, {
      params: { id: eq.id },
      body: {
        projectId: projectAId,
        logDate: '2026-09-15',
        shift: 'GENERAL',
        startMeter: 100.0,
        endMeter: 108.0,
        operatingHours: 8.0,
      },
    });

    const results = await Promise.allSettled([
      operatingLogsController.createOperatingLog(req1),
      operatingLogsController.createOperatingLog(req2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);
  });

  it('4. Concurrency: Two simultaneous fuel requests with same idempotencyKey -> exactly one log created in DB', async () => {
    const eq = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'GEN-CONC-01',
        name: 'Kirloskar 250kVA Generator',
        category: 'POWER_GENERATION',
        equipmentType: 'Silent Diesel Generator',
        meterType: 'HOURS',
        currentMeterReading: 500.0,
      },
    });

    const key = 'idemp-conc-fuel-999';
    const req1 = createAuthReq(tokenPmA, {
      params: { id: eq.id },
      body: {
        projectId: projectAId,
        storeId: storeAId,
        materialIssueId: materialIssueAId,
        slipNumber: 'SLIP-CONC-999',
        idempotencyKey: key,
        fuelDate: '2026-09-15',
        quantityLiters: 100.0,
        meterReading: 510.0,
        source: 'INTERNAL_STORE',
      },
    });
    const req2 = createAuthReq(tokenPmA, {
      params: { id: eq.id },
      body: {
        projectId: projectAId,
        storeId: storeAId,
        materialIssueId: materialIssueAId,
        slipNumber: 'SLIP-CONC-999',
        idempotencyKey: key,
        fuelDate: '2026-09-15',
        quantityLiters: 100.0,
        meterReading: 510.0,
        source: 'INTERNAL_STORE',
      },
    });

    const results = await Promise.allSettled([
      fuelLogsController.createFuelLog(req1),
      fuelLogsController.createFuelLog(req2),
    ]);

    // Total in DB must be exactly 1
    const totalLogs = await prisma.equipmentFuelLog.count({
      where: { tenantId: tenantAId, idempotencyKey: key },
    });
    assert.strictEqual(totalLogs, 1);
  });

  it('5. Concurrency: Two simultaneous work order completions -> exactly one succeeds, one fails', async () => {
    const eq = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'PUMP-CONC-01',
        name: 'Putzmeister Stationary Concrete Pump',
        category: 'CONCRETE',
        equipmentType: 'Concrete Pump',
      },
    });

    const woRes = await workOrdersController.createWorkOrder(
      createAuthReq(tokenPmA, {
        body: {
          equipmentId: eq.id,
          projectId: projectAId,
          workOrderNumber: 'WO-CONC-001',
          category: 'PREVENTIVE',
        },
      })
    );
    const woId = (woRes.data as any).id;

    const req1 = createAuthReq(tokenOwnerA, { params: { id: woId }, body: { workDone: 'Completion 1' } });
    const req2 = createAuthReq(tokenOwnerA, { params: { id: woId }, body: { workDone: 'Completion 2' } });

    const results = await Promise.allSettled([
      workOrdersController.completeWorkOrder(req1),
      workOrdersController.completeWorkOrder(req2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);
  });

  it('6. Forensic Audit Trail: Verify audit trail completeness across all critical operational events', async () => {
    const allAudits = await prisma.equipmentAuditLog.findMany({
      where: { tenantId: tenantAId },
      orderBy: { createdAt: 'asc' },
    });

    assert.ok(allAudits.length >= 5, 'Audit log must record all domain mutations');
    const actions = allAudits.map((a: any) => a.action);
    assert.ok(actions.includes('ASSIGN'));
    assert.ok(actions.includes('DEMOBILIZE'));
    assert.ok(actions.includes('CREATE'));
  });
});
