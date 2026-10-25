import { PrismaClient, Prisma } from '@prisma/client';
import { CreateEmployeeDto, UpdateEmployeeDto, ListEmployeesQueryDto } from '../dto/employee.dto.js';

export class EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, dto: CreateEmployeeDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.employee.create({
      data: {
        tenantId,
        userId: dto.userId ?? undefined,
        employeeNumber: dto.employeeNumber,
        companyId: dto.companyId,
        branchId: dto.branchId ?? undefined,
        departmentId: dto.departmentId ?? undefined,
        reportingManagerId: dto.reportingManagerId ?? undefined,
        fullName: dto.fullName,
        email: dto.email ?? undefined,
        phone: dto.phone ?? undefined,
        designation: dto.designation,
        employmentType: dto.employmentType ?? 'FULL_TIME',
        employmentStatus: dto.employmentStatus ?? 'ACTIVE',
        joiningDate: new Date(dto.joiningDate),
        exitDate: dto.exitDate ? new Date(dto.exitDate) : undefined,
        emergencyContactName: dto.emergencyContactName ?? undefined,
        emergencyContactPhone: dto.emergencyContactPhone ?? undefined,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        reportingManager: { select: { id: true, fullName: true, employeeNumber: true } },
        user: { select: { id: true, email: true, fullName: true, status: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.employee.findFirst({
      where: { id, tenantId },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        reportingManager: { select: { id: true, fullName: true, employeeNumber: true } },
        user: { select: { id: true, email: true, fullName: true, status: true } },
      },
    });
  }

  async findByEmployeeNumber(tenantId: string, employeeNumber: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.employee.findUnique({
      where: {
        tenantId_employeeNumber: {
          tenantId,
          employeeNumber,
        },
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        reportingManager: { select: { id: true, fullName: true, employeeNumber: true } },
        user: { select: { id: true, email: true, fullName: true, status: true } },
      },
    });
  }

  async findByUserId(tenantId: string, userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.employee.findFirst({
      where: { tenantId, userId },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        reportingManager: { select: { id: true, fullName: true, employeeNumber: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.employee.update({
      where: { id },
      data: {
        userId: dto.userId !== undefined ? dto.userId : undefined,
        companyId: dto.companyId,
        branchId: dto.branchId !== undefined ? dto.branchId : undefined,
        departmentId: dto.departmentId !== undefined ? dto.departmentId : undefined,
        reportingManagerId: dto.reportingManagerId !== undefined ? dto.reportingManagerId : undefined,
        fullName: dto.fullName,
        email: dto.email !== undefined ? dto.email : undefined,
        phone: dto.phone !== undefined ? dto.phone : undefined,
        designation: dto.designation,
        employmentType: dto.employmentType,
        emergencyContactName: dto.emergencyContactName !== undefined ? dto.emergencyContactName : undefined,
        emergencyContactPhone: dto.emergencyContactPhone !== undefined ? dto.emergencyContactPhone : undefined,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        reportingManager: { select: { id: true, fullName: true, employeeNumber: true } },
        user: { select: { id: true, email: true, fullName: true, status: true } },
      },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    exitDate?: Date | null,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.employee.update({
      where: { id },
      data: {
        employmentStatus: status,
        exitDate: exitDate !== undefined ? (exitDate ?? null) : undefined,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        reportingManager: { select: { id: true, fullName: true, employeeNumber: true } },
      },
    });
  }

  async list(tenantId: string, query: ListEmployeesQueryDto) {
    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.branchId && { branchId: query.branchId }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.status && { employmentStatus: query.status }),
      ...(query.employmentType && { employmentType: query.employmentType }),
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { employeeNumber: { contains: query.search, mode: 'insensitive' } },
          { designation: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { employeeNumber: 'asc' },
        include: {
          company: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true, code: true } },
          reportingManager: { select: { id: true, fullName: true, employeeNumber: true } },
          user: { select: { id: true, email: true, fullName: true, status: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}
