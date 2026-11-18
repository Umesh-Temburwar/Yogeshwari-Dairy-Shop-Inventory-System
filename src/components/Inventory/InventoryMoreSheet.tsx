import React, { useEffect } from 'react';
import {
  X,
  LayoutGrid,
  List,
  Table2,
  Download,
  Printer,
  Eye,
  FileSpreadsheet,
  Image as ImageIcon,
  Calendar,
  Tag
} from 'lucide-react';
import { ExpiryStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export type InventoryViewMode = 'cards' | 'list' | 'table';

interface CategoryOption {
  id: string;
  label: string;
}

interface ExpiryOption {
  id: ExpiryStatus | 'ALL';
  label: string;
  count?: number;
}

interface InventoryMoreSheetProps {
  isOpen: boolean;
  viewMode: InventoryViewMode;
  selectedCategory: string;
  selectedExpiryFilter: ExpiryStatus | 'ALL';
  categories: CategoryOption[];
  expiryOptions: ExpiryOption[];
  onClose: () => void;
  onChangeViewMode: (mode: InventoryViewMode) => void;
  onChangeCategory: (category: string) => void;
  onChangeExpiryFilter: (status: ExpiryStatus | 'ALL') => void;
  onDownloadPDF: () => void;
  onViewPDF: () => void;
  onPrintPDF: () => void;
  onExportCSV: () => void;
  onOpenPhotoDatabase: () => void;
}

export const InventoryMoreSheet: React.FC<InventoryMoreSheetProps> = ({
  isOpen,
  viewMode,
  selectedCategory,
  selectedExpiryFilter,
  categories,
  expiryOptions,
  onClose,
  onChangeViewMode,
  onChangeCategory,
  onChangeExpiryFilter,
  onDownloadPDF,
  onViewPDF,
  onPrintPDF,
  onExportCSV,
  onOpenPhotoDatabase
}) => {
  const { tr } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[105] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 motion-reduce:animate-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="More inventory options"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border-t sm:border border-slate-200 dark:border-[#24352F] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 ease-out motion-reduce:animate-none pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-[#2C4139]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#24352F] shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {tr('View, Filters & Exports', 'व्यू, फ़िल्टर और रिपोर्ट', 'व्यू, फिल्टर आणि अहवाल')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('Close options', 'विकल्प बंद करें', 'पर्याय बंद करा')}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto overscroll-contain">
          {/* 1. Layout View Mode */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
              {tr('Layout View', 'लेआउट व्यू', 'लेआउट प्रकार')}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'cards', label: tr('Cards', 'कार्ड्स', 'कार्ड्स'), icon: LayoutGrid },
                  { id: 'list', label: tr('List', 'लिस्ट', 'यादी'), icon: List },
                  { id: 'table', label: tr('Table', 'टेबल', 'तक्ता'), icon: Table2 }
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = viewMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChangeViewMode(item.id);
                      onClose();
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-[#1A2A25] text-slate-700 dark:text-[#E7F0EC] border-slate-200 dark:border-[#24352F]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Category Filter */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C] inline-flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              <span>{tr('Category', 'श्रेणी', 'प्रकार')}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onChangeCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] border-slate-200 dark:border-[#24352F]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Batch Expiry Filter */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C] inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{tr('Batch Expiry Filter', 'बैच एक्सपायरी फ़िल्टर', 'बॅच मुदत फिल्टर')}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {expiryOptions.map((opt) => {
                const active = selectedExpiryFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeExpiryFilter(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] border-slate-200 dark:border-[#24352F]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.count !== undefined && (
                      <span className="text-[10px] font-mono opacity-80">{opt.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Secondary Actions (PDF, Print, CSV, Photo Database) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
              {tr('Reports & Tools', 'रिपोर्ट और टूल्स', 'अहवाल आणि साधने')}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDownloadPDF();
                }}
                className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{tr('Stock PDF', 'स्टॉक PDF', 'साठा PDF')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrintPDF();
                }}
                className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] shrink-0" />
                <span>{tr('Print', 'प्रिंट', 'प्रिंट')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewPDF();
                }}
                className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] shrink-0" />
                <span>{tr('View PDF', 'PDF देखें', 'PDF पहा')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExportCSV();
                }}
                className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{tr('CSV / Excel', 'CSV / एक्सेल', 'CSV / एक्सेल')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPhotoDatabase();
                }}
                className="col-span-2 min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{tr('Photo Database Manager', 'फोटो डेटाबेस मैनेजर', 'फोटो डेटाबेस व्यवस्थापक')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
