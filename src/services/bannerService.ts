// ============================================================================
// YOGESHWARI DAIRY SHOP ERP - PROMOTIONAL BANNERS SERVICE
// File: src/services/bannerService.ts
// ============================================================================

import { supabase } from '../lib/supabase';
import { PromotionalBanner } from '../types';

const BANNERS_CACHE_KEY = 'ydo_promotional_banners_cache';

// Curated dairy and grocery banner templates for 1-tap addition
export const BANNER_PRESETS = [
  {
    title: 'Farm Fresh Buffalo & Cow Milk',
    subtitle: 'Pure, unadulterated fresh morning & evening milk delivered daily',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=80',
    link_type: 'CATEGORY' as const,
    link_target: 'Milk'
  },
  {
    title: 'Fresh Malai Paneer & Desi Dahi',
    subtitle: 'Hand-crafted soft paneer & thick traditional curd made fresh daily',
    image_url: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=1200&q=80',
    link_type: 'CATEGORY' as const,
    link_target: 'Paneer & Butter'
  },
  {
    title: 'Golden Pure Cow & Buffalo Ghee',
    subtitle: 'Rich traditional aroma & authentic purity for your family meals',
    image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=1200&q=80',
    link_type: 'CATEGORY' as const,
    link_target: 'Ghee'
  },
  {
    title: 'Amul Dairy Specials & Ice Creams',
    subtitle: 'Butter, Cheese, Chocolates & Treats at guaranteed best shop prices',
    image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=80',
    link_type: 'BRAND' as const,
    link_target: 'Amul'
  },
  {
    title: 'Superfast 15-Minute Dairy Express',
    subtitle: 'Direct from Yogeshwari Dairy counter to your doorstep in Ambajogai',
    image_url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80',
    link_type: 'CATEGORY' as const,
    link_target: 'Milk'
  },
  {
    title: 'Mithai & Traditional Indian Sweets',
    subtitle: 'Mawa Pedha, Gulab Jamun, Basundi & Pure Festive Delicacies',
    image_url: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=1200&q=80',
    link_type: 'CATEGORY' as const,
    link_target: 'Sweets/Mithai'
  },
  {
    title: 'Morning Breakfast & Bakery Bites',
    subtitle: 'Fresh Pav, Breads, Cream Rolls & Crunchy Dairy Biscuits',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    link_type: 'CATEGORY' as const,
    link_target: 'Bakery & Extras'
  }
];

// Fallback initial banners if table is empty or offline
export const INITIAL_DEFAULT_BANNERS: PromotionalBanner[] = BANNER_PRESETS.slice(0, 5).map((p, idx) => ({
  id: `default-banner-${idx + 1}`,
  title: p.title,
  subtitle: p.subtitle,
  image_url: p.image_url,
  link_type: p.link_type,
  link_target: p.link_target,
  display_order: idx + 1,
  is_active: true,
  created_at: new Date().toISOString()
}));

/**
 * Fetch promotional banners from Supabase with localStorage caching.
 */
export async function fetchPromotionalBanners(activeOnly = false): Promise<PromotionalBanner[]> {
  try {
    if (supabase) {
      let query = supabase
        .from('promotional_banners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const banners = data as PromotionalBanner[];
        try {
          localStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify(banners));
        } catch {
          // ignore localStorage errors
        }
        return banners;
      }
    }
  } catch (err) {
    console.warn('[bannerService] Error fetching banners from Supabase:', err);
  }

  // Fallback to cache or initial defaults
  try {
    const cached = localStorage.getItem(BANNERS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as PromotionalBanner[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return activeOnly ? parsed.filter((b) => b.is_active) : parsed;
      }
    }
  } catch {
    // ignore
  }

  return activeOnly ? INITIAL_DEFAULT_BANNERS.filter((b) => b.is_active) : INITIAL_DEFAULT_BANNERS;
}

/**
 * Create or update a promotional banner.
 */
export async function savePromotionalBanner(
  banner: Partial<PromotionalBanner>
): Promise<{ success: boolean; data?: PromotionalBanner; error?: string }> {
  try {
    if (!banner.title || !banner.image_url) {
      return { success: false, error: 'Title and Image URL are required' };
    }

    const payload = {
      title: banner.title.trim(),
      subtitle: (banner.subtitle || '').trim(),
      image_url: banner.image_url.trim(),
      link_type: banner.link_type || 'CATEGORY',
      link_target: (banner.link_target || '').trim(),
      display_order: typeof banner.display_order === 'number' ? banner.display_order : 1,
      is_active: banner.is_active !== undefined ? banner.is_active : true,
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      if (banner.id && !banner.id.startsWith('default-')) {
        const { data, error } = await supabase
          .from('promotional_banners')
          .update(payload)
          .eq('id', banner.id)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data: data as PromotionalBanner };
      } else {
        const { data, error } = await supabase
          .from('promotional_banners')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select()
          .single();

        if (error) throw error;
        return { success: true, data: data as PromotionalBanner };
      }
    }

    return { success: false, error: 'Supabase client not connected' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[bannerService] Error saving banner:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Delete a promotional banner.
 */
export async function deletePromotionalBanner(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (supabase && !id.startsWith('default-')) {
      const { error } = await supabase.from('promotional_banners').delete().eq('id', id);
      if (error) throw error;
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[bannerService] Error deleting banner:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Toggle active status of a banner.
 */
export async function toggleBannerStatus(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (supabase && !id.startsWith('default-')) {
      const { error } = await supabase
        .from('promotional_banners')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[bannerService] Error toggling banner status:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Update display order for all banners in bulk.
 */
export async function updateBannersOrder(
  orderedBanners: PromotionalBanner[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (supabase) {
      const updates = orderedBanners
        .filter((b) => !b.id.startsWith('default-'))
        .map((b, idx) => ({
          id: b.id,
          display_order: idx + 1,
          updated_at: new Date().toISOString()
        }));

      for (const item of updates) {
        await supabase
          .from('promotional_banners')
          .update({ display_order: item.display_order, updated_at: item.updated_at })
          .eq('id', item.id);
      }
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[bannerService] Error updating banners order:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Realtime subscription to promotional banners table.
 */
export function subscribeToBanners(onChange: () => void): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('promotional_banners_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'promotional_banners' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
