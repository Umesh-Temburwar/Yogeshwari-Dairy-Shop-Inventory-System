import React, { useState, useEffect } from 'react';
import { Smartphone, Sparkles, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useShakeDetector } from '../../hooks/useShakeDetector';

/**
 * Single Global Shake-to-Scan Detector for Yogeshwari Dairy Shop ERP
 * 
 * Mounted once at the root application level.
 * When the user intentionally shakes their Android phone from ANY authorized page
 * (Dashboard, Inventory, Stock-In, Product Catalogue, Reports, Settings, etc.):
 * 1. Verifies authentication, security unlock, foreground visibility, and settings.
 * 2. Emits crisp haptic feedback and displays a live animated notification toast.
 * 3. Automatically navigates to the POS Billing Counter (`activeView = 'pos'`).
 * 4. Signals the Billing Counter to immediately open its Barcode Scanner with rear camera.
 */
export const GlobalShakeDetector: React.FC = () => {
  const { user, isSecurityUnlocked, role } = useAuth();
  const { isBarcodeScannerOpen, triggerGlobalBillingScanner } = useStore();
  const { language } = useLanguage();

  const [shakeToScanEnabled] = useLocalStorage<boolean>('ydo_shake_to_scan_enabled', true);
  const [showToast, setShowToast] = useState(false);
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
        } catch {}
      }

      // Show global animated toast notification
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2400);

      // Trigger automatic navigation to POS Billing Counter and open scanner
      triggerGlobalBillingScanner();
    }
  });

  if (!showToast) return null;

  return (
    <div 
      role="status"
      aria-live="polite"
      className="fixed top-4 inset-x-0 mx-auto max-w-xs sm:max-w-sm z-[9999] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-slate-950 font-black text-xs shadow-2xl flex items-center justify-center gap-2.5 animate-bounce border-2 border-white/60 backdrop-blur-md pointer-events-none"
    >
      <Smartphone className="w-4 h-4 animate-spin shrink-0" />
      <ShoppingCart className="w-4 h-4 shrink-0" />
      <span>
        {language === 'mr'
          ? '📱 फोन हलवला! बिलिंग बारकोड स्कॅनर उघडत आहे...'
          : language === 'hi'
          ? '📱 फोन शेक डिटेक्ट हुआ! बिलिंग बारकोड स्कैनर खुल रहा है...'
          : '📱 Shake Detected! Opening Billing Barcode Scanner...'}
      </span>
      <Sparkles className="w-3.5 h-3.5 shrink-0" />
    </div>
  );
};
