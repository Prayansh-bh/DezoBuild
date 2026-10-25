import { PrismaClient } from '@prisma/client';
import { FinanceSequencePrefix } from '../constants/finance.constants.js';

export class FinanceSequenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Atomically allocates the next monotonic sequence number for a given tenant, prefix, and year.
   * Format returned: PREFIX-YYYY-000001
   */
  async getNextSequence(
    tenantId: string,
    prefix: FinanceSequencePrefix,
    tx?: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();

    const sequence = await client.financeSequence.upsert({
      where: {
        tenantId_prefix_year: {
          tenantId,
          prefix,
          year,
        },
      },
      update: {
        lastNumber: {
          increment: 1,
        },
      },
      create: {
        tenantId,
        prefix,
        year,
        lastNumber: 1,
      },
    });

    const paddedNumber = String(sequence.lastNumber).padStart(6, '0');
    return `${prefix}-${year}-${paddedNumber}`;
  }
}
