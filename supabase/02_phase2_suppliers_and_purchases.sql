-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 2: SUPPLIERS & INWARD PURCHASES
-- File: supabase/02_phase2_suppliers_and_purchases.sql
-- ============================================================================
-- Description:
-- Sets up Suppliers master table (Farmers, Dairy Cooperatives, Wholesalers)
-- and Purchases procurement ledger (tracking unit costs, inward volumes, and dates).
--
-- Instructions:
-- 1. Ensure Phase 1 has been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Suppliers Master Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    milk_type VARCHAR(50) DEFAULT 'Buffalo', -- 'Buffalo', 'Cow', 'Mix', 'Packaged'
    gst_number VARCHAR(30),
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for auto-updating updated_at on suppliers
DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 2. Purchases / Inward Goods Procurement Ledger Table
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Online_UPI', 'Bank_Transfer', 'Udhar')),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(100),
    batch_no VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
