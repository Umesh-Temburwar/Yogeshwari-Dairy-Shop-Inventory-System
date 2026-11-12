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

-- 1. PROFILES (1 Owner & 2 Admins with Default Redirects)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25),
    role VARCHAR(50) NOT NULL CHECK (role IN ('Owner', 'Admin')),
    admin_slot INTEGER CHECK (admin_slot IN (1, 2) OR admin_slot IS NULL),
    default_redirect_view VARCHAR(50) NOT NULL DEFAULT 'dashboard' CHECK (default_redirect_view IN (
        'dashboard', 'pos', 'inventory', 'sales', 'reorder', 'expiry', 
        'purchases', 'damages', 'udhar', 'expenses', 'analytics', 'returns'
    )),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Strict Constraints: 1 Owner & Exactly 2 Admins
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_owner 
ON public.profiles (role) 
WHERE role = 'Owner' AND is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_slots 
ON public.profiles (role, admin_slot) 
WHERE role = 'Admin' AND is_active = TRUE;

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

-- 16. CUSTOMER SALES RETURNS TABLE
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

-- 17. SUPPLIER INWARD PURCHASES RETURNS TABLE (खरेदी व सप्लायर परतावा - खराब/एक्सपायर माल परत करणे)
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
    reason VARCHAR(100) NOT NULL,
    refund_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (refund_status IN ('Pending', 'Refund_Received', 'Adjusted_In_Next_Bill', 'Replacement_Received')),
    refund_mode VARCHAR(50) CHECK (refund_mode IN ('Cash', 'Online_UPI', 'Credit_Deduction', 'Replacement')),
    refund_date DATE,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
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
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_returns ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to avoid duplicate errors
DO $$ 
DECLARE
    tbl text;
    pol text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'profiles', 'categories', 'units', 'suppliers', 'products', 'batches',
        'stock_movements', 'sales', 'sale_items', 'sale_batch_allocations',
        'purchases', 'damage_records', 'expenses', 'udhar_customers', 'udhar_transactions',
        'product_returns', 'supplier_returns'
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
CREATE POLICY "Allow all product_returns" ON public.product_returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all supplier_returns" ON public.supplier_returns FOR ALL USING (true) WITH CHECK (true);

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

-- 3. Authorized Profiles (1 Owner & 2 Admins)
INSERT INTO public.profiles (id, email, full_name, role, admin_slot, default_redirect_view, is_active)
VALUES
    ('10000000-0000-0000-0000-000000000001'::UUID, 'owner@yogeshwaridairy.com', 'Yogeshwari Dairy Owner', 'Owner', NULL, 'dashboard', TRUE),
    ('10000000-0000-0000-0000-000000000002'::UUID, 'admin1@yogeshwaridairy.com', 'Store Administrator 1 (Counter Billing)', 'Admin', 1, 'pos', TRUE),
    ('10000000-0000-0000-0000-000000000003'::UUID, 'admin2@yogeshwaridairy.com', 'Store Administrator 2 (Inventory & Stock)', 'Admin', 2, 'inventory', TRUE)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    admin_slot = EXCLUDED.admin_slot,
    default_redirect_view = EXCLUDED.default_redirect_view,
    is_active = TRUE;

INSERT INTO public.profiles (email, full_name, role, admin_slot, default_redirect_view, is_active)
VALUES ('admin@yogeshwaridairy.com', 'Store Administrator 1 (Counter Billing)', 'Admin', 1, 'pos', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- DUMMY DATA REMOVED: Clean Production Setup Ready
-- Master lookup categories and units are initialized above.
-- No mock batches, no fake sales, no dummy customers, no fake expenses.
-- ============================================================================

-- If you already have existing dummy test data in your Supabase project,
-- you can run the following cleanup query to instantly reset to a clean state:
-- TRUNCATE TABLE public.sale_batch_allocations CASCADE;
-- TRUNCATE TABLE public.sale_items CASCADE;
-- TRUNCATE TABLE public.sales CASCADE;
-- TRUNCATE TABLE public.damage_records CASCADE;
-- TRUNCATE TABLE public.expenses CASCADE;
-- TRUNCATE TABLE public.udhar_transactions CASCADE;
-- TRUNCATE TABLE public.udhar_customers CASCADE;
-- TRUNCATE TABLE public.stock_movements CASCADE;
-- TRUNCATE TABLE public.batches CASCADE;
-- TRUNCATE TABLE public.products CASCADE;

-- ============================================================================
-- SECTION 8: 1 OWNER & 2 ADMINS ROLES, COUNTER TRACKING & AUDIT LOGS
-- ============================================================================

-- 1. Profiles Table with 1 Owner and 2 Admins constraint
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25),
    role VARCHAR(50) NOT NULL CHECK (role IN ('Owner', 'Admin')),
    admin_slot INTEGER CHECK (admin_slot IN (1, 2) OR admin_slot IS NULL),
    default_redirect_view VARCHAR(50) NOT NULL DEFAULT 'dashboard' CHECK (default_redirect_view IN (
        'dashboard', 'pos', 'inventory', 'sales', 'reorder', 'expiry', 
        'purchases', 'damages', 'udhar', 'expenses', 'analytics', 'returns'
    )),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_owner 
