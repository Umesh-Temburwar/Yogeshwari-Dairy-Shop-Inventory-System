-- ============================================================================
-- YOGESHWARI DAIRY SHOP INVENTORY & ERP SYSTEM - PHASE 19 MIGRATION
-- File: 19_phase19_rename_owner_nikhil_and_admin_nilesh.sql
-- Description: Standardize user display names across Supabase:
--   1. 👑 Shop Owner: "Nikhil Sakhare" (yogeshwaridairy9896@gmail.com)
--   2. 🛡️ Admin: "Nilesh Sakhare" (nilusakhare2003@gmail.com)
--
-- FIX for ERROR 23505 (idx_single_active_owner):
--   - Temporarily drops idx_single_active_owner and idx_admin_slots
--   - Purges any legacy/duplicate profiles that are not the 2 official emails
--   - Updates exact rows by email directly
--   - Recreates unique constraints cleanly
--
-- Execution: Run directly in Supabase Dashboard -> SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: CLEANLY UPDATE PUBLIC.PROFILES (FIX DUPLICATE OWNER CONSTRAINT)
-- ============================================================================

-- 1A. Temporarily drop unique partial indexes to prevent duplicate key during update
DROP INDEX IF EXISTS public.idx_single_active_owner;
DROP INDEX IF EXISTS public.idx_admin_slots;

-- 1B. Purge any legacy/dummy accounts so only the 2 official emails remain active
DELETE FROM public.profiles 
WHERE LOWER(TRIM(email)) NOT IN ('yogeshwaridairy9896@gmail.com', 'nilusakhare2003@gmail.com');

-- 1C. Update Owner Profile (Nikhil Sakhare) strictly by email
UPDATE public.profiles
SET 
    full_name = 'Nikhil Sakhare',
    role = 'Owner',
    admin_slot = NULL,
    default_redirect_view = 'dashboard',
    is_active = TRUE,
    updated_at = NOW()
WHERE LOWER(TRIM(email)) = 'yogeshwaridairy9896@gmail.com';

-- 1D. Update Admin 1 Profile (Nilesh Sakhare) strictly by email
UPDATE public.profiles
SET 
    full_name = 'Nilesh Sakhare',
    role = 'Admin',
    admin_slot = 1,
    default_redirect_view = 'pos',
    is_active = TRUE,
    updated_at = NOW()
WHERE LOWER(TRIM(email)) = 'nilusakhare2003@gmail.com';

-- 1E. If either official row is missing, insert it cleanly
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(TRIM(email)) = 'yogeshwaridairy9896@gmail.com') THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, admin_slot, default_redirect_view, is_active, updated_at
        ) VALUES (
            '10000000-0000-0000-0000-000000000001'::UUID,
            'yogeshwaridairy9896@gmail.com',
            'Nikhil Sakhare',
            'Owner',
            NULL,
            'dashboard',
            TRUE,
            NOW()
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(TRIM(email)) = 'nilusakhare2003@gmail.com') THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, admin_slot, default_redirect_view, is_active, updated_at
        ) VALUES (
            '10000000-0000-0000-0000-000000000002'::UUID,
            'nilusakhare2003@gmail.com',
            'Nilesh Sakhare',
            'Admin',
            1,
            'pos',
            TRUE,
            NOW()
        );
    END IF;
END $$;

-- 1F. Re-create the strict business rule constraints cleanly
CREATE UNIQUE INDEX idx_single_active_owner 
ON public.profiles (role) 
WHERE role = 'Owner' AND is_active = TRUE;

CREATE UNIQUE INDEX idx_admin_slots 
ON public.profiles (role, admin_slot) 
WHERE role = 'Admin' AND is_active = TRUE;

-- ============================================================================
-- STEP 2: UPDATE HISTORICAL ROWS IN PUBLIC.ADMIN_AUDIT_LOGS
-- ============================================================================

-- 2A. Update all Owner Audit Logs to "Nikhil Sakhare"
UPDATE public.admin_audit_logs
SET admin_name = 'Nikhil Sakhare'
WHERE 
    admin_role = 'Owner'
    OR LOWER(TRIM(COALESCE(admin_email, ''))) = 'yogeshwaridairy9896@gmail.com'
    OR admin_name ILIKE '%Yogeshwari%'
    OR admin_name ILIKE '%योगेश्वरी%'
    OR admin_name ILIKE '%Owner%'
    OR admin_name ILIKE '%मालक%'
    OR admin_name ILIKE '%Nikhil%'
    OR admin_name ILIKE '%निखिल%';

