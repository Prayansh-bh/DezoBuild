import type { IncomingMessage } from 'node:http';
import { VendorService } from '../services/vendor.service';
import {
  CreateVendorSchema,
  UpdateVendorSchema,
  ListVendorQuerySchema,
} from '../dto/vendor.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { Vendor } from '@prisma/client';

export class VendorsController {
  private readonly vendorService: VendorService;

  constructor(vendorService?: VendorService) {
    this.vendorService = vendorService || VendorService.getInstance();
  }

  public async listVendors(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: Vendor[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(ListVendorQuerySchema, req.query || {});

    const result = await this.vendorService.listVendors(principal.tenantId, query);
    return createSuccessResponse(result, 'Vendors retrieved successfully');
  }

  public async getVendor(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<Vendor>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const vendor = await this.vendorService.getVendorById(principal.tenantId, id);
    return createSuccessResponse(vendor, 'Vendor details retrieved successfully');
  }

  public async createVendor(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<Vendor>> {
    await RbacGuard.requirePermission(req, 'materials:manage');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(CreateVendorSchema, req.body || {});

    const vendor = await this.vendorService.createVendor(principal.tenantId, dto);
    return createSuccessResponse(vendor, 'Vendor created successfully');
  }

  public async updateVendor(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<Vendor>> {
    await RbacGuard.requirePermission(req, 'materials:manage');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(UpdateVendorSchema, req.body || {});

    const vendor = await this.vendorService.updateVendor(principal.tenantId, id, dto);
    return createSuccessResponse(vendor, 'Vendor updated successfully');
  }
}
