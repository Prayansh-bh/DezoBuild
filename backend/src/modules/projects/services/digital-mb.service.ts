import { Prisma } from '@prisma/client';
import { PrismaDigitalMbRepository } from '../repositories/prisma-digital-mb.repository';
import type {
  IDigitalMbRepository,
  DigitalMbRecordEntity,
  CreateDimensionParams,
} from '../repositories/digital-mb.repository.interface';
import { PrismaBoqRepository } from '../repositories/prisma-boq.repository';
import type { IBoqRepository } from '../repositories/boq.repository.interface';
import { PrismaProjectRepository } from '../repositories/prisma-project.repository';
import type { IProjectRepository } from '../repositories/project.repository.interface';
import { PrismaDprRepository } from '../repositories/prisma-dpr.repository';
import type { IDprRepository } from '../repositories/dpr.repository.interface';
import { PrismaTaskRepository } from '../repositories/prisma-task.repository';
import type { ITaskRepository } from '../repositories/task.repository.interface';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { DatabaseService } from '../../../database/database.service';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';

import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../../common/errors/app-error';
import { getUomCategory } from '../constants/boq.constants';
import type {
  CreateDigitalMbDto,
  UpdateDigitalMbDto,
  ApproveDigitalMbDto,
  RejectDigitalMbDto,
  ListDigitalMbQueryDto,
  MeasurementDimensionInputDto,
} from '../dto/digital-mb.dto';

export class DigitalMbService {
  private static instance: DigitalMbService;
  private readonly mbRepo: IDigitalMbRepository;
  private readonly boqRepo: IBoqRepository;
  private readonly projectRepo: IProjectRepository;
  private readonly dprRepo: IDprRepository;
  private readonly taskRepo: ITaskRepository;
  private readonly authService: AuthorizationService;

  constructor(
    mbRepo?: IDigitalMbRepository,
    boqRepo?: IBoqRepository,
    projectRepo?: IProjectRepository,
    dprRepo?: IDprRepository,
    taskRepo?: ITaskRepository,
    authService?: AuthorizationService
  ) {
    this.mbRepo = mbRepo || new PrismaDigitalMbRepository();
    this.boqRepo = boqRepo || new PrismaBoqRepository();
    this.projectRepo = projectRepo || new PrismaProjectRepository();
    this.dprRepo = dprRepo || new PrismaDprRepository();
    this.taskRepo = taskRepo || new PrismaTaskRepository();
    this.authService = authService || AuthorizationService.getInstance();
  }

  public static getInstance(): DigitalMbService {
    if (!DigitalMbService.instance) {
      DigitalMbService.instance = new DigitalMbService();
    }
    return DigitalMbService.instance;
  }

  public static resetInstance(): void {
    DigitalMbService.instance = undefined as unknown as DigitalMbService;
  }

