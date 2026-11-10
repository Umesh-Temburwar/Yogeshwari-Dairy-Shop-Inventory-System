import { describe, it, expect } from 'vitest';
import { computeExpiryStatus, allocateStockFefo, BatchStock } from '../utils/fefoLogic.js';

describe('Core Business Logic Tests', () => {
  describe('Business Rule 3: Expiry Status Dynamic Computation', () => {
    const today = new Date('2026-11-11T00:00:00.000Z');

    it('identifies expired batches (expiry < today)', () => {
      const res = computeExpiryStatus('2026-11-10', today);
      expect(res.status).toBe('EXPIRED');
      expect(res.daysToExpiry).toBe(-1);
    });

    it('identifies batches expiring today (expiry == today)', () => {
      const res = computeExpiryStatus('2026-11-11', today);
      expect(res.status).toBe('EXPIRING_TODAY');
      expect(res.daysToExpiry).toBe(0);
    });

    it('identifies batches expiring tomorrow (expiry == today + 1)', () => {
      const res = computeExpiryStatus('2026-11-12', today);
      expect(res.status).toBe('EXPIRING_TOMORROW');
      expect(res.daysToExpiry).toBe(1);
    });

    it('identifies batches expiring in 3 days', () => {
      const res = computeExpiryStatus('2026-11-14', today);
      expect(res.status).toBe('EXPIRING_IN_3_DAYS');
      expect(res.daysToExpiry).toBe(3);
    });

    it('identifies fresh batches (expiry > 3 days)', () => {
      const res = computeExpiryStatus('2026-11-20', today);
      expect(res.status).toBe('FRESH');
      expect(res.daysToExpiry).toBe(9);
    });
  });

  describe('Business Rule 2 & 4: FEFO Allocation & Billing Block', () => {
    const today = new Date('2026-11-11T00:00:00.000Z');

    const sampleBatches: BatchStock[] = [
      {
        id: 'batch-expired',
        batch_no: 'EXP-01',
        expiry_date: '2026-11-09', // Expired
        qty_remaining: 10,
        purchase_price: 24,
      },
      {
        id: 'batch-tomorrow',
        batch_no: 'TOM-01',
        expiry_date: '2026-11-12', // Expiring tomorrow
        qty_remaining: 15,
        purchase_price: 24,
      },
      {
        id: 'batch-3days',
        batch_no: '3DAY-01',
        expiry_date: '2026-11-14', // Expiring in 3 days
        qty_remaining: 20,
        purchase_price: 24,
      },
      {
        id: 'batch-fresh',
        batch_no: 'FRSH-01',
        expiry_date: '2026-11-25', // Fresh
        qty_remaining: 50,
        purchase_price: 24,
      },
      {
        id: 'batch-zero-stock',
        batch_no: 'ZERO-01',
        expiry_date: '2026-11-13',
        qty_remaining: 0, // Zero stock
        purchase_price: 24,
      },
    ];

    it('blocks expired batches and zero-stock batches from being allocated', () => {
      const result = allocateStockFefo(sampleBatches, 10, today);

      // Should allocate strictly from the earliest valid batch (batch-tomorrow)
      expect(result.isFullyAllocated).toBe(true);
      expect(result.allocations.length).toBe(1);
      expect(result.allocations[0].batch_id).toBe('batch-tomorrow');
      expect(result.allocations[0].qty).toBe(10);
      // Expired batch-expired should NEVER appear
      expect(result.allocations.some((a) => a.batch_id === 'batch-expired')).toBe(false);
      expect(result.allocations.some((a) => a.batch_id === 'batch-zero-stock')).toBe(false);
    });

    it('automatically splits sale across batches according to FEFO order', () => {
      // Request 25 units: needs 15 from batch-tomorrow and 10 from batch-3days
      const result = allocateStockFefo(sampleBatches, 25, today);

      expect(result.isFullyAllocated).toBe(true);
      expect(result.allocatedTotal).toBe(25);
      expect(result.allocations.length).toBe(2);

      // First batch: 15 units from batch-tomorrow (expiring 2026-11-12)
      expect(result.allocations[0].batch_id).toBe('batch-tomorrow');
      expect(result.allocations[0].qty).toBe(15);

      // Second batch: 10 units from batch-3days (expiring 2026-11-14)
      expect(result.allocations[1].batch_id).toBe('batch-3days');
      expect(result.allocations[1].qty).toBe(10);
    });

    it('handles stock insufficiency when required quantity exceeds valid stock', () => {
      // Total valid stock is 15 + 20 + 50 = 85 (excluding expired 10 and zero stock)
      const result = allocateStockFefo(sampleBatches, 100, today);

      expect(result.isFullyAllocated).toBe(false);
      expect(result.allocatedTotal).toBe(85);
      expect(result.remainingRequired).toBe(15);
    });
  });
});

