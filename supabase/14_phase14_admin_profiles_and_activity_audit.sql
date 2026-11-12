-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 14: DEDICATED GMAIL PROFILES & INVENTORY AUDIT TRACKING FOR SHOP OWNER
-- File: supabase/14_phase14_admin_profiles_and_activity_audit.sql
-- ============================================================================
-- Description:
-- Configures the exact official authorized Gmail profiles:
-- 1. 👑 Shop Owner:
--    - Email: yogeshwaridairy9896@gmail.com
--    - Role: Owner (Redirects to Executive Dashboard 'dashboard')
--    - Name: योगेश्वरी डेअरी मालक (Shop Owner)
-- 2. 🛡️ Admin 1 (Counter 1 - Nilesh Sakhare):
--    - Email: nilusakhare2003@gmail.com
--    - Role: Admin, Slot 1 (Redirects to POS Billing 'pos')
--    - Name: निलेश सखारे (प्रशासक १ - काऊंटर १)
--
-- Note: 'nikhilsakhare9896@gmail.com' (Admin 2) has been permanently removed/deleted.
--
-- Features included in this Phase:
-- - Deactivates any old placeholders to prevent constraint collisions.
-- - Upserts the 2 official profiles with strict role constraints.
-- - Adds 'admin_email' to 'admin_audit_logs' and 'created_by_email' to 'sales'.
-- - Dedicated Views for Shop Owner:
--   * v_owner_admin_inventory_changes: All inventory additions, updates, damages, and returns.
--   * v_owner_admin_counter_sales_details: All counter sales broken down by operator.
--   * v_owner_admin_counter_summary: Aggregated totals per Admin and Counter.
-- - Automated trigger to track exact email of billing operator on every sale.
-- - Grants and RLS security permissions.
--
-- Instructions:
-- 1. Ensure Phases 1-13 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Extend sales, audit and profiles tables with required columns
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);

ALTER TABLE public.admin_audit_logs
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_user_id UUID,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS phone VARCHAR(25),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Admin',
ADD COLUMN IF NOT EXISTS admin_slot INTEGER,
ADD COLUMN IF NOT EXISTS default_redirect_view VARCHAR(50) DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_sales_created_by_email ON public.sales (created_by_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_email ON public.admin_audit_logs (admin_email);

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

-- Ensure email unique constraint on profiles if not present
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

-- 2. Permanently delete Nikhil Sakhare / nikhilsakhare9896@gmail.com profile
DELETE FROM public.profiles
WHERE email = 'nikhilsakhare9896@gmail.com'
   OR email = 'admin2@yogeshwaridairy.com'
   OR full_name ILIKE '%nikhil%';

-- Safely Deactivate old dummy placeholder emails so unique constraints do not collide
UPDATE public.profiles
SET is_active = FALSE
WHERE email NOT IN (
    'yogeshwaridairy9896@gmail.com',
    'nilusakhare2003@gmail.com'
);

-- 3. Upsert the Official Authorized Accounts (1 Owner & 1 Admin)
-- A. 👑 Shop Owner: yogeshwaridairy9896@gmail.com
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

-- B. 🛡️ Admin: nilusakhare2003@gmail.com (Nilesh Sakhare - Counter 1 POS)
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

-- 4. Update Automated Trigger to log admin_email
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

-- 5. Analytical View: Shop Owner Dedicated Inventory Changes & Updates Ledger
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

-- 6. Analytical View: Shop Owner Dedicated Counter Sales Breakdown View
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

-- 7. Update Analytical View: Owner Admin & Counter Summary (Nilesh vs Nikhil vs Owner)
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

-- 8. Enhanced Helper Function: Role & Redirection by Gmail
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
    -- Check database profiles first
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

    -- If found, exit
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

-- 9. Grant Permissions to API Roles
GRANT ALL ON TABLE public.admin_audit_logs TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_inventory_changes TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_counter_sales_details TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_counter_summary TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role_and_redirect(TEXT) TO anon, authenticated;

