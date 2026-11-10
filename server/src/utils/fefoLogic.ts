export interface BatchStock {
  id: string;
  batch_no: string;
  expiry_date: string; // ISO date string YYYY-MM-DD
  qty_remaining: number;
  purchase_price: number;
}

export type ExpiryStatus =
  | 'EXPIRED'
  | 'EXPIRING_TODAY'
  | 'EXPIRING_TOMORROW'
  | 'EXPIRING_IN_3_DAYS'
  | 'FRESH';

/**
 * Business Rule 3: EXPIRY STATUS must be computed from expiry_date, not stored:
 * Expired, Expiring Today, Expiring Tomorrow, Expiring in 3 days, Fresh.
 */
export const computeExpiryStatus = (expiryDateStr: string, referenceDate: Date = new Date()): {
  status: ExpiryStatus;
  daysToExpiry: number;
} => {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);

  const diffMs = exp.getTime() - ref.getTime();
  const daysToExpiry = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysToExpiry < 0) {
    return { status: 'EXPIRED', daysToExpiry };
  }
  if (daysToExpiry === 0) {
    return { status: 'EXPIRING_TODAY', daysToExpiry };
  }
  if (daysToExpiry === 1) {
    return { status: 'EXPIRING_TOMORROW', daysToExpiry };
  }
  if (daysToExpiry <= 3) {
    return { status: 'EXPIRING_IN_3_DAYS', daysToExpiry };
  }
  return { status: 'FRESH', daysToExpiry };
};

export interface BatchAllocation {
  batch_id: string;
  batch_no: string;
  qty: number;
  purchase_price: number;
  expiry_date: string;
}

export interface FefoAllocationResult {
  allocations: BatchAllocation[];
  allocatedTotal: number;
  remainingRequired: number;
  isFullyAllocated: boolean;
}

/**
 * Business Rules 2 & 4:
 * - FEFO: deduct from batch with earliest expiry first
 * - Splits sale across batches if needed
 * - BILLING BLOCK: Expired batches and zero-stock batches can NEVER be used for sale
 */
export const allocateStockFefo = (
  batches: BatchStock[],
  requiredQty: number,
  referenceDate: Date = new Date()
): FefoAllocationResult => {
  if (requiredQty <= 0) {
    return {
      allocations: [],
      allocatedTotal: 0,
      remainingRequired: 0,
      isFullyAllocated: true,
    };
  }

  // 1. Filter out expired batches and zero-stock batches (Business Rule 4)
  const validBatches = batches.filter((b) => {
    if (b.qty_remaining <= 0) return false;
    const { status } = computeExpiryStatus(b.expiry_date, referenceDate);
    return status !== 'EXPIRED'; // Expired batches blocked from sale
  });

  // 2. Sort valid batches strictly by earliest expiry date first (FEFO)
  const sortedBatches = [...validBatches].sort((a, b) => {
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
  });

  let remaining = requiredQty;
  const allocations: BatchAllocation[] = [];

  for (const batch of sortedBatches) {
    if (remaining <= 0) break;

    const deductQty = Math.min(batch.qty_remaining, remaining);
    if (deductQty > 0) {
      allocations.push({
        batch_id: batch.id,
        batch_no: batch.batch_no,
        qty: deductQty,
        purchase_price: batch.purchase_price,
        expiry_date: batch.expiry_date,
      });
      remaining -= deductQty;
    }
  }

  const allocatedTotal = requiredQty - remaining;

  return {
    allocations,
    allocatedTotal,
    remainingRequired: remaining,
    isFullyAllocated: remaining === 0,
  };
};

