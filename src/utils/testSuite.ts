/**
 * YOGESHWARI DAIRY ERP - CLIENT-SIDE TEST VERIFICATION SUITE
 * Unit tests verifying critical date, currency, and shelf-life calculations.
 */

import { formatSaleDateTime, formatTimeAgo } from '../lib/dateUtils';
import { formatCurrency, formatQuantity, formatCompactNumber } from './formatters';
import { computeExpiryStatus } from '../lib/shelfLifeUtils';

export interface TestResult {
  name: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
}

export function runERPUnitTests(): { total: number; passed: number; failed: number; results: TestResult[] } {
  const results: TestResult[] = [];

  const assert = (name: string, condition: boolean, actual?: any, expected?: any) => {
    results.push({
      name,
      passed: condition,
      actual,
      expected,
      error: condition ? undefined : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    });
  };

  try {
    // Test 1: formatCurrency handles integer
    const c1 = formatCurrency(150, false);
    assert('formatCurrency integer', c1.includes('150'), c1, '₹150');

    // Test 2: formatCurrency handles decimals
    const c2 = formatCurrency(45.5, true);
    assert('formatCurrency with decimals', c2.includes('45.5'), c2, '₹45.50');

    // Test 3: formatQuantity with unit
    const q1 = formatQuantity(5, 'Litre');
    assert('formatQuantity Litre', q1 === '5 Litre', q1, '5 Litre');

    // Test 4: formatCompactNumber
    const cn1 = formatCompactNumber(150000);
    assert('formatCompactNumber Lakh', cn1 === '1.5L', cn1, '1.5L');

    // Test 5: formatTimeAgo just now
    const ta1 = formatTimeAgo(new Date().toISOString(), 'mr');
    assert('formatTimeAgo Just Now', ta1 === 'आत्ताच', ta1, 'आत्ताच');

    // Test 6: formatSaleDateTime fallback
    const dt1 = formatSaleDateTime('2026-11-15T10:30:00Z');
    assert('formatSaleDateTime format', !!dt1.dateFormatted, dt1.dateFormatted, 'DD/MM/YYYY');

    // Test 7: computeExpiryStatus expired
    const expPast = computeExpiryStatus('2020-01-01');
    assert('computeExpiryStatus past is EXPIRED', expPast.status === 'EXPIRED', expPast.status, 'EXPIRED');

    // Test 8: computeExpiryStatus future
    const expFuture = computeExpiryStatus('2099-01-01');
    assert('computeExpiryStatus future is FRESH_SAFE', expFuture.status === 'FRESH_SAFE', expFuture.status, 'FRESH_SAFE');
  } catch (err: any) {
    results.push({
      name: 'Test execution exception',
      passed: false,
      error: err.message
    });
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results
  };
}
