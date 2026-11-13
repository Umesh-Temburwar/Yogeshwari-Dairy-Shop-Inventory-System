import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const heightClass = size === 'sm' ? 'h-7 text-xs' : 'h-8 sm:h-9 text-xs sm:text-sm';

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-line/40 select-none ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center gap-1.5 px-3 rounded-lg font-medium transition-all duration-150 ${heightClass} ${
              isActive
                ? 'bg-surface shadow-card text-ink font-semibold'
                : 'text-ink-2 hover:text-ink hover:bg-surface/50'
            }`}
          >
            {option.icon && <span className="text-current">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
