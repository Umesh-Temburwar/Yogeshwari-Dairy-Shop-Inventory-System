-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 17: CONSOLIDATED MASTER UPDATE (ALL-IN-ONE FIX & REALTIME MULTI-DEVICE SYNC)
-- File: supabase/17_phase17_consolidated_master_update.sql
-- ============================================================================
-- Summary of Everything Included in this Master Update:
-- 1. EXTENSIONS: pgcrypto & uuid-ossp for secure hashing and RFC4122 UUIDs.
-- 2. SCHEMA FIXES:
--    - Ensures 'id' on public.profiles always defaults to gen_random_uuid() (fixes 23502 not-null error).
--    - Adds 'created_by_email' to sales and 'admin_email' to admin_audit_logs.
--    - Adds 'product_name' to batches and stock_movements with automatic backfill.
--    - Ensures master brands table exists with top dairy brands (Amul, Mother Dairy, etc.).
-- 3. PROFILES & ROLES (STRICTLY 1 OWNER & 1 ADMIN):
--    - 👑 Shop Owner: yogeshwaridairy9896@gmail.com -> Executive Dashboard ('dashboard')
--    - 🛡️ Admin: nilusakhare2003@gmail.com -> POS Counter 1 Billing ('pos')
--    - Permanently purges Nikhil Sakhare (Admin 2) from auth.users and profiles.
-- 4. SUPABASE AUTH INTEGRATION:
--    - Automates linking between auth.users and public.profiles via 'handle_new_user()' trigger.
--    - Pre-confirms credentials for both accounts (default temporary password: password123).
-- 5. ANALYTICAL VIEWS FOR SHOP OWNER:
--    - Safely drops views with CASCADE first to prevent PostgreSQL 42P16 column rename errors.
--    - v_owner_admin_inventory_changes, v_owner_admin_counter_sales_details,
--      v_owner_admin_counter_summary, and v_auth_profiles_status.
-- 6. MULTI-DEVICE CENTRAL REALTIME REPLICATION:
--    - Enables REPLICA IDENTITY FULL on all business tables.
--    - Registers all tables with the 'supabase_realtime' publication for live cross-device sync.
-- 7. SECURITY & RLS:
--    - Permissive counter policies so neither POS billing nor offline-first sync is blocked.
--    - Grants full API execution rights to anon and authenticated roles.
--
-- How to run:
-- 1. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- ============================================================================
-- STEP 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 2: SCHEMA EXTENSIONS & REPAIR CONSTRAINTS
-- ============================================================================

-- A. Extend sales table with operator email
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_sales_created_by_email ON public.sales (created_by_email);

-- B. Extend audit logs table with operator email
ALTER TABLE public.admin_audit_logs
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_admin_audit_email ON public.admin_audit_logs (admin_email);

-- C. Extend batches and stock_movements with product_name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'batches' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.batches ADD COLUMN product_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.stock_movements ADD COLUMN product_name VARCHAR(255);
    END IF;
END $$;

-- Backfill product_name in batches if missing
UPDATE public.batches b
SET product_name = p.name
FROM public.products p
WHERE b.product_id = p.id AND (b.product_name IS NULL OR b.product_name = '');

-- D. Ensure Brands Master Table exists
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.brands (name, description) VALUES
    ('Amul', 'The Taste of India - Butter, Cheese, Milk Pouches'),
    ('Mother Dairy', 'Milk and Fermented Dairy Products'),
    ('Gowardhan', 'Pure Cow Ghee and Dairy Products'),
    ('Warana', 'Cooperative Milk & Milk Sweets'),
    ('Yogeshwari In-House', 'Fresh Daily In-House Dairy Production')
ON CONFLICT (name) DO NOTHING;

-- E. Profiles table hardening (Fixes Error 23502: null value in column "id")
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_user_id UUID,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS phone VARCHAR(25),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Admin',
ADD COLUMN IF NOT EXISTS admin_slot INTEGER,
ADD COLUMN IF NOT EXISTS default_redirect_view VARCHAR(50) DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Guarantee that 'id' always receives a valid UUID
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(TRIM(email)));

-- Drop legacy foreign keys & check constraints that could reject valid updates
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_admin_slot_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_default_redirect_view_check;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.conrelid = 'public.profiles'::regclass
          AND (c.contype = 'f' AND a.attname = 'id')
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Normalize role values on all existing rows before reapplying clean constraint
UPDATE public.profiles
SET role = CASE 
    WHEN LOWER(TRIM(role)) = 'owner' THEN 'Owner'
    ELSE 'Admin'
END;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('Owner', 'Admin'));

-- Ensure unique constraint on email
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_key' AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- ============================================================================
-- STEP 3: STRICT 2-USER PROFILES SETUP (1 OWNER + 1 ADMIN)
-- ============================================================================

