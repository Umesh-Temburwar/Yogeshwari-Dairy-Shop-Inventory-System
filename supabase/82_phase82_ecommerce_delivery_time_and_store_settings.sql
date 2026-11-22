-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP & E-COMMERCE INTEGRATION
-- PHASE 82: E-COMMERCE CONFIGURATION & REALTIME DELIVERY ETA MANAGEMENT
-- File: supabase/82_phase82_ecommerce_delivery_time_and_store_settings.sql
-- ============================================================================
-- PURPOSE:
-- 1. Adds `ecommerce_delivery_time` column to public.profiles for instant
--    realtime delivery promise management from the Inventory / Admin system.
-- 2. Creates `public.store_settings` table for generic JSONB store configuration.
-- 3. Enables Supabase Realtime publication on store settings.
-- 4. Guarantees backwards compatibility: stores delivery ETA in profiles
--    so both existing WebSocket listeners and REST APIs sync in < 100ms.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ADD ecommerce_delivery_time COLUMN TO public.profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS ecommerce_delivery_time VARCHAR(100) DEFAULT '15-25 mins';

COMMENT ON COLUMN public.profiles.ecommerce_delivery_time IS 
    'Customer-facing e-commerce delivery promise (e.g. 10-15 mins, 15-25 mins, 20-30 mins). Synchronized in realtime.';

-- Update Owner profile with initial default delivery ETA if currently NULL
UPDATE public.profiles 
SET ecommerce_delivery_time = '15-25 mins'
WHERE role = 'Owner' AND (ecommerce_delivery_time IS NULL OR ecommerce_delivery_time = '');

-- ----------------------------------------------------------------------------
-- 2. CREATE public.store_settings TABLE (KEY-VALUE JSONB)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default e-commerce configuration
INSERT INTO public.store_settings (key, value)
VALUES (
    'ecommerce_config',
    jsonb_build_object(
        'is_open', true,
        'delivery_time', '15-25 mins',
        'message', 'Store is open for farm-fresh dairy deliveries in Ambajogai',
        'reopen_time', '6:00 AM'
    )
)
ON CONFLICT (key) DO UPDATE 
SET value = jsonb_set(
    public.store_settings.value, 
    '{delivery_time}', 
    to_jsonb(COALESCE(public.store_settings.value->>'delivery_time', '15-25 mins'))
),
updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Everyone (public / anonymous / customers / staff) can READ store settings
DROP POLICY IF EXISTS "Allow public read on store_settings" ON public.store_settings;
CREATE POLICY "Allow public read on store_settings"
    ON public.store_settings
    FOR SELECT
    USING (true);

-- Authenticated Dairy Staff can INSERT / UPDATE store settings
DROP POLICY IF EXISTS "Allow staff update on store_settings" ON public.store_settings;
CREATE POLICY "Allow staff update on store_settings"
    ON public.store_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('Owner', 'Admin', 'Manager', 'Cashier')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('Owner', 'Admin', 'Manager', 'Cashier')
        )
    );

-- ----------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'store_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Publication might already contain table or permission restricted
        NULL;
END $$;

COMMIT;
