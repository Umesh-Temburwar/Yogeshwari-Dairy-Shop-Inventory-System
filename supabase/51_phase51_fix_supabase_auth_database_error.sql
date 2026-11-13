-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 51: FIX "Database error finding user" & REPAIR SUPABASE AUTH
-- File: supabase/51_phase51_fix_supabase_auth_database_error.sql
-- ============================================================================
-- Description:
-- Fixes the Supabase GoTrue Auth error: "Database error finding user" (HTTP 500)
-- and eliminates all constraint / type casting errors:
-- 1. Resets phone = NULL for empty strings (users_phone_key is UNIQUE; multiple NULLs allowed, but '' violates unique constraint).
-- 2. Cleans NULL string token columns in auth.users (GoTrue sqlx fails when tokens are NULL).
-- 3. Hardens the public.handle_new_user() trigger with EXCEPTION handling so it
--    NEVER aborts a user registration transaction.
-- 4. Pre-confirms and ensures valid bcrypt hashes for the 2 authorized shop users:
--    - 👑 Shop Owner: yogeshwaridairy9896@gmail.com (Password: password123)
--    - 🛡️ Admin 1: nilusakhare2003@gmail.com (Password: password123)
-- 5. Populates missing records in auth.identities using UUID for id & user_id.
-- 6. Synchronizes public.profiles with valid auth_user_id links.
--
-- Instructions:
-- 1. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- STEP 1: RESET PHONE TO NULL FOR EMPTY STRINGS TO SATISFY users_phone_key
-- auth.users has a UNIQUE constraint on phone (users_phone_key).
-- In PostgreSQL, multiple NULLs are allowed in UNIQUE constraints, but '' creates duplicate key errors!
-- ----------------------------------------------------------------------------
UPDATE auth.users
SET phone = NULL
WHERE phone = '';

-- ----------------------------------------------------------------------------
-- STEP 2: FIX NULL STRING TOKEN COLUMNS IN auth.users
-- GoTrue uses Go's sqlx driver which crashes with "converting NULL to string is unsupported"
-- when token fields are NULL instead of empty strings ('').
-- NOTE: phone is intentionally EXCLUDED because it must remain NULL when not set.
-- ----------------------------------------------------------------------------
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR email_change_token_current IS NULL
   OR reauthentication_token IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 3: BULLETPROOF handle_new_user() TRIGGER FUNCTION
-- Sets search_path to include public, extensions, pg_catalog.
-- Adds EXCEPTION WHEN OTHERS block so trigger NEVER crashes an auth transaction.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    detected_role VARCHAR(50);
    detected_slot INTEGER;
    detected_redirect VARCHAR(50);
    detected_name VARCHAR(150);
    clean_email TEXT := LOWER(TRIM(COALESCE(NEW.email, '')));
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
EXCEPTION
    WHEN OTHERS THEN
        -- CRITICAL: Never fail the Auth signup transaction if profile insert errors
        RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- STEP 4: REPAIR & PRE-CONFIRM AUTHORIZED OWNER & ADMIN USERS
-- Ensure valid password (password123), confirmed email, phone=NULL, and correct metadata
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    owner_uid UUID := '10000000-0000-0000-0000-000000000001'::UUID;
    admin1_uid UUID := '10000000-0000-0000-0000-000000000002'::UUID;
    encrypted_pw TEXT := crypt('password123', gen_salt('bf', 10));
BEGIN
    -- 1. Owner: yogeshwaridairy9896@gmail.com
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(TRIM(email)) = 'yogeshwaridairy9896@gmail.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            phone,
            phone_change,
            phone_change_token,
            email_change_token_current,
            reauthentication_token,
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
            '', '', '', '', NULL, '', '', '', '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"योगेश्वरी डेअरी मालक (Shop Owner)","role":"Owner","default_redirect_view":"dashboard"}'::jsonb,
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET 
            encrypted_password = encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            confirmation_token = '',
            recovery_token = '',
            email_change_token_new = '',
            email_change = '',
            phone = NULL,
            phone_change = '',
            phone_change_token = '',
            email_change_token_current = '',
            reauthentication_token = '',
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"full_name":"योगेश्वरी डेअरी मालक (Shop Owner)","role":"Owner","default_redirect_view":"dashboard"}'::jsonb,
            aud = 'authenticated',
            role = 'authenticated',
            updated_at = NOW()
        WHERE LOWER(TRIM(email)) = 'yogeshwaridairy9896@gmail.com';
    END IF;

    -- 2. Admin 1: nilusakhare2003@gmail.com
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(TRIM(email)) = 'nilusakhare2003@gmail.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            phone,
            phone_change,
            phone_change_token,
            email_change_token_current,
            reauthentication_token,
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
            '', '', '', '', NULL, '', '', '', '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"निलेश सखारे (प्रशासक १)","role":"Admin","admin_slot":1,"default_redirect_view":"pos"}'::jsonb,
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET 
            encrypted_password = encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            confirmation_token = '',
            recovery_token = '',
            email_change_token_new = '',
            email_change = '',
            phone = NULL,
            phone_change = '',
            phone_change_token = '',
            email_change_token_current = '',
            reauthentication_token = '',
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = '{"full_name":"निलेश सखारे (प्रशासक १)","role":"Admin","admin_slot":1,"default_redirect_view":"pos"}'::jsonb,
            aud = 'authenticated',
            role = 'authenticated',
            updated_at = NOW()
        WHERE LOWER(TRIM(email)) = 'nilusakhare2003@gmail.com';
    END IF;

END $$;

-- ----------------------------------------------------------------------------
-- STEP 5: ENSURE auth.identities HAS MATCHING EMAIL IDENTITIES
-- Column id and user_id are UUID types; provider_id is text.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        SELECT 
            u.id, -- UUID
            u.id, -- UUID
            jsonb_build_object('sub', u.id::text, 'email', LOWER(TRIM(u.email))),
            'email',
            u.id::text, -- text
            NOW(),
            NOW(),
            NOW()
        FROM auth.users u
        WHERE LOWER(TRIM(u.email)) IN ('yogeshwaridairy9896@gmail.com', 'nilusakhare2003@gmail.com')
          AND NOT EXISTS (
              SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
          )
        ON CONFLICT DO NOTHING;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'auth.identities sync notice: %', SQLERRM;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 6: SYNC public.profiles TABLE WITH VALID auth_user_id
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (
    id, email, full_name, role, admin_slot, default_redirect_view, is_active
)
VALUES 
    (
        '10000000-0000-0000-0000-000000000001'::UUID,
        'yogeshwaridairy9896@gmail.com',
        'योगेश्वरी डेअरी मालक (Shop Owner)',
        'Owner',
        NULL,
        'dashboard',
        TRUE
    ),
    (
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
    is_active = TRUE;

-- Link auth_user_id
UPDATE public.profiles p
SET auth_user_id = u.id
FROM auth.users u
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(u.email))
  AND (p.auth_user_id IS NULL OR p.auth_user_id != u.id);

-- Ensure RLS allows reads and updates
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select profiles for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow select profiles for authenticated and anon" 
ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert profiles for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow insert profiles for authenticated and anon" 
ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update profiles for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow update profiles for authenticated and anon" 
ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
