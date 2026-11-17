import React from 'react';
import ydoLogo from '../assets/YDO_logo.jpg';
import nikhilAvatar from '../assets/nikhil_avatar.png';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRealtimeStatus } from '../hooks/useRealtimeStatus';
import { 
  PanelLeftClose, 
  PanelLeft,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
  onOpenAppDownload?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onToggleSidebarCollapse,
  isSidebarCollapsed,
  onOpenMobileSidebar,
  onOpenAppDownload,
}) => {
  const { t, language } = useLanguage();
  const { user, role } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const realtimeStatus = useRealtimeStatus();

  // Active User display name: Nikhil Sakhare (Owner) vs Nilesh Sakhare (Admin)
  const currentUserName = 
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil Sakhare'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh Sakhare'
      : (user?.user_metadata?.full_name || 'Nikhil Sakhare');

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md border-b border-slate-100 sm:border-slate-200 dark:border-[#24352F]/40 shadow-xs shrink-0 transition-colors duration-150">
      <div className="max-w-[1440px] mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-3 min-w-0">
        
        {/* Left: Sidebar Toggle + Brand Logo & Shop Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
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

        {/* Right Controls: Theme Toggle, App Install, User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick App Download Button (Tablet & Desktop) */}
          {onOpenAppDownload && (
            <button
              type="button"
              onClick={onOpenAppDownload}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-300/60 dark:border-emerald-800/60 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
              title={language === 'mr' ? 'मोबाईल ॲप इन्स्टॉल करा' : 'मोबाइल ऐप इंस्टॉल करें'}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px]">{language === 'mr' ? 'ॲप इन्स्टॉल' : 'ऐप इंस्टॉल'}</span>
            </button>
          )}

          {/* Realtime Live Sync Status Indicator (Subtle & Non-blocking) */}
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black tracking-tight"
            title={
              realtimeStatus === 'CONNECTED' ? 'Realtime Database Synced (सर्व टर्मिनल जोडलेले आहेत)' :
              realtimeStatus === 'CONNECTING' || realtimeStatus === 'RECONNECTING' ? 'Reconnecting to Realtime... (पुन्हा जोडत आहे...)' :
              'Offline mode (ऑफलाइन मोड)'
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

          {/* Quick Theme Toggle (Sun / Moon) - Works on both mobile and desktop! */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25] hover:text-slate-900 dark:hover:text-[#E7F0EC] transition active:scale-95 cursor-pointer"
            title={resolvedTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* Profile Photo Button (Click opens mobile drawer on touch devices) */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="w-10 h-10 rounded-full p-0.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-[#1A2A25] dark:hover:bg-[#223630] border-2 border-amber-400/90 dark:border-amber-400 shadow-xs transition-transform hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
            title={`${currentUserName} (${role === 'Owner' ? 'Shop Owner' : 'Admin'})`}
          >
            {role === 'Owner' ? (
              <img 
                src={nikhilAvatar} 
                alt={currentUserName} 
                className="w-full h-full rounded-full object-cover" 
              />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center text-sm font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                🛡️
              </div>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
