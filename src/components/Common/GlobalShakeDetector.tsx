import React, { useState, useEffect } from 'react';
import { Smartphone, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useShakeDetector } from '../../hooks/useShakeDetector';

/**
 * Global Root-Level Shake-to-Scan Detector for Yogeshwari Dairy Shop ERP
 * 
 * Mounted once at the root application level.
 * When the user deliberately shakes their mobile device anywhere in the application
 * (Dashboard, Inventory, Products, Reports, Settings, etc.), it:
 * 1. Verifies authentication, security unlock, foreground visibility, and settings.
 * 2. Triggers haptic vibration and displays a global animated notification toast.
 * 3. Automatically navigates to the POS Billing Counter (`activeView = 'pos'`).
 * 4. Signals the Billing Counter to immediately open its Barcode Scanner with rear camera.
 */
export const GlobalShakeDetector: React.FC = () => {
  const { user, isSecurityUnlocked, role } = useAuth();
  const { activeView, isBarcodeScannerOpen, triggerGlobalBillingScanner } = useStore();
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
    timeWindowMs: 750,
    cooldownMs: 1800,
    onShake: () => {
      // Crucial Safety: Never close or interrupt if scanner is already active
      if (isBarcodeScannerOpen) return;

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 80]);
        } catch {}
      }

      // Show global animated toast notification
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2400);

      // Trigger automatic navigation to POS and open scanner
      triggerGlobalBillingScanner();
    }
  });

  if (!showToast) return null;

  return (
    <div 
      role="status"
      aria-live="polite"
      className="fixed top-4 inset-x-0 mx-auto max-w-xs sm:max-w-sm z-[9999] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black text-xs shadow-2xl flex items-center justify-center gap-2.5 animate-bounce border-2 border-white/60 backdrop-blur-md pointer-events-none"
    >
      <Smartphone className="w-4 h-4 animate-spin text-slate-950 shrink-0" />
      <span>
        {language === 'mr'
          ? (activeView === 'pos' 
              ? '📱 फोन हलवला! बारकोड स्कॅनर सुरू होत आहे...' 
              : '📱 फोन हलवला! बिलिंग काऊंटरवर नेऊन स्कॅनर उघडत आहे...')
          : language === 'hi'
          ? (activeView === 'pos' 
              ? '📱 फोन शेक डिटेक्ट हुआ! स्कैनर खुल रहा है...' 
              : '📱 फोन शेक डिटेक्ट हुआ! बिलिंग काउंटर पर स्कैनर खुल रहा है...')
          : (activeView === 'pos' 
              ? '📱 Shake Detected! Opening Barcode Scanner...' 
              : '📱 Shake Detected! Redirecting to Billing Scanner...')}
      </span>
      <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
    </div>
  );
};
