import type { PrismaClient } from '@prisma/client';

export type QualitySequencePrefix = 'INSP' | 'NCR' | 'ACT' | 'OBS' | 'INC';

type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Atomically allocates the next monotonic sequence number for a given tenant, prefix, and year.
 * Concurrency is serialized via PostgreSQL transaction-scoped advisory locking.
 * Format: PREFIX-YYYY-000001
 */
export async function getNextQualitySafetySequence(
  tenantId: string,
  prefix: QualitySequencePrefix,
  tx: PrismaTransactionClient
): Promise<string> {
  const year = new Date().getFullYear();
  const lockKey = `${tenantId}:${prefix}:${year}`;

  // 1. Transaction-scoped advisory lock serialized per tenant, prefix, and year
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

  // 2. Query the highest existing monotonic number for this tenant & year
  let maxNum = 0;

  if (prefix === 'INSP') {
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(inspection_number FROM '[0-9]+$')::int) AS max_num
      FROM inspection_requests
      WHERE tenant_id = ${tenantId}::uuid
        AND inspection_number LIKE ${'INSP-' + year + '-%'}
    `;
    maxNum = rows[0]?.max_num ?? 0;
  } else if (prefix === 'NCR') {
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(ncr_number FROM '[0-9]+$')::int) AS max_num
      FROM non_conformance_reports
      WHERE tenant_id = ${tenantId}::uuid
        AND ncr_number LIKE ${'NCR-' + year + '-%'}
    `;
    maxNum = rows[0]?.max_num ?? 0;
  } else if (prefix === 'ACT') {
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(action_number FROM '[0-9]+$')::int) AS max_num
      FROM quality_safety_actions
      WHERE tenant_id = ${tenantId}::uuid
        AND action_number LIKE ${'ACT-' + year + '-%'}
    `;
    maxNum = rows[0]?.max_num ?? 0;
  } else if (prefix === 'OBS') {
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(observation_number FROM '[0-9]+$')::int) AS max_num
      FROM safety_observations
      WHERE tenant_id = ${tenantId}::uuid
        AND observation_number LIKE ${'OBS-' + year + '-%'}
    `;
    maxNum = rows[0]?.max_num ?? 0;
  } else if (prefix === 'INC') {
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(incident_number FROM '[0-9]+$')::int) AS max_num
      FROM safety_incidents
      WHERE tenant_id = ${tenantId}::uuid
        AND incident_number LIKE ${'INC-' + year + '-%'}
    `;
    maxNum = rows[0]?.max_num ?? 0;
  }

  const nextSeq = (maxNum || 0) + 1;
  const padded = String(nextSeq).padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}
