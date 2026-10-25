export const STOCK_MOVEMENT_TYPES = [
  'RECEIPT',
  'ISSUE',
  'RETURN',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const OUTBOUND_MOVEMENT_TYPES: readonly StockMovementType[] = [
  'ISSUE',
  'TRANSFER_OUT',
  'ADJUSTMENT_OUT',
] as const;

export const INBOUND_MOVEMENT_TYPES: readonly StockMovementType[] = [
  'RECEIPT',
  'RETURN',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
] as const;

export function isOutboundMovementType(type: string): boolean {
  return OUTBOUND_MOVEMENT_TYPES.includes(type as StockMovementType);
}

export function isInboundMovementType(type: string): boolean {
  return INBOUND_MOVEMENT_TYPES.includes(type as StockMovementType);
}
