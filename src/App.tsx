import React, { useState, useEffect, useRef, Suspense } from 'react';
import { ViewFallbackSkeleton } from './components/ui/Skeleton';
import { StoreProvider, useStore } from './context/StoreContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { SplashScreen } from './components/Common/SplashScreen';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileActionBar } from './components/MobileActionBar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { AddProductModal } from './components/Inventory/AddProductModal';
import { MasterSecurityModal } from './components/Auth/MasterSecurityModal';
import { useUnlockTransition, UnlockOverlay } from './components/security/UnlockTransition';
import { AppDownloadModal } from './components/Common/AppDownloadModal';
import { AppUpdateModal } from './components/Common/AppUpdateModal';
import { NetworkStatusBanner } from './components/Common/NetworkStatusBanner';
import { KeyboardShortcutsModal } from './components/Common/KeyboardShortcutsModal';
import { GlobalShakeDetector } from './components/Common/GlobalShakeDetector';
import { MAIN_SCROLL_CONTAINER_ID } from './utils/scrollUtils';
import { Product } from './types';
import { initNativeApp, isNativePlatform, App as CapacitorApp } from './services/capacitorService';
import { useAppUpdate } from './services/appUpdateService';

// Lazy-load secondary heavy view modules for initial bundle optimization
const BillingCounter = React.lazy(() => import('./components/POS/BillingCounter').then(m => ({ default: m.BillingCounter })));
const ProductList = React.lazy(() => import('./components/Inventory/ProductList').then(m => ({ default: m.ProductList })));
const ReorderNeedsView = React.lazy(() => import('./components/Inventory/ReorderNeedsView').then(m => ({ default: m.ReorderNeedsView })));
const ExpiryDashboard = React.lazy(() => import('./components/Expiry/ExpiryDashboard').then(m => ({ default: m.ExpiryDashboard })));
const PurchaseTracker = React.lazy(() => import('./components/Purchases/PurchaseTracker').then(m => ({ default: m.PurchaseTracker })));
const DamageTracker = React.lazy(() => import('./components/Damages/DamageTracker').then(m => ({ default: m.DamageTracker })));
const KhataBook = React.lazy(() => import('./components/UdharKhata/KhataBook').then(m => ({ default: m.KhataBook })));
const ExpenseTracker = React.lazy(() => import('./components/Expenses/ExpenseTracker').then(m => ({ default: m.ExpenseTracker })));
const ProfitReport = React.lazy(() => import('./components/Analytics/ProfitReport').then(m => ({ default: m.ProfitReport })));
const DailySalesTracker = React.lazy(() => import('./components/Sales/DailySalesTracker').then(m => ({ default: m.DailySalesTracker })));
const ReturnsTracker = React.lazy(() => import('./components/Returns/ReturnsTracker').then(m => ({ default: m.ReturnsTracker })));
const ReturnProductModal = React.lazy(() => import('./components/Returns/ReturnProductModal').then(m => ({ default: m.ReturnProductModal })));
const SupabaseConfigModal = React.lazy(() => import('./components/Settings/SupabaseConfigModal').then(m => ({ default: m.SupabaseConfigModal })));
const SettingsPage = React.lazy(() => import('./components/Settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ChangeMasterPasscodeModal = React.lazy(() => import('./components/Settings/ChangeMasterPasscodeModal').then(m => ({ default: m.ChangeMasterPasscodeModal })));
const ProductImageManagerModal = React.lazy(() => import('./components/Admin/ProductImageManagerModal').then(m => ({ default: m.ProductImageManagerModal })));
const ImageHealthView = React.lazy(() => import('./components/Admin/ImageHealthView').then(m => ({ default: m.ImageHealthView })));
const SupplierPdfImportView = React.lazy(() => import('./components/SupplierImport/SupplierPdfImportView').then(m => ({ default: m.SupplierPdfImportView })));
const EcommerceOrdersView = React.lazy(() => import('./components/Admin/EcommerceOrdersView').then(m => ({ default: m.EcommerceOrdersView })));

const MainContent: React.FC = () => {
  const { activeView, setActiveView } = useStore();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasscodeOpen, setIsChangePasscodeOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnPrefill, setReturnPrefill] = useState<{ productId?: string; invoiceNo?: string; customerName?: string; customerPhone?: string }>({});
  const [isPhotoDatabaseOpen, setIsPhotoDatabaseOpen] = useState(false);
  const [isAppDownloadOpen, setIsAppDownloadOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // In-App Remote Update Manager (Automatic update check on startup + manual check in Settings)
  const {
    updateInfo,
    isUpdateModalOpen,
    dismissUpdate,
    checkNow,
    isChecking: isCheckingAppUpdate,
  } = useAppUpdate();

  // Sidebar states: Collapsible on desktop (264px <-> 72px, persisted) and Drawer on mobile
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ydo_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ydo_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Global Keyboard Shortcuts (F1, F2, F3, F4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveView('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setProductToEdit(null);
        setIsAddProductOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveView('udhar');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  // Handle hardware / browser Back button when modals or mobile drawers are open
  useEffect(() => {
    const isAnyModalOpen = isAddProductOpen || isSettingsOpen || isChangePasscodeOpen || isReturnModalOpen || isMobileSidebarOpen || isAppDownloadOpen || isPhotoDatabaseOpen || isShortcutsOpen || isUpdateModalOpen;
    if (isAnyModalOpen) {
      window.history.pushState({ modalOpen: true }, '');
      const handleModalPop = () => {
        if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
        if (isAddProductOpen) { setIsAddProductOpen(false); setProductToEdit(null); }
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isChangePasscodeOpen) setIsChangePasscodeOpen(false);
        if (isReturnModalOpen) setIsReturnModalOpen(false);
        if (isAppDownloadOpen) setIsAppDownloadOpen(false);
        if (isPhotoDatabaseOpen) setIsPhotoDatabaseOpen(false);
        if (isShortcutsOpen) setIsShortcutsOpen(false);
        if (isUpdateModalOpen) dismissUpdate(true);
      };
      window.addEventListener('popstate', handleModalPop, { once: true });
      return () => {
        window.removeEventListener('popstate', handleModalPop);
      };
    }
  }, [isAddProductOpen, isSettingsOpen, isChangePasscodeOpen, isReturnModalOpen, isMobileSidebarOpen, isAppDownloadOpen, isPhotoDatabaseOpen, isShortcutsOpen, isUpdateModalOpen, dismissUpdate]);

  // Capacitor Android Hardware Back-Button Management & Accidental Exit Prevention
  const lastBackPressTimeRef = useRef<number>(0);
  const [showExitToast, setShowExitToast] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<{ orderNo: string; customer: string; amount: number } | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.order) {
        setNewOrderAlert({
          orderNo: e.detail.order.order_no,
          customer: e.detail.order.customer_name,
          amount: e.detail.order.total_amount,
        });
        setTimeout(() => setNewOrderAlert(null), 15000);
      }
    };
    window.addEventListener('yd_new_online_order_alert', handler);
    return () => window.removeEventListener('yd_new_online_order_alert', handler);
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;

    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    const backListenerPromise = CapacitorApp.addListener('backButton', () => {
      // 1. Close mobile sidebar drawer if open
      if (isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
        return;
      }
      // 2. Close any open top-level modals
      if (isAddProductOpen) {
        setIsAddProductOpen(false);
        setProductToEdit(null);
        return;
      }
      if (isReturnModalOpen) {
        setIsReturnModalOpen(false);
        return;
      }
      if (isPhotoDatabaseOpen) {
        setIsPhotoDatabaseOpen(false);
        return;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }
      if (isChangePasscodeOpen) {
        setIsChangePasscodeOpen(false);
        return;
      }
      if (isAppDownloadOpen) {
        setIsAppDownloadOpen(false);
        return;
      }
      if (isShortcutsOpen) {
        setIsShortcutsOpen(false);
        return;
      }
      if (isUpdateModalOpen) {
        dismissUpdate(true);
        return;
      }

      // 3. Close any active child modal / dialog if open (like BarcodeScannerModal, ImagePreviewModal)
      const closeButton = document.querySelector('[data-dialog-close], button[aria-label="Close"], button[aria-label="close"]') as HTMLButtonElement | null;
      const activeModal = document.querySelector('[role="dialog"]');
      if (activeModal && closeButton) {
        closeButton.click();
        return;
      }

      // 4. If on any secondary view, navigate back to 'dashboard'
      if (activeView !== 'dashboard') {
        setActiveView('dashboard');
        return;
      }

      // 5. If already on dashboard, require double-tap within 2000ms to exit app
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        void CapacitorApp.exitApp();
      } else {
        lastBackPressTimeRef.current = now;
        setShowExitToast(true);
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setShowExitToast(false), 2000);
      }
    });

    return () => {
      void backListenerPromise.then((handle) => handle.remove());
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, [
    activeView,
    setActiveView,
    isMobileSidebarOpen,
    isAddProductOpen,
    isReturnModalOpen,
    isPhotoDatabaseOpen,
    isSettingsOpen,
    isChangePasscodeOpen,
    isAppDownloadOpen,
    isShortcutsOpen,
  ]);

  const handleEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsAddProductOpen(true);
  };

  return (
    <div className="h-full h-screen w-full flex flex-col overflow-hidden bg-[#f8fafc] dark:bg-[#0B1210] text-[#0f172a] dark:text-[#E7F0EC] transition-colors duration-150 selection:bg-emerald-500 selection:text-white">
      {/* Native Double-Tap Exit Notification Toast */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999999] px-4 py-2 rounded-full bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold shadow-2xl border border-slate-700/60 flex items-center gap-2 pointer-events-none animate-view-enter">
          <span>Press back again to exit Yogeshwari Dairy</span>
        </div>
      )}
      {/* Global Root-Level Shake-to-Scan Detector across all pages */}
      <GlobalShakeDetector />

      {/* Global Floating Online Order Alert Banner (Shows when order arrives anywhere in app) */}
      {newOrderAlert && (
        <div
          onClick={() => {
            setActiveView('ecommerce-orders');
            setNewOrderAlert(null);
          }}
          className="fixed top-20 right-4 z-[999999] max-w-sm bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-2xl border-2 border-white/50 flex items-center gap-3 cursor-pointer animate-bounce hover:scale-105 transition"
        >
          <span className="text-2xl animate-pulse">🔔</span>
          <div className="text-xs">
            <p className="font-black text-white">नया ऑनलाइन ऑर्डर! #{newOrderAlert.orderNo}</p>
            <p className="text-emerald-100 font-medium">
              {newOrderAlert.customer} • ₹{newOrderAlert.amount} (क्लिक करके ऑर्डर देखें)
            </p>
          </div>
        </div>
      )}

      {/* Top Header (Fixed 64px, nothing clipped or overflowing) */}
      <Navbar
        onOpenSettings={() => setActiveView('settings')}
        onOpenPhotoDatabase={() => setIsPhotoDatabaseOpen(true)}
        onOpenAppDownload={() => setIsAppDownloadOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={handleToggleSidebarCollapse}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main Workspace with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden max-w-[1440px] w-full mx-auto min-h-0">
        {/* Sidebar: 264px / 72px rail on desktop, drawer on mobile */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenAppDownload={() => setIsAppDownloadOpen(true)}
          onOpenSettings={() => setActiveView('settings')}
          onOpenPhotoDatabase={() => setIsPhotoDatabaseOpen(true)}
          onOpenChangePasscode={() => setIsChangePasscodeOpen(true)}
        />

        {/* Main Content Area - pb-32 on mobile prevents bottom nav & floating POS button overlap */}
        <main
          id={MAIN_SCROLL_CONTAINER_ID}
          className="flex-1 h-full p-2.5 sm:p-6 min-w-0 overflow-y-auto scroll-smooth pb-32 sm:pb-28 lg:pb-6 overscroll-y-auto relative"
        >
          <Suspense fallback={<ViewFallbackSkeleton />}>
            <div key={activeView} className="w-full animate-view-enter">
              {activeView === 'dashboard' && (
                <DashboardView
                  onOpenAddProduct={() => {
                    setProductToEdit(null);
                    setIsAddProductOpen(true);
                  }}
                />
              )}

              {activeView === 'pos' && <BillingCounter />}

              {activeView === 'sales' && <DailySalesTracker />}

              {activeView === 'inventory' && (
                <ProductList
                  onOpenAddProduct={() => {
                    setProductToEdit(null);
                    setIsAddProductOpen(true);
                  }}
                  onEditProduct={handleEditProduct}
                />
              )}

              {activeView === 'reorder' && <ReorderNeedsView />}

              {activeView === 'expiry' && <ExpiryDashboard />}

              {activeView === 'purchases' && <PurchaseTracker />}

              {activeView === 'damages' && <DamageTracker />}

              {activeView === 'udhar' && <KhataBook />}

              {activeView === 'expenses' && <ExpenseTracker />}

              {activeView === 'analytics' && <ProfitReport />}

              {activeView === 'returns' && (
                <ReturnsTracker
                  onOpenReturnModal={() => {
                    setReturnPrefill({});
                    setIsReturnModalOpen(true);
                  }}
                />
              )}

              {activeView === 'settings' && (
                <SettingsPage
                  onOpenChangePasscode={() => setIsChangePasscodeOpen(true)}
                  onOpenPhotoDatabase={() => setIsPhotoDatabaseOpen(true)}
                  onOpenImageHealth={() => setActiveView('image-health')}
                  onOpenAppDownload={() => setIsAppDownloadOpen(true)}
                  onCheckAppUpdate={() => checkNow(true)}
                  isCheckingAppUpdate={isCheckingAppUpdate}
                />
              )}

              {activeView === 'image-health' && <ImageHealthView />}
              {activeView === 'supplier-pdf-import' && <SupplierPdfImportView />}
              {activeView === 'ecommerce-orders' && <EcommerceOrdersView />}
            </div>
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (PWA / App Navigation) */}
      <MobileActionBar
        onOpenAddProduct={() => {
          setProductToEdit(null);
          setIsAddProductOpen(true);
        }}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Modals with Suspense */}
      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => {
          setIsAddProductOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SupabaseConfigModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onOpenChangePasscode={() => setIsChangePasscodeOpen(true)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isChangePasscodeOpen && (
          <ChangeMasterPasscodeModal
            isOpen={isChangePasscodeOpen}
            onClose={() => setIsChangePasscodeOpen(false)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isPhotoDatabaseOpen && (
          <ProductImageManagerModal
            isOpen={isPhotoDatabaseOpen}
            onClose={() => setIsPhotoDatabaseOpen(false)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isReturnModalOpen && (
          <ReturnProductModal
            onClose={() => setIsReturnModalOpen(false)}
            prefillProductId={returnPrefill.productId}
            prefillInvoiceNo={returnPrefill.invoiceNo}
            prefillCustomerName={returnPrefill.customerName}
            prefillCustomerPhone={returnPrefill.customerPhone}
          />
        )}
      </Suspense>

      {/* Mobile Application Download & PWA Install Popup */}
      <AppDownloadModal
        isOpen={isAppDownloadOpen}
        onClose={() => setIsAppDownloadOpen(false)}
      />

      {/* Keyboard Shortcuts Helper Modal (F1) */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Remote In-App Update Popup Modal (Auto on startup + Manual check in Settings) */}
      <AppUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={dismissUpdate}
        updateInfo={updateInfo}
      />
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { user, isSecurityUnlocked, isLoading, confirmSecurityUnlock } = useAuth();
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  // Initialize native status bar and splash screen on startup
  useEffect(() => {
    void initNativeApp();
  }, []);

  const { phase, play, reset } = useUnlockTransition(() => {
    confirmSecurityUnlock();
  });

  const prevUnlockedRef = useRef(isSecurityUnlocked);
  useEffect(() => {
    if (!user || (prevUnlockedRef.current && !isSecurityUnlocked)) {
      reset();
    }
    prevUnlockedRef.current = isSecurityUnlocked;
  }, [user, isSecurityUnlocked, reset]);

  return (
    <>
      {/* Live offline/online network status alert */}
      <NetworkStatusBanner />

      {/* Silky-smooth opening splash screen with logo & progress */}
      {!isSplashComplete && (
        <SplashScreen
          isAppReady={!isLoading}
          onFinished={() => setIsSplashComplete(true)}
          minDurationMs={1300}
        />
      )}

      {/* Render underlying views: Only authorized Owner and Admin users can enter */}
      {(!isLoading || isSplashComplete) && (
        !user ? (
          <LoginPage />
        ) : (
          <>
            {isSecurityUnlocked ? (
              <div className="h-full w-full overflow-hidden">
                <MainContent />
              </div>
            ) : (
              /* Dedicated secure lock screen — main dashboard never renders underneath while locked */
              <MasterSecurityModal isOpen={true} onVerified={play} />
            )}
            <UnlockOverlay phase={phase} />
          </>
        )
      )}
    </>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <StoreProvider>
            <AppRoot />
          </StoreProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
