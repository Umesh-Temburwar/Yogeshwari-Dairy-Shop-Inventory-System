import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Product, Sale, Purchase, DamageRecord, UdharCustomer, 
  UdharTransaction, Expense, TimeRangeFilter, PaymentMode 
} from '../types';
import { 
  INITIAL_PRODUCTS, INITIAL_SALES, INITIAL_PURCHASES, 
  INITIAL_DAMAGES, INITIAL_CUSTOMERS, INITIAL_UDHAR_TRANSACTIONS, 
  INITIAL_EXPENSES 
} from '../lib/mockInitialData';
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
  | 'reorder';

interface StoreContextType {
  // Navigation & Settings
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  timeFilter: TimeRangeFilter;
  setTimeFilter: (filter: TimeRangeFilter) => void;
  isSupabaseConnected: boolean;
  isSyncing: boolean;
  syncWithSupabase: () => Promise<void>;
  resetToSampleData: () => void;
  
  // Data State
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  damages: DamageRecord[];
  customers: UdharCustomer[];
  udharTransactions: UdharTransaction[];
  expenses: Expense[];
  
  // Receipt
  currentReceipt: Sale | null;
  setCurrentReceipt: (sale: Sale | null) => void;

  // Actions
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, qtyDelta: number, reason?: string) => Promise<void>;
  
  createSale: (saleData: {
    customer_name: string;
    customer_phone?: string;
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

  // Filtered views and analytics
  filteredSales: Sale[];
  filteredPurchases: Purchase[];
  filteredExpenses: Expense[];
  filteredDamages: DamageRecord[];
  
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
  };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('today');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [currentReceipt, setCurrentReceipt] = useState<Sale | null>(null);

  // Initialize state from LocalStorage or mock data
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('yd_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('yd_sales');
    return saved ? JSON.parse(saved) : INITIAL_SALES;
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

  // Save to localStorage on state changes
  useEffect(() => {
    localStorage.setItem('yd_products', JSON.stringify(products));
  }, [products]);

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
      setIsSupabaseConnected(true);
    } catch (err) {
      console.error('Supabase sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetToSampleData = () => {
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setPurchases(INITIAL_PURCHASES);
    setDamages(INITIAL_DAMAGES);
    setCustomers(INITIAL_CUSTOMERS);
    setUdharTransactions(INITIAL_UDHAR_TRANSACTIONS);
    setExpenses(INITIAL_EXPENSES);
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
      outOfStockCount
    };
  }, [filteredSales, filteredPurchases, filteredExpenses, filteredDamages, customers, products]);

  // Actions
  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      created_at: new Date().toISOString()
    };

    setProducts(prev => [newProduct, ...prev]);

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

  const adjustStock = async (id: string, qtyDelta: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const newQty = Math.max(0, Number((p.stock_quantity + qtyDelta).toFixed(2)));
        return { ...p, stock_quantity: newQty };
      }
      return p;
    }));

    if (supabase && isSupabaseConnected) {
      const prod = products.find(p => p.id === id);
      if (prod) {
        const newQty = Math.max(0, Number((prod.stock_quantity + qtyDelta).toFixed(2)));
        await supabase.from('products').update({ stock_quantity: newQty }).eq('id', id);
      }
    }
  };

  const createSale = async (saleData: {
    customer_name: string;
    customer_phone?: string;
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

    // Deduct stock for sold items
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
    const newPur: Purchase = {
      ...purchaseData,
      id: 'pur-' + Date.now(),
      created_at: new Date().toISOString()
    };

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

  return (
    <StoreContext.Provider value={{
      activeView,
      setActiveView,
      timeFilter,
      setTimeFilter,
      isSupabaseConnected,
      isSyncing,
      syncWithSupabase,
      resetToSampleData,
      products,
      sales,
      purchases,
      damages,
      customers,
      udharTransactions,
      expenses,
      currentReceipt,
      setCurrentReceipt,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      createSale,
      createPurchase,
      recordDamage,
      addUdharCustomer,
      recordUdharPayment,
      addExpense,
      deleteExpense,
      filteredSales,
      filteredPurchases,
      filteredExpenses,
      filteredDamages,
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
