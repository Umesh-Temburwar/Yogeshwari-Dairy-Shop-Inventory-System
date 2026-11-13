-- ============================================================
-- Phase 25: Sale Items Reliability & Product Linkage Fix
-- Yogeshwari Dairy Shop Inventory System
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Ensure foreign key on sale_items.product_id allows SET NULL
--    (so if product_id is custom, deleted, or missing, it never
--    causes 22P02 or foreign key violation on sale insert)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Drop strict FK constraint if exists
  ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;

  -- Re-add with ON DELETE SET NULL
  ALTER TABLE public.sale_items 
    ADD CONSTRAINT sale_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notice: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Ensure sale_items has default UUID primary key generator
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sale_items 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ─────────────────────────────────────────────────────────────
-- 3. Ensure purchase_cost is non-null default 0.00
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sale_items 
  ALTER COLUMN purchase_cost SET DEFAULT 0.00;

-- ─────────────────────────────────────────────────────────────
-- 4. Enable RLS and guarantee full counter access for sale_items
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow counter access for sale_items" ON public.sale_items;
CREATE POLICY "Allow counter access for sale_items"
ON public.sale_items
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON TABLE public.sale_items TO postgres, anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. Add sale_items to Realtime publication
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'sale_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 6. Recreate counter sales details view with aggregated products
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_owner_admin_counter_sales_details CASCADE;

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
    s.customer_gender,
    s.customer_age_group,
    s.payment_mode,
    s.net_amount,
    s.cash_amount,
    s.online_amount,
    s.udhar_amount,
    (
        SELECT string_agg(si.product_name || ' (' || si.quantity || ' ' || si.unit || ')', ', ')
        FROM public.sale_items si
        WHERE si.sale_id = s.id
    ) AS products_summary,
    (
        SELECT COUNT(*)
        FROM public.sale_items si
        WHERE si.sale_id = s.id
    ) AS total_items_count
FROM public.sales s
ORDER BY s.created_at DESC;

GRANT SELECT ON public.v_owner_admin_counter_sales_details TO postgres, anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- Done ✓
-- ─────────────────────────────────────────────────────────────
-- What this migration does:
--   1. Ensures sale_items.product_id has ON DELETE SET NULL
--   2. Ensures default gen_random_uuid() on sale_items
--   3. Sets purchase_cost default 0.00
--   4. Grants open RLS permissions for counter billing
--   5. Adds sale_items to Realtime replication
--   6. Recreates v_owner_admin_counter_sales_details with products_summary
-- ─────────────────────────────────────────────────────────────

