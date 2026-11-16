import React from 'react';
import ydoLogo from '../assets/YDO_logo.jpg';
import nikhilAvatar from '../assets/nikhil_avatar.png';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { 
  PanelLeftClose, 
  PanelLeft
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
}) => {
  const { t } = useLanguage();
  const { user, role } = useAuth();

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

        {/* Right Controls: User Profile Badge (Click opens mobile drawer on touch devices) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="h-9 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs group"
            title={role === 'Owner' ? 'Nikhil Sakhare (Shop Owner)' : 'Nilesh Sakhare (Admin)'}
          >
            {role === 'Owner' ? (
              <img 
                src={nikhilAvatar} 
                alt="Nikhil Sakhare" 
                className="w-6 h-6 rounded-full object-cover border border-amber-400 shrink-0 shadow-xs" 
              />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                🛡️
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-xs font-black leading-none">
                {currentUserName}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-[#8FA69C] leading-none mt-0.5 truncate max-w-[70px] sm:max-w-[100px] hidden sm:block">
                {user?.email?.split('@')[0] || 'Yogeshwari'}
              </span>
            </div>
          </button>
        </div>

      </div>
    </header>
  );
};
