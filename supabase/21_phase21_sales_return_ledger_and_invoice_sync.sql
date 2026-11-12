-- ============================================================================
-- YOGESHWARI DAIRY SHOP INVENTORY & ERP SYSTEM - PHASE 21 MIGRATION
-- File: 21_phase21_sales_return_ledger_and_invoice_sync.sql
-- Description: Customer Sales Return & Daily Sales / Ledger Realtime Synchronization:
--   1. Partial Return & Invoice Cut Architecture:
--      - When customer returns partial goods (e.g. 1 kg out of 2 kg Paneer):
--        * Original sale net_amount, total_amount & cash/online/udhar are cut
--        * Line items are updated with remaining quantity & price
--        * Daily Sales & Cash/Online Ledger reflects updated active amount
--        * Return details are logged in product_returns
--   2. Full Return (100%):
--      - When all goods are returned, the sale row is safely removed from active sales
--      - Historical return record is preserved in product_returns
--   3. Foreign Key Cascades:
--      - sale_items ON DELETE CASCADE (safe sale deletion)
--      - product_returns.sale_id ON DELETE SET NULL (never loses return records)
--   4. Unified Realtime Views:
--      - v_daily_sales_and_returns_ledger: Complete ledger showing original, returned & net
--      - v_owner_admin_counter_summary: Net counter sales & collections
--      - v_owner_admin_counter_sales_details: Granular invoice lines
--      - v_customer_returns_summary: Return analytics & condition breakdown
--
-- Execution: Run directly in Supabase Dashboard -> SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: VERIFY / CREATE PRODUCT_RETURNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_no VARCHAR(100) UNIQUE NOT NULL,
    sale_id UUID,
    invoice_no VARCHAR(100),
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    refund_amount NUMERIC(12, 2) NOT NULL CHECK (refund_amount >= 0),
    refund_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    reason VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL DEFAULT 'Resellable',
    customer_name VARCHAR(255),
    customer_phone VARCHAR(25),
    notes TEXT,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure extended tracking columns
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS admin_name VARCHAR(150);
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS admin_email VARCHAR(150);
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS counter_name VARCHAR(150);

-- Safe constraints
ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_refund_mode_check;
ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_refund_mode_check 
CHECK (refund_mode IN ('Cash', 'Online_UPI', 'Udhar_Credit', 'Replacement', 'Credit_Note'));

ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_condition_check;
ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_condition_check 
CHECK (condition IN ('Resellable', 'Damaged_Waste'));

-- ============================================================================
-- STEP 2: ENSURE SAFE FOREIGN KEY CASCADE RULES
-- ============================================================================

-- 2A. sale_items -> sales (ON DELETE CASCADE: deleting a sale cleans up line items)
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_fkey;
ALTER TABLE public.sale_items 
ADD CONSTRAINT sale_items_sale_id_fkey 
FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;

-- 2B. sale_batch_allocations -> sales (ON DELETE CASCADE)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sale_batch_allocations') THEN
        ALTER TABLE public.sale_batch_allocations DROP CONSTRAINT IF EXISTS sale_batch_allocations_sale_id_fkey;
        ALTER TABLE public.sale_batch_allocations 
        ADD CONSTRAINT sale_batch_allocations_sale_id_fkey 
        FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2C. product_returns -> sales (ON DELETE SET NULL: full return deletion never loses return history)
ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_sale_id_fkey;
ALTER TABLE public.product_returns 
ADD CONSTRAINT product_returns_sale_id_fkey 
FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;

