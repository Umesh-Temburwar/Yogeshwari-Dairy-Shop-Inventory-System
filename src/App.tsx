import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileActionBar } from './components/MobileActionBar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { BillingCounter } from './components/POS/BillingCounter';
import { ProductList } from './components/Inventory/ProductList';
import { ReorderNeedsView } from './components/Inventory/ReorderNeedsView';
import { PurchaseTracker } from './components/Purchases/PurchaseTracker';
import { DamageTracker } from './components/Damages/DamageTracker';
import { KhataBook } from './components/UdharKhata/KhataBook';
import { ExpenseTracker } from './components/Expenses/ExpenseTracker';
import { ProfitReport } from './components/Analytics/ProfitReport';
import { DailySalesTracker } from './components/Sales/DailySalesTracker';
import { AddProductModal } from './components/Inventory/AddProductModal';
import { SupabaseConfigModal } from './components/Settings/SupabaseConfigModal';
import { Product } from './types';

const MainContent: React.FC = () => {
  const { activeView, setActiveView } = useStore();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sidebar states: Collapsible on desktop (264px <-> 72px) and Drawer on mobile
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  const handleEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsAddProductOpen(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f8fafc] dark:bg-[#0B1210] text-[#0f172a] dark:text-[#E7F0EC] transition-colors duration-150 selection:bg-emerald-500 selection:text-white">
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

        {/* Main Content Area */}
        <main className="flex-1 h-full p-4 sm:p-6 lg:p-6 min-w-0 overflow-y-auto">
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

          {activeView === 'purchases' && <PurchaseTracker />}

          {activeView === 'damages' && <DamageTracker />}

          {activeView === 'udhar' && <KhataBook />}

          {activeView === 'expenses' && <ExpenseTracker />}

          {activeView === 'analytics' && <ProfitReport />}
        </main>
      </div>

      {/* Mobile Floating Action Bar for Quick F2 / F3 / F4 Actions */}
      <MobileActionBar 
        onOpenAddProduct={() => {
          setProductToEdit(null);
          setIsAddProductOpen(true);
        }}
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
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <StoreProvider>
          <MainContent />
        </StoreProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
