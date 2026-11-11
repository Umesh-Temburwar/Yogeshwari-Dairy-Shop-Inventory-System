-- ============================================================================
-- YOGESHWARI DAIRY SHOP INVENTORY & ERP SYSTEM - COMPLETE SUPABASE SETUP
-- ============================================================================
-- File: supabase/complete_setup.sql
-- Description: Master 1-Click SQL Setup Script for Supabase PostgreSQL.
--              Includes all Tables, Extensions, Foreign Keys, Indexes,
--              Row Level Security (RLS) Policies, Stored Procedures (FEFO, Batch Inward,
--              Expired Removal), Dynamic Views, and Authentic Dairy Seed Data.
--
-- HOW TO RUN IN SUPABASE:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/pfamoxreojbejuwvhgiu
-- 2. In the left navigation menu, click "SQL Editor" (or press Ctrl + Shift + S).
-- 3. Click "+ New query" (हिरवे बटण / Create New Query).
-- 4. Copy the entire contents of this file and paste it into the editor.
-- 5. Click "Run" (हिरवे Run बटण किंवा दाबा Ctrl + Enter).
-- 6. You will see "Success. No rows returned" or affected row count.
-- 7. Verify in "Table Editor" on the left: All tables and views are created!
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS & HELPER FUNCTIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reusable timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enum Types (safe creation)
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

-- ============================================================================
-- SECTION 2: CORE TABLES DEFINITION
-- ============================================================================

-- 1. PROFILES (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. UNITS
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    short_code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    gst_number VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUCTS (Dual compatibility: both category/unit strings & relational UUIDs)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    hindi_name VARCHAR(255),
    marathi_name VARCHAR(255),
    category VARCHAR(100) NOT NULL, -- 'Milk', 'Curd & Chaas', 'Paneer & Butter', 'Ghee', 'Sweets/Mithai', 'Bakery & Extras'
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    unit VARCHAR(50) NOT NULL,       -- 'Litre', 'Kg', 'Packet (500ml)', 'Packet (1L)', 'Piece', 'Gram'
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 10.00 CHECK (min_stock_alert >= 0),
    shelf_life_days INTEGER DEFAULT 2,
    has_expiry BOOLEAN NOT NULL DEFAULT TRUE,
    barcode VARCHAR(100),
    sku VARCHAR(50),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BATCHES (Separate lot records per product, maintaining individual prices & expiry dates)
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_no VARCHAR(100) NOT NULL,
    mfg_date DATE NOT NULL,
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

-- 7. STOCK MOVEMENTS (Complete audit trail of all 7 movement types)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    movement_type stock_movement_type NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL, -- Positive for inward (+), Negative for outward (-)
    unit_cost NUMERIC(12, 2) DEFAULT 0.00,
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    reference_id UUID,
    reference_type VARCHAR(50),       -- 'sales', 'purchases', 'damages', 'adjustment'
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. UDHARI CUSTOMERS (Credit Khata Ledger)
CREATE TABLE IF NOT EXISTS public.udhar_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
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

-- 9. UDHARI TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.udhar_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.udhar_customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Credit_Given', 'Payment_Received')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(50) DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Online_UPI', 'Bank_Transfer')),
    notes TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SALES / BILLING TRANSACTIONS (Includes Demographic Tracking)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.udhar_customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) DEFAULT 'Counter Customer',
    customer_phone VARCHAR(20),
    customer_gender VARCHAR(20) DEFAULT 'Male',       -- 'Male', 'Female', 'Other'
    customer_age_group VARCHAR(50) DEFAULT 'Adults (26-45)', -- '<18', '18-25', '26-45', '45+'
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

-- 11. SALE ITEMS (Line items of each sale)
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

-- 12. SALE BATCH ALLOCATIONS (FEFO Batch deduction mapping for exact COGS & profit calculation)
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

-- 13. PURCHASES (Inward goods history)
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
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(100),
    batch_no VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. DAMAGE & SPOILAGE RECORDS (Expired removal / leakage / curdling)
CREATE TABLE IF NOT EXISTS public.damage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    estimated_loss_amount NUMERIC(12, 2) NOT NULL CHECK (estimated_loss_amount >= 0),
    reason VARCHAR(150) NOT NULL, -- 'Doodh Fat Gya (Curdled)', 'Theli Phat Gayi (Leaked)', 'Expiry Date Over', 'Handling Spoilage'
    damage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. EXPENSES & CAPITAL INVESTMENTS
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_capital_investment BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SECTION 3: PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

