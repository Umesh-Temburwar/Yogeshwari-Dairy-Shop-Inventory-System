-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 6: SALES, POS COUNTER BILLING & SALE ITEMS
-- File: supabase/06_phase6_sales_and_pos_billing.sql
-- ============================================================================
-- Description:
-- Sets up counter billing invoices, split payments (Cash, UPI, Udhar),
-- customer demographics, itemized sale lines, and batch allocations for COGS.
--
-- Instructions:
-- 1. Ensure Phases 1-5 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Sales Billing Invoices Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.udhar_customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) DEFAULT 'Counter Customer',
    customer_phone VARCHAR(25),
    customer_gender VARCHAR(20) DEFAULT 'Male',             -- 'Male', 'Female', 'Other'
    customer_age_group VARCHAR(50) DEFAULT 'Adults (26-45)', -- '<18', '18-25', '26-45', '45+'
    customer_age INTEGER CHECK (customer_age IS NULL OR (customer_age >= 0 AND customer_age <= 120)),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    discount NUMERIC(12, 2) DEFAULT 0.00 CHECK (discount >= 0),
    net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount >= 0),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Online_UPI', 'Split', 'Udhar')),
    cash_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (cash_amount >= 0),
    online_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (online_amount >= 0),
    udhar_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (udhar_amount >= 0),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED', 'REFUNDED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Sale Line Items Table (Capturing product and purchase cost at moment of sale)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Sale Batch Allocations Table (FEFO Batch deduction mapping for exact COGS)
CREATE TABLE IF NOT EXISTS public.sale_batch_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    quantity_deducted NUMERIC(12, 2) NOT NULL CHECK (quantity_deducted > 0),
    purchase_price_at_sale NUMERIC(12, 2) NOT NULL CHECK (purchase_price_at_sale >= 0),
    selling_price_at_sale NUMERIC(12, 2) NOT NULL CHECK (selling_price_at_sale >= 0),
    profit_amount NUMERIC(12, 2) GENERATED ALWAYS AS (
        (selling_price_at_sale - purchase_price_at_sale) * quantity_deducted
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
