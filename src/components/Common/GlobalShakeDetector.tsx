import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useShakeDetector } from '../../hooks/useShakeDetector';

/**
 * Single Global Shake-to-Scan Detector for Yogeshwari Dairy Shop ERP
 *
 * Mounted once at the root application level.
 * When the user intentionally shakes their phone from ANY authorized page:
 * 1. Verifies authentication, security unlock, foreground visibility, and settings.
 * 2. Emits crisp haptic feedback.
 * 3. Automatically navigates to the POS Billing Counter and opens its Barcode Scanner.
 */
export const GlobalShakeDetector: React.FC = () => {
  const { user, isSecurityUnlocked, role } = useAuth();
  const { isBarcodeScannerOpen, triggerGlobalBillingScanner } = useStore();

  const [shakeToScanEnabled] = useLocalStorage<boolean>('ydo_shake_to_scan_enabled', true);
  const [isForeground, setIsForeground] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  // Monitor foreground visibility (pause motion sensor when browser tab or screen is hidden)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => {
      setIsForeground(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // RBAC verification: Only users authorized for billing (Owner / Admin) can trigger POS scanner
  const isAuthorizedForBilling = Boolean(user && (role === 'Owner' || role === 'Admin'));

  // Active condition: foreground, authenticated, security unlocked, enabled in settings, and scanner not already open
  const isDetectionActive = Boolean(
    isAuthorizedForBilling &&
    isSecurityUnlocked &&
    shakeToScanEnabled &&
    !isBarcodeScannerOpen &&
    isForeground
  );

  useShakeDetector({
    enabled: isDetectionActive,
    threshold: 20,
    minPeaks: 2,
    timeWindowMs: 450,
    cooldownMs: 2000,
    onShake: () => {
      // Crucial Safety: Never interrupt if any scanner modal is already active
      if (isBarcodeScannerOpen) return;

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([80]);
        } catch {
          // Ignore unsupported vibration calls
        }
      }

      // Trigger automatic navigation to POS Billing Counter and open scanner
      triggerGlobalBillingScanner();
    }
  });

  return null;
};
