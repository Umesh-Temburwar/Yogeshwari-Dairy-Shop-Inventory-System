-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - ROLLBACK SCRIPT
-- PHASE 68: ROLLBACK REAL-TIME SYNC, ATOMIC TRANSACTIONS & IDEMPOTENCY
-- File: supabase/68_phase68_realtime_sync_and_atomic_transactions_rollback.sql
-- ============================================================================

-- 1. Drop Stored Functions
DROP FUNCTION IF EXISTS public.fn_complete_sale_atomic(
    UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INT, NUMERIC, NUMERIC, NUMERIC,
    TEXT, NUMERIC, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT, INT, TEXT, JSONB
);

DROP FUNCTION IF EXISTS public.fn_get_inventory_counts();

-- 2. Drop idempotency unique index (leaves column intact safely)
DROP INDEX IF EXISTS public.uq_sales_idempotency_key;

-- 3. Notification
SELECT 'Phase 68 Rollback executed successfully.' AS status;
