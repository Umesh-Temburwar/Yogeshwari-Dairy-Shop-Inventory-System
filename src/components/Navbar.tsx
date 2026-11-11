import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  Milk, 
  Database, 
  RefreshCw, 
  Clock, 
  Languages,
  Settings,
  Sun,
  Moon,
  Laptop,
  Menu,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  User
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenSettings,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
}) => {
  const { 
    isSupabaseConnected, 
    isSyncing, 
    syncWithSupabase,
  } = useStore();

  const { language, setLanguage, t } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

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

  const languagesList: Array<{ code: Language; label: string; flag: string }> = [
    { code: 'mr', label: 'मराठी', flag: '🚩' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const currentLangObj = languagesList.find(l => l.code === language) || languagesList[0];

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#24352F] shadow-xs shrink-0 transition-colors duration-150">
      <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3 min-w-0">
        
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
          <div className="w-12 h-12 sm:w-[50px] sm:h-[50px] rounded-full bg-white p-0.5 shadow-md border-2 border-emerald-500/40 dark:border-emerald-500/60 ring-2 ring-emerald-500/10 flex items-center justify-center shrink-0 overflow-hidden transition-transform hover:scale-105">
            <img 
              src="/YDO_logo.jpg" 
              alt="Yogeshwari Dairy Logo" 
              className="w-full h-full rounded-full object-cover scale-105"
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

        {/* Center / Right Controls: Language, Clock, Theme Toggle, Database Sync, Settings */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* TRILINGUAL LANGUAGE SELECTOR */}
          {/* Desktop: Segmented Pill */}
          <div className="hidden lg:flex items-center bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl border border-slate-200/80 dark:border-[#24352F]">
            {languagesList.map((lang) => {
              const isActive = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-[#E7F0EC]'
                  }`}
                  title={`Switch to ${lang.label}`}
                >
                  <span className="text-xs">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile / Tablet: Language Dropdown (<lg) */}
          <div className="relative lg:hidden">
            <button
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setThemeDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
              title="Change Language"
            >
              <span>{currentLangObj.flag}</span>
              <span className="hidden sm:inline">{currentLangObj.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#131F1B] rounded-xl border border-slate-200 dark:border-[#24352F] shadow-xl p-1 z-50 animate-fadeIn">
                {languagesList.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition ${
                      language === lang.code
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Clock (Hidden below lg) */}
          <div className="hidden lg:flex flex-col items-end text-right px-2 border-r border-slate-200 dark:border-[#24352F]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#E7F0EC] tabular-nums">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-[#8FA69C]" />
              <span>{currentTime}</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-[#8FA69C] font-medium">
              {currentDate}
            </span>
          </div>

          {/* Theme Toggle (Light / Dark / System) */}
          <div className="relative">
            <button
              onClick={() => {
                setThemeDropdownOpen(!themeDropdownOpen);
                setLangDropdownOpen(false);
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25] hover:text-slate-900 dark:hover:text-[#E7F0EC] border border-transparent hover:border-slate-200 dark:hover:border-[#24352F] transition"
              title={`Theme: ${theme.toUpperCase()} (${resolvedTheme} active)`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-5 h-5 text-amber-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-600" />
              )}
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#131F1B] rounded-xl border border-slate-200 dark:border-[#24352F] shadow-xl p-1 z-50 animate-fadeIn">
                <button
                  onClick={() => {
                    setTheme('light');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    theme === 'light'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>{t('themeLight')}</span>
                </button>
                <button
                  onClick={() => {
                    setTheme('dark');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    theme === 'dark'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>{t('themeDark')}</span>
                </button>
                <button
                  onClick={() => {
                    setTheme('system');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    theme === 'system'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                  }`}
                >
                  <Laptop className="w-4 h-4 text-slate-400" />
                  <span>{t('themeSystem')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Database Cloud/Local Indicator */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isSupabaseConnected 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/40' 
                : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] border-slate-300 dark:border-[#24352F]'
            }`}
            title="Database Connection Status"
          >
            <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
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
              className="p-2 rounded-xl text-slate-500 dark:text-[#8FA69C] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-[#1A2A25] transition"
              title="Sync Database"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition"
            title="Settings & Supabase Configuration"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* User Profile / Logout Button */}
          <div className="flex items-center pl-1 border-l border-slate-200 dark:border-[#24352F]">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-[#1A2A25] dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-[#8FA69C] dark:hover:text-rose-400 border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs"
              title={user ? `Logged in as ${user.email}. Click to Logout` : 'Guest Mode. Click to Login'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline max-w-[110px] truncate">
                {user ? user.email?.split('@')[0] : (language === 'mr' ? 'अतिथी' : 'Guest')}
              </span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
