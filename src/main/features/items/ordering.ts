const ORDER_STEP = 1000

export function orderForAppend(orders: number[]): number {
  if (orders.length === 0) return ORDER_STEP
  return Math.max(...orders) + ORDER_STEP
}

export function orderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return ORDER_STEP
  if (before === null) return (after as number) - ORDER_STEP
  if (after === null) return before + ORDER_STEP
  return (before + after) / 2
}

export function needsNormalisation(before: number | null, after: number | null): boolean {
  if (before === null || after === null) return false
  return Math.abs(after - before) < 1e-6
}

export function normalise<T extends { order: number }>(items: T[]): T[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: (index + 1) * ORDER_STEP }))
}
