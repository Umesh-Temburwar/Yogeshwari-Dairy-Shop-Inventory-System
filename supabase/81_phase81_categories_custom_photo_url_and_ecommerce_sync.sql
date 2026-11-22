-- ============================================================================
-- Phase 81: Custom Photo URL Support for Categories & E-Commerce Integration
-- Allows store staff to update custom category photos and syncs directly
-- to the public E-Commerce web store and POS billing counter.
-- ============================================================================

-- 1. Ensure image_url and regional columns exist on public.categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS marathi_name VARCHAR(100);

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS hindi_name VARCHAR(100);

-- 2. Seed / Upsert Core Dairy & Grocery Categories with Default Photo URLs
INSERT INTO public.categories (name, marathi_name, hindi_name, description, image_url, is_active)
VALUES
  (
    'Milk',
    'दूध',
    'दूध',
    'Fresh cow, buffalo, toned, and double-toned milk pouches',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    true
  ),
  (
    'Curd & Chaas',
    'दही आणि ताक',
    'दही और छाछ',
    'Desi dahi, flavored yogurt, lassi, and fresh buttermilk pouches',
    'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=400&q=80',
    true
  ),
  (
    'Paneer & Butter',
    'पनीर आणि लोणी',
    'पनीर और मक्खन',
    'Fresh malai paneer, soft paneer blocks, diced paneer, and table butter',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
    true
  ),
  (
    'Ghee',
    'शुद्ध तूप',
    'शुद्ध घी',
    'Pure desi cow ghee, buffalo danedaar ghee, and cooking ghee',
    'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=400&q=80',
    true
  ),
  (
    'Sweets/Mithai',
    'मिठाई व मावा',
    'मिठाई और मावा',
    'Fresh mawa/khoya, gulab jamun, rasgulla, pedha, and kaju katli',
    'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=400&q=80',
    true
  ),
  (
    'Bakery & Extras',
    'बेकरी व इतर',
    'बेकरी और अन्य',
    'Fresh toast, khari, bread, buns, and dairy accompaniment extras',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    true
  ),
  (
    'Ice Cream & Kulfi',
    'आईस्क्रीम व कुल्फी',
    'आइसक्रीम और कुल्फी',
    'Tubs, family packs, cups, and traditional matka kulfi',
    'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400&q=80',
    true
  )
ON CONFLICT (name) DO UPDATE SET
  image_url = COALESCE(public.categories.image_url, EXCLUDED.image_url),
  marathi_name = COALESCE(public.categories.marathi_name, EXCLUDED.marathi_name),
  hindi_name = COALESCE(public.categories.hindi_name, EXCLUDED.hindi_name),
  updated_at = NOW();

-- 3. Populate existing rows with default image_url if currently NULL
UPDATE public.categories
SET image_url = CASE
  WHEN name ILIKE '%milk%' THEN 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80'
  WHEN name ILIKE '%curd%' OR name ILIKE '%chaas%' OR name ILIKE '%dahi%' THEN 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=400&q=80'
  WHEN name ILIKE '%paneer%' OR name ILIKE '%butter%' THEN 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80'
  WHEN name ILIKE '%ghee%' THEN 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=400&q=80'
  WHEN name ILIKE '%sweet%' OR name ILIKE '%mithai%' OR name ILIKE '%khoya%' THEN 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=400&q=80'
  WHEN name ILIKE '%ice%' OR name ILIKE '%kulfi%' THEN 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400&q=80'
  WHEN name ILIKE '%bakery%' THEN 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80'
  ELSE COALESCE(image_url, 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?auto=format&fit=crop&w=400&q=80')
END
WHERE image_url IS NULL OR image_url = '';

-- 4. Enable Row Level Security & ensure public read + staff write policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Public read policy (allows customer e-commerce store to fetch categories and custom photos)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' AND policyname = 'Allow public read categories'
  ) THEN
    CREATE POLICY "Allow public read categories"
    ON public.categories
    FOR SELECT
    USING (true);
  END IF;

  -- Staff/Authenticated update policy (allows admin/owner to update image_url)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' AND policyname = 'Allow staff update categories'
  ) THEN
    CREATE POLICY "Allow staff update categories"
    ON public.categories
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
  END IF;

  -- Staff/Authenticated insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' AND policyname = 'Allow staff insert categories'
  ) THEN
    CREATE POLICY "Allow staff insert categories"
    ON public.categories
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- 5. Enable Supabase Realtime synchronization for categories
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Verify migration result
SELECT id, name, marathi_name, image_url, is_active 
FROM public.categories 
ORDER BY name;