ON public.profiles (role) 
WHERE role = 'Owner' AND is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_slots 
ON public.profiles (role, admin_slot) 
WHERE role = 'Admin' AND is_active = TRUE;

-- Pre-seed 1 Owner & 2 Admins
INSERT INTO public.profiles (id, email, full_name, role, admin_slot, default_redirect_view, is_active)
VALUES
    ('10000000-0000-0000-0000-000000000001'::UUID, 'owner@yogeshwaridairy.com', 'Yogeshwari Dairy Owner', 'Owner', NULL, 'dashboard', TRUE),
    ('10000000-0000-0000-0000-000000000002'::UUID, 'admin1@yogeshwaridairy.com', 'Store Administrator 1 (Counter Billing)', 'Admin', 1, 'pos', TRUE),
    ('10000000-0000-0000-0000-000000000003'::UUID, 'admin2@yogeshwaridairy.com', 'Store Administrator 2 (Inventory & Stock)', 'Admin', 2, 'inventory', TRUE)
ON CONFLICT (email) DO UPDATE 
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    admin_slot = EXCLUDED.admin_slot,
    default_redirect_view = EXCLUDED.default_redirect_view;

-- 2. Extend sales table with counter & admin columns
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150) DEFAULT 'Admin 1',
ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) DEFAULT 'Admin',
ADD COLUMN IF NOT EXISTS admin_slot INTEGER CHECK (admin_slot IN (1, 2) OR admin_slot IS NULL),
ADD COLUMN IF NOT EXISTS counter_name VARCHAR(100) DEFAULT 'काऊंटर १ - मुख्य बिलिंग';

-- 3. Admin Audit Logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_name VARCHAR(150) NOT NULL,
    admin_role VARCHAR(50) NOT NULL DEFAULT 'Admin' CHECK (admin_role IN ('Owner', 'Admin')),
    admin_slot INTEGER CHECK (admin_slot IN (1, 2) OR admin_slot IS NULL),
    counter_name VARCHAR(100) NOT NULL DEFAULT 'काऊंटर १ - मुख्य बिलिंग',
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'SALE_CREATED', 'PRODUCT_ADDED', 'PRODUCT_UPDATED', 'STOCK_INWARD', 
        'EXPENSE_ADDED', 'DAMAGE_RECORDED', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN', 
        'UDHAR_PAYMENT', 'UDHAR_GIVEN'
    )),
    title TEXT NOT NULL,
    details TEXT,
    amount NUMERIC(12, 2) DEFAULT 0.00,
    reference_id VARCHAR(100),
    reference_table VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Trigger for automatic sale logging