CREATE INDEX IF NOT EXISTS idx_batches_product_expiry ON public.batches(product_id, expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON public.batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_qty_remaining ON public.batches(qty_remaining);
CREATE INDEX IF NOT EXISTS idx_batches_batch_no ON public.batches(batch_no);

CREATE INDEX IF NOT EXISTS idx_stock_movements_prod_date ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON public.stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_allocations_sale_id ON public.sale_batch_allocations(sale_id);
CREATE INDEX IF NOT EXISTS idx_allocations_batch ON public.sale_batch_allocations(batch_id);

CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON public.sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_damage_date ON public.damage_records(damage_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_udhar_balance ON public.udhar_customers(current_balance);

-- ============================================================================
-- SECTION 4: DYNAMIC COMPUTED VIEWS
-- ============================================================================

-- 1. VIEW: DYNAMIC BATCH EXPIRY STATUS (Computed on the fly in Asia/Kolkata timezone)
CREATE OR REPLACE VIEW public.v_batch_expiry_status AS
SELECT 
    b.id AS batch_id,
    b.product_id,
    p.name AS product_name,
    p.hindi_name,
    p.marathi_name,
    p.category,
    p.unit,
    b.batch_no,
    b.mfg_date,
    b.expiry_date,
    b.qty_received,
    b.qty_remaining,
    b.purchase_price,
    b.selling_price,
    b.supplier_name,
    b.status,
    (b.expiry_date - (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) AS days_until_expiry,
    CASE 
        WHEN (b.expiry_date - (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) < 0 THEN 'EXPIRED'
        WHEN (b.expiry_date - (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) = 0 THEN 'EXPIRING_TODAY'
        WHEN (b.expiry_date - (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) = 1 THEN 'EXPIRING_TOMORROW'
        WHEN (b.expiry_date - (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) <= 3 THEN 'EXPIRING_IN_3_DAYS'
        WHEN (b.expiry_date - (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) <= 7 THEN 'EXPIRING_IN_7_DAYS'
        ELSE 'FRESH'
    END AS dynamic_expiry_status,
    ROUND((b.qty_remaining * b.purchase_price)::numeric, 2) AS valuation_at_cost,
    ROUND((b.qty_remaining * b.selling_price)::numeric, 2) AS valuation_at_retail
FROM public.batches b
JOIN public.products p ON b.product_id = p.id
WHERE b.qty_remaining > 0;

-- 2. VIEW: REAL-TIME STOCK VALUATION & NEAR-EXPIRY FINANCIAL RISK
CREATE OR REPLACE VIEW public.v_stock_valuation AS
SELECT 
    COUNT(DISTINCT p.id) AS total_products,
    COUNT(DISTINCT b.id) AS total_active_batches,
    COALESCE(SUM(b.qty_remaining * b.purchase_price), 0)::NUMERIC(12, 2) AS total_stock_cost_value,
    COALESCE(SUM(b.qty_remaining * b.selling_price), 0)::NUMERIC(12, 2) AS total_stock_retail_value,
    COALESCE(SUM(CASE 
        WHEN b.expiry_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE 
        THEN b.qty_remaining * b.purchase_price ELSE 0 END), 0)::NUMERIC(12, 2) AS expired_stock_loss_value,
    COALESCE(SUM(CASE 
        WHEN b.expiry_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE 
         AND b.expiry_date <= ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE + 3) 
        THEN b.qty_remaining * b.purchase_price ELSE 0 END), 0)::NUMERIC(12, 2) AS near_expiry_at_risk_value
FROM public.products p
LEFT JOIN public.batches b ON p.id = b.product_id AND b.qty_remaining > 0;

-- 3. VIEW: PRODUCT STOCK SUMMARY
CREATE OR REPLACE VIEW public.v_product_stock_summary AS
SELECT 
    p.id AS product_id,
    p.name,
    p.category,
    p.unit,
    p.selling_price,
    p.purchase_price,
    p.min_stock_alert,
    p.stock_quantity AS master_stock,
    COALESCE(SUM(b.qty_remaining), 0)::NUMERIC(12, 2) AS total_batch_stock,
    COALESCE(SUM(CASE 
        WHEN b.expiry_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE 
        THEN b.qty_remaining ELSE 0 END), 0)::NUMERIC(12, 2) AS valid_saleable_stock,
    COALESCE(SUM(CASE 
        WHEN b.expiry_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE 
        THEN b.qty_remaining ELSE 0 END), 0)::NUMERIC(12, 2) AS expired_stock
FROM public.products p
LEFT JOIN public.batches b ON p.id = b.product_id AND b.qty_remaining > 0
GROUP BY p.id, p.name, p.category, p.unit, p.selling_price, p.purchase_price, p.min_stock_alert, p.stock_quantity;

-- ============================================================================
-- SECTION 5: ATOMIC STORED PROCEDURES (RPCs)
-- ============================================================================

-- RPC 1: ATOMIC STOCK INWARD BATCH CREATION
CREATE OR REPLACE FUNCTION public.fn_record_stock_inward_batch(
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
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Received quantity must be greater than zero';
    END IF;

    -- 1. Insert new batch
    INSERT INTO public.batches (
        product_id,
        batch_no,
        mfg_date,
        expiry_date,
        qty_received,
        qty_remaining,
        purchase_price,
        selling_price,
        supplier_id,
        supplier_name,
        notes,
        status
    ) VALUES (
        p_product_id,
        p_batch_no,
        p_mfg_date,
        p_expiry_date,
        p_quantity,
        p_quantity,
        p_purchase_price,
        p_selling_price,
        p_supplier_id,
        p_supplier_name,
        p_notes,
        'ACTIVE'
    ) RETURNING id INTO v_batch_id;

    -- 2. Record stock movement audit
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: ATOMIC FEFO STOCK DEDUCTION & ALLOCATION
-- Concurrency safe: Uses SELECT FOR UPDATE row-level locking on batches
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
                'POS Counter Sale Deduction'
            );

            v_needed := v_needed - v_deduct;
        END LOOP;

        -- 3. Decrement master product stock quantity
        UPDATE public.products
        SET stock_quantity = GREATEST(0, stock_quantity - v_item.quantity),
            updated_at = NOW()
        WHERE id = v_item.product_id;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 3: ATOMIC EXPIRED STOCK REMOVAL & LOSS WRITE-OFF
CREATE OR REPLACE FUNCTION public.fn_record_expired_stock_removal(
    p_batch_id UUID,
    p_quantity NUMERIC(12, 2),
    p_reason VARCHAR(150),
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_batch RECORD;
    v_damage_id UUID;
    v_loss_amount NUMERIC(12, 2);
    v_product_name VARCHAR(255);
    v_product_unit VARCHAR(50);
BEGIN
    -- 1. Lock and fetch batch
    SELECT b.*, p.name AS prod_name, p.unit AS prod_unit
    INTO v_batch
    FROM public.batches b
    JOIN public.products p ON b.product_id = p.id
    WHERE b.id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch with ID % not found', p_batch_id;
    END IF;

    IF p_quantity <= 0 OR p_quantity > v_batch.qty_remaining THEN
        RAISE EXCEPTION 'Invalid removal quantity %. Max available: %', p_quantity, v_batch.qty_remaining;
    END IF;

    v_loss_amount := ROUND((p_quantity * v_batch.purchase_price)::numeric, 2);

    -- 2. Deduct from batch
    UPDATE public.batches
    SET qty_remaining = qty_remaining - p_quantity,
        status = CASE WHEN qty_remaining - p_quantity = 0 THEN 'DISPOSED' ELSE status END,
        updated_at = NOW()
    WHERE id = p_batch_id;

    -- 3. Insert damage record
    INSERT INTO public.damage_records (
        product_id,
        batch_id,
        product_name,
        quantity,
        unit,
        estimated_loss_amount,
        reason,
        damage_date,
        notes
    ) VALUES (
        v_batch.product_id,
        p_batch_id,
        v_batch.prod_name,
        p_quantity,
        v_batch.prod_unit,
        v_loss_amount,
        p_reason,
        CURRENT_DATE,
        p_notes
    ) RETURNING id INTO v_damage_id;

    -- 4. Record stock movement
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
        v_batch.product_id,
        p_batch_id,
        'EXPIRED_REMOVAL',
        -p_quantity,
        v_batch.purchase_price,
        0.00,
        v_damage_id,
        'damage_records',
        COALESCE(p_notes, 'Expired stock written off')
    );

    -- 5. Decrement master product stock
    UPDATE public.products
    SET stock_quantity = GREATEST(0, stock_quantity - p_quantity),
        updated_at = NOW()
    WHERE id = v_batch.product_id;

    RETURN v_damage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 4: ATOMIC CANCEL SALE & RESTORE INVENTORY
CREATE OR REPLACE FUNCTION public.fn_cancel_sale_atomic(p_sale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_alloc RECORD;
BEGIN
    -- Ensure sale exists and not already cancelled
    IF NOT EXISTS (SELECT 1 FROM public.sales WHERE id = p_sale_id AND status = 'COMPLETED') THEN
        RAISE EXCEPTION 'Sale not found or already cancelled';
    END IF;

    -- Restore batch quantities from allocations
    FOR v_alloc IN 
        SELECT product_id, batch_id, quantity_deducted, purchase_price_at_sale, selling_price_at_sale
        FROM public.sale_batch_allocations
        WHERE sale_id = p_sale_id
    LOOP
        UPDATE public.batches
        SET qty_remaining = qty_remaining + v_alloc.quantity_deducted,
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = v_alloc.batch_id;

        -- Record return stock movement
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
            v_alloc.product_id,
            v_alloc.batch_id,
            'SALE_RETURN',
            v_alloc.quantity_deducted,
            v_alloc.purchase_price_at_sale,
            v_alloc.selling_price_at_sale,
            p_sale_id,
            'sales',
            'Sale cancelled - Inventory restored'
        );

        -- Restore product stock
        UPDATE public.products
        SET stock_quantity = stock_quantity + v_alloc.quantity_deducted,
            updated_at = NOW()
        WHERE id = v_alloc.product_id;
    END LOOP;

    -- Mark sale cancelled
    UPDATE public.sales
    SET status = 'CANCELLED'
    WHERE id = p_sale_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_batch_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.udhar_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.udhar_transactions ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to avoid duplicate errors
DO $$ 
DECLARE
    tbl text;
    pol text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'profiles', 'categories', 'units', 'suppliers', 'products', 'batches',
        'stock_movements', 'sales', 'sale_items', 'sale_batch_allocations',
        'purchases', 'damage_records', 'expenses', 'udhar_customers', 'udhar_transactions'
    ])
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
        END LOOP;
    END LOOP;
END $$;

-- Policy creation: Full access for Authenticated users & Anon users (Supports both POS terminal and Cloud demo)
CREATE POLICY "Allow all read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full profiles" ON public.profiles FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all units" ON public.units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all batches" ON public.batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sale_batch_allocations" ON public.sale_batch_allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all damage_records" ON public.damage_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all udhar_customers" ON public.udhar_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all udhar_transactions" ON public.udhar_transactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- SECTION 7: AUTHENTIC DAIRY SEED DATA
-- ============================================================================

-- 1. Categories
INSERT INTO public.categories (id, name, description) VALUES
('11111111-1111-1111-1111-111111111101', 'Milk', 'Fresh Raw Buffalo Milk, Cow Milk, and Pasteurized Pouches'),
('11111111-1111-1111-1111-111111111102', 'Curd & Chaas', 'Fresh Desi Dahi, Packaged Curd, Spiced Chaas and Lassi'),
('11111111-1111-1111-1111-111111111103', 'Paneer & Butter', 'Fresh Malai Paneer, Table White Butter, and Butter Bricks'),
('11111111-1111-1111-1111-111111111104', 'Ghee', 'Pure Desi Cow Ghee, Buffalo Danedaar Ghee jars & tins'),
('11111111-1111-1111-1111-111111111105', 'Sweets/Mithai', 'Fresh Shuddh Khoya/Mawa, Kaju Katli, Gulab Jamun, Rasgulla'),
('11111111-1111-1111-1111-111111111106', 'Bakery & Extras', 'Fresh Milk Bread, Pav, Farm Fresh Eggs, and packaging extras')
ON CONFLICT (name) DO NOTHING;

-- 2. Units
INSERT INTO public.units (id, name, short_code) VALUES
('22222222-2222-2222-2222-222222222201', 'Litre', 'Litre'),
('22222222-2222-2222-2222-222222222202', 'Kilogram', 'Kg'),
('22222222-2222-2222-2222-222222222203', 'Packet (500ml)', 'Packet (500ml)'),
('22222222-2222-2222-2222-222222222204', 'Packet (1L)', 'Packet (1L)'),
('22222222-2222-2222-2222-222222222205', 'Piece', 'Piece'),
('22222222-2222-2222-2222-222222222206', 'Gram', 'Gram')
ON CONFLICT (name) DO NOTHING;

-- 3. Suppliers
INSERT INTO public.suppliers (id, name, contact_person, phone, address, is_active) VALUES
('33333333-3333-3333-3333-333333333301', 'Rampal Dairy Farmer (Village Sangam)', 'Rampal Yadav', '9823145678', 'Sangam Dairy Hub, Shed 4', true),
('33333333-3333-3333-3333-333333333302', 'Kishanlal Desi Goshala', 'Kishanlal Sharma', '9890123456', 'Gau Shala Road, Wardha', true),
('33333333-3333-3333-3333-333333333303', 'Shree Krishna Paneer Bhandar', 'Gopal Bhai', '9822334455', 'MIDC Industrial Area, Plot 12', true),
('33333333-3333-3333-3333-333333333304', 'Amul Dairy Distributor Pune', 'Sachin Kulkarni', '9881122334', 'Transport Nagar, Depot 7', true)
ON CONFLICT DO NOTHING;

-- 4. Products (Authentic Dairy Catalog with Marathi & Hindi names)
INSERT INTO public.products (
    id, name, hindi_name, marathi_name, category, unit, 
    purchase_price, selling_price, stock_quantity, min_stock_alert, 
    shelf_life_days, has_expiry, barcode
) VALUES
('44444444-4444-4444-4444-444444444401', 'Fresh Buffalo Milk (Bhains Ka Doodh)', 'ताज़ा भैंस का दूध (फुल क्रीम)', 'ताजे म्हशीचे दूध (फुल क्रीम)', 'Milk', 'Litre', 58.00, 70.00, 110.00, 25.00, 2, true, '890100000001'),
('44444444-4444-4444-4444-444444444402', 'Desi Cow Milk (Gai Ka Doodh)', 'देसी गाय का शुद्ध दूध', 'शुद्ध देशी गायीचे दूध (A2)', 'Milk', 'Litre', 44.00, 56.00, 80.00, 20.00, 2, true, '890100000002'),
('44444444-4444-4444-4444-444444444403', 'Toned Milk Pouch (500ml)', 'टोन्ड दूध थैली (500ml)', 'टोन्ड दूध पाऊच (500ml)', 'Milk', 'Packet (500ml)', 24.00, 28.00, 14.00, 25.00, 2, true, '890100000003'),
('44444444-4444-4444-4444-444444444404', 'Fresh Malai Paneer', 'ताज़ा मलाई पनीर', 'ताजे मलाईदार पनीर', 'Paneer & Butter', 'Kg', 310.00, 380.00, 6.50, 10.00, 4, true, '890100000004'),
('44444444-4444-4444-4444-444444444405', 'Fresh Desi Dahi (Khula Curd)', 'ताज़ा मीठा दही (खुला)', 'ताजे गोड दही (खुले)', 'Curd & Chaas', 'Kg', 55.00, 75.00, 32.00, 15.00, 3, true, '890100000005'),
('44444444-4444-4444-4444-444444444406', 'Dahi Cup/Pouch (400g)', 'दही पाउच/कप (400g)', 'दही कप / पाऊच (400g)', 'Curd & Chaas', 'Piece', 26.00, 32.00, 40.00, 12.00, 7, true, '890100000006'),
('44444444-4444-4444-4444-444444444407', 'Masala Chaas (Spiced Buttermilk)', 'मसाला छाछ', 'मसाला ताक (थंडगार)', 'Curd & Chaas', 'Packet (500ml)', 11.00, 15.00, 65.00, 20.00, 3, true, '890100000007'),
('44444444-4444-4444-4444-444444444408', 'Desi Cow Ghee (Pure Jar)', 'शुद्ध देसी गाय का घी (जार)', 'शुद्ध देशी गायीचे साजूक तूप (जार)', 'Ghee', 'Kg', 580.00, 740.00, 18.00, 5.00, 180, true, '890100000008'),
('44444444-4444-4444-4444-444444444409', 'Danedaar Buffalo Ghee', 'दानेदार भैंस का शुद्ध घी', 'दाणेदार म्हशीचे शुद्ध तूप', 'Ghee', 'Kg', 540.00, 680.00, 21.00, 5.00, 180, true, '890100000009'),
('44444444-4444-4444-4444-444444444410', 'Safed Makkhan (White Butter)', 'सफेद ताजा मक्खन (लोणी)', 'ताजे पांढरे लोणी (मक्खन)', 'Paneer & Butter', 'Kg', 420.00, 520.00, 9.00, 4.00, 5, true, '890100000010'),
('44444444-4444-4444-4444-444444444411', 'Shuddh Khoya / Mawa (Pindi)', 'शुद्ध खोया / मावा (पिंडी)', 'शुद्ध खवा / मावा (पिंडी)', 'Sweets/Mithai', 'Kg', 290.00, 370.00, 12.00, 5.00, 5, true, '890100000011'),
('44444444-4444-4444-4444-444444444412', 'Kaju Katli (Pure Ghee)', 'काजू कतली (प्योर घी)', 'काजू कतली (शुद्ध तुपातील)', 'Sweets/Mithai', 'Kg', 720.00, 940.00, 8.00, 3.00, 15, true, '890100000012'),
('44444444-4444-4444-4444-444444444413', 'Desi Ghee Gulab Jamun', 'गुलाब जामुन (देसी घी)', 'गुलाब जामुन (साजूक तुपातील)', 'Sweets/Mithai', 'Kg', 240.00, 320.00, 15.00, 4.00, 10, true, '890100000013'),
('44444444-4444-4444-4444-444444444414', 'Kulhad Sweet Lassi', 'कुल्हड़ मीठी लस्सी', 'कुल्हड गोड लस्सी', 'Curd & Chaas', 'Piece', 22.00, 40.00, 35.00, 10.00, 2, true, '890100000014'),
('44444444-4444-4444-4444-444444444415', 'Farm Fresh Eggs (Crate 30 pcs)', 'अंडे की क्रेट (30 पीस)', 'अंडी क्रेट (३० नग)', 'Bakery & Extras', 'Piece', 165.00, 210.00, 12.00, 5.00, 21, true, '890100000015')
ON CONFLICT (id) DO UPDATE SET
    hindi_name = EXCLUDED.hindi_name,
    marathi_name = EXCLUDED.marathi_name,
    selling_price = EXCLUDED.selling_price,
    purchase_price = EXCLUDED.purchase_price;

-- 5. Batches (Multi-Lot entries with Varied Expiry: Fresh, Expiring Today, Expiring Tomorrow, Expired)
INSERT INTO public.batches (
    id, product_id, batch_no, supplier_name,
    mfg_date, expiry_date, qty_received, qty_remaining,
    purchase_price, selling_price, status
) VALUES
-- Buffalo Milk: Fresh batch (today + 1 day) and 1 yesterday's remaining
('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', 'BM-MOR-01', 'Rampal Dairy Farmer', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 80.00, 80.00, 58.00, 70.00, 'ACTIVE'),
('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444401', 'BM-EVE-02', 'Rampal Dairy Farmer', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, 40.00, 30.00, 58.00, 70.00, 'ACTIVE'),

-- Cow Milk: Fresh batch
('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444402', 'CM-TODAY-01', 'Kishanlal Desi Goshala', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 80.00, 80.00, 44.00, 56.00, 'ACTIVE'),

-- Toned Milk Pouch: Expiring TODAY (critical alert for cashier)
('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444403', 'TM-AMUL-09', 'Amul Dairy Distributor', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE, 30.00, 14.00, 24.00, 28.00, 'ACTIVE'),

-- Malai Paneer: Lot expiring TOMORROW (orange alert)
('55555555-5555-5555-5555-555555555505', '44444444-4444-4444-4444-444444444404', 'PN-KRISH-03', 'Shree Krishna Paneer', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 day', 15.00, 6.50, 310.00, 380.00, 'ACTIVE'),

-- Desi Dahi: Fresh batch
('55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444405', 'DH-POT-01', 'In-House Preparation', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 40.00, 32.00, 55.00, 75.00, 'ACTIVE'),

-- Pure Cow Ghee: Long shelf life (Fresh)
('55555555-5555-5555-5555-555555555507', '44444444-4444-4444-4444-444444444408', 'GH-JAR-101', 'Kishanlal Desi Goshala', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '165 days', 25.00, 18.00, 580.00, 740.00, 'ACTIVE'),

-- Danedaar Buffalo Ghee: Fresh
('55555555-5555-5555-5555-555555555508', '44444444-4444-4444-4444-444444444409', 'GH-BUF-88', 'In-House Kitchen', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '170 days', 30.00, 21.00, 540.00, 680.00, 'ACTIVE'),

-- Shuddh Khoya / Mawa: Expiring in 2 days
('55555555-5555-5555-5555-555555555509', '44444444-4444-4444-4444-444444444411', 'KW-DHABBA-04', 'Rampal Dairy Farmer', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '2 days', 20.00, 12.00, 290.00, 370.00, 'ACTIVE'),

-- Kaju Katli: Fresh
('55555555-5555-5555-5555-555555555510', '44444444-4444-4444-4444-444444444412', 'KJ-SWEET-09', 'In-House Mithai Chef', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '14 days', 10.00, 8.00, 720.00, 940.00, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 6. Udhar Customers
INSERT INTO public.udhar_customers (id, name, phone, address, total_credit, total_paid, current_balance, status) VALUES
('66666666-6666-6666-6666-666666666601', 'Sharma Halwai (Ramesh)', '9823145678', 'Shop 14, Main Gol Market', 8500.00, 6100.00, 2400.00, 'Active'),
('66666666-6666-6666-6666-666666666602', 'Gupta General Store & Tea Stall', '9890123456', 'Bus Stand Auto Stand Corner', 4200.00, 2400.00, 1800.00, 'Active'),
('66666666-6666-6666-6666-666666666603', 'Deepak Sweet & Farsan Mart', '9811223344', 'Gandhi Chowk, Next to Bank', 6700.00, 3200.00, 3500.00, 'Active'),
('66666666-6666-6666-6666-666666666604', 'Counter Customer', 'N/A', 'Walk-in Cash Customer', 680.00, 0.00, 680.00, 'Active')
ON CONFLICT (id) DO NOTHING;

-- 7. Expenses
INSERT INTO public.expenses (id, title, category, amount, payment_mode, expense_date, is_capital_investment, notes) VALUES
('77777777-7777-7777-7777-777777777701', 'Delivery Bike & Van Petrol', 'Gadi Petrol / Diesel', 650.00, 'Cash', CURRENT_DATE, false, 'Morning door-to-door milk delivery petrol'),
('77777777-7777-7777-7777-777777777702', 'Deep Chiller Commercial Electricity', 'Light / Electricity Bill', 5850.00, 'Online_UPI', CURRENT_DATE - INTERVAL '8 days', false, 'MSEDCL electricity power for 3 deep chillers'),
('77777777-7777-7777-7777-777777777703', 'Shop Monthly Rent', 'Dukan Rent', 14000.00, 'Online_UPI', CURRENT_DATE - INTERVAL '10 days', false, 'Paid to shop owner Mr. Sharma')
ON CONFLICT (id) DO NOTHING;

-- 8. Damage Records Sample
INSERT INTO public.damage_records (id, product_name, quantity, unit, estimated_loss_amount, reason, damage_date, notes) VALUES
('88888888-8888-8888-8888-888888888801', 'Fresh Buffalo Milk (Bhains Ka Doodh)', 2.50, 'Litre', 145.00, 'Doodh Fat Gya (Curdled)', CURRENT_DATE, 'Chiller temperature fluctuated due to power cut, morning 2.5L spoiled'),
('88888888-8888-8888-8888-888888888802', 'Toned Milk Pouch (500ml)', 3.00, 'Packet (500ml)', 72.00, 'Theli Phat Gayi (Leaked)', CURRENT_DATE - INTERVAL '1 day', 'Damaged in transit crate')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- To verify everything is working, run:
-- SELECT * FROM public.v_batch_expiry_status;
-- SELECT * FROM public.v_stock_valuation;
-- ============================================================================

