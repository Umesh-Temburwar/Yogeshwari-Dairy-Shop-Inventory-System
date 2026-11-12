-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 12: USER PROFILES, 1 OWNER & 2 ADMINS ENFORCEMENT & REDIRECTS
-- File: supabase/12_phase12_owner_admin_roles_and_auth.sql
-- ============================================================================
-- Description:
-- Establishes role-based access control strictly restricted to 1 Owner and 2 Admins:
-- 1. 👑 Owner: Full store owner with executive dashboard redirection ('dashboard')
-- 2. 🛡️ Admin 1: Counter billing operator with POS counter redirection ('pos')
-- 3. 🛡️ Admin 2: Inventory manager with stock/batches redirection ('inventory')
-- Includes database unique constraints to strictly limit to 1 Owner and 2 Admins.
--
-- Instructions:
-- 1. Ensure Phases 1-11 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. User Profiles Table (Linked with Supabase Auth users or standalone ERP counter auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- Linked to auth.users(id) when Supabase Auth is used
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25),
    role VARCHAR(50) NOT NULL CHECK (role IN ('Owner', 'Admin')),
    admin_slot INTEGER CHECK (admin_slot IN (1, 2) OR admin_slot IS NULL),
    default_redirect_view VARCHAR(50) NOT NULL DEFAULT 'dashboard' CHECK (default_redirect_view IN (
        'dashboard', 'pos', 'inventory', 'sales', 'reorder', 'expiry', 
        'purchases', 'damages', 'udhar', 'expenses', 'analytics', 'returns'
    )),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for auto-updating updated_at on profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 2. Business Rule Constraints (Strict Enforcement: Only 1 Owner & Exactly 2 Admins)
-- Enforce: Maximum 1 active Owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_owner 
ON public.profiles (role) 
WHERE role = 'Owner' AND is_active = TRUE;

-- Enforce: Exactly Admin Slot 1 and Admin Slot 2 (No 3rd admin allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_slots 
ON public.profiles (role, admin_slot) 
WHERE role = 'Admin' AND is_active = TRUE;

-- 3. Pre-seed the 1 Owner and 2 Authorized Admins
INSERT INTO public.profiles (id, email, full_name, role, admin_slot, default_redirect_view, is_active)
VALUES
    -- 1. Shop Owner (दुकान मालक) -> Redirects to Dashboard
    (
        '10000000-0000-0000-0000-000000000001'::UUID,
        'owner@yogeshwaridairy.com',
        'Yogeshwari Dairy Owner',
        'Owner',
        NULL,
        'dashboard',
        TRUE
    ),
    -- 2. Store Administrator 1 (प्रशासक १ - काऊंटर बिलिंग) -> Redirects to POS
    (
        '10000000-0000-0000-0000-000000000002'::UUID,
        'admin1@yogeshwaridairy.com',
        'Store Administrator 1 (Counter Billing)',
        'Admin',
        1,
        'pos',
        TRUE
    ),
    -- 3. Store Administrator 2 (प्रशासक २ - इन्व्हेंटरी व साठा) -> Redirects to Inventory
    (
        '10000000-0000-0000-0000-000000000003'::UUID,
        'admin2@yogeshwaridairy.com',
        'Store Administrator 2 (Inventory & Stock)',
        'Admin',
        2,
        'inventory',
        TRUE
    )
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    admin_slot = EXCLUDED.admin_slot,
    default_redirect_view = EXCLUDED.default_redirect_view,
    is_active = TRUE,
    updated_at = NOW();

-- Also ensure fallback email 'admin@yogeshwaridairy.com' maps to Admin 1 if present
INSERT INTO public.profiles (email, full_name, role, admin_slot, default_redirect_view, is_active)
VALUES (
    'admin@yogeshwaridairy.com',
    'Store Administrator 1 (Counter Billing)',
    'Admin',
    1,
    'pos',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- 4. Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow counter application to read and verify authorized profiles
DROP POLICY IF EXISTS "Allow counter access for profiles" ON public.profiles;
CREATE POLICY "Allow counter access for profiles" 
ON public.profiles 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 5. Helper Function: Get Role and Target Redirect View for user by email
CREATE OR REPLACE FUNCTION public.get_user_role_and_redirect(p_email TEXT)
RETURNS TABLE (
    user_role VARCHAR,
    admin_slot INTEGER,
    redirect_view VARCHAR,
    display_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.role::VARCHAR AS user_role,
        p.admin_slot,
        p.default_redirect_view::VARCHAR AS redirect_view,
        p.full_name::VARCHAR AS display_name
    FROM public.profiles p
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
      AND p.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant execution to API roles
GRANT EXECUTE ON FUNCTION public.get_user_role_and_redirect(TEXT) TO anon, authenticated;

