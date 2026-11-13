-- ============================================================
-- Phase 22: Customer Gender & Age Group — Sales Analytics
-- Yogeshwari Dairy Shop Inventory System
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Ensure customer_gender, customer_age_group, customer_age
--    columns exist on the sales table (Phase 6 may have added
--    them already; these are safe no-ops if present).
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sales'
      AND column_name  = 'customer_gender'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN customer_gender VARCHAR(20) DEFAULT 'Male';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sales'
      AND column_name  = 'customer_age_group'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN customer_age_group VARCHAR(50) DEFAULT 'Adults (26-45)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sales'
      AND column_name  = 'customer_age'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN customer_age INTEGER;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Add / replace CHECK constraints safely
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS chk_sales_customer_gender;

ALTER TABLE public.sales
  ADD CONSTRAINT chk_sales_customer_gender
  CHECK (customer_gender IS NULL OR customer_gender IN ('Male', 'Female', 'Other'));

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
-- 3. Performance indexes for analytics queries
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_customer_gender
  ON public.sales (customer_gender);

CREATE INDEX IF NOT EXISTS idx_sales_customer_age_group
  ON public.sales (customer_age_group);

CREATE INDEX IF NOT EXISTS idx_sales_gender_age_created
  ON public.sales (customer_gender, customer_age_group, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 4. Analytics View: Sales breakdown by Gender + Age Group
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

-- ─────────────────────────────────────────────────────────────
-- 5. Analytics View: Daily Gender Revenue Trend
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 6. Ensure udhar_customers has all required columns
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'udhar_customers'
      AND column_name  = 'address'
  ) THEN
    ALTER TABLE public.udhar_customers ADD COLUMN address TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'udhar_customers'
      AND column_name  = 'notes'
  ) THEN
    ALTER TABLE public.udhar_customers ADD COLUMN notes TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 7. Safe upsert support for udhar_customers
--    Ensure unique constraint on phone exists for ON CONFLICT
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'udhar_customers_phone_unique'
      AND conrelid = 'public.udhar_customers'::regclass
  ) THEN
    -- Only add if phone column is not already unique
    BEGIN
      ALTER TABLE public.udhar_customers
        ADD CONSTRAINT udhar_customers_phone_unique UNIQUE (phone);
    EXCEPTION WHEN others THEN
      -- Constraint already exists under a different name or phone has duplicates
      RAISE NOTICE 'Could not add unique constraint on udhar_customers.phone: %', SQLERRM;
    END;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. Ensure udhar_transactions.balance_after is nullable
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'udhar_transactions'
      AND column_name  = 'balance_after'
      AND is_nullable  = 'NO'
  ) THEN
    ALTER TABLE public.udhar_transactions
      ALTER COLUMN balance_after DROP NOT NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 9. RLS policies for demographics views (read-only for owners/admins)
-- ─────────────────────────────────────────────────────────────
-- Views inherit their base table's RLS; no additional policies needed.
-- Grant SELECT on the new views to authenticated role:
GRANT SELECT ON public.v_sales_customer_demographics TO authenticated;
GRANT SELECT ON public.v_daily_gender_revenue        TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 10. Realtime publication for udhar tables (safe re-add)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- udhar_customers
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND tablename = 'udhar_customers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.udhar_customers;
  END IF;

  -- udhar_transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND tablename = 'udhar_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.udhar_transactions;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- Done ✓
-- ─────────────────────────────────────────────────────────────
-- What this migration does:
--   1. Adds customer_gender / customer_age_group / customer_age
--      columns to sales (safe IF NOT EXISTS)
--   2. Adds CHECK constraints for valid gender & age group values
--   3. Creates indexes for fast analytics queries
--   4. Creates v_sales_customer_demographics view
--      (revenue breakdown by gender + age group)
--   5. Creates v_daily_gender_revenue view (daily gender trend)
--   6. Ensures udhar_customers has address & notes columns
--   7. Adds UNIQUE(phone) constraint for safe upsert
--   8. Makes udhar_transactions.balance_after nullable
--   9. Grants SELECT on new views to authenticated role
--  10. Adds udhar tables to Realtime publication
-- ─────────────────────────────────────────────────────────────

