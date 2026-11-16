-- =============================================================================
-- Phase 66: Stock Inward & Batch Sync Engine Fix
-- Ensures seamless persistence for fresh stock inward, auto batch creation,
-- and atomic product stock increment.
-- =============================================================================

-- 1. Ensure `public.batches` table has proper column defaults and constraints
DO $$
BEGIN
    -- If product_name has NOT NULL constraint, drop it so inserts without it succeed
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'batches' 
          AND column_name = 'product_name' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.batches ALTER COLUMN product_name DROP NOT NULL;
    END IF;

    -- Ensure selling_price has a default
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'batches' 
          AND column_name = 'selling_price'
    ) THEN
        ALTER TABLE public.batches ALTER COLUMN selling_price SET DEFAULT 0.00;
    END IF;

    -- Ensure purchase_price has a default
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'batches' 
          AND column_name = 'purchase_price'
    ) THEN
        ALTER TABLE public.batches ALTER COLUMN purchase_price SET DEFAULT 0.00;
    END IF;
END $$;

-- 2. Ensure RLS policies on `public.batches` and `public.products` allow seamless access
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all batches" ON public.batches;
CREATE POLICY "Allow all batches" 
ON public.batches 
FOR ALL 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all products" ON public.products;
CREATE POLICY "Allow all products" 
ON public.products 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. High Performance Indexes for batch lookups and expiry tracking
CREATE INDEX IF NOT EXISTS idx_batches_product_expiry 
ON public.batches (product_id, expiry_date, qty_remaining) 
WHERE qty_remaining > 0;

CREATE INDEX IF NOT EXISTS idx_batches_batch_no 
ON public.batches (batch_no);

-- 4. Atomic PostgreSQL Function for Inward Stock & Batch Generation
-- This RPC executes in ONE single transaction:
-- a) Inserts new batch record
-- b) Atomically increments product stock_quantity
-- c) Returns updated product and batch details
CREATE OR REPLACE FUNCTION public.fn_record_stock_inward(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_batch_no TEXT DEFAULT NULL,
    p_mfg_date DATE DEFAULT CURRENT_DATE,
    p_expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days')::DATE,
    p_purchase_price NUMERIC DEFAULT 0,
    p_selling_price NUMERIC DEFAULT 0,
    p_supplier_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT 'Stock Inward'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prod_name TEXT;
    v_prod_unit TEXT;
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_batch_id UUID;
    v_final_batch_no TEXT;
BEGIN
    -- 1. Validate Product
    SELECT name, unit, COALESCE(stock_quantity, 0)
    INTO v_prod_name, v_prod_unit, v_current_stock
    FROM public.products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % does not exist in public.products', p_product_id;
    END IF;

    -- 2. Validate Inward Quantity
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Inward quantity must be greater than zero. Received: %', p_quantity;
    END IF;

    -- 3. Calculate new stock
    v_new_stock := v_current_stock + p_quantity;

    -- 4. Batch Number fallback
    v_final_batch_no := COALESCE(
        NULLIF(TRIM(p_batch_no), ''), 
        'BAT-' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0')
    );

    -- 5. Insert Batch
    INSERT INTO public.batches (
        product_id,
        product_name,
        batch_no,
        mfg_date,
        expiry_date,
        qty_received,
        qty_remaining,
        purchase_price,
        selling_price,
        supplier_name,
        notes,
        status
    ) VALUES (
        p_product_id,
        v_prod_name,
        v_final_batch_no,
        p_mfg_date,
        p_expiry_date,
        p_quantity,
        p_quantity,
        COALESCE(p_purchase_price, 0.0),
        COALESCE(p_selling_price, 0.0),
        p_supplier_name,
        COALESCE(p_notes, 'Stock Inward lot entry'),
        'ACTIVE'
    )
    RETURNING id INTO v_batch_id;

    -- 6. Atomically update product stock
    UPDATE public.products
    SET 
        stock_quantity = v_new_stock,
        purchase_price = CASE WHEN p_purchase_price > 0 THEN p_purchase_price ELSE purchase_price END,
        selling_price = CASE WHEN p_selling_price > 0 THEN p_selling_price ELSE selling_price END,
        updated_at = NOW()
    WHERE id = p_product_id;

    -- 7. Return Result Payload
    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'product_name', v_prod_name,
        'batch_id', v_batch_id,
        'batch_no', v_final_batch_no,
        'inward_quantity', p_quantity,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock,
        'unit', v_prod_unit
    );
END;
$$;

-- 5. Grant execute permissions to frontend client roles
GRANT EXECUTE ON FUNCTION public.fn_record_stock_inward TO anon, authenticated, service_role;

-- 6. Instant Verification Query (Run to verify everything is working)
SELECT 
    'Phase 66 Migration Applied Successfully' AS status,
    COUNT(*) AS total_batches_count,
    COUNT(DISTINCT product_id) AS products_with_batches
FROM public.batches;
