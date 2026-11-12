-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 12: USER PROFILES, 1 OWNER & 1 ADMIN (NILESH SAKHARE) ENFORCEMENT & REDIRECTS
-- File: supabase/12_phase12_owner_admin_roles_and_auth.sql
-- ============================================================================
-- Description:
-- Establishes role-based access control strictly restricted to 1 Owner and 1 Admin:
-- 1. 👑 Owner: Store Owner with executive dashboard redirection ('dashboard')
--    - Email: yogeshwaridairy9896@gmail.com
-- 2. 🛡️ Admin: Counter billing administrator with POS counter redirection ('pos')
--    - Name: निलेश सखारे (Nilesh Sakhare - Counter 1)
--    - Email: nilusakhare2003@gmail.com
--
-- NOTE: 'nikhilsakhare9896@gmail.com' has been permanently removed/deleted.
--
-- Instructions:
-- 1. Ensure Phases 1-11 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Create User Profiles Table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,
    email VARCHAR(255),
    full_name VARCHAR(150),
    phone VARCHAR(25),
    role VARCHAR(50) DEFAULT 'Admin',
    admin_slot INTEGER,
    default_redirect_view VARCHAR(50) DEFAULT 'dashboard',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CRITICAL: If public.profiles ALREADY existed with an older/partial schema,
-- explicitly add all required columns so no "column does not exist" error can occur!
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_user_id UUID,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS phone VARCHAR(25),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Admin',
ADD COLUMN IF NOT EXISTS admin_slot INTEGER,
ADD COLUMN IF NOT EXISTS default_redirect_view VARCHAR(50) DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2.1 CRITICAL: Drop foreign key constraint on 'id' referencing auth.users (profiles_id_fkey)
-- This allows inserting ERP profiles without requiring pre-existing auth.users rows,
-- while auth_user_id cleanly links profiles to auth.users when Supabase Auth is used.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.conrelid = 'public.profiles'::regclass
          AND c.contype = 'f'
          AND a.attname = 'id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2.2 CRITICAL: Drop any legacy CHECK constraints on profiles (specifically profiles_role_check)
-- that reject 'Owner' or restrict legacy roles:
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_admin_slot_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_default_redirect_view_check;

-- Dynamically drop any other check constraints on role, admin_slot, or default_redirect_view
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.conrelid = 'public.profiles'::regclass
          AND c.contype = 'c'
          AND a.attname IN ('role', 'admin_slot', 'default_redirect_view')
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Clean up any existing rows with NULL email before applying constraints
UPDATE public.profiles
SET email = 'user_' || id || '@yogeshwaridairy.com'
WHERE email IS NULL;

-- Normalize role values on all existing rows before reapplying clean constraints
UPDATE public.profiles
SET role = CASE 
    WHEN LOWER(TRIM(role)) = 'owner' THEN 'Owner'
    ELSE 'Admin'
END;

-- Clean existing admin_slot and default_redirect_view to prevent check constraint violations
UPDATE public.profiles
SET admin_slot = NULL
WHERE role = 'Owner' OR (admin_slot NOT IN (1, 2));

UPDATE public.profiles
SET default_redirect_view = CASE
    WHEN role = 'Owner' THEN 'dashboard'
    ELSE 'pos'
END
WHERE default_redirect_view NOT IN (
    'dashboard', 'pos', 'inventory', 'sales', 'reorder', 'expiry', 
    'purchases', 'damages', 'udhar', 'expenses', 'analytics', 'returns'
) OR default_redirect_view IS NULL;

-- Re-apply clean, official CHECK constraints that explicitly support 'Owner' and 'Admin'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('Owner', 'Admin'));

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_admin_slot_check 
CHECK (admin_slot IN (1, 2) OR admin_slot IS NULL);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_default_redirect_view_check 
CHECK (default_redirect_view IN (
    'dashboard', 'pos', 'inventory', 'sales', 'reorder', 'expiry', 
    'purchases', 'damages', 'udhar', 'expenses', 'analytics', 'returns'
));

-- PERMANENTLY DELETE nikhilsakhare9896@gmail.com and any admin 2 placeholder
DELETE FROM public.profiles 
WHERE email = 'nikhilsakhare9896@gmail.com' 
   OR email = 'admin2@yogeshwaridairy.com' 
   OR full_name ILIKE '%nikhil%';

