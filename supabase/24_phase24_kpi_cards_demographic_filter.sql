-- ============================================================
-- Phase 24: KPI Cards Filter-Aware — Gender & Age Group
-- Yogeshwari Dairy Shop Inventory System
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Filtered Sales Summary View (Gender + Age Group aware)
--    This view pre-computes revenue breakdown by gender, age
--    group, payment mode and date — frontend uses it for
--    filtered KPI cards.
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_sales_kpi_by_demographics CASCADE;

CREATE OR REPLACE VIEW public.v_sales_kpi_by_demographics AS
SELECT
  DATE(created_at)                           AS sale_date,
  COALESCE(customer_gender, 'Male')          AS gender,
  COALESCE(customer_age_group, 'Adults (26-45)') AS age_group,
  payment_mode,
  admin_slot,
  created_by_role,
  COUNT(*)                                   AS bill_count,
  SUM(net_amount)                            AS total_revenue,
  SUM(CASE WHEN payment_mode = 'Cash' THEN net_amount
           WHEN payment_mode = 'Split' THEN COALESCE(cash_amount, 0)
           ELSE 0 END)                       AS cash_inflow,
  SUM(CASE WHEN payment_mode = 'Online_UPI' THEN net_amount
           WHEN payment_mode = 'Split' THEN COALESCE(online_amount, 0)
           ELSE 0 END)                       AS online_inflow,
  SUM(CASE WHEN payment_mode = 'Udhar' THEN net_amount
           ELSE 0 END)                       AS udhar_given,
  SUM(discount)                              AS total_discount
FROM public.sales
GROUP BY
  DATE(created_at),
  COALESCE(customer_gender, 'Male'),
  COALESCE(customer_age_group, 'Adults (26-45)'),
  payment_mode,
  admin_slot,
  created_by_role
ORDER BY sale_date DESC;

GRANT SELECT ON public.v_sales_kpi_by_demographics TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Index for faster KPI aggregation queries
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_kpi_demographics
  ON public.sales (
    created_at DESC,
    customer_gender,
    customer_age_group,
    payment_mode
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Ensure cash_amount and online_amount columns exist
--    (for Split payment breakdown in KPIs)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sales'
      AND column_name  = 'cash_amount'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN cash_amount NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sales'
      AND column_name  = 'online_amount'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN online_amount NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sales'
      AND column_name  = 'udhar_amount'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN udhar_amount NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- Done ✓
-- ─────────────────────────────────────────────────────────────
-- What this migration does:
--   1. Creates v_sales_kpi_by_demographics view for
--      filter-aware KPI card aggregation (gender + age + mode)
--   2. Adds composite index for fast demographic KPI queries
--   3. Ensures cash_amount, online_amount, udhar_amount
--      columns exist on sales table for Split payment breakdown
-- ─────────────────────────────────────────────────────────────

