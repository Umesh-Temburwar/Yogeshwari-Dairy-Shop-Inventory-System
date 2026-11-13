-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 52: UPDATE PASSWORDS & ENFORCE PROFILE ACCESS PERMISSIONS
-- File: supabase/52_phase52_update_passwords_and_profile_permissions.sql
-- ============================================================================
-- Description:
-- 1. Updates password for Shop Owner (yogeshwaridairy9896@gmail.com) -> 04092026@Nikhil
-- 2. Updates password for Admin 1 (nilusakhare2003@gmail.com) -> 04092026@Nilesh
-- 3. Enforces profile permissions:
--    - Admin (nilusakhare2003@gmail.com) is strictly locked to 'Admin' role (Counter 1 POS Billing).
--    - Shop Owner (yogeshwaridairy9896@gmail.com) has full dual-access (Owner & Admin).
-- 4. Ensures zero constraint violations (phone = NULL, token fields = '', UUID cast for identities).
--
-- Instructions:
-- 1. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- STEP 1: SATISFY users_phone_key (RESET EMPTY STRINGS TO NULL)
-- ----------------------------------------------------------------------------
UPDATE auth.users
SET phone = NULL
WHERE phone = '';

-- ----------------------------------------------------------------------------
-- STEP 2: CLEAN TOKEN FIELDS IN auth.users
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
-- STEP 3: UPDATE AUTH PASSWORDS FOR OWNER & ADMIN
-- Owner: 04092026@Nikhil
-- Admin: 04092026@Nilesh
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    owner_uid UUID := '10000000-0000-0000-0000-000000000001'::UUID;
    admin1_uid UUID := '10000000-0000-0000-0000-000000000002'::UUID;
    owner_pw TEXT := crypt('04092026@Nikhil', gen_salt('bf', 10));
    admin_pw TEXT := crypt('04092026@Nilesh', gen_salt('bf', 10));
BEGIN
    -- 1. 👑 Shop Owner: yogeshwaridairy9896@gmail.com -> 04092026@Nikhil
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
            owner_pw,
            NOW(),
            '', '', '', '', NULL, '', '', '', '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"निखिल सखारे (दुकान मालक)","role":"Owner","can_switch_role":true,"default_redirect_view":"dashboard"}'::jsonb,
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET 
            encrypted_password = owner_pw,
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
            raw_user_meta_data = '{"full_name":"निखिल सखारे (दुकान मालक)","role":"Owner","can_switch_role":true,"default_redirect_view":"dashboard"}'::jsonb,
            aud = 'authenticated',
            role = 'authenticated',
            updated_at = NOW()
        WHERE LOWER(TRIM(email)) = 'yogeshwaridairy9896@gmail.com';
    END IF;

    -- 2. 🛡️ Admin 1: nilusakhare2003@gmail.com -> 04092026@Nilesh
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
            admin_pw,
            NOW(),
            '', '', '', '', NULL, '', '', '', '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"निलेश सखारे (प्रशासक १)","role":"Admin","admin_slot":1,"can_switch_role":false,"default_redirect_view":"pos"}'::jsonb,
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET 
            encrypted_password = admin_pw,
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
            raw_user_meta_data = '{"full_name":"निलेश सखारे (प्रशासक १)","role":"Admin","admin_slot":1,"can_switch_role":false,"default_redirect_view":"pos"}'::jsonb,
            aud = 'authenticated',
            role = 'authenticated',
            updated_at = NOW()
        WHERE LOWER(TRIM(email)) = 'nilusakhare2003@gmail.com';
    END IF;

END $$;

-- ----------------------------------------------------------------------------
-- STEP 4: ENSURE auth.identities ENTRIES (UUID TYPE SAFE)
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
            u.id::text,
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
        NULL;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 5: SYNC public.profiles WITH EXACT ROLES & DESCRIPTIONS
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (
    id, email, full_name, role, admin_slot, default_redirect_view, is_active
)
VALUES 
    (
        '10000000-0000-0000-0000-000000000001'::UUID,
        'yogeshwaridairy9896@gmail.com',
        'निखिल सखारे (दुकान मालक)',
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
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(u.email));

-- ----------------------------------------------------------------------------
-- STEP 6: BULLETPROOF handle_new_user() TRIGGER
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
    IF clean_email = 'nilusakhare2003@gmail.com' OR clean_email LIKE '%nilu%' THEN
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
            'निखिल सखारे (दुकान मालक)'
        );
    END IF;

    -- Override with metadata if provided explicitly
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
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
