import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { OperatingLogsController } from '../src/modules/equipment/controllers/operating-logs.controller.js';
import { OperatingLogService } from '../src/modules/equipment/services/operating-log.service.js';
import { EquipmentRepository } from '../src/modules/equipment/repositories/equipment.repository.js';
import { OperatingLogRepository } from '../src/modules/equipment/repositories/operating-log.repository.js';
import { EquipmentAuditRepository } from '../src/modules/equipment/repositories/equipment-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 12 — Operating Logs & Meter Lineage Integration Suite', () => {
  let dbService: DatabaseService;
  let operatingLogsController: OperatingLogsController;
  let operatingLogService: OperatingLogService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee120003-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee120003-1111-0001-aaaa-111111111111';
  const siteEngAId = 'ee120003-2222-0001-aaaa-111111111111';
  const viewerAId = 'ee120003-3333-0001-aaaa-111111111111';

  const tenantBId = 'ee120003-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'ee120003-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenSiteEngA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let projectAId: string;
  let operatorEmpId: string;
  let hoursEqId: string;
  let kmEqId: string;

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
    const operatingLogRepo = new OperatingLogRepository(prisma);
    operatingLogService = new OperatingLogService(prisma, equipmentRepo, operatingLogRepo, auditRepo);
    operatingLogsController = new OperatingLogsController(operatingLogService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.equipmentAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipmentOperatingLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
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
        code: 'APEX_EQ_OPR_A',
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
        code: 'PRJ-MUM-COASTAL',
        name: 'Mumbai Coastal Road Project',
        status: 'ACTIVE',
      },
    });
    projectAId = projectA.id;

    const operator = await prisma.employee.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        employeeNumber: 'OPR-001',
        fullName: 'Ramesh Patel',
        designation: 'Heavy Equipment Operator',
        joiningDate: new Date('2025-01-01'),
      },
    });
    operatorEmpId = operator.id;

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
          id: siteEngAId,
          tenantId: tenantAId,
          email: 'siteeng@apex.com',
          fullName: 'Apex Site Engineer',
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
    const siteEngRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });
    const viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: siteEngAId, roleId: siteEngRole!.id },
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

    tokenSiteEngA = tokenService.createAccessToken({
      userId: siteEngAId,
      tenantId: tenantAId,
      sessionId: 'session-se-a',
      sessionVersion: 1,
    });

    tokenViewerA = tokenService.createAccessToken({
      userId: viewerAId,
      tenantId: tenantAId,
      sessionId: 'session-view-a',
      sessionVersion: 1,
    });

    // Hours Equipment
    const eqHours = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'EXC-HRS-01',
        name: 'CAT 320D Excavator',
        category: 'EARTHMOVING',
        equipmentType: 'Excavator',
        meterType: 'HOURS',
        currentMeterReading: 1000.0,
      },
    });
    hoursEqId = eqHours.id;

    // KM Equipment (Transit Mixer)
    const eqKm = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'TM-KM-01',
        name: 'Schwing Stetter Transit Mixer',
        category: 'CONCRETE',
        equipmentType: 'Transit Mixer',
        meterType: 'KILOMETERS',
        currentMeterReading: 50000.0,
      },
    });
    kmEqId = eqKm.id;

    // Setup Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Beta Builders Ltd',
        code: 'BETA_EQ_OPR_B',
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

  let createdLogId: string;

  it('1. should record operating log for HOURS meter equipment, advancing currentMeterReading', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: hoursEqId },
      body: {
        projectId: projectAId,
        operatorEmployeeId: operatorEmpId,
        logDate: '2026-09-10',
        shift: 'DAY',
        startMeter: 1000.0,
        endMeter: 1008.5,
        operatingHours: 8.5,
        idleHours: 1.0,
        breakdownHours: 0.0,
        workDescription: 'Site grading and backfilling',
      },
    });

    const res = await operatingLogsController.createOperatingLog(req);
    assert.strictEqual(res.success, true);
    const log = res.data as any;
    assert.strictEqual(Number(log.startMeter), 1000.0);
    assert.strictEqual(Number(log.endMeter), 1008.5);
    assert.strictEqual(Number(log.operatingHours), 8.5);
    assert.strictEqual(log.isCorrected, false);
    createdLogId = log.id;

    // Verify Equipment meter reading advancement
    const eq = await prisma.equipment.findUnique({ where: { id: hoursEqId } });
    assert.strictEqual(Number(eq.currentMeterReading), 1008.5);
  });

  it('2. should record operating log for KILOMETERS meter equipment with explicit operatingHours', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: kmEqId },
      body: {
        projectId: projectAId,
        logDate: '2026-09-10',
        shift: 'GENERAL',
        startMeter: 50000.0,
        endMeter: 50120.0, // 120 km driven
        operatingHours: 6.0,  // 6 engine hours running drum & transit
        idleHours: 2.0,
        breakdownHours: 0.0,
        workDescription: '4 trips of RMC M35 concrete delivery',
      },
    });

    const res = await operatingLogsController.createOperatingLog(req);
    assert.strictEqual(res.success, true);
    const log = res.data as any;
    assert.strictEqual(Number(log.startMeter), 50000.0);
    assert.strictEqual(Number(log.endMeter), 50120.0);
    assert.strictEqual(Number(log.operatingHours), 6.0);

    const eq = await prisma.equipment.findUnique({ where: { id: kmEqId } });
    assert.strictEqual(Number(eq.currentMeterReading), 50120.0);
  });

  it('3. should reject operating log with endMeter < startMeter (Monotonicity constraint)', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: hoursEqId },
      body: {
        projectId: projectAId,
        logDate: '2026-09-11',
        shift: 'NIGHT',
        startMeter: 1020.0,
        endMeter: 1010.0, // Invalid: decreased
        operatingHours: 8.0,
      },
    });

    await assert.rejects(async () => operatingLogsController.createOperatingLog(req));
  });

  it('4. should reject operating log when total hours exceed 24 in a single shift', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: hoursEqId },
      body: {
        projectId: projectAId,
        logDate: '2026-09-11',
        shift: 'DAY',
        startMeter: 1008.5,
        endMeter: 1028.5,
        operatingHours: 20.0,
        idleHours: 5.0, // 20 + 5 = 25 > 24
      },
    });

    await assert.rejects(async () => operatingLogsController.createOperatingLog(req));
  });

  it('5. should reject duplicate active shift log for the same equipment and date (409 Conflict)', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: hoursEqId },
      body: {
        projectId: projectAId,
        logDate: '2026-09-10',
        shift: 'DAY', // Same date and shift as test 1
        startMeter: 1008.5,
        endMeter: 1016.5,
        operatingHours: 8.0,
      },
    });

    await assert.rejects(async () => operatingLogsController.createOperatingLog(req), ConflictError);
  });

  it('6. should correct operating log: mark original as corrected and insert replacement with supersededLogId', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdLogId },
      body: {
        correctionReason: 'Typo in end meter on paper log sheet: was 1007.5, recorded as 1008.5',
        startMeter: 1000.0,
        endMeter: 1007.5,
        operatingHours: 7.5,
        idleHours: 1.0,
      },
    });

    const res = await operatingLogsController.correctOperatingLog(req);
    assert.strictEqual(res.success, true);
    const replacement = res.data as any;
    assert.strictEqual(Number(replacement.endMeter), 1007.5);
    assert.strictEqual(Number(replacement.operatingHours), 7.5);

    // Verify original row is immutable & flagged as corrected
    const original = await prisma.equipmentOperatingLog.findUnique({ where: { id: createdLogId } });
    assert.strictEqual(original.isCorrected, true);
    assert.strictEqual(original.correctionReason, 'Typo in end meter on paper log sheet: was 1007.5, recorded as 1008.5');

    // Verify Equipment meter reading recomputed to highest valid active meter
    const eq = await prisma.equipment.findUnique({ where: { id: hoursEqId } });
    assert.strictEqual(Number(eq.currentMeterReading), 1007.5);

    // Verify Audit
    const auditLogs = await prisma.equipmentAuditLog.findMany({
      where: { tenantId: tenantAId, equipmentId: hoursEqId, action: 'METER_CORRECTION' },
    });
    assert.strictEqual(auditLogs.length, 1);
  });

  it('7. should reject correction on an already corrected operating log (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdLogId },
      body: {
        correctionReason: 'Attempting second correction on original row',
        startMeter: 1000.0,
        endMeter: 1005.0,
        operatingHours: 5.0,
      },
    });

    await assert.rejects(async () => operatingLogsController.correctOperatingLog(req), BadRequestError);
  });

  it('8. should list operating logs for equipment', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: hoursEqId },
    });

    const res = await operatingLogsController.listOperatingLogs(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 2); // original (isCorrected=true) + replacement
  });

  it('9. Security: VIEWER cannot submit operating logs (403 Forbidden)', async () => {
    const req = createAuthReq(tokenViewerA, {
      params: { id: hoursEqId },
      body: {
        projectId: projectAId,
        logDate: '2026-09-12',
        shift: 'DAY',
        startMeter: 1007.5,
        endMeter: 1015.5,
        operatingHours: 8.0,
      },
    });

    await assert.rejects(async () => operatingLogsController.createOperatingLog(req), ForbiddenError);
  });
});
