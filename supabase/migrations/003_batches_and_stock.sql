-- ============================================================================
-- MIGRATION 003: BATCHES, STOCK TRANSACTIONS & EXPIRY STATUS VIEWS
-- Description: Batch-wise stock tracking, FEFO foundations, and dynamic status
-- ============================================================================

-- Stock Transaction Type Enum
DO $$ BEGIN
    CREATE TYPE stock_transaction_type AS ENUM (
        'purchase',
        'sale',
        'return',
        'adjustment',
        'wastage',
        'transfer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Batches Table
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_no VARCHAR(100) NOT NULL,
    mfg_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    qty_received NUMERIC(12, 2) NOT NULL,
    qty_remaining NUMERIC(12, 2) NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_qty_remaining_non_negative CHECK (qty_remaining >= 0),
    CONSTRAINT chk_mfg_before_expiry CHECK (mfg_date <= expiry_date)
);

CREATE TRIGGER trg_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Indexes for FEFO sorting and expiry monitoring
CREATE INDEX IF NOT EXISTS idx_batches_product_expiry ON public.batches(product_id, expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON public.batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_qty_remaining ON public.batches(qty_remaining);

-- 2. Stock Transactions Audit Log
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    type stock_transaction_type NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL, -- Positive for stock increase, negative for deduction
    reference_id UUID,               -- Links to purchase_id, sale_id, wastage_id, etc.
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_product_date ON public.stock_transactions(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_tx_batch ON public.stock_transactions(batch_id);

-- 3. COMPUTED VIEW: Batch Expiry Status View (Calculated on the fly in Asia/Kolkata timezone)
-- Business Rule 3: EXPIRY STATUS must be computed from expiry_date, not stored.
CREATE OR REPLACE VIEW public.v_batch_expiry_status AS
SELECT 
    b.id AS batch_id,
    b.product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    c.name AS category_name,
    u.short_code AS unit,
    b.batch_no,
    b.mfg_date,
    b.expiry_date,
    b.qty_received,
    b.qty_remaining,
    b.purchase_price,
    p.selling_price,
    b.supplier_id,
    s.name AS supplier_name,
    (b.expiry_date - (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) AS days_until_expiry,
    CASE
        WHEN b.expiry_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN 'Expired'
        WHEN b.expiry_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN 'Expiring Today'
        WHEN b.expiry_date = ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE + 1) THEN 'Expiring Tomorrow'
        WHEN b.expiry_date <= ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE + 3) THEN 'Expiring in 3 Days'
        WHEN b.expiry_date <= ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE + 7) THEN 'Expiring in 7 Days'
        ELSE 'Fresh'
    END AS expiry_status,
    CASE 
        WHEN b.expiry_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE OR b.qty_remaining <= 0 THEN FALSE 
        ELSE TRUE 
    END AS is_sellable
FROM public.batches b
JOIN public.products p ON b.product_id = p.id
JOIN public.categories c ON p.category_id = c.id
JOIN public.units u ON p.unit_id = u.id
LEFT JOIN public.suppliers s ON b.supplier_id = s.id;

-- 4. COMPUTED VIEW: Product Aggregate Stock & Low-Stock Alerts
CREATE OR REPLACE VIEW public.v_product_stock AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.barcode,
    c.name AS category_name,
    b_brand.name AS brand_name,
    u.name AS unit_name,
    u.short_code AS unit,
    p.purchase_price,
    p.selling_price,
    p.min_stock,
    p.max_stock,
    p.is_active,
    COALESCE(SUM(b.qty_remaining), 0.00) AS total_stock,
    COALESCE(SUM(CASE WHEN b.expiry_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN b.qty_remaining ELSE 0 END), 0.00) AS sellable_stock,
    COALESCE(SUM(CASE WHEN b.expiry_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN b.qty_remaining ELSE 0 END), 0.00) AS expired_stock,
    CASE 
        WHEN COALESCE(SUM(CASE WHEN b.expiry_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN b.qty_remaining ELSE 0 END), 0.00) = 0 THEN 'Out of Stock'
        WHEN COALESCE(SUM(CASE WHEN b.expiry_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN b.qty_remaining ELSE 0 END), 0.00) <= p.min_stock THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status,
    (COALESCE(SUM(b.qty_remaining), 0.00) <= p.min_stock) AS is_low_stock
FROM public.products p
JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.brands b_brand ON p.brand_id = b_brand.id
JOIN public.units u ON p.unit_id = u.id
LEFT JOIN public.batches b ON p.id = b.product_id
GROUP BY p.id, p.name, p.sku, p.barcode, c.name, b_brand.name, u.name, u.short_code, p.purchase_price, p.selling_price, p.min_stock, p.max_stock, p.is_active;

