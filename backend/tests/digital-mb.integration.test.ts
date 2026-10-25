import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { DigitalMbController } from '../src/modules/projects/controllers/digital-mb.controller';
import { BoqController } from '../src/modules/projects/controllers/boq.controller';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 07 — Digital Measurement Book (MB) Integration Suite', () => {
  let dbService: DatabaseService;
  let mbController: DigitalMbController;
  let boqController: BoqController;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A: STARTER tier
  const tenantAId = '66666666-aaaa-4444-aaaa-666666666666';
  const ownerAId = '66666666-1111-4444-aaaa-666666666666';
  const pmAId = '66666666-2222-4444-aaaa-666666666666';
  const seAId = '66666666-3333-4444-aaaa-666666666666';
  const empAId = '66666666-4444-4444-aaaa-666666666666';

  // Tenant B: for cross-tenant testing
  const tenantBId = '66666666-bbbb-4444-bbbb-666666666666';
  const ownerBId = '66666666-1111-4444-bbbb-666666666666';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSeA: string;
  let tokenEmpA: string;
  let tokenOwnerB: string;

  let projectAId: string;
  let projectBId: string;
  let companyAId: string;
  let companyBId: string;
  let vendorAId: string;
  let vendorBId: string;
  let dprAId: string;
  let taskAId: string;

  let boqVolumeId: string;
  let boqAreaId: string;
  let boqLengthId: string;
  let boqCountId: string;
  let boqDirectId: string;

  function createAuthReq(
    token: string,
    options?: { body?: unknown; params?: Record<string, string>; query?: Record<string, string> }
  ): IncomingMessage {
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: options?.body || {},
      params: options?.params || {},
      query: options?.query || {},
    } as unknown as IncomingMessage;
    return req;
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();

    mbController = new DigitalMbController();
    boqController = new BoqController();
    tokenService = new TokenService();

    // 1. Seed RBAC & Subscriptions
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    tokenService = TokenService.getInstance();

    // 2. Clean fixtures
    await prisma.measurementDimension.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.digitalMbRecord.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.digitalMbSequence.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.boqItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprPhoto.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprActivityProgress.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprManpower.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprEquipment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprMaterial.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dailyProgressReport.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.taskDependency.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.task.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.wbsNode.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // 3. Create Tenants
    await prisma.tenant.create({
      data: { id: tenantAId, name: 'MB Test Tenant A', code: 'MB-T-A', status: 'ACTIVE' },
    });
    await prisma.tenant.create({
      data: { id: tenantBId, name: 'MB Test Tenant B', code: 'MB-T-B', status: 'ACTIVE' },
    });

    // 4. Create Plans & Subscriptions
    const plan = await prisma.platformPlan.findFirst({ where: { code: 'STARTER' } });
    await prisma.tenantSubscription.createMany({
      data: [
        {
          tenantId: tenantAId,
          planId: plan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        },
        {
          tenantId: tenantBId,
          planId: plan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        },
      ],
    });

    // 5. Companies
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'MCA',
        name: 'MB Construction A',
        legalName: 'MB Construction A Pvt Ltd',
        panNumber: 'AAACM1234A',
        gstin: '29AAACM1234A1Z5',
        email: 'info@mbcorpa.com',
        phone: '+919876543210',
        address: '100 MB Highway',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });
    companyAId = compA.id;

    const compB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'MCB',
        name: 'MB Construction B',
        legalName: 'MB Construction B Pvt Ltd',
        panNumber: 'AAACM1234B',
        gstin: '29AAACM1234B1Z5',
        email: 'info@mbcorpb.com',
        phone: '+919876543211',
        address: '200 MB Highway',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyBId = compB.id;

    // 6. Users
    await prisma.user.createMany({
      data: [
        { id: ownerAId, tenantId: tenantAId, email: 'owner-a@mb-test.com', fullName: 'Owner A', passwordHash: 'dummy', status: 'ACTIVE' },
        { id: pmAId, tenantId: tenantAId, email: 'pm-a@mb-test.com', fullName: 'PM A', passwordHash: 'dummy', status: 'ACTIVE' },
        { id: seAId, tenantId: tenantAId, email: 'se-a@mb-test.com', fullName: 'Site Eng A', passwordHash: 'dummy', status: 'ACTIVE' },
        { id: empAId, tenantId: tenantAId, email: 'emp-a@mb-test.com', fullName: 'Emp A', passwordHash: 'dummy', status: 'ACTIVE' },
        { id: ownerBId, tenantId: tenantBId, email: 'owner-b@mb-test.com', fullName: 'Owner B', passwordHash: 'dummy', status: 'ACTIVE' },
      ],
    });

    // 7. Role assignments
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const seRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });
    const empRole = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: seAId, roleId: seRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: empAId, roleId: empRole.id, scopeType: 'TENANT' },
        { tenantId: tenantBId, userId: ownerBId, roleId: ownerRole.id, scopeType: 'TENANT' },
      ],
    });

    // 8. Projects
    const prjA = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: companyAId, name: 'Metro Line 3', code: 'METRO', status: 'ACTIVE' },
    });
    projectAId = prjA.id;

    const prjB = await prisma.project.create({
      data: { tenantId: tenantBId, companyId: companyBId, name: 'Bridge Project B', code: 'BRIDGE', status: 'ACTIVE' },
    });
    projectBId = prjB.id;

    // 9. Vendors / Subcontractors
    const vendorA = await prisma.vendor.create({
      data: { tenantId: tenantAId, code: 'VEND-01', name: 'Apex Civil Contractors Pvt Ltd', status: 'ACTIVE' },
    });
    vendorAId = vendorA.id;

    const vendorB = await prisma.vendor.create({
      data: { tenantId: tenantBId, code: 'VEND-02', name: 'Delta Subcontractors Ltd', status: 'ACTIVE' },
    });
    vendorBId = vendorB.id;

    // 10. DPR & Task
    const dprA = await prisma.dailyProgressReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        dprNumber: 'DPR-METRO-20260911-0001',
        reportDate: new Date('2026-09-11'),
        status: 'APPROVED',
        createdById: seAId,
      },
    });
    dprAId = dprA.id;

    const taskA = await prisma.task.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        name: 'Pier 12 Concrete Pouring',
        status: 'IN_PROGRESS',
      },
    });
    taskAId = taskA.id;

    // 11. BOQ Items for various UOMs
    const bVol = await prisma.boqItem.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        itemNumber: '1.01',
        description: 'M35 Grade Concrete in Piers',
        uom: 'CUM',
        quantity: 1000,
        unitRate: 6500,
        totalAmount: 6500000,
        status: 'ACTIVE',
        createdById: pmAId,
      },
    });
    boqVolumeId = bVol.id;

    const bArea = await prisma.boqItem.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        itemNumber: '2.01',
        description: 'External 20mm Cement Plaster',
        uom: 'SQM',
        quantity: 5000,
        unitRate: 350,
        totalAmount: 1750000,
        status: 'ACTIVE',
        createdById: pmAId,
      },
    });
    boqAreaId = bArea.id;

    const bLen = await prisma.boqItem.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        itemNumber: '3.01',
        description: 'RCC Kerb Stone Boundary',
        uom: 'RMT',
        quantity: 2500,
        unitRate: 850,
        totalAmount: 2125000,
        status: 'ACTIVE',
        createdById: pmAId,
      },
    });
    boqLengthId = bLen.id;

    const bCount = await prisma.boqItem.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        itemNumber: '4.01',
        description: 'Precast Manhole Covers 600mm dia',
        uom: 'NOS',
        quantity: 200,
        unitRate: 4500,
        totalAmount: 900000,
        status: 'ACTIVE',
        createdById: pmAId,
      },
    });
    boqCountId = bCount.id;

    const bDirect = await prisma.boqItem.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        itemNumber: '5.01',
        description: 'Structural Steel Trusses',
        uom: 'MT',
        quantity: 80,
        unitRate: 75000,
        totalAmount: 6000000,
        status: 'ACTIVE',
        createdById: pmAId,
      },
    });
    boqDirectId = bDirect.id;

    // Add Project Members
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectAId, userId: ownerAId, projectRole: 'OWNER', isLead: true },
        { tenantId: tenantAId, projectId: projectAId, userId: pmAId, projectRole: 'MANAGER', isLead: true },
        { tenantId: tenantAId, projectId: projectAId, userId: seAId, projectRole: 'ENGINEER', isLead: false },
        { tenantId: tenantAId, projectId: projectAId, userId: empAId, projectRole: 'MEMBER', isLead: false },
        { tenantId: tenantBId, projectId: projectBId, userId: ownerBId, projectRole: 'OWNER', isLead: true },
      ],
    });

    // 12. JWT Tokens
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-mb-owner-a',
      sessionVersion: 1,
    });

    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-mb-pm-a',
      sessionVersion: 1,
    });

    tokenSeA = tokenService.createAccessToken({
      userId: seAId,
      tenantId: tenantAId,
      sessionId: 'sess-mb-se-a',
      sessionVersion: 1,
    });

    tokenEmpA = tokenService.createAccessToken({
      userId: empAId,
      tenantId: tenantAId,
      sessionId: 'sess-mb-emp-a',
      sessionVersion: 1,
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-mb-owner-b',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await prisma.measurementDimension.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.digitalMbRecord.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.digitalMbSequence.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.boqItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprPhoto.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprActivityProgress.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprManpower.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprEquipment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dprMaterial.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.dailyProgressReport.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.taskDependency.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.task.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.wbsNode.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  });

  // ==========================================
  // 1. DIMENSIONAL MATH PER UOM
  // ==========================================

  it('1. should calculate dimensional VOLUME correctly (count * L * B * D * factor)', async () => {
    // Volume: 2 piers of 10m x 2m x 1.5m, factor 1.0 = 2 * 10 * 2 * 1.5 = 60 CUM
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqVolumeId,
        measurementDate: '2026-09-11',
        measurementType: 'DIMENSIONAL',
        location: 'Pier P12 & P13 Foundation',
        dimensions: [
          { description: 'Pier P12 Base', count: 1, length: 10, breadth: 2, depth: 1.5, factor: 1.0 },
          { description: 'Pier P13 Base', count: 1, length: 10, breadth: 2, depth: 1.5, factor: 1.0 },
        ],
        contractorId: vendorAId,
        dprId: dprAId,
        taskId: taskAId,
      },
    });

    const res = await mbController.createMeasurement(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.currentQuantity.toString(), '60');
    assert.strictEqual(res.data.status, 'DRAFT');
    assert.ok(res.data.mbNumber.startsWith('MB-METRO-'));
    assert.strictEqual(res.data.dimensions?.length, 2);
  });

  it('2. should calculate dimensional AREA with deductions correctly (count * L * B * factor)', async () => {
    // Area: Wall plaster 20m x 5m = 100 SQM, minus 2 window openings 2m x 1.5m (factor -1) = -6 SQM -> Net 94 SQM
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqAreaId,
        measurementDate: '2026-09-11',
        measurementType: 'DIMENSIONAL',
        location: 'Station Concourse North Wall',
        dimensions: [
          { description: 'Gross wall surface', count: 1, length: 20, breadth: 5, depth: 1, factor: 1.0 },
          { description: 'Window openings deduction', count: 2, length: 2, breadth: 1.5, depth: 1, factor: -1.0 },
        ],
      },
    });

    const res = await mbController.createMeasurement(req);
    assert.strictEqual(res.success, true);
    // 100 - 6 = 94 SQM
    assert.strictEqual(res.data.currentQuantity.toString(), '94');
  });

  it('3. should calculate dimensional LENGTH correctly (count * L * factor)', async () => {
    // Length: 4 runs of 50m kerb stones = 200 RMT
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqLengthId,
        measurementDate: '2026-09-11',
        measurementType: 'DIMENSIONAL',
        location: 'Approach Road Alignment',
        chainageFrom: 10.5,
        chainageTo: 10.7,
        dimensions: [
          { description: 'East side kerb', count: 2, length: 50, factor: 1.0 },
          { description: 'West side kerb', count: 2, length: 50, factor: 1.0 },
        ],
      },
    });

    const res = await mbController.createMeasurement(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.currentQuantity.toString(), '200');
  });

  it('4. should calculate COUNT UOM correctly (count * factor)', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqCountId,
        measurementDate: '2026-09-11',
        measurementType: 'DIMENSIONAL',
        location: 'Drainage Line Junctions',
        dimensions: [
          { description: 'Standard heavy duty manholes installed', count: 15, factor: 1.0 },
        ],
      },
    });

    const res = await mbController.createMeasurement(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.currentQuantity.toString(), '15');
  });

  it('5. should record DIRECT_QUANTITY accurately', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqDirectId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 12.45,
        location: 'Station Roof Truss Assembly',
      },
    });

    const res = await mbController.createMeasurement(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.currentQuantity.toString(), '12.45');
    assert.strictEqual(res.data.measurementType, 'DIRECT_QUANTITY');
  });

  it('6. should reject standard measurement if net calculated quantity is negative', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqAreaId,
        measurementDate: '2026-09-11',
        measurementType: 'DIMENSIONAL',
        location: 'Faulty deduction test',
        dimensions: [
          { description: 'Base wall', count: 1, length: 10, breadth: 2, factor: 1.0 },
          { description: 'Excessive opening deduction', count: 1, length: 20, breadth: 5, factor: -1.0 },
        ],
      },
    });

    await assert.rejects(async () => mbController.createMeasurement(req), BadRequestError);
  });

  it('7. should reject invalid factor (other than 1.00 or -1.00)', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqAreaId,
        measurementDate: '2026-09-11',
        measurementType: 'DIMENSIONAL',
        location: 'Invalid factor test',
        dimensions: [
          { description: 'Wall', count: 1, length: 10, breadth: 2, factor: 2.5 },
        ],
      },
    });

    await assert.rejects(async () => mbController.createMeasurement(req));
  });

  // ==========================================
  // 2. LINKAGES & CROSS-PROJECT VALIDATION
  // ==========================================

  it('8. should reject contractor from a different tenant', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqVolumeId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 10,
        location: 'Cross tenant vendor test',
        contractorId: vendorBId, // Vendor B belongs to Tenant B
      },
    });

    await assert.rejects(async () => mbController.createMeasurement(req), NotFoundError);
  });

  // ==========================================
  // 3. WORKFLOW LIFECYCLE & SOD
  // ==========================================

  it('9. should execute full lifecycle DRAFT -> SUBMITTED -> VERIFIED -> APPROVED', async () => {
    // 1. Create DRAFT by Site Engineer (seAId)
    const createReq = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqVolumeId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 150,
        location: 'Pier P14 Stem Concrete',
      },
    });
    const created = await mbController.createMeasurement(createReq);
    const mbId = created.data.id;
    assert.strictEqual(created.data.status, 'DRAFT');

    // 2. Submit by Site Engineer
    const submitReq = createAuthReq(tokenSeA, {
      params: { projectId: projectAId, measurementId: mbId },
    });
    const submitted = await mbController.submitMeasurement(submitReq);
    assert.strictEqual(submitted.data.status, 'SUBMITTED');
    assert.strictEqual(submitted.data.submittedById, seAId);
    assert.ok(submitted.data.submittedAt);

    // 3. Verify by PM (pmAId)
    const verifyReq = createAuthReq(tokenPmA, {
      params: { projectId: projectAId, measurementId: mbId },
    });
    const verified = await mbController.verifyMeasurement(verifyReq);
    assert.strictEqual(verified.data.status, 'VERIFIED');
    assert.strictEqual(verified.data.verifiedById, pmAId);
    assert.ok(verified.data.verifiedAt);

    // 4. Approve by Owner (ownerAId)
    const approveReq = createAuthReq(tokenOwnerA, {
      params: { projectId: projectAId, measurementId: mbId },
      body: {
        allowExcess: false,
      },
    });
    const approved = await mbController.approveMeasurement(approveReq);
    assert.strictEqual(approved.data.status, 'APPROVED');
    assert.strictEqual(approved.data.approvedById, ownerAId);
    assert.strictEqual(approved.data.previousCumulativeQuantity.toString(), '0');
    assert.strictEqual(approved.data.cumulativeQuantity.toString(), '150');

    // Verify parent BOQ item executedQuantity was atomically updated
    const boq = await prisma.boqItem.findUnique({ where: { id: boqVolumeId } });
    assert.strictEqual(boq.executedQuantity.toString(), '150');
  });

  it('10. should enforce SoD: Creator cannot verify own measurement', async () => {
    // Create DRAFT by PM
    const createReq = createAuthReq(tokenPmA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqVolumeId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 50,
        location: 'SoD Verification test',
      },
    });
    const created = await mbController.createMeasurement(createReq);
    const mbId = created.data.id;

    // Submit by PM
    await mbController.submitMeasurement(createAuthReq(tokenPmA, { params: { projectId: projectAId, measurementId: mbId } }));

    // PM tries to verify own measurement -> ForbiddenError
    const verifyReq = createAuthReq(tokenPmA, {
      params: { projectId: projectAId, measurementId: mbId },
    });
    await assert.rejects(async () => mbController.verifyMeasurement(verifyReq), ForbiddenError);
  });

  it('11. should enforce SoD: Creator cannot approve own measurement', async () => {
    // Create DRAFT by Owner
    const createReq = createAuthReq(tokenOwnerA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqVolumeId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 40,
        location: 'SoD Creator Approval test',
      },
    });
    const created = await mbController.createMeasurement(createReq);
    const mbId = created.data.id;

    await mbController.submitMeasurement(createAuthReq(tokenOwnerA, { params: { projectId: projectAId, measurementId: mbId } }));
    await mbController.verifyMeasurement(createAuthReq(tokenPmA, { params: { projectId: projectAId, measurementId: mbId } }));

    // Owner tries to approve own creation -> ForbiddenError
    const approveReq = createAuthReq(tokenOwnerA, {
      params: { projectId: projectAId, measurementId: mbId },
    });
    await assert.rejects(async () => mbController.approveMeasurement(approveReq), ForbiddenError);
  });

  it('12. should enforce SoD: Submitter cannot approve own measurement', async () => {
    // Create by SE, Submit by PM, Verify by Owner, PM tries to Approve
    const createReq = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqVolumeId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 30,
        location: 'SoD Submitter Approval test',
      },
    });
    const created = await mbController.createMeasurement(createReq);
    const mbId = created.data.id;

    await mbController.submitMeasurement(createAuthReq(tokenPmA, { params: { projectId: projectAId, measurementId: mbId } }));
    await mbController.verifyMeasurement(createAuthReq(tokenOwnerA, { params: { projectId: projectAId, measurementId: mbId } }));

    // PM (who submitted) tries to approve -> ForbiddenError
    const approveReq = createAuthReq(tokenPmA, {
      params: { projectId: projectAId, measurementId: mbId },
    });
    await assert.rejects(async () => mbController.approveMeasurement(approveReq), ForbiddenError);
  });

  // ==========================================
  // 4. REJECTION & REOPENING WORKFLOW
  // ==========================================

  it('13. should handle rejection with mandatory reason and reopening to DRAFT', async () => {
    const createReq = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqAreaId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 200,
        location: 'Rejection test location',
      },
    });
    const created = await mbController.createMeasurement(createReq);
    const mbId = created.data.id;

    await mbController.submitMeasurement(createAuthReq(tokenSeA, { params: { projectId: projectAId, measurementId: mbId } }));

    // PM rejects with reason
    const rejectReq = createAuthReq(tokenPmA, {
      params: { projectId: projectAId, measurementId: mbId },
      body: {
        rejectionReason: 'Level sheet measurements differ from structural drawing Rev 02',
      },
    });
    const rejected = await mbController.rejectMeasurement(rejectReq);
    assert.strictEqual(rejected.data.status, 'REJECTED');
    assert.strictEqual(rejected.data.rejectedById, pmAId);
    assert.ok(rejected.data.rejectionReason);

    // Reopen to DRAFT
    const reopenReq = createAuthReq(tokenSeA, {
      params: { projectId: projectAId, measurementId: mbId },
    });
    const reopened = await mbController.reopenMeasurement(reopenReq);
    assert.strictEqual(reopened.data.status, 'DRAFT');

    // Update dimensions in DRAFT
    const updateReq = createAuthReq(tokenSeA, {
      params: { projectId: projectAId, measurementId: mbId },
      body: {
        directQuantity: 180,
      },
    });
    const updated = await mbController.updateMeasurement(updateReq);
    assert.strictEqual(updated.data.currentQuantity.toString(), '180');
  });

  // ==========================================
  // 5. EXCESS QUANTITY HANDLING
  // ==========================================

  it('14. should block approval if cumulative exceeds BOQ quantity and allowExcess is false', async () => {
    // Current executed on boqCountId is 0, contracted is 200
    // Try to record 250
    const createReq = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqCountId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 250,
        location: 'Excess quantity test',
      },
    });
    const created = await mbController.createMeasurement(createReq);
    const mbId = created.data.id;

    await mbController.submitMeasurement(createAuthReq(tokenSeA, { params: { projectId: projectAId, measurementId: mbId } }));
    await mbController.verifyMeasurement(createAuthReq(tokenPmA, { params: { projectId: projectAId, measurementId: mbId } }));

    // Approve without allowExcess -> BadRequestError
    const approveReq = createAuthReq(tokenOwnerA, {
      params: { projectId: projectAId, measurementId: mbId },
      body: {
        allowExcess: false,
      },
    });
    await assert.rejects(async () => mbController.approveMeasurement(approveReq), BadRequestError);
  });

  it('15. should block excess approval if justification is missing or too short', async () => {
    const item = await prisma.digitalMbRecord.findFirst({ where: { boqItemId: boqCountId, status: 'VERIFIED' } });
    assert.ok(item);

    const approveReq = createAuthReq(tokenOwnerA, {
      params: { projectId: projectAId, measurementId: item.id },
      body: {
        allowExcess: true,
        excessJustification: 'short', // less than 10 chars
      },
    });
    await assert.rejects(async () => mbController.approveMeasurement(approveReq), BadRequestError);
  });

  it('16. should approve excess measurement when allowExcess is true with valid justification', async () => {
    const item = await prisma.digitalMbRecord.findFirst({ where: { boqItemId: boqCountId, status: 'VERIFIED' } });
    assert.ok(item);

    const approveReq = createAuthReq(tokenOwnerA, {
      params: { projectId: projectAId, measurementId: item.id },
      body: {
        allowExcess: true,
        excessJustification: 'Site layout expanded by client variation order #4 for additional storm drainage',
      },
    });
    const approved = await mbController.approveMeasurement(approveReq);
    assert.strictEqual(approved.data.status, 'APPROVED');
    assert.strictEqual(approved.data.isExcess, true);
    assert.ok(approved.data.excessJustification);

    const boq = await prisma.boqItem.findUnique({ where: { id: boqCountId } });
    assert.strictEqual(boq.executedQuantity.toString(), '250');
  });

  // ==========================================
  // 6. IMMUTABILITY & AUDIT PROTECTION
  // ==========================================

  it('17. should reject updating an APPROVED measurement', async () => {
    const item = await prisma.digitalMbRecord.findFirst({ where: { boqItemId: boqCountId, status: 'APPROVED' } });
    assert.ok(item);

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectAId, measurementId: item.id },
      body: {
        location: 'Tampered location',
      },
    });
    await assert.rejects(async () => mbController.updateMeasurement(req), BadRequestError);
  });

  it('18. should reject deleting an APPROVED measurement', async () => {
    const item = await prisma.digitalMbRecord.findFirst({ where: { boqItemId: boqCountId, status: 'APPROVED' } });
    assert.ok(item);

    const req = createAuthReq(tokenOwnerA, {
      params: { projectId: projectAId, measurementId: item.id },
    });
    await assert.rejects(async () => mbController.deleteMeasurement(req), BadRequestError);
  });

  // ==========================================
  // 7. CORRECTION / ADJUSTMENT RECORDS
  // ==========================================

  it('19. should allow creating a compensating correction record referencing an approved MB', async () => {
    // Correct previous 250 count down by 20 (adjustment directQuantity: -20)
    const approvedItem = await prisma.digitalMbRecord.findFirst({ where: { boqItemId: boqCountId, status: 'APPROVED' } });
    assert.ok(approvedItem);

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqCountId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: -20,
        location: 'Drainage line correction',
        isCorrection: true,
        supersedesMbRecordId: approvedItem.id,
        correctionReason: 'Survey check revealed 20 precast covers belonged to contractor stock not installed in permanent works',
      },
    });

    const res = await mbController.createMeasurement(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.isCorrection, true);
    assert.strictEqual(res.data.supersedesMbRecordId, approvedItem.id);
    assert.strictEqual(res.data.currentQuantity.toString(), '-20');

    // Move through lifecycle
    const mbId = res.data.id;
    await mbController.submitMeasurement(createAuthReq(tokenSeA, { params: { projectId: projectAId, measurementId: mbId } }));
    await mbController.verifyMeasurement(createAuthReq(tokenPmA, { params: { projectId: projectAId, measurementId: mbId } }));
    const approvedCorr = await mbController.approveMeasurement(
      createAuthReq(tokenOwnerA, {
        params: { projectId: projectAId, measurementId: mbId },
        body: {
          allowExcess: true,
          excessJustification: 'Approved negative correction bringing excess count down from 250 to 230',
        },
      })
    );

    assert.strictEqual(approvedCorr.data.status, 'APPROVED');
    assert.strictEqual(approvedCorr.data.previousCumulativeQuantity.toString(), '250');
    assert.strictEqual(approvedCorr.data.cumulativeQuantity.toString(), '230');

    // Verify parent BOQ item executedQuantity decremented to 230
    const boq = await prisma.boqItem.findUnique({ where: { id: boqCountId } });
    assert.strictEqual(boq.executedQuantity.toString(), '230');
  });

  // ==========================================
  // 8. CONCURRENCY & CUMULATIVE QUANTITY
  // ==========================================

  it('20. should handle concurrent approvals without lost updates using pessimistic locking', async () => {
    // Create 3 separate measurements for boqLengthId (contracted: 2500, initial executed: 0)
    const mbIds: string[] = [];

    for (let i = 1; i <= 3; i++) {
      const createReq = createAuthReq(tokenSeA, {
        params: { projectId: projectAId },
        body: {
          boqItemId: boqLengthId,
          measurementDate: '2026-09-11',
          measurementType: 'DIRECT_QUANTITY',
          directQuantity: 100 * i, // 100, 200, 300 -> Total should be 600
          location: `Concurrent section ${i}`,
        },
      });
      const created = await mbController.createMeasurement(createReq);
      const id = created.data.id;
      mbIds.push(id);

      await mbController.submitMeasurement(createAuthReq(tokenSeA, { params: { projectId: projectAId, measurementId: id } }));
      await mbController.verifyMeasurement(createAuthReq(tokenPmA, { params: { projectId: projectAId, measurementId: id } }));
    }

    // Approve all 3 concurrently
    const approvalPromises = mbIds.map((id) =>
      mbController.approveMeasurement(
        createAuthReq(tokenOwnerA, {
          params: { projectId: projectAId, measurementId: id },
        })
      )
    );

    const results = await Promise.all(approvalPromises);
    assert.strictEqual(results.length, 3);

    // Verify parent BOQ executedQuantity equals 600
    const boq = await prisma.boqItem.findUnique({ where: { id: boqLengthId } });
    assert.strictEqual(boq.executedQuantity.toString(), '600');
  });

  // ==========================================
  // 9. RECONCILIATION & BILLING INTERFACE
  // ==========================================

  it('21. should prove exact reconciliation between SUM(approved) and BoqItem.executedQuantity', async () => {
    const sumResult: any[] = await prisma.$queryRaw`SELECT COALESCE(SUM(current_quantity), 0) as total FROM digital_mb_records WHERE tenant_id = ${tenantAId}::uuid AND project_id = ${projectAId}::uuid AND boq_item_id = ${boqLengthId}::uuid AND status = 'APPROVED'`;
    const approvedSum = sumResult[0].total.toString();

    const boq = await prisma.boqItem.findUnique({ where: { id: boqLengthId } });
    assert.strictEqual(boq.executedQuantity.toString(), approvedSum);
  });

  it('22. should update Phase 10 billing position with certified amount and progress', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectAId },
    });

    const res = await boqController.getBillingPositions(req);
    assert.strictEqual(res.success, true);

    const pos = res.data.find((p) => p.boqItemId === boqLengthId);
    assert.ok(pos);
    assert.strictEqual(pos.contractQuantity, '2500');
    assert.strictEqual(pos.approvedCumulativeQuantity, '600');
    assert.strictEqual(pos.remainingQuantity, '1900');
    // 600 * 850 = 510000.00
    assert.strictEqual(pos.certifiedAmount, '510000.00');
    // 600 / 2500 * 100 = 24.00%
    assert.strictEqual(pos.completionPercentage, '24.00');
  });

  // ==========================================
  // 10. SECURITY & VALIDATION CONSTRAINTS
  // ==========================================

  it('23. should reject invalid chainage range (chainageTo < chainageFrom)', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectAId },
      body: {
        boqItemId: boqLengthId,
        measurementDate: '2026-09-11',
        measurementType: 'DIRECT_QUANTITY',
        directQuantity: 10,
        location: 'Invalid chainage test',
        chainageFrom: 20,
        chainageTo: 10,
      },
    });

    await assert.rejects(async () => mbController.createMeasurement(req));
  });

  it('24. should prevent cross-tenant access to MB records', async () => {
    const mbA = await prisma.digitalMbRecord.findFirst({ where: { projectId: projectAId } });
    assert.ok(mbA);

    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectAId, measurementId: mbA.id },
    });

    await assert.rejects(async () => mbController.getMeasurement(req), ForbiddenError);
  });
});
