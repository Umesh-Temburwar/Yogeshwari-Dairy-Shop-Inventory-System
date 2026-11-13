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
  Smartphone
} from 'lucide-react';
import { Button, SegmentedControl, Badge } from './ui';

interface NavbarProps {
  onOpenSettings?: () => void;
  onOpenAppDownload?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenAppDownload,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, role, setRole, lockSecurity, signOut } = useAuth();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const currentUserName = 
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil Sakhare'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh Sakhare'
      : (user?.user_metadata?.full_name || 'Nikhil Sakhare');

  const languagesList: Array<{ value: Language; label: string }> = [
    { value: 'mr', label: 'मराठी' },
    { value: 'hi', label: 'हिंदी' },
    { value: 'en', label: 'English' },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-bg/80 backdrop-blur-xl border-b border-line px-4 shrink-0 transition-colors">
      <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between gap-3 min-w-0">
        
        {/* Left: Sidebar Toggle + Brand Logo & Shop Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-ink-2 hover:bg-surface-2 transition active:scale-95"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Rail Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink transition"
            title={isSidebarCollapsed ? "Expand Sidebar (248px)" : "Collapse Sidebar (68px)"}
          >
            {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Brand Logo */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface p-0.5 shadow-card border border-line flex items-center justify-center shrink-0 overflow-hidden">
            <img 
              src={ydoLogo} 
              alt="Yogeshwari Dairy Logo" 
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/YDO_logo.png')) target.src = '/YDO_logo.png';
              }}
            />
          </div>

          {/* Shop Title */}
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base text-ink tracking-tight truncate">
                {t('shopName')}
              </span>
              <Badge variant="default" className="text-[10px] h-5 px-1.5 font-medium">
                {t('erpBadge')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right Controls: User Profile / Settings */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="h-9 flex items-center gap-2 px-2.5 sm:px-3 rounded-xl bg-surface text-ink border border-line/60 shadow-card hover:bg-surface-2 text-xs font-medium transition-all group"
              title="Profile & Settings"
            >
              <span className="text-xs">{role === 'Owner' ? '👑' : '🛡️'}</span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold leading-none truncate max-w-[85px] sm:max-w-[120px]">
                  {currentUserName}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-ink-3 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface border border-line shadow-pop p-3 z-50 space-y-3">
                  
                  {/* Preferences Section */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3 px-1">
                      {language === 'mr' ? 'भाषा व थीम सेटिंग्ज' : language === 'hi' ? 'भाषा व थीम सेटिंग्स' : 'Preferences'}
                    </p>

                    <div className="px-1">
                      <SegmentedControl
                        className="w-full justify-between grid grid-cols-3"
                        options={languagesList}
                        value={language}
                        onChange={(val) => setLanguage(val as any)}
                        size="sm"
                      />
                    </div>

                    <div className="px-1">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-2 text-xs font-medium text-ink hover:opacity-90 transition border border-line/40"
                      >
                        <span className="flex items-center gap-2">
                          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-ink-2" /> : <Moon className="w-4 h-4 text-ink-2" />}
                          <span>{language === 'mr' ? 'थीम मोड' : language === 'hi' ? 'थीम मोड' : 'Theme Mode'}</span>
                        </span>
                        <span className="text-[11px] font-semibold text-ink-2">
                          {resolvedTheme === 'dark' ? 'Dark 🌙' : 'Light ☀️'}
                        </span>
                      </button>
                    </div>

                    {onOpenAppDownload && (
                      <div className="px-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenAppDownload();
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface text-ink hover:bg-surface-2 border border-line/60 text-xs font-medium transition shadow-card"
                        >
                          <span className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-ink-2" />
                            <span>{language === 'mr' ? 'मोबाईल ॲप इन्स्टॉल करा' : language === 'hi' ? 'मोबाइल ऐप इंस्टॉल करें' : 'Install Mobile App'}</span>
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-2 text-ink-2">
                            PWA
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lock Screen */}
                  <div className="border-t border-line/40 pt-2 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        lockSecurity();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-warn hover:bg-surface-2 transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'काउंटर त्वरित लॉक करा' : language === 'hi' ? 'काउंटर तुरंत लॉक करें' : 'Lock Counter Screen'}</span>
                    </button>
                  </div>

                  {/* Profile Account Details & Switcher */}
                  <div className="border-t border-line/40 pt-2 px-1 space-y-2">
                    <div className="p-2.5 bg-surface-2 rounded-xl border border-line/30">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-ok" />
                        <p className="text-[10px] font-medium text-ink-3 uppercase tracking-wider">
                          {language === 'mr' ? 'सक्रिय प्रोफाइल' : language === 'hi' ? 'सक्रिय प्रोफ़ाइल' : 'Active Account'}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-ink truncate">{currentUserName}</p>
                      <p className="text-[10px] text-ink-3 truncate">{user?.email || 'yogeshwaridairy9896@gmail.com'}</p>
                    </div>

                    {(() => {
                      const isOwnerUser = 
                        !user?.email ||
                        user?.email.toLowerCase() === 'yogeshwaridairy9896@gmail.com' ||
                        user?.email.toLowerCase().includes('yogeshwari') ||
                        user?.email.toLowerCase().includes('owner') ||
                        (user?.user_metadata?.role === 'Owner' && !user?.email.toLowerCase().includes('nilu'));

                      return (
                        <div className="space-y-1">
                          {isOwnerUser && (
                            <button
                              type="button"
                              onClick={() => {
                                setRole('Owner', null);
                                setShowProfileMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                                role === 'Owner'
                                  ? 'bg-surface shadow-card text-ink border border-line font-semibold'
                                  : 'text-ink-2 hover:bg-surface-2'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>👑</span>
                                <span>Nikhil Sakhare</span>
                              </div>
                              {role === 'Owner' && <CheckCircle2 className="w-3.5 h-3.5 text-ok" />}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setRole('Admin', 1);
                              setShowProfileMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                              role === 'Admin'
                                ? 'bg-surface shadow-card text-ink border border-line font-semibold'
                                : 'text-ink-2 hover:bg-surface-2'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>🛡️</span>
                              <span>Nilesh Sakhare</span>
                            </div>
                            {role === 'Admin' && <CheckCircle2 className="w-3.5 h-3.5 text-ok" />}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-line/40 pt-2 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 transition"
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

export default Navbar;
