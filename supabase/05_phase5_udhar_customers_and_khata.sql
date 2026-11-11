-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 5: UDHARI KHATA & CUSTOMER CREDIT LEDGER
-- File: supabase/05_phase5_udhar_customers_and_khata.sql
-- ============================================================================
-- Description:
-- Sets up Udhar customer accounts, outstanding balance tracking, and ledger
-- transaction history (goods credit given and cash/online repayments received).
--
-- Instructions:
-- 1. Ensure Phases 1-4 have been executed.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run".
-- ============================================================================

-- 1. Udhar Customers Account Table
CREATE TABLE IF NOT EXISTS public.udhar_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    address TEXT,
    total_credit NUMERIC(12, 2) DEFAULT 0.00 CHECK (total_credit >= 0),
    total_paid NUMERIC(12, 2) DEFAULT 0.00 CHECK (total_paid >= 0),
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Cleared', 'Overdue')),
    last_transaction_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for auto-updating updated_at on udhar_customers
DROP TRIGGER IF EXISTS trg_udhar_customers_updated_at ON public.udhar_customers;
CREATE TRIGGER trg_udhar_customers_updated_at
BEFORE UPDATE ON public.udhar_customers
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 2. Udhar Ledger Transactions Table
CREATE TABLE IF NOT EXISTS public.udhar_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.udhar_customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Credit_Given', 'Payment_Received')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(12, 2) DEFAULT 0.00,
    payment_mode VARCHAR(50) DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Online_UPI', 'Bank_Transfer')),
    notes TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
