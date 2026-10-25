import { Prisma, type PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type { IInventoryAvailabilityRepository } from './inventory-availability.repository.interface';
import type {
  ListAvailabilityQueryDto,
  GetShortagesQueryDto,
  MaterialAvailabilityItem,
  Material360Availability,
  ProjectAvailabilityPosition,
  StoreAvailabilityPosition,
  MaterialShortageItem,
  StoreBalanceItem,
  ProjectAllocationBreakdown,
  ProjectMaterialPositionItem,
} from '../dto/inventory-availability.dto';

export class PrismaInventoryAvailabilityRepository
  implements IInventoryAvailabilityRepository
{
  private static instance: PrismaInventoryAvailabilityRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaInventoryAvailabilityRepository {
    if (!PrismaInventoryAvailabilityRepository.instance) {
      PrismaInventoryAvailabilityRepository.instance =
        new PrismaInventoryAvailabilityRepository();
    }
    return PrismaInventoryAvailabilityRepository.instance;
  }

  public async findAvailabilityList(
    tenantId: string,
    options: {
      allowedStoreIds?: string[];
      allowedProjectIds?: string[];
      filter?: ListAvailabilityQueryDto;
    }
  ): Promise<{ items: MaterialAvailabilityItem[]; total: number }> {
    const { allowedStoreIds, allowedProjectIds, filter } = options;

    // 1. Build Material where clause
    const materialWhere: Prisma.MaterialWhereInput = { tenantId };

    if (filter?.materialId) {
      materialWhere.id = filter.materialId;
    }
    if (filter?.category) {
      materialWhere.category = {
        equals: filter.category,
        mode: 'insensitive',
      };
    }
    if (filter?.search) {
      const s = filter.search.trim();
      materialWhere.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { itemCode: { contains: s, mode: 'insensitive' } },
      ];
    }

    // 2. Determine allowed stores
    const storeWhere: Prisma.StoreWhereInput = { tenantId, status: 'ACTIVE' };
    if (allowedStoreIds !== undefined) {
      if (allowedStoreIds.length === 0) {
        return { items: [], total: 0 };
      }
      storeWhere.id = { in: allowedStoreIds };
    }
    if (filter?.storeId) {
      storeWhere.id = filter.storeId;
    }
    if (filter?.projectId) {
      storeWhere.projectId = filter.projectId;
    }

    // Fetch stores matching criteria
    const stores = await this.prisma.store.findMany({
      where: storeWhere,
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const storeIds = stores.map((s) => s.id);
    const storeMap = new Map(stores.map((s) => [s.id, s]));

    if (storeIds.length === 0 && (filter?.storeId || filter?.projectId)) {
      return { items: [], total: 0 };
    }

    // 3. Pagination for materials
    const page = Math.max(1, filter?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter?.limit ?? 50));
    const skip = (page - 1) * limit;

    const [materials, totalMaterials] = await Promise.all([
      this.prisma.material.findMany({
        where: materialWhere,
        skip,
        take: limit,
        orderBy: { itemCode: 'asc' },
      }),
      this.prisma.material.count({ where: materialWhere }),
    ]);

    if (materials.length === 0) {
      return { items: [], total: 0 };
    }

    const materialIds = materials.map((m) => m.id);

    // 4. Fetch StoreStockBalances for these materials in allowed stores
    const balances = await this.prisma.storeStockBalance.findMany({
      where: {
        tenantId,
        materialId: { in: materialIds },
        storeId: storeIds.length > 0 ? { in: storeIds } : undefined,
      },
    });

    // 5. Fetch In-Transit Transfers for these materials
    const inTransitTransfers = await this.prisma.materialTransfer.findMany({
      where: {
        tenantId,
        status: 'IN_TRANSIT',
        lines: {
          some: { materialId: { in: materialIds } },
        },
      },
      include: {
        lines: {
          where: { materialId: { in: materialIds } },
        },
      },
    });

    // 6. Fetch Pending POs for these materials (status = 'ORDERED')
    const pendingPOs = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: 'ORDERED',
        projectId:
          allowedProjectIds !== undefined
            ? { in: allowedProjectIds }
            : undefined,
        lines: {
          some: { materialId: { in: materialIds } },
        },
      },
      include: {
        lines: {
          where: { materialId: { in: materialIds } },
        },
      },
    });

    // 7. Aggregate per material
    const items: MaterialAvailabilityItem[] = [];

    for (const mat of materials) {
      const matBalances = balances.filter((b) => b.materialId === mat.id);

      let totalOnHand = 0;
      let totalReserved = 0;
      let totalInTransitIn = 0;
      let totalInTransitOut = 0;

      const storeBalanceItems: StoreBalanceItem[] = [];

      for (const bal of matBalances) {
        const store = storeMap.get(bal.storeId);
        if (!store) continue;

        const onHand = Number(bal.quantityOnHand);
        const reserved = Number(bal.reservedQuantity);
        const available = Math.max(0, onHand - reserved);

        // Compute in-transit inbound to this store
        let inTransitIn = 0;
        let inTransitOut = 0;

        for (const t of inTransitTransfers) {
          if (t.destinationStoreId === store.id) {
            for (const tl of t.lines) {
              if (tl.materialId === mat.id) {
                inTransitIn += Number(tl.quantityTransferred);
              }
            }
          }
          if (t.sourceStoreId === store.id) {
            for (const tl of t.lines) {
              if (tl.materialId === mat.id) {
                inTransitOut += Number(tl.quantityTransferred);
              }
            }
          }
        }

        totalOnHand += onHand;
        totalReserved += reserved;
        totalInTransitIn += inTransitIn;
        totalInTransitOut += inTransitOut;

        storeBalanceItems.push({
          storeId: store.id,
          storeCode: store.code,
          storeName: store.name,
          storeType: store.storeType,
          isCentralWarehouse: store.isCentralWarehouse,
          projectId: store.projectId,
          projectName: store.project?.name || null,
          quantityOnHand: onHand,
          reservedQuantity: reserved,
          availableQuantity: available,
          inTransitInbound: inTransitIn,
          inTransitOutbound: inTransitOut,
          storeProjectedAvailable: available + inTransitIn,
        });
      }

      // Compute Pending POs for this material
      let totalPendingPO = 0;
      for (const po of pendingPOs) {
        for (const pol of po.lines) {
          if (pol.materialId === mat.id) {
            const ord = Number(pol.quantityOrdered);
            const rec = Number(pol.quantityReceived);
            totalPendingPO += Math.max(0, ord - rec);
          }
        }
      }

      const totalAvailable = Math.max(0, totalOnHand - totalReserved);
      const totalProjected = totalAvailable + totalInTransitIn + totalPendingPO;

      const reorderLevel = Number(mat.reorderLevel);
      const safetyStock = Number(mat.safetyStock);

      const reorderAlert = reorderLevel > 0 && totalOnHand <= reorderLevel;
      const safetyStockAlert = safetyStock > 0 && totalOnHand <= safetyStock;

      if (filter?.belowReorderOnly && !reorderAlert) {
        continue;
      }
      if (filter?.belowSafetyOnly && !safetyStockAlert) {
        continue;
      }

      items.push({
        materialId: mat.id,
        itemCode: mat.itemCode,
        name: mat.name,
        category: mat.category,
        primaryUom: mat.primaryUom,
        reorderLevel,
        safetyStock,
        totalQuantityOnHand: totalOnHand,
        totalReservedQuantity: totalReserved,
        totalAvailableQuantity: totalAvailable,
        totalInTransitInbound: totalInTransitIn,
        totalInTransitOutbound: totalInTransitOut,
        totalPendingPOInbound: totalPendingPO,
        totalProjectedAvailable: totalProjected,
        reorderAlert,
        safetyStockAlert,
        storeBalances: storeBalanceItems,
      });
    }

    return {
      items,
      total: totalMaterials,
    };
  }

  public async getMaterial360(
    tenantId: string,
    materialId: string,
    allowedStoreIds?: string[],
    allowedProjectIds?: string[]
  ): Promise<Material360Availability | null> {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, tenantId },
    });

    if (!material) {
      return null;
    }

    // Fetch all stores in tenant
    const stores = await this.prisma.store.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        id:
          allowedStoreIds !== undefined ? { in: allowedStoreIds } : undefined,
      },
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const storeMap = new Map(stores.map((s) => [s.id, s]));
    const storeIds = stores.map((s) => s.id);

    // Fetch balances
    const balances = await this.prisma.storeStockBalance.findMany({
      where: {
        tenantId,
        materialId,
        storeId: storeIds.length > 0 ? { in: storeIds } : undefined,
      },
    });

    // Fetch active reservations
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'PARTIALLY_FULFILLED'] },
        projectId:
          allowedProjectIds !== undefined
            ? { in: allowedProjectIds }
            : undefined,
        lines: {
          some: { materialId },
        },
      },
      include: {
        project: {
          select: { id: true, code: true, name: true },
        },
        lines: {
          where: { materialId },
        },
      },
      orderBy: { reservationDate: 'desc' },
    });

    const activeReservations: ProjectAllocationBreakdown[] = [];
    for (const r of reservations) {
      for (const line of r.lines) {
        const reserved = Number(line.quantityReserved);
        const fulfilled = Number(line.quantityFulfilled);
        const released = Number(line.quantityReleased);
        const remaining = Math.max(0, reserved - fulfilled - released);

        if (remaining > 0) {
          activeReservations.push({
            reservationId: r.id,
            reservationNumber: r.reservationNumber,
            projectId: r.projectId,
            projectCode: r.project.code,
            projectName: r.project.name,
            reservedQuantity: reserved,
            fulfilledQuantity: fulfilled,
            releasedQuantity: released,
            remainingReservedQuantity: remaining,
            priority: r.priority,
            requiredDate: r.requiredDate
              ? r.requiredDate.toISOString().split('T')[0]
              : null,
            expiryDate: r.expiryDate
              ? r.expiryDate.toISOString().split('T')[0]
              : null,
            wbsNodeId: line.wbsNodeId,
            taskId: line.taskId,
          });
        }
      }
    }

    // Fetch in-transit transfers
    const transfers = await this.prisma.materialTransfer.findMany({
      where: {
        tenantId,
        status: 'IN_TRANSIT',
        lines: {
          some: { materialId },
        },
      },
      include: {
        sourceStore: { select: { id: true, name: true, code: true } },
        destinationStore: { select: { id: true, name: true, code: true } },
        lines: { where: { materialId } },
      },
      orderBy: { dispatchDate: 'desc' },
    });

    const inTransitTransfers = transfers.map((t) => {
      const line = t.lines[0];
      return {
        transferId: t.id,
        transferNumber: t.transferNumber,
        sourceStoreId: t.sourceStoreId,
        sourceStoreName: t.sourceStore.name,
        destinationStoreId: t.destinationStoreId,
        destinationStoreName: t.destinationStore.name,
        quantityTransferred: line ? Number(line.quantityTransferred) : 0,
        dispatchDate: t.dispatchDate ? t.dispatchDate.toISOString() : null,
      };
    });

    // Fetch pending POs (status = 'ORDERED')
    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: 'ORDERED',
        projectId:
          allowedProjectIds !== undefined
            ? { in: allowedProjectIds }
            : undefined,
        lines: {
          some: { materialId },
        },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        vendor: { select: { id: true, name: true } },
        lines: { where: { materialId } },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });

    const pendingPurchaseOrders = pos.map((po) => {
      const line = po.lines[0];
      const ordered = line ? Number(line.quantityOrdered) : 0;
      const received = line ? Number(line.quantityReceived) : 0;
      return {
        purchaseOrderId: po.id,
        poNumber: po.poNumber,
        projectId: po.projectId,
        projectName: po.project.name,
        vendorId: po.vendorId,
        vendorName: po.vendor.name,
        quantityOrdered: ordered,
        quantityReceived: received,
        remainingQuantity: Math.max(0, ordered - received),
        expectedDeliveryDate: po.expectedDeliveryDate
          ? po.expectedDeliveryDate.toISOString().split('T')[0]
          : null,
      };
    });

    // Aggregate store balances
    let totalOnHand = 0;
    let totalReserved = 0;
    let totalInTransitIn = 0;
    let totalInTransitOut = 0;

    const storeBalances: StoreBalanceItem[] = [];

    for (const bal of balances) {
      const store = storeMap.get(bal.storeId);
      if (!store) continue;

      const onHand = Number(bal.quantityOnHand);
      const reserved = Number(bal.reservedQuantity);
      const available = Math.max(0, onHand - reserved);

      let inTransitIn = 0;
      let inTransitOut = 0;

      for (const t of transfers) {
        if (t.destinationStoreId === store.id) {
          for (const tl of t.lines) {
            inTransitIn += Number(tl.quantityTransferred);
          }
        }
        if (t.sourceStoreId === store.id) {
          for (const tl of t.lines) {
            inTransitOut += Number(tl.quantityTransferred);
          }
        }
      }

      totalOnHand += onHand;
      totalReserved += reserved;
      totalInTransitIn += inTransitIn;
      totalInTransitOut += inTransitOut;

      storeBalances.push({
        storeId: store.id,
        storeCode: store.code,
        storeName: store.name,
        storeType: store.storeType,
        isCentralWarehouse: store.isCentralWarehouse,
        projectId: store.projectId,
        projectName: store.project?.name || null,
        quantityOnHand: onHand,
        reservedQuantity: reserved,
        availableQuantity: available,
        inTransitInbound: inTransitIn,
        inTransitOutbound: inTransitOut,
        storeProjectedAvailable: available + inTransitIn,
      });
    }

    let totalPendingPO = 0;
    for (const po of pendingPurchaseOrders) {
      totalPendingPO += po.remainingQuantity;
    }

    const totalAvailable = Math.max(0, totalOnHand - totalReserved);
    const totalProjected = totalAvailable + totalInTransitIn + totalPendingPO;

    const reorderLevel = Number(material.reorderLevel);
    const safetyStock = Number(material.safetyStock);

    const reorderAlert = reorderLevel > 0 && totalOnHand <= reorderLevel;
    const safetyStockAlert = safetyStock > 0 && totalOnHand <= safetyStock;

    return {
      material: {
        id: material.id,
        itemCode: material.itemCode,
        name: material.name,
        description: material.description,
        category: material.category,
        primaryUom: material.primaryUom,
        secondaryUom: material.secondaryUom,
        conversionFactor: material.conversionFactor
          ? Number(material.conversionFactor)
          : null,
        standardRate: Number(material.standardRate),
        reorderLevel,
        safetyStock,
        status: material.status,
      },
      summary: {
        totalQuantityOnHand: totalOnHand,
        totalReservedQuantity: totalReserved,
        totalAvailableQuantity: totalAvailable,
        totalInTransitInbound: totalInTransitIn,
        totalInTransitOutbound: totalInTransitOut,
        totalPendingPOInbound: totalPendingPO,
        totalProjectedAvailable: totalProjected,
        reorderAlert,
        safetyStockAlert,
      },
      storeBalances,
      activeReservations,
      inTransitTransfers,
      pendingPurchaseOrders,
    };
  }

  public async getProjectAvailability(
    tenantId: string,
    projectId: string
  ): Promise<ProjectAvailabilityPosition | null> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true, code: true, name: true, status: true },
    });

    if (!project) {
      return null;
    }

    // 1. Fetch site stores for this project
    const siteStores = await this.prisma.store.findMany({
      where: {
        tenantId,
        projectId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        storeType: true,
      },
    });

    const siteStoreIds = siteStores.map((s) => s.id);

    // 2. Fetch all materials referenced by balances, reservations, transfers, POs, or indents for this project
    const siteBalances = await this.prisma.storeStockBalance.findMany({
      where: {
        tenantId,
        storeId: siteStoreIds.length > 0 ? { in: siteStoreIds } : undefined,
      },
      include: { material: true },
    });

    // 3. Central Store Reservations allocated specifically for this project
    const centralReservations =
      await this.prisma.inventoryReservation.findMany({
        where: {
          tenantId,
          projectId,
          status: { in: ['ACTIVE', 'PARTIALLY_FULFILLED'] },
          store: { isCentralWarehouse: true },
        },
        include: {
          lines: {
            include: { material: true },
          },
        },
      });

    // 4. In-Transit Transfers heading to this project's site stores
    const inTransitTransfers = await this.prisma.materialTransfer.findMany({
      where: {
        tenantId,
        status: 'IN_TRANSIT',
        destinationStoreId:
          siteStoreIds.length > 0 ? { in: siteStoreIds } : undefined,
      },
      include: {
        lines: {
          include: { material: true },
        },
      },
    });

    // 5. Pending POs for this project (status = 'ORDERED')
    const pendingPOs = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        projectId,
        status: 'ORDERED',
      },
      include: {
        lines: {
          include: { material: true },
        },
      },
    });

    // 6. Open Indent Demand for this project (status IN ('SUBMITTED', 'APPROVED'))
    const openIndents = await this.prisma.materialIndent.findMany({
      where: {
        tenantId,
        projectId,
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
      include: {
        lines: {
          include: { material: true },
        },
      },
    });

    // Collect all unique materials involved
    const materialMap = new Map<
      string,
      { id: string; itemCode: string; name: string; category: string; primaryUom: string }
    >();

    for (const b of siteBalances) {
      materialMap.set(b.materialId, {
        id: b.material.id,
        itemCode: b.material.itemCode,
        name: b.material.name,
        category: b.material.category,
        primaryUom: b.material.primaryUom,
      });
    }

    for (const cr of centralReservations) {
      for (const line of cr.lines) {
        materialMap.set(line.materialId, {
          id: line.material.id,
          itemCode: line.material.itemCode,
          name: line.material.name,
          category: line.material.category,
          primaryUom: line.material.primaryUom,
        });
      }
    }

    for (const t of inTransitTransfers) {
      for (const line of t.lines) {
        materialMap.set(line.materialId, {
          id: line.material.id,
          itemCode: line.material.itemCode,
          name: line.material.name,
          category: line.material.category,
          primaryUom: line.material.primaryUom,
        });
      }
    }

    for (const po of pendingPOs) {
      for (const line of po.lines) {
        materialMap.set(line.materialId, {
          id: line.material.id,
          itemCode: line.material.itemCode,
          name: line.material.name,
          category: line.material.category,
          primaryUom: line.material.primaryUom,
        });
      }
    }

    for (const ind of openIndents) {
      for (const line of ind.lines) {
        materialMap.set(line.materialId, {
          id: line.material.id,
          itemCode: line.material.itemCode,
          name: line.material.name,
          category: line.material.category,
          primaryUom: line.material.primaryUom,
        });
      }
    }

    // Build Material Position for each material
    const materialPositions: ProjectMaterialPositionItem[] = [];

    for (const [matId, mat] of materialMap.entries()) {
      // 1. Site stores stock
      let siteOnHand = 0;
      let siteReserved = 0;

      const matSiteBalances = siteBalances.filter(
        (b) => b.materialId === matId
      );
      for (const b of matSiteBalances) {
        siteOnHand += Number(b.quantityOnHand);
        siteReserved += Number(b.reservedQuantity);
      }
      const siteFreeAvailable = Math.max(0, siteOnHand - siteReserved);

      // 2. Central Store Allocated Reserved
      let centralAllocated = 0;
      for (const cr of centralReservations) {
        for (const line of cr.lines) {
          if (line.materialId === matId) {
            const res = Number(line.quantityReserved);
            const ful = Number(line.quantityFulfilled);
            const rel = Number(line.quantityReleased);
            centralAllocated += Math.max(0, res - ful - rel);
          }
        }
      }

      // Total Controlled Stock
      const totalProjectControlled = siteFreeAvailable + centralAllocated;

      // 3. In-Transit Transfer Inbound
      let inTransitInbound = 0;
      for (const t of inTransitTransfers) {
        for (const line of t.lines) {
          if (line.materialId === matId) {
            inTransitInbound += Number(line.quantityTransferred);
          }
        }
      }

      // 4. Pending PO Inbound
      let pendingPOInbound = 0;
      for (const po of pendingPOs) {
        for (const line of po.lines) {
          if (line.materialId === matId) {
            const ord = Number(line.quantityOrdered);
            const rec = Number(line.quantityReceived);
            pendingPOInbound += Math.max(0, ord - rec);
          }
        }
      }

      // Total Projected Supply
      const totalProjectProjectedSupply =
        totalProjectControlled + inTransitInbound + pendingPOInbound;

      // 5. Open Indent Demand
      let openIndentDemand = 0;
      for (const ind of openIndents) {
        for (const line of ind.lines) {
          if (line.materialId === matId) {
            const req = Number(line.quantityRequested);
            const ful = Number(line.quantityFulfilled);
            openIndentDemand += Math.max(0, req - ful);
          }
        }
      }

      // Active Reservation Demand
      const activeReservationDemand = centralAllocated + siteReserved;

      // Total Demand for Shortage Analysis
      const totalDemand = openIndentDemand;

      const immediateSiteShortage = Math.max(
        0,
        totalDemand - siteFreeAvailable
      );
      const netProjectShortage = Math.max(
        0,
        totalDemand - totalProjectProjectedSupply
      );

      materialPositions.push({
        materialId: mat.id,
        itemCode: mat.itemCode,
        name: mat.name,
        category: mat.category,
        primaryUom: mat.primaryUom,
        siteStoresPhysicalOnHand: siteOnHand,
        siteStoresReservedQuantity: siteReserved,
        siteStoresFreeAvailable: siteFreeAvailable,
        centralWarehouseAllocatedReserved: centralAllocated,
        totalProjectControlledStock: totalProjectControlled,
        inTransitTransferInbound: inTransitInbound,
        pendingPOInbound,
        totalProjectProjectedSupply,
        openIndentDemand,
        activeReservationDemand,
        immediateSiteShortage,
        netProjectShortage,
      });
    }

    return {
      project,
      siteStores,
      materialPositions,
    };
  }

  public async getStoreAvailability(
    tenantId: string,
    storeId: string
  ): Promise<StoreAvailabilityPosition | null> {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId },
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
    });

    if (!store) {
      return null;
    }

    // 1. Fetch balances in this store
    const balances = await this.prisma.storeStockBalance.findMany({
      where: { tenantId, storeId },
      include: { material: true },
      orderBy: { material: { itemCode: 'asc' } },
    });

    const materialIds = balances.map((b) => b.materialId);

    // 2. Fetch In-Transit Transfers involving this store
    const inTransitTransfers = await this.prisma.materialTransfer.findMany({
      where: {
        tenantId,
        status: 'IN_TRANSIT',
        OR: [{ destinationStoreId: storeId }, { sourceStoreId: storeId }],
      },
      include: {
        lines: true,
      },
    });

    // 3. If Central Warehouse, fetch active reservations by beneficiary project
    let centralStoreProjectAllocations:
      | ProjectAllocationBreakdown[]
      | undefined;

    if (store.isCentralWarehouse) {
      const reservations = await this.prisma.inventoryReservation.findMany({
        where: {
          tenantId,
          storeId,
          status: { in: ['ACTIVE', 'PARTIALLY_FULFILLED'] },
        },
        include: {
          project: { select: { id: true, code: true, name: true } },
          lines: {
            include: { material: true },
          },
        },
        orderBy: { reservationDate: 'desc' },
      });

      centralStoreProjectAllocations = [];
      for (const r of reservations) {
        for (const line of r.lines) {
          const reserved = Number(line.quantityReserved);
          const fulfilled = Number(line.quantityFulfilled);
          const released = Number(line.quantityReleased);
          const remaining = Math.max(0, reserved - fulfilled - released);

          if (remaining > 0) {
            centralStoreProjectAllocations.push({
              reservationId: r.id,
              reservationNumber: r.reservationNumber,
              projectId: r.projectId,
              projectCode: r.project.code,
              projectName: r.project.name,
              reservedQuantity: reserved,
              fulfilledQuantity: fulfilled,
              releasedQuantity: released,
              remainingReservedQuantity: remaining,
              priority: r.priority,
              requiredDate: r.requiredDate
                ? r.requiredDate.toISOString().split('T')[0]
                : null,
              expiryDate: r.expiryDate
                ? r.expiryDate.toISOString().split('T')[0]
                : null,
              wbsNodeId: line.wbsNodeId,
              taskId: line.taskId,
            });
          }
        }
      }
    }

    // 4. Build material balances
    const materialBalances = balances.map((bal) => {
      const mat = bal.material;
      const onHand = Number(bal.quantityOnHand);
      const reserved = Number(bal.reservedQuantity);
      const available = Math.max(0, onHand - reserved);

      let inTransitIn = 0;
      let inTransitOut = 0;

      for (const t of inTransitTransfers) {
        if (t.destinationStoreId === storeId) {
          for (const line of t.lines) {
            if (line.materialId === mat.id) {
              inTransitIn += Number(line.quantityTransferred);
            }
          }
        }
        if (t.sourceStoreId === storeId) {
          for (const line of t.lines) {
            if (line.materialId === mat.id) {
              inTransitOut += Number(line.quantityTransferred);
            }
          }
        }
      }

      const reorderLevel = Number(mat.reorderLevel);
      const safetyStock = Number(mat.safetyStock);

      const reorderAlert = reorderLevel > 0 && onHand <= reorderLevel;
      const safetyStockAlert = safetyStock > 0 && onHand <= safetyStock;

      return {
        materialId: mat.id,
        itemCode: mat.itemCode,
        name: mat.name,
        category: mat.category,
        primaryUom: mat.primaryUom,
        quantityOnHand: onHand,
        reservedQuantity: reserved,
        availableQuantity: available,
        inTransitInbound: inTransitIn,
        inTransitOutbound: inTransitOut,
        storeProjectedAvailable: available + inTransitIn,
        reorderLevel,
        safetyStock,
        reorderAlert,
        safetyStockAlert,
      };
    });

    return {
      store: {
        id: store.id,
        code: store.code,
        name: store.name,
        storeType: store.storeType,
        isCentralWarehouse: store.isCentralWarehouse,
        projectId: store.projectId,
        projectName: store.project?.name || null,
        status: store.status,
      },
      materialBalances,
      centralStoreProjectAllocations,
    };
  }

  public async getShortages(
    tenantId: string,
    options: {
      allowedProjectIds?: string[];
      allowedStoreIds?: string[];
      filter?: GetShortagesQueryDto;
    }
  ): Promise<{ items: MaterialShortageItem[]; total: number }> {
    const { allowedProjectIds, allowedStoreIds, filter } = options;

    // 1. Fetch materials
    const materialWhere: Prisma.MaterialWhereInput = {
      tenantId,
      status: 'ACTIVE',
    };
    if (filter?.category) {
      materialWhere.category = {
        equals: filter.category,
        mode: 'insensitive',
      };
    }

    const materials = await this.prisma.material.findMany({
      where: materialWhere,
      orderBy: { itemCode: 'asc' },
    });

    if (materials.length === 0) {
      return { items: [], total: 0 };
    }

    const materialIds = materials.map((m) => m.id);

    // 2. Fetch all relevant balances
    const balances = await this.prisma.storeStockBalance.findMany({
      where: {
        tenantId,
        materialId: { in: materialIds },
        storeId:
          allowedStoreIds !== undefined
            ? { in: allowedStoreIds }
            : filter?.storeId
              ? filter.storeId
              : undefined,
      },
    });

    // 3. Fetch In-Transit Transfers
    const inTransitTransfers = await this.prisma.materialTransfer.findMany({
      where: {
        tenantId,
        status: 'IN_TRANSIT',
        lines: {
          some: { materialId: { in: materialIds } },
        },
      },
      include: {
        lines: { where: { materialId: { in: materialIds } } },
      },
    });

    // 4. Fetch Pending POs (status = 'ORDERED')
    const pendingPOs = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: 'ORDERED',
        projectId:
          allowedProjectIds !== undefined
            ? { in: allowedProjectIds }
            : filter?.projectId
              ? filter.projectId
              : undefined,
        lines: {
          some: { materialId: { in: materialIds } },
        },
      },
      include: {
        lines: { where: { materialId: { in: materialIds } } },
      },
    });

    // 5. Fetch Open Indents
    const openIndents = await this.prisma.materialIndent.findMany({
      where: {
        tenantId,
        status: { in: ['SUBMITTED', 'APPROVED'] },
        projectId:
          allowedProjectIds !== undefined
            ? { in: allowedProjectIds }
            : filter?.projectId
              ? filter.projectId
              : undefined,
        lines: {
          some: { materialId: { in: materialIds } },
        },
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        lines: { where: { materialId: { in: materialIds } } },
      },
    });

    // 6. Fetch Central Store Reservations
    const centralReservations =
      await this.prisma.inventoryReservation.findMany({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'PARTIALLY_FULFILLED'] },
          store: { isCentralWarehouse: true },
          projectId:
            allowedProjectIds !== undefined
              ? { in: allowedProjectIds }
              : filter?.projectId
                ? filter.projectId
                : undefined,
          lines: {
            some: { materialId: { in: materialIds } },
          },
        },
        include: {
          project: { select: { id: true, code: true, name: true } },
          lines: { where: { materialId: { in: materialIds } } },
        },
      });

    // 7. Calculate shortage per material
    const allShortages: MaterialShortageItem[] = [];

    for (const mat of materials) {
      let totalOnHand = 0;
      let totalReserved = 0;

      const matBalances = balances.filter((b) => b.materialId === mat.id);
      for (const b of matBalances) {
        totalOnHand += Number(b.quantityOnHand);
        totalReserved += Number(b.reservedQuantity);
      }
      const totalFreeAvailable = Math.max(0, totalOnHand - totalReserved);

      let totalInTransitIn = 0;
      for (const t of inTransitTransfers) {
        for (const line of t.lines) {
          if (line.materialId === mat.id) {
            totalInTransitIn += Number(line.quantityTransferred);
          }
        }
      }

      let totalPendingPO = 0;
      for (const po of pendingPOs) {
        for (const line of po.lines) {
          if (line.materialId === mat.id) {
            const ord = Number(line.quantityOrdered);
            const rec = Number(line.quantityReceived);
            totalPendingPO += Math.max(0, ord - rec);
          }
        }
      }

      const totalProjectedSupply =
        totalFreeAvailable + totalInTransitIn + totalPendingPO;

      // Calculate project-level demand and shortages
      let totalDemand = 0;
      const affectedProjectMap = new Map<
        string,
        {
          projectId: string;
          projectCode: string;
          projectName: string;
          demandQuantity: number;
          siteAvailable: number;
          centralAllocated: number;
          netShortage: number;
        }
      >();

      for (const ind of openIndents) {
        for (const line of ind.lines) {
          if (line.materialId === mat.id) {
            const req = Number(line.quantityRequested);
            const ful = Number(line.quantityFulfilled);
            const dem = Math.max(0, req - ful);
            totalDemand += dem;

            const existing = affectedProjectMap.get(ind.projectId) || {
              projectId: ind.projectId,
              projectCode: ind.project.code,
              projectName: ind.project.name,
              demandQuantity: 0,
              siteAvailable: 0,
              centralAllocated: 0,
              netShortage: 0,
            };
            existing.demandQuantity += dem;
            affectedProjectMap.set(ind.projectId, existing);
          }
        }
      }

      // Add central allocated reserved for affected projects
      for (const cr of centralReservations) {
        for (const line of cr.lines) {
          if (line.materialId === mat.id) {
            const res = Number(line.quantityReserved);
            const ful = Number(line.quantityFulfilled);
            const rel = Number(line.quantityReleased);
            const rem = Math.max(0, res - ful - rel);

            const existing = affectedProjectMap.get(cr.projectId);
            if (existing) {
              existing.centralAllocated += rem;
            }
          }
        }
      }

      // Compute net shortage per project
      const affectedProjects = Array.from(affectedProjectMap.values()).map(
        (p) => {
          const pShortage = Math.max(
            0,
            p.demandQuantity - (p.siteAvailable + p.centralAllocated)
          );
          return {
            ...p,
            netShortage: pShortage,
          };
        }
      );

      const immediateShortage = Math.max(0, totalDemand - totalFreeAvailable);
      const netShortage = Math.max(0, totalDemand - totalProjectedSupply);

      const reorderLevel = Number(mat.reorderLevel);
      const safetyStock = Number(mat.safetyStock);

      const reorderAlert = reorderLevel > 0 && totalOnHand <= reorderLevel;
      const safetyStockAlert = safetyStock > 0 && totalOnHand <= safetyStock;

      let severity: 'CRITICAL_SAFETY' | 'REORDER_POINT' | 'PROJECT_SHORTAGE' | 'NORMAL' =
        'NORMAL';

      if (safetyStockAlert) {
        severity = 'CRITICAL_SAFETY';
      } else if (reorderAlert) {
        severity = 'REORDER_POINT';
      } else if (netShortage > 0 || immediateShortage > 0) {
        severity = 'PROJECT_SHORTAGE';
      }

      if (filter?.severity && filter.severity !== 'ALL') {
        if (filter.severity !== severity) {
          continue;
        }
      } else {
        // If filter severity is ALL or omitted, include only items with an alert or shortage
        if (severity === 'NORMAL') {
          continue;
        }
      }

      allShortages.push({
        materialId: mat.id,
        itemCode: mat.itemCode,
        name: mat.name,
        category: mat.category,
        primaryUom: mat.primaryUom,
        reorderLevel,
        safetyStock,
        totalOnHand,
        totalReserved,
        totalFreeAvailable,
        totalInTransitInbound: totalInTransitIn,
        totalPendingPOInbound: totalPendingPO,
        totalProjectedSupply,
        totalDemand,
        immediateShortage,
        netShortage,
        severity,
        reorderAlert,
        safetyStockAlert,
        affectedProjects,
      });
    }

    // Pagination
    const page = Math.max(1, filter?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter?.limit ?? 50));
    const skip = (page - 1) * limit;

    const paginatedItems = allShortages.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      total: allShortages.length,
    };
  }
}
