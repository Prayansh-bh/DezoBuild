import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { MaterialsController } from '../src/modules/materials/controllers/materials.controller';
import { VendorsController } from '../src/modules/materials/controllers/vendors.controller';
import { StoresController } from '../src/modules/materials/controllers/stores.controller';
import { MaterialService } from '../src/modules/materials/services/material.service';
import { VendorService } from '../src/modules/materials/services/vendor.service';
import { StoreService } from '../src/modules/materials/services/store.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
  ValidationError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 07.1 — Material Master + Vendor Master + Store Core Integration Suite', () => {
  let dbService: DatabaseService;
  let materialsController: MaterialsController;
  let vendorsController: VendorsController;
  let storesController: StoresController;
  let materialService: MaterialService;
  let vendorService: VendorService;
  let storeService: StoreService;
  let tokenService: TokenService;

  // Tenant A (STARTER Plan - has materials:core)
  const tenantAId = 'aaaaaaaa-7777-4444-aaaa-aaaaaaaaaaaa';
  const ownerAId = 'aaaaaaaa-1111-4444-aaaa-aaaaaaaaaaaa';
  const pmAId = 'aaaaaaaa-2222-4444-aaaa-aaaaaaaaaaaa';
  const seAId = 'aaaaaaaa-3333-4444-aaaa-aaaaaaaaaaaa';
  const storeUserAId = 'aaaaaaaa-4444-4444-aaaa-aaaaaaaaaaaa';
  const noAccessUserAId = 'aaaaaaaa-5555-4444-aaaa-aaaaaaaaaaaa';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSeA: string;
  let tokenStoreUserA: string;
  let tokenNoAccessUserA: string;

  // Tenant B (PROFESSIONAL Plan)
  const tenantBId = 'bbbbbbbb-7777-4444-bbbb-bbbbbbbbbbbb';
  const ownerBId = 'bbbbbbbb-1111-4444-bbbb-bbbbbbbbbbbb';
  let tokenOwnerB: string;

  // Tenant C (No materials:core entitlement override to disabled)
  const tenantCId = 'cccccccc-7777-4444-cccc-cccccccccccc';
  const ownerCId = 'cccccccc-1111-4444-cccc-cccccccccccc';
  let tokenOwnerC: string;

  let companyAId: string;
  let companyBId: string;
  let projectAId: string;
  let projectBId: string;

  let starterPlanId: string;
  let proPlanId: string;

  let roleOwnerId: string;
  let rolePmId: string;
  let roleSeId: string;
  let roleEmpId: string;

  let createdMaterialAId: string;
  let createdVendorAId: string;
  let createdStoreAId: string;

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
    const prisma = dbService.getClient() as any;

    // 1. Seed Roles & Plans
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    tokenService = TokenService.getInstance();
    materialService = MaterialService.getInstance();
    vendorService = VendorService.getInstance();
    storeService = StoreService.getInstance();

    materialsController = new MaterialsController(materialService);
    vendorsController = new VendorsController(vendorService);
    storesController = new StoresController(storeService);

    const starterPlan = await prisma.platformPlan.findUnique({ where: { code: 'STARTER' } });
    const proPlan = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    starterPlanId = starterPlan.id;
    proPlanId = proPlan.id;

    const roles = await prisma.role.findMany({ where: { isSystemRole: true } });
    roleOwnerId = roles.find((r: any) => r.name === 'COMPANY_OWNER')!.id;
    rolePmId = roles.find((r: any) => r.name === 'PROJECT_MANAGER')!.id;
    roleSeId = roles.find((r: any) => r.name === 'SITE_ENGINEER')!.id;
    roleEmpId = roles.find((r: any) => r.name === 'EMPLOYEE')!.id;

    // Clean up test tenants
    const tenantIds = [tenantAId, tenantBId, tenantCId];
    await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.material.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });

    // 2. Setup Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-MAT-A',
        name: 'Tenant Alpha Materials Corp',
        planTier: 'STARTER',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: starterPlanId,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-MAT-A',
        name: 'Alpha Infra Pvt Ltd',
        legalName: 'Alpha Infrastructure Solutions Pvt Ltd',
        panNumber: 'AAAAA1111A',
        gstin: '27AAAAA1111A1Z1',
        email: 'alpha@materials.com',
        phone: '9876543210',
        address: 'Mumbai HQ',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyAId = compA.id;

    // Create users for Tenant A
    await prisma.user.createMany({
      data: [
        { id: ownerAId, tenantId: tenantAId, email: 'owner@alpha-mat.com', passwordHash: 'hash', fullName: 'Owner Alpha' },
        { id: pmAId, tenantId: tenantAId, email: 'pm@alpha-mat.com', passwordHash: 'hash', fullName: 'PM Alpha' },
        { id: seAId, tenantId: tenantAId, email: 'se@alpha-mat.com', passwordHash: 'hash', fullName: 'SE Alpha' },
        { id: storeUserAId, tenantId: tenantAId, email: 'store@alpha-mat.com', passwordHash: 'hash', fullName: 'Storekeeper Alpha' },
        { id: noAccessUserAId, tenantId: tenantAId, email: 'noaccess@alpha-mat.com', passwordHash: 'hash', fullName: 'No Access Alpha' },
      ],
    });

    // Assign roles
    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: roleOwnerId, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: rolePmId, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: seAId, roleId: roleSeId, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: storeUserAId, roleId: roleSeId, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: noAccessUserAId, roleId: roleEmpId, scopeType: 'TENANT' },
      ],
    });

    // Create Project in Tenant A
    const projA = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJ-MAT-01',
        name: 'Alpha Tower Site',
        status: 'ACTIVE',
      },
    });
    projectAId = projA.id;

    // Add members to Project A
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectAId, userId: ownerAId, projectRole: 'LEAD', isLead: true },
        { tenantId: tenantAId, projectId: projectAId, userId: pmAId, projectRole: 'MANAGER', isLead: false },
        { tenantId: tenantAId, projectId: projectAId, userId: seAId, projectRole: 'ENGINEER', isLead: false },
      ],
    });

    // 3. Setup Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-MAT-B',
        name: 'Tenant Beta Logistics Ltd',
        planTier: 'PROFESSIONAL',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: proPlanId,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
    const compB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'COMP-MAT-B',
        name: 'Beta Constro Ltd',
        legalName: 'Beta Construction Solutions Ltd',
        panNumber: 'BBBBB2222B',
        gstin: '27BBBBB2222B1Z2',
        email: 'beta@materials.com',
        phone: '9876543211',
        address: 'Pune HQ',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    companyBId = compB.id;
    await prisma.user.create({
      data: { id: ownerBId, tenantId: tenantBId, email: 'owner@beta-mat.com', passwordHash: 'hash', fullName: 'Owner Beta' },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: ownerBId, roleId: roleOwnerId, scopeType: 'TENANT' },
    });
    const projB = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyBId,
        code: 'PRJ-MAT-02',
        name: 'Beta Metro Yard',
        status: 'ACTIVE',
      },
    });
    projectBId = projB.id;

    // 4. Setup Tenant C (materials:core explicitly disabled via override)
    await prisma.tenant.create({
      data: {
        id: tenantCId,
        code: 'TENANT-MAT-C',
        name: 'Tenant Gamma No-Materials',
        planTier: 'STARTER',
      },
    });
    const subC = await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantCId,
        planId: starterPlanId,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
    await prisma.tenantEntitlementOverride.create({
      data: {
        tenantId: tenantCId,
        subscriptionId: subC.id,
        featureKey: 'materials:core',
        isEnabled: false,
      },
    });
    await prisma.user.create({
      data: { id: ownerCId, tenantId: tenantCId, email: 'owner@gamma-mat.com', passwordHash: 'hash', fullName: 'Owner Gamma' },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantCId, userId: ownerCId, roleId: roleOwnerId, scopeType: 'TENANT' },
    });

    // Generate tokens
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-owner-a',
      sessionVersion: 1,
    });
    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-pm-a',
      sessionVersion: 1,
    });
    tokenSeA = tokenService.createAccessToken({
      userId: seAId,
      tenantId: tenantAId,
      sessionId: 'sess-se-a',
      sessionVersion: 1,
    });
    tokenStoreUserA = tokenService.createAccessToken({
      userId: storeUserAId,
      tenantId: tenantAId,
      sessionId: 'sess-store-a',
      sessionVersion: 1,
    });
    tokenNoAccessUserA = tokenService.createAccessToken({
      userId: noAccessUserAId,
      tenantId: tenantAId,
      sessionId: 'sess-noaccess-a',
      sessionVersion: 1,
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-owner-b',
      sessionVersion: 1,
    });
    tokenOwnerC = tokenService.createAccessToken({
      userId: ownerCId,
      tenantId: tenantCId,
      sessionId: 'sess-owner-c',
      sessionVersion: 1,
    });
  });

  after(async () => {
    const prisma = dbService.getClient() as any;
    const tenantIds = [tenantAId, tenantBId, tenantCId];
    await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.material.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  });

  // ==========================================
  // 1. MATERIAL MASTER TESTS (1-13)
  // ==========================================

  it('1. create material — creates a valid Material Master with UOMs and rates', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        itemCode: 'mat-cem-53',
        name: 'UltraTech OPC 53 Grade Cement',
        category: 'Cement & Concrete',
        specification: 'IS 12269 compliant high strength Portland cement',
        primaryUom: 'BAGS',
        secondaryUom: 'MT',
        conversionFactor: 20, // 20 bags = 1 MT
        hsnCode: '25232910',
        standardRate: 390.50,
        reorderLevel: 500,
        safetyStock: 200,
        isBatchTracked: true,
      },
    });

    const res = await materialsController.createMaterial(req);
    assert.equal(res.success, true);
    assert.ok(res.data.id);
    assert.equal(res.data.itemCode, 'MAT-CEM-53'); // Normalized uppercase
    assert.equal(res.data.name, 'UltraTech OPC 53 Grade Cement');
    assert.equal(res.data.primaryUom, 'BAGS');
    assert.equal(res.data.secondaryUom, 'MT');
    assert.equal(Number(res.data.conversionFactor), 20);
    assert.equal(res.data.status, 'ACTIVE');

    createdMaterialAId = res.data.id;
  });

  it('2. read material — fetches material by ID and lists with query filter', async () => {
    const getReq = createAuthReq(tokenOwnerA, {
      params: { id: createdMaterialAId },
    });
    const getRes = await materialsController.getMaterial(getReq);
    assert.equal(getRes.success, true);
    assert.equal(getRes.data.id, createdMaterialAId);
    assert.equal(getRes.data.itemCode, 'MAT-CEM-53');

    const listReq = createAuthReq(tokenPmA, {
      query: { search: 'UltraTech', category: 'Cement & Concrete' },
    });
    const listRes = await materialsController.listMaterials(listReq);
    assert.equal(listRes.success, true);
    assert.equal(listRes.data.items.length, 1);
    assert.equal(listRes.data.items[0]!.id, createdMaterialAId);
  });

  it('3. update material — updates standard rate, reorder level, and description', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdMaterialAId },
      body: {
        description: 'Updated delivery lead time: 2 days',
        standardRate: 405.00,
        reorderLevel: 600,
      },
    });

    const res = await materialsController.updateMaterial(req);
    assert.equal(res.success, true);
    assert.equal(Number(res.data.standardRate), 405.00);
    assert.equal(Number(res.data.reorderLevel), 600);
    assert.equal(res.data.description, 'Updated delivery lead time: 2 days');
  });

  it('4. tenant isolation — Tenant B cannot see Tenant A material', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { id: createdMaterialAId },
    });

    await assert.rejects(
      async () => materialsController.getMaterial(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  it('5. duplicate code same tenant → DENY (409 Conflict)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        itemCode: 'MAT-CEM-53', // Duplicate within Tenant A
        name: 'Duplicate Cement Item',
        category: 'Cement & Concrete',
        primaryUom: 'BAGS',
      },
    });

    await assert.rejects(
      async () => materialsController.createMaterial(req),
      (err: any) => err instanceof ConflictError
    );
  });

  it('6. same code different tenant → ALLOW', async () => {
    const req = createAuthReq(tokenOwnerB, {
      body: {
        itemCode: 'MAT-CEM-53', // Same code but in Tenant B
        name: 'JSW Concreel Cement',
        category: 'Cement & Concrete',
        primaryUom: 'BAGS',
      },
    });

    const res = await materialsController.createMaterial(req);
    assert.equal(res.success, true);
    assert.equal(res.data.tenantId, tenantBId);
    assert.equal(res.data.itemCode, 'MAT-CEM-53');
  });

  it('7. invalid UOM → DENY (400 Bad Request / Validation error)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        itemCode: 'MAT-INVALID-UOM',
        name: 'Invalid UOM Item',
        category: 'Other',
        primaryUom: 'INVALID_METRIC',
      },
    });

    await assert.rejects(
      async () => materialsController.createMaterial(req),
      (err: any) => err instanceof ValidationError || err instanceof BadRequestError
    );
  });

  it('8. invalid conversion factor without secondary UOM → DENY (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        itemCode: 'MAT-CONV-FAIL',
        name: 'Steel Rebar Fe500',
        category: 'Steel & Rebar',
        primaryUom: 'KG',
        secondaryUom: 'MT',
        conversionFactor: 0, // Invalid: must be > 0 when secondary UOM exists
      },
    });

    await assert.rejects(
      async () => materialsController.createMaterial(req),
      (err: any) => err instanceof ValidationError || err instanceof BadRequestError
    );
  });

  it('9. materials:view missing → DENY (403 Forbidden)', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      params: { id: createdMaterialAId },
    });

    await assert.rejects(
      async () => materialsController.getMaterial(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('10. materials:manage missing → DENY (403 Forbidden)', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: {
        itemCode: 'MAT-UNAUTH-CREATE',
        name: 'Unauthorized Material',
        category: 'Other',
        primaryUom: 'NOS',
      },
    });

    await assert.rejects(
      async () => materialsController.createMaterial(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('11. materials:core entitlement missing → DENY (403 Forbidden)', async () => {
    const req = createAuthReq(tokenOwnerC, {
      body: {
        itemCode: 'MAT-NO-ENTITLEMENT',
        name: 'Blocked Material',
        category: 'Other',
        primaryUom: 'NOS',
      },
    });

    await assert.rejects(
      async () => materialsController.createMaterial(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('12. inactive material update/read behavior — can inactivate and query status', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdMaterialAId },
      body: {
        status: 'INACTIVE',
      },
    });

    const res = await materialsController.updateMaterial(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'INACTIVE');

    const listActiveReq = createAuthReq(tokenOwnerA, {
      query: { status: 'ACTIVE' },
    });
    const listActiveRes = await materialsController.listMaterials(listActiveReq);
    assert.equal(listActiveRes.data.items.some((m) => m.id === createdMaterialAId), false);

    const listInactiveReq = createAuthReq(tokenOwnerA, {
      query: { status: 'INACTIVE' },
    });
    const listInactiveRes = await materialsController.listMaterials(listInactiveReq);
    assert.equal(listInactiveRes.data.items.some((m) => m.id === createdMaterialAId), true);
  });

  it('13. tenantId injection → Sanitized / Forced to authenticated tenantId', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        tenantId: tenantBId, // Injected foreign tenantId
        itemCode: 'MAT-INJECT-TEST',
        name: 'Injection Test Material',
        category: 'Other',
        primaryUom: 'NOS',
      },
    });

    const res = await materialsController.createMaterial(req);
    assert.equal(res.success, true);
    assert.equal(res.data.tenantId, tenantAId); // Preserves authenticated tenant context
  });

  // ==========================================
  // 2. VENDOR MASTER TESTS (14-20)
  // ==========================================

  it('14. create vendor — creates vendor with compliance tax details and terms', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        code: 'VND-TATA-STL',
        name: 'Tata Steel Distribution Ltd',
        gstin: '27AAACT2727Q1ZW',
        pan: 'AAACT2727Q',
        contactPerson: 'Rajesh Sharma',
        email: 'sales@tatasteel.com',
        phone: '9820012345',
        address: 'Bandra Kurla Complex, Mumbai',
        paymentTerms: 'Net 30 Days from GRN',
      },
    });

    const res = await vendorsController.createVendor(req);
    assert.equal(res.success, true);
    assert.ok(res.data.id);
    assert.equal(res.data.code, 'VND-TATA-STL');
    assert.equal(res.data.name, 'Tata Steel Distribution Ltd');
    assert.equal(res.data.gstin, '27AAACT2727Q1ZW');
    assert.equal(res.data.pan, 'AAACT2727Q');
    assert.equal(res.data.status, 'ACTIVE');

    createdVendorAId = res.data.id;
  });

  it('15. read vendor — reads vendor by ID and lists with query filter', async () => {
    const getReq = createAuthReq(tokenPmA, {
      params: { id: createdVendorAId },
    });
    const getRes = await vendorsController.getVendor(getReq);
    assert.equal(getRes.success, true);
    assert.equal(getRes.data.id, createdVendorAId);
    assert.equal(getRes.data.name, 'Tata Steel Distribution Ltd');

    const listReq = createAuthReq(tokenPmA, {
      query: { search: 'Tata Steel' },
    });
    const listRes = await vendorsController.listVendors(listReq);
    assert.equal(listRes.success, true);
    assert.equal(listRes.data.items.length, 1);
  });

  it('16. update vendor — updates contact information and payment terms', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdVendorAId },
      body: {
        phone: '9820099999',
        paymentTerms: 'Immediate upon 3-Way GRN Verification',
      },
    });

    const res = await vendorsController.updateVendor(req);
    assert.equal(res.success, true);
    assert.equal(res.data.phone, '9820099999');
    assert.equal(res.data.paymentTerms, 'Immediate upon 3-Way GRN Verification');
  });

  it('17. duplicate vendor code same tenant → DENY (409 Conflict)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        code: 'VND-TATA-STL', // Duplicate
        name: 'Tata Alternate Vendor',
      },
    });

    await assert.rejects(
      async () => vendorsController.createVendor(req),
      (err: any) => err instanceof ConflictError
    );
  });

  it('18. cross-tenant vendor isolation → DENY (404 Not Found)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { id: createdVendorAId },
    });

    await assert.rejects(
      async () => vendorsController.getVendor(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  it('19. tenantId injection on vendor creation → Sanitized to authentic tenantId', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        tenantId: tenantBId,
        code: 'VND-INJECT-01',
        name: 'Injected Vendor',
      },
    });

    const res = await vendorsController.createVendor(req);
    assert.equal(res.success, true);
    assert.equal(res.data.tenantId, tenantAId);
  });

  it('20. vendor permission/entitlement denial — missing materials:manage → DENY', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: {
        code: 'VND-NO-PERM',
        name: 'No Permission Vendor',
      },
    });

    await assert.rejects(
      async () => vendorsController.createVendor(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // ==========================================
  // 3. STORE / WAREHOUSE CORE TESTS (21-30)
  // ==========================================

  it('21. create central store — creates central warehouse (projectId = null)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        code: 'STR-CENTRAL-01',
        name: 'Alpha Central Logistics Yard',
        description: 'Primary central warehouse for Western Zone',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
        address: 'Thane West Depot, Maharashtra',
        location: '19.2183, 72.9781',
      },
    });

    const res = await storesController.createStore(req);
    assert.equal(res.success, true);
    assert.ok(res.data.id);
    assert.equal(res.data.code, 'STR-CENTRAL-01');
    assert.equal(res.data.isCentralWarehouse, true);
    assert.equal(res.data.projectId, null);

    createdStoreAId = res.data.id;
  });

  it('22. create project store — creates project site yard store tied to project', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        code: 'STR-SITE-TOWER-01',
        name: 'Alpha Tower Site Store',
        description: 'On-site store for Alpha Tower construction',
        storeType: 'PROJECT_SITE',
        isCentralWarehouse: false,
        projectId: projectAId,
        location: 'Site Block B Yard',
      },
    });

    const res = await storesController.createStore(req);
    assert.equal(res.success, true);
    assert.equal(res.data.code, 'STR-SITE-TOWER-01');
    assert.equal(res.data.projectId, projectAId);
    assert.equal(res.data.project?.name, 'Alpha Tower Site');
  });

  it('23. invalid foreign project ID → DENY (404 Not Found)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        code: 'STR-FOREIGN-PRJ',
        name: 'Foreign Project Store',
        storeType: 'PROJECT_SITE',
        projectId: '00000000-0000-0000-0000-000000000000',
      },
    });

    await assert.rejects(
      async () => storesController.createStore(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  it('24. cross-tenant project association → DENY (403 Forbidden)', async () => {
    // Tenant A attempts to tie a store to Tenant B's project
    const req = createAuthReq(tokenOwnerA, {
      body: {
        code: 'STR-CROSS-PRJ',
        name: 'Cross Tenant Store',
        storeType: 'PROJECT_SITE',
        projectId: projectBId, // Belongs to Tenant B
      },
    });

    await assert.rejects(
      async () => storesController.createStore(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('25. cross-tenant store access → DENY (404 Not Found)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { storeId: createdStoreAId },
    });

    await assert.rejects(
      async () => storesController.getStore(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  it('26. duplicate store code within tenant → DENY (409 Conflict)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        code: 'STR-CENTRAL-01', // Duplicate code in Tenant A
        name: 'Duplicate Central Store',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
      },
    });

    await assert.rejects(
      async () => storesController.createStore(req),
      (err: any) => err instanceof ConflictError
    );
  });

  it('27. materials:view enforcement for store queries', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      params: { storeId: createdStoreAId },
    });

    await assert.rejects(
      async () => storesController.getStore(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('28. materials:manage enforcement for store mutations', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: {
        code: 'STR-UNAUTH',
        name: 'Unauthorized Store',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
      },
    });

    await assert.rejects(
      async () => storesController.createStore(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('29. entitlement enforcement for stores — materials:core missing → DENY', async () => {
    const req = createAuthReq(tokenOwnerC, {
      body: {
        code: 'STR-NO-ENTITLEMENT',
        name: 'Blocked Store',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
      },
    });

    await assert.rejects(
      async () => storesController.createStore(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('30. inactive store behavior — can update status to INACTIVE and filter', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: createdStoreAId },
      body: {
        status: 'INACTIVE',
      },
    });

    const res = await storesController.updateStore(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'INACTIVE');

    const listActiveReq = createAuthReq(tokenOwnerA, {
      query: { status: 'ACTIVE' },
    });
    const listActiveRes = await storesController.listStores(listActiveReq);
    assert.equal(listActiveRes.data.items.some((s) => s.id === createdStoreAId), false);

    const listInactiveReq = createAuthReq(tokenOwnerA, {
      query: { status: 'INACTIVE' },
    });
    const listInactiveRes = await storesController.listStores(listInactiveReq);
    assert.equal(listInactiveRes.data.items.some((s) => s.id === createdStoreAId), true);
  });
});
