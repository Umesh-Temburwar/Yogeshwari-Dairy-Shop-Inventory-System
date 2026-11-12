-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 15: SUPABASE AUTH & USER REGISTRATION AUTOMATION
-- File: supabase/15_phase15_supabase_auth_and_user_registration.sql
-- ============================================================================
-- Description:
-- Configures end-to-end Supabase Auth (Sign In & Sign Up) for Yogeshwari Dairy:
-- 1. Automates linking between Supabase auth.users and public.profiles.
-- 2. Creates the official Supabase trigger 'on_auth_user_created' on auth.users:
--    - Detects user email upon sign up.
--    - Automatically assigns role ('Owner' or 'Admin'), slot (1), and
--      target redirect view ('dashboard' or 'pos').
--    - Upserts public.profiles with the linked auth_user_id.
-- 3. Provides pre-confirmed seed users in auth.users for the 2 official accounts:
--    - 👑 Shop Owner: yogeshwaridairy9896@gmail.com (Password: password123)
--    - 🛡️ Admin 1: nilusakhare2003@gmail.com (Password: password123)
--    (Note: nikhilsakhare9896@gmail.com is permanently removed/deleted)
-- 4. Syncs any existing auth.users entries with public.profiles.
-- 5. Configures Row Level Security (RLS) for auth.uid() authentication.
--
-- Instructions:
-- 1. Ensure Phases 1-14 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Ensure pgcrypto extension is installed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure all profile columns and indices exist in public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS phone VARCHAR(25),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Admin',
ADD COLUMN IF NOT EXISTS admin_slot INTEGER,
ADD COLUMN IF NOT EXISTS default_redirect_view VARCHAR(50) DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Ensure id column always generates a valid UUID default
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id 
ON public.profiles (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
ON public.profiles (LOWER(TRIM(email)));

-- Drop foreign key constraint on 'id' referencing auth.users if present
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

-- Drop any legacy check constraints on profiles that restrict 'role'
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
          AND c.contype = 'c'
          AND a.attname IN ('role', 'admin_slot', 'default_redirect_view')
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Normalize role values on all existing rows before reapplying clean constraints
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

-- 3. Supabase Auth Trigger Function: Handle New Auth Users Automatically
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

    -- Override with metadata if provided explicitly during sign up
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

-- 4. Pre-seed / Pre-confirm the 3 Authorized Accounts directly in auth.users
-- This ensures the 3 users can log in immediately with Supabase Auth without waiting for email confirmation!
-- Default temporary password: password123 (Users can change this anytime from app or Supabase dashboard)
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
        -- Ensure confirmed
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
        -- Ensure confirmed
        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"full_name":"निलेश सखारे (प्रशासक १)","role":"Admin","admin_slot":1,"default_redirect_view":"pos"}'::jsonb
        WHERE email = 'nilusakhare2003@gmail.com';
    END IF;

    -- 3. Ensure Nikhil Sakhare / nikhilsakhare9896@gmail.com is permanently removed
    DELETE FROM auth.users WHERE email = 'nikhilsakhare9896@gmail.com';
    DELETE FROM public.profiles WHERE email = 'nikhilsakhare9896@gmail.com' OR full_name ILIKE '%nikhil%';
END $$;

-- 5. Link all auth.users IDs with public.profiles
UPDATE public.profiles p
SET auth_user_id = u.id
FROM auth.users u
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(u.email))
  AND (p.auth_user_id IS NULL OR p.auth_user_id != u.id);

-- 6. Configure RLS Policies for Profiles & Auth
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select profiles for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow select profiles for authenticated and anon" 
ON public.profiles 
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow update own profile" ON public.profiles;
CREATE POLICY "Allow update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING ((SELECT auth.uid()) = auth_user_id) 
WITH CHECK ((SELECT auth.uid()) = auth_user_id);

DROP POLICY IF EXISTS "Allow insert profiles for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow insert profiles for authenticated and anon" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 7. Diagnostic View: Inspect Auth Users & Profiles status
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

-- 8. Grant Permissions
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_auth_profiles_status TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

