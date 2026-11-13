-- ============================================================================
-- YOGESHWARI DAIRY SHOP INVENTORY & ERP SYSTEM - PHASE 27 MIGRATION
-- File: 27_phase27_advanced_customer_returns_workflow.sql
-- Description: Advanced Two-Mode Customer Returns & Realtime Refund Architecture:
--   1. Workflow 1: 100% Full Bill Return (⚡ संपूर्ण बिल वापसी)
--      - When customer returns ALL products purchased in a bill:
--        * Original sale is safely removed from active sales ledger
--        * sale_items are cascade deleted cleanly
--        * Full return voucher is permanently preserved in product_returns
--        * product_returns.sale_id is set to NULL on delete (no history lost)
--        * Resellable goods stock is restored; damaged goods recorded in losses
--        * Udhar balance automatically decremented if billed on credit
--   2. Workflow 2: Selective / Partial Return (✂️ निवडक / आंशिक माल वापसी)
--      - When customer returns only specific items or quantities from a multi-item bill:
--        * Returned items are deducted from the original sale net_amount
--        * Retained items remain on the invoice with updated quantity & total
--        * Returned items logged in product_returns with return_type = 'Partial'
--        * Stock restored only for the returned quantities
--   3. Workflow 3: Direct Item Return without Bill (📦 थेट परतावा)
--      - For walk-in returns without receipt, logged with return_type = 'Direct'
--   4. Realtime Synchronization & Views:
--      - v_customer_returns_summary: Complete return metrics & condition breakdown
--      - v_daily_returns_ledger: Chronological return vouchers with item details
--      - product_returns added to supabase_realtime publication
--
-- Execution: Run directly in Supabase Dashboard -> SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ENSURE PRODUCT_RETURNS TABLE & EXTENDED COLUMNS
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
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
    refund_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    reason VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL DEFAULT 'Resellable',
    return_type VARCHAR(50) NOT NULL DEFAULT 'Full',
    customer_name VARCHAR(255),
    customer_phone VARCHAR(25),
    notes TEXT,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    admin_name VARCHAR(150),
    admin_email VARCHAR(150),
    counter_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all extended columns exist for existing tables
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS admin_name VARCHAR(150);
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS admin_email VARCHAR(150);
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS counter_name VARCHAR(150);
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS return_type VARCHAR(50) DEFAULT 'Full';

-- Ensure safe column constraints
ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_refund_mode_check;
ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_refund_mode_check 
CHECK (refund_mode IN ('Cash', 'Online_UPI', 'Udhar_Credit', 'Replacement', 'Credit_Note'));

ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_condition_check;
ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_condition_check 
CHECK (condition IN ('Resellable', 'Damaged_Waste'));

ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_return_type_check;
ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_return_type_check 
CHECK (return_type IN ('Full', 'Partial', 'Direct'));

-- ============================================================================
-- STEP 2: ENSURE SAFE FOREIGN KEY CASCADE RULES
-- ============================================================================

-- 2A. sale_items -> sales (ON DELETE CASCADE: deleting a full returned sale safely cleans up items)
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

-- 2C. product_returns -> sales (ON DELETE SET NULL: full return deletion never loses return history!)
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
-- STEP 3: HIGH-PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_product_returns_return_type 
ON public.product_returns (return_type);

CREATE INDEX IF NOT EXISTS idx_product_returns_invoice_no 
ON public.product_returns (invoice_no);

CREATE INDEX IF NOT EXISTS idx_product_returns_sale_id 
ON public.product_returns (sale_id);

CREATE INDEX IF NOT EXISTS idx_product_returns_date 
ON public.product_returns (return_date DESC);

CREATE INDEX IF NOT EXISTS idx_product_returns_product_id 
ON public.product_returns (product_id);

CREATE INDEX IF NOT EXISTS idx_product_returns_refund_mode 
ON public.product_returns (refund_mode);

