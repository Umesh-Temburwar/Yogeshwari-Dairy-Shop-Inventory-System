-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 16: CENTRALIZED DATA SYNCHRONIZATION & REALTIME BROADCAST
-- File: supabase/16_phase16_centralized_sync_and_realtime.sql
-- ============================================================================
-- Description:
-- 1. Adds 'product_name' to batches and stock_movements for direct fast indexing.
-- 2. Ensures brands and master tables exist and are accessible.
-- 3. Enables REPLICA IDENTITY FULL on all core tables for complete Realtime payloads.
-- 4. Registers all tables with the 'supabase_realtime' publication for instant
--    cross-device synchronization (Device 1 <-> Device 2).
-- 5. Grants full permissions to 'anon' and 'authenticated' roles.
--
-- Instructions:
-- 1. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Add product_name column to batches if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'batches' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.batches ADD COLUMN product_name VARCHAR(255);
    END IF;
END $$;

-- Backfill product_name in batches from products catalog
UPDATE public.batches b
SET product_name = p.name
FROM public.products p
WHERE b.product_id = p.id AND (b.product_name IS NULL OR b.product_name = '');

-- 2. Add product_name to stock_movements if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.stock_movements ADD COLUMN product_name VARCHAR(255);
    END IF;
END $$;

-- 3. Ensure Brands Master Table exists
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default dairy brands if empty
INSERT INTO public.brands (name, description) VALUES
    ('Amul', 'The Taste of India - Butter, Cheese, Milk Pouches'),
    ('Mother Dairy', 'Milk and Fermented Dairy Products'),
    ('Gowardhan', 'Pure Cow Ghee and Dairy Products'),
    ('Warana', 'Cooperative Milk & Milk Sweets'),
    ('Yogeshwari In-House', 'Fresh Daily In-House Dairy Production')
ON CONFLICT (name) DO NOTHING;

-- 4. Enable REPLICA IDENTITY FULL on all core tables for Realtime change payloads
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.batches REPLICA IDENTITY FULL;
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.sale_items REPLICA IDENTITY FULL;
ALTER TABLE public.purchases REPLICA IDENTITY FULL;
ALTER TABLE public.damage_records REPLICA IDENTITY FULL;
ALTER TABLE public.udhar_customers REPLICA IDENTITY FULL;
ALTER TABLE public.udhar_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.product_returns REPLICA IDENTITY FULL;
ALTER TABLE public.supplier_returns REPLICA IDENTITY FULL;
ALTER TABLE public.suppliers REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.units REPLICA IDENTITY FULL;
ALTER TABLE public.brands REPLICA IDENTITY FULL;
ALTER TABLE public.admin_audit_logs REPLICA IDENTITY FULL;

-- 5. Grant API permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- 6. Safely Register All Core Tables into 'supabase_realtime' Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
        'products', 'batches', 'sales', 'sale_items', 'purchases', 
        'damage_records', 'udhar_customers', 'udhar_transactions', 
        'expenses', 'product_returns', 'supplier_returns',
        'suppliers', 'categories', 'units', 'brands', 'admin_audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        END IF;
    END LOOP;
END $$;

-- 7. Ensure Counter Access RLS policies exist on all tables
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'categories', 'units', 'brands', 'products', 'suppliers', 'purchases', 
        'batches', 'stock_movements', 'damage_records', 'udhar_customers', 
        'udhar_transactions', 'sales', 'sale_items', 'sale_batch_allocations', 
        'product_returns', 'supplier_returns', 'expenses', 'admin_audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow counter access for %I" ON public.%I;', tbl, tbl);
        EXECUTE format('
            CREATE POLICY "Allow counter access for %I" 
            ON public.%I 
            FOR ALL 
            TO anon, authenticated 
            USING (true) 
            WITH CHECK (true);
        ', tbl, tbl);
    END LOOP;
END $$;

-- Verification notification
SELECT 'Phase 16 Centralized Sync & Realtime Setup Completed Successfully!' AS status;

