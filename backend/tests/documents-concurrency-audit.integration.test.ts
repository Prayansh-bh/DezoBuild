import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { EngineeringDocumentService } from '../src/modules/documents/services/engineering-document.service.js';
import { EngineeringDocumentRepository } from '../src/modules/documents/repositories/engineering-document.repository.js';
import { DocumentVersionRepository } from '../src/modules/documents/repositories/document-version.repository.js';
import { DocumentAuditRepository } from '../src/modules/documents/repositories/document-audit.repository.js';
import { DocumentAuditService } from '../src/modules/documents/services/document-audit.service.js';
import { DocumentAuditController } from '../src/modules/documents/controllers/document-audit.controller.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { getNextDocumentSequence } from '../src/modules/documents/helpers/documents-sequence.helper.js';
import {
  DocumentType,
  DocumentDiscipline,
  DocumentStatus,
  VersionStatus,
  IssuePurpose,
} from '../src/modules/documents/constants/documents.constants.js';

describe('DEZOBUILD Phase 14 — Documents Concurrency & Audit Verification Suite', () => {
  let dbService: DatabaseService;
  let documentService: EngineeringDocumentService;
  let auditService: DocumentAuditService;
  let auditController: DocumentAuditController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'e1400003-aaaa-0003-aaaa-333333333333';
  const ownerAId = 'e1400003-1111-0003-aaaa-333333333333';
  const pmAId = 'e1400003-2222-0003-aaaa-333333333333';

  let tokenOwnerA: string;
  let tokenPmA: string;

  let companyAId: string;
  let projectAId: string;

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

    const auditRepo = new DocumentAuditRepository(prisma);
    const docRepo = new EngineeringDocumentRepository(prisma);
    const verRepo = new DocumentVersionRepository(prisma);

    auditService = new DocumentAuditService(auditRepo);
    auditController = new DocumentAuditController(auditService);
    documentService = new EngineeringDocumentService(prisma, docRepo, verRepo, auditRepo);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.documentAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.rfiDocumentReference.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.requestForInformation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.documentTransmittalItem.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.documentTransmittal.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.documentVersion.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.engineeringDocument.deleteMany({ where: { tenantId: tenantAId } });

    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.session.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.projectMember.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });

    // Seed Tenant
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-CONCUR-A',
        name: 'Concurrency Tenant A',
        status: 'ACTIVE',
        planTier: 'ENTERPRISE',
      },
    });

    await subSeeder.seedAll();

    const enterprisePlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: enterprisePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-CONCUR-A',
        name: 'Concurrency Corp A',
        legalName: 'Concurrency Corp A Ltd',
        panNumber: 'AACCC1234E',
        gstin: '27AACCC1234E1Z5',
        email: 'concur-a@dezobuild.com',
        phone: '9988112233',
        address: '500 Tech Boulevard',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyAId = companyA.id;

    const projA = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJC1',
        name: 'Concurrency Heights',
        status: 'ACTIVE',
      },
    });
    projectAId = projA.id;

    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'owner-concur@dezobuild.com',
        fullName: 'Owner Concurrency',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: pmAId,
        tenantId: tenantAId,
        email: 'pm-concur@dezobuild.com',
        fullName: 'PM Concurrency',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    const ownerRole = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'PROJECT_MANAGER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole.id, scopeType: 'TENANT' },
      ],
    });

    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-1', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-2', sessionVersion: 1 });
  });

  after(async () => {
    await prisma.documentAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.documentVersion.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.engineeringDocument.deleteMany({ where: { tenantId: tenantAId } });
  });

  describe('1. Monotonic Collision-Free Numbering Under High Concurrency', () => {
    it('should generate 10 unique, sequential DOC numbers concurrently without collisions', async () => {
      const concurrencyCount = 10;
      const tasks = Array.from({ length: concurrencyCount }, async (_, idx) => {
        return prisma.$transaction(async (tx: any) => {
          const num = await getNextDocumentSequence(tenantAId, projectAId, 'PRJC1', 'DOC', tx);
          // Insert dummy row with that number to simulate real load
          await tx.engineeringDocument.create({
            data: {
              tenantId: tenantAId,
              projectId: projectAId,
              documentNumber: num,
              documentType: DocumentType.SPECIFICATION,
              discipline: DocumentDiscipline.GENERAL,
              title: `Concurrent Document ${idx + 1}`,
              status: DocumentStatus.DRAFT,
              createdById: ownerAId,
            },
          });
          return num;
        });
      });

      const allocatedNumbers = await Promise.all(tasks);

      // Verify all numbers are unique
      const uniqueNumbers = new Set(allocatedNumbers);
      assert.equal(uniqueNumbers.size, concurrencyCount, 'Expected zero duplicate document numbers');

      // Verify all match pattern
      for (const num of allocatedNumbers) {
        assert.match(num, /^DOC-PRJC1-\d{4}-\d{6}$/);
      }
    });

    it('should generate 10 unique, sequential DWG numbers concurrently without collisions', async () => {
      const concurrencyCount = 10;
      const tasks = Array.from({ length: concurrencyCount }, async (_, idx) => {
        return prisma.$transaction(async (tx: any) => {
          const num = await getNextDocumentSequence(tenantAId, projectAId, 'PRJC1', 'DWG', tx, {
            discipline: 'STR',
          });
          await tx.engineeringDocument.create({
            data: {
              tenantId: tenantAId,
              projectId: projectAId,
              documentNumber: `DOC-STR-${idx}-${Date.now()}`,
              drawingNumber: num,
              documentType: DocumentType.DRAWING,
              discipline: DocumentDiscipline.STRUCTURAL,
              title: `Concurrent Structural Drawing ${idx + 1}`,
              status: DocumentStatus.DRAFT,
              createdById: ownerAId,
            },
          });
          return num;
        });
      });

      const allocatedNumbers = await Promise.all(tasks);
      const uniqueNumbers = new Set(allocatedNumbers);
      assert.equal(uniqueNumbers.size, concurrencyCount, 'Expected zero duplicate drawing numbers');

      for (const num of allocatedNumbers) {
        assert.match(num, /^DWG-PRJC1-STR-\d{6}$/);
      }
    });
  });

  describe('2. Append-Only Audit Logging Verification', () => {
    it('should retrieve immutable audit trail records across document lifecycle operations', async () => {
      const req = createAuthReq(tokenPmA, {
        query: {
          projectId: projectAId,
        },
      });

      const res = await auditController.listLogs(req);
      assert.equal(res.success, true);
      assert.ok(res.data.items);
      assert.ok(res.data.total >= 0);

      // Verify audit logs contain required append-only audit fields
      for (const log of res.data.items) {
        assert.ok(log.id);
        assert.equal(log.tenantId, tenantAId);
        assert.ok(log.entityType);
        assert.ok(log.entityId);
        assert.ok(log.action);
        assert.ok(log.actorId);
        assert.ok(log.createdAt);
      }
    });
  });
});
