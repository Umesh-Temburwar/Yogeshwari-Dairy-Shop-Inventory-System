import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Product, Sale, Purchase, DamageRecord, UdharCustomer, 
  UdharTransaction, Expense, TimeRangeFilter, PaymentMode,
  CustomerGender, CustomerAgeGroup, ProductBatch, ExpiryStatus,
  ProductReturn, SupplierReturn, SupplierReturnReason, SupplierRefundStatus
} from '../types';
import { 
  INITIAL_PRODUCTS, INITIAL_SALES, INITIAL_PURCHASES, 
  INITIAL_DAMAGES, INITIAL_CUSTOMERS, INITIAL_UDHAR_TRANSACTIONS, 
  INITIAL_EXPENSES, INITIAL_BATCHES 
} from '../lib/mockInitialData';
import { getShelfLifeDays, getSuggestedExpiryDate, generateBatchNumber, computeExpiryStatus } from '../lib/shelfLifeUtils';
import { supabase, getSupabaseConfig } from '../lib/supabase';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isWithinInterval, parseISO } from 'date-fns';

export type AppView = 
  | 'dashboard' 
  | 'pos' 
  | 'sales'
  | 'inventory' 
  | 'purchases' 
  | 'damages' 
  | 'udhar' 
  | 'expenses' 
  | 'analytics' 
  | 'reorder'
  | 'expiry'
  | 'returns';

interface StoreContextType {
  // Navigation & Settings
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  timeFilter: TimeRangeFilter;
  setTimeFilter: (filter: TimeRangeFilter) => void;
  isSupabaseConnected: boolean;
  isSyncing: boolean;
  syncWithSupabase: () => Promise<void>;
  refreshData: () => Promise<void>;
  resetToSampleData: () => void;
  
  // Data State
  products: Product[];
  batches: ProductBatch[];
  sales: Sale[];
  purchases: Purchase[];
  damages: DamageRecord[];
  customers: UdharCustomer[];
  udharTransactions: UdharTransaction[];
  expenses: Expense[];
  returns: ProductReturn[];
  supplierReturns: SupplierReturn[];
  
  // Receipt
  currentReceipt: Sale | null;
  setCurrentReceipt: (sale: Sale | null) => void;

  // Actions
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (
    id: string, 
    qtyDelta: number, 
    reason?: string,
    batchInfo?: { 
      batch_id?: string; 
      batch_no?: string; 
      expiry_date?: string; 
      mfg_date?: string;
      supplier_name?: string;
    }
  ) => Promise<void>;

  addStockEntries: (
    productId: string,
    entries: Array<{
      batch_id?: string;
      batch_no?: string;
      mfg_date?: string;
      expiry_date: string;
      quantity: number;
      purchase_price?: number;
      supplier_name?: string;
      lot_type?: 'fresh_today' | 'previous_lot' | 'existing_batch';
      notes?: string;
    }>
  ) => Promise<void>;

  addBatch: (batchData: Omit<ProductBatch, 'id' | 'created_at'>) => Promise<ProductBatch>;
  updateBatch: (id: string, updates: Partial<ProductBatch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  
  createSale: (saleData: {
    customer_name: string;
    customer_phone?: string;
    customer_gender?: CustomerGender;
    customer_age_group?: CustomerAgeGroup;
    customer_age?: number;
    total_amount: number;
    discount: number;
    net_amount: number;
    payment_mode: PaymentMode;
    cash_amount: number;
    online_amount: number;
    udhar_amount: number;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      purchase_cost: number;
      total_price: number;
    }>;
  }) => Promise<Sale>;

  createPurchase: (purchaseData: Omit<Purchase, 'id' | 'created_at'>) => Promise<void>;
  recordDamage: (damageData: Omit<DamageRecord, 'id' | 'created_at'>) => Promise<void>;
  
  addUdharCustomer: (customerData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }) => Promise<UdharCustomer>;
  
  recordUdharPayment: (
    customerId: string, 
    amount: number, 
    paymentMode: 'Cash' | 'Online_UPI', 
    notes?: string
  ) => Promise<void>;

  addExpense: (expenseData: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Product Returns (Customer)
  createReturn: (returnData: Omit<ProductReturn, 'id' | 'return_no' | 'created_at'>) => Promise<ProductReturn>;
  deleteReturn: (id: string) => Promise<void>;

  // Supplier Returns (खरेदी व सप्लायर परतावा - खराब/एक्सपायर माल परत करणे)
  createSupplierReturn: (returnData: Omit<SupplierReturn, 'id' | 'return_no' | 'created_at'>) => Promise<SupplierReturn>;
  updateSupplierRefundStatus: (
    id: string, 
    newStatus: SupplierRefundStatus, 
    refundMode?: 'Cash' | 'Online_UPI' | 'Credit_Deduction' | 'Replacement', 
    notes?: string
  ) => Promise<void>;
  deleteSupplierReturn: (id: string) => Promise<void>;

  // Filtered views and analytics
  filteredSales: Sale[];
  filteredPurchases: Purchase[];
  filteredExpenses: Expense[];
  filteredDamages: DamageRecord[];
  filteredReturns: ProductReturn[];
  filteredSupplierReturns: SupplierReturn[];
  
  // Metrics
  metrics: {
    totalSalesRevenue: number;
    cashCollected: number;
    onlineCollected: number;
    udharGiven: number;
    totalPurchasesAmount: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    capitalInvestments: number;
    netProfit: number;
    totalDamagesLoss: number;
    totalOutstandingUdhar: number;
    lowStockCount: number;
    outOfStockCount: number;
    // Batch Expiry Metrics
    expiredBatchesCount: number;
    expiringTodayBatchesCount: number;
    expiringTomorrowBatchesCount: number;
    expiring3DaysBatchesCount: number;
    freshBatchesCount: number;
    totalActiveBatches: number;
    // Returns Metrics
    totalReturnsCount: number;
    totalRefundAmount: number;
    todayRefundAmount: number;
    // Supplier Returns Metrics
    totalSupplierReturnsCount: number;
    totalSupplierRefundAmount: number;
    totalSupplierRefundReceived: number;
    pendingSupplierRefundAmount: number;
    supplierReplacementCount: number;
    // Compatibility Aliases
    totalCOGS: number;
    creditGiven: number;
  };
}

// LocalStorage Version Migration: Clean all dummy/sample data from previous versions
const STORAGE_CLEAN_VERSION_KEY = 'yd_clean_data_version';
const CURRENT_CLEAN_VERSION = 'v4_clean_zero_all_dummy_data_2026';