  private async authorize(
    tenantId: string,
    userId: string,
    projectId: string,
    permission: string = 'projects:view'
  ): Promise<void> {
    if (!tenantId || !projectId) {
      throw new BadRequestError('Tenant and project contexts are required.');
    }
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      permission
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }
  }

  public async createMeasurement(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: CreateDigitalMbDto
  ): Promise<DigitalMbRecordEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:dpr:create');

    const project = await this.projectRepo.findById(tenantId, projectId);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    const boqItem = await this.boqRepo.findById(tenantId, projectId, dto.boqItemId);
    if (!boqItem) {
      throw new NotFoundError('Parent BOQ item not found in project.');
    }

    if (dto.dprId) {
      const dpr = await this.dprRepo.findById(tenantId, projectId, dto.dprId);
      if (!dpr) {
        throw new NotFoundError('Specified DPR not found or does not belong to project.');
      }
    }

    if (dto.taskId) {
      const task = await this.taskRepo.findById(tenantId, projectId, dto.taskId);
      if (!task) {
        throw new NotFoundError('Specified Task not found or does not belong to project.');
      }
    }

    if (dto.contractorId) {
      const prisma = DatabaseService.getInstance().getClient();
      const vendor = await prisma.vendor.findFirst({
        where: { id: dto.contractorId, tenantId },
      });
      if (!vendor) {
        throw new NotFoundError('Specified contractor/vendor not found in tenant.');
      }
    }

    if (dto.isCorrection) {
      if (!dto.supersedesMbRecordId) {
        throw new BadRequestError('Correction measurement must reference a supersedesMbRecordId.');
      }
      const original = await this.mbRepo.findById(tenantId, projectId, dto.supersedesMbRecordId);
      if (!original) {
        throw new NotFoundError('Original measurement record to correct not found.');
      }
      if (original.status !== 'APPROVED') {
        throw new BadRequestError('Can only create a correction for an APPROVED measurement record.');
      }
      if (!dto.correctionReason || dto.correctionReason.trim().length === 0) {
        throw new BadRequestError('Correction reason is mandatory for adjustment records.');
      }
    }

    // Calculate Current Quantity based on Measurement Type and UOM
    const { currentQuantity, dimensions } = this.calculateQuantities(
      dto.measurementType,
      boqItem.uom,
      dto.directQuantity,
      dto.dimensions,
      dto.isCorrection ?? false
    );

    // Generate MB Number: MB-{PROJECT_CODE}-{YYYYMMDD}-{SEQ:04d}
    const seqNum = await this.mbRepo.getNextSequenceNumber(tenantId, projectId);
    const dateStr = this.formatDate(dto.measurementDate);
    const projectCode = project.code.toUpperCase();
    const mbNumber = `MB-${projectCode}-${dateStr}-${String(seqNum).padStart(4, '0')}`;

    return this.mbRepo.create({
      id: dto.id,
      tenantId,
      projectId,
      boqItemId: dto.boqItemId,
      dprId: dto.dprId,
      taskId: dto.taskId,
      contractorId: dto.contractorId,
      mbNumber,
      measurementDate: dto.measurementDate,
      measurementType: dto.measurementType,
      location: dto.location,
      chainageFrom: dto.chainageFrom !== undefined && dto.chainageFrom !== null ? new Prisma.Decimal(dto.chainageFrom.toString()) : null,
      chainageTo: dto.chainageTo !== undefined && dto.chainageTo !== null ? new Prisma.Decimal(dto.chainageTo.toString()) : null,
      gpsLatitude: dto.gpsLatitude !== undefined && dto.gpsLatitude !== null ? new Prisma.Decimal(dto.gpsLatitude.toString()) : null,
      gpsLongitude: dto.gpsLongitude !== undefined && dto.gpsLongitude !== null ? new Prisma.Decimal(dto.gpsLongitude.toString()) : null,
      witnessedBy: dto.witnessedBy,
      remarks: dto.remarks,
      photoUrls: dto.photoUrls,
      attachmentUrls: dto.attachmentUrls,
      currentQuantity,
      isExcess: false,
      isCorrection: dto.isCorrection ?? false,
      supersedesMbRecordId: dto.supersedesMbRecordId,
      correctionReason: dto.correctionReason,
      createdById: userId,
      dimensions,
    });
  }

  public async updateMeasurement(
    tenantId: string,
    userId: string,
    projectId: string,
    id: string,
    dto: UpdateDigitalMbDto
  ): Promise<DigitalMbRecordEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:dpr:create');

    const record = await this.mbRepo.findById(tenantId, projectId, id);
    if (!record) {
      throw new NotFoundError('Digital MB record not found.');
    }

    if (record.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot edit measurement in ${record.status} status. Only DRAFT records can be modified.`
      );
    }

    if (dto.dprId !== undefined && dto.dprId !== null) {
      const dpr = await this.dprRepo.findById(tenantId, projectId, dto.dprId);
      if (!dpr) {
        throw new NotFoundError('Specified DPR not found or does not belong to project.');
      }
    }

    if (dto.taskId !== undefined && dto.taskId !== null) {
      const task = await this.taskRepo.findById(tenantId, projectId, dto.taskId);
      if (!task) {
        throw new NotFoundError('Specified Task not found or does not belong to project.');
      }
    }

    if (dto.contractorId !== undefined && dto.contractorId !== null) {
      const prisma = DatabaseService.getInstance().getClient();
      const vendor = await prisma.vendor.findFirst({
        where: { id: dto.contractorId, tenantId },
      });
      if (!vendor) {
        throw new NotFoundError('Specified contractor/vendor not found in tenant.');
      }
    }

    const boqItem = await this.boqRepo.findById(tenantId, projectId, record.boqItemId);
    if (!boqItem) {
      throw new NotFoundError('Parent BOQ item not found.');
    }

    const measurementType = dto.measurementType ?? record.measurementType;
    let currentQuantity: Prisma.Decimal | undefined;
    let dimensions: CreateDimensionParams[] | undefined;

    if (dto.dimensions !== undefined || dto.directQuantity !== undefined || dto.measurementType !== undefined) {
      const res = this.calculateQuantities(
        measurementType,
        boqItem.uom,
        dto.directQuantity,
        dto.dimensions,
        record.isCorrection
      );
      currentQuantity = res.currentQuantity;
      dimensions = res.dimensions;
    }

    return this.mbRepo.update(tenantId, projectId, id, {
      dprId: dto.dprId,
      taskId: dto.taskId,
      contractorId: dto.contractorId,
      measurementDate: dto.measurementDate,
      measurementType: dto.measurementType,
      location: dto.location,
      chainageFrom: dto.chainageFrom !== undefined && dto.chainageFrom !== null ? new Prisma.Decimal(dto.chainageFrom.toString()) : undefined,
      chainageTo: dto.chainageTo !== undefined && dto.chainageTo !== null ? new Prisma.Decimal(dto.chainageTo.toString()) : undefined,
      gpsLatitude: dto.gpsLatitude !== undefined && dto.gpsLatitude !== null ? new Prisma.Decimal(dto.gpsLatitude.toString()) : undefined,
      gpsLongitude: dto.gpsLongitude !== undefined && dto.gpsLongitude !== null ? new Prisma.Decimal(dto.gpsLongitude.toString()) : undefined,
      witnessedBy: dto.witnessedBy,
      remarks: dto.remarks,
      photoUrls: dto.photoUrls,
      attachmentUrls: dto.attachmentUrls,
      currentQuantity,
      correctionReason: dto.correctionReason,
      dimensions,
    });
  }

  public async deleteMeasurement(
    tenantId: string,
    userId: string,
    projectId: string,
    id: string
  ): Promise<void> {
    await this.authorize(tenantId, userId, projectId, 'projects:dpr:create');

    const record = await this.mbRepo.findById(tenantId, projectId, id);
    if (!record) {
      throw new NotFoundError('Digital MB record not found.');
    }

    if (record.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete measurement in ${record.status} status. Only DRAFT records may be discarded.`
      );
    }

    await this.mbRepo.delete(tenantId, projectId, id);
  }

  public async getMeasurement(
    tenantId: string,
    userId: string,
    projectId: string,
    id: string
  ): Promise<DigitalMbRecordEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:view');

    const record = await this.mbRepo.findById(tenantId, projectId, id);
    if (!record) {
      throw new NotFoundError('Digital MB record not found.');
    }

    return record;
  }

  public async listMeasurements(
    tenantId: string,
    userId: string,
    projectId: string,
    query?: ListDigitalMbQueryDto
  ): Promise<{ items: DigitalMbRecordEntity[]; total: number }> {
    await this.authorize(tenantId, userId, projectId, 'projects:view');

    return this.mbRepo.findAllByProject(tenantId, projectId, query);
  }

  public async submitMeasurement(
    tenantId: string,
    userId: string,
    projectId: string,
    id: string
  ): Promise<DigitalMbRecordEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:dpr:submit');

    const record = await this.mbRepo.findById(tenantId, projectId, id);
    if (!record) {
      throw new NotFoundError('Digital MB record not found.');
    }

    if (record.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot submit measurement: Current status is ${record.status}, expected DRAFT`
      );
    }

    return this.mbRepo.submit(tenantId, projectId, id, userId);
  }

  public async verifyMeasurement(
    tenantId: string,
    userId: string,
    projectId: string,
    id: string
  ): Promise<DigitalMbRecordEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:dpr:approve');

    const record = await this.mbRepo.findById(tenantId, projectId, id);
    if (!record) {
      throw new NotFoundError('Digital MB record not found.');
    }

    if (record.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Cannot verify measurement: Current status is ${record.status}, expected SUBMITTED`
      );
    }

    // Segregation of Duties: Creator cannot verify own measurement
    if (record.createdById === userId) {
      throw new ForbiddenError(
        'Segregation of Duties: The creator of a measurement cannot verify their own measurement.'
      );
    }

    return this.mbRepo.verify(tenantId, projectId, id, userId);
  }

  public async rejectMeasurement(
    tenantId: string,
    userId: string,
    projectId: string,
    id: string,
    dto: RejectDigitalMbDto
  ): Promise<DigitalMbRecordEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:dpr:approve');

    const record = await this.mbRepo.findById(tenantId, projectId, id);
    if (!record) {
      throw new NotFoundError('Digital MB record not found.');
    }

    if (record.status !== 'SUBMITTED' && record.status !== 'VERIFIED') {
      throw new BadRequestError(
        `Cannot reject measurement in ${record.status} status. Only SUBMITTED or VERIFIED records can be rejected.`
      );
    }

    return this.mbRepo.reject(tenantId, projectId, id, userId, dto.rejectionReason);
  }

  public async reopenToDraft(
    tenantId: string,
    userId: string,
    projectId: string,
    id: string
  ): Promise<DigitalMbRecordEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:dpr:create');

    const record = await this.mbRepo.findById(tenantId, projectId, id);
    if (!record) {
      throw new NotFoundError('Digital MB record not found.');
    }

    if (record.status !== 'REJECTED') {
      throw new BadRequestError(
        `Cannot reopen measurement to DRAFT from status ${record.status}. Only REJECTED records can be reopened.`
      );
    }

    return this.mbRepo.reopenToDraft(tenantId, projectId, id);
  }

  public async approveMeasurement(
    tenantId: string,
    userId: string,
    projectId: string,
    id: string,
    dto: ApproveDigitalMbDto
  ): Promise<DigitalMbRecordEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:dpr:approve');

    const record = await this.mbRepo.findById(tenantId, projectId, id);
    if (!record) {
      throw new NotFoundError('Digital MB record not found.');
    }

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      DatabaseService.getInstance().getClient(),
      tenantId,
      'DIGITAL_MB',
      id
    );

    if (record.status !== 'VERIFIED') {

      throw new BadRequestError(
        `Cannot approve measurement: Current status is ${record.status}, expected VERIFIED`
      );
    }

    // Segregation of Duties: Creator cannot approve own measurement
    if (record.createdById === userId) {
      throw new ForbiddenError(
        'Segregation of Duties: The creator of a measurement cannot approve their own measurement.'
      );
    }

    // Segregation of Duties: Submitter cannot approve own measurement
    if (record.submittedById === userId) {
      throw new ForbiddenError(
        'Segregation of Duties: The submitter of a measurement cannot approve their own measurement.'
      );
    }

    return this.mbRepo.approveMeasurement({
      tenantId,
      projectId,
      id,
      boqItemId: record.boqItemId,
      approvedById: userId,
      allowExcess: dto.allowExcess ?? false,
      excessJustification: dto.excessJustification,
    });
  }

  public async reconcileBoqCumulativeQuantity(
    tenantId: string,
    userId: string,
    projectId: string,
    boqItemId: string
  ): Promise<{ boqItemId: string; executedQuantity: string; approvedSum: string; isMatched: boolean }> {
    await this.authorize(tenantId, userId, projectId, 'projects:view');

    const boq = await this.boqRepo.findById(tenantId, projectId, boqItemId);
    if (!boq) {
      throw new NotFoundError('BOQ item not found.');
    }

    const approvedSum = await this.mbRepo.calculateApprovedCumulativeQuantity(tenantId, projectId, boqItemId);
    const isMatched = boq.executedQuantity.equals(approvedSum);

    return {
      boqItemId,
      executedQuantity: boq.executedQuantity.toString(),
      approvedSum: approvedSum.toString(),
      isMatched,
    };
  }

  private calculateQuantities(
    measurementType: string,
    uom: string,
    directQuantityInput: number | string | null | undefined,
    dimensionsInput: MeasurementDimensionInputDto[] | undefined,
    isCorrection: boolean
  ): { currentQuantity: Prisma.Decimal; dimensions?: CreateDimensionParams[] } {
    if (measurementType === 'DIRECT_QUANTITY') {
      if (directQuantityInput === null || directQuantityInput === undefined) {
        throw new BadRequestError('directQuantity is required for DIRECT_QUANTITY measurement mode.');
      }
      const directQty = new Prisma.Decimal(directQuantityInput.toString());
      if (!isCorrection && directQty.lessThan(0)) {
        throw new BadRequestError('directQuantity cannot be negative for standard measurements.');
      }
      return { currentQuantity: directQty };
    }

    // DIMENSIONAL Mode
    if (!dimensionsInput || dimensionsInput.length === 0) {
      throw new BadRequestError('At least one dimension line is required for DIMENSIONAL measurement mode.');
    }

    const uomCategory = getUomCategory(uom);
    let totalQty = new Prisma.Decimal(0);
    const dimensions: CreateDimensionParams[] = [];

    for (let i = 0; i < dimensionsInput.length; i++) {
      const dim = dimensionsInput[i];
      const count = new Prisma.Decimal((dim.count ?? 1).toString());
      const length = new Prisma.Decimal((dim.length ?? 1).toString());
      const breadth = new Prisma.Decimal((dim.breadth ?? 1).toString());
      const depth = new Prisma.Decimal((dim.depth ?? 1).toString());
      const factor = new Prisma.Decimal((dim.factor ?? 1.0).toString());

      if (count.lessThanOrEqualTo(0) || length.lessThanOrEqualTo(0) || breadth.lessThanOrEqualTo(0) || depth.lessThanOrEqualTo(0)) {
        throw new BadRequestError('Dimension parameters (count, length, breadth, depth) must be greater than 0.');
      }

      if (!factor.equals(1.0) && !factor.equals(-1.0)) {
        throw new BadRequestError('Measurement factor must be exactly 1.00 (addition) or -1.00 (deduction).');
      }

      let lineQty: Prisma.Decimal;

      switch (uomCategory) {
        case 'VOLUME':
          lineQty = count.mul(length).mul(breadth).mul(depth).mul(factor);
          break;
        case 'AREA':
          lineQty = count.mul(length).mul(breadth).mul(factor);
          break;
        case 'LENGTH':
          lineQty = count.mul(length).mul(factor);
          break;
        case 'COUNT':
          lineQty = count.mul(factor);
          break;
        case 'WEIGHT':
        case 'COMMERCIAL':
        default:
          lineQty = count.mul(factor);
          break;
      }

      lineQty = lineQty.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
      totalQty = totalQty.plus(lineQty);

      dimensions.push({
        description: dim.description.trim(),
        count,
        length,
        breadth,
        depth,
        factor,
        calculatedQuantity: lineQty,
        remarks: dim.remarks ?? null,
        sequence: dim.sequence ?? i,
      });
    }

    totalQty = totalQty.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

    if (!isCorrection && totalQty.lessThan(0)) {
      throw new BadRequestError(
        `Total calculated quantity (${totalQty.toString()}) cannot be negative for standard measurements. Deductions cannot exceed additions.`
      );
    }

    return {
      currentQuantity: totalQty,
      dimensions,
    };
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