-- 2B. Update all Admin Audit Logs to "Nilesh Sakhare" (removes "(Admin)" and "(प्रशासक)")
UPDATE public.admin_audit_logs
SET admin_name = 'Nilesh Sakhare'
WHERE 
    (admin_role = 'Admin' AND (admin_slot = 1 OR admin_slot IS NULL))
    OR LOWER(TRIM(COALESCE(admin_email, ''))) = 'nilusakhare2003@gmail.com'
    OR admin_name ILIKE '%Nilesh%'
    OR admin_name ILIKE '%निलेश%';

-- ============================================================================
-- STEP 3: UPDATE HISTORICAL ROWS IN PUBLIC.SALES
-- ============================================================================

-- 3A. Update Owner Sales to "Nikhil Sakhare"
UPDATE public.sales
SET created_by_name = 'Nikhil Sakhare'
WHERE 
    created_by_role = 'Owner'
    OR LOWER(TRIM(COALESCE(created_by_email, ''))) = 'yogeshwaridairy9896@gmail.com'
    OR created_by_name ILIKE '%Yogeshwari%'
    OR created_by_name ILIKE '%योगेश्वरी%'
    OR created_by_name ILIKE '%Owner%'
    OR created_by_name ILIKE '%मालक%'
    OR created_by_name ILIKE '%Nikhil%'
    OR created_by_name ILIKE '%निखिल%';

-- 3B. Update Admin Sales to "Nilesh Sakhare"
UPDATE public.sales
SET created_by_name = 'Nilesh Sakhare'
WHERE 
    created_by_role = 'Admin'
    OR LOWER(TRIM(COALESCE(created_by_email, ''))) = 'nilusakhare2003@gmail.com'
    OR created_by_name ILIKE '%Nilesh%'
    OR created_by_name ILIKE '%निलेश%';

-- ============================================================================
-- STEP 4: UPDATE AUTH.USERS METADATA
-- ============================================================================

DO $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{full_name}',
        '"Nikhil Sakhare"'
    )
    WHERE LOWER(TRIM(email)) = 'yogeshwaridairy9896@gmail.com';

    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{full_name}',
        '"Nilesh Sakhare"'
    )
    WHERE LOWER(TRIM(email)) = 'nilusakhare2003@gmail.com';
EXCEPTION WHEN OTHERS THEN
    -- Suppress if auth schema update is restricted in specific contexts
    NULL;
END $$;

-- ============================================================================
-- STEP 5: UPDATE AUTH TRIGGER FUNCTION (handle_new_user)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    detected_role VARCHAR(50);
    detected_slot INTEGER;
    detected_redirect VARCHAR(50);
    detected_name VARCHAR(150);
    clean_email TEXT := LOWER(TRIM(NEW.email));
BEGIN
    IF clean_email = 'nilusakhare2003@gmail.com' OR clean_email LIKE '%nilu%' OR clean_email LIKE '%admin%' THEN
        detected_role := 'Admin';
        detected_slot := 1;
        detected_redirect := 'pos';
        detected_name := COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            'Nilesh Sakhare'
        );
    ELSE
        detected_role := 'Owner';
        detected_slot := NULL;
        detected_redirect := 'dashboard';
        detected_name := COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            'Nikhil Sakhare'
        );
    END IF;

    -- Clean legacy labels if present in metadata
    IF detected_name ILIKE '%Yogeshwari%' OR detected_name ILIKE '%योगेश्वरी%' OR detected_name ILIKE '%(Shop Owner)%' THEN
        detected_name := 'Nikhil Sakhare';
    ELSIF detected_name ILIKE '%(Admin)%' OR detected_name ILIKE '%(प्रशासक)%' THEN
        detected_name := 'Nilesh Sakhare';
    END IF;

    -- Allow metadata overrides if valid
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
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        admin_slot = EXCLUDED.admin_slot,
        default_redirect_view = EXCLUDED.default_redirect_view,
        is_active = TRUE,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: UPDATE SALE AUDIT TRIGGER (trg_fn_auto_log_sale_activity)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_fn_auto_log_sale_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_clean_name TEXT;
    v_counter TEXT;
