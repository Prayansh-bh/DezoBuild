import type { IncomingMessage } from 'node:http';
import type { AuthenticatedPrincipal } from '../../auth/auth.guard.js';
import type { QualityRequestContext } from '../constants/quality.constants.js';
import { DatabaseService } from '../../../database/database.service.js';

export async function buildQualityContext(
  principal: AuthenticatedPrincipal,
  req?: IncomingMessage
): Promise<QualityRequestContext> {
  const forwarded = req?.headers ? (req.headers['x-forwarded-for'] as string) : undefined;
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req?.socket?.remoteAddress || '127.0.0.1';

  let role: string | undefined;
  try {
    const prisma = DatabaseService.getInstance().getClient();
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { tenantId: principal.tenantId, userId: principal.userId },
      include: { role: true },
    });
    role = assignment?.role?.name;
  } catch {
    // Fallback if not queryable
  }

  return {
    tenantId: principal.tenantId,
    user: {
      id: principal.userId,
      role,
    },
    ipAddress,
  };
}
