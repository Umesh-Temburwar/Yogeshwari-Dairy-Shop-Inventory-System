-- ============================================================================
-- YOGESHWARI DAIRY SHOP INVENTORY & ERP SYSTEM - PHASE 20 MIGRATION
-- File: 20_phase20_customer_returns_and_refunds_sync.sql
-- Description: Customer Sales Return & Refund Architecture:
--   1. Full Return (संपूर्ण पावती परतावा):
--      - Removes sale from active sales history so revenue & net profit stay accurate
--      - Retains full return record in product_returns with invoice_no, refund amount & customer details
--      - Restocks products/batches (if Resellable) or records in damages (if Damaged_Waste)
--      - Credits customer balance if Udhar was involved
--   2. Partial Return (आंशिक पावती परतावा):
--      - Updates original sale with remaining cut items, reduced net_amount & payment amounts
--      - Retains unreturned goods in invoice and sales history
--      - Logs returned goods into product_returns
--   3. Foreign Key Cascades & Historical Preservation:
--      - sale_items ON DELETE CASCADE (safe sale deletion)
--      - product_returns.sale_id ON DELETE SET NULL (never loses return history)
--   4. Realtime Sync & Analytical View for Returns & Refunds Management
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

-- Add extended tracking columns if not already present
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS admin_name VARCHAR(150);
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS admin_email VARCHAR(150);
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS counter_name VARCHAR(150);

-- Update check constraints safely
ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_refund_mode_check;
ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_refund_mode_check 
CHECK (refund_mode IN ('Cash', 'Online_UPI', 'Udhar_Credit', 'Replacement', 'Credit_Note'));

ALTER TABLE public.product_returns DROP CONSTRAINT IF EXISTS product_returns_condition_check;
ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_condition_check 
CHECK (condition IN ('Resellable', 'Damaged_Waste'));

-- ============================================================================
-- STEP 2: ENSURE SAFE FOREIGN KEY CASCADES & SET NULL
-- ============================================================================

-- 2A. sale_items -> sales (ON DELETE CASCADE: deleting a sale cleanly cleans up its line items)
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

-- 2C. product_returns -> sales (ON DELETE SET NULL: when full return deletes sale, return record NEVER gets deleted!)
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
-- STEP 3: HIGH-SPEED INDEXING FOR ZERO-LAG RETURNS LOOKUP
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_product_returns_invoice_no 
ON public.product_returns (invoice_no);

CREATE INDEX IF NOT EXISTS idx_product_returns_date 
ON public.product_returns (return_date DESC);

CREATE INDEX IF NOT EXISTS idx_product_returns_product_id 
ON public.product_returns (product_id);

CREATE INDEX IF NOT EXISTS idx_product_returns_condition 
ON public.product_returns (condition);

-- ============================================================================
-- STEP 4: PERMISSIVE ROW LEVEL SECURITY (RLS) FOR COUNTER BILLING
-- ============================================================================

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow counter access for product_returns" ON public.product_returns;
CREATE POLICY "Allow counter access for product_returns" 
ON public.product_returns 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Ensure permissions for sales table as well
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow counter delete and update for sales" ON public.sales;
CREATE POLICY "Allow counter delete and update for sales" 
ON public.sales 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow counter delete and update for sale_items" ON public.sale_items;
CREATE POLICY "Allow counter delete and update for sale_items" 
ON public.sale_items 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- STEP 5: REALTIME PUBLICATION FOR MULTI-DEVICE SYNC
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
END $$;

ALTER TABLE public.product_returns REPLICA IDENTITY FULL;

-- ============================================================================
-- STEP 6: ANALYTICAL VIEW FOR RETURN & REFUND MANAGEMENT
-- ============================================================================

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
-- STEP 7: STANDARDIZE USER DISPLAY NAMES (NIKHIL SAKHARE & NILESH SAKHARE)
-- ============================================================================

-- 7A. Update public.profiles
UPDATE public.profiles
SET full_name = 'Nikhil Sakhare', updated_at = NOW()
WHERE LOWER(TRIM(email)) = 'yogeshwaridairy9896@gmail.com' OR role = 'Owner';

UPDATE public.profiles
SET full_name = 'Nilesh Sakhare', updated_at = NOW()
WHERE LOWER(TRIM(email)) = 'nilusakhare2003@gmail.com' OR role = 'Admin';

-- 7B. Update admin_audit_logs historical records
UPDATE public.admin_audit_logs
SET admin_name = 'Nikhil Sakhare'
WHERE 
    admin_role = 'Owner'
    OR LOWER(TRIM(COALESCE(admin_email, ''))) = 'yogeshwaridairy9896@gmail.com'
    OR admin_name ILIKE '%Yogeshwari%'
    OR admin_name ILIKE '%योग%'
    OR admin_name ILIKE '%Owner%'
    OR admin_name ILIKE '%मालक%'
    OR admin_name ILIKE '%Shop Owner%';

UPDATE public.admin_audit_logs
SET admin_name = 'Nilesh Sakhare'
WHERE 
    admin_role = 'Admin'
    OR LOWER(TRIM(COALESCE(admin_email, ''))) = 'nilusakhare2003@gmail.com'
    OR admin_name ILIKE '%Nilesh%'
    OR admin_name ILIKE '%निलेश%';

-- 7C. Update sales historical records
UPDATE public.sales
SET created_by_name = 'Nikhil Sakhare'
WHERE 
    created_by_role = 'Owner'
    OR LOWER(TRIM(COALESCE(created_by_email, ''))) = 'yogeshwaridairy9896@gmail.com'
    OR created_by_name ILIKE '%Yogeshwari%'
    OR created_by_name ILIKE '%योग%'
    OR created_by_name ILIKE '%Owner%'
    OR created_by_name ILIKE '%मालक%';

UPDATE public.sales
SET created_by_name = 'Nilesh Sakhare'
WHERE 
    created_by_role = 'Admin'
    OR LOWER(TRIM(COALESCE(created_by_email, ''))) = 'nilusakhare2003@gmail.com'
    OR created_by_name ILIKE '%Nilesh%'
    OR created_by_name ILIKE '%निलेश%';

-- Grant permissions to anon, authenticated and service_role
GRANT ALL ON TABLE public.product_returns TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.v_customer_returns_summary TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- 1. Check Product Returns Table structure:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'product_returns' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verify foreign key cascade rule:
SELECT conname, confdeltype 
FROM pg_constraint 
WHERE conname IN ('sale_items_sale_id_fkey', 'product_returns_sale_id_fkey');

-- 3. Check updated admin_audit_logs names:
SELECT admin_name, admin_role, count(*) 
FROM public.admin_audit_logs 
GROUP BY admin_name, admin_role;