BEGIN
    -- Determine normalized clean name without (Admin) or Yogeshwari Dairy Owner
    IF NEW.created_by_role = 'Owner' 
       OR LOWER(TRIM(COALESCE(NEW.created_by_email, ''))) = 'yogeshwaridairy9896@gmail.com' THEN
        v_clean_name := 'Nikhil Sakhare';
        v_counter := COALESCE(NEW.counter_name, 'मुख्य मालक काऊंटर');
    ELSE
        v_clean_name := 'Nilesh Sakhare';
        v_counter := COALESCE(NEW.counter_name, 'काऊंटर १ - मुख्य बिलिंग');
    END IF;

    -- If caller provided custom non-legacy name, keep it
    IF NEW.created_by_name IS NOT NULL 
       AND NEW.created_by_name NOT ILIKE '%Yogeshwari%'
       AND NEW.created_by_name NOT ILIKE '%योगेश्वरी%'
       AND NEW.created_by_name NOT ILIKE '%(Admin)%'
       AND NEW.created_by_name NOT ILIKE '%(प्रशासक)%'
       AND NEW.created_by_name NOT ILIKE '%Shop Owner%' THEN
        v_clean_name := NEW.created_by_name;
    END IF;

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
        v_clean_name,
        COALESCE(NEW.created_by_role, 'Admin'),
        NEW.admin_slot,
        v_counter,
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
-- STEP 7: UPDATE get_user_role_and_redirect RPC FUNCTION
-- ============================================================================

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

    -- Dynamic fallback based on recognized emails
    IF clean_email = 'nilusakhare2003@gmail.com' OR clean_email LIKE '%nilu%' OR clean_email LIKE '%admin%' THEN
        RETURN QUERY SELECT 'Admin'::VARCHAR, 1, 'pos'::VARCHAR, 'Nilesh Sakhare'::VARCHAR;
    ELSE
        RETURN QUERY SELECT 'Owner'::VARCHAR, NULL::INTEGER, 'dashboard'::VARCHAR, 'Nikhil Sakhare'::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.get_user_role_and_redirect(TEXT) TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 8: RECREATE ANALYTICAL VIEWS CLEANLY WITH CASCADE DROP
-- ============================================================================

DROP VIEW IF EXISTS public.v_owner_admin_counter_summary CASCADE;
DROP VIEW IF EXISTS public.v_owner_admin_counter_sales_details CASCADE;

CREATE OR REPLACE VIEW public.v_owner_admin_counter_sales_details AS
SELECT 
    s.id,
    s.invoice_no,
    s.sale_date,
    s.created_at,
    s.created_by_email,
    s.created_by_role,
    s.admin_slot,
    COALESCE(s.created_by_name, CASE WHEN s.created_by_role = 'Owner' THEN 'Nikhil Sakhare' ELSE 'Nilesh Sakhare' END) AS created_by_name,
    COALESCE(s.counter_name, CASE WHEN s.created_by_role = 'Owner' THEN 'मुख्य मालक काऊंटर' ELSE 'काऊंटर १ - मुख्य बिलिंग' END) AS counter_name,
    s.customer_name,
    s.customer_phone,
    s.payment_mode,
    s.total_amount,
    s.discount,
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

CREATE OR REPLACE VIEW public.v_owner_admin_counter_summary AS
SELECT 
    COALESCE(s.admin_slot, 0) AS admin_slot,
    COALESCE(s.created_by_email, '') AS admin_email,
    COALESCE(s.created_by_name, CASE WHEN s.created_by_role = 'Owner' THEN 'Nikhil Sakhare' ELSE 'Nilesh Sakhare' END) AS admin_name,
    COALESCE(s.counter_name, CASE WHEN s.created_by_role = 'Owner' THEN 'मुख्य मालक काऊंटर' ELSE 'काऊंटर १' END) AS counter_name,
    COUNT(s.id) AS total_bills_count,
    COALESCE(SUM(s.net_amount), 0) AS total_sales_amount,
    COALESCE(SUM(s.cash_amount), 0) AS total_cash_collected,
    COALESCE(SUM(s.online_amount), 0) AS total_online_collected,
    COALESCE(SUM(s.udhar_amount), 0) AS total_udhar_given,
    MIN(s.created_at) AS first_sale_at,
    MAX(s.created_at) AS latest_sale_at
FROM public.sales s
WHERE s.status = 'COMPLETED'
GROUP BY s.admin_slot, s.created_by_email, s.created_by_name, s.counter_name, s.created_by_role
ORDER BY total_sales_amount DESC;

-- Grant permissions on updated views
GRANT SELECT ON TABLE public.v_owner_admin_counter_sales_details TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.v_owner_admin_counter_summary TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT id, email, full_name, role, admin_slot FROM public.profiles ORDER BY role;
SELECT admin_name, admin_role, admin_slot, count(*) FROM public.admin_audit_logs GROUP BY admin_name, admin_role, admin_slot;
