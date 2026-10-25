import { Prisma } from '@prisma/client';

export interface AmountBracket {
  minAmount: number | Prisma.Decimal | null | undefined;
  maxAmount: number | Prisma.Decimal | null | undefined;
}

/**
 * Validates whether two amount brackets overlap.
 * Semantics:
 * minAmount = inclusive lower bound (null = 0)
 * maxAmount = inclusive upper bound (null = infinity)
 */
export function doBracketsOverlap(b1: AmountBracket, b2: AmountBracket): boolean {
  const min1 = b1.minAmount != null ? Number(b1.minAmount) : 0;
  const max1 = b1.maxAmount != null ? Number(b1.maxAmount) : Number.POSITIVE_INFINITY;

  const min2 = b2.minAmount != null ? Number(b2.minAmount) : 0;
  const max2 = b2.maxAmount != null ? Number(b2.maxAmount) : Number.POSITIVE_INFINITY;

  if (min1 > max1 || min2 > max2) {
    throw new Error('Invalid bracket: minAmount cannot be greater than maxAmount');
  }

  // Two closed/semi-closed intervals [min1, max1] and [min2, max2] overlap if:
  // min1 <= max2 && min2 <= max1
  return min1 <= max2 && min2 <= max1;
}

/**
 * Checks if a given monetary amount matches an amount bracket.
 */
export function matchesBracket(amount: number | Prisma.Decimal | null | undefined, bracket: AmountBracket): boolean {
  const amt = amount != null ? Number(amount) : 0;
  const min = bracket.minAmount != null ? Number(bracket.minAmount) : 0;
  const max = bracket.maxAmount != null ? Number(bracket.maxAmount) : Number.POSITIVE_INFINITY;

  return amt >= min && amt <= max;
}
