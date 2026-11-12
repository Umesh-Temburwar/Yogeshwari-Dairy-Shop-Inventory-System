-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 9: STORED PROCEDURES & ATOMIC BUSINESS LOGIC (RPC)
-- File: supabase/09_phase9_stored_procedures_and_functions.sql
-- ============================================================================
-- Description:
-- Sets up critical database stored procedures and RPC functions:
-- 1. fn_inward_stock_batch (Atomic lot inward and stock increment)
-- 2. fn_fefo_deduct_and_allocate (Concurrency-safe FEFO stock deduction with row locks)
-- 3. fn_record_damage_loss (Spoilage & curdled milk loss tracking)
-- 4. fn_remove_expired_batches (Automated batch expiry disposal)
-- 5. fn_record_udhar_transaction (Credit ledger calculation)
--
-- Instructions:
-- 1. Ensure Phases 1-8 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RPC 1: ATOMIC INWARD STOCK BATCH REGISTRATION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_inward_stock_batch(
    p_product_id UUID,
    p_batch_no VARCHAR(100),
    p_mfg_date DATE,
    p_expiry_date DATE,
    p_quantity NUMERIC(12, 2),
    p_purchase_price NUMERIC(12, 2),
    p_selling_price NUMERIC(12, 2),
    p_supplier_id UUID DEFAULT NULL,
    p_supplier_name VARCHAR(255) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_batch_id UUID;
    v_prod_name VARCHAR(255);
BEGIN
    SELECT name INTO v_prod_name FROM public.products WHERE id = p_product_id;
    IF v_prod_name IS NULL THEN
        RAISE EXCEPTION 'Product with ID % not found', p_product_id;
    END IF;

    -- 1. Insert new batch
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
        supplier_id,
        supplier_name,
        status,
        notes
    ) VALUES (
        p_product_id,
        v_prod_name,
        p_batch_no,
        p_mfg_date,
        p_expiry_date,
        p_quantity,
        p_quantity,
        p_purchase_price,
        p_selling_price,
        p_supplier_id,
        p_supplier_name,
        'ACTIVE',
        p_notes
    ) RETURNING id INTO v_batch_id;

    -- 2. Record inward stock movement
    INSERT INTO public.stock_movements (
        product_id,
        batch_id,
        movement_type,
        quantity,
        unit_cost,
        unit_price,
        reference_id,
        reference_type,
        notes
    ) VALUES (
        p_product_id,
        v_batch_id,
        'PURCHASE',
        p_quantity,
        p_purchase_price,
        p_selling_price,
        v_batch_id,
        'batches',
        COALESCE(p_notes, 'Stock inward batch added')
    );

    -- 3. Increment master product stock
    UPDATE public.products
    SET stock_quantity = stock_quantity + p_quantity,
        purchase_price = CASE WHEN p_purchase_price > 0 THEN p_purchase_price ELSE purchase_price END,
        selling_price = CASE WHEN p_selling_price > 0 THEN p_selling_price ELSE selling_price END,
        updated_at = NOW()
    WHERE id = p_product_id;

    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- RPC 2: ATOMIC FEFO STOCK DEDUCTION & ALLOCATION
-- Concurrency safe: Uses SELECT FOR UPDATE row-level locking on batches
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_fefo_deduct_and_allocate(
    p_sale_id UUID,
    p_items JSONB -- Array of { product_id: UUID, quantity: number, sale_item_id: UUID }
)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_batch RECORD;
    v_needed NUMERIC(12, 2);
    v_deduct NUMERIC(12, 2);
    v_total_available NUMERIC(12, 2);
    v_allocations JSONB := '[]'::JSONB;
