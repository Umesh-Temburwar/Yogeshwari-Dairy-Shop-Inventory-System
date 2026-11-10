import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar 
        onOpenAddProduct={() => {
          setProductToEdit(null);
          setIsAddProductOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace with Sidebar & Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
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
    <LanguageProvider>
      <StoreProvider>
        <MainContent />
      </StoreProvider>
    </LanguageProvider>
  );
}

export default App;
