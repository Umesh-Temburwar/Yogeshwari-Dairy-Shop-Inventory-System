import React, { useState, useEffect } from 'react';
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
import { BillingCounter } from './components/POS/BillingCounter';
import { ProductList } from './components/Inventory/ProductList';
import { ReorderNeedsView } from './components/Inventory/ReorderNeedsView';
import { ExpiryDashboard } from './components/Expiry/ExpiryDashboard';
import { PurchaseTracker } from './components/Purchases/PurchaseTracker';
import { DamageTracker } from './components/Damages/DamageTracker';
import { KhataBook } from './components/UdharKhata/KhataBook';
import { ExpenseTracker } from './components/Expenses/ExpenseTracker';
import { ProfitReport } from './components/Analytics/ProfitReport';
import { DailySalesTracker } from './components/Sales/DailySalesTracker';
import { ReturnsTracker } from './components/Returns/ReturnsTracker';
import { ReturnProductModal } from './components/Returns/ReturnProductModal';
import { AddProductModal } from './components/Inventory/AddProductModal';
import { SupabaseConfigModal } from './components/Settings/SupabaseConfigModal';
import { MasterSecurityModal } from './components/Auth/MasterSecurityModal';
import { RotateCw } from 'lucide-react';
import { Product } from './types';

const MainContent: React.FC = () => {
  const { activeView, setActiveView, refreshData, isSyncing } = useStore();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnPrefill, setReturnPrefill] = useState<{ productId?: string; invoiceNo?: string; customerName?: string; customerPhone?: string }>({});

  // Sidebar states: Collapsible on desktop (264px <-> 72px) and Drawer on mobile
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Pull-to-refresh mobile state
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Global Keyboard Shortcuts (F2, F3, F4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
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
    const isAnyModalOpen = isAddProductOpen || isSettingsOpen || isReturnModalOpen || isMobileSidebarOpen;
    if (isAnyModalOpen) {
      window.history.pushState({ modalOpen: true }, '');
      const handleModalPop = () => {
        if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
        if (isAddProductOpen) { setIsAddProductOpen(false); setProductToEdit(null); }
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isReturnModalOpen) setIsReturnModalOpen(false);
      };
      window.addEventListener('popstate', handleModalPop, { once: true });
      return () => {
        window.removeEventListener('popstate', handleModalPop);
      };
    }
  }, [isAddProductOpen, isSettingsOpen, isReturnModalOpen, isMobileSidebarOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const mainEl = e.currentTarget;
    if (mainEl.scrollTop <= 0) {
      setTouchStartY(e.touches[0].clientY);
    } else {
      setTouchStartY(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    if (diff > 0 && e.currentTarget.scrollTop <= 0) {
      setPullY(Math.min(diff * 0.45, 80));
      setIsPulling(true);
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 50) {
      await refreshData();
    }
    setPullY(0);
    setIsPulling(false);
    setTouchStartY(null);
  };

  const handleEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsAddProductOpen(true);
  };

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-[#f8fafc] dark:bg-[#0B1210] text-[#0f172a] dark:text-[#E7F0EC] transition-colors duration-150 selection:bg-emerald-500 selection:text-white">
      {/* Top Header (Fixed 64px, nothing clipped or overflowing) */}
      <Navbar 
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Main Workspace with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden max-w-[1440px] w-full mx-auto min-h-0">
        {/* Sidebar: 264px / 72px rail on desktop, drawer on mobile */}
        <Sidebar 
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area - pb-24 on mobile prevents bottom nav overlap */}
        <main 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 h-full p-3 sm:p-6 min-w-0 overflow-y-auto pb-24 lg:pb-6 overscroll-y-auto relative"
        >
          {/* Mobile Pull-to-Refresh Indicator */}
          {(isPulling || (isSyncing && pullY > 0)) && (
            <div 
              style={{ height: `${pullY}px` }} 
              className="sm:hidden flex items-center justify-center overflow-hidden transition-all duration-150 text-emerald-700 dark:text-emerald-400 font-bold text-xs gap-2 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl mb-2"
            >
              <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'रिफ्रेश होत आहे...' : pullY > 50 ? 'सोडून द्या (रिफ्रेश करा)' : 'खाली ओढा (रिफ्रेश)'}</span>
            </div>
          )}
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
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (PWA / App Navigation) */}
      <MobileActionBar 
        onOpenAddProduct={() => {
          setProductToEdit(null);
          setIsAddProductOpen(true);
        }}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Modals */}
      <AddProductModal 
        isOpen={isAddProductOpen}
        onClose={() => {
          setIsAddProductOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      <SupabaseConfigModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {isReturnModalOpen && (
        <ReturnProductModal
          onClose={() => setIsReturnModalOpen(false)}
          prefillProductId={returnPrefill.productId}
          prefillInvoiceNo={returnPrefill.invoiceNo}
          prefillCustomerName={returnPrefill.customerName}
          prefillCustomerPhone={returnPrefill.customerPhone}
        />
      )}
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { user, isSecurityUnlocked, isLoading } = useAuth();
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  return (
    <>
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
            <MainContent />
            {/* Two-step Master Security Passcode Popup: pops up after login and whenever counter is locked */}
            <MasterSecurityModal isOpen={!isSecurityUnlocked} />
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
