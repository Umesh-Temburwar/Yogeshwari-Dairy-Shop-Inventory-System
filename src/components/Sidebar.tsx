import React, { useState, useEffect, useRef, useMemo } from 'react';
import ydoLogo from '../assets/YDO_logo.jpg';
import nikhilAvatar from '../assets/nikhil_avatar.png';
import { useStore, AppView } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  House,
  ShoppingCart,
  Package,
  AlertCircle,
  ReceiptIndianRupee,
  Truck,
  PackageX,
  RotateCcw,
  BookOpen,
  Fuel,
  TrendingUp,
  ShieldAlert,
  X,
  Camera,
  Settings,
  LogOut,
  Check,
  ChevronDown,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeft,
  Eye,
  EyeOff
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAppDownload?: () => void;
  onOpenSettings?: () => void;
  onOpenPhotoDatabase?: () => void;
  onOpenChangePasscode?: () => void;
}

type GroupKey = 'main' | 'inventory' | 'accounts';

interface SidebarNavItem {
  id: AppView | 'photo-db';
  label: string;
  tooltip?: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  badgeTone?: 'danger' | 'warning';
  group: GroupKey;
  onClick?: () => void;
}

const GROUPS_STORAGE_KEY = 'ydo_sidebar_groups_v1';
const HIDE_AMOUNTS_STORAGE_KEY = 'ydo_sidebar_hide_amounts_v1';

const getGroupForView = (view: AppView): GroupKey => {
  if (view === 'dashboard' || view === 'sales' || view === 'pos') return 'main';
  if (view === 'udhar' || view === 'expenses' || view === 'analytics') return 'accounts';
  return 'inventory';
};

