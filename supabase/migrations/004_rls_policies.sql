-- ============================================================================
-- MIGRATION 004: ROW LEVEL SECURITY (RLS) POLICIES
-- Description: Enforces table-level and role-based data security
-- ============================================================================

-- Helper function to fetch the current user's role from public.profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
DECLARE
    u_role user_role;
BEGIN
    SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
    RETURN u_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile or admins/owners can view all" ON public.profiles;
CREATE POLICY "Users can view their own profile or admins/owners can view all"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id OR public.current_user_role() IN ('admin', 'owner')
);

DROP POLICY IF EXISTS "Admins and Owners can update profiles" ON public.profiles;
CREATE POLICY "Admins and Owners can update profiles"
ON public.profiles FOR UPDATE
USING (
    public.current_user_role() IN ('admin', 'owner')
);

-- 3. Categories, Brands, Units Policies
-- Read: All authenticated staff can view catalog
DROP POLICY IF EXISTS "Staff can view categories" ON public.categories;
CREATE POLICY "Staff can view categories"
ON public.categories FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins, Owners, Managers can mutate categories" ON public.categories;
CREATE POLICY "Admins, Owners, Managers can mutate categories"
ON public.categories FOR ALL
TO authenticated
USING (public.current_user_role() IN ('admin', 'owner', 'manager'));

DROP POLICY IF EXISTS "Staff can view brands" ON public.brands;
CREATE POLICY "Staff can view brands"
ON public.brands FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins, Owners, Managers can mutate brands" ON public.brands;
CREATE POLICY "Admins, Owners, Managers can mutate brands"
ON public.brands FOR ALL
TO authenticated
USING (public.current_user_role() IN ('admin', 'owner', 'manager'));

DROP POLICY IF EXISTS "Staff can view units" ON public.units;
CREATE POLICY "Staff can view units"
ON public.units FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins, Owners, Managers can mutate units" ON public.units;
CREATE POLICY "Admins, Owners, Managers can mutate units"
ON public.units FOR ALL
TO authenticated
USING (public.current_user_role() IN ('admin', 'owner', 'manager'));

-- 4. Suppliers Policies
DROP POLICY IF EXISTS "Staff can view suppliers" ON public.suppliers;
CREATE POLICY "Staff can view suppliers"
ON public.suppliers FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins, Owners, Managers can mutate suppliers" ON public.suppliers;
CREATE POLICY "Admins, Owners, Managers can mutate suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (public.current_user_role() IN ('admin', 'owner', 'manager'));

-- 5. Products Policies
DROP POLICY IF EXISTS "Staff can view products" ON public.products;
CREATE POLICY "Staff can view products"
ON public.products FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins, Owners, Managers can mutate products" ON public.products;
CREATE POLICY "Admins, Owners, Managers can mutate products"
ON public.products FOR ALL
TO authenticated
USING (public.current_user_role() IN ('admin', 'owner', 'manager'));

-- 6. Batches Policies
DROP POLICY IF EXISTS "Staff can view batches" ON public.batches;
CREATE POLICY "Staff can view batches"
ON public.batches FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins, Owners, Managers can mutate batches" ON public.batches;
CREATE POLICY "Admins, Owners, Managers can mutate batches"
ON public.batches FOR ALL
TO authenticated
USING (public.current_user_role() IN ('admin', 'owner', 'manager'));

-- 7. Stock Transactions Policies
DROP POLICY IF EXISTS "Staff can view stock transactions" ON public.stock_transactions;
CREATE POLICY "Staff can view stock transactions"
ON public.stock_transactions FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can insert stock transactions" ON public.stock_transactions;
CREATE POLICY "Staff can insert stock transactions"
ON public.stock_transactions FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('admin', 'owner', 'manager', 'cashier'));

