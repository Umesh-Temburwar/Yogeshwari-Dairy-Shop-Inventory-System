// ============================================================================
// SHARED DESIGN SYSTEM - BRAND FILTER BOTTOM SHEET
// File: src/components/Common/UI/BrandFilterSheet.tsx
// ============================================================================

import React, { useState, useMemo } from 'react';
import { X, Search, Check, Tag, RotateCcw } from 'lucide-react';

export interface BrandOption {
  name: string;
  count: number;
}

export interface BrandFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  brands: BrandOption[];
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
  onReset?: () => void;
  extraOptions?: React.ReactNode;
}

export const BrandFilterSheet: React.FC<BrandFilterSheetProps> = ({
  isOpen,
  onClose,
  brands,
  selectedBrand,
  onSelectBrand,
  onReset,
  extraOptions
}) => {
  const [search, setSearch] = useState('');

  const filteredBrands = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase().trim();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Sheet Content */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-[#131F1B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-[#24352F] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-200">
        
        {/* Handle for mobile pull-down feeling */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#24352F] flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#182722]/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#E7F0EC]">
                Filter by Brand
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                {brands.length - 1} brands available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedBrand !== 'All' && onReset && (
              <button
                type="button"
                onClick={() => {
                  onReset();
                  onClose();
                }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1E2E28] hover:bg-slate-200 dark:hover:bg-[#253831] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search inside sheet */}
        <div className="p-3 border-b border-slate-100 dark:border-[#1E2E28] shrink-0">
          <div className="relative h-10 w-full rounded-xl bg-slate-100 dark:bg-[#1A2A25] flex items-center px-3 gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands (e.g. Amul, Parle)..."
              className="w-full bg-transparent outline-none text-xs sm:text-sm text-slate-900 dark:text-[#E7F0EC] placeholder:text-slate-400"
              style={{ fontSize: '16px' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Extra options (e.g. Phone Scanner toggle or reset) */}
        {extraOptions && (
          <div className="px-3 py-2 bg-slate-50 dark:bg-[#16231E] border-b border-slate-100 dark:border-[#1E2E28] shrink-0">
            {extraOptions}
          </div>
        )}

        {/* Brands List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredBrands.map((b) => {
            const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();
            return (
              <button
                key={b.name}
                type="button"
                onClick={() => {
                  onSelectBrand(b.name);
                  onClose();
                }}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all active:scale-[0.99] cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-800'
                    : 'hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-800 dark:text-[#C4D4CE] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-xs sm:text-sm">
                    {b.name === 'All' ? 'All Brands (Show Everything)' : b.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E2E28] text-slate-600 dark:text-[#8FA69C] shrink-0">
                  {b.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-[#24352F] bg-slate-50 dark:bg-[#182722] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-[#20322B] hover:bg-slate-300 dark:hover:bg-[#273d34] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
