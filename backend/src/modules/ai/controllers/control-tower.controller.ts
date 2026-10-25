import type { IncomingMessage } from 'node:http';
import { ControlTowerService } from '../services/control-tower.service.js';
import { queryControlTowerSchema } from '../dto/ai.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';

export class ControlTowerController {
  constructor(private readonly controlTowerService: ControlTowerService) {}

  public async getSummary(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'ai:view');
    const principal = await requireAuth(req);
    const query = DtoValidator.validate(queryControlTowerSchema, req.query || {});

    const result = await this.controlTowerService.getControlTowerSummary(
      principal.tenantId,
      query
    );

    return createSuccessResponse(result, 'Control tower operational intelligence summary generated');
  }
}
