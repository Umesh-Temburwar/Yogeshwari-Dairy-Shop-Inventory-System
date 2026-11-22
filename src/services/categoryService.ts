import { supabase } from '../lib/supabase';
import { CategoryRecord } from '../types';

const CATEGORIES_CACHE_KEY = 'ydo_categories_cache';

// Curated high-resolution default photos for core dairy categories
export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'Milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
  'Curd & Chaas': 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=400&q=80',
  'Paneer & Butter': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
  'Ghee': 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=400&q=80',
  'Sweets/Mithai': 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=400&q=80',
  'Bakery & Extras': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  'Ice Cream & Kulfi': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400&q=80',
};

// Curated photo suggestions library so store staff can easily pick 1-tap replacements
export const CURATED_CATEGORY_PRESETS: Array<{
  category: string;
  title: string;
  url: string;
  description: string;
}> = [
  // Milk
  {
    category: 'Milk',
    title: 'Fresh Milk Glass Bottle',
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    description: 'Crisp glass bottle with creamy farm milk'
  },
  {
    category: 'Milk',
    title: 'Pouring Fresh Milk',
    url: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=400&q=80',
    description: 'Dynamic splash pouring cold fresh milk'
  },
  // Curd & Chaas
  {
    category: 'Curd & Chaas',
    title: 'Desi Matka Dahi',
    url: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=400&q=80',
    description: 'Thick creamy curd in ceramic earthen pot'
  },
  {
    category: 'Curd & Chaas',
    title: 'Fresh Buttermilk / Chaas',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
    description: 'Refreshing spiced masala chaas / lassi'
  },
  // Paneer & Butter
  {
    category: 'Paneer & Butter',
    title: 'Fresh Paneer Cubes',
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
    description: 'Soft malai paneer blocks cut into cubes'
  },
  {
    category: 'Paneer & Butter',
    title: 'Golden Table Butter',
    url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80',
    description: 'Creamy yellow dairy butter slab'
  },
  // Ghee
  {
    category: 'Ghee',
    title: 'Pure Desi Cow Ghee',
    url: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=400&q=80',
    description: 'Aromatic golden danedaar ghee in glass jar'
  },
  // Sweets/Mithai
  {
    category: 'Sweets/Mithai',
    title: 'Assorted Indian Mithai',
    url: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=400&q=80',
    description: 'Festive gulab jamun, pedha, and kaju katli'
  },
  {
    category: 'Sweets/Mithai',
    title: 'Royal Gulab Jamun',
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
    description: 'Golden fried syrup-soaked mawa dumplings'
  },
  // Bakery & Extras
  {
    category: 'Bakery & Extras',
    title: 'Fresh Bakery Bread & Toast',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    description: 'Crisp morning milk bread, toast, and khari'
  },
  // Ice Cream & Kulfi
  {
    category: 'Ice Cream & Kulfi',
    title: 'Creamy Kulfi & Ice Cream',
    url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400&q=80',
    description: 'Delicious ice cream scoops and dairy kulfi'
  }
];

export const FALLBACK_CATEGORIES: CategoryRecord[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Milk',
    marathi_name: 'दूध',
    hindi_name: 'दूध',
    description: 'Fresh cow, buffalo, toned, and double-toned milk',
    image_url: DEFAULT_CATEGORY_IMAGES['Milk'],
    is_active: true
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Curd & Chaas',
    marathi_name: 'दही आणि ताक',
    hindi_name: 'दही और छाछ',
    description: 'Desi dahi, flavored yogurt, lassi, and buttermilk pouches',
    image_url: DEFAULT_CATEGORY_IMAGES['Curd & Chaas'],
    is_active: true
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Paneer & Butter',
    marathi_name: 'पनीर आणि लोणी',
    hindi_name: 'पनीर और मक्खन',
    description: 'Fresh malai paneer, soft paneer blocks, and table butter',
    image_url: DEFAULT_CATEGORY_IMAGES['Paneer & Butter'],
    is_active: true
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Ghee',
    marathi_name: 'शुद्ध तूप',
    hindi_name: 'शुद्ध घी',
    description: 'Pure desi cow ghee and buffalo danedaar ghee',
    image_url: DEFAULT_CATEGORY_IMAGES['Ghee'],
    is_active: true
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Sweets/Mithai',
    marathi_name: 'मिठाई व मावा',
    hindi_name: 'मिठाई और मावा',
    description: 'Fresh mawa/khoya, gulab jamun, rasgulla, and pedha',
    image_url: DEFAULT_CATEGORY_IMAGES['Sweets/Mithai'],
    is_active: true
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    name: 'Bakery & Extras',
    marathi_name: 'बेकरी व इतर',
    hindi_name: 'बेकरी और अन्य',
    description: 'Fresh toast, khari, bread, buns, and condiments',
    image_url: DEFAULT_CATEGORY_IMAGES['Bakery & Extras'],
    is_active: true
  },
  {
    id: 'c1000000-0000-0000-0000-000000000007',
    name: 'Ice Cream & Kulfi',
    marathi_name: 'आईस्क्रीम व कुल्फी',
    hindi_name: 'आइसक्रीम और कुल्फी',
    description: 'Tubs, cups, family packs, and traditional matka kulfi',
    image_url: DEFAULT_CATEGORY_IMAGES['Ice Cream & Kulfi'],
    is_active: true
  }
];

