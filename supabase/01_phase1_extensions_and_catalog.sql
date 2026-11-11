-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 1: EXTENSIONS & PRODUCT CATALOG
-- File: supabase/01_phase1_extensions_and_catalog.sql
-- ============================================================================
-- Description:
-- Sets up UUID/cryptographic extensions, automatic timestamp update triggers,
-- and core master catalog tables (Categories, Units, Products).
--
-- Instructions:
-- 1. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire script and click "Run".
-- ============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Automated Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Categories Master Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    marathi_name VARCHAR(100),
    hindi_name VARCHAR(100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Units Master Table
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    short_code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Products Catalog Table (Dual Compatibility: strings & relational foreign keys)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    marathi_name VARCHAR(255),
    hindi_name VARCHAR(255),
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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for auto-updating updated_at on products
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger for auto-updating updated_at on categories
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 6. Initial Standard Taxonomy (Categories & Units Lookup - Safe Insert)
INSERT INTO public.categories (name, marathi_name, hindi_name, description) VALUES
('Milk', 'दूध', 'दूध', 'Fresh Raw Buffalo Milk, Cow Milk, and Pasteurized Pouches'),
('Curd & Chaas', 'दही व ताक', 'दही व छाछ', 'Fresh Desi Dahi, Packaged Curd, Spiced Chaas and Lassi'),
('Paneer & Butter', 'पनीर व लोणी', 'पनीर व मक्खन', 'Fresh Malai Paneer, Table White Butter, and Butter Bricks'),
('Ghee', 'शुद्ध तूप', 'शुद्ध घी', 'Pure Desi Cow Ghee, Buffalo Danedaar Ghee jars & tins'),
('Sweets/Mithai', 'मिठाई व पेढे', 'मिठाई व मावा', 'Fresh Shuddh Khoya/Mawa, Kaju Katli, Gulab Jamun, Pedha'),
('Bakery & Extras', 'बेकरी व इतर', 'बेकरी व अन्य', 'Fresh Milk Bread, Pav, Farm Fresh Eggs, and packaging extras')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.units (name, short_code) VALUES
('Litre', 'Litre'),
('Kilogram', 'Kg'),
('Packet (500ml)', 'Packet (500ml)'),
('Packet (1L)', 'Packet (1L)'),
('Piece', 'Piece'),
('Gram', 'Gram')
ON CONFLICT (name) DO NOTHING;