CREATE OR REPLACE FUNCTION public.trg_fn_auto_log_sale_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admin_audit_logs (
        admin_name, admin_role, admin_slot, counter_name,
        action_type, title, details, amount, reference_id, reference_table, created_at
    ) VALUES (
        COALESCE(NEW.created_by_name, 'Admin'),
        COALESCE(NEW.created_by_role, 'Admin'),
        NEW.admin_slot,
        COALESCE(NEW.counter_name, 'काऊंटर १ - मुख्य बिलिंग'),
        'SALE_CREATED',
        'पावती विक्री: ' || NEW.invoice_no,
        'ग्राहक: ' || COALESCE(NEW.customer_name, 'थेट ग्राहक') || ' | पेमेंट: ' || NEW.payment_mode || ' | निव्वळ रक्कम: ₹' || NEW.net_amount,
        NEW.net_amount,
        NEW.invoice_no,
        'sales',
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS trg_sales_auto_audit_log ON public.sales;
CREATE TRIGGER trg_sales_auto_audit_log
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_auto_log_sale_activity();

-- 5. Owner Views
CREATE OR REPLACE VIEW public.v_owner_admin_counter_summary AS
SELECT 
    COALESCE(s.admin_slot, 0) AS admin_slot,
    COALESCE(s.created_by_name, 'प्रशासक') AS admin_name,
    COALESCE(s.counter_name, 'काऊंटर') AS counter_name,
    COUNT(s.id) AS total_bills_count,
    COALESCE(SUM(s.net_amount), 0) AS total_sales_amount,
    COALESCE(SUM(s.cash_amount), 0) AS total_cash_collected,
    COALESCE(SUM(s.online_amount), 0) AS total_online_collected,
    COALESCE(SUM(s.udhar_amount), 0) AS total_udhar_given,
    MIN(s.created_at) AS first_sale_at,
    MAX(s.created_at) AS latest_sale_at
FROM public.sales s
WHERE s.status = 'COMPLETED'
GROUP BY s.admin_slot, s.created_by_name, s.counter_name
ORDER BY total_sales_amount DESC;

CREATE OR REPLACE VIEW public.v_owner_recent_admin_activities AS
SELECT 
    log.id, log.created_at, log.admin_name, log.admin_role, log.admin_slot,
    log.counter_name, log.action_type, log.title, log.details, log.amount,
    log.reference_id, log.reference_table
FROM public.admin_audit_logs log
ORDER BY log.created_at DESC;

-- Indexes & RLS
CREATE INDEX IF NOT EXISTS idx_sales_admin_slot ON public.sales (admin_slot);
CREATE INDEX IF NOT EXISTS idx_sales_counter_name ON public.sales (counter_name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_slot ON public.admin_audit_logs (admin_slot);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs (action_type);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select profiles for all" ON public.profiles;
CREATE POLICY "Allow select profiles for all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow select admin_audit_logs for all" ON public.admin_audit_logs;
CREATE POLICY "Allow select admin_audit_logs for all" ON public.admin_audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert admin_audit_logs for all" ON public.admin_audit_logs;
CREATE POLICY "Allow insert admin_audit_logs for all" ON public.admin_audit_logs FOR INSERT WITH CHECK (true);

GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.admin_audit_logs TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_counter_summary TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_recent_admin_activities TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- PHASE 14: DEDICATED GMAIL PROFILES & INVENTORY AUDIT TRACKING FOR SHOP OWNER
-- ============================================================================
-- 1. Extend sales and audit tables with email columns
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);

ALTER TABLE public.admin_audit_logs
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_sales_created_by_email ON public.sales (created_by_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_email ON public.admin_audit_logs (admin_email);

-- 2. Safely Deactivate old dummy placeholder emails
UPDATE public.profiles
SET is_active = FALSE
WHERE email NOT IN (
    'yogeshwaridairy9896@gmail.com',
    'nilusakhare2003@gmail.com',
    'nikhilsakhare9896@gmail.com'
);

-- 3. Upsert the 3 Official Authorized Accounts
-- A. 👑 Shop Owner: yogeshwaridairy9896@gmail.com -> dashboard
INSERT INTO public.profiles (
    id, email, full_name, role, admin_slot, default_redirect_view, is_active
)
VALUES (
    '10000000-0000-0000-0000-000000000001'::UUID,
    'yogeshwaridairy9896@gmail.com',
    'योगेश्वरी डेअरी मालक (Shop Owner)',
    'Owner',
    NULL,
    'dashboard',
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    admin_slot = EXCLUDED.admin_slot,
    default_redirect_view = EXCLUDED.default_redirect_view,
    is_active = TRUE,
    updated_at = NOW();

-- B. 🛡️ Admin 1: nilusakhare2003@gmail.com -> pos (Nilesh Sakhare - Counter 1)
INSERT INTO public.profiles (
    id, email, full_name, role, admin_slot, default_redirect_view, is_active
)
VALUES (
    '10000000-0000-0000-0000-000000000002'::UUID,
    'nilusakhare2003@gmail.com',
    'निलेश सखारे (प्रशासक १ - काऊंटर १)',
    'Admin',
    1,
    'pos',
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    admin_slot = EXCLUDED.admin_slot,
    default_redirect_view = EXCLUDED.default_redirect_view,
    is_active = TRUE,
    updated_at = NOW();

-- C. 🛡️ Admin 2: nikhilsakhare9896@gmail.com -> inventory (Nikhil Sakhare - Counter 2)
INSERT INTO public.profiles (
    id, email, full_name, role, admin_slot, default_redirect_view, is_active
)
VALUES (
    '10000000-0000-0000-0000-000000000003'::UUID,
    'nikhilsakhare9896@gmail.com',
    'निखिल सखारे (प्रशासक २ - काऊंटर २)',
    'Admin',
    2,
    'inventory',
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    admin_slot = EXCLUDED.admin_slot,
    default_redirect_view = EXCLUDED.default_redirect_view,
    is_active = TRUE,
    updated_at = NOW();

-- 4. Analytical View: Shop Owner Dedicated Inventory Changes & Updates Ledger
CREATE OR REPLACE VIEW public.v_owner_admin_inventory_changes AS
SELECT 
    log.id,
    log.created_at AS change_time,
    COALESCE(log.admin_email, '') AS admin_email,
    log.admin_name,
    log.admin_role,
    log.admin_slot,
    log.counter_name,
    log.action_type,
    log.title AS inventory_action_title,
    log.details AS change_details,
    log.amount,
    log.reference_id,
    log.reference_table
FROM public.admin_audit_logs log
WHERE log.action_type IN (
    'PRODUCT_ADDED', 
    'PRODUCT_UPDATED', 
    'STOCK_INWARD', 
    'DAMAGE_RECORDED', 
    'CUSTOMER_RETURN', 
    'SUPPLIER_RETURN'
)
ORDER BY log.created_at DESC;

-- 5. Analytical View: Shop Owner Dedicated Counter Sales Breakdown View
CREATE OR REPLACE VIEW public.v_owner_admin_counter_sales_details AS
SELECT 
    s.id,
    s.invoice_no,
    s.sale_date,
    s.created_at,
    COALESCE(s.created_by_email, '') AS admin_email,
    COALESCE(s.created_by_name, 'Admin') AS admin_name,
    COALESCE(s.admin_slot, 1) AS admin_slot,
    COALESCE(s.counter_name, 'काऊंटर १ - मुख्य बिलिंग') AS counter_name,
    s.customer_name,
    s.customer_phone,
    s.payment_mode,
    s.net_amount,
    s.cash_amount,
    s.online_amount,
    s.udhar_amount,
    (
        SELECT string_agg(si.product_name || ' (' || si.quantity || ' ' || si.unit || ')', ', ')
        FROM public.sale_items si
        WHERE si.sale_id = s.id
    ) AS items_summary
FROM public.sales s
WHERE s.status = 'COMPLETED'
ORDER BY s.created_at DESC;

-- 6. Helper Function: Role & Redirection by Gmail
CREATE OR REPLACE FUNCTION public.get_user_role_and_redirect(p_email TEXT)
RETURNS TABLE (
    user_role VARCHAR,
    admin_slot INTEGER,
    redirect_view VARCHAR,
    display_name VARCHAR
) AS $$
DECLARE
    clean_email TEXT := LOWER(TRIM(p_email));
BEGIN
    RETURN QUERY
    SELECT 
        p.role::VARCHAR AS user_role,
        p.admin_slot,
        p.default_redirect_view::VARCHAR AS redirect_view,
        p.full_name::VARCHAR AS display_name
    FROM public.profiles p
    WHERE LOWER(TRIM(p.email)) = clean_email
      AND p.is_active = TRUE
    LIMIT 1;

    IF FOUND THEN
        RETURN;
    END IF;

    IF clean_email = 'nikhilsakhare9896@gmail.com' OR clean_email LIKE '%nikhil%' THEN
        RETURN QUERY SELECT 'Admin'::VARCHAR, 2, 'inventory'::VARCHAR, 'निखिल सखारे (प्रशासक २ - काऊंटर २)'::VARCHAR;
    ELSIF clean_email = 'nilusakhare2003@gmail.com' OR clean_email LIKE '%nilu%' OR clean_email LIKE '%admin%' THEN
        RETURN QUERY SELECT 'Admin'::VARCHAR, 1, 'pos'::VARCHAR, 'निलेश सखारे (प्रशासक १ - काऊंटर १)'::VARCHAR;
    ELSE
        RETURN QUERY SELECT 'Owner'::VARCHAR, NULL::INTEGER, 'dashboard'::VARCHAR, 'योगेश्वरी डेअरी मालक (Shop Owner)'::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 7. Grant Permissions to API Roles
GRANT ALL ON TABLE public.admin_audit_logs TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_inventory_changes TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_counter_sales_details TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role_and_redirect(TEXT) TO anon, authenticated;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- To verify everything is working, run:
-- SELECT * FROM public.v_batch_expiry_status;
-- SELECT * FROM public.v_stock_valuation;
-- ============================================================================

