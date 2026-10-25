import type { PrismaClient } from '@prisma/client';

type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export type DocumentSequenceType = 'DOC' | 'DWG' | 'TR' | 'RFI';

/**
 * Atomically generates monotonic, collision-free document control numbers
 * using PostgreSQL transaction-level advisory locks.
 */
export async function getNextDocumentSequence(
  tenantId: string,
  projectId: string,
  projectCode: string,
  type: DocumentSequenceType,
  tx: PrismaTransactionClient,
  options?: { discipline?: string }
): Promise<string> {
  const cleanProjCode = projectCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const year = new Date().getFullYear();

  if (type === 'DOC') {
    const lockKey = `${tenantId}:${projectId}:DOC:${year}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const prefixMatch = `DOC-${cleanProjCode}-${year}-%`;
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(document_number FROM '[0-9]+$')::int) AS max_num
      FROM engineering_documents
      WHERE tenant_id = ${tenantId}::uuid
        AND project_id = ${projectId}::uuid
        AND document_number LIKE ${prefixMatch}
    `;
    const nextSeq = (rows[0]?.max_num ?? 0) + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `DOC-${cleanProjCode}-${year}-${padded}`;
  }

  if (type === 'DWG') {
    const disciplineCode = (options?.discipline || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    const lockKey = `${tenantId}:${projectId}:DWG:${disciplineCode}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const prefixMatch = `DWG-${cleanProjCode}-${disciplineCode}-%`;
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(COALESCE(drawing_number, document_number) FROM '[0-9]+$')::int) AS max_num
      FROM engineering_documents
      WHERE tenant_id = ${tenantId}::uuid
        AND project_id = ${projectId}::uuid
        AND (
          drawing_number LIKE ${prefixMatch}
          OR document_number LIKE ${prefixMatch}
        )
    `;
    const nextSeq = (rows[0]?.max_num ?? 0) + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `DWG-${cleanProjCode}-${disciplineCode}-${padded}`;
  }

  if (type === 'TR') {
    const lockKey = `${tenantId}:${projectId}:TR:${year}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const prefixMatch = `TR-${cleanProjCode}-${year}-%`;
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(transmittal_number FROM '[0-9]+$')::int) AS max_num
      FROM document_transmittals
      WHERE tenant_id = ${tenantId}::uuid
        AND project_id = ${projectId}::uuid
        AND transmittal_number LIKE ${prefixMatch}
    `;
    const nextSeq = (rows[0]?.max_num ?? 0) + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `TR-${cleanProjCode}-${year}-${padded}`;
  }

  if (type === 'RFI') {
    const lockKey = `${tenantId}:${projectId}:RFI:${year}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const prefixMatch = `RFI-${cleanProjCode}-${year}-%`;
    const rows = await tx.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX(SUBSTRING(rfi_number FROM '[0-9]+$')::int) AS max_num
      FROM requests_for_information
      WHERE tenant_id = ${tenantId}::uuid
        AND project_id = ${projectId}::uuid
        AND rfi_number LIKE ${prefixMatch}
    `;
    const nextSeq = (rows[0]?.max_num ?? 0) + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `RFI-${cleanProjCode}-${year}-${padded}`;
  }

  throw new Error(`Unsupported document sequence type: ${type}`);
}