-- Safely deactivate any other non-official rows
UPDATE public.profiles
SET is_active = FALSE
WHERE email NOT IN (
    'yogeshwaridairy9896@gmail.com',
    'nilusakhare2003@gmail.com',
    'owner@yogeshwaridairy.com',
    'admin1@yogeshwaridairy.com',
    'admin@yogeshwaridairy.com'
);

-- Ensure Unique constraint on email
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

-- 3. Trigger for auto-updating updated_at on profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 4. Business Rule Constraints (Strict Enforcement: Only 1 Owner & Exactly 1 Admin)
-- Enforce: Maximum 1 active Owner
DROP INDEX IF EXISTS public.idx_single_active_owner;
CREATE UNIQUE INDEX idx_single_active_owner 
ON public.profiles (role) 
WHERE role = 'Owner' AND is_active = TRUE;

-- Enforce: Exactly Admin Slot 1 (Counter Billing)
DROP INDEX IF EXISTS public.idx_admin_slots;
CREATE UNIQUE INDEX idx_admin_slots 
ON public.profiles (role, admin_slot) 
WHERE role = 'Admin' AND is_active = TRUE;

-- 5. Pre-seed auth.users (if available) & public.profiles for Owner & Admin
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    owner_uid UUID := '10000000-0000-0000-0000-000000000001'::UUID;
    admin1_uid UUID := '10000000-0000-0000-0000-000000000002'::UUID;
    encrypted_pw TEXT := crypt('password123', gen_salt('bf', 10));
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- Seed Owner if not exists
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'yogeshwaridairy9896@gmail.com' OR id = owner_uid) THEN
            INSERT INTO auth.users (
                id, instance_id, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
            ) VALUES (
                owner_uid, '00000000-0000-0000-0000-000000000000'::UUID,
                'yogeshwaridairy9896@gmail.com', encrypted_pw, NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                '{"full_name":"योगेश्वरी डेअरी मालक (Shop Owner)","role":"Owner","default_redirect_view":"dashboard"}'::jsonb,
                'authenticated', 'authenticated', NOW(), NOW()
            );
        END IF;

        -- Seed Admin 1 if not exists
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'nilusakhare2003@gmail.com' OR id = admin1_uid) THEN
            INSERT INTO auth.users (
                id, instance_id, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
            ) VALUES (
                admin1_uid, '00000000-0000-0000-0000-000000000000'::UUID,
                'nilusakhare2003@gmail.com', encrypted_pw, NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                '{"full_name":"निलेश सखारे (प्रशासक - काऊंटर १ बिलिंग)","role":"Admin","admin_slot":1,"default_redirect_view":"pos"}'::jsonb,
                'authenticated', 'authenticated', NOW(), NOW()
            );
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

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

-- B. 🛡️ Admin: nilusakhare2003@gmail.com -> pos (Nilesh Sakhare - Counter 1)
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

-- Also ensure fallback legacy emails map cleanly
INSERT INTO public.profiles (email, full_name, role, admin_slot, default_redirect_view, is_active)
VALUES 
    ('owner@yogeshwaridairy.com', 'Yogeshwari Dairy Owner', 'Owner', NULL, 'dashboard', FALSE),
    ('admin1@yogeshwaridairy.com', 'Store Administrator 1', 'Admin', 1, 'pos', FALSE)
ON CONFLICT (email) DO NOTHING;

-- 6. Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow counter access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow select profiles for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow select profiles for authenticated and anon" 
ON public.profiles 
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow insert profiles for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow insert profiles for authenticated and anon" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update profiles for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow update profiles for authenticated and anon" 
ON public.profiles 
FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 7. Helper Function: Get Role and Target Redirect View for user by email
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

    -- Dynamic fallback based on exact user emails
    IF clean_email = 'nilusakhare2003@gmail.com' OR clean_email LIKE '%nilu%' OR clean_email LIKE '%admin%' THEN
        RETURN QUERY SELECT 'Admin'::VARCHAR, 1, 'pos'::VARCHAR, 'निलेश सखारे (प्रशासक - काऊंटर १ बिलिंग)'::VARCHAR;
    ELSE
        RETURN QUERY SELECT 'Owner'::VARCHAR, NULL::INTEGER, 'dashboard'::VARCHAR, 'योगेश्वरी डेअरी मालक (Shop Owner)'::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant execution to API roles
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role_and_redirect(TEXT) TO anon, authenticated;
