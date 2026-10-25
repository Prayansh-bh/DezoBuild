import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { EngineeringDocumentController } from '../src/modules/documents/controllers/engineering-document.controller.js';
import { EngineeringDocumentService } from '../src/modules/documents/services/engineering-document.service.js';
import { EngineeringDocumentRepository } from '../src/modules/documents/repositories/engineering-document.repository.js';
import { DocumentVersionRepository } from '../src/modules/documents/repositories/document-version.repository.js';
import { DocumentAuditRepository } from '../src/modules/documents/repositories/document-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import {
  DocumentType,
  DocumentDiscipline,
  DocumentStatus,
  VersionStatus,
  IssuePurpose,
} from '../src/modules/documents/constants/documents.constants.js';

describe('DEZOBUILD Phase 14 — Documents, Drawings & Versioning Integration Suite', () => {
  let dbService: DatabaseService;
  let documentController: EngineeringDocumentController;
  let documentService: EngineeringDocumentService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'e1400001-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'e1400001-1111-0001-aaaa-111111111111';
  const pmAId = 'e1400001-2222-0001-aaaa-111111111111';
  const siteEngAId = 'e1400001-3333-0001-aaaa-111111111111';
  const viewerAId = 'e1400001-4444-0001-aaaa-111111111111';

  const tenantBId = 'e1400001-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'e1400001-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSiteEngA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let branchAId: string;
  let projectA1Id: string;
  let projectA2Id: string;

  let companyBId: string;
  let projectBId: string;

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

    documentService = new EngineeringDocumentService(prisma, docRepo, verRepo, auditRepo);
    documentController = new EngineeringDocumentController(documentService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Cleanup existing Phase 14 fixtures
    await prisma.documentAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.rfiDocumentReference.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.requestForInformation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.documentTransmittalItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.documentTransmittal.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.documentVersion.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.engineeringDocument.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });

    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Seed Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-DOC-A',
        name: 'Document Control Tenant A',
        status: 'ACTIVE',
        planTier: 'ENTERPRISE',
      },
    });

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
        code: 'COMP-A',
        name: 'Doc Corp A',
        legalName: 'Doc Corp A Pvt Ltd',
        panNumber: 'AAACD1234E',
        gstin: '27AAACD1234E1Z5',
        email: 'doc-a@dezobuild.com',
        phone: '9988776655',
        address: '100 Construction Way',
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
        code: 'BR-A1',
        name: 'Mumbai HQ Branch',
        gstin: '27AAACD1234E1Z5',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });
    branchAId = branchA.id;

    const projA1 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJA1',
        name: 'Metropolis Tower 1',
        status: 'ACTIVE',
      },
    });
    projectA1Id = projA1.id;

    const projA2 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJA2',
        name: 'Metropolis Tower 2',
        status: 'ACTIVE',
      },
    });
    projectA2Id = projA2.id;

    // Users Tenant A
    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'owner-a@dezobuild.com',
        fullName: 'Owner User A',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: pmAId,
        tenantId: tenantAId,
        email: 'pm-a@dezobuild.com',
        fullName: 'PM User A',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: siteEngAId,
        tenantId: tenantAId,
        email: 'siteeng-a@dezobuild.com',
        fullName: 'Site Engineer A',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: viewerAId,
        tenantId: tenantAId,
        email: 'viewer-a@dezobuild.com',
        fullName: 'Viewer User A',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    // Roles Tenant A
    const ownerRoleA = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'COMPANY_OWNER' } });
    const pmRoleA = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'PROJECT_MANAGER' } });
    const siteEngRoleA = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'SITE_ENGINEER' } });
    const viewerRoleA = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'VIEWER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRoleA.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRoleA.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: siteEngAId, roleId: siteEngRoleA.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: viewerAId, roleId: viewerRoleA.id, scopeType: 'TENANT' },
      ],
    });

    // Seed Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-DOC-B',
        name: 'Document Control Tenant B',
        status: 'ACTIVE',
        planTier: 'ENTERPRISE',
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: enterprisePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    const companyB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'COMP-B',
        name: 'Doc Corp B',
        legalName: 'Doc Corp B Ltd',
        panNumber: 'BBBBD1234E',
        gstin: '27BBBBD1234E1Z5',
        email: 'doc-b@dezobuild.com',
        phone: '9988776654',
        address: '200 Building Way',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    companyBId = companyB.id;

    const projB = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyBId,
        code: 'PRJB',
        name: 'Skyline Plaza',
        status: 'ACTIVE',
      },
    });
    projectBId = projB.id;

    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner-b@dezobuild.com',
        fullName: 'Owner User B',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.userRoleAssignment.create({
      data: {
        tenantId: tenantBId,
        userId: ownerBId,
        roleId: ownerRoleA.id,
        scopeType: 'TENANT',
      },
    });

    // Generate tokens
    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-1', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-2', sessionVersion: 1 });
    tokenSiteEngA = tokenService.createAccessToken({ userId: siteEngAId, tenantId: tenantAId, sessionId: 's-3', sessionVersion: 1 });
    tokenViewerA = tokenService.createAccessToken({ userId: viewerAId, tenantId: tenantAId, sessionId: 's-4', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 's-5', sessionVersion: 1 });
  });

  after(async () => {
    await prisma.documentAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.rfiDocumentReference.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.requestForInformation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.documentTransmittalItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.documentTransmittal.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.documentVersion.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.engineeringDocument.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
  });

  describe('1. Engineering Document Creation & Auto-Numbering', () => {
    it('should create a general engineering document with auto-generated DOC sequence', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          documentType: DocumentType.SPECIFICATION,
          discipline: DocumentDiscipline.CIVIL,
          title: 'Concrete Specification Rev 1',
          description: 'Technical specs for M30 grade concrete',
        },
      });

      const res = await documentController.createDocument(req);
      assert.equal(res.success, true);
      assert.ok(res.data.id);
      assert.match(res.data.documentNumber, /^DOC-PRJA1-\d{4}-\d{6}$/);
      assert.equal(res.data.status, DocumentStatus.DRAFT);
      assert.equal(res.data.currentVersionId, null);
    });

    it('should create a drawing document with auto-generated DWG sequence and discipline code', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          documentType: DocumentType.DRAWING,
          discipline: DocumentDiscipline.ARCHITECTURAL,
          title: 'Floor 1 Architectural Layout',
          sheetNumber: 'A-101',
          scale: '1:100',
        },
      });

      const res = await documentController.createDocument(req);
      assert.equal(res.success, true);
      assert.ok(res.data.id);
      assert.match(res.data.drawingNumber, /^DWG-PRJA1-ARCHITECTU-\d{6}$/);
      assert.equal(res.data.documentType, DocumentType.DRAWING);
      assert.equal(res.data.status, DocumentStatus.DRAFT);
    });

    it('should reject document creation without documents:manage permission', async () => {
      const req = createAuthReq(tokenViewerA, {
        body: {
          projectId: projectA1Id,
          documentType: DocumentType.SPECIFICATION,
          title: 'Unauthorized Spec',
        },
      });

      await assert.rejects(async () => {
        await documentController.createDocument(req);
      }, /FORBIDDEN|Permission/i);
    });
  });

  describe('2. Storage Object Key & SHA-256 Validation', () => {
    let docId: string;

    before(async () => {
      const doc = await prisma.engineeringDocument.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentNumber: 'DOC-TEST-VAL-001',
          documentType: DocumentType.DRAWING,
          discipline: DocumentDiscipline.STRUCTURAL,
          title: 'Validation Test Drawing',
          status: DocumentStatus.DRAFT,
          createdById: ownerAId,
        },
      });
      docId = doc.id;
    });

    it('should accept valid storage key and 64-hex lowercase SHA-256', async () => {
      const validKey = `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docId}/rev0.pdf`;
      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const req = createAuthReq(tokenPmA, {
        params: { id: docId },
        body: {
          versionNumber: 1,
          revisionCode: 'R0',
          issuePurpose: IssuePurpose.GFC,
          storageObjectKey: validKey,
          originalFilename: 'foundation_plan.pdf',
          fileExtension: 'pdf',
          mimeType: 'application/pdf',
          byteSize: 1048576,
          fileSha256: validSha256,
        },
      });

      const res = await documentController.registerVersion(req);
      assert.equal(res.success, true);
      assert.equal(res.data.status, VersionStatus.DRAFT);
      assert.equal(res.data.versionNumber, 1);
      assert.equal(res.data.revisionCode, 'R0');
    });

    it('should reject storage key with path traversal characters', async () => {
      const traversalKey = `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docId}/../../secret.pdf`;
      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const req = createAuthReq(tokenPmA, {
        params: { id: docId },
        body: {
          versionNumber: 2,
          revisionCode: 'R1',
          storageObjectKey: traversalKey,
          originalFilename: 'test.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
          fileSha256: validSha256,
        },
      });

      await assert.rejects(async () => {
        await documentController.registerVersion(req);
      }, /traversal|invalid/i);
    });

    it('should reject storage key with wrong tenantId segment', async () => {
      const wrongTenantKey = `tenants/${tenantBId}/projects/${projectA1Id}/documents/${docId}/file.pdf`;
      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const req = createAuthReq(tokenPmA, {
        params: { id: docId },
        body: {
          versionNumber: 2,
          revisionCode: 'R1',
          storageObjectKey: wrongTenantKey,
          originalFilename: 'test.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
          fileSha256: validSha256,
        },
      });

      await assert.rejects(async () => {
        await documentController.registerVersion(req);
      }, /tenant/i);
    });

    it('should reject storage key with wrong projectId segment', async () => {
      const wrongProjectKey = `tenants/${tenantAId}/projects/${projectA2Id}/documents/${docId}/file.pdf`;
      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const req = createAuthReq(tokenPmA, {
        params: { id: docId },
        body: {
          versionNumber: 2,
          revisionCode: 'R1',
          storageObjectKey: wrongProjectKey,
          originalFilename: 'test.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
          fileSha256: validSha256,
        },
      });

      await assert.rejects(async () => {
        await documentController.registerVersion(req);
      }, /project/i);
    });

    it('should reject invalid SHA-256 length or non-hex characters', async () => {
      const validKey = `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docId}/rev2.pdf`;

      const req = createAuthReq(tokenPmA, {
        params: { id: docId },
        body: {
          versionNumber: 2,
          revisionCode: 'R1',
          storageObjectKey: validKey,
          originalFilename: 'test.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
          fileSha256: 'not-a-valid-sha256-too-short',
        },
      });

      await assert.rejects(async () => {
        await documentController.registerVersion(req);
      }, /ValidationError|Validation failed|64 hexadecimal/i);
    });
  });

  describe('3. Version Issuance, Supersession & currentVersionId Invariant', () => {
    let docId: string;
    let v1Id: string;
    let v2Id: string;

    before(async () => {
      const doc = await prisma.engineeringDocument.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentNumber: 'DWG-SUPERSEDE-001',
          documentType: DocumentType.DRAWING,
          discipline: DocumentDiscipline.STRUCTURAL,
          title: 'Structural Column Schedule',
          status: DocumentStatus.DRAFT,
          createdById: ownerAId,
        },
      });
      docId = doc.id;

      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const v1 = await prisma.documentVersion.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentId: docId,
          versionNumber: 1,
          revisionCode: 'R0',
          issuePurpose: IssuePurpose.TENDER,
          storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docId}/r0.pdf`,
          originalFilename: 'columns_r0.pdf',
          mimeType: 'application/pdf',
          byteSize: 500000n,
          fileSha256: validSha256,
          status: VersionStatus.DRAFT,
          createdById: ownerAId,
        },
      });
      v1Id = v1.id;

      const v2 = await prisma.documentVersion.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentId: docId,
          versionNumber: 2,
          revisionCode: 'R1',
          issuePurpose: IssuePurpose.GFC,
          storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docId}/r1.pdf`,
          originalFilename: 'columns_r1.pdf',
          mimeType: 'application/pdf',
          byteSize: 520000n,
          fileSha256: validSha256,
          status: VersionStatus.DRAFT,
          createdById: ownerAId,
        },
      });
      v2Id = v2.id;
    });

    it('should issue version 1 and update document status to ACTIVE and currentVersionId to v1', async () => {
      const req = createAuthReq(tokenPmA, {
        params: { id: docId, versionId: v1Id },
        body: { issuePurpose: IssuePurpose.GFC },
      });

      const res = await documentController.issueVersion(req);
      assert.equal(res.success, true);
      assert.equal(res.data.status, DocumentStatus.ACTIVE);
      assert.equal(res.data.currentVersionId, v1Id);

      const dbV1 = await prisma.documentVersion.findUnique({ where: { id: v1Id } });
      assert.equal(dbV1?.status, VersionStatus.ISSUED);
      assert.equal(dbV1?.isSuperseded, false);
      assert.ok(dbV1?.issuedAt);
      assert.equal(dbV1?.issuedById, pmAId);
    });

    it('should issue version 2, automatically supersede version 1, and update currentVersionId to v2', async () => {
      const req = createAuthReq(tokenPmA, {
        params: { id: docId, versionId: v2Id },
        body: { issuePurpose: IssuePurpose.GFC },
      });

      const res = await documentController.issueVersion(req);
      assert.equal(res.success, true);
      assert.equal(res.data.currentVersionId, v2Id);

      const dbV1 = await prisma.documentVersion.findUnique({ where: { id: v1Id } });
      assert.equal(dbV1?.status, VersionStatus.SUPERSEDED);
      assert.equal(dbV1?.isSuperseded, true);
      assert.ok(dbV1?.supersededAt);

      const dbV2 = await prisma.documentVersion.findUnique({ where: { id: v2Id } });
      assert.equal(dbV2?.status, VersionStatus.ISSUED);
      assert.equal(dbV2?.isSuperseded, false);
    });

    it('should reject issuing a VOID version', async () => {
      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const voidVer = await prisma.documentVersion.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentId: docId,
          versionNumber: 3,
          revisionCode: 'R2-VOID',
          storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docId}/r2.pdf`,
          originalFilename: 'columns_r2.pdf',
          mimeType: 'application/pdf',
          byteSize: 520000n,
          fileSha256: validSha256,
          status: VersionStatus.VOID,
          createdById: ownerAId,
        },
      });

      const req = createAuthReq(tokenPmA, {
        params: { id: docId, versionId: voidVer.id },
        body: {},
      });

      await assert.rejects(async () => {
        await documentController.issueVersion(req);
      }, /VOID/i);
    });
  });

  describe('4. Voiding Current Version & Atomic Fallback Rollback', () => {
    let docId: string;
    let v1Id: string;
    let v2Id: string;

    beforeEach(async () => {
      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const doc = await prisma.engineeringDocument.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentNumber: `DWG-FALLBACK-${Date.now()}`,
          documentType: DocumentType.DRAWING,
          discipline: DocumentDiscipline.STRUCTURAL,
          title: 'Fallback Test Drawing',
          status: DocumentStatus.DRAFT,
          createdById: ownerAId,
        },
      });
      docId = doc.id;

      const v1 = await prisma.documentVersion.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentId: docId,
          versionNumber: 1,
          revisionCode: 'R0',
          storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docId}/r0.pdf`,
          originalFilename: 'r0.pdf',
          mimeType: 'application/pdf',
          byteSize: 1000n,
          fileSha256: validSha256,
          status: VersionStatus.DRAFT,
          createdById: ownerAId,
        },
      });
      v1Id = v1.id;

      const v2 = await prisma.documentVersion.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentId: docId,
          versionNumber: 2,
          revisionCode: 'R1',
          storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docId}/r1.pdf`,
          originalFilename: 'r1.pdf',
          mimeType: 'application/pdf',
          byteSize: 1000n,
          fileSha256: validSha256,
          status: VersionStatus.DRAFT,
          createdById: ownerAId,
        },
      });
      v2Id = v2.id;

      // Issue v1 then v2
      await documentController.issueVersion(createAuthReq(tokenPmA, { params: { id: docId, versionId: v1Id } }));
      await documentController.issueVersion(createAuthReq(tokenPmA, { params: { id: docId, versionId: v2Id } }));
    });

    it('should promote highest previous non-void version (v1) when current active version (v2) is voided', async () => {
      const req = createAuthReq(tokenPmA, {
        params: { id: docId, versionId: v2Id },
        body: { reason: 'Design flaw in R1 column load calculations' },
      });

      const res = await documentController.voidVersion(req);
      assert.equal(res.success, true);
      assert.equal(res.data.currentVersionId, v1Id);
      assert.equal(res.data.status, DocumentStatus.ACTIVE);

      const dbV1 = await prisma.documentVersion.findUnique({ where: { id: v1Id } });
      assert.equal(dbV1?.status, VersionStatus.ISSUED);
      assert.equal(dbV1?.isSuperseded, false);

      const dbV2 = await prisma.documentVersion.findUnique({ where: { id: v2Id } });
      assert.equal(dbV2?.status, VersionStatus.VOID);
    });

    it('should revert currentVersionId to null and status to DRAFT when all versions are voided', async () => {
      // Void v2
      await documentController.voidVersion(
        createAuthReq(tokenPmA, {
          params: { id: docId, versionId: v2Id },
          body: { reason: 'Void v2' },
        })
      );

      // Void v1 (only remaining version)
      const res = await documentController.voidVersion(
        createAuthReq(tokenPmA, {
          params: { id: docId, versionId: v1Id },
          body: { reason: 'Void v1 as well' },
        })
      );

      assert.equal(res.success, true);
      assert.equal(res.data.currentVersionId, null);
      assert.equal(res.data.status, DocumentStatus.DRAFT);
    });
  });

  describe('5. Cross-Tenant & Cross-Project Isolation', () => {
    let docAId: string;

    before(async () => {
      const docA = await prisma.engineeringDocument.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentNumber: 'DOC-ISOLATION-A',
          documentType: DocumentType.CONTRACT,
          discipline: DocumentDiscipline.GENERAL,
          title: 'Confidential Tenant A Contract',
          status: DocumentStatus.ACTIVE,
          createdById: ownerAId,
        },
      });
      docAId = docA.id;
    });

    it('should block tenant B from reading tenant A document', async () => {
      const req = createAuthReq(tokenOwnerB, {
        params: { id: docAId },
      });

      await assert.rejects(async () => {
        await documentController.getDocument(req);
      }, /not found/i);
    });

    it('should block tenant B from registering version on tenant A document', async () => {
      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const req = createAuthReq(tokenOwnerB, {
        params: { id: docAId },
        body: {
          versionNumber: 1,
          revisionCode: 'R0',
          storageObjectKey: `tenants/${tenantBId}/projects/${projectBId}/documents/${docAId}/hacked.pdf`,
          originalFilename: 'hacked.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
          fileSha256: validSha256,
        },
      });

      await assert.rejects(async () => {
        await documentController.registerVersion(req);
      }, /not found/i);
    });
  });

  describe('6. Revision Code Uniqueness & Integrity Constraints', () => {
    it('should reject registering a duplicate version number or revision code for the same document', async () => {
      const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const doc = await prisma.engineeringDocument.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentNumber: 'DOC-DUP-REV-001',
          documentType: DocumentType.SPECIFICATION,
          discipline: DocumentDiscipline.STRUCTURAL,
          title: 'Beam Deflection Calculation',
          status: DocumentStatus.DRAFT,
          createdById: ownerAId,
        },
      });

      // Register version 1
      const req1 = createAuthReq(tokenOwnerA, {
        params: { id: doc.id },
        body: {
          versionNumber: 1,
          revisionCode: 'R0',
          storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${doc.id}/calc_v1.pdf`,
          originalFilename: 'calc_v1.pdf',
          mimeType: 'application/pdf',
          byteSize: 2048,
          fileSha256: validSha256,
        },
      });
      const res1 = await documentController.registerVersion(req1);
      assert.equal(res1.success, true);

      // Attempt to register duplicate versionNumber 1
      const reqDupNum = createAuthReq(tokenOwnerA, {
        params: { id: doc.id },
        body: {
          versionNumber: 1,
          revisionCode: 'R1',
          storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${doc.id}/calc_v1_dup.pdf`,
          originalFilename: 'calc_v1_dup.pdf',
          mimeType: 'application/pdf',
          byteSize: 2048,
          fileSha256: validSha256,
        },
      });
      await assert.rejects(async () => {
        await documentController.registerVersion(reqDupNum);
      }, /Conflict|already exists/i);

      // Attempt to register duplicate revisionCode R0 with versionNumber 2
      const reqDupCode = createAuthReq(tokenOwnerA, {
        params: { id: doc.id },
        body: {
          versionNumber: 2,
          revisionCode: 'R0',
          storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${doc.id}/calc_v2_dup.pdf`,
          originalFilename: 'calc_v2_dup.pdf',
          mimeType: 'application/pdf',
          byteSize: 2048,
          fileSha256: validSha256,
        },
      });
      await assert.rejects(async () => {
        await documentController.registerVersion(reqDupCode);
      }, /Conflict|already exists/i);
    });
  });
});
