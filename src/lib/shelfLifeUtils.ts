import { ProductCategory, ExpiryStatus } from '../types';
export type { ExpiryStatus };
import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns';

/**
 * Returns the exact recommended shelf life (in days) based on the dairy product variety.
 */
export const getShelfLifeDays = (category: ProductCategory, productName: string = ''): number => {
  const lower = productName.toLowerCase();

  // 1. Raw / Khula Milk (Most perishable, 1 day)
  if (lower.includes('bhains') || lower.includes('buffalo milk') || (lower.includes('cow milk') && !lower.includes('ghee')) || lower.includes('gai ka doodh')) {
    return 1;
  }
  // 2. Pasteurized Milk Pouches (2 days)
  if (lower.includes('toned milk') || lower.includes('pouch') || lower.includes('theli')) {
    return 2;
  }
  // 3. Fresh Paneer (3 days in chiller)
  if (lower.includes('paneer') || lower.includes('chhana')) {
    return 3;
  }
  // 4. White Butter (Safed Makkhan, 7 days)
  if (lower.includes('makkhan') || lower.includes('butter') || lower.includes('loni')) {
    return 7;
  }
  // 5. Khula Dahi / Curd (3-4 days)
  if (lower.includes('khula curd') || lower.includes('desi dahi')) {
    return 4;
  }
  // 6. Sealed Dahi Cup / Pack (7 days)
  if (lower.includes('dahi cup')) {
    return 7;
  }
  // 7. Chaas / Lassi (4 days)
  if (lower.includes('chaas') || lower.includes('buttermilk') || lower.includes('lassi')) {
    return 4;
  }
  // 8. Khoya / Mawa (4 days)
  if (lower.includes('khoya') || lower.includes('mawa')) {
    return 4;
  }
  // 9. Bengali / Milk Sweets (Gulab Jamun, Rasgulla, 5 days)
  if (lower.includes('gulab jamun') || lower.includes('rasgulla') || lower.includes('peda')) {
    return 5;
  }
  // 10. Dry Sweets / Kaju Katli (20 days)
  if (lower.includes('kaju katli') || lower.includes('barfi')) {
    return 20;
  }
  // 11. Pure Ghee (180 days / 6 months)
  if (lower.includes('ghee') || lower.includes('toop')) {
    return 180;
  }
  // 12. Eggs (21 days)
  if (lower.includes('egg') || lower.includes('ande') || lower.includes('andi')) {
    return 21;
  }

  // Category fallback
  switch (category) {
    case 'Milk':
      return 2;
    case 'Curd & Chaas':
      return 4;
    case 'Paneer & Butter':
      return 3;
    case 'Ghee':
      return 180;
    case 'Sweets/Mithai':
      return 5;
    case 'Bakery & Extras':
      return 14;
    default:
      return 3;
  }
};

/**
 * Calculates suggested expiry date (YYYY-MM-DD) based on manufacturing date and shelf life days.
 */
export const getSuggestedExpiryDate = (mfgDateStr?: string, days: number = 2): string => {
  try {
    const baseDate = mfgDateStr ? parseISO(mfgDateStr) : new Date();
    return format(addDays(baseDate, days), 'yyyy-MM-dd');
  } catch {
    return format(addDays(new Date(), days), 'yyyy-MM-dd');
  }
};

/**
 * Generates an auto-increment or clean unique batch number based on product & date.
 */
export const generateBatchNumber = (productName: string = '', dateStr?: string): string => {
  const d = dateStr ? dateStr.replace(/-/g, '').slice(2) : format(new Date(), 'yyMMdd');
  let prefix = 'BAT';
  const lower = productName.toLowerCase();

  if (lower.includes('buffalo')) prefix = 'BUF';
  else if (lower.includes('cow')) prefix = 'COW';
  else if (lower.includes('toned')) prefix = 'TON';
  else if (lower.includes('paneer')) prefix = 'PAN';
  else if (lower.includes('dahi')) prefix = 'DAH';
  else if (lower.includes('chaas')) prefix = 'CHS';
  else if (lower.includes('lassi')) prefix = 'LAS';
  else if (lower.includes('makkhan')) prefix = 'MAK';
  else if (lower.includes('khoya') || lower.includes('mawa')) prefix = 'KHO';
  else if (lower.includes('kaju')) prefix = 'KAT';
  else if (lower.includes('ghee')) prefix = 'GHE';
  else if (lower.includes('egg')) prefix = 'EGG';

  const randomSuffix = Math.floor(10 + Math.random() * 90);
  return `${prefix}-${d}-${randomSuffix}`;
};

/**
 * Computes dynamic expiry status from expiry_date (never stored statically).
 */
export const computeExpiryStatus = (
  expiryDateStr: string,
  referenceDate: Date = new Date()
): { status: ExpiryStatus; daysToExpiry: number } => {
  try {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);

    const expDate = parseISO(expiryDateStr);
    expDate.setHours(0, 0, 0, 0);

    const daysToExpiry = differenceInCalendarDays(expDate, today);

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
  } catch {
    return { status: 'FRESH', daysToExpiry: 99 };
  }
};

/**
 * Returns localized styling and label for an ExpiryStatus.
 */
export const getExpiryBadgeInfo = (
  status: ExpiryStatus,
  daysToExpiry: number,
  lang: 'mr' | 'hi' | 'en' = 'mr'
) => {
  switch (status) {
    case 'EXPIRED':
      return {
        label: `Expired (${Math.abs(daysToExpiry)}d ago)`,
        shortLabel: 'Expired',
        badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 font-black',
        iconEmoji: '🔴',
        isSellable: false
      };
    case 'EXPIRING_TODAY':
      return {
        label: 'Expiring Today',
        shortLabel: 'Today',
        badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-extrabold animate-pulse',
        iconEmoji: '🟠',
        isSellable: true
      };
    case 'EXPIRING_TOMORROW':
      return {
        label: 'Expiring Tomorrow',
        shortLabel: 'Tomorrow',
        badgeClass: 'bg-yellow-100 dark:bg-yellow-950/70 text-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800 font-bold',
        iconEmoji: '🟡',
        isSellable: true
      };
    case 'EXPIRING_IN_3_DAYS':
      return {
        label: `Expiring in ${daysToExpiry} days`,
        shortLabel: `${daysToExpiry}d left`,
        badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold',
        iconEmoji: '🟢',
        isSellable: true
      };
    case 'FRESH':
    default:
      return {
        label: `Fresh (${daysToExpiry}d validity)`,
        shortLabel: 'Fresh',
        badgeClass: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/40 font-medium',
        iconEmoji: '🔵',
        isSellable: true
      };
  }
};

/**
 * Returns a friendly explanatory note about this variety's shelf-life.
 */
export const getShelfLifeNote = (
  category: ProductCategory,
  productName: string = '',
  lang: 'mr' | 'hi' | 'en' = 'mr'
): string => {
  const days = getShelfLifeDays(category, productName);
  if (days === 1) {
    return 'Fresh Raw Milk (24h shelf life - suggested expiry: tomorrow)';
  }
  if (days <= 3) {
    return `Fresh Dairy Product (${days} days shelf life)`;
  }
  if (days >= 180) {
    return `Pure Desi Ghee (Long shelf life: 6 months)`;
  }
  return `Standard shelf life: ${days} days`;
};

