// ============================================================================
// SHARED DESIGN SYSTEM - SEARCH BAR
// File: src/components/Common/UI/SearchBar.tsx
// ============================================================================

import React from 'react';
import { Search, X, ScanBarcode } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  onScanBarcode?: () => void;
  barcodeActive?: boolean;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search products or scan barcode...',
  onScanBarcode,
  barcodeActive = false,
  className = '',
  autoFocus = false,
  disabled = false
}) => {
  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div
      className={`relative h-11 w-full rounded-xl bg-slate-100 dark:bg-[#16231E] border border-transparent focus-within:border-emerald-500/60 focus-within:bg-white dark:focus-within:bg-[#131F1B] focus-within:shadow-xs transition-all duration-150 flex items-center px-3 gap-2.5 ${className}`}
    >
      <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />

      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full h-full bg-transparent border-none outline-none text-slate-900 dark:text-[#E7F0EC] placeholder:text-slate-400 text-[16px] sm:text-sm font-normal"
        style={{ fontSize: '16px' }} // Explicitly enforce >= 16px to prevent iOS mobile safari auto-zoom
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shrink-0 cursor-pointer active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {onScanBarcode && (
        <button
          type="button"
          onClick={onScanBarcode}
          aria-label="Scan barcode with camera"
          title="Scan barcode with camera"
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 ${
            barcodeActive
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-[#20322B]'
          }`}
        >
          <ScanBarcode className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
