import { useState, useEffect, useCallback } from 'react';
import { Browser } from '@capacitor/browser';
import { 
  AppUpdateInfo, 
  CURRENT_APP_VERSION, 
  CURRENT_BUILD_NUMBER, 
  UPDATE_MANIFEST_URL, 
  LOCAL_MANIFEST_URL 
} from '../config/appVersion';
import { isNativePlatform } from './capacitorService';

const SNOOZE_STORAGE_KEY = 'yd_snoozed_update_version';
const SNOOZE_TIMESTAMP_KEY = 'yd_snoozed_update_timestamp';
const SNOOZE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Compare two semver-like strings (e.g. "1.0.1" vs "1.0.0")
 * Returns positive if v1 > v2, negative if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/i, '').split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = v2.replace(/^v/i, '').split('.').map(p => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  updateInfo: AppUpdateInfo | null;
  currentVersion: string;
  currentBuild: number;
  error?: string;
}

/**
 * Fetch remote version.json and check whether an update is available
 */
export async function fetchRemoteVersionInfo(forceCheck = false): Promise<CheckUpdateResult> {
  const fallbackResult: CheckUpdateResult = {
    hasUpdate: false,
    updateInfo: null,
    currentVersion: CURRENT_APP_VERSION,
    currentBuild: CURRENT_BUILD_NUMBER,
  };

  try {
    const urlsToTry = [
      `${UPDATE_MANIFEST_URL}?_t=${Date.now()}`,
      `${LOCAL_MANIFEST_URL}?_t=${Date.now()}`,
    ];

    let manifest: AppUpdateInfo | null = null;
    let fetchError: Error | null = null;

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const data = (await res.json()) as AppUpdateInfo;
          if (data && (data.versionName || data.versionCode)) {
            manifest = data;
            break;
          }
        }
      } catch (err) {
        fetchError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!manifest) {
      return {
        ...fallbackResult,
        error: fetchError ? fetchError.message : 'Unable to retrieve version manifest',
      };
    }

    // Determine if remote version is newer
    const isNewerBuild = manifest.versionCode > CURRENT_BUILD_NUMBER;
    const isNewerSemver = compareVersions(manifest.versionName, CURRENT_APP_VERSION) > 0;
    const isUpdateAvailable = isNewerBuild || isNewerSemver;

    // Check if user previously snoozed this version (and not a forced update)
    if (isUpdateAvailable && !manifest.forceUpdate && !forceCheck) {
      try {
        const snoozedVersion = localStorage.getItem(SNOOZE_STORAGE_KEY);
        const snoozedTime = parseInt(localStorage.getItem(SNOOZE_TIMESTAMP_KEY) || '0', 10);
        const now = Date.now();
        if (snoozedVersion === manifest.versionName && now - snoozedTime < SNOOZE_DURATION_MS) {
          return {
            ...fallbackResult,
            hasUpdate: false, // Snoozed
          };
        }
      } catch {
        // Ignore localStorage restrictions
      }
    }

    return {
      hasUpdate: isUpdateAvailable,
      updateInfo: isUpdateAvailable ? manifest : null,
      currentVersion: CURRENT_APP_VERSION,
      currentBuild: CURRENT_BUILD_NUMBER,
    };
  } catch (err) {
    return {
      ...fallbackResult,
      error: err instanceof Error ? err.message : 'Version check failed',
    };
  }
}

/**
 * Snooze the prompt for a specific version
 */
export function snoozeUpdatePrompt(versionName: string): void {
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, versionName);
    localStorage.setItem(SNOOZE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Trigger APK download and in-place upgrade.
 * On Android, downloading the APK and opening it invokes the system Package Installer,
 * which prompts: "Do you want to update this app? Your existing data will not be lost."
 */
export function startAppUpdate(apkUrl: string): void {
  if (typeof window === 'undefined') return;

  const targetUrl = apkUrl || 'https://yogeshwari-dairy-shop.vercel.app/downloads/yogeshwari-dairy.apk';

  if (isNativePlatform()) {
    // In Capacitor Android: Open system browser via native plugin to download APK
    Browser.open({ url: targetUrl }).catch((err) => {
      console.warn('Browser.open failed, fallback to location href:', err);
      window.location.href = targetUrl;
    });
  } else {
    // In Web / PWA: Trigger direct file download
    const anchor = document.createElement('a');
    anchor.href = targetUrl;
    anchor.setAttribute('download', 'yogeshwari-dairy.apk');
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}

/**
 * Custom React Hook for managing app updates across the entire application
 */
export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckError, setLastCheckError] = useState<string | null>(null);

  const checkNow = useCallback(async (manual = false): Promise<CheckUpdateResult> => {
    setIsChecking(true);
    setLastCheckError(null);
    try {
      const result = await fetchRemoteVersionInfo(manual);
      if (result.hasUpdate && result.updateInfo) {
        setUpdateInfo(result.updateInfo);
        setIsUpdateModalOpen(true);
      } else {
        if (manual) {
          setUpdateInfo(null);
        }
      }
      if (result.error) {
        setLastCheckError(result.error);
      }
      return result;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const dismissUpdate = useCallback((snooze = true) => {
    if (snooze && updateInfo?.versionName) {
      snoozeUpdatePrompt(updateInfo.versionName);
    }
    setIsUpdateModalOpen(false);
  }, [updateInfo]);

  const applyUpdate = useCallback(() => {
    if (updateInfo?.apkUrl) {
      startAppUpdate(updateInfo.apkUrl);
    }
  }, [updateInfo]);

  // Initial automatic update check on launch (delayed slightly so it doesn't collide with splash)
  useEffect(() => {
    const timer = setTimeout(() => {
      void checkNow(false);
    }, 2800);

    return () => clearTimeout(timer);
  }, [checkNow]);

  return {
    updateInfo,
    isUpdateModalOpen,
    setIsUpdateModalOpen,
    isChecking,
    lastCheckError,
    checkNow,
    dismissUpdate,
    applyUpdate,
    currentVersion: CURRENT_APP_VERSION,
    currentBuild: CURRENT_BUILD_NUMBER,
  };
}
