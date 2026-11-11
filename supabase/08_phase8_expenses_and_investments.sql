-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 8: SHOP EXPENSES & CAPITAL INVESTMENTS
-- File: supabase/08_phase8_expenses_and_investments.sql
-- ============================================================================
-- Description:
-- Sets up shop expenditure tracking (Operating expenses like Rent, Electricity,
-- Salaries, Chiller maintenance, and capital investments in assets/machinery).
--
-- Instructions:
-- 1. Ensure Phases 1-7 have been executed.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run".
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, 
    -- 'Dukan Rent', 'Light / Electricity Bill', 'Gadi Petrol / Diesel', 
    -- 'Deep Chiller Maintenance', 'Staff Salary', 'Packaging / Theli', 
    -- 'Shop Capital Investment', 'General Repair', 'Other'
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Online_UPI', 'Bank_Transfer')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_capital_investment BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