const formatBadgeCount = (count: number): string => (count > 99 ? '99+' : String(count));

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenPhotoDatabase
}) => {
  const { activeView, setActiveView, metrics } = useStore();
  const { t, tr } = useLanguage();
  const { user, role, setRole, signOut } = useAuth();

  // Collapsible group state persisted in localStorage
  // Default: all open on desktop (>=1024px); only active route's group open on mobile
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Record<GroupKey, boolean>>;
        if (
          typeof parsed.main === 'boolean' &&
          typeof parsed.inventory === 'boolean' &&
          typeof parsed.accounts === 'boolean'
        ) {
          return {
            main: parsed.main,
            inventory: parsed.inventory,
            accounts: parsed.accounts
          };
        }
      }
    } catch {
      // ignore storage errors
    }

    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
    if (isDesktop) {
      return { main: true, inventory: true, accounts: true };
    }
    const activeGroup = getGroupForView(activeView);
    return {
      main: activeGroup === 'main',
      inventory: activeGroup === 'inventory',
      accounts: activeGroup === 'accounts'
    };
  });

  // Counter privacy toggle for summary amounts (remembered in localStorage)
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_AMOUNTS_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Profile popover + Sign Out confirm state
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const profilePopoverRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const toggleGroup = (key: GroupKey) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleHideAmounts = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHideAmounts((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HIDE_AMOUNTS_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Ensure active route's group is open when navigating & auto-close mobile drawer on route change
  const prevActiveViewRef = useRef<AppView>(activeView);
  useEffect(() => {
    if (prevActiveViewRef.current !== activeView) {
      prevActiveViewRef.current = activeView;
      if (isMobileOpen) {
        onCloseMobile();
      }
    }
    if (activeView === 'settings' || activeView === 'pos') return;
    const activeGroup = getGroupForView(activeView);
    setOpenGroups((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
  }, [activeView, isMobileOpen, onCloseMobile]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (!isMobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileOpen]);

  // Close profile popover on outside click
  useEffect(() => {
    if (!isProfilePopoverOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (profilePopoverRef.current && !profilePopoverRef.current.contains(e.target as Node)) {
        setIsProfilePopoverOpen(false);
        setConfirmSignOut(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isProfilePopoverOpen]);

  // Escape key closes profile popover first, then mobile drawer
  useEffect(() => {
    if (!isProfilePopoverOpen && !isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isProfilePopoverOpen) {
        setIsProfilePopoverOpen(false);
        setConfirmSignOut(false);
      } else if (isMobileOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfilePopoverOpen, isMobileOpen, onCloseMobile]);

  // Active User display name: Nikhil Sakhare (Owner) vs Nilesh Sakhare (Admin)
  const currentUserName =
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil Sakhare'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh Sakhare'
      : user?.user_metadata?.full_name || 'Nikhil Sakhare';

  const isOwnerUser =
    !user?.email ||
    user.email.toLowerCase() === 'yogeshwaridairy9896@gmail.com' ||
    user.email.toLowerCase().includes('yogeshwari') ||
    user.email.toLowerCase().includes('owner') ||
    (user.user_metadata?.role === 'Owner' && !user.email.toLowerCase().includes('nilu'));

  const expiringActionCount =
    (metrics.expiredBatchesCount || 0) +
    (metrics.expiringTodayBatchesCount || 0) +
    (metrics.expiringTomorrowBatchesCount || 0) +
    (metrics.expiring3DaysBatchesCount || 0);

  const navItems: SidebarNavItem[] = useMemo(() => {
    const items: SidebarNavItem[] = [
      // GROUP 1: OPERATIONS
      {
        id: 'dashboard',
        label: t('dashboard'),
        icon: House,
        group: 'main'
      },
      {
        id: 'sales',
        label: t('dailySalesNav'),
        icon: ReceiptIndianRupee,
        group: 'main'
      },

      // GROUP 2: INVENTORY & BUY (daily-use first, rare items last)
      {
        id: 'inventory',
        label: t('inventoryNav'),
        icon: Package,
        group: 'inventory'
      },
      {
        id: 'purchases',
        label: t('purchasesNav'),
        icon: Truck,
        group: 'inventory'
      },
      {
        id: 'expiry',
        label: t('expiryNav'),
        icon: ShieldAlert,
        badgeCount: expiringActionCount > 0 ? expiringActionCount : undefined,
        badgeTone: metrics.expiredBatchesCount > 0 ? 'danger' : 'warning',
        group: 'inventory'
      },
      {
        id: 'reorder',
        label: t('stockNeedNav'),
        icon: AlertCircle,
        badgeCount: metrics.lowStockCount > 0 ? metrics.lowStockCount : undefined,
        badgeTone: 'danger',
        group: 'inventory'
      },
      {
        id: 'damages',
        label: t('damagesNav'),
        icon: PackageX,
        group: 'inventory'
      },
      {
        id: 'returns',
        label: t('returnsNav'),
        icon: RotateCcw,
        group: 'inventory'
      }
    ];

    if (onOpenPhotoDatabase) {
      items.push({
        id: 'photo-db',
        label: tr('Photo Database', 'फोटो डेटाबेस', 'फोटो डेटाबेस'),
        tooltip: tr(
          'Photo Database (Images & Barcodes)',
          'फोटो डेटाबेस (फोटो और बारकोड)',
          'फोटो डेटाबेस (फोटो आणि बारकोड)'
        ),
        icon: Camera,
        group: 'inventory',
        onClick: onOpenPhotoDatabase
      });
    }

    // GROUP 3: ACCOUNTS & REPORTS
    items.push(
      {
        id: 'udhar',
        label: t('udharNav'),
        icon: BookOpen,
        group: 'accounts'
      },
      {
        id: 'expenses',
        label: tr('Expenses', 'खर्च', 'खर्च'),
        tooltip: tr('Rent, Electricity, Fuel', 'किराया, बिजली बिल व ईंधन', 'भाडे, वीज बिल व इंधन'),
        icon: Fuel,
        group: 'accounts'
      },
      {
        id: 'analytics',
        label: t('analyticsNav'),
        icon: TrendingUp,
        group: 'accounts'
      }
    );

    return items;
  }, [t, tr, expiringActionCount, metrics.expiredBatchesCount, metrics.lowStockCount, onOpenPhotoDatabase]);

  const handleNavigate = (view: AppView, isMobileDrawer: boolean) => {
    setActiveView(view);
    setIsProfilePopoverOpen(false);
    setConfirmSignOut(false);
    if (isMobileDrawer) onCloseMobile();
  };

  // Touch swipe-left to close mobile drawer
  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (!isMobileOpen || e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (!isMobileOpen || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (dx < -56 && dy < 80) {
      onCloseMobile();
    }
  };

  const renderGroup = (groupKey: GroupKey, title: string, isMobileDrawer: boolean) => {
    const rail = !isMobileDrawer && isCollapsed;
    const items = navItems.filter((item) => item.group === groupKey);
    const isOpen = rail ? true : openGroups[groupKey];

    return (
      <div key={groupKey} className="space-y-0.5">
        {!rail ? (
          <button
            type="button"
            onClick={() => toggleGroup(groupKey)}
            aria-expanded={isOpen}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#7E968C] hover:text-slate-700 dark:hover:text-[#B3C8BF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer"
          >
            <span className="truncate">{title}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                isOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>
        ) : (
          <div className="h-px bg-slate-200/80 dark:bg-[#22332D] my-2 mx-2" />
        )}

        {isOpen && (
          <div className="space-y-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.id !== 'photo-db' && activeView === item.id;
              const hasBadge = typeof item.badgeCount === 'number' && item.badgeCount > 0;
              const badgeClass =
                item.badgeTone === 'warning'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30';
              const dotClass = item.badgeTone === 'warning' ? 'bg-amber-500' : 'bg-rose-500';

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  title={item.tooltip || item.label}
                  onClick={() => {
                    if (item.onClick) {
                      if (isMobileDrawer) onCloseMobile();
                      item.onClick();
                    } else if (item.id !== 'photo-db') {
                      handleNavigate(item.id, isMobileDrawer);
                    }
                  }}
                  className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-150 motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer group ${
                    rail ? 'justify-center px-0' : 'justify-between px-3'
                  } ${
                    isActive
                      ? 'bg-emerald-500/[0.12] dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold'
                      : 'text-slate-700 dark:text-[#A3B8AF] hover:bg-slate-100 dark:hover:bg-[#162520] hover:text-slate-900 dark:hover:text-[#E7F0EC] font-medium'
                  }`}
                >
                  {/* 3px Left Accent Bar for Active Item */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-emerald-500"
                    />
                  )}

                  <div className={`flex items-center ${rail ? 'justify-center' : 'gap-3 min-w-0 flex-1'}`}>
                    <span className="relative shrink-0">
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-[#8FA69C] group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                        }`}
                      />
                      {rail && hasBadge && (
                        <span
                          aria-hidden="true"
                          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#0F1A17] ${dotClass}`}
                        />
                      )}
                    </span>

                    {!rail && (
                      <span className="text-[14px] leading-none truncate">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {!rail && hasBadge && item.badgeCount !== undefined && (
                    <span
                      className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums leading-none ${badgeClass}`}
                    >
                      {formatBadgeCount(item.badgeCount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSidebarInner = (isMobileDrawer = false) => {
    const rail = !isMobileDrawer && isCollapsed;
    const isPosActive = activeView === 'pos';
    const isSettingsActive = activeView === 'settings';
    const formattedProfit = hideAmounts ? '••••' : `₹${metrics.netProfit.toLocaleString('en-IN')}`;
    const formattedCredit = hideAmounts ? '••••' : `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}`;

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* 1. FIXED HEADER: Logo + Yogeshwari Dairy + POS badge + Collapse / Close */}
        <div
          className={`shrink-0 h-14 px-3 border-b border-slate-200/80 dark:border-[#1E2E28] flex items-center ${
            rail ? 'justify-center' : 'justify-between gap-2'
          }`}
        >
          {!rail ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white p-0.5 border border-emerald-500/40 shrink-0 overflow-hidden">
                  <img
                    src={ydoLogo}
                    alt="Yogeshwari Dairy"
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith('/YDO_logo.png')) {
                        target.src = '/YDO_logo.png';
                      }
                    }}
                  />
                </div>
                <div className="min-w-0 flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
                    {tr('Yogeshwari Dairy', 'योगेश्वरी डेयरी', 'योगेश्वरी डेअरी')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                    POS
                  </span>
                </div>
              </div>

              {/* Desktop Collapse Toggle */}
              {!isMobileDrawer && onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label={tr('Collapse sidebar', 'साइडबार छोटा करें', 'साइडबार लहान करा')}
                  title={tr('Collapse sidebar', 'साइडबार छोटा करें', 'साइडबार लहान करा')}
                  className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center text-slate-500 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#162520] hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer shrink-0"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}

              {/* Mobile Close Button */}
              {isMobileDrawer && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label={tr('Close navigation menu', 'मेनू बंद करें', 'मेनू बंद करा')}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#162520] hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer shrink-0 lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={tr('Expand sidebar', 'साइडबार बड़ा करें', 'साइडबार मोठा करा')}
              title={tr('Expand sidebar', 'साइडबार बड़ा करें', 'साइडबार मोठा करा')}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#162520] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. PRIMARY ACTION: Prominent Emerald Counter Billing CTA with F2 Key Hint */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <button
            type="button"
            aria-current={isPosActive ? 'page' : undefined}
            title={`${t('quickPos')} (F2)`}
            onClick={() => handleNavigate('pos', isMobileDrawer)}
            className={`w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center transition-all duration-150 motion-reduce:transition-none active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0F1A17] cursor-pointer ${
              rail ? 'justify-center px-0' : 'justify-between px-3'
            } ${isPosActive ? 'ring-2 ring-emerald-400/60' : ''}`}
          >
            <span className={`flex items-center ${rail ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
              <ShoppingCart className="w-5 h-5 shrink-0" />
              {!rail && <span className="text-[14px] truncate">{t('quickPos')}</span>}
            </span>
            {!rail && (
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-mono font-bold leading-none shrink-0">
                F2
              </kbd>
            )}
          </button>
        </div>

        {/* 3. SCROLLABLE NAV GROUPS (slim hidden-style scrollbar) */}
        <nav
          aria-label={tr('Primary navigation', 'मुख्य नेविगेशन', 'मुख्य नेव्हिगेशन')}
          className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5 space-y-3 no-scrollbar"
        >
          {renderGroup('main', t('navSectionMain'), isMobileDrawer)}
          {renderGroup('inventory', t('navSectionInventory'), isMobileDrawer)}
          {renderGroup('accounts', t('navSectionAccounts'), isMobileDrawer)}
        </nav>

        {/* 4. PINNED SETTINGS ITEM AT BOTTOM OF NAV AREA */}
        <div className="shrink-0 px-3 py-2 border-t border-slate-200/80 dark:border-[#1E2E28]">
          <button
            type="button"
            aria-current={isSettingsActive ? 'page' : undefined}
            title={tr('Settings', 'सेटिंग्स', 'सेटिंग्ज')}
            onClick={() => handleNavigate('settings', isMobileDrawer)}
            className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-150 motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer group ${
              rail ? 'justify-center px-0' : 'gap-3 px-3'
            } ${
              isSettingsActive
                ? 'bg-emerald-500/[0.12] dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold'
                : 'text-slate-700 dark:text-[#A3B8AF] hover:bg-slate-100 dark:hover:bg-[#162520] hover:text-slate-900 dark:hover:text-[#E7F0EC] font-medium'
            }`}
          >
            {isSettingsActive && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-emerald-500"
              />
            )}
            <Settings
              className={`w-5 h-5 shrink-0 transition-colors ${
                isSettingsActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-[#8FA69C] group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
              }`}
            />
            {!rail && (
              <span className="text-[14px] leading-none truncate">
                {tr('Settings', 'सेटिंग्स', 'सेटिंग्ज')}
              </span>
            )}
          </button>
        </div>

        {/* 5. SIMPLIFIED BOTTOM AREA: Slim 2-Line Summary + Single Compact Profile Row with Popover */}
        <div
          className={`shrink-0 px-3 pt-2 border-t border-slate-200/80 dark:border-[#1E2E28] space-y-2 ${
            isMobileDrawer ? 'pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]' : 'pb-3'
          }`}
        >
          {/* Slim 2-Line Summary Row (Tap opens Dashboard; Eye toggles counter privacy) */}
          {!rail && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleNavigate('dashboard', isMobileDrawer)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigate('dashboard', isMobileDrawer);
                }
              }}
              aria-label={tr(
                'Open Dashboard summary',
                'डैशबोर्ड सारांश खोलें',
                'डॅशबोर्ड सारांश उघडा'
              )}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#131F1B] hover:bg-slate-100/90 dark:hover:bg-[#162520] border border-slate-200/80 dark:border-[#22332D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 text-[12px] leading-tight">
                <span className="text-slate-500 dark:text-[#8FA69C] truncate">
                  {t('todayNetProfit')}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formattedProfit}
                  </span>
                  <button
                    type="button"
                    onClick={toggleHideAmounts}
                    aria-label={
                      hideAmounts
                        ? tr('Show summary amounts', 'राशि दिखाएं', 'रक्कम दाखवा')
                        : tr('Hide summary amounts', 'राशि छुपाएं', 'रक्कम लपवा')
                    }
                    title={
                      hideAmounts
                        ? tr('Show amounts', 'राशि दिखाएं', 'रक्कम दाखवा')
                        : tr('Hide amounts', 'राशि छुपाएं', 'रक्कम लपवा')
                    }
                    className="w-6 h-6 -mr-1 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1E312B] transition-colors cursor-pointer"
                  >
                    {hideAmounts ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12px] leading-tight mt-1">
                <span className="text-slate-500 dark:text-[#8FA69C] truncate">
                  {t('totalDueCredit')}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0 pr-5">
                  {formattedCredit}
                </span>
              </div>
            </div>
          )}

          {/* ONE Compact Profile Row + Upward Popover for Role Switch & Confirmed Sign Out */}
          <div className="relative" ref={profilePopoverRef}>
            <button
              type="button"
              onClick={() => {
                setIsProfilePopoverOpen((prev) => !prev);
                setConfirmSignOut(false);
              }}
              aria-expanded={isProfilePopoverOpen}
              aria-haspopup="menu"
              aria-label={tr(
                'Open profile, role switcher, and sign out menu',
                'प्रोफ़ाइल, भूमिका बदलें और साइन आउट मेनू खोलें',
                'प्रोफाइल, भूमिका बदला आणि साइन आउट मेनू उघडा'
              )}
              title={`${currentUserName} • ${
                role === 'Owner'
                  ? tr('Shop Owner', 'दुकान मालिक', 'दुकान मालक')
                  : tr('Counter 1 (Admin)', 'काउंटर 1 (एडमिन)', 'काउंटर १ (अॅडमिन)')
              }`}
              className={`w-full h-12 rounded-xl flex items-center border border-slate-200/80 dark:border-[#22332D] bg-slate-50/90 dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#162520] transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 cursor-pointer ${
                rail ? 'justify-center px-0' : 'justify-between px-2.5 gap-2'
              }`}
            >
              <div className={`flex items-center ${rail ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                <div className="relative shrink-0">
                  {role === 'Owner' ? (
                    <img
                      src={nikhilAvatar}
                      alt={currentUserName}
                      className="w-8 h-8 rounded-full object-cover border border-amber-400/90"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-500/30">
                      🛡️
                    </div>
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#131F1B]"
                  />
                </div>

                {!rail && (
                  <div className="min-w-0 text-left">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-[#E7F0EC] truncate leading-tight">
                      {currentUserName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate leading-tight mt-0.5">
                      {role === 'Owner'
                        ? tr('Shop Owner', 'दुकान मालिक', 'दुकान मालक')
                        : tr('Counter 1 (Admin)', 'काउंटर 1 (एडमिन)', 'काउंटर १ (अॅडमिन)')}
                    </p>
                  </div>
                )}
              </div>

              {!rail && (
                <ChevronsUpDown className="w-4 h-4 text-slate-400 dark:text-[#7E968C] shrink-0" />
              )}
            </button>

            {/* Profile Popover (Role Switcher + Separated Confirmed Sign Out) */}
            {isProfilePopoverOpen && (
              <div
                role="menu"
                aria-label={tr('Account and role menu', 'खाता और भूमिका मेनू', 'खाते आणि भूमिका मेनू')}
                className={`absolute z-[60] bottom-[calc(100%+8px)] ${
                  rail ? 'left-0 w-60' : 'left-0 right-0'
                } rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] shadow-xl p-2 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 motion-reduce:animate-none`}
              >
                <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#7E968C]">
                  {tr('Switch Role', 'भूमिका बदलें', 'भूमिका बदला')}
                </div>

                <div className="space-y-1">
                  {isOwnerUser && (
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={role === 'Owner'}
                      onClick={() => {
                        setRole('Owner', null);
                        setIsProfilePopoverOpen(false);
                        setConfirmSignOut(false);
                        if (isMobileDrawer) onCloseMobile();
                      }}
                      className={`w-full min-h-[40px] px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold transition-colors cursor-pointer ${
                        role === 'Owner'
                          ? 'bg-emerald-500/[0.12] dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30'
                          : 'text-slate-700 dark:text-[#A3B8AF] hover:bg-slate-100 dark:hover:bg-[#1A2A25] border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <img
                          src={nikhilAvatar}
                          alt="Nikhil Sakhare"
                          className="w-5 h-5 rounded-full object-cover border border-amber-400 shrink-0"
                        />
                        <span className="truncate">Nikhil Sakhare ({tr('Owner', 'मालिक', 'मालक')})</span>
                      </span>
                      {role === 'Owner' && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={role === 'Admin'}
                    onClick={() => {
                      setRole('Admin', 1);
                      setIsProfilePopoverOpen(false);
                      setConfirmSignOut(false);
                      if (isMobileDrawer) onCloseMobile();
                    }}
                    className={`w-full min-h-[40px] px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold transition-colors cursor-pointer ${
                      role === 'Admin'
                        ? 'bg-emerald-500/[0.12] dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30'
                        : 'text-slate-700 dark:text-[#A3B8AF] hover:bg-slate-100 dark:hover:bg-[#1A2A25] border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-[11px] shrink-0">
                        🛡️
                      </span>
                      <span className="truncate">Nilesh Sakhare ({tr('Admin', 'एडमिन', 'अॅडमिन')})</span>
                    </span>
                    {role === 'Admin' && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                </div>

                {/* Separated Sign Out with Two-Step Confirmation */}
                <div className="pt-1.5 border-t border-slate-200/80 dark:border-[#24352F]">
                  {!confirmSignOut ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setConfirmSignOut(true)}
                      className="w-full min-h-[40px] px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>{tr('Sign Out', 'साइन आउट', 'साइन आउट')}</span>
                    </button>
                  ) : (
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 space-y-2">
                      <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-200">
                        {tr(
                          'Sign out of this counter?',
                          'क्या आप इस काउंटर से साइन आउट करना चाहते हैं?',
                          'या काऊंटरवरून बाहेर पडायचे का?'
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmSignOut(false)}
                          className="h-8 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] text-[11px] font-semibold cursor-pointer"
                        >
                          {tr('Cancel', 'रद्द करें', 'रद्द करा')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmSignOut(false);
                            setIsProfilePopoverOpen(false);
                            if (isMobileDrawer) onCloseMobile();
                            signOut();
                          }}
                          className="h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          {tr('Sign Out', 'साइन आउट', 'बाहेर पडा')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Dark Scrim (no heavy blur) */}
      {isMobileOpen && (
        <div
          aria-hidden="true"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden animate-in fade-in duration-200 motion-reduce:animate-none"
        />
      )}

      {/* Sidebar: w-[272px] drawer on mobile, w-[260px] or w-[72px] rail on desktop */}
      <aside
        aria-label={tr('Sidebar navigation', 'साइडबार नेविगेशन', 'साइडबार नेव्हिगेशन')}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed inset-y-0 left-0 z-50 lg:static flex flex-col bg-white dark:bg-[#0F1A17] border-r border-slate-200/90 dark:border-[#1E2E28] shrink-0 h-full overflow-visible transition-transform lg:transition-[width] duration-[250ms] ease-out motion-reduce:transition-none ${
          isMobileOpen
            ? 'translate-x-0 w-[272px] max-w-[85vw] shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}`}
      >
        {renderSidebarInner(isMobileOpen)}
      </aside>
    </>
  );
};
