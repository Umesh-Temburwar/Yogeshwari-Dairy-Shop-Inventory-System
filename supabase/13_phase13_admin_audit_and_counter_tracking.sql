-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 13: ADMIN AUDIT TRAIL, COUNTER TRACKING & OWNER CONTROL CENTER
-- File: supabase/13_phase13_admin_audit_and_counter_tracking.sql
-- ============================================================================
-- Description:
-- Empowers the Shop Owner ('Owner' role) to track both Admin profiles:
-- 1. 🛡️ Admin 1 (काऊंटर १ - मुख्य बिलिंग)
-- 2. 🛡️ Admin 2 (काऊंटर २ - दुग्ध व साठा)
--
-- Features included in this Phase:
-- - Extends 'sales' table with counter tracking (admin_slot, created_by_name, counter_name).
-- - Creates 'admin_audit_logs' table for real-time tracking of:
--   * Who sold what from which counter
--   * What products / batches / stock were updated
--   * Expenses added, damages recorded, udhar collected, customer & supplier returns
-- - Automated trigger to immediately log every completed sale into audit ledger.
-- - Real-time Analytical Views for the Owner:
--   * v_owner_admin_counter_summary (Sales, collections, bill counts per Admin/Counter)
--   * v_owner_recent_admin_activities (Audit log feed sorted by timestamp)
-- - Performance indexes and RLS security permissions.
--
-- Instructions:
-- 1. Ensure Phases 1-12 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Extend Sales Table with Admin & Counter Tracking Columns
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150) DEFAULT 'Admin 1',
ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) DEFAULT 'Admin',
ADD COLUMN IF NOT EXISTS admin_slot INTEGER CHECK (admin_slot IN (1, 2) OR admin_slot IS NULL),
ADD COLUMN IF NOT EXISTS counter_name VARCHAR(100) DEFAULT 'काऊंटर १ - मुख्य बिलिंग';

-- 2. Create Admin Audit Trail Table (दुकान मालक तपासणी वही)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_name VARCHAR(150) NOT NULL,
    admin_role VARCHAR(50) NOT NULL DEFAULT 'Admin' CHECK (admin_role IN ('Owner', 'Admin')),
    admin_slot INTEGER CHECK (admin_slot IN (1, 2) OR admin_slot IS NULL),
    counter_name VARCHAR(100) NOT NULL DEFAULT 'काऊंटर १ - मुख्य बिलिंग',
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'SALE_CREATED',
        'PRODUCT_ADDED',
        'PRODUCT_UPDATED',
        'STOCK_INWARD',
        'EXPENSE_ADDED',
        'DAMAGE_RECORDED',
        'CUSTOMER_RETURN',
        'SUPPLIER_RETURN',
        'UDHAR_PAYMENT',
        'UDHAR_GIVEN'
    )),
    title TEXT NOT NULL,
    details TEXT,
    amount NUMERIC(12, 2) DEFAULT 0.00,
    reference_id VARCHAR(100),
    reference_table VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-Performance B-Tree Indexes for Audit and Counter Queries
CREATE INDEX IF NOT EXISTS idx_sales_admin_slot ON public.sales (admin_slot);
CREATE INDEX IF NOT EXISTS idx_sales_counter_name ON public.sales (counter_name);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON public.sales (created_by_name);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_slot ON public.admin_audit_logs (admin_slot);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_ref ON public.admin_audit_logs (reference_table, reference_id);

-- 4. Automated Trigger: Record Sale in Audit Log whenever an invoice is created
CREATE OR REPLACE FUNCTION public.trg_fn_auto_log_sale_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admin_audit_logs (
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

DROP TRIGGER IF EXISTS trg_sales_auto_audit_log ON public.sales;
CREATE TRIGGER trg_sales_auto_audit_log
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_auto_log_sale_activity();

-- 5. Analytical View: Owner Admin & Counter Breakdown Summary
CREATE OR REPLACE VIEW public.v_owner_admin_counter_summary AS
SELECT 
    COALESCE(s.admin_slot, 0) AS admin_slot,
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
GROUP BY s.admin_slot, s.created_by_name, s.counter_name
ORDER BY total_sales_amount DESC;

-- 6. Analytical View: Owner Realtime Activity Feed
CREATE OR REPLACE VIEW public.v_owner_recent_admin_activities AS
SELECT 
    log.id,
    log.created_at,
    log.admin_name,
    log.admin_role,
    log.admin_slot,
    log.counter_name,
    log.action_type,
    log.title,
    log.details,
    log.amount,
    log.reference_id,
    log.reference_table
FROM public.admin_audit_logs log
ORDER BY log.created_at DESC;

-- 7. RLS Security Policies for admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select admin_audit_logs for all" ON public.admin_audit_logs;
CREATE POLICY "Allow select admin_audit_logs for all" 
ON public.admin_audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert admin_audit_logs for all" ON public.admin_audit_logs;
CREATE POLICY "Allow insert admin_audit_logs for all" 
ON public.admin_audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update admin_audit_logs for all" ON public.admin_audit_logs;
CREATE POLICY "Allow update admin_audit_logs for all" 
ON public.admin_audit_logs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete admin_audit_logs for all" ON public.admin_audit_logs;
CREATE POLICY "Allow delete admin_audit_logs for all" 
ON public.admin_audit_logs FOR DELETE USING (true);

-- 8. Grant Execution and API Access
GRANT ALL ON TABLE public.admin_audit_logs TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_admin_counter_summary TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.v_owner_recent_admin_activities TO postgres, anon, authenticated, service_role;
