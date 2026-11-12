-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 11: ROW LEVEL SECURITY (RLS), PERMISSIONS & ANALYTIC VIEWS
-- File: supabase/11_phase11_rls_security_and_views.sql
-- ============================================================================
-- Description:
-- Enables Row Level Security (RLS) on all public tables, establishes secure
-- Data API grants for the ERP client and roles, and creates high-performance
-- analytical reporting views with WITH (security_invoker = true).
--
-- Instructions:
-- 1. Ensure Phases 1-10 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- ============================================================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL CORE TABLES
-- ============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.udhar_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.udhar_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_batch_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. GRANT DATA API ACCESS PERMISSIONS TO ANON & AUTHENTICATED ROLES
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Default privileges for future tables and routines
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- ============================================================================
-- 3. PERMISSIVE ERP CLIENT RLS POLICIES (Full Counter & Owner Operations)
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'categories', 'units', 'brands', 'products', 'suppliers', 'purchases', 
        'batches', 'stock_movements', 'damage_records', 'udhar_customers', 
        'udhar_transactions', 'sales', 'sale_items', 'sale_batch_allocations', 
        'product_returns', 'supplier_returns', 'expenses'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        -- Drop existing policy if any
        EXECUTE format('DROP POLICY IF EXISTS "Allow counter access for %I" ON public.%I;', tbl, tbl);
        -- Create unified policy for authenticated and anon roles
        EXECUTE format('
            CREATE POLICY "Allow counter access for %I" 
            ON public.%I 
            FOR ALL 
            TO anon, authenticated 
            USING (true) 
            WITH CHECK (true);
        ', tbl, tbl);
    END LOOP;
END $$;

-- ============================================================================
-- 4. ANALYTICAL REPORTING VIEWS (WITH security_invoker = true)
-- ============================================================================

-- View 1: Real-time Stock & Inventory Valuation
CREATE OR REPLACE VIEW public.v_inventory_valuation
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.unit,
    p.stock_quantity,
    p.purchase_price,
    p.selling_price,
    ROUND(p.stock_quantity * p.purchase_price, 2) AS total_inventory_cost,
    ROUND(p.stock_quantity * p.selling_price, 2) AS total_inventory_retail_value,
    ROUND((p.stock_quantity * p.selling_price) - (p.stock_quantity * p.purchase_price), 2) AS expected_gross_profit,
    CASE 
        WHEN p.stock_quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN p.stock_quantity <= p.min_stock_alert THEN 'LOW_STOCK_ALERT'
        ELSE 'HEALTHY'
    END AS stock_status
FROM public.products p
WHERE p.is_active = TRUE;

-- View 2: Product Real-time Stock Status (Server & Client Compatible)
CREATE OR REPLACE VIEW public.v_product_stock
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.name,
    p.category_id,
    p.brand_id,
    p.unit_id,
    p.category,
    p.unit,
    p.sku,
    p.barcode,
    p.purchase_price,
    p.selling_price,
    p.gst_percent,
    p.min_stock,
    p.max_stock,
    p.image_url,
    p.is_active,
    COALESCE(SUM(b.qty_remaining), p.stock_quantity) AS current_stock,
    CASE 
        WHEN COALESCE(SUM(b.qty_remaining), p.stock_quantity) <= 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(b.qty_remaining), p.stock_quantity) <= p.min_stock THEN 'LOW'
        WHEN COALESCE(SUM(b.qty_remaining), p.stock_quantity) >= p.max_stock THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END AS stock_status,
    ROUND(COALESCE(SUM(b.qty_remaining), p.stock_quantity) * p.purchase_price, 2) AS stock_value
FROM public.products p
LEFT JOIN public.batches b ON b.product_id = p.id AND b.qty_remaining > 0
GROUP BY p.id;

-- View 3: Expiring Batches Alert
CREATE OR REPLACE VIEW public.v_expiring_batches_alert
WITH (security_invoker = true) AS
SELECT 
    b.id,
    b.product_id,
    b.product_name,
    b.batch_no,
    b.mfg_date,
    b.expiry_date,
    b.qty_remaining,
    b.supplier_name,
    b.expiry_date - CURRENT_DATE AS days_until_expiry,
    CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN b.expiry_date = CURRENT_DATE THEN 'EXPIRING_TODAY'
        WHEN b.expiry_date = CURRENT_DATE + 1 THEN 'EXPIRING_TOMORROW'
        WHEN b.expiry_date <= CURRENT_DATE + 3 THEN 'EXPIRING_IN_3_DAYS'
        ELSE 'FRESH'
    END AS expiry_urgency
FROM public.batches b
WHERE b.qty_remaining > 0
ORDER BY b.expiry_date ASC;

-- View 4: Batch Expiry Status (Server & Client Compatible)
CREATE OR REPLACE VIEW public.v_batch_expiry_status
WITH (security_invoker = true) AS
SELECT 
    b.id,
    b.product_id,
    b.product_name,
    b.batch_no,
    b.mfg_date,
    b.expiry_date,
    b.qty_received,
    b.qty_remaining,
    b.purchase_price,
    b.selling_price,
    b.supplier_id,
    b.supplier_name,
    b.status,
    b.expiry_date - CURRENT_DATE AS days_to_expiry,
    CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN b.expiry_date = CURRENT_DATE THEN 'EXPIRING_TODAY'
        WHEN b.expiry_date = CURRENT_DATE + 1 THEN 'EXPIRING_TOMORROW'
        WHEN b.expiry_date <= CURRENT_DATE + 3 THEN 'EXPIRING_IN_3_DAYS'
        ELSE 'FRESH'
    END AS expiry_status
FROM public.batches b
ORDER BY b.expiry_date ASC;

-- View 5: Daily Sales & Cash vs UPI Summary
CREATE OR REPLACE VIEW public.v_daily_sales_summary
WITH (security_invoker = true) AS
SELECT 
    sale_date,
    COUNT(id) AS total_bills,
    COALESCE(SUM(total_amount), 0) AS gross_sales,
    COALESCE(SUM(discount), 0) AS total_discount,
    COALESCE(SUM(net_amount), 0) AS net_revenue,
    COALESCE(SUM(cash_amount), 0) AS total_cash,
    COALESCE(SUM(online_amount), 0) AS total_online_upi,
    COALESCE(SUM(udhar_amount), 0) AS total_credit_given
FROM public.sales
GROUP BY sale_date
ORDER BY sale_date DESC;

-- View 6: Pending Supplier Refunds Tracker
CREATE OR REPLACE VIEW public.v_supplier_returns_pending
WITH (security_invoker = true) AS
SELECT 
    id,
    return_no,
    supplier_name,
    product_name,
    quantity,
    unit,
    total_refund_amount,
    reason,
    return_date,
    refund_status
FROM public.supplier_returns
WHERE refund_status = 'Pending'
ORDER BY return_date ASC;
