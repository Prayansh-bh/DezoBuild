import type {
  InventoryReservation,
  InventoryReservationLine,
  Material,
  Project,
  Store,
  User,
  WbsNode,
  Task,
} from '@prisma/client';
import type {
  CreateInventoryReservationDto,
  UpdateInventoryReservationDto,
  ListInventoryReservationsQueryDto,
} from '../dto/inventory-reservation.dto';

export type InventoryReservationLineWithRelations = InventoryReservationLine & {
  material: Material;
  wbsNode?: { id: string; code: string; name: string; projectId: string } | null;
  task?: { id: string; name: string; status: string; projectId: string } | null;
};

export type InventoryReservationWithRelations = InventoryReservation & {
  lines: InventoryReservationLineWithRelations[];
  store: {
    id: string;
    code: string;
    name: string;
    storeType: string;
    isCentralWarehouse: boolean;
    projectId: string | null;
  };
  project: {
    id: string;
    code: string;
    name: string;
  };
  createdBy: {
    id: string;
    fullName: string;
    email: string;
  };
  submittedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  approvedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  releasedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  cancelledBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  rejectedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export interface IInventoryReservationRepository {
  findById(
    tenantId: string,
    id: string
  ): Promise<InventoryReservationWithRelations | null>;

  findByReservationNumber(
    tenantId: string,
    reservationNumber: string
  ): Promise<InventoryReservationWithRelations | null>;

  findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListInventoryReservationsQueryDto
  ): Promise<{ items: InventoryReservationWithRelations[]; total: number }>;

  allocateReservationNumber(
    tenantId: string,
    scopeKey: string,
    date?: Date
  ): Promise<string>;

  create(
    tenantId: string,
    createdById: string,
    reservationNumber: string,
    derivedProjectId: string,
    data: CreateInventoryReservationDto
  ): Promise<InventoryReservationWithRelations>;

  update(
    tenantId: string,
    id: string,
    data: UpdateInventoryReservationDto
  ): Promise<InventoryReservationWithRelations>;

  submit(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<InventoryReservationWithRelations>;

  approve(
    tenantId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<InventoryReservationWithRelations>;

  reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<InventoryReservationWithRelations>;

  release(
    tenantId: string,
    id: string,
    userId: string,
    releaseRemarks?: string | null
  ): Promise<InventoryReservationWithRelations>;

  cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<InventoryReservationWithRelations>;

  expireStaleReservations(
    tenantId: string,
    currentDate?: Date
  ): Promise<number>;

  deleteDraft(
    tenantId: string,
    id: string
  ): Promise<void>;
}
