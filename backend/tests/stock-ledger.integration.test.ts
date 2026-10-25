import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { StockController } from '../src/modules/materials/controllers/stock.controller';
import { StockLedgerService } from '../src/modules/materials/services/stock-ledger.service';
import { MaterialService } from '../src/modules/materials/services/material.service';
import { StoreService } from '../src/modules/materials/services/store.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 07.2 — Stock Ledger + Balance Engine Integration Suite', () => {
  let dbService: DatabaseService;
  let stockController: StockController;
  let stockLedgerService: StockLedgerService;
  let materialService: MaterialService;
  let storeService: StoreService;
  let tokenService: TokenService;

  // Tenant A (STARTER Plan - has materials:core)
  const tenantAId = 'aaaaaaaa-7777-8888-aaaa-aaaaaaaaaaaa';
  const ownerAId = 'aaaaaaaa-1111-8888-aaaa-aaaaaaaaaaaa';
  const pmAId = 'aaaaaaaa-2222-8888-aaaa-aaaaaaaaaaaa';
  const seAId = 'aaaaaaaa-3333-8888-aaaa-aaaaaaaaaaaa';
  const storeUserAId = 'aaaaaaaa-4444-8888-aaaa-aaaaaaaaaaaa';
  const noAccessUserAId = 'aaaaaaaa-5555-8888-aaaa-aaaaaaaaaaaa';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSeA: string;
  let tokenStoreUserA: string;
  let tokenNoAccessUserA: string;

  // Tenant B (PROFESSIONAL Plan)
  const tenantBId = 'bbbbbbbb-7777-8888-bbbb-bbbbbbbbbbbb';
  const ownerBId = 'bbbbbbbb-1111-8888-bbbb-bbbbbbbbbbbb';
  let tokenOwnerB: string;

  // Tenant C (materials:core disabled via entitlement override)
  const tenantCId = 'cccccccc-7777-8888-cccc-cccccccccccc';
  const ownerCId = 'cccccccc-1111-8888-cccc-cccccccccccc';
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

  let storeA1Id: string;
  let storeA2Id: string;
  let storeB1Id: string;

  let materialCementAId: string;
  let materialSteelAId: string;
  let materialPaintAId: string;
  let materialCementBId: string;

  function createAuthReq(
    token: string,
    options?: {
      body?: unknown;
      params?: Record<string, string>;
      query?: Record<string, string>;
    }
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
    storeService = StoreService.getInstance();
    stockLedgerService = StockLedgerService.getInstance();
    stockController = new StockController(stockLedgerService);

    const starterPlan = await prisma.platformPlan.findUnique({
      where: { code: 'STARTER' },
    });
    starterPlanId = starterPlan.id;

    const proPlan = await prisma.platformPlan.findUnique({
      where: { code: 'PROFESSIONAL' },
    });
    proPlanId = proPlan.id;

    const roles = await prisma.role.findMany({ where: { isSystemRole: true } });
    roleOwnerId = roles.find((r: any) => r.name === 'COMPANY_OWNER')!.id;
    rolePmId = roles.find((r: any) => r.name === 'PROJECT_MANAGER')!.id;
    roleSeId = roles.find((r: any) => r.name === 'SITE_ENGINEER')!.id;
    roleEmpId = roles.find((r: any) => r.name === 'EMPLOYEE')!.id;

    // 2. Clean up previous test tenant data
    const tenantIds = [tenantAId, tenantBId, tenantCId];
    await prisma.stockMovement.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.storeStockBalance.deleteMany({ where: { tenantId: { in: tenantIds } } });
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

    // 3. Create Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-STK-A8',
        name: 'Tenant Alpha Stock Corp 8',
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
        code: 'COMP-STK-A8',
        name: 'Alpha Infra Pvt Ltd 8',
        legalName: 'Alpha Infrastructure Solutions Pvt Ltd 8',
        panNumber: 'AAAAA1118A',
        gstin: '27AAAAA1118A1Z1',
        email: 'alpha@stock-a8.com',
        phone: '9876543280',
        address: 'Mumbai HQ',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyAId = compA.id;

    // Create Users in Tenant A
    await prisma.user.createMany({
      data: [
        {
          id: ownerAId,
          tenantId: tenantAId,
          email: 'owner@stock-a8.com',
          passwordHash: 'hash',
          fullName: 'Owner Stock A8',
          status: 'ACTIVE',
        },
        {
          id: pmAId,
          tenantId: tenantAId,
          email: 'pm@stock-a8.com',
          passwordHash: 'hash',
          fullName: 'PM Stock A8',
          status: 'ACTIVE',
        },
        {
          id: seAId,
          tenantId: tenantAId,
          email: 'se@stock-a8.com',
          passwordHash: 'hash',
          fullName: 'SE Stock A8',
          status: 'ACTIVE',
        },
        {
          id: storeUserAId,
          tenantId: tenantAId,
          email: 'storekeeper@stock-a8.com',
          passwordHash: 'hash',
          fullName: 'Storekeeper Stock A8',
          status: 'ACTIVE',
        },
        {
          id: noAccessUserAId,
          tenantId: tenantAId,
          email: 'noaccess@stock-a8.com',
          passwordHash: 'hash',
          fullName: 'No Access Stock A8',
          status: 'ACTIVE',
        },
      ],
    });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: roleOwnerId, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: rolePmId, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: seAId, roleId: roleSeId, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: storeUserAId, roleId: roleSeId, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: noAccessUserAId, roleId: roleEmpId, scopeType: 'TENANT' },
      ],
    });

    const projA = await prisma.project.create({
      data: {
        id: 'aaaaaaaa-9999-8888-aaaa-aaaaaaaaaaaa',
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PROJ-STK-A8',
        name: 'Project Stock A8',
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

    // 4. Create Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-STK-B8',
        name: 'Tenant Beta Stock Ltd 8',
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
        code: 'COMP-STK-B8',
        name: 'Beta Constro Ltd 8',
        legalName: 'Beta Construction Solutions Ltd 8',
        panNumber: 'BBBBB2228B',
        gstin: '27BBBBB2228B1Z2',
        email: 'beta@stock-b8.com',
        phone: '9876543281',
        address: 'Pune HQ',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    companyBId = compB.id;

    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner@stock-b8.com',
        passwordHash: 'hash',
        fullName: 'Owner Stock B8',
        status: 'ACTIVE',
      },
    });

    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: ownerBId, roleId: roleOwnerId, scopeType: 'TENANT' },
    });

    const projB = await prisma.project.create({
      data: {
        id: 'bbbbbbbb-9999-8888-bbbb-bbbbbbbbbbbb',
        tenantId: tenantBId,
        companyId: companyBId,
        code: 'PROJ-STK-B8',
        name: 'Project Stock B8',
        status: 'ACTIVE',
      },
    });
    projectBId = projB.id;

    // 5. Create Tenant C (No materials:core)
    await prisma.tenant.create({
      data: {
        id: tenantCId,
        code: 'TENANT-STK-C8',
        name: 'Tenant Gamma Stock 8',
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
      data: {
        id: ownerCId,
        tenantId: tenantCId,
        email: 'owner@stock-c8.com',
        passwordHash: 'hash',
        fullName: 'Owner Stock C8',
        status: 'ACTIVE',
      },
    });

    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantCId, userId: ownerCId, roleId: roleOwnerId, scopeType: 'TENANT' },
    });

    // 6. Create Stores
    const sA1 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        code: 'STR-MAIN-A8',
        name: 'Main Site Store A8',
        storeType: 'SITE',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    storeA1Id = sA1.id;

    const sA2 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        code: 'STR-CENTRAL-A8',
        name: 'Central Warehouse A8',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
        status: 'ACTIVE',
      },
    });
    storeA2Id = sA2.id;

    const sB1 = await prisma.store.create({
      data: {
        tenantId: tenantBId,
        projectId: projectBId,
        code: 'STR-MAIN-B8',
        name: 'Main Site Store B8',
        storeType: 'SITE',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    storeB1Id = sB1.id;

    // Assign storeUserA to storeA1
    await prisma.storeAccessAssignment.create({
      data: {
        tenantId: tenantAId,
        storeId: storeA1Id,
        userId: storeUserAId,
        accessLevel: 'FULL',
      },
    });

    // 7. Create Materials
    const matCement = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-CEM-OPC53-8',
        name: 'OPC 53 Grade Cement',
        category: 'CIVIL',
        primaryUom: 'BAG',
        hsnCode: '25232910',
        standardRate: 380,
      },
    });
    materialCementAId = matCement.id;

    const matSteel = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-STL-TMT16-8',
        name: 'TMT Steel 16mm Fe500D',
        category: 'STEEL',
        primaryUom: 'MT',
        hsnCode: '72142090',
        standardRate: 65000,
      },
    });
    materialSteelAId = matSteel.id;

    const matPaint = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-PNT-EXT01-8',
        name: 'Exterior Weatherproof Paint',
        category: 'FINISHING',
        primaryUom: 'LTR',
        hsnCode: '32091000',
        standardRate: 450,
      },
    });
    materialPaintAId = matPaint.id;

    const matCementB = await prisma.material.create({
      data: {
        tenantId: tenantBId,
        itemCode: 'MAT-CEM-OPC53-B8',
        name: 'OPC 53 Cement Tenant B8',
        category: 'CIVIL',
        primaryUom: 'BAG',
        standardRate: 390,
      },
    });
    materialCementBId = matCementB.id;

    // 8. Generate JWT Tokens
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-owner-a8',
      sessionVersion: 1,
    });

    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-pm-a8',
      sessionVersion: 1,
    });

    tokenSeA = tokenService.createAccessToken({
      userId: seAId,
      tenantId: tenantAId,
      sessionId: 'sess-se-a8',
      sessionVersion: 1,
    });

    tokenStoreUserA = tokenService.createAccessToken({
      userId: storeUserAId,
      tenantId: tenantAId,
      sessionId: 'sess-store-a8',
      sessionVersion: 1,
    });

    tokenNoAccessUserA = tokenService.createAccessToken({
      userId: noAccessUserAId,
      tenantId: tenantAId,
      sessionId: 'sess-noaccess-a8',
      sessionVersion: 1,
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-owner-b8',
      sessionVersion: 1,
    });

    tokenOwnerC = tokenService.createAccessToken({
      userId: ownerCId,
      tenantId: tenantCId,
      sessionId: 'sess-owner-c8',
      sessionVersion: 1,
    });
  });

  after(async () => {
    const prisma = dbService.getClient() as any;
    const tenantIds = [tenantAId, tenantBId, tenantCId];
    await prisma.stockMovement.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.storeStockBalance.deleteMany({ where: { tenantId: { in: tenantIds } } });
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

  // =========================================================================
  // 1. Initial State & Inbound Movements
  // =========================================================================

  it('1. should return zero balance for material without previous stock movements', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: storeA1Id, materialId: materialCementAId },
    });
    const res = await stockController.getStockBalance(req);

    assert.equal(res.success, true);
    assert.equal(res.data.availableQuantity, 0);
    assert.equal(Number(res.data.quantityOnHand), 0);
    assert.equal(Number(res.data.reservedQuantity), 0);
  });

  it('2. should record inbound RECEIPT movement and create stock balance', async () => {
    const result = await stockLedgerService.recordMovement(tenantAId, {
      storeId: storeA1Id,
      materialId: materialCementAId,
      movementType: 'RECEIPT',
      quantity: 100,
      unitRate: 380,
      referenceType: 'GRN',
      referenceId: 'aaaaaaaa-1111-2222-3333-444444444444',
      reason: 'Initial delivery from vendor',
      performedById: ownerAId,
    });

    assert.equal(result.isReplay, false);
    assert.equal(result.movement.movementType, 'RECEIPT');
    assert.equal(Number(result.movement.quantity), 100);
    assert.equal(result.updatedBalance.quantityOnHand, 100);
    assert.equal(result.updatedBalance.availableQuantity, 100);
  });

  it('3. should record inbound RETURN movement (+10) and increase balance to 110', async () => {
    const result = await stockLedgerService.recordMovement(tenantAId, {
      storeId: storeA1Id,
      materialId: materialCementAId,
      movementType: 'RETURN',
      quantity: 10,
      reason: 'Excess cement returned from site',
      performedById: pmAId,
    });

    assert.equal(result.updatedBalance.quantityOnHand, 110);
    assert.equal(result.updatedBalance.availableQuantity, 110);
  });

  it('4. should record inbound TRANSFER_IN movement (+20) and increase balance to 130', async () => {
    const result = await stockLedgerService.recordMovement(tenantAId, {
      storeId: storeA1Id,
      materialId: materialCementAId,
      movementType: 'TRANSFER_IN',
      quantity: 20,
      reason: 'Transfer from central warehouse',
      performedById: ownerAId,
    });

    assert.equal(result.updatedBalance.quantityOnHand, 130);
    assert.equal(result.updatedBalance.availableQuantity, 130);
  });

  it('5. should record inbound ADJUSTMENT_IN (+5) via privileged adjustment API', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: storeA1Id, materialId: materialCementAId },
      body: {
        movementType: 'ADJUSTMENT_IN',
        quantity: 5,
        reason: 'Physical audit count found 5 extra bags',
      },
    });

    const res = await stockController.recordAdjustment(req);
    assert.equal(res.success, true);
    assert.equal(res.data.updatedBalance.quantityOnHand, 135);
    assert.equal(res.data.updatedBalance.availableQuantity, 135);
  });

  // =========================================================================
  // 2. Outbound Movements
  // =========================================================================

  it('6. should record outbound ISSUE movement (-30) and reduce balance to 105', async () => {
    const result = await stockLedgerService.recordMovement(tenantAId, {
      storeId: storeA1Id,
      materialId: materialCementAId,
      movementType: 'ISSUE',
      quantity: 30,
      referenceType: 'ISSUE_NOTE',
      referenceId: 'aaaaaaaa-2222-3333-4444-555555555555',
      reason: 'Issued for Slab Casting Task',
      performedById: storeUserAId,
    });

    assert.equal(result.updatedBalance.quantityOnHand, 105);
    assert.equal(result.updatedBalance.availableQuantity, 105);
  });

  it('7. should record outbound TRANSFER_OUT movement (-15) and reduce balance to 90', async () => {
    const result = await stockLedgerService.recordMovement(tenantAId, {
      storeId: storeA1Id,
      materialId: materialCementAId,
      movementType: 'TRANSFER_OUT',
      quantity: 15,
      reason: 'Transfer out to Store 2',
      performedById: ownerAId,
    });

    assert.equal(result.updatedBalance.quantityOnHand, 90);
    assert.equal(result.updatedBalance.availableQuantity, 90);
  });

  it('8. should record outbound ADJUSTMENT_OUT (-10) via privileged adjustment API to balance 80', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: storeA1Id, materialId: materialCementAId },
      body: {
        movementType: 'ADJUSTMENT_OUT',
        quantity: 10,
        reason: 'Water damage during rain',
      },
    });

    const res = await stockController.recordAdjustment(req);
    assert.equal(res.success, true);
    assert.equal(res.data.updatedBalance.quantityOnHand, 80);
    assert.equal(res.data.updatedBalance.availableQuantity, 80);
  });

  // =========================================================================
  // 3. Strict Negative-Stock Prevention & Validation
  // =========================================================================

  it('9. should strictly reject outbound movement exceeding available stock (negative-stock prevention)', async () => {
    // Current stock is 80. Attempting to issue 81 must fail.
    await assert.rejects(
      async () => {
        await stockLedgerService.recordMovement(tenantAId, {
          storeId: storeA1Id,
          materialId: materialCementAId,
          movementType: 'ISSUE',
          quantity: 81,
          reason: 'Excess issue test',
        });
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /Insufficient stock on hand/i);
        return true;
      }
    );

    // Verify balance remains exactly 80
    const balance = await stockLedgerService.getStockBalance(
      tenantAId,
      ownerAId,
      storeA1Id,
      materialCementAId
    );
    assert.equal(Number(balance.quantityOnHand), 80);
  });

  it('10. should reject non-positive quantity in recordMovement', async () => {
    await assert.rejects(
      async () => {
        await stockLedgerService.recordMovement(tenantAId, {
          storeId: storeA1Id,
          materialId: materialCementAId,
          movementType: 'RECEIPT',
          quantity: 0,
        });
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /greater than zero/i);
        return true;
      }
    );
  });

  // =========================================================================
  // 4. Idempotency Protection
  // =========================================================================

  it('11. should replay identical response on duplicate idempotencyKey without creating duplicate movement or updating balance', async () => {
    const key = 'IDEMP-TEST-KEY-001';

    // First call
    const firstRes = await stockLedgerService.recordMovement(tenantAId, {
      storeId: storeA1Id,
      materialId: materialPaintAId,
      movementType: 'RECEIPT',
      quantity: 50,
      idempotencyKey: key,
      reason: 'Initial paint delivery',
    });

    assert.equal(firstRes.isReplay, false);
    assert.equal(firstRes.updatedBalance.quantityOnHand, 50);

    // Replay with same key
    const replayRes = await stockLedgerService.recordMovement(tenantAId, {
      storeId: storeA1Id,
      materialId: materialPaintAId,
      movementType: 'RECEIPT',
      quantity: 50,
      idempotencyKey: key,
      reason: 'Duplicate call should be ignored',
    });

    assert.equal(replayRes.isReplay, true);
    assert.equal(replayRes.movement.id, firstRes.movement.id);
    assert.equal(replayRes.updatedBalance.quantityOnHand, 50);

    // Verify exactly 1 movement exists
    const movements = await stockLedgerService.getStockMovements(
      tenantAId,
      ownerAId,
      storeA1Id,
      { materialId: materialPaintAId }
    );
    assert.equal(movements.total, 1);
  });

  // =========================================================================
  // 5. Concurrency Serialization & Row-Level Locking
  // =========================================================================

  it('12. should serialize concurrent mutations under high contention with SELECT FOR UPDATE (race condition prevention)', async () => {
    // Initial state: Steel in Store A1 has 10 MT
    await stockLedgerService.recordMovement(tenantAId, {
      storeId: storeA1Id,
      materialId: materialSteelAId,
      movementType: 'RECEIPT',
      quantity: 10,
      reason: 'Batch receipt of 10 MT',
    });

    // Two parallel requests both trying to issue 8 MT simultaneously (Total requested: 16 MT, Available: 10 MT)
    // Exactly ONE must succeed and the OTHER must fail with Insufficient stock.
    const results = await Promise.allSettled([
      stockLedgerService.recordMovement(tenantAId, {
        storeId: storeA1Id,
        materialId: materialSteelAId,
        movementType: 'ISSUE',
        quantity: 8,
        reason: 'Parallel issue #1',
      }),
      stockLedgerService.recordMovement(tenantAId, {
        storeId: storeA1Id,
        materialId: materialSteelAId,
        movementType: 'ISSUE',
        quantity: 8,
        reason: 'Parallel issue #2',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one parallel issue must succeed');
    assert.equal(rejected.length, 1, 'Exactly one parallel issue must fail');

    const err = (rejected[0] as PromiseRejectedResult).reason;
    assert.ok(err instanceof BadRequestError);
    assert.match(err.message, /Insufficient stock on hand/i);

    // Final balance MUST be exactly 10 - 8 = 2 MT
    const finalBalance = await stockLedgerService.getStockBalance(
      tenantAId,
      ownerAId,
      storeA1Id,
      materialSteelAId
    );
    assert.equal(Number(finalBalance.quantityOnHand), 2);
  });

  // =========================================================================
  // 6. Audit Reconciliation Engine
  // =========================================================================

  it('13. should reconcile material stock and report MATCH when snapshot equals sum of ledger movements', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: storeA1Id, materialId: materialCementAId },
    });

    const res = await stockController.reconcileStock(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'MATCH');
    assert.equal(res.data.discrepancy, 0);
    assert.equal(res.data.snapshotBalance, 80);
    assert.equal(res.data.ledgerCalculatedBalance, 80);
    assert.equal(res.data.inboundSum, 135); // 100 + 10 + 20 + 5
    assert.equal(res.data.outboundSum, 55); // 30 + 15 + 10
    assert.equal(res.data.movementCount, 7);
  });

  it('14. should detect discrepancy and report MISMATCH if database snapshot was tampered directly', async () => {
    const prisma = dbService.getClient() as any;

    // Tamper with snapshot balance in database directly
    await prisma.storeStockBalance.updateMany({
      where: { storeId: storeA1Id, materialId: materialCementAId },
      data: { quantityOnHand: 999 },
    });

    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: storeA1Id, materialId: materialCementAId },
    });

    const res = await stockController.reconcileStock(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'MISMATCH');
    assert.equal(res.data.snapshotBalance, 999);
    assert.equal(res.data.ledgerCalculatedBalance, 80);
    assert.equal(res.data.discrepancy, 919);

    // Restore correct balance for subsequent tests
    await prisma.storeStockBalance.updateMany({
      where: { storeId: storeA1Id, materialId: materialCementAId },
      data: { quantityOnHand: 80 },
    });
  });

  // =========================================================================
  // 7. Tenant & Project / Store Isolation
  // =========================================================================

  it('15. should prevent Tenant B from querying Tenant A store stocks', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { storeId: storeA1Id },
    });

    await assert.rejects(
      async () => {
        await stockController.listStoreStocks(req);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        return true;
      }
    );
  });

  it('16. should prevent Tenant B from adjusting stock in Tenant A store', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { storeId: storeA1Id, materialId: materialCementAId },
      body: {
        movementType: 'ADJUSTMENT_IN',
        quantity: 10,
        reason: 'Cross-tenant illegal adjustment',
      },
    });

    await assert.rejects(
      async () => {
        await stockController.recordAdjustment(req);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        return true;
      }
    );
  });

  it('17. should reject recording movement for cross-tenant material in store', async () => {
    // Tenant A store with Tenant B material
    await assert.rejects(
      async () => {
        await stockLedgerService.recordMovement(tenantAId, {
          storeId: storeA1Id,
          materialId: materialCementBId,
          movementType: 'RECEIPT',
          quantity: 10,
        });
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.match(err.message, /Material with ID/i);
        return true;
      }
    );
  });

  // =========================================================================
  // 8. RBAC & Store-Level Scoping
  // =========================================================================

  it('18. should allow storekeeper assigned to store to view stock balances', async () => {
    const req = createAuthReq(tokenStoreUserA, {
      params: { storeId: storeA1Id },
    });

    const res = await stockController.listStoreStocks(req);
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.data.items));
    assert.ok(res.data.items.length >= 2);
  });

  it('19. should allow storekeeper assigned to store to view movements', async () => {
    const req = createAuthReq(tokenStoreUserA, {
      params: { storeId: storeA1Id },
    });

    const res = await stockController.listStoreMovements(req);
    assert.equal(res.success, true);
    assert.ok(res.data.items.length > 0);
  });

  it('20. should deny unassigned user without store permission from viewing store stocks (403)', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      params: { storeId: storeA1Id },
    });

    await assert.rejects(
      async () => {
        await stockController.listStoreStocks(req);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('21. should deny user without materials:manage permission from performing stock adjustments (403)', async () => {
    // tokenNoAccessUserA lacks materials:manage
    const req = createAuthReq(tokenNoAccessUserA, {
      params: { storeId: storeA1Id, materialId: materialCementAId },
      body: {
        movementType: 'ADJUSTMENT_IN',
        quantity: 5,
        reason: 'Unauthorized adjustment',
      },
    });

    await assert.rejects(
      async () => {
        await stockController.recordAdjustment(req);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  // =========================================================================
  // 9. Entitlement Guard (materials:core)
  // =========================================================================

  it('22. should deny all stock endpoints for tenant with materials:core feature disabled (403)', async () => {
    const req = createAuthReq(tokenOwnerC, {
      params: { storeId: storeA1Id },
    });

    await assert.rejects(
      async () => {
        await stockController.listStoreStocks(req);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /materials:core/i);
        return true;
      }
    );
  });

  // =========================================================================
  // 10. Query Filtering & Pagination
  // =========================================================================

  it('23. should filter movements by movementType', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: storeA1Id },
      query: { movementType: 'ISSUE' },
    });

    const res = await stockController.listStoreMovements(req);
    assert.equal(res.success, true);
    for (const m of res.data.items) {
      assert.equal(m.movementType, 'ISSUE');
    }
  });

  it('24. should filter movements by materialId', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: storeA1Id },
      query: { materialId: materialCementAId },
    });

    const res = await stockController.listStoreMovements(req);
    assert.equal(res.success, true);
    for (const m of res.data.items) {
      assert.equal(m.materialId, materialCementAId);
    }
  });

  it('25. should search store stock balances by material name', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { storeId: storeA1Id },
      query: { search: 'Cement' },
    });

    const res = await stockController.listStoreStocks(req);
    assert.equal(res.success, true);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0]?.material?.itemCode, 'MAT-CEM-OPC53-8');
  });
});
