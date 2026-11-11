import React, { useState, useEffect } from 'react';
import ydoLogo from '../assets/YDO_logo.jpg';
import { useLanguage, Language } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { 
  Clock, 
  Sun, 
  Moon, 
  Menu, 
  PanelLeftClose, 
  PanelLeft, 
  LogOut, 
  User, 
  Lock, 
  ChevronDown, 
  CheckCircle2, 
  ShieldCheck, 
  Globe,
  RotateCw
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, role, setRole, lockSecurity, signOut } = useAuth();
  const { refreshData, isSyncing } = useStore();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRefreshedToast, setShowRefreshedToast] = useState(false);

  const handleManualRefresh = async () => {
    await refreshData();
    setShowRefreshedToast(true);
    setTimeout(() => setShowRefreshedToast(false), 2000);
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const locale = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      setCurrentTime(now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const languagesList: Array<{ code: Language; label: string }> = [
    { code: 'mr', label: 'मराठी' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'en', label: 'English' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#24352F] shadow-xs shrink-0 transition-colors duration-150">
      <div className="max-w-[1440px] mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-3 min-w-0">
        
        {/* Left: Sidebar Toggle + Brand Logo & Shop Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition active:scale-95"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Rail Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-2 rounded-xl text-slate-500 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25] hover:text-slate-900 dark:hover:text-[#E7F0EC] transition"
            title={isSidebarCollapsed ? "Expand Sidebar (264px)" : "Collapse Sidebar (72px)"}
          >
            {isSidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* Brand Logo - Enlarged & Circular */}
          <div className="w-11 h-11 sm:w-[50px] sm:h-[50px] rounded-full bg-white p-0.5 shadow-md border-2 border-emerald-500/40 dark:border-emerald-500/60 ring-2 ring-emerald-500/10 flex items-center justify-center shrink-0 overflow-hidden transition-transform hover:scale-105">
            <img 
              src={ydoLogo} 
              alt="Yogeshwari Dairy Logo" 
              className="w-full h-full rounded-full object-cover scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/YDO_logo.png')) {
                  target.src = '/YDO_logo.png';
                }
              }}
            />
          </div>

          {/* Shop Title - single line, truncate, subtitle hidden below xl */}
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
                {t('shopName')}
              </span>
              <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                {t('erpBadge')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium truncate hidden xl:block">
              {t('shopSubtitle')}
            </p>
          </div>
        </div>

        {/* Center / Right Controls: Trilingual Selector, Live Clock, 1-Click Theme, User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* TRILINGUAL LANGUAGE SELECTOR */}
          {/* Desktop/Tablet Segmented Pill */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl border border-slate-200/80 dark:border-[#24352F] h-9">
            {languagesList.map((lang) => {
              const isActive = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2.5 sm:px-3 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    isActive
                      ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-xs font-extrabold ring-1 ring-slate-200/50 dark:ring-[#24352F]'
                      : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-[#E7F0EC]'
                  }`}
                  title={`Switch to ${lang.label}`}
                >
                  <span>{lang.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile 1-Tap Language Cycle Button */}
          <button
            type="button"
            onClick={() => {
              const next: Language = language === 'mr' ? 'hi' : language === 'hi' ? 'en' : 'mr';
              setLanguage(next);
            }}
            className="sm:hidden h-9 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-emerald-800 dark:text-emerald-400 border border-slate-200 dark:border-[#24352F] font-black text-xs flex items-center gap-1 active:scale-95 transition"
            title="भाषा बदला (Tap to switch language)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'EN'}</span>
          </button>

          {/* Live Clock & Date Badge (Hidden below xl) */}
          <div className="hidden xl:flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-100/80 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] text-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-mono font-bold tabular-nums text-slate-800 dark:text-[#E7F0EC]">
              {currentTime}
            </span>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] whitespace-nowrap">
              {currentDate}
            </span>
          </div>

          {/* 1-TAP REFRESH BUTTON (Syncs data, updates views) */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isSyncing}
            className="h-9 px-2 sm:px-2.5 rounded-xl flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 font-bold text-xs transition-all active:scale-95 shadow-2xs disabled:opacity-60"
            title={language === 'mr' ? 'माहिती रिफ्रेश करा (Refresh Data)' : language === 'hi' ? 'डेटा रिफ्रेश करें (Refresh)' : 'Refresh Data'}
          >
            <RotateCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {language === 'mr' ? 'रिफ्रेश' : language === 'hi' ? 'रिफ्रेश' : 'Refresh'}
            </span>
          </button>

          {/* 1-CLICK THEME TOGGLE (Sun <-> Moon, No annoying overlapping popup) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-700 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] transition-all active:scale-95 shadow-2xs"
            title={resolvedTheme === 'dark' ? 'Click to switch to Light Mode' : 'Click to switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 dark:text-amber-300 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* 1-CLICK LOCK COUNTER BUTTON */}
          <button
            type="button"
            onClick={() => lockSecurity()}
            className="h-9 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-bold text-xs transition-all active:scale-95 shadow-2xs"
            title={language === 'mr' ? 'काउंटर त्वरित लॉक करा (Lock)' : language === 'hi' ? 'काउंटर तुरंत लॉक करें (Lock)' : 'Quick Lock Counter'}
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">
              {language === 'mr' ? 'लॉक करा' : language === 'hi' ? 'लॉक करें' : 'Lock'}
            </span>
          </button>

          {/* OWNER / ADMIN PROFILE BADGE & DROPDOWN */}
          <div className="relative pl-1 sm:pl-1.5 border-l border-slate-200 dark:border-[#24352F]">
            <button
              type="button"
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="h-9 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs group"
              title="Profile & Role Settings"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                role === 'Owner' 
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' 
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}>
                {role === 'Owner' ? '👑' : '🛡️'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black leading-none">
                  {role === 'Owner' 
                    ? (language === 'mr' ? 'मालक' : language === 'hi' ? 'मालिक' : 'Owner')
                    : (language === 'mr' ? 'ॲडमिन' : language === 'hi' ? 'एडमिन' : 'Admin')}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-[#8FA69C] leading-none mt-0.5 truncate max-w-[65px] sm:max-w-[90px]">
                  {user?.email?.split('@')[0] || 'Yogeshwari'}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-[#24352F]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-[#8FA69C] uppercase tracking-wider">
                        {language === 'mr' ? 'प्रमाणित खाते (Verified)' : language === 'hi' ? 'सत्यापित खाता' : 'Verified Account'}
                      </p>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {user?.email || 'owner@yogeshwaridairy.com'}
                    </p>
                  </div>

                  {/* Switch Role: Owner vs Admin */}
                  <div className="p-1 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#8FA69C] px-2 py-0.5">
                      {language === 'mr' ? 'प्रोफाइल निवडा' : language === 'hi' ? 'प्रोफ़ाइल चुनें' : 'Select Profile'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRole('Owner');
                        setShowProfileMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        role === 'Owner'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                          : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>👑</span>
                        <span>{language === 'mr' ? 'दुकान मालक (Owner)' : language === 'hi' ? 'दुकान मालिक (Owner)' : 'Shop Owner'}</span>
                      </div>
                      {role === 'Owner' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRole('Admin');
                        setShowProfileMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        role === 'Admin'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                          : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🛡️</span>
                        <span>{language === 'mr' ? 'प्रशासक (Admin)' : language === 'hi' ? 'प्रशासक (Admin)' : 'Administrator'}</span>
                      </div>
                      {role === 'Admin' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-[#24352F] pt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        lockSecurity();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'काउंटर त्वरित लॉक करा' : language === 'hi' ? 'काउंटर तुरंत लॉक करें' : 'Lock Counter Screen'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'बाहेर पडा (Sign Out)' : language === 'hi' ? 'साइन आउट करें' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Floating Refresh Confirmation Toast */}
      {showRefreshedToast && (
        <div className="fixed top-18 right-4 z-50 bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-500/50 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{language === 'mr' ? 'माहिती यशस्वीरित्या रिफ्रेश झाली!' : language === 'hi' ? 'डेटा सफलतापूर्वक रिफ्रेश हुआ!' : 'Data Refreshed Successfully!'}</span>
        </div>
      )}
    </header>
  );
};
