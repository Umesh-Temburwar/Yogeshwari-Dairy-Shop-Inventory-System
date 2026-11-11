-- ============================================================================
-- MIGRATION 007: BATCH INVENTORY ENHANCEMENTS, STOCK MOVEMENTS & FEFO ALLOCATION
-- Description: Adds selling_price to batches, stock_movements, sale_batch_allocations,
--              and atomic FEFO stock deduction functions.
-- ============================================================================

-- 1. Extend Batches table with selling_price and status
ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2) DEFAULT 0.00 CHECK (selling_price >= 0),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'DISPOSED')),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing batches with selling price from products if zero
UPDATE public.batches b
SET selling_price = p.selling_price
FROM public.products p
WHERE b.product_id = p.id AND (b.selling_price IS NULL OR b.selling_price = 0);

-- 2. Extend Products table with has_expiry and multilingual names
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS hindi_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS marathi_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT TRUE;

-- 3. Stock Movement Type Enum & Table
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

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    movement_type stock_movement_type NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL, -- Positive for inward, negative for outward
    unit_cost NUMERIC(12, 2) DEFAULT 0.00,
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    reference_id UUID,
    reference_type VARCHAR(50), -- 'sales', 'purchases', 'damages', 'manual_adjustment'
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_prod_date ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON public.stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);

-- 4. Sale Batch Allocations Table (Records exact batches used per sold item for true COGS)
CREATE TABLE IF NOT EXISTS public.sale_batch_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    quantity_deducted NUMERIC(10, 2) NOT NULL CHECK (quantity_deducted > 0),
    purchase_price_at_sale NUMERIC(12, 2) NOT NULL CHECK (purchase_price_at_sale >= 0),
    selling_price_at_sale NUMERIC(12, 2) NOT NULL CHECK (selling_price_at_sale >= 0),
    profit_amount NUMERIC(12, 2) GENERATED ALWAYS AS (
        (selling_price_at_sale - purchase_price_at_sale) * quantity_deducted
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allocations_sale_item ON public.sale_batch_allocations(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_allocations_batch ON public.sale_batch_allocations(batch_id);
CREATE INDEX IF NOT EXISTS idx_allocations_product ON public.sale_batch_allocations(product_id);

-- 5. FUNCTION: Atomic Inward Stock Batch Creation
CREATE OR REPLACE FUNCTION public.fn_record_stock_inward_batch(
    p_product_id UUID,
    p_batch_no VARCHAR(100),
    p_mfg_date DATE,
    p_expiry_date DATE,
    p_qty NUMERIC(12, 2),
    p_purchase_price NUMERIC(12, 2),
    p_selling_price NUMERIC(12, 2),
    p_supplier_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT 'Stock Inward'
) RETURNS JSONB AS $$
DECLARE
    v_batch_id UUID;
    v_result JSONB;
BEGIN
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'Quantity received must be greater than zero';
    END IF;

    -- Insert new batch
    INSERT INTO public.batches (
        product_id, batch_no, mfg_date, expiry_date,
        qty_received, qty_remaining, purchase_price, selling_price,
        supplier_id, status, notes
    ) VALUES (
        p_product_id, p_batch_no, p_mfg_date, p_expiry_date,
        p_qty, p_qty, p_purchase_price, p_selling_price,
        p_supplier_id, 'ACTIVE', p_notes
    ) RETURNING id INTO v_batch_id;

    -- Record stock movement
    INSERT INTO public.stock_movements (
        product_id, batch_id, movement_type, quantity,
        unit_cost, unit_price, notes
    ) VALUES (
        p_product_id, v_batch_id, 'PURCHASE', p_qty,
        p_purchase_price, p_selling_price, p_notes
    );

    v_result := jsonb_build_object(
        'batch_id', v_batch_id,
        'batch_no', p_batch_no,
        'quantity_received', p_qty,
        'expiry_date', p_expiry_date,
        'status', 'ACTIVE'
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNCTION: Atomic Expired Stock Removal
CREATE OR REPLACE FUNCTION public.fn_record_expired_stock_removal(
    p_batch_id UUID,
    p_quantity NUMERIC(12, 2),
    p_reason TEXT DEFAULT 'Expired batch disposal',
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_batch RECORD;
    v_loss_amount NUMERIC(12, 2);
    v_result JSONB;
BEGIN
    -- Lock batch
    SELECT * INTO v_batch
    FROM public.batches
    WHERE id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch % not found', p_batch_id;
    END IF;

    IF v_batch.qty_remaining < p_quantity THEN
        RAISE EXCEPTION 'Cannot remove % units. Only % units available in batch.', p_quantity, v_batch.qty_remaining;
    END IF;

    v_loss_amount := p_quantity * v_batch.purchase_price;

    -- Deduct batch
    UPDATE public.batches
    SET qty_remaining = qty_remaining - p_quantity,
        status = CASE WHEN (qty_remaining - p_quantity) = 0 THEN 'DISPOSED' ELSE status END,
        updated_at = NOW()
    WHERE id = p_batch_id;

    -- Record in stock_movements
    INSERT INTO public.stock_movements (
        product_id, batch_id, movement_type, quantity,
        unit_cost, notes, created_by
    ) VALUES (
        v_batch.product_id, p_batch_id, 'EXPIRED_REMOVAL', -p_quantity,
        v_batch.purchase_price, p_reason, p_user_id
    );

    v_result := jsonb_build_object(
        'batch_id', p_batch_id,
        'removed_quantity', p_quantity,
        'remaining_quantity', v_batch.qty_remaining - p_quantity,
        'estimated_loss', v_loss_amount
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 7. RLS for new tables
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_batch_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read stock_movements" ON public.stock_movements;
CREATE POLICY "Authenticated users can read stock_movements"
ON public.stock_movements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can insert stock_movements" ON public.stock_movements;
CREATE POLICY "Staff can insert stock_movements"
ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read sale_batch_allocations" ON public.sale_batch_allocations;
CREATE POLICY "Authenticated users can read sale_batch_allocations"
ON public.sale_batch_allocations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can insert sale_batch_allocations" ON public.sale_batch_allocations;
CREATE POLICY "Staff can insert sale_batch_allocations"
ON public.sale_batch_allocations FOR INSERT TO authenticated WITH CHECK (true);

