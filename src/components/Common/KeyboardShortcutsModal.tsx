import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', label: isMr ? 'कीबोर्ड शॉर्टकट मदत (Help)' : isHi ? 'शॉर्टकट सहायता' : 'Keyboard Shortcuts Guide', view: 'Global' },
    { key: 'F2', label: isMr ? 'थेट बिलिंग काऊंटर (POS Billing)' : isHi ? 'बिलिंग काउंटर (POS)' : 'Open Billing Counter (POS)', view: 'POS' },
    { key: 'F3', label: isMr ? 'नवीन उत्पादन / साठा जोडा' : isHi ? 'नया उत्पाद जोड़ें' : 'Add New Product / Stock', view: 'Inventory' },
    { key: 'F4', label: isMr ? 'उधार खातेवही (Udhar Khata)' : isHi ? 'उधार खाता बही' : 'Udhar Khata (Credit Ledger)', view: 'Khata' },
    { key: 'Esc', label: isMr ? 'कोणतीही विंडो / मॉडेल बंद करा' : isHi ? 'खुली विंडो बंद करें' : 'Close Active Modal / Drawer', view: 'Global' },
    { key: 'Tab', label: isMr ? 'पुढील इनपुट / बटणावर जा' : isHi ? 'अगले इनपुट पर जाएं' : 'Next Input Field Focus', view: 'Form' },
    { key: 'Enter', label: isMr ? 'बिल पूर्ण करा / सबमिट करा' : isHi ? 'बिल सुरक्षित / जमा करें' : 'Confirm & Submit Bill', view: 'POS' }
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#24352F]">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black text-base">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3>{isMr ? 'कीबोर्ड शॉर्टकट मार्गदर्शक' : isHi ? 'कीबोर्ड शॉर्टकट मार्गदर्शिका' : 'Keyboard Shortcuts Guide'}</h3>
              <p className="text-xs text-slate-400 font-normal">
                {isMr ? 'जलद बिलिंग व नेव्हिगेशनसाठी' : 'Fast billing & quick counter navigation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-[#24352F] max-h-80 overflow-y-auto pr-1">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
              <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span>{sc.label}</span>
                <span className="text-[10px] text-slate-400 font-normal px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1A2A25]">
                  {sc.view}
                </span>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1E302B] text-slate-800 dark:text-emerald-300 font-mono font-black text-xs border border-slate-300 dark:border-emerald-600/30 shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs transition"
          >
            {isMr ? 'समजले (Close)' : 'Got it (Close)'}
          </button>
        </div>
      </div>
    </div>
  );
};
