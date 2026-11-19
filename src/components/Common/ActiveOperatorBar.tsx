import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export interface ActiveOperatorBarProps {
  locationName?: string;
  pulseColor?: 'emerald' | 'amber' | 'rose' | 'blue';
  rightAction?: React.ReactNode;
  className?: string;
}

/**
 * Standardized POS-Style Active Counter & Operator Badge Bar
 * Applied across POS, Stock Inventory, Sales, Expiry, Reorder, Purchases, and Udhar Khata
 * for a consistent dairy ERP identity.
 */
export const ActiveOperatorBar: React.FC<ActiveOperatorBarProps> = ({
  locationName,
  pulseColor = 'emerald',
  rightAction,
  className = ''
}) => {
  const { user, role, adminSlot, ownerAvatarUrl } = useAuth();
  const { language } = useLanguage();

  const activeOperator = useMemo(() => {
    const email = (user?.email || '').toLowerCase().trim();

    if (email === 'nilusakhare2003@gmail.com' || role === 'Admin' || adminSlot === 1) {
      return {
        role: 'Admin' as const,
        slot: 1 as const,
        email: 'nilusakhare2003@gmail.com',
        name: 'Nilesh Sakhare',
        counter: 'Counter 1 - Main Billing'
      };
    }

    return {
      role: 'Owner' as const,
      slot: null,
      email: 'yogeshwaridairy9896@gmail.com',
      name: 'Nikhil Sakhare',
      counter: 'Owner Master Counter'
    };
  }, [role, adminSlot, user?.email]);

  const displayLocation = locationName || activeOperator.counter;

  const pulseColorClasses = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500'
  }[pulseColor];

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/90 dark:border-[#24352F] text-xs shadow-2xs transition-colors ${className}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`w-2 h-2 rounded-full ${pulseColorClasses} animate-pulse shrink-0`} />
        <span className="font-semibold text-slate-600 dark:text-[#8FA69C] hidden sm:inline">
          Location:
        </span>
        <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-[11px] truncate">
          📍 {displayLocation}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-semibold text-slate-600 dark:text-[#8FA69C] hidden sm:inline">
          Operator:
        </span>
        <span
          className={`inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-lg text-[11px] ${
            activeOperator.slot === 1
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
              : activeOperator.slot === 2
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40'
              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
          }`}
        >
          {activeOperator.role === 'Owner' || activeOperator.email === 'yogeshwaridairy9896@gmail.com' ? (
            <img
              src={ownerAvatarUrl}
              alt=""
              className="w-4 h-4 rounded-full object-cover border border-amber-400 shrink-0"
            />
          ) : (
            <span>👤</span>
          )}
          <span>{activeOperator.name}</span>
          <span className="text-[10px] font-normal opacity-80 hidden sm:inline">
            ({activeOperator.email})
          </span>
        </span>
        {rightAction}
      </div>
    </div>
  );
};
