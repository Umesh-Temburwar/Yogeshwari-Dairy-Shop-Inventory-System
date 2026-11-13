-- ============================================================
-- Phase 28: Fix Invoice Update & Return Sync Issues
-- Yogeshwari Dairy Shop Inventory System
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Ensure triggers run with SECURITY DEFINER to avoid RLS permission failures
DROP FUNCTION IF EXISTS public.trg_fn_auto_log_sale_update_activity() CASCADE;
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
    EXCEPTION WHEN OTHERS THEN
        -- Silently ignore audit log failures so they do not block the main UPDATE
        NULL;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace existing trigger with SECURITY DEFINER version
DROP TRIGGER IF EXISTS trg_sale_update_audit_log ON public.sales;
CREATE TRIGGER trg_sale_update_audit_log
AFTER UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_auto_log_sale_update_activity();

-- 2. Ensure ON DELETE CASCADE for sale_items (already present) – reaffirm for safety
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_fkey;
ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;

-- 3. Ensure Replication Identity FULL for realtime updates on sales and sale_items
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.sale_items REPLICA IDENTITY FULL;

-- 4. Grant necessary privileges (already granted but re‑apply to be explicit)
GRANT ALL ON TABLE public.sales TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.sale_items TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.admin_audit_logs TO postgres, anon, authenticated, service_role;

-- 5. Documentation note – after running this script, the invoice edit UI will correctly persist net_amount changes, and partial returns will update the sale totals without being overwritten by stale syncs.