BEGIN
    FOR v_item IN 
        SELECT 
            (elem->>'product_id')::UUID AS product_id,
            (elem->>'quantity')::NUMERIC(12, 2) AS quantity,
            (elem->>'sale_item_id')::UUID AS sale_item_id
        FROM jsonb_array_elements(p_items) AS elem
    LOOP
        v_needed := v_item.quantity;

        -- 1. Check total non-expired stock available
        SELECT COALESCE(SUM(qty_remaining), 0)
        INTO v_total_available
        FROM public.batches
        WHERE product_id = v_item.product_id
          AND qty_remaining > 0
          AND expiry_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

        IF v_total_available < v_needed THEN
            RAISE EXCEPTION 'Insufficient non-expired stock for product %. Required %, Available %',
                v_item.product_id, v_needed, v_total_available;
        END IF;

        -- 2. Deduct in strict FEFO order (Earliest Expiry First Out) with lock
        FOR v_batch IN 
            SELECT id, qty_remaining, purchase_price, selling_price, expiry_date
            FROM public.batches
            WHERE product_id = v_item.product_id
              AND qty_remaining > 0
              AND expiry_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
            ORDER BY expiry_date ASC, mfg_date ASC, created_at ASC
            FOR UPDATE
        LOOP
            EXIT WHEN v_needed <= 0;

            v_deduct := LEAST(v_needed, v_batch.qty_remaining);

            -- Deduct from batch
            UPDATE public.batches
            SET qty_remaining = qty_remaining - v_deduct,
                status = CASE WHEN qty_remaining - v_deduct = 0 THEN 'EXHAUSTED' ELSE status END,
                updated_at = NOW()
            WHERE id = v_batch.id;

            -- Record batch allocation
            INSERT INTO public.sale_batch_allocations (
                sale_id,
                sale_item_id,
                product_id,
                batch_id,
                quantity_deducted,
                purchase_price_at_sale,
                selling_price_at_sale
            ) VALUES (
                p_sale_id,
                v_item.sale_item_id,
                v_item.product_id,
                v_batch.id,
                v_deduct,
                v_batch.purchase_price,
                v_batch.selling_price
            );

            -- Record outward stock movement
            INSERT INTO public.stock_movements (
                product_id,
                batch_id,
                movement_type,
                quantity,
                unit_cost,
                unit_price,
                reference_id,
                reference_type,
                notes
            ) VALUES (
                v_item.product_id,
                v_batch.id,
                'SALE',
                -v_deduct,
                v_batch.purchase_price,
                v_batch.selling_price,
                p_sale_id,
                'sales',
                format('FEFO Counter Sale Deduct (Exp: %s)', v_batch.expiry_date)
            );

            v_allocations := v_allocations || jsonb_build_object(
                'batch_id', v_batch.id,
                'deducted', v_deduct,
                'expiry', v_batch.expiry_date
            );

            v_needed := v_needed - v_deduct;
        END LOOP;

        -- 3. Decrement master product stock
        UPDATE public.products
        SET stock_quantity = GREATEST(0, stock_quantity - v_item.quantity),
            updated_at = NOW()
        WHERE id = v_item.product_id;

    END LOOP;

    RETURN v_allocations;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- RPC 3: DAMAGE RECORDING & AUTOMATIC STOCK WRITE-OFF
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_record_damage_loss(
    p_product_id UUID,
    p_batch_id UUID,
    p_quantity NUMERIC(12, 2),
    p_reason VARCHAR(100),
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_damage_id UUID;
    v_prod_name VARCHAR(255);
    v_batch_no VARCHAR(100);
    v_unit VARCHAR(50);
    v_cost NUMERIC(12, 2);
    v_loss NUMERIC(12, 2);
BEGIN
    SELECT name, unit, purchase_price 
    INTO v_prod_name, v_unit, v_cost 
    FROM public.products 
    WHERE id = p_product_id;

    IF v_prod_name IS NULL THEN
        RAISE EXCEPTION 'Product % not found', p_product_id;
    END IF;

    IF p_batch_id IS NOT NULL THEN
        SELECT batch_no, purchase_price 
        INTO v_batch_no, v_cost 
        FROM public.batches 
        WHERE id = p_batch_id;

        -- Deduct from specific batch
        UPDATE public.batches
        SET qty_remaining = GREATEST(0, qty_remaining - p_quantity),
            status = CASE WHEN qty_remaining - p_quantity <= 0 THEN 'DISPOSED' ELSE status END,
            updated_at = NOW()
        WHERE id = p_batch_id;
    END IF;

    v_loss := ROUND(p_quantity * v_cost, 2);

    -- 1. Insert damage record
    INSERT INTO public.damage_records (
        product_id,
        batch_id,
        product_name,
        batch_no,
        quantity,
        unit,
        estimated_loss_amount,
        reason,
        damage_date,
        notes
    ) VALUES (
        p_product_id,
        p_batch_id,
        v_prod_name,
        v_batch_no,
        p_quantity,
        v_unit,
        v_loss,
        p_reason,
        CURRENT_DATE,
        p_notes
    ) RETURNING id INTO v_damage_id;

    -- 2. Record stock movement
    INSERT INTO public.stock_movements (
        product_id,
        batch_id,
        movement_type,
        quantity,
        unit_cost,
        reference_id,
        reference_type,
        notes
    ) VALUES (
        p_product_id,
        p_batch_id,
        'DAMAGE',
        -p_quantity,
        v_cost,
        v_damage_id,
        'damage_records',
        format('Spoilage/Damage Write-off: %s', p_reason)
    );

    -- 3. Decrement master stock
    UPDATE public.products
    SET stock_quantity = GREATEST(0, stock_quantity - p_quantity),
        updated_at = NOW()
    WHERE id = p_product_id;

    RETURN v_damage_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- RPC 4: AUTOMATED EXPIRED BATCH REMOVAL
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_remove_expired_batches()
RETURNS TABLE (
    product_name VARCHAR(255),
    batch_no VARCHAR(100),
    qty_removed NUMERIC(12, 2),
    estimated_loss NUMERIC(12, 2)
) AS $$
DECLARE
    v_b RECORD;
    v_loss NUMERIC(12, 2);
BEGIN
    FOR v_b IN 
        SELECT b.id, b.product_id, b.product_name, b.batch_no, b.qty_remaining, b.purchase_price, p.unit
        FROM public.batches b
        JOIN public.products p ON p.id = b.product_id
        WHERE b.expiry_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
          AND b.qty_remaining > 0
        FOR UPDATE OF b
    LOOP
        v_loss := ROUND(v_b.qty_remaining * v_b.purchase_price, 2);

        -- Record damage record
        INSERT INTO public.damage_records (
            product_id,
            batch_id,
            product_name,
            batch_no,
            quantity,
            unit,
            estimated_loss_amount,
            reason,
            damage_date,
            notes
        ) VALUES (
            v_b.product_id,
            v_b.id,
            v_b.product_name,
            v_b.batch_no,
            v_b.qty_remaining,
            v_b.unit,
            v_loss,
            'Expiry Date Over',
            CURRENT_DATE,
            'Automated disposal of expired dairy stock'
        );

        -- Record outward stock movement
        INSERT INTO public.stock_movements (
            product_id,
            batch_id,
            movement_type,
            quantity,
            unit_cost,
            notes
        ) VALUES (
            v_b.product_id,
            v_b.id,
            'EXPIRED_REMOVAL',
            -v_b.qty_remaining,
            v_b.purchase_price,
            format('Expired batch %s removed from stock', v_b.batch_no)
        );

        -- Decrement master product stock
        UPDATE public.products
        SET stock_quantity = GREATEST(0, stock_quantity - v_b.qty_remaining),
            updated_at = NOW()
        WHERE id = v_b.product_id;

        -- Mark batch as EXPIRED
        UPDATE public.batches
        SET qty_remaining = 0,
            status = 'EXPIRED',
            updated_at = NOW()
        WHERE id = v_b.id;

        product_name := v_b.product_name;
        batch_no := v_b.batch_no;
        qty_removed := v_b.qty_remaining;
        estimated_loss := v_loss;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- RPC 5: UDHAR KHATA CREDIT & PAYMENT RECORDER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_record_udhar_transaction(
    p_customer_id UUID,
    p_type VARCHAR(50), -- 'Credit_Given' or 'Payment_Received'
    p_amount NUMERIC(12, 2),
    p_payment_mode VARCHAR(50) DEFAULT 'Cash',
    p_notes TEXT DEFAULT NULL
)
RETURNS NUMERIC(12, 2) AS $$
DECLARE
    v_current_bal NUMERIC(12, 2);
    v_new_bal NUMERIC(12, 2);
BEGIN
    SELECT current_balance INTO v_current_bal
    FROM public.udhar_customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF v_current_bal IS NULL THEN
        RAISE EXCEPTION 'Customer % not found', p_customer_id;
    END IF;

    IF p_type = 'Credit_Given' THEN
        v_new_bal := v_current_bal + p_amount;
        UPDATE public.udhar_customers
        SET current_balance = v_new_bal,
            total_credit = total_credit + p_amount,
            status = 'Active',
            last_transaction_date = NOW(),
            updated_at = NOW()
        WHERE id = p_customer_id;
    ELSIF p_type = 'Payment_Received' THEN
        v_new_bal := v_current_bal - p_amount;
        UPDATE public.udhar_customers
        SET current_balance = v_new_bal,
            total_paid = total_paid + p_amount,
            status = CASE WHEN v_new_bal <= 0 THEN 'Cleared' ELSE 'Active' END,
            last_transaction_date = NOW(),
            updated_at = NOW()
        WHERE id = p_customer_id;
    ELSE
        RAISE EXCEPTION 'Invalid transaction type: %', p_type;
    END IF;

    -- Record transaction
    INSERT INTO public.udhar_transactions (
        customer_id,
        type,
        amount,
        balance_after,
        payment_mode,
        notes,
        transaction_date
    ) VALUES (
        p_customer_id,
        p_type,
        p_amount,
        v_new_bal,
        p_payment_mode,
        p_notes,
        CURRENT_DATE
    );

    RETURN v_new_bal;
END;
$$ LANGUAGE plpgsql;
