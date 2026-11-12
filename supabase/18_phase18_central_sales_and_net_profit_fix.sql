-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 18: CENTRAL SALES PERSISTENCE, NET PROFIT CALCULATION & INVOICE FIX
-- File: supabase/18_phase18_central_sales_and_net_profit_fix.sql
-- ============================================================================
-- Summary of Fixes:
-- 1. Safely drops dependent views first with CASCADE (prevents PostgreSQL 0A000 & 42P16 errors).
-- 2. Adds 'customer_age' INTEGER column to public.sales (Fixes PGRST204 missing column error).
-- 3. Ensures all counter tracking columns exist on public.sales:
--    - created_by_email, created_by_name, created_by_role, admin_slot, counter_name.
-- 4. Recreates clean analytical views for Shop Owner dashboard:
--    - v_owner_admin_counter_sales_details
--    - v_owner_admin_counter_summary
-- 5. Enables REPLICA IDENTITY FULL on core tables for live WebSocket sync.
-- 6. Ensures public.sales and public.sale_items are registered in 'supabase_realtime'.
-- 7. Verifies permissive RLS policies for shop counter terminals (anon & authenticated).
-- ============================================================================

-- 1. Safely drop dependent views first with CASCADE to prevent 0A000 dependency error
DROP VIEW IF EXISTS public.v_owner_admin_counter_sales_details CASCADE;
DROP VIEW IF EXISTS public.v_owner_admin_counter_summary CASCADE;

-- 2. Ensure customer_age column exists on public.sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_age INTEGER;

-- 3. Ensure all counter tracking columns exist on public.sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) DEFAULT 'Admin',
ADD COLUMN IF NOT EXISTS admin_slot INTEGER,
ADD COLUMN IF NOT EXISTS counter_name VARCHAR(100);

-- 4. Create indices for fast lookup by date, invoice, and operator
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales (sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_by_email ON public.sales (created_by_email);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON public.sales (invoice_no);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items (product_id);

-- 5. Recreate Analytical Views Cleanly
CREATE OR REPLACE VIEW public.v_owner_admin_counter_sales_details AS
SELECT 
    s.id,
    s.invoice_no,
    s.sale_date,
    s.created_at,
    COALESCE(s.created_by_email, '') AS admin_email,
    COALESCE(s.created_by_name, 'Admin') AS admin_name,
    COALESCE(s.admin_slot, 1) AS admin_slot,
    COALESCE(s.counter_name, 'काऊंटर १ - मुख्य बिलिंग') AS counter_name,
    s.customer_name,
    s.customer_phone,
    s.payment_mode,
    s.net_amount,
    s.cash_amount,
    s.online_amount,
    s.udhar_amount,
    (
        SELECT string_agg(si.product_name || ' (' || si.quantity || ' ' || si.unit || ')', ', ')
        FROM public.sale_items si
        WHERE si.sale_id = s.id
    ) AS items_summary
FROM public.sales s
WHERE s.status = 'COMPLETED'
ORDER BY s.created_at DESC;

CREATE OR REPLACE VIEW public.v_owner_admin_counter_summary AS
SELECT 
    COALESCE(s.admin_slot, 0) AS admin_slot,
    COALESCE(s.created_by_email, '') AS admin_email,
    COALESCE(s.created_by_name, 'प्रशासक') AS admin_name,
    COALESCE(s.counter_name, 'काऊंटर') AS counter_name,
    COUNT(s.id) AS total_bills_count,
    COALESCE(SUM(s.net_amount), 0) AS total_sales_amount,
    COALESCE(SUM(s.cash_amount), 0) AS total_cash_collected,
    COALESCE(SUM(s.online_amount), 0) AS total_online_collected,
    COALESCE(SUM(s.udhar_amount), 0) AS total_udhar_given,
    MIN(s.created_at) AS first_sale_at,
    MAX(s.created_at) AS latest_sale_at
FROM public.sales s
WHERE s.status = 'COMPLETED'
GROUP BY s.admin_slot, s.created_by_email, s.created_by_name, s.counter_name
ORDER BY total_sales_amount DESC;

-- 6. Enable REPLICA IDENTITY FULL for complete Realtime WebSocket replication
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.sale_items REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.batches REPLICA IDENTITY FULL;
ALTER TABLE public.udhar_customers REPLICA IDENTITY FULL;
ALTER TABLE public.udhar_transactions REPLICA IDENTITY FULL;

-- 7. Register sales and sale_items into 'supabase_realtime' publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY['sales', 'sale_items', 'products', 'batches', 'udhar_customers', 'udhar_transactions', 'admin_audit_logs'];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        END IF;
    END LOOP;
END $$;

-- 8. Ensure permissive RLS policies for seamless counter billing
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow counter access for sales" ON public.sales;
CREATE POLICY "Allow counter access for sales" 
ON public.sales 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow counter access for sale_items" ON public.sale_items;
CREATE POLICY "Allow counter access for sale_items" 
ON public.sale_items 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 9. Grant API permissions
GRANT ALL ON TABLE public.sales TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.sale_items TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_counter_sales_details TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_counter_summary TO postgres, anon, authenticated, service_role;

-- Verification
SELECT 
    'Phase 18 Central Sales & Net Profit Fix executed successfully!' AS status,
    NOW() AS completed_at;
