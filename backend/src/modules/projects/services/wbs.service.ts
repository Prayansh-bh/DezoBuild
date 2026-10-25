import type { PrismaClient } from '@prisma/client';
import type { IWbsRepository, WbsNodeEntity } from '../repositories/wbs.repository.interface';
import { PrismaWbsRepository } from '../repositories/prisma-wbs.repository';
import type { CreateWbsNodeDto, UpdateWbsNodeDto } from '../dto/wbs.dto';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { DatabaseService } from '../../../database/database.service';

export interface WbsServiceDependencies {
  wbsRepository?: IWbsRepository;
  authorizationService?: AuthorizationService;
  prisma?: PrismaClient;
}

export class WbsService {
  private static instance: WbsService;
  private readonly wbsRepo: IWbsRepository;
  private readonly authService: AuthorizationService;
  private readonly prisma: any;

  constructor(deps?: WbsServiceDependencies) {
    this.wbsRepo = deps?.wbsRepository ?? new PrismaWbsRepository();
    this.authService = deps?.authorizationService ?? AuthorizationService.getInstance();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: WbsServiceDependencies): WbsService {
    if (!WbsService.instance || deps) {
      WbsService.instance = new WbsService(deps);
    }
    return WbsService.instance;
  }

  public static resetInstance(): void {
    WbsService.instance = undefined as unknown as WbsService;
  }

  /**
   * Creates a new WBS node under a capital project.
   */
  async createWbsNode(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: CreateWbsNodeDto
  ): Promise<WbsNodeEntity> {
    if (!tenantId || !projectId) {
      throw new BadRequestError('Tenant and project contexts are required.');
    }

    // 1. Authorize project scope & permission
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:wbs:edit'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    // 2. Check code uniqueness within project
    const existing = await this.wbsRepo.findByCode(projectId, dto.code);
    if (existing) {
      throw new ConflictError(`WBS node with code '${dto.code}' already exists in this project.`);
    }

    // 3. Validate parent hierarchy if parentId provided
    let level = 1;
    if (dto.parentId) {
      const parent = await this.wbsRepo.findById(tenantId, projectId, dto.parentId);
      if (!parent) {
        throw new NotFoundError('Parent WBS node not found in project.');
      }
      level = parent.level + 1;
    }

    return this.wbsRepo.create({
      id: dto.id,
      tenantId,
      projectId,
      parentId: dto.parentId ?? null,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      level,
      sequence: dto.sequence ?? 0,
      weightagePct: dto.weightagePct,
      plannedStartDate: dto.plannedStartDate,
      plannedEndDate: dto.plannedEndDate,
      actualStartDate: dto.actualStartDate,
      actualEndDate: dto.actualEndDate,
    });
  }

  /**
   * Retrieves all WBS nodes for a project.
   */
  async listWbsNodes(
    tenantId: string,
    userId: string,
    projectId: string
  ): Promise<WbsNodeEntity[]> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    return this.wbsRepo.findAllByProject(tenantId, projectId);
  }

  /**
   * Retrieves a single WBS node with hierarchy details.
   */
  async getWbsNode(
    tenantId: string,
    userId: string,
    projectId: string,
    nodeId: string
  ): Promise<WbsNodeEntity> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const node = await this.wbsRepo.findById(tenantId, projectId, nodeId);
    if (!node) {
      throw new NotFoundError('WBS node not found.');
    }

    return node;
  }

  /**
   * Updates WBS node metadata and safely re-parents with cycle prevention.
   */
  async updateWbsNode(
    tenantId: string,
    userId: string,
    projectId: string,
    nodeId: string,
    dto: UpdateWbsNodeDto
  ): Promise<WbsNodeEntity> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:wbs:edit'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const node = await this.wbsRepo.findById(tenantId, projectId, nodeId);
    if (!node) {
      throw new NotFoundError('WBS node not found.');
    }

    let targetLevel: number | undefined = undefined;

    if (dto.parentId !== undefined) {
      if (dto.parentId === nodeId) {
        throw new BadRequestError('A WBS node cannot be its own parent.');
      }

      if (dto.parentId !== null) {
        const parent = await this.wbsRepo.findById(tenantId, projectId, dto.parentId);
        if (!parent) {
          throw new NotFoundError('Target parent WBS node not found in project.');
        }

        // Cycle prevention: Check if target parent is a descendant of this node
        let currentParentId: string | null = parent.id;
        while (currentParentId) {
          if (currentParentId === nodeId) {
            throw new ConflictError('Circular WBS hierarchy detected: cannot set parent to a descendant node.');
          }
          const curr = await this.wbsRepo.findById(tenantId, projectId, currentParentId);
          currentParentId = curr?.parentId ?? null;
        }

        targetLevel = parent.level + 1;
      } else {
        targetLevel = 1;
      }
    }

    return this.wbsRepo.update(tenantId, projectId, nodeId, {
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId,
      level: targetLevel,
      sequence: dto.sequence,
      status: dto.status,
      weightagePct: dto.weightagePct,
      progressPct: dto.progressPct,
      plannedStartDate: dto.plannedStartDate,
      plannedEndDate: dto.plannedEndDate,
      actualStartDate: dto.actualStartDate,
      actualEndDate: dto.actualEndDate,
    });
  }

  /**
   * Deletes a WBS node safely (rejects deletion if child nodes exist).
   */
  async deleteWbsNode(
    tenantId: string,
    userId: string,
    projectId: string,
    nodeId: string
  ): Promise<void> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:wbs:edit'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const node = await this.wbsRepo.findById(tenantId, projectId, nodeId);
    if (!node) {
      throw new NotFoundError('WBS node not found.');
    }

    const childrenCount = await this.wbsRepo.countChildren(projectId, nodeId);
    if (childrenCount > 0) {
      throw new ConflictError(
        `Cannot delete WBS node with ${childrenCount} child nodes. Reassign or delete children first.`
      );
    }

    await this.wbsRepo.delete(tenantId, projectId, nodeId);
  }
}
