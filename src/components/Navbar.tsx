import React, { useState, useRef, useEffect } from 'react';
import ydoLogo from '../assets/YDO_logo.jpg';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRealtimeStatus } from '../hooks/useRealtimeStatus';
import { useStore } from '../context/StoreContext';
import { 
  PanelLeftClose, 
  PanelLeft,
  Sun,
  Moon,
  Smartphone,
  Settings,
  LogOut,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
  onOpenPhotoDatabase?: () => void;
  onOpenAppDownload?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onToggleSidebarCollapse,
  isSidebarCollapsed,
  onOpenSettings,
  onOpenPhotoDatabase,
  onOpenAppDownload,
}) => {
  const { t, language } = useLanguage();
  const { user, role, signOut, avatarUrl, hasCustomAvatar } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const realtimeStatus = useRealtimeStatus();
  const { activeView, setActiveView, metrics } = useStore();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click or Escape key
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  // Active User display name: Nikhil Sakhare (Owner) vs Nilesh Sakhare (Admin)
  const currentUserName = 
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil Sakhare'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh Sakhare'
      : (user?.user_metadata?.full_name || 'Nikhil Sakhare');

  const roleLabel = role === 'Owner'
    ? ('Shop Owner')
    : ('Counter Admin');

  return (
    <header className="sticky top-0 z-30 min-h-16 w-full bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md border-b border-slate-100 sm:border-slate-200 dark:border-[#24352F]/40 shadow-xs shrink-0 transition-colors duration-150 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-[1440px] mx-auto h-16 px-3 sm:px-6 flex items-center justify-between gap-3 min-w-0">
        
        {/* Left: Sidebar Toggle + Brand Logo & Shop Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          {/* Desktop Rail Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-2 rounded-xl text-slate-500 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25] hover:text-slate-900 dark:hover:text-[#E7F0EC] transition cursor-pointer"
            title={isSidebarCollapsed ? "Expand Sidebar (264px)" : "Collapse Sidebar (72px)"}
          >
            {isSidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* Brand Logo - 36px on mobile */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white p-0.5 shadow-md border-2 border-emerald-500/40 dark:border-emerald-500/60 ring-2 ring-emerald-500/10 flex items-center justify-center shrink-0 overflow-hidden transition-transform hover:scale-105">
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

          {/* Shop Title - single line, truncate, online dot beside title */}
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
                {t('shopName')}
              </span>
              <span className="relative flex h-2 w-2 shrink-0" title={realtimeStatus === 'CONNECTED' ? 'Online' : 'Syncing'}>
                {realtimeStatus === 'CONNECTED' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                )}
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

        {/* Right Controls: App Install, Realtime Live Status, Profile Dropdown Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick App Download Button (Tablet & Desktop) */}
          {onOpenAppDownload && (
            <button
              type="button"
              onClick={onOpenAppDownload}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-300/60 dark:border-emerald-800/60 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
              title={
                'Install Mobile App'
              }
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px]">
                {'Install App'}
              </span>
            </button>
          )}

          {/* Realtime Live Sync Status Indicator (Desktop/Tablet) */}
          <div 
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black tracking-tight"
            title={
              realtimeStatus === 'CONNECTED'
                ? 'Realtime Database Synced'
                : realtimeStatus === 'CONNECTING' || realtimeStatus === 'RECONNECTING'
                ? 'Reconnecting to Realtime...'
                : 'Offline mode'
            }
          >
            <span className="relative flex h-2 w-2">
              {realtimeStatus === 'CONNECTED' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : realtimeStatus === 'CONNECTING' || realtimeStatus === 'RECONNECTING' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
              )}
            </span>
            <span className="hidden sm:inline text-slate-500 dark:text-[#8FA69C]">
              {realtimeStatus === 'CONNECTED' ? 'Live' : realtimeStatus === 'RECONNECTING' ? 'Sync...' : 'Offline'}
            </span>
          </div>

          {/* Online Orders Quick Button */}
          <button
            type="button"
            onClick={() => setActiveView('ecommerce-orders')}
            className={`relative p-2 rounded-xl border transition active:scale-95 cursor-pointer flex items-center justify-center ${
              activeView === 'ecommerce-orders'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#1A2A25] border-slate-200/90 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC]'
            }`}
            title="Online Customer Orders"
            aria-label="Online Orders"
          >
            <ShoppingBag className="w-4 h-4" />
            {metrics.pendingOnlineOrdersCount && metrics.pendingOnlineOrdersCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-sm">
                {metrics.pendingOnlineOrdersCount}
              </span>
            ) : null}
          </button>

          {/* Profile Button + Dropdown Menu (Theme Change, Photo Database, Settings, Logout) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(prev => !prev)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 pl-0.5 pr-1.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-[#1A2A25] dark:hover:bg-[#223630] border border-slate-200/90 dark:border-[#24352F] shadow-2xs transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
              title={`${currentUserName} (${role === 'Owner' ? 'Shop Owner' : 'Admin'})`}
            >
              <div className="w-9 h-9 rounded-full p-0.5 border-2 border-amber-400/90 dark:border-amber-400 overflow-hidden bg-white dark:bg-[#131F1B] flex items-center justify-center shrink-0">
                {role === 'Owner' || hasCustomAvatar ? (
                  <img 
                    src={avatarUrl} 
                    alt={currentUserName} 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center text-sm font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    🛡️
                  </div>
                )}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 dark:text-[#8FA69C] transition-transform duration-150 ${
                  isProfileMenuOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2.5 w-72 rounded-3xl bg-white/98 dark:bg-[#131F1B]/98 backdrop-blur-xl border border-slate-200/90 dark:border-[#24352F] shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 origin-top-right overflow-hidden"
              >
                {/* User Identity Header */}
                <div className="px-4 py-3 bg-gradient-to-b from-slate-50 to-white dark:from-[#182622] dark:to-[#131F1B] border-b border-slate-100 dark:border-[#24352F] flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full p-0.5 ring-2 ring-emerald-500/30 border-2 border-amber-400 overflow-hidden bg-white dark:bg-[#1A2A25] shrink-0 shadow-xs">
                    {role === 'Owner' || hasCustomAvatar ? (
                      <img src={avatarUrl} alt={currentUserName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center text-base bg-emerald-100 dark:bg-emerald-950/60">
                        🛡️
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-black text-slate-900 dark:text-white truncate">
                      {currentUserName}
                    </div>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 text-[10px] font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                      <span>{roleLabel}</span>
                    </div>
                    {user?.email && (
                      <div className="text-[10px] text-slate-400 dark:text-[#8FA69C] truncate mt-0.5">
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Menu Actions */}
                <div className="p-2 space-y-1">
                  {/* 1. Theme Change */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition active:scale-[0.98] cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      {resolvedTheme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                      )}
                      <span>{'Display Theme'}</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#223630] text-slate-600 dark:text-emerald-300">
                      {resolvedTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </span>
                  </button>

                  {/* 2. Settings Page */}
                  {onOpenSettings && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition active:scale-[0.98] cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{'Settings & Security'}</span>
                    </button>
                  )}

                  {/* 3. Download APK */}
                  {onOpenAppDownload && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenAppDownload();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition active:scale-[0.98] cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{'Install / Update Android APK'}</span>
                    </button>
                  )}
                </div>

                {/* Logout Button */}
                <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-[#24352F] px-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-[0.98] cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{'Logout'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
