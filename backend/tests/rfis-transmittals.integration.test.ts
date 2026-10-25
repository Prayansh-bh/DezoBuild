import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { RfiController } from '../src/modules/documents/controllers/rfi.controller.js';
import { RfiService } from '../src/modules/documents/services/rfi.service.js';
import { RfiRepository } from '../src/modules/documents/repositories/rfi.repository.js';
import { DocumentTransmittalController } from '../src/modules/documents/controllers/document-transmittal.controller.js';
import { DocumentTransmittalService } from '../src/modules/documents/services/document-transmittal.service.js';
import { DocumentTransmittalRepository } from '../src/modules/documents/repositories/document-transmittal.repository.js';
import { EngineeringDocumentRepository } from '../src/modules/documents/repositories/engineering-document.repository.js';
import { DocumentVersionRepository } from '../src/modules/documents/repositories/document-version.repository.js';
import { DocumentAuditRepository } from '../src/modules/documents/repositories/document-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import {
  RfiStatus,
  RfiPriority,
  RfiReferenceType,
  TransmittalStatus,
  DocumentType,
  DocumentDiscipline,
  DocumentStatus,
  VersionStatus,
  IssuePurpose,
} from '../src/modules/documents/constants/documents.constants.js';

describe('DEZOBUILD Phase 14 — RFIs & Document Transmittals Integration Suite', () => {
  let dbService: DatabaseService;
  let rfiController: RfiController;
  let rfiService: RfiService;
  let transmittalController: DocumentTransmittalController;
  let transmittalService: DocumentTransmittalService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'e1400002-aaaa-0002-aaaa-222222222222';
  const ownerAId = 'e1400002-1111-0002-aaaa-222222222222';
  const pmAId = 'e1400002-2222-0002-aaaa-222222222222';
  const siteEngAId = 'e1400002-3333-0002-aaaa-222222222222';
  const viewerAId = 'e1400002-4444-0002-aaaa-222222222222';

  const tenantBId = 'e1400002-bbbb-0002-bbbb-222222222222';
  const ownerBId = 'e1400002-1111-0002-bbbb-222222222222';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSiteEngA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let projectA1Id: string;
  let docA1Id: string;
  let versionA1Id: string;

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
    const rfiRepo = new RfiRepository(prisma);
    const transmittalRepo = new DocumentTransmittalRepository(prisma);

    rfiService = new RfiService(prisma, rfiRepo, docRepo, verRepo, auditRepo);
    rfiController = new RfiController(rfiService);

    transmittalService = new DocumentTransmittalService(prisma, transmittalRepo, verRepo, auditRepo);
    transmittalController = new DocumentTransmittalController(transmittalService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Cleanup fixtures
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
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Seed Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-RFI-A',
        name: 'RFI Tenant A',
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
        code: 'COMP-RFI-A',
        name: 'RFI Corp A',
        legalName: 'RFI Corp A Pvt Ltd',
        panNumber: 'AACCR1234E',
        gstin: '27AACCR1234E1Z5',
        email: 'rfi-a@dezobuild.com',
        phone: '9876543210',
        address: '1 RFI Plaza',
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
        code: 'PRJR1',
        name: 'Grand Horizon',
        status: 'ACTIVE',
      },
    });
    projectA1Id = projA.id;

    // Users
    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'owner-rfi@dezobuild.com',
        fullName: 'Owner RFI User',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: pmAId,
        tenantId: tenantAId,
        email: 'pm-rfi@dezobuild.com',
        fullName: 'PM RFI User',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: siteEngAId,
        tenantId: tenantAId,
        email: 'siteeng-rfi@dezobuild.com',
        fullName: 'Site Engineer RFI',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: viewerAId,
        tenantId: tenantAId,
        email: 'viewer-rfi@dezobuild.com',
        fullName: 'Viewer RFI User',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    const ownerRole = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'PROJECT_MANAGER' } });
    const siteEngRole = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'SITE_ENGINEER' } });
    const viewerRole = await prisma.role.findFirstOrThrow({ where: { tenantId: null, name: 'VIEWER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: siteEngAId, roleId: siteEngRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: viewerAId, roleId: viewerRole.id, scopeType: 'TENANT' },
      ],
    });

    // Seed master document and version for references
    const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const doc = await prisma.engineeringDocument.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        documentNumber: 'DWG-REF-001',
        documentType: DocumentType.DRAWING,
        discipline: DocumentDiscipline.STRUCTURAL,
        title: 'Main Foundation Plan',
        status: DocumentStatus.ACTIVE,
        createdById: ownerAId,
      },
    });
    docA1Id = doc.id;

    const version = await prisma.documentVersion.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        documentId: docA1Id,
        versionNumber: 1,
        revisionCode: 'R0',
        issuePurpose: IssuePurpose.GFC,
        storageObjectKey: `tenants/${tenantAId}/projects/${projectA1Id}/documents/${docA1Id}/fnd_r0.pdf`,
        originalFilename: 'fnd_r0.pdf',
        mimeType: 'application/pdf',
        byteSize: 2048000n,
        fileSha256: validSha256,
        status: VersionStatus.ISSUED,
        createdById: ownerAId,
      },
    });
    versionA1Id = version.id;

    // Seed Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-RFI-B',
        name: 'RFI Tenant B',
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

    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner-rfi-b@dezobuild.com',
        fullName: 'Owner B RFI',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: ownerBId, roleId: ownerRole.id, scopeType: 'TENANT' },
    });

    // Tokens
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

  describe('1. RFI Creation, Numbering & Reference Attachment', () => {
    it('should create an RFI draft with auto-generated RFI sequence and document reference', async () => {
      const req = createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          subject: 'Beam Reinforcement Clash at Grid B-4',
          discipline: DocumentDiscipline.STRUCTURAL,
          location: 'Podium Slab Level 2',
          technicalQuery: 'Rebar density exceeds spacing allowance at column junction B-4. Requesting coupler specification or alternate detailing.',
          priority: RfiPriority.HIGH,
          references: [
            {
              documentId: docA1Id,
              documentVersionId: versionA1Id,
              referenceType: RfiReferenceType.QUERY_ATTACHMENT,
            },
          ],
        },
      });

      const res = await rfiController.createRfi(req);
      assert.equal(res.success, true);
      assert.ok(res.data.id);
      assert.match(res.data.rfiNumber, /^RFI-PRJR1-\d{4}-\d{6}$/);
      assert.equal(res.data.status, RfiStatus.DRAFT);
      assert.equal(res.data.raisedById, siteEngAId);
    });
  });

  describe('2. Strict Separation of Duties (SoD) on Authoritative Response', () => {
    let rfiId: string;

    beforeEach(async () => {
      const req = createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          subject: 'Drainage Pipe Invert Level Clash',
          discipline: DocumentDiscipline.PLUMBING,
          technicalQuery: 'Plumbing invert level collides with stormwater culvert at grid C-12.',
          priority: RfiPriority.MEDIUM,
          submitImmediately: true,
        },
      });
      const res = await rfiController.createRfi(req);
      rfiId = res.data.id;
    });

    it('should REJECT Site Engineer when attempting to respond due to missing documents:rfi:respond permission', async () => {
      const req = createAuthReq(tokenSiteEngA, {
        params: { id: rfiId },
        body: {
          officialResponse: 'Reroute pipe via eastern corridor with 1:100 fall slope.',
        },
      });

      await assert.rejects(async () => {
        await rfiController.respondRfi(req);
      }, /Forbidden|permission|documents:rfi:respond/i);
    });

    it('should REJECT the creator even if they are PROJECT_MANAGER with documents:rfi:respond (Strict SoD)', async () => {
      // PM creates an RFI
      const createReq = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          subject: 'PM MEP Routing Query',
          technicalQuery: 'Requesting confirmation of HVAC duct clearance at level 4.',
          submitImmediately: true,
        },
      });
      const createRes = await rfiController.createRfi(createReq);
      const pmRfiId = createRes.data.id;

      // PM attempts to respond to their own RFI
      const respondReq = createAuthReq(tokenPmA, {
        params: { id: pmRfiId },
        body: {
          officialResponse: 'Approved HVAC duct route with 300mm clearance.',
        },
      });

      await assert.rejects(async () => {
        await rfiController.respondRfi(respondReq);
      }, /Separation of Duties|creator/i);
    });

    it('should REJECT the creator even if they are COMPANY_OWNER (Zero Owner SoD Bypass)', async () => {
      // Owner creates an RFI
      const createReq = createAuthReq(tokenOwnerA, {
        body: {
          projectId: projectA1Id,
          subject: 'Owner Structural Query',
          technicalQuery: 'Requesting confirmation of slab thickness on rooftop terrace.',
          submitImmediately: true,
        },
      });
      const createRes = await rfiController.createRfi(createReq);
      const ownerRfiId = createRes.data.id;

      // Owner attempts to respond to their own RFI
      const respondReq = createAuthReq(tokenOwnerA, {
        params: { id: ownerRfiId },
        body: {
          officialResponse: 'Approved 200mm slab thickness with two-way mesh reinforcement.',
        },
      });

      await assert.rejects(async () => {
        await rfiController.respondRfi(respondReq);
      }, /Separation of Duties|creator/i);
    });

    it('should allow an independent authorized respondent (PM) to provide authoritative response', async () => {
      const req = createAuthReq(tokenPmA, {
        params: { id: rfiId },
        body: {
          officialResponse: 'Reroute pipe via eastern corridor with 1:100 fall slope per revised plumbing layout.',
        },
      });

      const res = await rfiController.respondRfi(req);
      assert.equal(res.success, true);
      assert.equal(res.data.status, RfiStatus.RESPONDED);
      assert.equal(res.data.respondedById, pmAId);
      assert.ok(res.data.respondedAt);
    });
  });

  describe('3. RFI Closure & High-Priority Independent Reviewer Rule', () => {
    let highRfiId: string;
    let medRfiId: string;

    beforeEach(async () => {
      // Create HIGH priority RFI raised by Site Engineer and responded by PM
      const r1 = await rfiController.createRfi(
        createAuthReq(tokenSiteEngA, {
          body: {
            projectId: projectA1Id,
            subject: 'High Priority Shear Wall Crack Query',
            technicalQuery: 'Hairline cracks observed on shear wall SW-1 after concrete formwork removal.',
            priority: RfiPriority.HIGH,
            submitImmediately: true,
          },
        })
      );
      highRfiId = r1.data.id;

      await rfiController.respondRfi(
        createAuthReq(tokenPmA, {
          params: { id: highRfiId },
          body: {
            officialResponse: 'Apply epoxy injection grouting as per structural consultant report ref SC-99.',
          },
        })
      );

      // Create MEDIUM priority RFI
      const r2 = await rfiController.createRfi(
        createAuthReq(tokenSiteEngA, {
          body: {
            projectId: projectA1Id,
            subject: 'Door Opening Dimension Confirmation',
            technicalQuery: 'Confirm rough opening dimension for fire door FD-01.',
            priority: RfiPriority.MEDIUM,
            submitImmediately: true,
          },
        })
      );
      medRfiId = r2.data.id;

      await rfiController.respondRfi(
        createAuthReq(tokenPmA, {
          params: { id: medRfiId },
          body: {
            officialResponse: 'Rough opening is 1050mm x 2150mm with 2-hour fire rating jamb.',
          },
        })
      );
    });

    it('should REJECT respondent (PM) from closing a HIGH-priority RFI (Independent Reviewer Required)', async () => {
      const req = createAuthReq(tokenPmA, {
        params: { id: highRfiId },
        body: {
          closureRemarks: 'Grouting completed and verified.',
        },
      });

      await assert.rejects(async () => {
        await rfiController.closeRfi(req);
      }, /Separation of Duties|HIGH|independent/i);
    });

    it('should allow independent reviewer (Owner) to close the HIGH-priority RFI', async () => {
      const req = createAuthReq(tokenOwnerA, {
        params: { id: highRfiId },
        body: {
          closureRemarks: 'Verified non-destructive ultrasonic pulse velocity test results after epoxy cure. Approved.',
        },
      });

      const res = await rfiController.closeRfi(req);
      assert.equal(res.success, true);
      assert.equal(res.data.status, RfiStatus.CLOSED);
      assert.equal(res.data.closedById, ownerAId);
    });
  });

  describe('4. RFI Reopening to SUBMITTED & Cancellation Workflow', () => {
    let rfiId: string;

    beforeEach(async () => {
      const r = await rfiController.createRfi(
        createAuthReq(tokenSiteEngA, {
          body: {
            projectId: projectA1Id,
            subject: 'HVAC Duct Route Conflict',
            technicalQuery: 'HVAC supply duct conflicts with cable tray at corridor ceiling.',
            submitImmediately: true,
          },
        })
      );
      rfiId = r.data.id;

      await rfiController.respondRfi(
        createAuthReq(tokenPmA, {
          params: { id: rfiId },
          body: {
            officialResponse: 'Lower cable tray by 150mm below duct elevation.',
          },
        })
      );
    });

    it('should reopen a RESPONDED RFI to SUBMITTED with mandatory reopenReason', async () => {
      const req = createAuthReq(tokenSiteEngA, {
        params: { id: rfiId },
        body: {
          reopenReason: 'Lowering cable tray infringes headroom clearance below 2.2m. Requesting alternate route.',
        },
      });

      const res = await rfiController.reopenRfi(req);
      assert.equal(res.success, true);
      assert.equal(res.data.status, RfiStatus.SUBMITTED);
      assert.equal(res.data.reopenReason, 'Lowering cable tray infringes headroom clearance below 2.2m. Requesting alternate route.');

      // Check audit log preserved previous response
      const auditLogs = await prisma.documentAuditLog.findMany({
        where: { entityId: rfiId, action: 'REOPEN_RFI' },
      });
      assert.equal(auditLogs.length, 1);
      assert.ok(auditLogs[0].previousState);
    });

    it('should allow cancellation from SUBMITTED state with cancellationReason', async () => {
      // Create a fresh submitted RFI to test cancellation
      const createRes = await rfiController.createRfi(
        createAuthReq(tokenSiteEngA, {
          body: {
            projectId: projectA1Id,
            subject: 'Drainage Clash at Foundation Level',
            discipline: DocumentDiscipline.PLUMBING,
            technicalQuery: 'Query regarding clearance at footer beam B4.',
            priority: RfiPriority.LOW,
            submitImmediately: true,
          },
        })
      );
      const submittedRfiId = createRes.data.id;

      const cancelReq = createAuthReq(tokenPmA, {
        params: { id: submittedRfiId },
        body: {
          cancellationReason: 'Issue resolved on site during coordination meeting. Query no longer applicable.',
        },
      });

      const res = await rfiController.cancelRfi(cancelReq);
      assert.equal(res.success, true);
      assert.equal(res.data.status, RfiStatus.CANCELLED);
      assert.equal(res.data.cancellationReason, 'Issue resolved on site during coordination meeting. Query no longer applicable.');
    });
  });

  describe('5. Document Transmittal Lifecycle & Manifest Freezing', () => {
    let transmittalId: string;

    it('should create a draft transmittal and add manifest items', async () => {
      const createReq = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          title: 'Structural GFC Package Submission to Client',
          issuePurpose: IssuePurpose.GFC,
          recipientOrganization: 'Apex Real Estate Developers Ltd',
          recipientName: 'Mr. Rajesh Sharma (Chief Project Officer)',
          recipientEmail: 'rajesh.sharma@apexrealty.com',
          remarks: 'Transmittal for construction approval and site execution.',
        },
      });

      const res = await transmittalController.createTransmittal(createReq);
      assert.equal(res.success, true);
      assert.ok(res.data.id);
      assert.match(res.data.transmittalNumber, /^TR-PRJR1-\d{4}-\d{6}$/);
      assert.equal(res.data.status, TransmittalStatus.DRAFT);
      transmittalId = res.data.id;

      // Add manifest item
      const itemReq = createAuthReq(tokenPmA, {
        params: { id: transmittalId },
        body: {
          documentVersionId: versionA1Id,
          copyCount: 2,
          remarks: '2 Hard copies + Digital PDF',
        },
      });

      const itemRes = await transmittalController.addItem(itemReq);
      assert.equal(itemRes.success, true);
      assert.equal(itemRes.data.documentVersionId, versionA1Id);
      assert.equal(itemRes.data.copyCount, 2);
    });

    it('should issue the transmittal and freeze the manifest', async () => {
      const issueReq = createAuthReq(tokenPmA, {
        params: { id: transmittalId },
        body: { remarks: 'Dispatched via registered courier' },
      });

      const res = await transmittalController.issueTransmittal(issueReq);
      assert.equal(res.success, true);
      assert.equal(res.data.status, TransmittalStatus.ISSUED);

      // Attempting to add an item after issuance must be REJECTED
      const postIssueItemReq = createAuthReq(tokenPmA, {
        params: { id: transmittalId },
        body: {
          documentVersionId: versionA1Id,
          copyCount: 1,
        },
      });

      await assert.rejects(async () => {
        await transmittalController.addItem(postIssueItemReq);
      }, /Cannot modify transmittal manifest|ISSUED/i);
    });

    it('should record recipient acknowledgement of the issued transmittal', async () => {
      const ackReq = createAuthReq(tokenPmA, {
        params: { id: transmittalId },
        body: { remarks: 'Received physical sets and certified intact.' },
      });

      const res = await transmittalController.acknowledgeTransmittal(ackReq);
      assert.equal(res.success, true);
      assert.equal(res.data.status, TransmittalStatus.ACKNOWLEDGED);
      assert.ok(res.data.acknowledgedAt);
      assert.equal(res.data.acknowledgedById, pmAId);
    });
  });

  describe('6. Permission Integrity, Cross-Tenant Isolation & Reference Boundary Checks', () => {
    it('should confirm that phantom permission documents:rfi:manage DOES NOT EXIST in database', async () => {
      const phantomPerm = await prisma.permission.findFirst({
        where: { name: 'documents:rfi:manage' },
      });
      assert.equal(phantomPerm, null, 'documents:rfi:manage must NOT exist in the permissions table');
    });

    it('should block tenant B from reading tenant A RFI', async () => {
      const rfi = await prisma.requestForInformation.findFirstOrThrow({
        where: { tenantId: tenantAId },
      });

      const req = createAuthReq(tokenOwnerB, {
        params: { id: rfi.id },
      });

      await assert.rejects(async () => {
        await rfiController.getRfi(req);
      }, /not found/i);
    });

    it('should block tenant B from reading tenant A Transmittal', async () => {
      const transmittal = await prisma.documentTransmittal.findFirstOrThrow({
        where: { tenantId: tenantAId },
      });

      const req = createAuthReq(tokenOwnerB, {
        params: { id: transmittal.id },
      });

      await assert.rejects(async () => {
        await transmittalController.getTransmittal(req);
      }, /not found/i);
    });

    it('should reject RFI reference with version belonging to a different document', async () => {
      // Create another document in Tenant A
      const otherDoc = await prisma.engineeringDocument.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          documentNumber: 'DOC-MISMATCH-TEST',
          documentType: DocumentType.TEST_REPORT,
          discipline: DocumentDiscipline.GENERAL,
          title: 'Geotechnical Soil Report',
          status: DocumentStatus.ACTIVE,
          createdById: ownerAId,
        },
      });

      const rfi = await prisma.requestForInformation.findFirstOrThrow({
        where: { tenantId: tenantAId, status: { not: RfiStatus.CLOSED } },
      });

      // Try adding reference with otherDoc.id, but versionA1Id (which belongs to docA1Id)
      const refReq = createAuthReq(tokenPmA, {
        params: { id: rfi.id },
        body: {
          documentId: otherDoc.id,
          documentVersionId: versionA1Id,
          referenceType: RfiReferenceType.QUERY_ATTACHMENT,
        },
      });

      await assert.rejects(async () => {
        await rfiController.addReference(refReq);
      }, /does not belong to the target document/i);
    });
  });
});
