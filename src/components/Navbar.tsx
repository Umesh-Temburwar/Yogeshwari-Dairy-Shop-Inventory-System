import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { 
  Milk, 
  Database, 
  PlusCircle, 
  Receipt, 
  BookOpen, 
  RefreshCw, 
  Clock, 
  Languages,
  Settings
} from 'lucide-react';

interface NavbarProps {
  onOpenAddProduct: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAddProduct, onOpenSettings }) => {
  const { 
    setActiveView, 
    isSupabaseConnected, 
    isSyncing, 
    syncWithSupabase,
    metrics
  } = useStore();

  const { language, setLanguage, t } = useLanguage();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const locale = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      setCurrentTime(now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const languagesList: Array<{ code: Language; label: string; flag: string }> = [
    { code: 'mr', label: 'मराठी', flag: '🚩' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Shop Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Milk className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                  {t('shopName')}
                </span>
                <span className="hidden md:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {language === 'mr' ? 'डेअरी ERP' : language === 'hi' ? 'डेरी ERP' : 'Dairy ERP'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {t('shopSubtitle')}
              </p>
            </div>
          </div>

          {/* Quick Counter Shortcuts & Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setActiveView('pos')}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all active:scale-95"
            >
              <Receipt className="w-4 h-4" />
              <span>{t('openBillingCounter')}</span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-emerald-800/60 rounded text-emerald-100">F2</kbd>
            </button>

            <button
              onClick={onOpenAddProduct}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>{t('addNewMaal')}</span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-200 rounded text-slate-600">F3</kbd>
            </button>

            <button
              onClick={() => setActiveView('udhar')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>{t('openKhata')}</span>
              <span className="text-xs font-bold text-amber-700">₹{metrics.totalOutstandingUdhar.toLocaleString('en-IN')}</span>
            </button>
          </div>

          {/* Right Status: Language Switcher, Clock, DB Status, Settings */}
          <div className="flex items-center gap-2.5">
            
            {/* TRILINGUAL LANGUAGE SWITCHER */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <div className="pl-1.5 pr-1 text-slate-400">
                <Languages className="w-3.5 h-3.5" />
              </div>
              {languagesList.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      isActive
                        ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={`Switch to ${lang.label}`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Clock */}
            <div className="hidden sm:flex flex-col items-end text-right px-2 border-r border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentTime}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {currentDate}
              </span>
            </div>

            {/* Supabase Connection Status Pill */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isSupabaseConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title="Click to configure Supabase Cloud Database"
            >
              <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                {isSupabaseConnected ? 'Cloud' : 'Local'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            </button>

            {/* Sync Button */}
            {isSupabaseConnected && (
              <button
                onClick={syncWithSupabase}
                disabled={isSyncing}
                className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Sync database"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            )}

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Settings & Supabase Configuration"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
