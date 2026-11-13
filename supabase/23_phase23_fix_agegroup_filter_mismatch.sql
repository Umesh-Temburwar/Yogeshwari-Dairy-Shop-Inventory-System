-- ============================================================
-- Phase 23: Fix Age Group Filter Mismatch & Sync Existing Data
-- Yogeshwari Dairy Shop Inventory System
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Fix existing rows that may have old age group values
--    (app was saving 'Kids (<18)' / 'Senior (45+)' but
--     older code may have saved 'Kids/Teens (<18)' etc.)
-- ─────────────────────────────────────────────────────────────
UPDATE public.sales
  SET customer_age_group = 'Kids (<18)'
  WHERE customer_age_group = 'Kids/Teens (<18)';

UPDATE public.sales
  SET customer_age_group = 'Senior (45+)'
  WHERE customer_age_group = 'Seniors (45+)';

-- ─────────────────────────────────────────────────────────────
-- 2. Update CHECK constraint with corrected canonical values
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS chk_sales_customer_age_group;

ALTER TABLE public.sales
  ADD CONSTRAINT chk_sales_customer_age_group
  CHECK (
    customer_age_group IS NULL OR
    customer_age_group IN (
      'Kids (<18)',
      'Youth (18-25)',
      'Adults (26-45)',
      'Senior (45+)'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Recreate analytics views with corrected values
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_sales_customer_demographics CASCADE;

CREATE OR REPLACE VIEW public.v_sales_customer_demographics AS
SELECT
  COALESCE(customer_gender, 'Unknown')       AS gender,
  COALESCE(customer_age_group, 'Unknown')    AS age_group,
  COUNT(*)                                   AS total_bills,
  SUM(net_amount)                            AS total_revenue,
  ROUND(AVG(net_amount)::NUMERIC, 2)        AS avg_bill_value,
  SUM(total_amount)                          AS gross_revenue,
  SUM(discount)                              AS total_discount_given,
  COUNT(CASE WHEN payment_mode = 'Cash'       THEN 1 END) AS cash_bills,
  COUNT(CASE WHEN payment_mode = 'Online_UPI' THEN 1 END) AS upi_bills,
  COUNT(CASE WHEN payment_mode = 'Udhar'      THEN 1 END) AS udhar_bills,
  COUNT(CASE WHEN payment_mode = 'Split'      THEN 1 END) AS split_bills,
  DATE(MIN(created_at))                      AS first_sale_date,
  DATE(MAX(created_at))                      AS last_sale_date
FROM public.sales
GROUP BY
  COALESCE(customer_gender, 'Unknown'),
  COALESCE(customer_age_group, 'Unknown')
ORDER BY total_revenue DESC;

DROP VIEW IF EXISTS public.v_daily_gender_revenue CASCADE;

CREATE OR REPLACE VIEW public.v_daily_gender_revenue AS
SELECT
  DATE(created_at)                           AS sale_date,
  COALESCE(customer_gender, 'Unknown')       AS gender,
  COUNT(*)                                   AS bills,
  SUM(net_amount)                            AS revenue
FROM public.sales
GROUP BY DATE(created_at), COALESCE(customer_gender, 'Unknown')
ORDER BY sale_date DESC, revenue DESC;

-- Grant SELECT on recreated views
GRANT SELECT ON public.v_sales_customer_demographics TO authenticated;
GRANT SELECT ON public.v_daily_gender_revenue        TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- Done ✓
-- ─────────────────────────────────────────────────────────────
-- What this migration does:
--   1. Fixes existing sales rows with old 'Kids/Teens (<18)'
--      and 'Seniors (45+)' values to canonical
--      'Kids (<18)' and 'Senior (45+)'
--   2. Updates CHECK constraint with corrected values
--   3. Recreates analytics views for consistent data
-- ─────────────────────────────────────────────────────────────