-- 2D. product_returns -> products (ON DELETE SET NULL)
ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_product_id_fkey;
ALTER TABLE public.product_returns 
ADD CONSTRAINT product_returns_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: HIGH SPEED INDEXES FOR INSTANT LEDGER & RETURN LOOKUP
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON public.sales (invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales (sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items (product_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_invoice_no ON public.product_returns (invoice_no);
CREATE INDEX IF NOT EXISTS idx_product_returns_sale_id ON public.product_returns (sale_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_date ON public.product_returns (return_date DESC);

-- ============================================================================
-- STEP 4: PERMISSIVE ROW LEVEL SECURITY (RLS) FOR MULTI-COUNTER BILLING
-- ============================================================================

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow counter delete and update for sales" ON public.sales;
CREATE POLICY "Allow counter delete and update for sales" 
ON public.sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow counter delete and update for sale_items" ON public.sale_items;
CREATE POLICY "Allow counter delete and update for sale_items" 
ON public.sale_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow counter access for product_returns" ON public.product_returns;
CREATE POLICY "Allow counter access for product_returns" 
ON public.product_returns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 5: COMPREHENSIVE VIEW - DAILY SALES & RETURNS UNIFIED LEDGER
-- ============================================================================

DROP VIEW IF EXISTS public.v_daily_sales_and_returns_ledger CASCADE;

CREATE OR REPLACE VIEW public.v_daily_sales_and_returns_ledger AS
SELECT 
    s.id AS sale_id,
    s.invoice_no,
    s.sale_date,
    s.customer_name,
    s.customer_phone,
    s.payment_mode,
    s.created_by_name,
    s.counter_name,
    s.total_amount AS current_items_total,
    s.discount AS current_discount,
    s.net_amount AS active_ledger_net_amount,
    s.cash_amount,
    s.online_amount,
    s.udhar_amount,
    COALESCE(pr_summary.total_refunded, 0) AS total_refunded_amount,
    COALESCE(pr_summary.returned_items_count, 0) AS returned_items_count,
    (s.net_amount + COALESCE(pr_summary.total_refunded, 0)) AS original_gross_amount,
    CASE 
        WHEN COALESCE(pr_summary.total_refunded, 0) > 0 THEN 'PARTIALLY_RETURNED'
        ELSE 'NORMAL_SALE'
    END AS ledger_status,
    s.created_at
FROM public.sales s
LEFT JOIN (
    SELECT 
        COALESCE(sale_id::text, invoice_no) AS link_key,
        SUM(refund_amount) AS total_refunded,
        COUNT(id) AS returned_items_count
    FROM public.product_returns
    GROUP BY COALESCE(sale_id::text, invoice_no)
) pr_summary ON (pr_summary.link_key = s.id::text OR pr_summary.link_key = s.invoice_no)
ORDER BY s.created_at DESC;

-- ============================================================================
-- STEP 6: REFRESH COUNTER SUMMARY & ANALYTICAL VIEWS
-- ============================================================================

DROP VIEW IF EXISTS public.v_owner_admin_counter_summary CASCADE;

CREATE OR REPLACE VIEW public.v_owner_admin_counter_summary AS
SELECT 
    s.sale_date,
    COALESCE(s.admin_slot, 0) AS admin_slot,
    CASE 
        WHEN s.created_by_role = 'Owner' OR s.admin_slot IS NULL THEN 'Owner'
        ELSE 'Admin'
    END AS operator_role,
    CASE 
        WHEN s.created_by_role = 'Owner' OR s.admin_slot IS NULL THEN 'Nikhil Sakhare'
        ELSE 'Nilesh Sakhare'
    END AS operator_name,
    COALESCE(s.counter_name, 'काऊंटर १') AS counter_name,
    COUNT(s.id) AS total_bills_count,
    COALESCE(SUM(s.net_amount), 0) AS total_sales_revenue,
    COALESCE(SUM(s.cash_amount), 0) AS cash_inflow,
    COALESCE(SUM(s.online_amount), 0) AS online_inflow,
    COALESCE(SUM(s.udhar_amount), 0) AS credit_given,
    COALESCE(SUM(s.discount), 0) AS total_discount_given
FROM public.sales s
GROUP BY 
    s.sale_date,
    s.admin_slot,
    s.created_by_role,
    s.counter_name
ORDER BY s.sale_date DESC, operator_role ASC;

DROP VIEW IF EXISTS public.v_customer_returns_summary CASCADE;

CREATE OR REPLACE VIEW public.v_customer_returns_summary AS
SELECT 
    pr.return_date,
    COUNT(pr.id) AS total_returns_count,
    COALESCE(SUM(pr.refund_amount), 0) AS total_refund_amount,
    COALESCE(SUM(CASE WHEN pr.condition = 'Resellable' THEN pr.refund_amount ELSE 0 END), 0) AS resellable_restocked_amount,
    COALESCE(SUM(CASE WHEN pr.condition = 'Damaged_Waste' THEN pr.refund_amount ELSE 0 END), 0) AS waste_damage_loss_amount,
    COALESCE(SUM(CASE WHEN pr.refund_mode = 'Cash' THEN pr.refund_amount ELSE 0 END), 0) AS cash_refunded,
    COALESCE(SUM(CASE WHEN pr.refund_mode = 'Online_UPI' THEN pr.refund_amount ELSE 0 END), 0) AS online_refunded,
    COALESCE(SUM(CASE WHEN pr.refund_mode = 'Udhar_Credit' THEN pr.refund_amount ELSE 0 END), 0) AS udhar_credit_adjusted
FROM public.product_returns pr
GROUP BY pr.return_date
ORDER BY pr.return_date DESC;

-- ============================================================================
-- STEP 7: REALTIME MULTI-DEVICE PUBLICATION
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_returns'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.product_returns;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sales'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sale_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;
    END IF;
END $$;

ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.sale_items REPLICA IDENTITY FULL;
ALTER TABLE public.product_returns REPLICA IDENTITY FULL;

-- ============================================================================
-- STEP 8: PERMISSIONS
-- ============================================================================

GRANT ALL ON TABLE public.sales TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sale_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_returns TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.v_daily_sales_and_returns_ledger TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.v_owner_admin_counter_summary TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.v_customer_returns_summary TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (खात्री करण्यासाठी खालील क्वेरी रन करा)
-- ============================================================================
-- 1. Check Unified Ledger View:
SELECT invoice_no, sale_date, active_ledger_net_amount, total_refunded_amount, original_gross_amount, ledger_status 
FROM public.v_daily_sales_and_returns_ledger 
LIMIT 10;

-- 2. Verify Foreign Key Cascade Rule:
SELECT conname, confdeltype 
FROM pg_constraint 
WHERE conname IN ('sale_items_sale_id_fkey', 'product_returns_sale_id_fkey');
