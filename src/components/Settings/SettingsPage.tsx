import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserPlus,
  Activity,
  Sun,
  Moon,
  ScanLine,
  Download,
  Image as ImageIcon,
  HeartPulse,
  Lock,
  LogOut,
  RefreshCw
} from 'lucide-react';
import nikhilAvatar from '../../assets/nikhil_avatar.png';
import { useStore } from '../../context/StoreContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isMobileDevice, requestMotionPermission } from '../../hooks/useShakeDetector';
import {
  isRegistrationAllowedSync,
  setRegistrationSetting,
  subscribeToRegistrationSetting,
  syncRegistrationSettingFromCloud
} from '../../lib/registrationConfig';
import {
  isAuditStreamEnabledSync,
  setAuditStreamEnabled,
  subscribeToAuditStreamSetting
} from '../../lib/auditStreamConfig';
import {
  SettingSection,
  SettingRow,
  ToggleSwitch
} from './SettingsPrimitives';

interface SettingsPageProps {
  onOpenChangePasscode: () => void;
  onOpenPhotoDatabase: () => void;
  onOpenImageHealth?: () => void;
  onOpenAppDownload: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onOpenChangePasscode,
  onOpenPhotoDatabase,
  onOpenImageHealth,
  onOpenAppDownload
}) => {
  const {
    products,
    refreshData,
    isSyncing,
    triggerGlobalBillingScanner
  } = useStore();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, role, lockSecurity, signOut } = useAuth();

  // Security Controls (Registration & Audit Stream)
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<boolean>(() => isRegistrationAllowedSync());
  const [isUpdatingReg, setIsUpdatingReg] = useState(false);
  const [regFeedback, setRegFeedback] = useState<string | null>(null);
  const [isAuditStreamEnabled, setIsAuditStreamEnabledState] = useState<boolean>(() => isAuditStreamEnabledSync());

  // Shake-to-Scan setting
  const [shakeToScanEnabled, setShakeToScanEnabled] = useLocalStorage<boolean>('ydo_shake_to_scan_enabled', true);

  useEffect(() => {
    syncRegistrationSettingFromCloud().then(setIsRegistrationAllowed).catch(() => {});
    const unsubReg = subscribeToRegistrationSetting(setIsRegistrationAllowed);
    const unsubAudit = subscribeToAuditStreamSetting(setIsAuditStreamEnabledState);
    return () => {
      unsubReg();
      unsubAudit();
    };
  }, []);

  // Count products missing or with invalid image URLs from existing store state (zero extra queries)
  const imageIssueCount = useMemo(() => {
    return products.reduce((count, prod) => {
      const url = (prod.image_url || '').trim();
      const hasValidUrl = /^https?:\/\//i.test(url);
      return hasValidUrl ? count : count + 1;
    }, 0);
  }, [products]);

  const currentUserName =
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil Sakhare'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh Sakhare'
      : (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name
          : 'Nikhil Sakhare');

  const roleLabel = role === 'Owner' ? 'Owner' : 'Operator';

  const handleToggleRegistration = async () => {
    if (role !== 'Owner' || isUpdatingReg) return;
    setIsUpdatingReg(true);
    setRegFeedback(null);
    const nextVal = !isRegistrationAllowed;
    try {
      const res = await setRegistrationSetting(
        nextVal,
        role,
        user?.email || 'yogeshwaridairy9896@gmail.com',
        typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name
          ? user.user_metadata.full_name
          : 'Nikhil Sakhare (Shop Owner)'
      );
      if (res.success) {
        setIsRegistrationAllowed(nextVal);
        setRegFeedback(nextVal ? 'Operator registration enabled' : 'Operator registration disabled');
      } else {
        setRegFeedback(res.error || 'Error updating setting');
      }
    } finally {
      setIsUpdatingReg(false);
    }
  };

  const handleToggleAuditStream = () => {
    if (role !== 'Owner') return;
    const nextVal = !isAuditStreamEnabled;
    setAuditStreamEnabled(nextVal);
    setIsAuditStreamEnabledState(nextVal);
  };

  const handleToggleShakeScanner = async () => {
    const nextEnabled = !shakeToScanEnabled;
    setShakeToScanEnabled(nextEnabled);
    if (nextEnabled) {
      try {
        await requestMotionPermission();
      } catch {
        // Non-blocking on Android Chrome
      }
    }
  };

  const handleTestShakeScanner = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80]);
      } catch {
        // Ignore unsupported vibration API errors
      }
    }
    triggerGlobalBillingScanner();
  };

  const registrationSubtitle = regFeedback
    ? regFeedback
    : role !== 'Owner'
    ? 'Only Shop Owner can change this'
    : isRegistrationAllowed
    ? 'Enabled (ON)'
    : 'Disabled (OFF)';

  const shakeSubtitle = shakeToScanEnabled
    ? isMobileDevice()
      ? 'Active — shake phone to open scanner'
      : 'Enabled on mobile devices'
    : 'Turned OFF — phone shake disabled';

  return (
    <div className="-mx-2.5 -mt-2.5 sm:-mx-6 sm:-mt-6 min-h-full bg-slate-50 dark:bg-[#0B1210]">
      {/* Sticky Page Header Bar with Sync Button */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#24352F]">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
              Settings & Security
            </h1>
          </div>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              if (!isSyncing) refreshData();
            }}
            aria-label="Sync Database"
            className="h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10">
        {/* Compact Profile Summary Card + Quick Counter Actions */}
        <section
          aria-label="Profile Summary"
          className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-sm p-4 space-y-3.5"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 shrink-0">
              <img
                src={nikhilAvatar}
                alt={currentUserName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-slate-900 dark:text-[#E7F0EC] truncate">
                {currentUserName}
              </div>
              <div className="flex items-center gap-2 mt-0.5 min-w-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                  {roleLabel}
                </span>
                {user?.email && (
                  <span className="text-xs text-slate-500 dark:text-[#8FA69C] truncate">
                    {user.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lock Counter & Logout Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => lockSecurity()}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50/60 hover:bg-amber-100/80 dark:bg-amber-950/25 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span className="truncate">Lock Counter</span>
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-red-300 dark:border-rose-800/70 bg-red-50/60 hover:bg-red-100/80 dark:bg-rose-950/25 dark:hover:bg-rose-950/50 text-red-700 dark:text-rose-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="truncate">Logout</span>
            </button>
          </div>
        </section>

        {/* SECTION 1: SECURITY */}
        <SettingSection title="SECURITY">
          <SettingRow
            icon={<KeyRound className="w-5 h-5" />}
            tone="emerald"
            title="Change Master Passcode"
            subtitle="8-digit passcode"
            onClick={onOpenChangePasscode}
            showChevron
          />

          <SettingRow
            icon={<UserPlus className="w-5 h-5" />}
            tone="emerald"
            title="New Operator Registration"
            subtitle={registrationSubtitle}
            onClick={role === 'Owner' && !isUpdatingReg ? () => void handleToggleRegistration() : undefined}
            disabled={role !== 'Owner' || isUpdatingReg}
            rightContent={
              <ToggleSwitch
                checked={isRegistrationAllowed}
                onChange={() => void handleToggleRegistration()}
                disabled={role !== 'Owner' || isUpdatingReg}
                ariaLabel="New Operator Registration"
              />
            }
          />

          <SettingRow
            icon={<Activity className="w-5 h-5" />}
            tone="amber"
            title="Live Audit Stream"
            subtitle={isAuditStreamEnabled ? 'Active (ON)' : 'Paused (OFF)'}
            onClick={role === 'Owner' ? handleToggleAuditStream : undefined}
            disabled={role !== 'Owner'}
            rightContent={
              <ToggleSwitch
                checked={isAuditStreamEnabled}
                onChange={handleToggleAuditStream}
                disabled={role !== 'Owner'}
                ariaLabel="Live Audit Stream"
              />
            }
          />
        </SettingSection>

        {/* SECTION 2: PREFERENCES */}
        <SettingSection title="PREFERENCES">
          <SettingRow
            icon={
              resolvedTheme === 'dark' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )
            }
            tone={resolvedTheme === 'dark' ? 'emerald' : 'amber'}
            title="Display Theme"
            subtitle={
              resolvedTheme === 'dark'
                ? 'Currently using Dark Mode'
                : 'Currently using Light Mode'
            }
            onClick={toggleTheme}
            rightContent={
              <ToggleSwitch
                checked={resolvedTheme === 'dark'}
                onChange={toggleTheme}
                ariaLabel="Toggle Display Theme"
              />
            }
          />
        </SettingSection>

        {/* SECTION 3: POS TOOLS */}
        <SettingSection title="POS TOOLS">
          <SettingRow
            icon={<ScanLine className="w-5 h-5" />}
            tone="emerald"
            title="Shake to Open Scanner"
            subtitle={shakeSubtitle}
            onClick={() => void handleToggleShakeScanner()}
            rightContent={
              <ToggleSwitch
                checked={shakeToScanEnabled}
                onChange={() => void handleToggleShakeScanner()}
                ariaLabel="Shake to Open Scanner"
              />
            }
          />

          <SettingRow
            icon={<ScanLine className="w-5 h-5" />}
            tone="amber"
            title="Test Shake Scanner"
            onClick={handleTestShakeScanner}
            showChevron
          />

          <SettingRow
            icon={<Download className="w-5 h-5" />}
            tone="emerald"
            title="Install App"
            onClick={onOpenAppDownload}
            showChevron
          />
        </SettingSection>

        {/* SECTION 4: DATA & PHOTOS */}
        <SettingSection title="DATA & PHOTOS">
          <SettingRow
            icon={<ImageIcon className="w-5 h-5" />}
            tone="emerald"
            title="Product Photo Database"
            subtitle="Audit & update packshots"
            onClick={onOpenPhotoDatabase}
            showChevron
          />

          {onOpenImageHealth && (role === 'Owner' || role === 'Admin') && (
            <SettingRow
              icon={<HeartPulse className="w-5 h-5" />}
              tone={imageIssueCount > 0 ? 'amber' : 'emerald'}
              title="Product Image Health"
              subtitle="Fix missing, broken, or non-square product photos"
              onClick={onOpenImageHealth}
              badgeCount={imageIssueCount}
              showChevron
            />
          )}
        </SettingSection>
      </div>
    </div>
  );
};
