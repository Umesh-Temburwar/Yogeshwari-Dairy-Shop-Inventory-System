-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 3: PRODUCT BATCHES & STOCK MOVEMENTS (FEFO)
-- File: supabase/03_phase3_batches_and_fefo_stock.sql
-- ============================================================================
-- Description:
-- Sets up First-Expiry-First-Out (FEFO) batch tracking, remaining lot quantities,
-- shelf life management, and immutable stock movement audit trails.
--
-- Instructions:
-- 1. Ensure Phase 1 and Phase 2 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Stock Movement Enum Type (Safe creation)
DO $$ BEGIN
    CREATE TYPE stock_movement_type AS ENUM (
        'PURCHASE',
        'SALE',
        'SALE_RETURN',
        'PURCHASE_RETURN',
        'ADJUSTMENT',
        'DAMAGE',
        'EXPIRED_REMOVAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Batches Table (Individual Lot & Shelf-Life Management)
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    batch_no VARCHAR(100) NOT NULL,
    mfg_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    qty_received NUMERIC(12, 2) NOT NULL CHECK (qty_received >= 0),
    qty_remaining NUMERIC(12, 2) NOT NULL CHECK (qty_remaining >= 0),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'DISPOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_mfg_before_expiry CHECK (mfg_date <= expiry_date)
);

-- Trigger for auto-updating updated_at on batches
DROP TRIGGER IF EXISTS trg_batches_updated_at ON public.batches;
CREATE TRIGGER trg_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 3. Stock Movements Table (Complete Audit Trail of All Stock In/Out)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    movement_type stock_movement_type NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL, -- Positive for inward (+), Negative for outward (-)
    unit_cost NUMERIC(12, 2) DEFAULT 0.00,
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    reference_id UUID,
    reference_type VARCHAR(50),       -- 'sales', 'purchases', 'damages', 'returns', 'adjustment'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
