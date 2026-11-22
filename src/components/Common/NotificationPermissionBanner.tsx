// ============================================================================
// YOGESHWARI DAIRY SHOP - NOTIFICATION & SOUND PERMISSION BANNER
// File: src/components/Common/NotificationPermissionBanner.tsx
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  onNotificationPermissionChange,
  NotificationStatus,
} from '../../services/notificationService';

interface NotificationPermissionBannerProps {
  className?: string;
  onPermissionGranted?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  className = '',
  onPermissionGranted,
}) => {
  const [permission, setPermission] = useState<NotificationStatus>(() => getNotificationPermission());
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ydo_notif_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [isJustGranted, setIsJustGranted] = useState<boolean>(false);

  useEffect(() => {
    // Sync current status
    setPermission(getNotificationPermission());

    const unsubscribe = onNotificationPermissionChange((newStatus) => {
      setPermission(newStatus);
      if (newStatus === 'granted') {
        setIsJustGranted(true);
        if (onPermissionGranted) onPermissionGranted();
        setTimeout(() => setIsJustGranted(false), 4000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onPermissionGranted]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const res = await requestNotificationPermission();
      setPermission(res);
      if (res === 'granted') {
        setIsJustGranted(true);
        if (onPermissionGranted) onPermissionGranted();
        setTimeout(() => setIsJustGranted(false), 4000);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('ydo_notif_banner_dismissed', 'true');
    } catch {}
  };

  // If already granted and not just granted, don't show
  if (permission === 'granted' && !isJustGranted) {
    return null;
  }

  // If user dismissed it for this session and not just granted
  if (isDismissed && !isJustGranted) {
    return null;
  }

  // If unsupported (e.g. archaic browser without Notification API)
  if (permission === 'unsupported') {
    return null;
  }

  // 1. Success confirmation state
  if (isJustGranted) {
    return (
      <div
        className={`p-3 rounded-2xl bg-emerald-500 text-white flex items-center justify-between gap-2 shadow-lg animate-fade-in ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-5 h-5 shrink-0 animate-bounce" />
          <p className="text-xs font-bold truncate">
            🔔 Order Notifications &amp; Sound Alerts are now active on this mobile!
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsJustGranted(false)}
          className="p-1 text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 2. Denied state (User or browser previously blocked notifications)
  if (permission === 'denied') {
    return (
      <div
        className={`p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-start justify-between gap-3 shadow-xs ${className}`}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <BellOff className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold">
              Notifications Blocked in Browser Settings
            </p>
            <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
              Mobile alert popups cannot be shown because permissions were blocked. Tap the <strong>🔒 icon</strong> in your browser address bar &rarr; <strong>Site settings &rarr; Notifications &rarr; Allow</strong>, then refresh.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3. Default state (Needs user tap to prompt native browser permission)
  return (
    <div
      className={`p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 text-white flex items-center justify-between gap-3 shadow-md animate-fade-in ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-white animate-bounce" />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-black tracking-tight leading-tight">
            Enable Order Alerts &amp; Notifications
          </p>
          <p className="text-[11px] text-amber-100 truncate">
            Get instant sound ring &amp; push notifications when orders arrive.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={isRequesting}
          onClick={handleRequestPermission}
          className="h-9 px-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 active:scale-95 text-xs font-black inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-75"
        >
          <Bell className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isRequesting ? 'Requesting...' : 'Allow (🔔)'}</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="w-8 h-8 rounded-xl text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
