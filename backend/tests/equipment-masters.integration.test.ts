import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { EquipmentController } from '../src/modules/equipment/controllers/equipment.controller.js';
import { EquipmentService } from '../src/modules/equipment/services/equipment.service.js';
import { EquipmentRepository } from '../src/modules/equipment/repositories/equipment.repository.js';
import { EquipmentAuditRepository } from '../src/modules/equipment/repositories/equipment-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 12 — Equipment Masters & Lifecycle Integration Suite', () => {
  let dbService: DatabaseService;
  let equipmentController: EquipmentController;
  let equipmentService: EquipmentService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee120001-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee120001-1111-0001-aaaa-111111111111';
  const pmAId = 'ee120001-2222-0001-aaaa-111111111111';
  const viewerAId = 'ee120001-3333-0001-aaaa-111111111111';

  const tenantBId = 'ee120001-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'ee120001-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let branchAId: string;
  let companyBId: string;
  let vendorAId: string;

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
    equipmentService = new EquipmentService(prisma, equipmentRepo, auditRepo);
    equipmentController = new EquipmentController(equipmentService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.equipmentAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.maintenanceWorkOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.maintenanceSchedule.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipmentFuelLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipmentOperatingLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipmentAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
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
        code: 'APEX_EQ_A',
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

    const branchA = await prisma.branch.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'BR_MUM',
        name: 'Mumbai Central Depot',
        gstin: '27AAAAA0000A1Z5',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });
    branchAId = branchA.id;

    const vendorA = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        code: 'VEND_CAT_01',
        name: 'Caterpillar Heavy Equipment Ltd',
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

    // Setup Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Beta Builders Ltd',
        code: 'BETA_EQ_B',
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

    const companyB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'BETA_HQ',
        name: 'Beta HQ',
        legalName: 'Beta Builders Ltd',
        gstin: '27BBBBB0000B1Z5',
        panNumber: 'BBBBB0000B',
        email: 'hq@beta.com',
        phone: '9999999992',
        address: '200 Beta Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    companyBId = companyB.id;

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

  let createdEquipmentId: string;

  it('1. should register a new equipment asset with full attributes', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        equipmentCode: 'EXC-CAT-320D',
        name: 'CAT 320D Hydraulic Excavator',
        category: 'EARTHMOVING',
        equipmentType: 'Hydraulic Excavator',
        manufacturer: 'Caterpillar',
        modelNumber: '320D L',
        serialNumber: 'CAT320D-2023-0988',
        yearOfManufacture: 2023,
        registrationNumber: 'MH-04-AZ-9988',
        ownershipType: 'OWNED',
        meterType: 'HOURS',
        currentMeterReading: 1250.5,
        fuelType: 'DIESEL',
        fuelEfficiencyNorm: 18.5,
        defaultHourlyRate: 2800,
        currentBranchId: branchAId,
        insuranceExpiryDate: '2027-12-31',
        fitnessExpiryDate: '2027-12-31',
        pucExpiryDate: '2027-06-30',
        isActive: true,
      },
    });

    const res = await equipmentController.createEquipment(req);
    assert.strictEqual(res.success, true);
    const eq = res.data as any;
    assert.strictEqual(eq.equipmentCode, 'EXC-CAT-320D');
    assert.strictEqual(eq.status, 'AVAILABLE');
    assert.strictEqual(eq.currentProjectId, null);
    assert.strictEqual(Number(eq.currentMeterReading), 1250.5);
    createdEquipmentId = eq.id;

    // Verify audit log
    const auditLogs = await prisma.equipmentAuditLog.findMany({
      where: { tenantId: tenantAId, equipmentId: createdEquipmentId, action: 'CREATE' },
    });
    assert.strictEqual(auditLogs.length, 1);
  });

  it('2. should reject duplicate equipmentCode in the same tenant (409 Conflict)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        equipmentCode: 'EXC-CAT-320D',
        name: 'Duplicate CAT 320D',
        category: 'EARTHMOVING',
        equipmentType: 'Hydraulic Excavator',
      },
    });

    await assert.rejects(async () => equipmentController.createEquipment(req), ConflictError);
  });

  it('3. should allow same equipmentCode in different tenant (Tenant isolation)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      body: {
        companyId: companyBId,
        equipmentCode: 'EXC-CAT-320D',
        name: 'Beta CAT 320D Excavator',
        category: 'EARTHMOVING',
        equipmentType: 'Hydraulic Excavator',
      },
    });

    const res = await equipmentController.createEquipment(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual((res.data as any).equipmentCode, 'EXC-CAT-320D');
  });

  it('4. should reject equipment creation referencing company from another tenant (Cross-tenant IDOR)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyBId, // Tenant B company
        equipmentCode: 'CRANE-001',
        name: 'Mobile Crane',
        category: 'LIFTING',
        equipmentType: 'Mobile Crane 50T',
      },
    });

    await assert.rejects(async () => equipmentController.createEquipment(req), BadRequestError);
  });

  it('5. should fetch equipment details by ID with branch and company relations', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdEquipmentId },
    });

    const res = await equipmentController.getEquipment(req);
    assert.strictEqual(res.success, true);
    const eq = res.data as any;
    assert.strictEqual(eq.id, createdEquipmentId);
    assert.strictEqual(eq.company.code, 'APEX_HQ');
    assert.strictEqual(eq.branch.code, 'BR_MUM');
  });

  it('6. should update equipment metadata and write audit log', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdEquipmentId },
      body: {
        name: 'CAT 320D Heavy Excavator Updated',
        defaultHourlyRate: 3200,
        ownerVendorId: vendorAId,
      },
    });

    const res = await equipmentController.updateEquipment(req);
    assert.strictEqual(res.success, true);
    const eq = res.data as any;
    assert.strictEqual(eq.name, 'CAT 320D Heavy Excavator Updated');
    assert.strictEqual(Number(eq.defaultHourlyRate), 3200);
    assert.strictEqual(eq.ownerVendor.code, 'VEND_CAT_01');

    const auditLogs = await prisma.equipmentAuditLog.findMany({
      where: { tenantId: tenantAId, equipmentId: createdEquipmentId, action: 'UPDATE_METADATA' },
    });
    assert.ok(auditLogs.length >= 1);
  });

  it('7. should transition status to UNDER_MAINTENANCE and back to AVAILABLE', async () => {
    // AVAILABLE -> UNDER_MAINTENANCE
    const req1 = createAuthReq(tokenOwnerA, {
      params: { id: createdEquipmentId },
      body: { status: 'UNDER_MAINTENANCE', reason: 'Scheduled inspection' },
    });
    const res1 = await equipmentController.updateEquipmentStatus(req1);
    assert.strictEqual((res1.data as any).status, 'UNDER_MAINTENANCE');

    // UNDER_MAINTENANCE -> AVAILABLE
    const req2 = createAuthReq(tokenOwnerA, {
      params: { id: createdEquipmentId },
      body: { status: 'AVAILABLE', reason: 'Inspection complete' },
    });
    const res2 = await equipmentController.updateEquipmentStatus(req2);
    assert.strictEqual((res2.data as any).status, 'AVAILABLE');
  });

  it('8. should reject direct status change to ASSIGNED through status patch (must use assignment API)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdEquipmentId },
      body: { status: 'ASSIGNED' },
    });

    await assert.rejects(async () => equipmentController.updateEquipmentStatus(req), BadRequestError);
  });

  it('9. should transition to terminal RETIRED status and reject further modifications', async () => {
    // Create temporary asset to retire
    const createReq = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        equipmentCode: 'OLD-TRUCK-01',
        name: 'Old Tipper Truck',
        category: 'TRANSPORT_HAULAGE',
        equipmentType: 'Tipper Truck 16T',
      },
    });
    const createRes = await equipmentController.createEquipment(createReq);
    const oldEqId = (createRes.data as any).id;

    // Set to RETIRED
    const retireReq = createAuthReq(tokenOwnerA, {
      params: { id: oldEqId },
      body: { status: 'RETIRED', reason: 'End of operational lifespan' },
    });
    const retireRes = await equipmentController.updateEquipmentStatus(retireReq);
    assert.strictEqual((retireRes.data as any).status, 'RETIRED');

    // Attempt to transition out of RETIRED -> reject
    const unretireReq = createAuthReq(tokenOwnerA, {
      params: { id: oldEqId },
      body: { status: 'AVAILABLE' },
    });
    await assert.rejects(async () => equipmentController.updateEquipmentStatus(unretireReq), BadRequestError);

    // Attempt to update metadata on RETIRED -> reject
    const updateReq = createAuthReq(tokenOwnerA, {
      params: { id: oldEqId },
      body: { name: 'Trying to update' },
    });
    await assert.rejects(async () => equipmentController.updateEquipment(updateReq), BadRequestError);
  });

  it('10. should list equipment with category filter and search query', async () => {
    const req = createAuthReq(tokenOwnerA, {
      query: {
        category: 'EARTHMOVING',
        search: 'CAT 320D',
      },
    });

    const res = await equipmentController.listEquipment(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 1);
    assert.strictEqual(data.items[0].equipmentCode, 'EXC-CAT-320D');
  });

  it('11. should reject equipment creation with negative hourly rate (Rate constraint)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        equipmentCode: 'EXC-NEG-01',
        name: 'Negative Rate Excavator',
        category: 'EARTHMOVING',
        equipmentType: 'Excavator',
        defaultHourlyRate: -500, // Invalid
      },
    });

    await assert.rejects(async () => equipmentController.createEquipment(req));
  });

  it('12. should reject equipment creation with negative currentMeterReading', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        equipmentCode: 'EXC-NEG-02',
        name: 'Negative Meter Excavator',
        category: 'EARTHMOVING',
        equipmentType: 'Excavator',
        currentMeterReading: -100, // Invalid
      },
    });

    await assert.rejects(async () => equipmentController.createEquipment(req));
  });

  it('13. Security: VIEWER role cannot create or update equipment (403 Forbidden)', async () => {
    const req = createAuthReq(tokenViewerA, {
      body: {
        companyId: companyAId,
        equipmentCode: 'HACK-001',
        name: 'Hacked Equipment',
        category: 'EARTHMOVING',
        equipmentType: 'Excavator',
      },
    });

    await assert.rejects(async () => equipmentController.createEquipment(req), ForbiddenError);
  });
});