if (typeof window !== 'undefined') {
  try {
    const currentVersion = localStorage.getItem(STORAGE_CLEAN_VERSION_KEY);
    if (currentVersion !== CURRENT_CLEAN_VERSION) {
      // Clear out legacy mock data
      localStorage.removeItem('yd_products');
      localStorage.removeItem('yd_batches');
      localStorage.removeItem('yd_sales');
      localStorage.removeItem('yd_purchases');
      localStorage.removeItem('yd_damages');
      localStorage.removeItem('yd_customers');
      localStorage.removeItem('yd_udhar_transactions');
      localStorage.removeItem('yd_expenses');
      localStorage.setItem(STORAGE_CLEAN_VERSION_KEY, CURRENT_CLEAN_VERSION);
    }
  } catch {
    // Ignore storage errors
  }
}

const VALID_APP_VIEWS: AppView[] = [
  'dashboard', 'pos', 'sales', 'inventory', 'purchases', 
  'damages', 'udhar', 'expenses', 'analytics', 'reorder', 
  'expiry', 'returns'
];

const getInitialAppView = (): AppView => {
  if (typeof window !== 'undefined') {
    const rawHash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (VALID_APP_VIEWS.includes(rawHash as AppView)) {
      return rawHash as AppView;
    }
    try {
      const saved = localStorage.getItem('yd_active_view');
      if (saved && VALID_APP_VIEWS.includes(saved as AppView)) {
        return saved as AppView;
      }
    } catch {
      // Ignore
    }
  }
  return 'dashboard';
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveViewState] = useState<AppView>(getInitialAppView);

  const setActiveView = useCallback((newView: AppView, pushHistory = true) => {
    setActiveViewState(newView);
    try {
      localStorage.setItem('yd_active_view', newView);
      if (pushHistory && typeof window !== 'undefined') {
        const targetHash = `#/${newView}`;
        if (window.location.hash !== targetHash) {
          window.history.pushState({ view: newView }, '', targetHash);
        }
      }
    } catch {
      // Ignore history errors
    }
  }, []);

  // Listen for browser Back/Forward (popstate) so website NEVER exits on back gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Normalize initial URL hash
    const initialRaw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (!initialRaw || !VALID_APP_VIEWS.includes(initialRaw as AppView)) {
      window.history.replaceState({ view: activeView }, '', `#/${activeView}`);
    } else {
      window.history.replaceState({ view: initialRaw }, '', `#/${initialRaw}`);
    }

    const handlePopState = (e: PopStateEvent) => {
      const currentRawHash = window.location.hash.replace(/^#\/?/, '').split('?')[0] as AppView;
      const target: AppView = (e.state && e.state.view && VALID_APP_VIEWS.includes(e.state.view))
        ? e.state.view
        : VALID_APP_VIEWS.includes(currentRawHash)
          ? currentRawHash
          : 'dashboard';

      setActiveViewState(target);
      try {
        localStorage.setItem('yd_active_view', target);
      } catch {
        // Ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('today');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [currentReceipt, setCurrentReceipt] = useState<Sale | null>(null);

  // Initialize state from LocalStorage or mock data
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('yd_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [batches, setBatches] = useState<ProductBatch[]>(() => {
    const saved = localStorage.getItem('yd_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('yd_sales');
    if (!saved) return INITIAL_SALES;
    try {
      const parsed: Sale[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('yd_purchases');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
  });

  const [damages, setDamages] = useState<DamageRecord[]>(() => {
    const saved = localStorage.getItem('yd_damages');
    return saved ? JSON.parse(saved) : INITIAL_DAMAGES;
  });

  const [customers, setCustomers] = useState<UdharCustomer[]>(() => {
    const saved = localStorage.getItem('yd_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [udharTransactions, setUdharTransactions] = useState<UdharTransaction[]>(() => {
    const saved = localStorage.getItem('yd_udhar_transactions');
    return saved ? JSON.parse(saved) : INITIAL_UDHAR_TRANSACTIONS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('yd_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [returns, setReturns] = useState<ProductReturn[]>(() => {
    const saved = localStorage.getItem('yd_returns');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>(() => {
    const saved = localStorage.getItem('yd_supplier_returns');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage on state changes
  useEffect(() => {
    localStorage.setItem('yd_returns', JSON.stringify(returns));
  }, [returns]);
  useEffect(() => {
    localStorage.setItem('yd_supplier_returns', JSON.stringify(supplierReturns));
  }, [supplierReturns]);
  useEffect(() => {
    localStorage.setItem('yd_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('yd_batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('yd_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('yd_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('yd_damages', JSON.stringify(damages));
  }, [damages]);

  useEffect(() => {
    localStorage.setItem('yd_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('yd_udhar_transactions', JSON.stringify(udharTransactions));
  }, [udharTransactions]);

  useEffect(() => {
    localStorage.setItem('yd_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Check Supabase connection on mount
  useEffect(() => {
    const checkConn = async () => {
      const config = getSupabaseConfig();
      if (config.url && config.key && supabase) {
        try {
          const res = await supabase.from('products').select('id').limit(1);
          if (!res.error) {
            setIsSupabaseConnected(true);
          } else {
            setIsSupabaseConnected(false);
          }
        } catch {
          setIsSupabaseConnected(false);
        }
      }
    };
    checkConn();
  }, []);

  const syncWithSupabase = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      // Fetch products
      const { data: pData } = await supabase.from('products').select('*');
      if (pData && pData.length > 0) {
        setProducts(pData);
      }
      // Fetch batches
      const { data: bData } = await supabase.from('batches').select('*').order('expiry_date', { ascending: true });
      if (bData && bData.length > 0) {
        setBatches(bData);
      }
      // Fetch sales
      const { data: sData } = await supabase.from('sales').select('*, items:sale_items(*)').order('created_at', { ascending: false });
      if (sData && sData.length > 0) {
        setSales(sData);
      }
      // Fetch purchases
      const { data: purData } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
      if (purData && purData.length > 0) {
        setPurchases(purData);
      }
      // Fetch damages
      const { data: dData } = await supabase.from('damage_records').select('*').order('created_at', { ascending: false });
      if (dData && dData.length > 0) {
        setDamages(dData);
      }
      // Fetch expenses
      const { data: expData } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (expData && expData.length > 0) {
        setExpenses(expData);
      }
      // Fetch customers
      const { data: custData } = await supabase.from('udhar_customers').select('*');
      if (custData && custData.length > 0) {
        setCustomers(custData);
      }
      // Fetch customer returns
      const { data: retData } = await supabase.from('product_returns').select('*').order('created_at', { ascending: false });
      if (retData && retData.length > 0) {
        setReturns(retData);
      }
      // Fetch supplier returns
      const { data: supRetData } = await supabase.from('supplier_returns').select('*').order('created_at', { ascending: false });
      if (supRetData && supRetData.length > 0) {
        setSupplierReturns(supRetData);
      }
      // Fetch udhar transactions
      const { data: utData } = await supabase.from('udhar_transactions').select('*').order('created_at', { ascending: false });
      if (utData && utData.length > 0) {
        setUdharTransactions(utData);
      }
      setIsSupabaseConnected(true);
    } catch (err) {
      console.error('Supabase sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshData = async () => {
    setIsSyncing(true);
    try {
      if (supabase && isSupabaseConnected) {
        await syncWithSupabase();
      } else {
        // Reload fresh state from localStorage
        try {
          const p = localStorage.getItem('yd_products');
          if (p) setProducts(JSON.parse(p));
          const b = localStorage.getItem('yd_batches');
          if (b) setBatches(JSON.parse(b));
          const s = localStorage.getItem('yd_sales');
          if (s) setSales(JSON.parse(s));
          const pu = localStorage.getItem('yd_purchases');
          if (pu) setPurchases(JSON.parse(pu));
          const d = localStorage.getItem('yd_damages');
          if (d) setDamages(JSON.parse(d));
          const c = localStorage.getItem('yd_customers');
          if (c) setCustomers(JSON.parse(c));
          const ut = localStorage.getItem('yd_udhar_transactions');
          if (ut) setUdharTransactions(JSON.parse(ut));
          const ex = localStorage.getItem('yd_expenses');
          if (ex) setExpenses(JSON.parse(ex));
          const ret = localStorage.getItem('yd_returns');
          if (ret) setReturns(JSON.parse(ret));
          const sRet = localStorage.getItem('yd_supplier_returns');
          if (sRet) setSupplierReturns(JSON.parse(sRet));
        } catch {
          // ignore parsing error
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const resetToSampleData = () => {
    setProducts(INITIAL_PRODUCTS);
    setBatches(INITIAL_BATCHES);
    setSales(INITIAL_SALES);
    setPurchases(INITIAL_PURCHASES);
    setDamages(INITIAL_DAMAGES);
    setCustomers(INITIAL_CUSTOMERS);
    setUdharTransactions(INITIAL_UDHAR_TRANSACTIONS);
    setExpenses(INITIAL_EXPENSES);
    setReturns([]);
    setSupplierReturns([]);
    try {
      localStorage.removeItem('yd_products');
      localStorage.removeItem('yd_batches');
      localStorage.removeItem('yd_sales');
      localStorage.removeItem('yd_purchases');
      localStorage.removeItem('yd_damages');
      localStorage.removeItem('yd_customers');
      localStorage.removeItem('yd_udhar_transactions');
      localStorage.removeItem('yd_expenses');
      localStorage.removeItem('yd_returns');
      localStorage.removeItem('yd_supplier_returns');
    } catch {
      // Ignore
    }
  };

  // Helper date filter
  const filterByDate = (dateStr: string) => {
    if (timeFilter === 'all') return true;
    const now = new Date();
    const itemDate = parseISO(dateStr);
    
    let intervalStart: Date;
    if (timeFilter === 'today') {
      intervalStart = startOfDay(now);
    } else if (timeFilter === 'week') {
      intervalStart = startOfWeek(now, { weekStartsOn: 1 });
    } else if (timeFilter === 'month') {
      intervalStart = startOfMonth(now);
    } else if (timeFilter === 'year') {
      intervalStart = startOfYear(now);
    } else {
      return true;
    }

    return isWithinInterval(itemDate, { start: intervalStart, end: now }) || 
           dateStr === new Date().toISOString().split('T')[0];
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => filterByDate(s.sale_date));
  }, [sales, timeFilter]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => filterByDate(p.purchase_date));
  }, [purchases, timeFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => filterByDate(e.expense_date));
  }, [expenses, timeFilter]);

  const filteredDamages = useMemo(() => {
    return damages.filter(d => filterByDate(d.damage_date));
  }, [damages, timeFilter]);

  const filteredReturns = useMemo(() => {
    return returns.filter(r => filterByDate(r.return_date));
  }, [returns, timeFilter]);

  const filteredSupplierReturns = useMemo(() => {
    return supplierReturns.filter(r => filterByDate(r.return_date));
  }, [supplierReturns, timeFilter]);

  // Aggregated Financial Metrics
  const metrics = useMemo(() => {
    let totalSalesRevenue = 0;
    let cashCollected = 0;
    let onlineCollected = 0;
    let udharGiven = 0;
    let cogs = 0;

    filteredSales.forEach(s => {
      totalSalesRevenue += s.net_amount;
      cashCollected += s.cash_amount || 0;
      onlineCollected += s.online_amount || 0;
      udharGiven += s.udhar_amount || 0;
      
      // Calculate COGS from item historical purchase costs
      s.items?.forEach(item => {
        cogs += (item.purchase_cost || 0) * (item.quantity || 0);
      });
    });

    const totalPurchasesAmount = filteredPurchases.reduce((acc, p) => acc + p.total_amount, 0);

    let operatingExpenses = 0;
    let capitalInvestments = 0;

    filteredExpenses.forEach(e => {
      if (e.is_capital_investment) {
        capitalInvestments += e.amount;
      } else {
        operatingExpenses += e.amount;
      }
    });

    const totalDamagesLoss = filteredDamages.reduce((acc, d) => acc + d.estimated_loss_amount, 0);
    const grossProfit = totalSalesRevenue - cogs;
    const netProfit = grossProfit - operatingExpenses - totalDamagesLoss;

    const totalOutstandingUdhar = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);
    const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0).length;
    const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length;

    // Batch Expiry Alert Counts
    let expiredBatchesCount = 0;
    let expiringTodayBatchesCount = 0;
    let expiringTomorrowBatchesCount = 0;
    let expiring3DaysBatchesCount = 0;
    let freshBatchesCount = 0;

    batches.forEach(b => {
      if (b.qty_remaining <= 0) return;
      const { status } = computeExpiryStatus(b.expiry_date);
      if (status === 'EXPIRED') expiredBatchesCount += 1;
      else if (status === 'EXPIRING_TODAY') expiringTodayBatchesCount += 1;
      else if (status === 'EXPIRING_TOMORROW') expiringTomorrowBatchesCount += 1;
      else if (status === 'EXPIRING_IN_3_DAYS') expiring3DaysBatchesCount += 1;
      else freshBatchesCount += 1;
    });

    return {
      totalSalesRevenue,
      cashCollected,
      onlineCollected,
      udharGiven,
      totalPurchasesAmount,
      cogs,
      grossProfit,
      operatingExpenses,
      capitalInvestments,
      netProfit,
      totalDamagesLoss,
      totalOutstandingUdhar,
      lowStockCount,
      outOfStockCount,
      expiredBatchesCount,
      expiringTodayBatchesCount,
      expiringTomorrowBatchesCount,
      expiring3DaysBatchesCount,
      freshBatchesCount,
      totalActiveBatches: batches.filter(b => b.qty_remaining > 0).length,
      // Returns Metrics
      totalReturnsCount: filteredReturns.length,
      totalRefundAmount: filteredReturns.reduce((acc, r) => acc + (r.refund_amount || 0), 0),
      todayRefundAmount: returns.filter(r => r.return_date === new Date().toISOString().split('T')[0]).reduce((acc, r) => acc + (r.refund_amount || 0), 0),
      // Supplier Returns Metrics
      totalSupplierReturnsCount: filteredSupplierReturns.length,
      totalSupplierRefundAmount: filteredSupplierReturns.reduce((acc, r) => acc + (r.total_refund_amount || 0), 0),
      totalSupplierRefundReceived: filteredSupplierReturns.filter(r => r.refund_status === 'Refund_Received' || r.refund_status === 'Adjusted_In_Next_Bill').reduce((acc, r) => acc + (r.total_refund_amount || 0), 0),
      pendingSupplierRefundAmount: filteredSupplierReturns.filter(r => r.refund_status === 'Pending').reduce((acc, r) => acc + (r.total_refund_amount || 0), 0),
      supplierReplacementCount: filteredSupplierReturns.filter(r => r.refund_status === 'Replacement_Received').length,
      // Compatibility Aliases
      totalCOGS: cogs,
      creditGiven: udharGiven
    };
  }, [filteredSales, filteredPurchases, filteredExpenses, filteredDamages, filteredReturns, returns, customers, products, batches]);

  // Actions
  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      created_at: new Date().toISOString()
    };

    setProducts(prev => [newProduct, ...prev]);

    // If initial stock is provided, auto-create its initial batch with variety shelf life
    if (newProduct.stock_quantity > 0) {
      const todayFormatted = new Date().toISOString().split('T')[0];
      const shelfDays = getShelfLifeDays(newProduct.category, newProduct.name);
      const initialBatch: ProductBatch = {
        id: 'bat-' + Date.now(),
        product_id: newProduct.id,
        product_name: newProduct.name,
        batch_no: generateBatchNumber(newProduct.name, todayFormatted),
        mfg_date: todayFormatted,
        expiry_date: getSuggestedExpiryDate(todayFormatted, shelfDays),
        qty_received: newProduct.stock_quantity,
        qty_remaining: newProduct.stock_quantity,
        purchase_price: newProduct.purchase_price,
        notes: 'Initial stock on product creation',
        created_at: new Date().toISOString()
      };
      setBatches(prev => [initialBatch, ...prev]);
    }

    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('products').insert([newProduct]);
      } catch (e) {
        console.error('Failed to sync new product to Supabase', e);
      }
    }
    return newProduct;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('products').update(updates).eq('id', id);
      } catch (e) {
        console.error('Failed to update product in Supabase', e);
      }
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (e) {
        console.error('Failed to delete product in Supabase', e);
      }
    }
  };

  const adjustStock = async (
    id: string, 
    qtyDelta: number, 
    reason?: string,
    batchInfo?: { 
      batch_id?: string; 
      batch_no?: string; 
      expiry_date?: string; 
      mfg_date?: string;
      supplier_name?: string;
    }
  ) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    if (qtyDelta > 0) {
      if (batchInfo?.batch_id) {
        // Add quantity to an existing previous batch
        setBatches(prev => prev.map(b => {
          if (b.id === batchInfo.batch_id) {
            return {
              ...b,
              qty_received: Number((b.qty_received + qtyDelta).toFixed(2)),
              qty_remaining: Number((b.qty_remaining + qtyDelta).toFixed(2)),
              notes: reason || b.notes
            };
          }
          return b;
        }));
      } else {
        // Stock In: create a new batch with variety-specific shelf life
        const todayFormatted = new Date().toISOString().split('T')[0];
        const shelfDays = getShelfLifeDays(prod.category, prod.name);
        const batchNo = batchInfo?.batch_no || generateBatchNumber(prod.name, todayFormatted);
        const expiryDate = batchInfo?.expiry_date || getSuggestedExpiryDate(batchInfo?.mfg_date || todayFormatted, shelfDays);

        const newBatch: ProductBatch = {
          id: 'bat-' + Date.now(),
          product_id: id,
          product_name: prod.name,
          batch_no: batchNo,
          mfg_date: batchInfo?.mfg_date || todayFormatted,
          expiry_date: expiryDate,
          qty_received: qtyDelta,
          qty_remaining: qtyDelta,
          purchase_price: prod.purchase_price,
          supplier_name: batchInfo?.supplier_name,
          notes: reason || 'Stock In adjustment',
          created_at: new Date().toISOString()
        };
        setBatches(prev => [newBatch, ...prev]);
      }
    } else if (qtyDelta < 0) {
      // Stock Out: FEFO deduction from earliest expiring batch
      let remainingDeduct = Math.abs(qtyDelta);
      setBatches(prev => {
        const prodBatches = prev
          .filter(b => b.product_id === id && b.qty_remaining > 0)
          .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

        return prev.map(b => {
          if (b.product_id !== id || b.qty_remaining <= 0 || remainingDeduct <= 0) return b;
          if (prodBatches.some(pb => pb.id === b.id)) {
            const deduct = Math.min(b.qty_remaining, remainingDeduct);
            remainingDeduct -= deduct;
            return {
              ...b,
              qty_remaining: Number((b.qty_remaining - deduct).toFixed(2))
            };
          }
          return b;
        });
      });
    }

    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const newQty = Math.max(0, Number((p.stock_quantity + qtyDelta).toFixed(2)));
        return { ...p, stock_quantity: newQty };
      }
      return p;
    }));

    if (supabase && isSupabaseConnected) {
      const prodToSync = products.find(p => p.id === id);
      if (prodToSync) {
        const newQty = Math.max(0, Number((prodToSync.stock_quantity + qtyDelta).toFixed(2)));
        await supabase.from('products').update({ stock_quantity: newQty }).eq('id', id);
      }
    }
  };

  const addStockEntries = async (
    productId: string,
    entries: Array<{
      batch_id?: string;
      batch_no?: string;
      mfg_date?: string;
      expiry_date: string;
      quantity: number;
      purchase_price?: number;
      supplier_name?: string;
      lot_type?: 'fresh_today' | 'previous_lot' | 'existing_batch';
      notes?: string;
    }>
  ) => {
    const prod = products.find(p => p.id === productId);
    if (!prod || entries.length === 0) return;

    let totalQtyAdded = 0;
    const newBatchesToAppend: ProductBatch[] = [];

    entries.forEach((entry, idx) => {
      const qty = entry.quantity;
      if (qty <= 0) return;
      totalQtyAdded += qty;

      if (entry.batch_id) {
        // Increment existing batch
        setBatches(prev => prev.map(b => {
          if (b.id === entry.batch_id) {
            return {
              ...b,
              qty_received: Number((b.qty_received + qty).toFixed(2)),
              qty_remaining: Number((b.qty_remaining + qty).toFixed(2))
            };
          }
          return b;
        }));
      } else {
        // New batch entry
        const todayStr = new Date().toISOString().split('T')[0];
        const mfg = entry.mfg_date || todayStr;
        const shelfDays = getShelfLifeDays(prod.category, prod.name);
        const exp = entry.expiry_date || getSuggestedExpiryDate(mfg, shelfDays);
        const batchNo = entry.batch_no || generateBatchNumber(prod.name, mfg);

        newBatchesToAppend.push({
          id: `bat-${Date.now()}-${idx}`,
          product_id: prod.id,
          product_name: prod.name,
          batch_no: batchNo,
          mfg_date: mfg,
          expiry_date: exp,
          qty_received: qty,
          qty_remaining: qty,
          purchase_price: entry.purchase_price || prod.purchase_price,
          supplier_name: entry.supplier_name,
          notes: entry.notes || (entry.lot_type === 'previous_lot' ? 'Previous stock lot entry' : "Today's fresh lot arrival"),
          created_at: new Date().toISOString()
        });
      }
    });

    if (newBatchesToAppend.length > 0) {
      setBatches(prev => [...newBatchesToAppend, ...prev]);
    }

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stock_quantity: Number((p.stock_quantity + totalQtyAdded).toFixed(2))
        };
      }
      return p;
    }));

    if (supabase && isSupabaseConnected) {
      try {
        if (newBatchesToAppend.length > 0) {
          await supabase.from('batches').insert(newBatchesToAppend.map(b => ({
            id: b.id.startsWith('bat-') ? undefined : b.id,
            product_id: b.product_id,
            batch_no: b.batch_no,
            mfg_date: b.mfg_date,
            expiry_date: b.expiry_date,
            qty_received: b.qty_received,
            qty_remaining: b.qty_remaining,
            purchase_price: b.purchase_price,
            selling_price: b.selling_price || prod.selling_price || 0,
            supplier_name: b.supplier_name,
            notes: b.notes,
            status: 'ACTIVE'
          })));
        }
        await supabase.from('products').update({
          stock_quantity: Number((prod.stock_quantity + totalQtyAdded).toFixed(2)),
          updated_at: new Date().toISOString()
        }).eq('id', productId);
      } catch (err) {
        console.warn('Supabase batch inward sync error:', err);
      }
    }
  };

  const addBatch = async (batchData: Omit<ProductBatch, 'id' | 'created_at'>): Promise<ProductBatch> => {
    const newBatch: ProductBatch = {
      ...batchData,
      id: 'bat-' + Date.now(),
      created_at: new Date().toISOString()
    };
    setBatches(prev => [newBatch, ...prev]);
    setProducts(prev => prev.map(p => {
      if (p.id === batchData.product_id) {
        return {
          ...p,
          stock_quantity: Number((p.stock_quantity + batchData.qty_remaining).toFixed(2))
        };
      }
      return p;
    }));
    return newBatch;
  };

  const updateBatch = async (id: string, updates: Partial<ProductBatch>) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBatch = async (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
  };

  const createSale = async (saleData: {
    customer_name: string;
    customer_phone?: string;
    customer_gender?: CustomerGender;
    customer_age_group?: CustomerAgeGroup;
    customer_age?: number;
    total_amount: number;
    discount: number;
    net_amount: number;
    payment_mode: PaymentMode;
    cash_amount: number;
    online_amount: number;
    udhar_amount: number;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      purchase_cost: number;
      total_price: number;
    }>;
  }): Promise<Sale> => {
    const saleId = 'sale-' + Date.now();
    const invoiceNo = `YD-${new Date().getFullYear()}-${String(sales.length + 1).padStart(4, '0')}`;
    const todayFormatted = new Date().toISOString().split('T')[0];

    const saleItems = saleData.items.map((item, idx) => ({
      id: `si-${Date.now()}-${idx}`,
      sale_id: saleId,
      ...item
    }));

    const newSale: Sale = {
      id: saleId,
      invoice_no: invoiceNo,
      customer_name: saleData.customer_name || 'Counter Customer',
      customer_phone: saleData.customer_phone || '',
      customer_gender: saleData.customer_gender,
      customer_age_group: saleData.customer_age_group,
      customer_age: saleData.customer_age,
      total_amount: saleData.total_amount,
      discount: saleData.discount,
      net_amount: saleData.net_amount,
      payment_mode: saleData.payment_mode,
      cash_amount: saleData.cash_amount,
      online_amount: saleData.online_amount,
      udhar_amount: saleData.udhar_amount,
      sale_date: todayFormatted,
      created_at: new Date().toISOString(),
      items: saleItems
    };

    // Deduct stock for sold items using FEFO across active batches
    setBatches(prev => {
      let updatedBatches = [...prev];
      saleData.items.forEach(soldItem => {
        let remainingNeeded = soldItem.quantity;
        // 1. Filter out expired batches (Business Rule 4) and zero-stock batches
        // 2. Sort by earliest expiry date first (FEFO)
        const candidateBatches = updatedBatches
          .filter(b => b.product_id === soldItem.product_id && b.qty_remaining > 0 && computeExpiryStatus(b.expiry_date).status !== 'EXPIRED')
          .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

        for (const candidate of candidateBatches) {
          if (remainingNeeded <= 0) break;
          const takeQty = Math.min(candidate.qty_remaining, remainingNeeded);
          remainingNeeded -= takeQty;

          updatedBatches = updatedBatches.map(b => {
            if (b.id === candidate.id) {
              return {
                ...b,
                qty_remaining: Number((b.qty_remaining - takeQty).toFixed(2))
              };
            }
            return b;
          });
        }
      });
      return updatedBatches;
    });

    // Deduct stock for sold items on aggregate product
    setProducts(prev => {
      return prev.map(prod => {
        const soldItem = saleData.items.find(i => i.product_id === prod.id);
        if (soldItem) {
          const updatedStock = Math.max(0, Number((prod.stock_quantity - soldItem.quantity).toFixed(2)));
          return { ...prod, stock_quantity: updatedStock };
        }
        return prod;
      });
    });

    // If Udhar is involved and customer phone/name matches or new customer
    if (saleData.udhar_amount > 0) {
      setCustomers(prev => {
        const existing = prev.find(c => 
          (saleData.customer_phone && c.phone === saleData.customer_phone) || 
          c.name.toLowerCase() === saleData.customer_name.toLowerCase()
        );
        if (existing) {
          return prev.map(c => {
            if (c.id === existing.id) {
              const updatedCredit = c.total_credit + saleData.udhar_amount;
              const updatedBalance = c.current_balance + saleData.udhar_amount;
              return {
                ...c,
                total_credit: updatedCredit,
                current_balance: updatedBalance,
                status: 'Active',
                last_transaction_date: todayFormatted
              };
            }
            return c;
          });
        } else {
          // create new customer
          const newCust: UdharCustomer = {
            id: 'cust-' + Date.now(),
            name: saleData.customer_name,
            phone: saleData.customer_phone || 'N/A',
            total_credit: saleData.udhar_amount,
            total_paid: 0,
            current_balance: saleData.udhar_amount,
            status: 'Active',
            last_transaction_date: todayFormatted,
            created_at: new Date().toISOString()
          };
          return [newCust, ...prev];
        }
      });

      // record udhar transaction
      const newTx: UdharTransaction = {
        id: 'ut-' + Date.now(),
        customer_id: saleData.customer_name,
        type: 'Credit_Given',
        amount: saleData.udhar_amount,
        payment_mode: 'Cash',
        notes: `Bill #${invoiceNo}`,
        transaction_date: todayFormatted,
        created_at: new Date().toISOString()
      };
      setUdharTransactions(prev => [newTx, ...prev]);
    }

    setSales(prev => [newSale, ...prev]);
    setCurrentReceipt(newSale);

    // Sync to Supabase in background if connected
    if (supabase && isSupabaseConnected) {
      try {
        const { error } = await supabase.from('sales').insert([{
          id: newSale.id,
          invoice_no: newSale.invoice_no,
          customer_name: newSale.customer_name,
          customer_phone: newSale.customer_phone,
          total_amount: newSale.total_amount,
          discount: newSale.discount,
          net_amount: newSale.net_amount,
          payment_mode: newSale.payment_mode,
          cash_amount: newSale.cash_amount,
          online_amount: newSale.online_amount,
          udhar_amount: newSale.udhar_amount,
          sale_date: newSale.sale_date
        }]);
        if (!error) {
          await supabase.from('sale_items').insert(saleItems.map(si => ({
            id: si.id,
            sale_id: newSale.id,
            product_id: si.product_id,
            product_name: si.product_name,
            quantity: si.quantity,
            unit: si.unit,
            unit_price: si.unit_price,
            purchase_cost: si.purchase_cost,
            total_price: si.total_price
          })));
        }
      } catch (err) {
        console.error('Error saving sale to Supabase:', err);
      }
    }

    return newSale;
  };

  const createPurchase = async (purchaseData: Omit<Purchase, 'id' | 'created_at'>) => {
    const todayFormatted = new Date().toISOString().split('T')[0];
    const targetProd = products.find(p => p.id === purchaseData.product_id);
    const shelfDays = targetProd ? getShelfLifeDays(targetProd.category, targetProd.name) : 2;
    const batchNo = purchaseData.batch_no || generateBatchNumber(purchaseData.product_name, purchaseData.purchase_date || todayFormatted);
    const expiryDate = purchaseData.expiry_date || getSuggestedExpiryDate(purchaseData.purchase_date || todayFormatted, shelfDays);

    const newPur: Purchase = {
      ...purchaseData,
      id: 'pur-' + Date.now(),
      batch_no: batchNo,
      expiry_date: expiryDate,
      created_at: new Date().toISOString()
    };

    // Auto-create batch with variety-specific shelf life
    const newBatch: ProductBatch = {
      id: 'bat-' + Date.now(),
      product_id: purchaseData.product_id,
      product_name: purchaseData.product_name,
      batch_no: batchNo,
      mfg_date: purchaseData.purchase_date || todayFormatted,
      expiry_date: expiryDate,
      qty_received: purchaseData.quantity,
      qty_remaining: purchaseData.quantity,
      purchase_price: purchaseData.purchase_price,
      supplier_name: purchaseData.supplier_name,
      notes: purchaseData.notes,
      created_at: new Date().toISOString()
    };
    setBatches(prev => [newBatch, ...prev]);

    // Auto-increase product stock
    setProducts(prev => {
      return prev.map(p => {
        if (p.id === purchaseData.product_id) {
          return {
            ...p,
            stock_quantity: Number((p.stock_quantity + purchaseData.quantity).toFixed(2)),
            purchase_price: purchaseData.purchase_price || p.purchase_price
          };
        }
        return p;
      });
    });

    setPurchases(prev => [newPur, ...prev]);

    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('purchases').insert([newPur]);
      } catch (err) {
        console.error('Failed to sync purchase to Supabase', err);
      }
    }
  };

  const recordDamage = async (damageData: Omit<DamageRecord, 'id' | 'created_at'>) => {
    const newDmg: DamageRecord = {
      ...damageData,
      id: 'dmg-' + Date.now(),
      created_at: new Date().toISOString()
    };

    // Deduct from batches: if an expired batch exists for this product, deduct from it first!
    setBatches(prev => {
      let remainingDeduct = damageData.quantity;
      const prodBatches = prev
        .filter(b => b.product_id === damageData.product_id && b.qty_remaining > 0)
        // Sort expired first, then earliest expiry
        .sort((a, b) => {
          const aExp = computeExpiryStatus(a.expiry_date).status === 'EXPIRED';
          const bExp = computeExpiryStatus(b.expiry_date).status === 'EXPIRED';
          if (aExp && !bExp) return -1;
          if (!aExp && bExp) return 1;
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        });

      return prev.map(b => {
        if (b.product_id !== damageData.product_id || b.qty_remaining <= 0 || remainingDeduct <= 0) return b;
        if (prodBatches.some(pb => pb.id === b.id)) {
          const deduct = Math.min(b.qty_remaining, remainingDeduct);
          remainingDeduct -= deduct;
          return {
            ...b,
            qty_remaining: Number((b.qty_remaining - deduct).toFixed(2))
          };
        }
        return b;
      });
    });

    // Deduct stock
    setProducts(prev => {
      return prev.map(p => {
        if (p.id === damageData.product_id) {
          return {
            ...p,
            stock_quantity: Math.max(0, Number((p.stock_quantity - damageData.quantity).toFixed(2)))
          };
        }
        return p;
      });
    });

    setDamages(prev => [newDmg, ...prev]);

    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('damage_records').insert([newDmg]);
      } catch (err) {
        console.error('Failed to sync damage to Supabase', err);
      }
    }
  };

  const addUdharCustomer = async (custData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }): Promise<UdharCustomer> => {
    const newCust: UdharCustomer = {
      ...custData,
      id: 'cust-' + Date.now(),
      total_credit: 0,
      total_paid: 0,
      current_balance: 0,
      status: 'Active',
      last_transaction_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    setCustomers(prev => [newCust, ...prev]);

    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('udhar_customers').insert([newCust]);
      } catch (err) {
        console.error('Failed to sync udhar customer to Supabase', err);
      }
    }

    return newCust;
  };

  const recordUdharPayment = async (
    customerId: string, 
    amount: number, 
    paymentMode: 'Cash' | 'Online_UPI', 
    notes?: string
  ) => {
    const todayFormatted = new Date().toISOString().split('T')[0];

    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const newPaid = c.total_paid + amount;
        const newBalance = Math.max(0, c.current_balance - amount);
        return {
          ...c,
          total_paid: newPaid,
          current_balance: newBalance,
          status: newBalance <= 0 ? 'Cleared' : 'Active',
          last_transaction_date: todayFormatted
        };
      }
      return c;
    }));

    const newTx: UdharTransaction = {
      id: 'ut-' + Date.now(),
      customer_id: customerId,
      type: 'Payment_Received',
      amount,
      payment_mode: paymentMode,
      notes: notes || 'Jama payment received',
      transaction_date: todayFormatted,
      created_at: new Date().toISOString()
    };

    setUdharTransactions(prev => [newTx, ...prev]);

    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('udhar_transactions').insert([newTx]);
      } catch (err) {
        console.error('Failed to sync udhar payment to Supabase', err);
      }
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
    const newExp: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now(),
      created_at: new Date().toISOString()
    };

    setExpenses(prev => [newExp, ...prev]);

    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('expenses').insert([newExp]);
      } catch (err) {
        console.error('Failed to sync expense to Supabase', err);
      }
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('expenses').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete expense in Supabase', err);
      }
    }
  };

  const createReturn = async (returnData: Omit<ProductReturn, 'id' | 'return_no' | 'created_at'>): Promise<ProductReturn> => {
    const todayFormatted = new Date().toISOString().split('T')[0];
    const returnCountToday = returns.filter(r => r.return_date === todayFormatted).length + 1;
    const returnNo = `RET-${todayFormatted.replace(/-/g, '')}-${String(returnCountToday).padStart(3, '0')}`;
    
    const newReturn: ProductReturn = {
      ...returnData,
      id: 'ret-' + Date.now(),
      return_no: returnNo,
      created_at: new Date().toISOString()
    };

    setReturns(prev => [newReturn, ...prev]);

    // 1. If condition is 'Resellable', add stock back to products & active batch
    if (newReturn.condition === 'Resellable') {
      setProducts(prev => prev.map(p => {
        if (p.id === newReturn.product_id) {
          return {
            ...p,
            stock_quantity: Math.round((p.stock_quantity + newReturn.quantity) * 100) / 100
          };
        }
        return p;
      }));

      // Restock the earliest batch for this product
      setBatches(prev => {
        let restocked = false;
        return prev.map(b => {
          if (!restocked && b.product_id === newReturn.product_id) {
            restocked = true;
            return {
              ...b,
              qty_remaining: Math.round((b.qty_remaining + newReturn.quantity) * 100) / 100
            };
          }
          return b;
        });
      });
    } else {
      // 2. If 'Damaged_Waste', automatically record in Damages
      const autoDamage: DamageRecord = {
        id: 'dmg-' + Date.now(),
        product_id: newReturn.product_id,
        product_name: newReturn.product_name,
        quantity: newReturn.quantity,
        unit: newReturn.unit,
        estimated_loss_amount: newReturn.refund_amount,
        reason: 'Other',
        damage_date: newReturn.return_date,
        notes: `Customer Return: ${newReturn.reason}${newReturn.notes ? ' - ' + newReturn.notes : ''} (Batch: RETURN-WASTE)`,
        created_at: new Date().toISOString()
      };
      setDamages(prev => [autoDamage, ...prev]);
    }

    // 3. If refund mode is 'Udhar_Credit' and customer is identified, credit their account
    if (newReturn.refund_mode === 'Udhar_Credit' && (newReturn.customer_name || newReturn.customer_phone)) {
      setCustomers(prev => prev.map(c => {
        const match = (newReturn.customer_phone && c.phone === newReturn.customer_phone) || 
                      (newReturn.customer_name && c.name.toLowerCase() === newReturn.customer_name.toLowerCase());
        if (match) {
          const newBalance = Math.max(0, Math.round((c.current_balance - newReturn.refund_amount) * 100) / 100);
          return {
            ...c,
            current_balance: newBalance,
            last_transaction_date: newReturn.return_date
          };
        }
        return c;
      }));

      const matchedCust = customers.find(c => 
        (newReturn.customer_phone && c.phone === newReturn.customer_phone) || 
        (newReturn.customer_name && c.name.toLowerCase() === newReturn.customer_name.toLowerCase())
      );

      if (matchedCust) {
        const udharTx: UdharTransaction = {
          id: 'utx-' + Date.now(),
          customer_id: matchedCust.id,
          type: 'Payment_Received',
          amount: newReturn.refund_amount,
          balance_after: Math.max(0, matchedCust.current_balance - newReturn.refund_amount),
          notes: `माल परतावा जमा (Return ${returnNo}): ${newReturn.product_name}`,
          transaction_date: newReturn.return_date,
          created_at: new Date().toISOString()
        };
        setUdharTransactions(prev => [udharTx, ...prev]);
      }
    }

    // Sync to Supabase if available
    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('product_returns').insert([newReturn]);
      } catch (err) {
        console.error('Failed to sync return to Supabase', err);
      }
    }

    return newReturn;
  };

  const deleteReturn = async (id: string) => {
    setReturns(prev => prev.filter(r => r.id !== id));
    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('product_returns').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete return from Supabase', err);
      }
    }
  };

  // Supplier Returns (खरेदी व सप्लायर परतावा - खराब/एक्सपायर माल परत करणे)
  const createSupplierReturn = async (returnData: Omit<SupplierReturn, 'id' | 'return_no' | 'created_at'>): Promise<SupplierReturn> => {
    const returnNo = `VRET-${new Date().getFullYear()}-${String(supplierReturns.length + 1).padStart(4, '0')}`;
    const newReturn: SupplierReturn = {
      ...returnData,
      id: 'vret-' + Date.now(),
      return_no: returnNo,
      created_at: new Date().toISOString()
    };

    setSupplierReturns(prev => [newReturn, ...prev]);

    // 1. Defective / expired goods returned to supplier: deduct from product stock
    setProducts(prev => prev.map(p => {
      if (p.id === returnData.product_id) {
        // If replacement is already received immediately, stock stays maintained
        if (returnData.refund_status === 'Replacement_Received') {
          return p;
        }
        return {
          ...p,
          stock_quantity: Math.max(0, Number((p.stock_quantity - returnData.quantity).toFixed(2)))
        };
      }
      return p;
    }));

    // 2. Batch stock deduction
    setBatches(prev => {
      if (returnData.refund_status === 'Replacement_Received') {
        const todayFormatted = new Date().toISOString().split('T')[0];
        const targetProd = products.find(p => p.id === returnData.product_id);
        const shelfDays = targetProd ? getShelfLifeDays(targetProd.category, targetProd.name) : 3;
        const replBatch: ProductBatch = {
          id: 'bat-repl-' + Date.now(),
          product_id: returnData.product_id,
          product_name: returnData.product_name,
          batch_no: `REPL-${Date.now().toString().slice(-4)}`,
          mfg_date: todayFormatted,
          expiry_date: getSuggestedExpiryDate(todayFormatted, shelfDays),
          qty_received: returnData.quantity,
          qty_remaining: returnData.quantity,
          purchase_price: returnData.purchase_price,
          supplier_name: returnData.supplier_name,
          notes: `Replacement received for supplier return ${returnNo}`,
          created_at: new Date().toISOString()
        };
        return [replBatch, ...prev];
      }

      let remainingToDeduct = returnData.quantity;
      return prev.map(b => {
        if (remainingToDeduct <= 0) return b;
        const isTarget = returnData.batch_no 
          ? (b.batch_no === returnData.batch_no || b.id === returnData.batch_no) 
          : (b.product_id === returnData.product_id && b.qty_remaining > 0);
        
        if (isTarget) {
          const deductAmt = Math.min(b.qty_remaining, remainingToDeduct);
          remainingToDeduct -= deductAmt;
          return {
            ...b,
            qty_remaining: Number((b.qty_remaining - deductAmt).toFixed(2))
          };
        }
        return b;
      });
    });

    // 3. Supabase sync if connected
    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('supplier_returns').insert([newReturn]);
      } catch (err) {
        console.error('Failed to sync supplier return to Supabase', err);
      }
    }

    return newReturn;
  };

  const updateSupplierRefundStatus = async (
    id: string, 
    newStatus: SupplierRefundStatus, 
    refundMode?: 'Cash' | 'Online_UPI' | 'Credit_Deduction' | 'Replacement', 
    notes?: string
  ) => {
    const target = supplierReturns.find(r => r.id === id);
    if (!target) return;

    const todayFormatted = new Date().toISOString().split('T')[0];

    // If changing to replacement received and wasn't before, restore product stock
    if (newStatus === 'Replacement_Received' && target.refund_status !== 'Replacement_Received') {
      setProducts(curr => curr.map(p => {
        if (p.id === target.product_id) {
          return {
            ...p,
            stock_quantity: Number((p.stock_quantity + target.quantity).toFixed(2))
          };
        }
        return p;
      }));
    }

    setSupplierReturns(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          refund_status: newStatus,
          refund_mode: refundMode || r.refund_mode,
          refund_date: todayFormatted,
          notes: notes ? (r.notes ? `${r.notes} | ${notes}` : notes) : r.notes
        };
      }
      return r;
    }));

    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('supplier_returns').update({
          refund_status: newStatus,
          refund_mode: refundMode,
          refund_date: todayFormatted,
          notes
        }).eq('id', id);
      } catch (err) {
        console.error('Failed to update supplier return in Supabase', err);
      }
    }
  };

  const deleteSupplierReturn = async (id: string) => {
    const target = supplierReturns.find(r => r.id === id);
    if (target && target.refund_status !== 'Replacement_Received') {
      // Restore product stock
      setProducts(prev => prev.map(p => {
        if (p.id === target.product_id) {
          return {
            ...p,
            stock_quantity: Number((p.stock_quantity + target.quantity).toFixed(2))
          };
        }
        return p;
      }));
    }
    setSupplierReturns(prev => prev.filter(r => r.id !== id));
    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('supplier_returns').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete supplier return from Supabase', err);
      }
    }
  };

  return (
    <StoreContext.Provider value={{
      activeView,
      setActiveView,
      timeFilter,
      setTimeFilter,
      isSupabaseConnected,
      isSyncing,
      syncWithSupabase,
      refreshData,
      resetToSampleData,
      products,
      batches,
      sales,
      purchases,
      damages,
      customers,
      udharTransactions,
      expenses,
      returns,
      supplierReturns,
      currentReceipt,
      setCurrentReceipt,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      addStockEntries,
      addBatch,
      updateBatch,
      deleteBatch,
      createSale,
      createPurchase,
      recordDamage,
      addUdharCustomer,
      recordUdharPayment,
      addExpense,
      deleteExpense,
      createReturn,
      deleteReturn,
      createSupplierReturn,
      updateSupplierRefundStatus,
      deleteSupplierReturn,
      filteredSales,
      filteredPurchases,
      filteredExpenses,
      filteredDamages,
      filteredReturns,
      filteredSupplierReturns,
      metrics
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
