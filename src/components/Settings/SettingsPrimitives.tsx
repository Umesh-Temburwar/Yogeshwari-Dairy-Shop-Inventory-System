import React from 'react';
import { ChevronRight } from 'lucide-react';

export type SettingRowTone = 'emerald' | 'amber' | 'red';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => {
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
        {title}
      </h2>
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-[#24352F]">
        {children}
      </div>
    </section>
  );
};

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={`relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
        checked
          ? 'bg-emerald-600 dark:bg-emerald-500'
          : 'bg-slate-300 dark:bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
};

interface SettingRowProps {
  icon: React.ReactNode;
  tone?: SettingRowTone;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
  valueText?: string;
  badgeCount?: number;
}

const TONE_CLASSES: Record<SettingRowTone, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  red: 'bg-red-50 dark:bg-rose-950/50 text-red-600 dark:text-rose-400'
};

export const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  tone = 'emerald',
  title,
  subtitle,
  onClick,
  disabled = false,
  rightContent,
  showChevron = false,
  valueText,
  badgeCount
}) => {
  const isInteractive = Boolean(onClick) && !disabled;

  const content = (
    <>
      <div
        className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${TONE_CLASSES[tone]}`}
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="text-[15px] font-semibold text-slate-900 dark:text-[#E7F0EC] leading-snug truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-slate-500 dark:text-[#8FA69C] leading-snug truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {typeof badgeCount === 'number' && badgeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 text-[11px] font-bold tabular-nums">
            {badgeCount}
          </span>
        )}
        {valueText && (
          <span className="text-xs font-medium text-slate-500 dark:text-[#8FA69C]">
            {valueText}
          </span>
        )}
        {rightContent}
        {showChevron && (
          <ChevronRight
            className="w-4 h-4 text-slate-400 dark:text-[#6B847A] shrink-0"
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );

  if (onClick && !rightContent) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`w-full min-h-[56px] px-4 py-2.5 flex items-center gap-3 transition-colors ${
          isInteractive
            ? 'hover:bg-slate-50/70 dark:hover:bg-[#182621] active:bg-slate-100/80 dark:active:bg-[#1A2A25] cursor-pointer'
            : 'opacity-60 cursor-not-allowed'
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      className={`w-full min-h-[56px] px-4 py-2.5 flex items-center gap-3 transition-colors ${
        isInteractive
          ? 'hover:bg-slate-50/70 dark:hover:bg-[#182621] active:bg-slate-100/80 dark:active:bg-[#1A2A25] cursor-pointer'
          : ''
      }`}
    >
      {content}
    </div>
  );
};

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel
}: SegmentedControlProps<T>): React.ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid w-full gap-1 rounded-xl bg-slate-100 dark:bg-[#1A2A25] p-1 border border-slate-200/70 dark:border-[#24352F]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer truncate ${
              isActive
                ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-slate-200/80 dark:ring-[#2A3F38]'
                : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
