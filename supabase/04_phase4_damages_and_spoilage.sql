-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 4: DAMAGES, SPOILAGE & LOSS TRACKING
-- File: supabase/04_phase4_damages_and_spoilage.sql
-- ============================================================================
-- Description:
-- Sets up dairy spoilage management, recording curdled milk, leaked pouches,
-- and expired stock loss to maintain accurate P&L accounting.
--
-- Instructions:
-- 1. Ensure Phases 1-3 have been executed.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run".
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.damage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    batch_no VARCHAR(100),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    estimated_loss_amount NUMERIC(12, 2) NOT NULL CHECK (estimated_loss_amount >= 0),
    reason VARCHAR(100) NOT NULL, -- 'Doodh Fat Gya (Curdled)', 'Theli Phat Gayi (Leaked)', 'Expiry Date Over', 'Handling Spoilage', 'Other'
    damage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
