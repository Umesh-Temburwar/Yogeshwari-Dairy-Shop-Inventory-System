-- ============================================================================
-- 006_sales_and_pos.sql
-- Description: Customers, Sales, Sale Items, Payments, Returns, and Atomic Functions
-- ============================================================================

-- 1. Customers Table (with Udhar / Credit tracking)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100),
    address TEXT,
    credit_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (credit_balance >= 0),
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 5000.00 CHECK (credit_limit >= 0),
    loyalty_points INT NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sales / Invoices Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gst_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance_amount >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PARTIAL', 'UNPAID')),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED', 'RETURNED')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sale Items Table (Each linked to a specific product batch for FEFO tracking)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    qty NUMERIC(10, 2) NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (gst_percent >= 0),
    gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gst_amount >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer Payments Table (Multi-mode: Cash, UPI, Card, Udhar Payment)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('CASH', 'UPI', 'CARD', 'UDHAR')),
    transaction_ref VARCHAR(100),
    notes TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Sales Returns Table
CREATE TABLE IF NOT EXISTS public.sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    return_number VARCHAR(50) NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (refund_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sales Return Items Table
CREATE TABLE IF NOT EXISTS public.sales_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES public.sale_items(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    qty NUMERIC(10, 2) NOT NULL CHECK (qty > 0),
    refund_amount NUMERIC(12, 2) NOT NULL CHECK (refund_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch ON public.sale_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);

-- ============================================================================
-- BUSINESS RULE 5: ATOMIC TRANSACTION FUNCTIONS
-- ============================================================================

-- Function: Atomic Sale Creation with FEFO Deduction, Stock Logging & Payment
CREATE OR REPLACE FUNCTION public.fn_process_sale_atomic(
    p_sale_data JSONB
) RETURNS JSONB AS $$
DECLARE
    v_sale_id UUID;
    v_invoice_no VARCHAR(50);
    v_customer_id UUID;
    v_subtotal NUMERIC(12, 2);
    v_discount NUMERIC(12, 2);
    v_gst NUMERIC(12, 2);
    v_total NUMERIC(12, 2);
    v_paid NUMERIC(12, 2);
    v_balance NUMERIC(12, 2);
    v_status VARCHAR(20);
    v_item JSONB;
    v_batch_id UUID;
    v_qty NUMERIC(10, 2);
    v_remaining NUMERIC(10, 2);
    v_expiry DATE;
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_pmt JSONB;
    v_result JSONB;
BEGIN
    -- 1. Extract Header Details
    v_invoice_no := p_sale_data->>'invoice_no';
    v_customer_id := (p_sale_data->>'customer_id')::UUID;
    v_subtotal := (p_sale_data->>'subtotal')::NUMERIC;
    v_discount := COALESCE((p_sale_data->>'discount_amount')::NUMERIC, 0.00);
    v_gst := COALESCE((p_sale_data->>'gst_amount')::NUMERIC, 0.00);
    v_total := (p_sale_data->>'total_amount')::NUMERIC;
    v_paid := COALESCE((p_sale_data->>'paid_amount')::NUMERIC, 0.00);
    v_balance := v_total - v_paid;
    
    IF v_paid >= v_total THEN
        v_status := 'PAID';
    ELSIF v_paid > 0 THEN
        v_status := 'PARTIAL';
    ELSE
        v_status := 'UNPAID';
    END IF;

    -- 2. Insert Sale Record
    INSERT INTO public.sales (
        invoice_no, customer_id, subtotal, discount_amount, gst_amount,
        total_amount, paid_amount, balance_amount, payment_status, notes
    ) VALUES (
        v_invoice_no, v_customer_id, v_subtotal, v_discount, v_gst,
        v_total, v_paid, v_balance, v_status, p_sale_data->>'notes'
    ) RETURNING id INTO v_sale_id;

    -- 3. Process Each Sale Item with FEFO Locking & Expiry Validation
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_data->'items')
    LOOP
        v_batch_id := (v_item->>'batch_id')::UUID;
        v_qty := (v_item->>'qty')::NUMERIC;

        -- Lock batch row FOR UPDATE
        SELECT qty_remaining, expiry_date INTO v_remaining, v_expiry
        FROM public.batches
        WHERE id = v_batch_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Batch % not found in database', v_batch_id;
        END IF;

        -- Business Rule 4: Expiry Block (Enforced at DB level)
        IF v_expiry < v_today THEN
            RAISE EXCEPTION 'Billing Block: Batch % is expired (Expiry: %, Today: %). Cannot add expired goods to bill.', v_batch_id, v_expiry, v_today;
        END IF;

        -- Insufficient Stock Block
        IF v_remaining < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock in batch %. Available: %, Requested: %', v_batch_id, v_remaining, v_qty;
        END IF;

        -- Deduct Stock
        UPDATE public.batches
        SET qty_remaining = qty_remaining - v_qty
        WHERE id = v_batch_id;

        -- Insert Sale Item
        INSERT INTO public.sale_items (
            sale_id, product_id, batch_id, qty, unit_price,
            gst_percent, gst_amount, discount_amount, total_amount
        ) VALUES (
            v_sale_id, (v_item->>'product_id')::UUID, v_batch_id, v_qty,
            (v_item->>'unit_price')::NUMERIC,
            COALESCE((v_item->>'gst_percent')::NUMERIC, 0.00),
            COALESCE((v_item->>'gst_amount')::NUMERIC, 0.00),
            COALESCE((v_item->>'discount_amount')::NUMERIC, 0.00),
            (v_item->>'total_amount')::NUMERIC
        );

        -- Log Stock Transaction
        INSERT INTO public.stock_transactions (
            batch_id, transaction_type, qty, reference_id, reference_type, notes
        ) VALUES (
            v_batch_id, 'sale', -v_qty, v_sale_id, 'sales', 'POS Billing Invoice ' || v_invoice_no
        );
    END LOOP;

    -- 4. Record Payments
    IF p_sale_data ? 'payments' THEN
        FOR v_pmt IN SELECT * FROM jsonb_array_elements(p_sale_data->'payments')
        LOOP
            INSERT INTO public.payments (
                sale_id, customer_id, amount, payment_mode, transaction_ref, notes
            ) VALUES (
                v_sale_id, v_customer_id, (v_pmt->>'amount')::NUMERIC,
                v_pmt->>'payment_mode', v_pmt->>'transaction_ref', v_pmt->>'notes'
            );
        END LOOP;
    END IF;

    -- 5. Update Customer Udhar / Credit Balance if unpaid amount remains
    IF v_balance > 0 AND v_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET credit_balance = credit_balance + v_balance,
            updated_at = NOW()
        WHERE id = v_customer_id;
    END IF;

    -- Return JSON result
    v_result := jsonb_build_object(
        'sale_id', v_sale_id,
        'invoice_no', v_invoice_no,
        'total_amount', v_total,
        'paid_amount', v_paid,
        'balance_amount', v_balance,
        'payment_status', v_status
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Atomic Invoice Cancellation (Restores Stock & Reverses Udhar)
CREATE OR REPLACE FUNCTION public.fn_cancel_sale_atomic(
    p_sale_id UUID,
    p_reason TEXT DEFAULT 'Customer requested invoice cancellation'
) RETURNS JSONB AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale % not found', p_sale_id;
    END IF;

    IF v_sale.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Sale % is already cancelled', p_sale_id;
    END IF;

    -- 1. Restore Stock for each batch
    FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        UPDATE public.batches
        SET qty_remaining = qty_remaining + v_item.qty
        WHERE id = v_item.batch_id;

        -- Log Stock Transaction
        INSERT INTO public.stock_transactions (
            batch_id, transaction_type, qty, reference_id, reference_type, notes
        ) VALUES (
            v_item.batch_id, 'adjustment', v_item.qty, p_sale_id, 'sales', 'Cancelled Invoice ' || v_sale.invoice_no
        );
    END LOOP;

    -- 2. Reverse Udhar if customer had an unpaid balance on this invoice
    IF v_sale.balance_amount > 0 AND v_sale.customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET credit_balance = GREATEST(0.00, credit_balance - v_sale.balance_amount),
            updated_at = NOW()
        WHERE id = v_sale.customer_id;
    END IF;

    -- 3. Mark Sale as CANCELLED
    UPDATE public.sales
    SET status = 'CANCELLED',
        notes = COALESCE(notes, '') || ' | Cancelled: ' || p_reason,
        updated_at = NOW()
    WHERE id = p_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', p_sale_id,
        'status', 'CANCELLED'
    );
END;
$$ LANGUAGE plpgsql;

