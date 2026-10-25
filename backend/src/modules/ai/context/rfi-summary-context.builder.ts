import type { PrismaClient } from '@prisma/client';

export interface RfiSummaryContextData {
  tenantId: string;
  rfiId: string;
  rfiNumber?: string;
  subject?: string;
  question?: string;
  status?: string;
  discipline?: string;
  priority?: string;
}

export class RfiSummaryContextBuilder {
  constructor(private readonly prisma: PrismaClient) {}

  public async build(tenantId: string, rfiId: string): Promise<RfiSummaryContextData> {
    const rfi = await this.prisma.requestForInformation.findFirst({
      where: { id: rfiId, tenantId },
    });

    if (!rfi) {
      return {
        tenantId,
        rfiId,
        subject: 'Unknown RFI',
        status: 'UNKNOWN',
      };
    }

    return {
      tenantId,
      rfiId,
      rfiNumber: rfi.rfiNumber,
      subject: rfi.subject,
      question: rfi.technicalQuery,
      status: rfi.status,
      discipline: rfi.discipline,
      priority: rfi.priority,
    };
  }
}
