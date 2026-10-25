import { Prisma } from '@prisma/client';
import { PrismaBoqRepository } from '../repositories/prisma-boq.repository';
import type { IBoqRepository, BoqItemEntity } from '../repositories/boq.repository.interface';
import { PrismaWbsRepository } from '../repositories/prisma-wbs.repository';
import type { IWbsRepository } from '../repositories/wbs.repository.interface';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../../common/errors/app-error';
import { isValidBoqUom } from '../constants/boq.constants';
import type {
  CreateBoqItemDto,
  BulkCreateBoqDto,
  UpdateBoqItemDto,
  ListBoqQueryDto,
  BoqBillingPositionDto,
} from '../dto/boq.dto';

export class BoqService {
  private static instance: BoqService;
  private readonly boqRepo: IBoqRepository;
  private readonly wbsRepo: IWbsRepository;
  private readonly authService: AuthorizationService;

  constructor(
    boqRepo?: IBoqRepository,
    wbsRepo?: IWbsRepository,
    authService?: AuthorizationService
  ) {
    this.boqRepo = boqRepo || new PrismaBoqRepository();
    this.wbsRepo = wbsRepo || new PrismaWbsRepository();
    this.authService = authService || AuthorizationService.getInstance();
  }

  public static getInstance(): BoqService {
    if (!BoqService.instance) {
      BoqService.instance = new BoqService();
    }
    return BoqService.instance;
  }