CREATE INDEX IF NOT EXISTS idx_product_returns_condition 
ON public.product_returns (condition);

-- ============================================================================
-- STEP 4: ROW LEVEL SECURITY & COUNTER ACCESS POLICIES
-- ============================================================================

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow counter access for product_returns" ON public.product_returns;
CREATE POLICY "Allow counter access for product_returns" 
ON public.product_returns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 5: ANALYTICS & LEDGER VIEWS
-- ============================================================================

-- View 1: Customer Returns Summary (KPI overview & condition breakdown)
CREATE OR REPLACE VIEW public.v_customer_returns_summary AS
SELECT 
    COUNT(*)::INT AS total_return_records,
    COUNT(DISTINCT return_no)::INT AS total_vouchers_count,
    COUNT(*) FILTER (WHERE return_type = 'Full')::INT AS full_returns_count,
    COUNT(*) FILTER (WHERE return_type = 'Partial')::INT AS partial_returns_count,
    COUNT(*) FILTER (WHERE return_type = 'Direct')::INT AS direct_returns_count,
    COALESCE(SUM(refund_amount), 0)::NUMERIC(12, 2) AS total_refund_amount,
    COALESCE(SUM(CASE WHEN refund_mode = 'Cash' THEN refund_amount ELSE 0 END), 0)::NUMERIC(12, 2) AS total_cash_refund,
    COALESCE(SUM(CASE WHEN refund_mode = 'Online_UPI' THEN refund_amount ELSE 0 END), 0)::NUMERIC(12, 2) AS total_upi_refund,
    COALESCE(SUM(CASE WHEN refund_mode = 'Udhar_Credit' THEN refund_amount ELSE 0 END), 0)::NUMERIC(12, 2) AS total_udhar_refund,
    COUNT(*) FILTER (WHERE condition = 'Resellable')::INT AS resellable_count,
    COALESCE(SUM(CASE WHEN condition = 'Resellable' THEN refund_amount ELSE 0 END), 0)::NUMERIC(12, 2) AS resellable_value,
    COUNT(*) FILTER (WHERE condition = 'Damaged_Waste')::INT AS damaged_waste_count,
    COALESCE(SUM(CASE WHEN condition = 'Damaged_Waste' THEN refund_amount ELSE 0 END), 0)::NUMERIC(12, 2) AS damaged_waste_value
FROM public.product_returns;

-- View 2: Daily Returns Ledger (Chronological vouchers with full item & customer details)
CREATE OR REPLACE VIEW public.v_daily_returns_ledger AS
SELECT 
    pr.id,
    pr.return_no,
    pr.invoice_no,
    pr.sale_id,
    pr.return_type,
    pr.return_date,
    pr.product_id,
    pr.product_name,
    pr.quantity,
    pr.unit,
    pr.unit_price,
    pr.refund_amount,
    pr.refund_mode,
    pr.reason,
    pr.condition,
    pr.customer_name,
    pr.customer_phone,
    pr.admin_name,
    pr.counter_name,
    pr.notes,
    pr.created_at,
    CASE 
        WHEN pr.sale_id IS NOT NULL THEN 'Active Sale Linked'
        WHEN pr.invoice_no IS NOT NULL THEN 'Fully Returned & Archived'
        ELSE 'Direct Return'
    END AS invoice_link_status
FROM public.product_returns pr
ORDER BY pr.return_date DESC, pr.created_at DESC;

-- ============================================================================
-- STEP 6: REALTIME REPLICATION CONFIGURATION
-- ============================================================================

ALTER TABLE public.product_returns REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_returns'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.product_returns;
    END IF;
END $$;

-- ============================================================================
-- STEP 7: PERMISSIONS & ROLE GRANTS
-- ============================================================================

GRANT ALL ON TABLE public.product_returns TO anon, authenticated, service_role;
GRANT SELECT ON public.v_customer_returns_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.v_daily_returns_ledger TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'product_returns'
ORDER BY ordinal_position;
