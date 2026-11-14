/**
 * YOGESHWARI DAIRY SHOP INVENTORY & ERP
 * Unified Date & Time Utilities for Bills, Invoices, and Ledgers.
 * 
 * Accurately parses and formats customer bill creation timestamps (created_at)
 * into localized Indian date (DD/MM/YYYY) and 12-hour time (hh:mm AM/PM) formats.
 */

export interface FormattedSaleTime {
  dateFormatted: string; // e.g. "14/11/2026"
  timeFormatted: string; // e.g. "04:36 PM"
  dateTimeFormatted: string; // e.g. "14/11/2026, 04:36 PM"
  rawDate: Date;
}

/**
 * Robustly parses and formats a sale's creation timestamp and/or sale date.
 * If createdAt is absent, falls back gracefully to saleDate or current date.
 */
export const formatSaleDateTime = (
  createdAt?: string | null,
  saleDate?: string | null
): FormattedSaleTime => {
  let targetDate: Date;

  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    } else if (saleDate) {
      targetDate = parseDateString(saleDate);
    } else {
      targetDate = new Date();
    }
  } else if (saleDate) {
    targetDate = parseDateString(saleDate);
  } else {
    targetDate = new Date();
  }

  const dateFormatted = targetDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const timeFormatted = createdAt
    ? targetDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toUpperCase()
    : '';

  const dateTimeFormatted = timeFormatted
    ? `${dateFormatted}, ${timeFormatted}`
    : dateFormatted;

  return {
    dateFormatted,
    timeFormatted,
    dateTimeFormatted,
    rawDate: targetDate
  };
};

/**
 * Helper to safely parse YYYY-MM-DD or DD/MM/YYYY strings into a Date object
 */
const parseDateString = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  // Check if standard YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  const slashParts = dateStr.split('/');
  if (slashParts.length === 3 && slashParts[2].length === 4) {
    return new Date(Number(slashParts[2]), Number(slashParts[1]) - 1, Number(slashParts[0]));
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Format sale date only (e.g. "14/11/2026")
 */
export const formatSaleDate = (
  createdAt?: string | null,
  saleDate?: string | null
): string => {
  return formatSaleDateTime(createdAt, saleDate).dateFormatted;
};

/**
 * Format sale time only (e.g. "04:36 PM")
 */
export const formatSaleTime = (
  createdAt?: string | null
): string => {
  return formatSaleDateTime(createdAt).timeFormatted;
};