-- A. Permanently purge Nikhil Sakhare (Admin 2)
DELETE FROM public.profiles
WHERE email = 'nikhilsakhare9896@gmail.com'
   OR email = 'admin2@yogeshwaridairy.com'
   OR full_name ILIKE '%nikhil%';

-- B. Deactivate any legacy dummy placeholder emails
UPDATE public.profiles
SET is_active = FALSE
WHERE email NOT IN (
    'yogeshwaridairy9896@gmail.com',
    'nilusakhare2003@gmail.com'
);

-- C. Upsert 👑 Shop Owner (yogeshwaridairy9896@gmail.com)
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

-- D. Upsert 🛡️ Admin 1 (nilusakhare2003@gmail.com - Nilesh Sakhare)
INSERT INTO public.profiles (
    id, email, full_name, role, admin_slot, default_redirect_view, is_active
)
VALUES (
    '10000000-0000-0000-0000-000000000002'::UUID,
    'nilusakhare2003@gmail.com',
    'निलेश सखारे (प्रशासक - काऊंटर १ बिलिंग)',
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

-- ============================================================================
-- STEP 4: SUPABASE AUTH & AUTO USER REGISTRATION TRIGGER
-- ============================================================================

-- Function triggered on new Supabase Auth sign-ups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    detected_role VARCHAR(50);
    detected_slot INTEGER;
    detected_redirect VARCHAR(50);
    detected_name VARCHAR(150);
    clean_email TEXT := LOWER(TRIM(NEW.email));
BEGIN
    -- Determine role, slot, and redirect view based on email & metadata
    IF clean_email = 'nilusakhare2003@gmail.com' OR clean_email LIKE '%nilu%' OR clean_email LIKE '%admin%' THEN
        detected_role := 'Admin';
        detected_slot := 1;
        detected_redirect := 'pos';
        detected_name := COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            'निलेश सखारे (प्रशासक - काऊंटर १)'
        );
    ELSE
        detected_role := 'Owner';
        detected_slot := NULL;
        detected_redirect := 'dashboard';
        detected_name := COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            'योगेश्वरी डेअरी मालक (Shop Owner)'
        );
    END IF;

    -- Allow metadata overrides if provided
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        IF (NEW.raw_user_meta_data->>'role') IN ('Owner', 'Admin') THEN
            detected_role := NEW.raw_user_meta_data->>'role';
        END IF;
    END IF;

    IF NEW.raw_user_meta_data->>'admin_slot' IS NOT NULL THEN
        detected_slot := (NEW.raw_user_meta_data->>'admin_slot')::INTEGER;
    END IF;

    IF NEW.raw_user_meta_data->>'default_redirect_view' IS NOT NULL THEN
        detected_redirect := NEW.raw_user_meta_data->>'default_redirect_view';
    END IF;

    -- Upsert profile in public.profiles table
    INSERT INTO public.profiles (
        id,
        auth_user_id,
        email,
        full_name,
        role,
        admin_slot,
        default_redirect_view,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.id,
        clean_email,
        detected_name,
        detected_role,
        detected_slot,
        detected_redirect,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = EXCLUDED.role,
        admin_slot = EXCLUDED.admin_slot,
        default_redirect_view = EXCLUDED.default_redirect_view,
        is_active = TRUE,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if already exists on auth.users and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pre-seed and Pre-confirm both users in auth.users
DO $$
DECLARE
    owner_uid UUID := '10000000-0000-0000-0000-000000000001'::UUID;
    admin1_uid UUID := '10000000-0000-0000-0000-000000000002'::UUID;
    encrypted_pw TEXT := crypt('password123', gen_salt('bf', 10));
BEGIN
    -- 1. Owner: yogeshwaridairy9896@gmail.com
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'yogeshwaridairy9896@gmail.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role,
            created_at,
            updated_at
        ) VALUES (
            owner_uid,
            '00000000-0000-0000-0000-000000000000'::UUID,
            'yogeshwaridairy9896@gmail.com',
            encrypted_pw,
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"योगेश्वरी डेअरी मालक (Shop Owner)","role":"Owner","default_redirect_view":"dashboard"}'::jsonb,
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"full_name":"योगेश्वरी डेअरी मालक (Shop Owner)","role":"Owner","default_redirect_view":"dashboard"}'::jsonb
        WHERE email = 'yogeshwaridairy9896@gmail.com';
    END IF;

    -- 2. Admin 1: nilusakhare2003@gmail.com
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'nilusakhare2003@gmail.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role,
            created_at,
            updated_at
        ) VALUES (
            admin1_uid,
            '00000000-0000-0000-0000-000000000000'::UUID,
            'nilusakhare2003@gmail.com',
            encrypted_pw,
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"निलेश सखारे (प्रशासक १)","role":"Admin","admin_slot":1,"default_redirect_view":"pos"}'::jsonb,
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"full_name":"निलेश सखारे (प्रशासक १)","role":"Admin","admin_slot":1,"default_redirect_view":"pos"}'::jsonb
        WHERE email = 'nilusakhare2003@gmail.com';
    END IF;

    -- 3. Delete Nikhil Sakhare from auth.users if exists
    DELETE FROM auth.users WHERE email = 'nikhilsakhare9896@gmail.com';
