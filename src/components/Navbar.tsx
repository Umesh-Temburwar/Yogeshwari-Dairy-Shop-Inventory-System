import React, { useState } from 'react';
import ydoLogo from '../assets/YDO_logo.jpg';
import { useLanguage, Language } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sun, 
  Moon, 
  Menu, 
  PanelLeftClose, 
  PanelLeft, 
  LogOut, 
  Lock, 
  ChevronDown, 
  CheckCircle2, 
  ShieldCheck, 
  Globe,
  Smartphone
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
  onOpenAppDownload?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenSettings,
  onOpenAppDownload,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, role, setRole, lockSecurity, signOut } = useAuth();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Active User display name: Nikhil Sakhare (Owner) vs Nilesh Sakhare (Admin)
  const currentUserName = 
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil Sakhare'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh Sakhare'
      : (user?.user_metadata?.full_name || 'Nikhil Sakhare');

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

        {/* Right Controls: User Profile/Settings */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* USER PROFILE BADGE & DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="h-9 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs group"
              title="Profile & Settings"
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
                  {currentUserName}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-[#8FA69C] leading-none mt-0.5 truncate max-w-[70px] sm:max-w-[100px]">
                  {user?.email?.split('@')[0] || 'Yogeshwari'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu (Preferences first, then Profile Name & Accounts placed at LAST) */}
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] shadow-2xl p-2.5 z-50 animate-fadeIn space-y-2.5">
                  
                  {/* 1. LANGUAGE & THEME PREFERENCES */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#8FA69C] px-1 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'mr' ? 'भाषा व थीम सेटिंग्ज' : language === 'hi' ? 'भाषा व थीम सेटिंग्स' : 'Language & Theme'}</span>
                    </p>

                    {/* Language Switcher */}
                    <div className="px-1">
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl border border-slate-200/80 dark:border-[#24352F]">
                        {languagesList.map((lang) => {
                          const isActive = language === lang.code;
                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => setLanguage(lang.code)}
                              className={`py-1 px-1 rounded-lg text-xs font-bold transition-all text-center ${
                                isActive
                                  ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-slate-200/60 dark:ring-[#24352F] font-extrabold'
                                  : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-[#E7F0EC]'
                              }`}
                            >
                              {lang.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Theme Toggle (Dark / Light) */}
                    <div className="px-1">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#1A2A25] dark:hover:bg-[#223630] border border-slate-200/80 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC] transition"
                      >
                        <span className="flex items-center gap-2">
                          {resolvedTheme === 'dark' ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Moon className="w-4 h-4 text-indigo-500" />
                          )}
                          <span>{language === 'mr' ? 'थीम (Dark / Light)' : language === 'hi' ? 'थीम (Dark / Light)' : 'Theme Mode'}</span>
                        </span>
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-emerald-700 dark:text-emerald-400">
                          {resolvedTheme === 'dark'
                            ? (language === 'mr' ? 'डार्क 🌙' : language === 'hi' ? 'डार्क 🌙' : 'Dark 🌙')
                            : (language === 'mr' ? 'लाइट ☀️' : language === 'hi' ? 'लाइट ☀️' : 'Light ☀️')}
                        </span>
                      </button>
                    </div>

                    {/* Quick Trigger: Install Mobile App Modal */}
                    {onOpenAppDownload && (
                      <div className="px-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenAppDownload();
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-300/80 dark:border-emerald-800/60 text-xs font-bold text-emerald-900 dark:text-emerald-300 transition shadow-2xs"
                        >
                          <span className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>{language === 'mr' ? 'मोबाईल ॲप इन्स्टॉल करा' : language === 'hi' ? 'मोबाइल ऐप इंस्टॉल करें' : 'Install Mobile App'}</span>
                          </span>
                          <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">
                            APP
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. LOCK COUNTER SCREEN */}
                  <div className="border-t border-slate-100 dark:border-[#24352F] pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        lockSecurity();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'काउंटर त्वरित लॉक करा' : language === 'hi' ? 'काउंटर तुरंत लॉक करें' : 'Lock Counter Screen'}</span>
                    </button>
                  </div>

                  {/* 3. PROFILE NAME & ACCOUNT PLACED AT THE LAST */}
                  <div className="border-t border-slate-100 dark:border-[#24352F] pt-2 space-y-2">
                    {/* Active User Name & Email Badge */}
                    <div className="px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] rounded-xl border border-slate-100 dark:border-[#24352F]/70">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-[10px] font-bold text-slate-500 dark:text-[#8FA69C] uppercase tracking-wider">
                          {language === 'mr' ? 'सक्रिय प्रोफाइल (Profile)' : language === 'hi' ? 'सक्रिय प्रोफ़ाइल' : 'Active Profile'}
                        </p>
                      </div>
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {currentUserName}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-[#8FA69C] truncate">
                        {user?.email || 'yogeshwaridairy9896@gmail.com'}
                      </p>
                    </div>

                    {/* Profile Selection (Nikhil Sakhare / Nilesh Sakhare) */}
                    {(() => {
                      const isOwnerUser = 
                        !user?.email ||
                        user?.email.toLowerCase() === 'yogeshwaridairy9896@gmail.com' ||
                        user?.email.toLowerCase().includes('yogeshwari') ||
                        user?.email.toLowerCase().includes('owner') ||
                        (user?.user_metadata?.role === 'Owner' && !user?.email.toLowerCase().includes('nilu'));

                      return (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-[#8FA69C] px-1">
                            {isOwnerUser 
                              ? (language === 'mr' ? 'खाते निवडा' : language === 'hi' ? 'खाता चुनें' : 'Select Account')
                              : (language === 'mr' ? 'सक्रिय खाते' : language === 'hi' ? 'सक्रिय खाता' : 'Active Account')}
                          </p>

                          {/* Nikhil Sakhare (Owner) Option */}
                          {isOwnerUser && (
                            <button
                              type="button"
                              onClick={() => {
                                setRole('Owner', null);
                                setShowProfileMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                                role === 'Owner'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                                  : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>👑</span>
                                <span className="font-extrabold">Nikhil Sakhare</span>
                              </div>
                              {role === 'Owner' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                            </button>
                          )}

                          {/* Nilesh Sakhare (Admin) Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setRole('Admin', 1);
                              setShowProfileMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                              role === 'Admin'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                                : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>🛡️</span>
                              <span className="font-extrabold">Nilesh Sakhare</span>
                            </div>
                            {role === 'Admin' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 4. SIGN OUT */}
                  <div className="border-t border-slate-100 dark:border-[#24352F] pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'बाहेर पडा' : language === 'hi' ? 'साइन आउट करें' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