  public static resetInstance(): void {
    BoqService.instance = undefined as unknown as BoqService;
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

  public async createBoqItem(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: CreateBoqItemDto
  ): Promise<BoqItemEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:wbs:edit');

    if (!isValidBoqUom(dto.uom)) {
      throw new BadRequestError(`Invalid UOM: ${dto.uom}. Must be a valid construction UOM.`);
    }

    // Check unique itemNumber in project
    const existing = await this.boqRepo.findByItemNumber(projectId, dto.itemNumber);
    if (existing) {
      throw new ConflictError(
        `BOQ item with number '${dto.itemNumber}' already exists in this project.`
      );
    }

    // Validate WBS node if provided
    if (dto.wbsNodeId) {
      const wbsNode = await this.wbsRepo.findById(tenantId, projectId, dto.wbsNodeId);
      if (!wbsNode) {
        throw new NotFoundError('Specified WBS node not found or does not belong to project.');
      }
    }

    // Validate parent if provided
    if (dto.parentId) {
      const parent = await this.boqRepo.findById(tenantId, projectId, dto.parentId);
      if (!parent) {
        throw new NotFoundError('Specified parent BOQ item not found or does not belong to project.');
      }
    }

    const quantity = new Prisma.Decimal(dto.quantity.toString());
    const unitRate = new Prisma.Decimal(dto.unitRate.toString());

    if (quantity.lessThanOrEqualTo(0)) {
      throw new BadRequestError('Contract quantity must be greater than 0.');
    }
    if (unitRate.lessThan(0)) {
      throw new BadRequestError('Unit rate must be non-negative.');
    }

    const totalAmount = quantity.mul(unitRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    return this.boqRepo.create({
      id: dto.id,
      tenantId,
      projectId,
      wbsNodeId: dto.wbsNodeId ?? null,
      parentId: dto.parentId ?? null,
      itemNumber: dto.itemNumber.trim(),
      description: dto.description.trim(),
      specification: dto.specification ?? null,
      uom: dto.uom,
      quantity,
      unitRate,
      totalAmount,
      createdById: userId,
    });
  }

  public async createBulkBoqItems(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: BulkCreateBoqDto
  ): Promise<BoqItemEntity[]> {
    await this.authorize(tenantId, userId, projectId, 'projects:wbs:edit');

    const itemNumberSet = new Set<string>();
    const preparedItems = [];

    for (const item of dto.items) {
      const normalizedNumber = item.itemNumber.trim().toUpperCase();
      if (itemNumberSet.has(normalizedNumber)) {
        throw new BadRequestError(
          `Duplicate item number '${item.itemNumber}' found within bulk upload payload.`
        );
      }
      itemNumberSet.add(normalizedNumber);

      if (!isValidBoqUom(item.uom)) {
        throw new BadRequestError(`Invalid UOM '${item.uom}' for item '${item.itemNumber}'.`);
      }

      // Check existing in DB
      const existing = await this.boqRepo.findByItemNumber(projectId, item.itemNumber);
      if (existing) {
        throw new ConflictError(
          `BOQ item with number '${item.itemNumber}' already exists in this project.`
        );
      }

      if (item.wbsNodeId) {
        const wbs = await this.wbsRepo.findById(tenantId, projectId, item.wbsNodeId);
        if (!wbs) {
          throw new NotFoundError(`WBS node for item '${item.itemNumber}' not found in project.`);
        }
      }

      if (item.parentId) {
        const parent = await this.boqRepo.findById(tenantId, projectId, item.parentId);
        if (!parent) {
          throw new NotFoundError(`Parent item for '${item.itemNumber}' not found in project.`);
        }
      }

      const quantity = new Prisma.Decimal(item.quantity.toString());
      const unitRate = new Prisma.Decimal(item.unitRate.toString());

      if (quantity.lessThanOrEqualTo(0)) {
        throw new BadRequestError(`Quantity for item '${item.itemNumber}' must be > 0.`);
      }
      if (unitRate.lessThan(0)) {
        throw new BadRequestError(`Unit rate for item '${item.itemNumber}' must be >= 0.`);
      }

      const totalAmount = quantity.mul(unitRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      preparedItems.push({
        id: item.id,
        tenantId,
        projectId,
        wbsNodeId: item.wbsNodeId ?? null,
        parentId: item.parentId ?? null,
        itemNumber: item.itemNumber.trim(),
        description: item.description.trim(),
        specification: item.specification ?? null,
        uom: item.uom,
        quantity,
        unitRate,
        totalAmount,
        createdById: userId,
      });
    }

    return this.boqRepo.createBulk(tenantId, projectId, preparedItems);
  }

  public async getBoqItem(
    tenantId: string,
    userId: string,
    projectId: string,
    boqItemId: string
  ): Promise<BoqItemEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:view');

    const item = await this.boqRepo.findById(tenantId, projectId, boqItemId);
    if (!item) {
      throw new NotFoundError('BOQ item not found.');
    }

    return item;
  }

  public async listBoqItems(
    tenantId: string,
    userId: string,
    projectId: string,
    query?: ListBoqQueryDto
  ): Promise<{ items: BoqItemEntity[]; total: number }> {
    await this.authorize(tenantId, userId, projectId, 'projects:view');

    return this.boqRepo.findAllByProject(tenantId, projectId, query);
  }

  public async updateBoqItem(
    tenantId: string,
    userId: string,
    projectId: string,
    boqItemId: string,
    dto: UpdateBoqItemDto
  ): Promise<BoqItemEntity> {
    await this.authorize(tenantId, userId, projectId, 'projects:wbs:edit');

    const item = await this.boqRepo.findById(tenantId, projectId, boqItemId);
    if (!item) {
      throw new NotFoundError('BOQ item not found.');
    }

    // Revision policy: If execution has begun, contractual quantity/rate revisions are locked
    const inExecution = item.executedQuantity.greaterThan(0);
    if (inExecution) {
      if (dto.quantity !== undefined || dto.unitRate !== undefined || dto.uom !== undefined) {
        throw new BadRequestError(
          `Cannot modify contractual quantity, rate, or UOM: BOQ item is already in execution (executed quantity: ${item.executedQuantity.toString()}). Contract variations are required for post-execution amendments.`
        );
      }
    }

    if (dto.uom && !isValidBoqUom(dto.uom)) {
      throw new BadRequestError(`Invalid UOM: ${dto.uom}`);
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === boqItemId) {
        throw new BadRequestError('A BOQ item cannot be its own parent.');
      }
      const parent = await this.boqRepo.findById(tenantId, projectId, dto.parentId);
      if (!parent) {
        throw new NotFoundError('Specified parent BOQ item not found in project.');
      }
    }

    if (dto.wbsNodeId !== undefined && dto.wbsNodeId !== null) {
      const wbs = await this.wbsRepo.findById(tenantId, projectId, dto.wbsNodeId);
      if (!wbs) {
        throw new NotFoundError('Specified WBS node not found in project.');
      }
    }

    let newQuantity = item.quantity;
    let newUnitRate = item.unitRate;
    let recalculateAmount = false;

    if (dto.quantity !== undefined) {
      newQuantity = new Prisma.Decimal(dto.quantity.toString());
      if (newQuantity.lessThanOrEqualTo(0)) {
        throw new BadRequestError('Quantity must be greater than 0.');
      }
      recalculateAmount = true;
    }

    if (dto.unitRate !== undefined) {
      newUnitRate = new Prisma.Decimal(dto.unitRate.toString());
      if (newUnitRate.lessThan(0)) {
        throw new BadRequestError('Unit rate must be >= 0.');
      }
      recalculateAmount = true;
    }

    const totalAmount = recalculateAmount
      ? newQuantity.mul(newUnitRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : undefined;

    return this.boqRepo.update(tenantId, projectId, boqItemId, {
      wbsNodeId: dto.wbsNodeId,
      parentId: dto.parentId,
      description: dto.description,
      specification: dto.specification,
      uom: dto.uom,
      quantity: dto.quantity !== undefined ? newQuantity : undefined,
      unitRate: dto.unitRate !== undefined ? newUnitRate : undefined,
      totalAmount,
      status: dto.status,
    });
  }

  public async deleteBoqItem(
    tenantId: string,
    userId: string,
    projectId: string,
    boqItemId: string
  ): Promise<void> {
    await this.authorize(tenantId, userId, projectId, 'projects:wbs:edit');

    const item = await this.boqRepo.findById(tenantId, projectId, boqItemId);
    if (!item) {
      throw new NotFoundError('BOQ item not found.');
    }

    const measurementsCount = await this.boqRepo.countMeasurementRecords(tenantId, projectId, boqItemId);
    if (measurementsCount > 0 || item.executedQuantity.greaterThan(0)) {
      throw new BadRequestError(
        `Cannot delete BOQ item: ${measurementsCount} measurement book record(s) exist. Deactivate item with status 'INACTIVE' instead to preserve audit integrity.`
      );
    }

    const childrenCount = await this.boqRepo.countChildren(projectId, boqItemId);
    if (childrenCount > 0) {
      throw new BadRequestError(
        `Cannot delete BOQ item: ${childrenCount} child BOQ item(s) are linked to this parent.`
      );
    }

    await this.boqRepo.delete(tenantId, projectId, boqItemId);
  }

  /**
   * Phase 10 Read-Only Billing Positions Interface
   */
  public async getBillingPositions(
    tenantId: string,
    userId: string,
    projectId: string
  ): Promise<BoqBillingPositionDto[]> {
    await this.authorize(tenantId, userId, projectId, 'projects:view');

    const { items } = await this.boqRepo.findAllByProject(tenantId, projectId, {
      limit: 1000,
    });

    return items.map((item) => {
      const contractQty = item.quantity;
      const rate = item.unitRate;
      const contractAmt = item.totalAmount;
      const approvedCumulative = item.executedQuantity;
      const remainingQty = contractQty.minus(approvedCumulative);
      const certifiedAmt = approvedCumulative.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const completionPct = contractQty.isZero()
        ? '0.00'
        : approvedCumulative.div(contractQty).mul(100).toFixed(2);
      const isOver = approvedCumulative.greaterThan(contractQty);

      return {
        boqItemId: item.id,
        itemCode: item.itemNumber,
        description: item.description,
        uom: item.uom,
        contractQuantity: contractQty.toString(),
        contractRate: rate.toFixed(2),
        contractAmount: contractAmt.toFixed(2),
        approvedCumulativeQuantity: approvedCumulative.toString(),
        remainingQuantity: remainingQty.toString(),
        certifiedAmount: certifiedAmt.toFixed(2),
        completionPercentage: completionPct,
        isOverExecuted: isOver,
      };
    });
  }
}
