-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 7: CUSTOMER & SUPPLIER RETURNS (REFUNDS & DEBIT NOTES)
-- File: supabase/07_phase7_returns_and_refunds.sql
-- ============================================================================
-- Description:
-- Sets up comprehensive 2-way Return Management:
-- 1. Customer Returns (Customers returning purchased dairy goods)
-- 2. Supplier Returns (Returning damaged, leaked, or expired deliveries to vendors)
--
-- Instructions:
-- 1. Ensure Phases 1-6 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Customer Returns Table
CREATE TABLE IF NOT EXISTS public.product_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_no VARCHAR(100) UNIQUE NOT NULL,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    invoice_no VARCHAR(100),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    refund_amount NUMERIC(12, 2) NOT NULL CHECK (refund_amount >= 0),
    refund_mode VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (refund_mode IN ('Cash', 'Online_UPI', 'Udhar_Credit', 'Replacement')),
    reason VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL DEFAULT 'Resellable' CHECK (condition IN ('Resellable', 'Damaged_Waste')),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(25),
    notes TEXT,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Supplier / Vendor Returns Table (Returning damaged/expired goods to suppliers for refund)
CREATE TABLE IF NOT EXISTS public.supplier_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_no VARCHAR(100) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    batch_no VARCHAR(100),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    total_refund_amount NUMERIC(12, 2) NOT NULL CHECK (total_refund_amount >= 0),
    reason VARCHAR(100) NOT NULL, -- 'Damaged / Leaked on Delivery', 'Expired on Delivery', 'Curdled / Spoiled Milk', etc.
    refund_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (refund_status IN ('Pending', 'Refund_Received', 'Adjusted_In_Next_Bill', 'Replacement_Received')),
    refund_mode VARCHAR(50) CHECK (refund_mode IN ('Cash', 'Online_UPI', 'Credit_Deduction', 'Replacement')),
    refund_date DATE,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
