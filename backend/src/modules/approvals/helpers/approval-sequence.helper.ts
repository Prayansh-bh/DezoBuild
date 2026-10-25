import type { PrismaClient } from '@prisma/client';

type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Atomically generates monotonic, collision-free approval request control numbers
 * using PostgreSQL transaction-level advisory locks.
 */
export async function getNextApprovalSequence(
  tenantId: string,
  projectId: string | null | undefined,
  scopeCode: string,
  tx: PrismaTransactionClient
): Promise<string> {
  const cleanCode = (scopeCode || 'TENANT').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20);
  const year = new Date().getFullYear();

  const lockKey = `${tenantId}:${projectId || 'TENANT'}:APR:${year}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

  const prefixMatch = `APR-${cleanCode}-${year}-%`;
  const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
    SELECT MAX(SUBSTRING(request_number FROM '[0-9]+$')::int) AS max_num
    FROM approval_requests
    WHERE tenant_id = ${tenantId}::uuid
      AND request_number LIKE ${prefixMatch}
  `;

  const nextSeq = (rows[0]?.max_num ?? 0) + 1;
  const padded = String(nextSeq).padStart(6, '0');
  return `APR-${cleanCode}-${year}-${padded}`;
}
