import React, { useState, useEffect } from 'react';
import { Smartphone, Sparkles, ShoppingCart, PackagePlus, Edit3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore, GlobalScannerTarget } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useShakeDetector } from '../../hooks/useShakeDetector';

/**
 * Global Root-Level Shake-to-Scan Gesture Detector for Yogeshwari Dairy Shop ERP
 * 
 * Mounted once at the root application level.
 * Classifies physical phone shakes into 3 distinct actions across the entire app:
 * 1. Single Shake -> POS Billing Barcode Scanner (`activeView = 'pos'`)
 * 2. Double Shake -> Stock-In Barcode Scanner (`activeView = 'inventory'`)
 * 3. Triple Shake -> Stock Edit / Lookup Barcode Scanner (`activeView = 'inventory'`)
 */
export const GlobalShakeDetector: React.FC = () => {
  const { user, isSecurityUnlocked, role } = useAuth();
  const { isBarcodeScannerOpen, triggerGlobalScanner } = useStore();
  const { language } = useLanguage();

  // Settings toggles
  const [masterShakeEnabled] = useLocalStorage<boolean>('ydo_shake_to_scan_enabled', true);
  const [shakeBillingEnabled] = useLocalStorage<boolean>('ydo_shake_billing_enabled', true);
  const [shakeStockInEnabled] = useLocalStorage<boolean>('ydo_shake_stock_in_enabled', true);
  const [shakeStockEditEnabled] = useLocalStorage<boolean>('ydo_shake_stock_edit_enabled', true);

  const [activeGestureToast, setActiveGestureToast] = useState<{
    target: GlobalScannerTarget;
    count: 1 | 2 | 3;
  } | null>(null);

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

  // RBAC verification: Only users authorized for inventory & billing (Owner / Admin) can trigger scanners
  const isAuthorized = Boolean(user && (role === 'Owner' || role === 'Admin'));

  // Active condition: foreground, authenticated, security unlocked, master toggle enabled, and scanner not already open
  const isDetectionActive = Boolean(
    isAuthorized &&
    isSecurityUnlocked &&
    masterShakeEnabled &&
    !isBarcodeScannerOpen &&
    isForeground
  );

  useShakeDetector({
    enabled: isDetectionActive,
    threshold: 20,
    peakWindowMs: 450,
    gestureWindowMs: 650,
    cooldownMs: 1800,
    onGesture: (count) => {
      // Crucial Safety: Never interrupt if any scanner modal is already active
      if (isBarcodeScannerOpen) return;

      if (count === 1) {
        if (!shakeBillingEnabled) return;
        setActiveGestureToast({ target: 'billing', count: 1 });
        triggerGlobalScanner('billing');
      } else if (count === 2) {
        if (!shakeStockInEnabled) return;
        setActiveGestureToast({ target: 'stock_in', count: 2 });
        triggerGlobalScanner('stock_in');
      } else if (count === 3) {
        if (!shakeStockEditEnabled) return;
        setActiveGestureToast({ target: 'stock_edit', count: 3 });
        triggerGlobalScanner('stock_edit');
      }

      setTimeout(() => setActiveGestureToast(null), 2500);
    }
  });

  if (!activeGestureToast) return null;

  const { target, count } = activeGestureToast;

  const getToastContent = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    if (target === 'billing') {
      return {
        icon: <ShoppingCart className="w-4 h-4 text-emerald-950 shrink-0" />,
        color: 'from-emerald-400 via-emerald-500 to-teal-500 text-emerald-950',
        text: isMr
          ? '📱 १ शेक: बिलिंग बारकोड स्कॅनर उघडत आहे...'
          : isHi
          ? '📱 1 शेक: बिलिंग बारकोड स्कैनर खुल रहा है...'
          : '📱 1 Shake: Opening Billing Barcode Scanner...'
      };
    }

    if (target === 'stock_in') {
      return {
        icon: <PackagePlus className="w-4 h-4 text-blue-950 shrink-0" />,
        color: 'from-blue-400 via-indigo-500 to-cyan-500 text-blue-950',
        text: isMr
          ? '📱📱 २ शेक: नवीन स्टॉक-इन बारकोड स्कॅनर उघडत आहे...'
          : isHi
          ? '📱📱 2 शेक: नया स्टॉक-इन बारकोड स्कैनर खुल रहा है...'
          : '📱📱 2 Shakes: Opening Stock-In Barcode Scanner...'
      };
    }

    return {
      icon: <Edit3 className="w-4 h-4 text-purple-950 shrink-0" />,
      color: 'from-purple-400 via-violet-500 to-fuchsia-500 text-purple-950',
      text: isMr
        ? '📱📱📱 ३ शेक: स्टॉक तपासणी व दुरुस्ती स्कॅनर उघडत आहे...'
        : isHi
        ? '📱📱📱 3 शेक: स्टॉक जांच व एडिट स्कैनर खुल रहा है...'
        : '📱📱📱 3 Shakes: Opening Stock Edit Scanner...'
    };
  };

  const toastInfo = getToastContent();

  return (
    <div 
      role="status"
      aria-live="polite"
      className={`fixed top-4 inset-x-0 mx-auto max-w-xs sm:max-w-sm z-[9999] px-4 py-2.5 rounded-2xl bg-gradient-to-r ${toastInfo.color} font-black text-xs shadow-2xl flex items-center justify-center gap-2.5 animate-bounce border-2 border-white/60 backdrop-blur-md pointer-events-none`}
    >
      <Smartphone className="w-4 h-4 animate-spin shrink-0" />
      {toastInfo.icon}
      <span>{toastInfo.text}</span>
      <Sparkles className="w-3.5 h-3.5 shrink-0" />
    </div>
  );
};
