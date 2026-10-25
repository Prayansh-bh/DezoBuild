import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { FuelLogsController } from '../src/modules/equipment/controllers/fuel-logs.controller.js';
import { FuelLogService } from '../src/modules/equipment/services/fuel-log.service.js';
import { EquipmentRepository } from '../src/modules/equipment/repositories/equipment.repository.js';
import { FuelLogRepository } from '../src/modules/equipment/repositories/fuel-log.repository.js';
import { EquipmentAuditRepository } from '../src/modules/equipment/repositories/equipment-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 12 — Equipment Fuel Logs & Source Integrity Integration Suite', () => {
  let dbService: DatabaseService;
  let fuelLogsController: FuelLogsController;
  let fuelLogService: FuelLogService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee120004-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee120004-1111-0001-aaaa-111111111111';
  const siteEngAId = 'ee120004-2222-0001-aaaa-111111111111';
  const viewerAId = 'ee120004-3333-0001-aaaa-111111111111';

  const tenantBId = 'ee120004-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'ee120004-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenSiteEngA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let projectAId: string;
  let storeAId: string;
  let materialIssueAId: string;
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
    const fuelLogRepo = new FuelLogRepository(prisma);
    fuelLogService = new FuelLogService(prisma, equipmentRepo, fuelLogRepo, auditRepo);
    fuelLogsController = new FuelLogsController(fuelLogService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.equipmentAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipmentFuelLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.materialIssueLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.materialIssue.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
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
        code: 'APEX_EQ_FUEL_A',
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
        code: 'PRJ-MUM-METRO-4',
        name: 'Mumbai Metro Line 4',
        status: 'ACTIVE',
      },
    });
    projectAId = projectA.id;

    const storeA = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        code: 'STR-MAIN-01',
        name: 'Main Site Store & Fuel Depot',
      },
    });
    storeAId = storeA.id;

    const vendorA = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        code: 'VEND_HPCL_01',
        name: 'Hindustan Petroleum Corp Ltd',
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

    // Phase 07 Material Issue for internal dispensing
    const issueA = await prisma.materialIssue.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        storeId: storeAId,
        issueNumber: 'ISS-2026-0001',
        status: 'ISSUED',
        requestedById: siteEngAId,
        issuedById: siteEngAId,
        purpose: 'Excavator refuel',
      },
    });
    materialIssueAId = issueA.id;

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

    const eq = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'EXC-FUEL-01',
        name: 'CAT 320D Excavator Fuel Test',
        category: 'EARTHMOVING',
        equipmentType: 'Excavator',
        fuelType: 'DIESEL',
        currentMeterReading: 2000.0,
      },
    });
    equipmentId = eq.id;

    // Setup Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Beta Builders Ltd',
        code: 'BETA_EQ_FUEL_B',
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

  it('1. should record internal store fuel dispensing linked with Phase 07 MaterialIssue', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: equipmentId },
      body: {
        projectId: projectAId,
        storeId: storeAId,
        materialIssueId: materialIssueAId,
        slipNumber: 'SLIP-2026-001',
        idempotencyKey: 'idemp-fuel-001',
        fuelDate: '2026-09-10',
        fuelType: 'DIESEL',
        quantityLiters: 150.0,
        unitRate: 94.5,
        totalCost: 14175.0,
        meterReading: 2008.0,
        source: 'INTERNAL_STORE',
        remarks: 'Morning shift refuel at yard bowser',
      },
    });

    const res = await fuelLogsController.createFuelLog(req);
    assert.strictEqual(res.success, true);
    const log = res.data as any;
    assert.strictEqual(log.slipNumber, 'SLIP-2026-001');
    assert.strictEqual(Number(log.quantityLiters), 150.0);
    assert.strictEqual(log.source, 'INTERNAL_STORE');
    assert.strictEqual(log.materialIssueId, materialIssueAId);

    // Verify meter advancement
    const eq = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    assert.strictEqual(Number(eq.currentMeterReading), 2008.0);
  });

  it('2. Idempotency: repeated submission with same idempotencyKey returns existing record without duplication', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: equipmentId },
      body: {
        projectId: projectAId,
        storeId: storeAId,
        materialIssueId: materialIssueAId,
        slipNumber: 'SLIP-2026-001',
        idempotencyKey: 'idemp-fuel-001', // same key
        fuelDate: '2026-09-10',
        quantityLiters: 150.0,
        meterReading: 2008.0,
        source: 'INTERNAL_STORE',
      },
    });

    const res = await fuelLogsController.createFuelLog(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual((res.data as any).slipNumber, 'SLIP-2026-001');

    const totalLogs = await prisma.equipmentFuelLog.count({ where: { tenantId: tenantAId, idempotencyKey: 'idemp-fuel-001' } });
    assert.strictEqual(totalLogs, 1);
  });

  it('3. should reject INTERNAL_STORE fuel log without storeId or materialIssueId (Source integrity validation)', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: equipmentId },
      body: {
        projectId: projectAId,
        slipNumber: 'SLIP-2026-002',
        fuelDate: '2026-09-10',
        quantityLiters: 100.0,
        meterReading: 2015.0,
        source: 'INTERNAL_STORE', // Missing storeId and materialIssueId
      },
    });

    await assert.rejects(async () => fuelLogsController.createFuelLog(req));
  });

  it('4. should record EXTERNAL_VENDOR fuel log with supplierVendorId and invoiceNumber', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: equipmentId },
      body: {
        projectId: projectAId,
        slipNumber: 'SLIP-2026-003',
        fuelDate: '2026-09-11',
        fuelType: 'DIESEL',
        quantityLiters: 200.0,
        unitRate: 95.0,
        totalCost: 19000.0,
        meterReading: 2020.0,
        source: 'EXTERNAL_VENDOR',
        supplierVendorId: vendorAId,
        invoiceNumber: 'INV-HPCL-99881',
        remarks: 'Emergency roadside tanker refuel',
      },
    });

    const res = await fuelLogsController.createFuelLog(req);
    assert.strictEqual(res.success, true);
    const log = res.data as any;
    assert.strictEqual(log.source, 'EXTERNAL_VENDOR');
    assert.strictEqual(log.supplierVendorId, vendorAId);
    assert.strictEqual(log.invoiceNumber, 'INV-HPCL-99881');
  });

  it('5. should record SITE_BOWSER fuel log with storeId', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: equipmentId },
      body: {
        projectId: projectAId,
        storeId: storeAId,
        slipNumber: 'SLIP-2026-004',
        fuelDate: '2026-09-11',
        quantityLiters: 80.0,
        meterReading: 2025.0,
        source: 'SITE_BOWSER',
      },
    });

    const res = await fuelLogsController.createFuelLog(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual((res.data as any).source, 'SITE_BOWSER');
  });

  it('6. should reject duplicate slipNumber within same tenant (409 Conflict)', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: equipmentId },
      body: {
        projectId: projectAId,
        storeId: storeAId,
        slipNumber: 'SLIP-2026-001', // Already used
        fuelDate: '2026-09-11',
        quantityLiters: 50.0,
        meterReading: 2030.0,
        source: 'SITE_BOWSER',
      },
    });

    await assert.rejects(async () => fuelLogsController.createFuelLog(req), ConflictError);
  });

  it('7. should reject quantityLiters <= 0 (Positive quantity constraint)', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: equipmentId },
      body: {
        projectId: projectAId,
        storeId: storeAId,
        slipNumber: 'SLIP-2026-005',
        fuelDate: '2026-09-11',
        quantityLiters: 0, // Invalid
        meterReading: 2030.0,
        source: 'SITE_BOWSER',
      },
    });

    await assert.rejects(async () => fuelLogsController.createFuelLog(req));
  });

  it('8. should list fuel logs for equipment', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      params: { id: equipmentId },
    });

    const res = await fuelLogsController.listFuelLogs(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 3);
  });

  it('9. Security: VIEWER role cannot log fuel (403 Forbidden)', async () => {
    const req = createAuthReq(tokenViewerA, {
      params: { id: equipmentId },
      body: {
        projectId: projectAId,
        storeId: storeAId,
        slipNumber: 'SLIP-HACK',
        fuelDate: '2026-09-11',
        quantityLiters: 50.0,
        meterReading: 2030.0,
        source: 'SITE_BOWSER',
      },
    });

    await assert.rejects(async () => fuelLogsController.createFuelLog(req), ForbiddenError);
  });
});