let cachedCategories: CategoryRecord[] | null = null;

const loadLocalCache = (): CategoryRecord[] => {
  if (cachedCategories) return cachedCategories;
  if (typeof window === 'undefined') return FALLBACK_CATEGORIES;
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedCategories = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback to defaults
  }
  cachedCategories = FALLBACK_CATEGORIES;
  return FALLBACK_CATEGORIES;
};

const saveLocalCache = (categories: CategoryRecord[]) => {
  cachedCategories = categories;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent('yd_categories_updated', { detail: categories }));
  } catch {
    // Ignore storage quota
  }
};

/**
 * Fetches all categories with their custom photo URLs from Supabase.
 */
export const fetchCategories = async (forceRefresh = false): Promise<CategoryRecord[]> => {
  if (!forceRefresh && cachedCategories && cachedCategories.length > 0) {
    return cachedCategories;
  }

  const initialList = loadLocalCache();

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Could not load categories from Supabase, using cache:', error.message);
      return initialList;
    }

    if (data && data.length > 0) {
      // Merge with default fallback images if image_url is missing
      const merged: CategoryRecord[] = (data as CategoryRecord[]).map((cat) => ({
        ...cat,
        image_url: cat.image_url || DEFAULT_CATEGORY_IMAGES[cat.name] || 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?auto=format&fit=crop&w=400&q=80'
      }));
      saveLocalCache(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Network error loading categories:', err);
  }

  return initialList;
};

/**
 * Updates a category's custom photo URL in Supabase and local cache.
 */
export const updateCategoryPhotoUrl = async (
  identifier: { id?: string; name: string },
  newImageUrl: string
): Promise<CategoryRecord> => {
  const trimmedUrl = newImageUrl.trim();
  const currentList = loadLocalCache();
  const now = new Date().toISOString();

  // 1. Update in Supabase
  try {
    if (identifier.id) {
      const { data, error } = await supabase
        .from('categories')
        .update({
          image_url: trimmedUrl,
          updated_at: now
        })
        .eq('id', identifier.id)
        .select()
        .single();

      if (!error && data) {
        const updatedRecord = data as CategoryRecord;
        const nextList = currentList.map((c) => (c.id === identifier.id ? updatedRecord : c));
        saveLocalCache(nextList);
        return updatedRecord;
      }
    } else {
      // Upsert by name
      const { data, error } = await supabase
        .from('categories')
        .upsert(
          {
            name: identifier.name,
            image_url: trimmedUrl,
            updated_at: now
          },
          { onConflict: 'name' }
        )
        .select()
        .single();

      if (!error && data) {
        const updatedRecord = data as CategoryRecord;
        const exists = currentList.some((c) => c.name.toLowerCase() === identifier.name.toLowerCase());
        const nextList = exists
          ? currentList.map((c) => (c.name.toLowerCase() === identifier.name.toLowerCase() ? updatedRecord : c))
          : [...currentList, updatedRecord];
        saveLocalCache(nextList);
        return updatedRecord;
      }
    }
  } catch (err) {
    console.warn('Supabase category update error:', err);
  }

  // Fallback optimistic local update
  const updatedItem: CategoryRecord = {
    id: identifier.id || `cat-${Date.now()}`,
    name: identifier.name,
    image_url: trimmedUrl,
    updated_at: now
  };
  const nextList = currentList.map((c) =>
    (identifier.id && c.id === identifier.id) || c.name.toLowerCase() === identifier.name.toLowerCase()
      ? { ...c, image_url: trimmedUrl, updated_at: now }
      : c
  );
  saveLocalCache(nextList);
  return updatedItem;
};

/**
 * Returns image URL for a given category name.
 */
export const getCategoryPhoto = (categoryName: string): string => {
  const list = loadLocalCache();
  const found = list.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  if (found?.image_url) return found.image_url;
  return DEFAULT_CATEGORY_IMAGES[categoryName] || 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?auto=format&fit=crop&w=400&q=80';
};

/**
 * Subscribes to category updates across all counter screens.
 */
export const subscribeToCategoryChanges = (
  callback: (categories: CategoryRecord[]) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: any) => {
    if (e.detail) callback(e.detail);
  };

  window.addEventListener('yd_categories_updated', handleCustomEvent);

  // Also listen to Supabase Realtime channel for multi-counter sync
  const channel = supabase
    .channel('yd-categories-live-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories' },
      () => {
        fetchCategories(true).then(callback).catch(() => {});
      }
    )
    .subscribe();

  // Initial emit
  callback(loadLocalCache());

  return () => {
    window.removeEventListener('yd_categories_updated', handleCustomEvent);
    supabase.removeChannel(channel);
  };
};
