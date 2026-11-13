-- ============================================================
-- Phase 26: Invoice Ledger Edit & Delete Operations Support
-- Yogeshwari Dairy Shop Inventory System
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Ensure Full Row Level Security permissions for UPDATE &
--    DELETE on public.sales and public.sale_items
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Policy for sales: allow SELECT, INSERT, UPDATE, DELETE for counter terminals
DROP POLICY IF EXISTS "Allow counter full operations for sales" ON public.sales;
CREATE POLICY "Allow counter full operations for sales"
ON public.sales
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Policy for sale_items: allow SELECT, INSERT, UPDATE, DELETE for counter terminals
DROP POLICY IF EXISTS "Allow counter full operations for sale_items" ON public.sale_items;
CREATE POLICY "Allow counter full operations for sale_items"
ON public.sale_items
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON TABLE public.sales TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.sale_items TO postgres, anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. Foreign Key Cascade Verification
--    Deleting a sale in public.sales automatically cleans up
--    all associated line items in public.sale_items
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_fkey;

ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 3. Extend admin_audit_logs to track SALE_UPDATED activities
-- ─────────────────────────────────────────────────────────────
-- Ensure action_type check constraint includes SALE_UPDATED
ALTER TABLE public.admin_audit_logs 
  DROP CONSTRAINT IF EXISTS chk_admin_audit_action_type;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT chk_admin_audit_action_type
  CHECK (action_type IN (
    'SALE_CREATED',
    'SALE_UPDATED',
    'SALE_DELETED',
    'PRODUCT_ADDED',
    'PRODUCT_UPDATED',
    'STOCK_INWARD',
    'EXPENSE_ADDED',
    'DAMAGE_RECORDED',
    'CUSTOMER_RETURN',
    'CUSTOMER_FULL_RETURN',
    'CUSTOMER_PARTIAL_RETURN',
    'SUPPLIER_RETURN',
    'UDHAR_PAYMENT',
    'UDHAR_GIVEN'
  ));

-- ─────────────────────────────────────────────────────────────
-- 4. Automated Trigger on Sale Update to Log Audit Record
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_auto_log_sale_update_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_clean_name TEXT;
    v_counter TEXT;
BEGIN
    IF NEW.created_by_role = 'Owner' OR LOWER(TRIM(COALESCE(NEW.created_by_email, ''))) = 'yogeshwaridairy9896@gmail.com' THEN
        v_clean_name := 'Nikhil Sakhare';
        v_counter := COALESCE(NEW.counter_name, 'मुख्य मालक काऊंटर');
    ELSE
        v_clean_name := 'Nilesh Sakhare';
        v_counter := COALESCE(NEW.counter_name, 'काऊंटर १ - मुख्य बिलिंग');
    END IF;

    IF NEW.created_by_name IS NOT NULL 
       AND NEW.created_by_name NOT ILIKE '%Yogeshwari%'
       AND NEW.created_by_name NOT ILIKE '%योगेश्वरी%'
       AND NEW.created_by_name NOT ILIKE '%(Admin)%' THEN
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
        'SALE_UPDATED',
        'पावती सुधारणा: ' || NEW.invoice_no,
        'ग्राहक: ' || COALESCE(NEW.customer_name, 'थेट ग्राहक') || ' | पेमेंट: ' || NEW.payment_mode || ' | निव्वळ रक्कम: ₹' || NEW.net_amount,
        NEW.net_amount,
        NEW.invoice_no,
        'sales',
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS trg_sale_update_audit_log ON public.sales;
CREATE TRIGGER trg_sale_update_audit_log
AFTER UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_auto_log_sale_update_activity();

-- ─────────────────────────────────────────────────────────────
-- 5. Realtime publication ensures both update & delete events broadcast
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.sale_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'sales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'sale_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- Done ✓
-- ─────────────────────────────────────────────────────────────
-- What this migration does:
--   1. Ensures counter users can UPDATE and DELETE sales and sale_items
--   2. Ensures ON DELETE CASCADE cleans up sale_items when sale is deleted
--   3. Adds SALE_UPDATED to admin_audit_logs constraint
--   4. Creates automated trigger for audit logging on sale edit
--   5. Ensures Realtime publication delivers delete & update broadcasts
-- ─────────────────────────────────────────────────────────────
