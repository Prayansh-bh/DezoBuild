import type { IncomingMessage } from 'node:http';
import type { AuthenticatedPrincipal } from '../../auth/auth.guard.js';
import type { PeopleRequestContext } from '../constants/people.constants.js';

export function buildPeopleContext(
  principal: AuthenticatedPrincipal,
  req?: IncomingMessage
): PeopleRequestContext {
  const forwarded = req?.headers ? (req.headers['x-forwarded-for'] as string) : undefined;
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req?.socket?.remoteAddress || '127.0.0.1';

  return {
    tenantId: principal.tenantId,
    user: {
      id: principal.userId,
    },
    ipAddress,
  };
}
