import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  RefreshCw,
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Fingerprint,
  Trash2,
  Wifi,
  WifiOff,
  Vibrate,
  SlidersHorizontal,
  CloudUpload
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isMobileDevice, requestMotionPermission } from '../../hooks/useShakeDetector';
import { uploadUserProfilePhoto } from '../../lib/profilePhotoService';
import { formatFileSize } from '../../lib/productImageService';
import { isBiometricSupported } from '../../lib/biometricAuth';
import type { MasterUnlockMethod } from '../../lib/security';
import { getHapticSettings, saveHapticSettings, triggerHaptic, HapticMode } from '../../services/hapticService';
import { useNetworkSync } from '../../hooks/useNetworkSync';
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
import { CURRENT_APP_VERSION, CURRENT_BUILD_NUMBER } from '../../config/appVersion';

interface SettingsPageProps {
  onOpenChangePasscode: () => void;
  onOpenPhotoDatabase: () => void;
  onOpenImageHealth?: () => void;
  onOpenAppDownload: () => void;
  onCheckAppUpdate?: () => Promise<any>;
  isCheckingAppUpdate?: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onOpenChangePasscode,
  onOpenPhotoDatabase,
  onOpenImageHealth,
  onOpenAppDownload,
  onCheckAppUpdate,
  isCheckingAppUpdate = false
}) => {
  const {
    products,
    adminActivities,
    clearAdminActivities,
    refreshData,
    isSyncing,
    triggerGlobalBillingScanner
  } = useStore();
  const { resolvedTheme, toggleTheme } = useTheme();
  const {
    user,
    role,
    lockSecurity,
    signOut,
    avatarUrl,
    hasCustomAvatar,
    updateProfileAvatar,
    refreshProfileAvatars,
    masterLockEnabled,
    setMasterLockEnabled,
    unlockMethod,
    setUnlockMethod
  } = useAuth();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [confirmClearAudit, setConfirmClearAudit] = useState(false);
  const [isClearingAudit, setIsClearingAudit] = useState(false);
  const [auditClearFeedback, setAuditClearFeedback] = useState<string | null>(null);

  // Profile Photo Upload State (any raw size -> strictly <= 20 KB compressed)
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Security Controls (Registration & Audit Stream)
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<boolean>(() => isRegistrationAllowedSync());
  const [isUpdatingReg, setIsUpdatingReg] = useState(false);
  const [regFeedback, setRegFeedback] = useState<string | null>(null);
  const [isAuditStreamEnabled, setIsAuditStreamEnabledState] = useState<boolean>(() => isAuditStreamEnabledSync());

  // Shake-to-Scan setting
  const [shakeToScanEnabled, setShakeToScanEnabled] = useLocalStorage<boolean>('ydo_shake_to_scan_enabled', true);

  // Haptic & Vibration setting
  const [hapticConfig, setHapticConfig] = useState(getHapticSettings);
  const { isOnline, pendingCount, isSyncing: isOfflineSyncing, syncNow: syncOfflineNow } = useNetworkSync();

  const handleToggleHaptic = () => {
    const next = saveHapticSettings({ enabled: !hapticConfig.enabled });
    setHapticConfig(next);
    if (next.enabled) triggerHaptic('success');
  };

  const handleSelectHapticMode = (mode: HapticMode) => {
    const next = saveHapticSettings({ mode });
    setHapticConfig(next);
    triggerHaptic('tap');
  };

  const handleCustomDurationChange = (dur: number) => {
    const next = saveHapticSettings({ customDurationMs: dur, mode: 'custom' });
    setHapticConfig(next);
    triggerHaptic('tap');
  };

  useEffect(() => {
    syncRegistrationSettingFromCloud().then(setIsRegistrationAllowed).catch(() => {});
    const unsubReg = subscribeToRegistrationSetting(setIsRegistrationAllowed);
    const unsubAudit = subscribeToAuditStreamSetting(setIsAuditStreamEnabledState);
    isBiometricSupported().then(setBiometricSupported).catch(() => setBiometricSupported(false));
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

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so selecting the same file again still triggers onChange
    e.target.value = '';
    if (!file || isUploadingAvatar) return;

    setIsUploadingAvatar(true);
    setAvatarStatus(null);
    try {
      const result = await uploadUserProfilePhoto({
        file,
        userEmail: user?.email || null,
        userRole: role,
        userId: user?.id || null
      });
      await updateProfileAvatar(result.avatarUrl);
      const origLabel = formatFileSize(result.compressed.originalBytes);
      const finalLabel = formatFileSize(result.compressed.compressedBytes);
      const fmtLabel = result.compressed.extension.toUpperCase();
      setAvatarStatus({
        type: 'success',
        message: result.syncedAcrossDevices
          ? `Synced across devices (${origLabel} → ${finalLabel} ${fmtLabel})`
          : `Updated (${origLabel} → ${finalLabel} ${fmtLabel})`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update profile photo. Please try another image.';
      setAvatarStatus({ type: 'error', message: msg });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleResetAvatar = async () => {
    if (isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    setAvatarStatus(null);
    try {
      await updateProfileAvatar(null);
      setAvatarStatus({
        type: 'success',
        message: 'Profile photo reset to default'
      });
    } catch {
      setAvatarStatus({
        type: 'error',
        message: 'Could not reset profile photo'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleClearAuditStream = async () => {
    if (role !== 'Owner' || isClearingAudit) return;
    setIsClearingAudit(true);
    setAuditClearFeedback(null);
    try {
      const res = await clearAdminActivities();
      setConfirmClearAudit(false);
      setAuditClearFeedback(
        res.error
          ? res.error
          : `Cleared ${res.deletedCount} audit log${res.deletedCount === 1 ? '' : 's'}`
      );
    } finally {
      setIsClearingAudit(false);
    }
  };

  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  const handleManualCheckUpdate = async () => {
    if (!onCheckAppUpdate || isCheckingAppUpdate) return;
    setUpdateFeedback('Checking for latest updates...');
    try {
      const res = await onCheckAppUpdate();
      if (!res?.hasUpdate) {
        setUpdateFeedback(`You are using the latest version (v${CURRENT_APP_VERSION}). No updates needed!`);
        setTimeout(() => setUpdateFeedback(null), 4500);
      } else {
        setUpdateFeedback(null);
      }
    } catch {
      setUpdateFeedback('Unable to check for updates. Please check connection.');
      setTimeout(() => setUpdateFeedback(null), 4500);
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
              if (!isSyncing) {
                refreshData();
                void refreshProfileAvatars();
              }
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
        {/* Compact Profile Summary Card + Profile Photo Updater + Quick Counter Actions */}
        <section
          aria-label="Profile Summary"
          className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-sm p-4 space-y-3.5"
        >
          <input
            ref={avatarInputRef}
            id="profile-avatar-upload"
            name="profile_avatar_upload"
            type="file"
            accept="image/*"
            onChange={(e) => void handleAvatarFileSelected(e)}
            className="hidden"
          />

          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="Update profile photo"
              title="Tap to update profile photo (auto-compressed to ≤20 KB)"
              className="relative w-14 h-14 rounded-full shrink-0 group focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer disabled:opacity-70"
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40">
                <img
                  src={avatarUrl}
                  alt={currentUserName}
                  className="w-full h-full object-cover"
                />
              </div>

              {isUploadingAvatar ? (
                <span className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </span>
              ) : (
                <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white border-2 border-white dark:border-[#131F1B] flex items-center justify-center shadow-xs transition">
                  <Camera className="w-3 h-3" />
                </span>
              )}
            </button>

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
              <p className="text-[11px] text-slate-400 dark:text-[#7E968C] mt-1 truncate">
                Any photo size auto-compressed to ≤20 KB
              </p>
            </div>
          </div>

          {/* Profile Photo Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Compressing to ≤20 KB...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>{hasCustomAvatar ? 'Change Profile Photo' : 'Update Profile Photo'}</span>
                </>
              )}
            </button>

            {hasCustomAvatar && (
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={() => void handleResetAvatar()}
                aria-label="Reset profile photo to default"
                title="Reset to default photo"
                className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#24352F] bg-slate-50 hover:bg-slate-100 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-600 dark:text-[#9DB2A9] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-60 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Live Compression / Upload Feedback */}
          {avatarStatus && (
            <div
              role="status"
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                avatarStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50'
                  : 'bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 border border-red-200/80 dark:border-rose-800/50'
              }`}
            >
              {avatarStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-rose-400" />
              )}
              <span className="min-w-0 truncate">{avatarStatus.message}</span>
            </div>
          )}

          {/* Lock Counter & Logout Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!masterLockEnabled}
              onClick={() => lockSecurity()}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50/60 hover:bg-amber-100/80 dark:bg-amber-950/25 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span className="truncate">{masterLockEnabled ? 'Lock Counter' : 'Lock is OFF'}</span>
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
            icon={<Lock className="w-5 h-5" />}
            tone={masterLockEnabled ? 'emerald' : 'amber'}
            title="Master Password Lock"
            subtitle={
              masterLockEnabled
                ? 'ON — Require unlock after login or idle'
                : 'OFF — Open app directly without lock screen'
            }
            onClick={() => setMasterLockEnabled(!masterLockEnabled)}
            rightContent={
              <ToggleSwitch
                checked={masterLockEnabled}
                onChange={() => setMasterLockEnabled(!masterLockEnabled)}
                ariaLabel="Master Password Lock"
              />
            }
          />

          {masterLockEnabled && (
            <div className="px-4 py-3.5 space-y-2.5 bg-white dark:bg-[#131F1B]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-slate-900 dark:text-[#E7F0EC] leading-snug">
                    Unlock Method
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#8FA69C] leading-snug">
                    {unlockMethod === 'fingerprint'
                      ? 'Unlock with mobile fingerprint (password fallback available)'
                      : unlockMethod === 'password'
                      ? 'Unlock using master password only'
                      : 'Unlock with mobile fingerprint or master password'}
                  </div>
                </div>
              </div>

              <div
                role="radiogroup"
                aria-label="Master password unlock method"
                className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0F1916] border border-slate-200/80 dark:border-[#24352F]"
              >
                {(
                  [
                    { id: 'password', label: 'Password' },
                    { id: 'fingerprint', label: 'Fingerprint' },
                    { id: 'both', label: 'Both' }
                  ] as Array<{ id: MasterUnlockMethod; label: string }>
                ).map((opt) => {
                  const active = unlockMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setUnlockMethod(opt.id)}
                      className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-[#9DB2A9] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 dark:text-[#7E968C]">
                {biometricSupported
                  ? '✓ Fingerprint / biometric sensor ready on this device.'
                  : 'Fingerprint unlocks automatically on mobile phones with a biometric sensor.'}
              </p>
            </div>
          )}

          <SettingRow
            icon={<KeyRound className="w-5 h-5" />}
            tone="emerald"
            title="Change Master Passcode"
            subtitle="Numeric digits passcode (any length)"
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

          {/* Delete / Clear Live Audit Stream Data (Owner only) */}
          {role === 'Owner' && (
            <div className="px-4 py-3.5 bg-white dark:bg-[#131F1B] space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-50 dark:bg-rose-950/50 text-red-600 dark:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-slate-900 dark:text-[#E7F0EC] leading-snug">
                      Delete Live Audit Stream Data
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#8FA69C] leading-snug">
                      {auditClearFeedback
                        ? auditClearFeedback
                        : `${adminActivities.length} audit log${adminActivities.length === 1 ? '' : 's'} currently stored`}
                    </div>
                  </div>
                </div>

                {!confirmClearAudit && (
                  <button
                    type="button"
                    disabled={isClearingAudit}
                    onClick={() => {
                      setAuditClearFeedback(null);
                      setConfirmClearAudit(true);
                    }}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-rose-300 text-xs font-bold transition active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    Clear Data
                  </button>
                )}
              </div>

              {confirmClearAudit && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-red-50/80 dark:bg-rose-950/35 border border-red-200 dark:border-rose-800/60">
                  <span className="text-[11px] font-semibold text-red-800 dark:text-rose-200">
                    Permanently delete all live audit logs?
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isClearingAudit}
                      onClick={() => setConfirmClearAudit(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isClearingAudit}
                      onClick={() => void handleClearAuditStream()}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      {isClearingAudit ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SettingSection>

        {/* SECTION 2: OFFLINE & CLOUD SYNC */}
        <SettingSection title="OFFLINE & CLOUD SYNC">
          <div className="p-4 bg-white dark:bg-[#131F1B] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isOnline 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                }`}>
                  {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-slate-900 dark:text-[#E7F0EC] leading-snug">
                    {isOnline ? 'Online (Connected to Cloud)' : 'Offline Mode Active'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#8FA69C]">
                    {pendingCount > 0 
                      ? `${pendingCount} action(s) waiting to sync` 
                      : 'All records synced with database'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isOfflineSyncing || (!isOnline && pendingCount === 0)}
                onClick={() => void syncOfflineNow()}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isOfflineSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Sync Now</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] leading-relaxed">
              When internet is disconnected, the app automatically works in offline mode. All billings, inventory stock, and returns are stored safely on your device and will auto-sync when network returns.
            </p>
          </div>
        </SettingSection>

        {/* SECTION 3: PREFERENCES & HAPTICS */}
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

        {/* SECTION 4: HAPTICS & VIBRATION */}
        <SettingSection title="HAPTICS & VIBRATION (व्हायब्रेशन सेटिंग)">
          <SettingRow
            icon={<Vibrate className="w-5 h-5" />}
            tone={hapticConfig.enabled ? 'emerald' : 'amber'}
            title="Vibration Feedback"
            subtitle={
              hapticConfig.enabled
                ? `ON — Mode: ${hapticConfig.mode.toUpperCase()}${hapticConfig.mode === 'custom' ? ` (${hapticConfig.customDurationMs}ms)` : ''}`
                : 'OFF — Haptic vibration disabled'
            }
            onClick={handleToggleHaptic}
            rightContent={
              <ToggleSwitch
                checked={hapticConfig.enabled}
                onChange={handleToggleHaptic}
                ariaLabel="Toggle Vibration Feedback"
              />
            }
          />

          {hapticConfig.enabled && (
            <div className="px-4 py-3.5 space-y-3 bg-white dark:bg-[#131F1B] border-t border-slate-100 dark:border-[#24352F]">
              <div className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC]">
                Feedback Intensity:
              </div>
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0F1916] border border-slate-200/80 dark:border-[#24352F]">
                {(['light', 'medium', 'strong', 'custom'] as HapticMode[]).map((m) => {
                  const isActive = hapticConfig.mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectHapticMode(m)}
                      className={`min-h-[34px] px-2 py-1 rounded-lg text-xs font-bold capitalize transition active:scale-95 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-[#9DB2A9] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {hapticConfig.mode === 'custom' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-[#8FA69C]">
                    <span>Custom Vibration Duration:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {hapticConfig.customDurationMs} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={hapticConfig.customDurationMs}
                    onChange={(e) => handleCustomDurationChange(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => triggerHaptic('tap')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#253932] text-xs font-bold text-slate-700 dark:text-[#E7F0EC] transition active:scale-95 cursor-pointer"
                >
                  ⚡ Test Vibration
                </button>
              </div>
            </div>
          )}
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

        </SettingSection>

        {/* SECTION 4: APP UPDATES & VERSION */}
        <SettingSection title="APP UPDATES & VERSION">
          <SettingRow
            icon={<RefreshCw className={`w-5 h-5 ${isCheckingAppUpdate ? 'animate-spin' : ''}`} />}
            tone="emerald"
            title="Check for App Updates"
            subtitle={
              updateFeedback 
                ? updateFeedback 
                : `Current: v${CURRENT_APP_VERSION} (Build ${CURRENT_BUILD_NUMBER}) • Tap to verify new APK`
            }
            onClick={handleManualCheckUpdate}
            showChevron
          />

          <SettingRow
            icon={<Download className="w-5 h-5" />}
            tone="teal"
            title="Download / Install Official APK"
            subtitle="Install official Yogeshwari Dairy app for Android"
            onClick={onOpenAppDownload}
            showChevron
          />
        </SettingSection>

        {/* SECTION 5: DATA & PHOTOS */}
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