END $$;

-- Link auth_user_id on public.profiles
UPDATE public.profiles p
SET auth_user_id = u.id
FROM auth.users u
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(u.email))
  AND (p.auth_user_id IS NULL OR p.auth_user_id != u.id);

-- ============================================================================
-- STEP 5: AUTOMATED TRIGGER FOR SALE AUDIT LOGGING
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_auto_log_sale_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admin_audit_logs (
        admin_email,
        admin_name,
        admin_role,
        admin_slot,
        counter_name,
        action_type,
        title,
        details,
        amount,
        reference_id,
        reference_table,
        created_at
    ) VALUES (
        NEW.created_by_email,
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

DROP TRIGGER IF EXISTS trg_sale_audit_log ON public.sales;
CREATE TRIGGER trg_sale_audit_log
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_auto_log_sale_activity();

-- ============================================================================
-- STEP 6: RECREATE ANALYTICAL VIEWS FOR SHOP OWNER (NO 42P16 ERRORS)
-- ============================================================================
DROP VIEW IF EXISTS public.v_owner_admin_inventory_changes CASCADE;
DROP VIEW IF EXISTS public.v_owner_admin_counter_sales_details CASCADE;
DROP VIEW IF EXISTS public.v_owner_admin_counter_summary CASCADE;
DROP VIEW IF EXISTS public.v_owner_recent_admin_activities CASCADE;
DROP VIEW IF EXISTS public.v_auth_profiles_status CASCADE;

-- A. Dedicated Inventory Changes Ledger View
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

-- B. Dedicated Counter Sales Breakdown View
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

-- C. Dedicated Summary View per Operator
CREATE OR REPLACE VIEW public.v_owner_admin_counter_summary AS
SELECT 
    COALESCE(s.admin_slot, 0) AS admin_slot,
    COALESCE(s.created_by_email, '') AS admin_email,
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
GROUP BY s.admin_slot, s.created_by_email, s.created_by_name, s.counter_name
ORDER BY total_sales_amount DESC;

-- D. Auth Status View
CREATE OR REPLACE VIEW public.v_auth_profiles_status AS
SELECT 
    p.id AS profile_id,
    p.email,
    p.full_name,
    p.role,
    p.admin_slot,
    p.default_redirect_view,
    p.is_active,
    p.auth_user_id,
    CASE 
        WHEN u.id IS NOT NULL THEN 'SYNCED_WITH_SUPABASE_AUTH' 
        ELSE 'LOCAL_OR_PENDING_AUTH_CREATION' 
    END AS auth_status,
    u.email_confirmed_at,
    u.created_at AS auth_created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.auth_user_id = u.id OR LOWER(TRIM(p.email)) = LOWER(TRIM(u.email))
ORDER BY p.role, p.admin_slot;

-- E. Helper Function: Role & Target View by Email
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

    -- Dynamic fallback
    IF clean_email = 'nilusakhare2003@gmail.com' OR clean_email LIKE '%nilu%' OR clean_email LIKE '%admin%' THEN
        RETURN QUERY SELECT 'Admin'::VARCHAR, 1, 'pos'::VARCHAR, 'निलेश सखारे (प्रशासक - काऊंटर १ बिलिंग)'::VARCHAR;
    ELSE
        RETURN QUERY SELECT 'Owner'::VARCHAR, NULL::INTEGER, 'dashboard'::VARCHAR, 'योगेश्वरी डेअरी मालक (Shop Owner)'::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- STEP 7: MULTI-DEVICE CENTRAL REALTIME PUBLICATION & REPLICATION
-- ============================================================================

-- A. Enable Full Replica Identity so complete row states are sent on all updates
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
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- B. Register all core tables with the Supabase Realtime Publication
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
        'suppliers', 'categories', 'units', 'brands', 'admin_audit_logs', 'profiles'
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

-- ============================================================================
-- STEP 8: ROW LEVEL SECURITY (RLS) & GRANTS
-- ============================================================================

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- Ensure permissive counter RLS policies exist on all tables
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'categories', 'units', 'brands', 'products', 'suppliers', 'purchases', 
        'batches', 'stock_movements', 'damage_records', 'udhar_customers', 
        'udhar_transactions', 'sales', 'sale_items', 'sale_batch_allocations', 
        'product_returns', 'supplier_returns', 'expenses', 'admin_audit_logs', 'profiles'
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

-- Verification query
SELECT 
    'Phase 17 Consolidated Master Update executed successfully!' AS status,
    NOW() AS completed_at;

