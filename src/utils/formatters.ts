/**
 * YOGESHWARI DAIRY ERP - NUMBER & CURRENCY FORMATTERS
 * Standardized Indian numbering system (Lakh/Crore) and currency helpers.
 */

/**
 * Formats a number into Indian Rupee currency string: e.g. ₹1,23,456 or ₹1,23,456.50
 */
export function formatCurrency(amount: number, showDecimals = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }

  const fractionDigits = showDecimals ? (amount % 1 === 0 ? 0 : 2) : 0;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toFixed(fractionDigits)}`;
  }
}

/**
 * Formats large metrics compactly: e.g. 1.2K, 3.5L (Lakh), 1.2Cr (Crore)
 */
export function formatCompactNumber(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  
  const abs = Math.abs(num);
  if (abs >= 10000000) {
    return `${(num / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    return `${(num / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Formats inventory quantity with its unit cleanly: e.g. "5 Litre", "2.5 Kg"
 */
export function formatQuantity(qty: number, unit?: string): string {
  if (isNaN(qty) || qty === null || qty === undefined) return `0 ${unit || ''}`.trim();
  const cleanQty = qty % 1 === 0 ? qty.toString() : qty.toFixed(2);
  return unit ? `${cleanQty} ${unit}` : cleanQty;
}

/**
 * Formats percentages: e.g. 12.5%
 */
export function formatPercentage(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0%';
  return `${val % 1 === 0 ? val : val.toFixed(1)}%`;
}
