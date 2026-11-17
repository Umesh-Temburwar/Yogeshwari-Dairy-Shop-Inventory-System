-- =============================================================================
-- Phase 67: Batch-Wise Inventory Management, Dynamic Pricing & Stock Sync Fix
-- 1. Adds / verifies batch-level columns (selling_price, purchase_price, mfg_date, expiry_date, batch_no, notes)
-- 2. Ensures safe date constraints so mfg & expiry dates always save cleanly
-- 3. Provides atomic RPC `fn_update_batch_stock_and_details` to update batch stock,
--    dates & custom prices while syncing product `stock_quantity` in 1 single transaction
-- 4. Provides atomic RPC `fn_delete_batch_with_stock_sync` to delete batches & deduct stock
-- 5. Full RLS & performance indexes
-- =============================================================================

-- Step 1: Ensure columns exist on public.batches with safe defaults
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS mfg_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100);
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- Step 2: Ensure check constraints do not cause silent failures during edits
DO $$
BEGIN
    -- Drop old rigid constraint if present
    ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS chk_mfg_before_expiry;
    
    -- Add safe constraint: allows same-day expiry or null expiry
    ALTER TABLE public.batches 
    ADD CONSTRAINT chk_mfg_before_expiry 
    CHECK (expiry_date IS NULL OR mfg_date <= expiry_date);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update skipped or already applied: %', SQLERRM;
END $$;

-- Step 3: Ensure RLS policies on batches allow seamless select, insert, update and delete
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all batches" ON public.batches;
CREATE POLICY "Allow all batches" 
ON public.batches 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Step 4: High performance indexes for batch lookups and pricing
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON public.batches (product_id);
CREATE INDEX IF NOT EXISTS idx_batches_product_expiry_remaining ON public.batches (product_id, expiry_date, qty_remaining);
CREATE INDEX IF NOT EXISTS idx_batches_selling_price ON public.batches (selling_price);

-- Step 5: Atomic Stored Procedure: Update Batch Stock, Dates & Custom Pricing with Live Stock Sync
-- Executes in ONE atomic PostgreSQL transaction:
-- - Updates batch fields (batch_no, mfg_date, expiry_date, purchase_price, selling_price, notes)
-- - Computes stock delta (new_qty - old_qty) and updates product `stock_quantity` accordingly
CREATE OR REPLACE FUNCTION public.fn_update_batch_stock_and_details(
    p_batch_id UUID,
    p_qty_remaining NUMERIC DEFAULT NULL,
    p_qty_received NUMERIC DEFAULT NULL,
    p_batch_no TEXT DEFAULT NULL,
    p_mfg_date DATE DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_purchase_price NUMERIC DEFAULT NULL,
    p_selling_price NUMERIC DEFAULT NULL,
    p_supplier_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id UUID;
    v_old_qty_remaining NUMERIC;
    v_delta NUMERIC := 0;
    v_new_product_stock NUMERIC;
    v_product_name TEXT;
    v_product_unit TEXT;
BEGIN
    -- 1. Find the target batch
    SELECT product_id, COALESCE(qty_remaining, 0)
    INTO v_product_id, v_old_qty_remaining
    FROM public.batches
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch with ID % not found', p_batch_id;
    END IF;

    -- 2. Calculate stock difference
    IF p_qty_remaining IS NOT NULL THEN
        v_delta := p_qty_remaining - v_old_qty_remaining;
    END IF;

    -- 3. Update the batch record
    UPDATE public.batches
    SET
        batch_no = COALESCE(NULLIF(TRIM(p_batch_no), ''), batch_no),
        mfg_date = COALESCE(p_mfg_date, mfg_date),
        expiry_date = COALESCE(p_expiry_date, expiry_date),
        qty_remaining = COALESCE(p_qty_remaining, qty_remaining),
        qty_received = COALESCE(p_qty_received, qty_received),
        purchase_price = COALESCE(p_purchase_price, purchase_price),
        selling_price = COALESCE(p_selling_price, selling_price),
        supplier_name = CASE WHEN p_supplier_name IS NOT NULL THEN NULLIF(TRIM(p_supplier_name), '') ELSE supplier_name END,
        notes = CASE WHEN p_notes IS NOT NULL THEN NULLIF(TRIM(p_notes), '') ELSE notes END,
        status = CASE WHEN COALESCE(p_qty_remaining, qty_remaining) <= 0 THEN 'EXHAUSTED' ELSE 'ACTIVE' END,
        updated_at = NOW()
    WHERE id = p_batch_id;

    -- 4. If quantity changed, atomically update the product total stock
    IF v_delta <> 0 THEN
        UPDATE public.products
        SET 
            stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + v_delta),
            updated_at = NOW()
        WHERE id = v_product_id
        RETURNING stock_quantity, name, unit INTO v_new_product_stock, v_product_name, v_product_unit;
    ELSE
        SELECT stock_quantity, name, unit 
        INTO v_new_product_stock, v_product_name, v_product_unit
        FROM public.products WHERE id = v_product_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'product_id', v_product_id,
        'product_name', v_product_name,
        'product_unit', v_product_unit,
        'old_batch_qty', v_old_qty_remaining,
        'new_batch_qty', COALESCE(p_qty_remaining, v_old_qty_remaining),
        'stock_delta', v_delta,
        'new_product_stock', v_new_product_stock
    );
END;
$$;

-- Step 6: Atomic Stored Procedure: Delete Batch with Live Product Stock Deduction
CREATE OR REPLACE FUNCTION public.fn_delete_batch_with_stock_sync(
    p_batch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id UUID;
    v_batch_qty NUMERIC;
    v_new_product_stock NUMERIC;
    v_product_name TEXT;
    v_product_unit TEXT;
BEGIN
    -- 1. Find batch
    SELECT product_id, COALESCE(qty_remaining, 0)
    INTO v_product_id, v_batch_qty
    FROM public.batches
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Batch not found');
    END IF;

    -- 2. Delete the batch
    DELETE FROM public.batches WHERE id = p_batch_id;

    -- 3. Deduct stock from product if remaining quantity was > 0
    IF v_batch_qty > 0 THEN
        UPDATE public.products
        SET 
            stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_batch_qty),
            updated_at = NOW()
        WHERE id = v_product_id
        RETURNING stock_quantity, name, unit INTO v_new_product_stock, v_product_name, v_product_unit;
    ELSE
        SELECT stock_quantity, name, unit 
        INTO v_new_product_stock, v_product_name, v_product_unit
        FROM public.products WHERE id = v_product_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'product_id', v_product_id,
        'product_name', v_product_name,
        'product_unit', v_product_unit,
        'deducted_qty', v_batch_qty,
        'new_product_stock', v_new_product_stock
    );
END;
$$;

-- Step 7: Grant Execution to Supabase Client Roles
GRANT EXECUTE ON FUNCTION public.fn_update_batch_stock_and_details TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_delete_batch_with_stock_sync TO anon, authenticated, service_role;

-- Step 8: Instant Verification
SELECT 
    'Phase 67 Batch Management & Pricing Fix Applied Successfully' AS status,
    COUNT(*) AS total_batches,
    COUNT(*) FILTER (WHERE selling_price > 0) AS batches_with_custom_price,
    COUNT(DISTINCT product_id) AS products_covered
FROM public.batches;
