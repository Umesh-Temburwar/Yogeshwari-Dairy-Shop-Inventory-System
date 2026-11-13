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
  Settings
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
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
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, role, setRole, lockSecurity, signOut } = useAuth();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

        {/* Right Controls: 1-Click Lock & User Profile/Settings */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
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
                  {role === 'Owner' 
                    ? (language === 'mr' ? 'मालक' : language === 'hi' ? 'मालिक' : 'Owner')
                    : (language === 'mr' ? 'प्रशासक' : language === 'hi' ? 'प्रशासक' : 'Admin')}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-[#8FA69C] leading-none mt-0.5 truncate max-w-[70px] sm:max-w-[100px]">
                  {user?.email?.split('@')[0] || 'Yogeshwari'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu (Includes Profiles, Settings: Language & Theme, Lock & Logout) */}
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] shadow-2xl p-2.5 z-50 animate-fadeIn space-y-2.5">
                  {/* Verified Account Header */}
                  <div className="px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] rounded-xl border border-slate-100 dark:border-[#24352F]/70">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-[10px] font-bold text-slate-500 dark:text-[#8FA69C] uppercase tracking-wider">
                        {language === 'mr' ? 'प्रमाणित खाते (Verified)' : language === 'hi' ? 'सत्यापित खाता' : 'Verified Account'}
                      </p>
                    </div>
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {user?.email || 'yogeshwaridairy9896@gmail.com'}
                    </p>
                  </div>

                  {/* Profile Selection: Owner can choose both; Admin ONLY sees Admin profile */}
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
                            ? (language === 'mr' ? 'प्रोफाइल निवडा (मालक दोन्ही वापरू शकतात)' : language === 'hi' ? 'प्रोफ़ाइल चुनें (मालिक दोनों चुन सकते हैं)' : 'Select Profile (Owner Access to Both)')
                            : (language === 'mr' ? 'सक्रिय प्रोफाइल (केवळ ॲडमिन)' : language === 'hi' ? 'सक्रिय प्रोफ़ाइल (केवल एडमिन)' : 'Active Profile (Admin Only)')}
                        </p>

                        {/* Owner Option: ONLY rendered if isOwnerUser is true */}
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
                              <span>{language === 'mr' ? 'दुकान मालक (निखिल सखारे)' : language === 'hi' ? 'दुकान मालिक (निखिल सखारे)' : 'Shop Owner (Nikhil Sakhare)'}</span>
                            </div>
                            {role === 'Owner' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                          </button>
                        )}

                        {/* Admin Option: Rendered for both */}
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
                            <span>{language === 'mr' ? 'प्रशासक (निलेश सखारे)' : language === 'hi' ? 'प्रशासक (निलेश सखारे)' : 'Admin (Nilesh Sakhare)'}</span>
                          </div>
                          {role === 'Admin' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      </div>
                    );
                  })()}

                  {/* SETTINGS SECTION: Language & Theme Controls */}
                  <div className="border-t border-slate-100 dark:border-[#24352F] pt-2 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#8FA69C] px-1 flex items-center gap-1">
                      <Settings className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'mr' ? 'सेटिंग्ज (Settings)' : language === 'hi' ? 'सेटिंग्स (Settings)' : 'Settings'}</span>
                    </p>

                    {/* Language Switcher */}
                    <div className="px-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5">
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{language === 'mr' ? 'भाषा निवडा' : language === 'hi' ? 'भाषा चुनें' : 'Language'}</span>
                        </span>
                      </div>
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

                    {/* App System Settings Modal Trigger */}
                    {onOpenSettings && (
                      <div className="px-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenSettings();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition"
                        >
                          <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>{language === 'mr' ? 'सर्वसाधारण सेटिंग्ज' : language === 'hi' ? 'सिस्टम सेटिंग्स' : 'System Settings'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions: Lock & Sign Out */}
                  <div className="border-t border-slate-100 dark:border-[#24352F] pt-2 space-y-1">
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
