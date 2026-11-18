import { supabase } from './supabase';
import {
  fetchOwnerCloudConfig,
  updateOwnerConfigCachePartial
} from './ownerConfigCache';

const STORAGE_KEY = 'ydo_allow_user_registration';

/**
 * Checks whether new user registration is currently permitted.
 * Default is FALSE (strictly disabled / hidden from login page for maximum security).
 */
export function isRegistrationAllowedSync(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    // Explicitly check for 'true'. If null or anything else, default is FALSE (OFF / HIDDEN).
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Synchronizes registration setting from Supabase cloud database.
 * Stored in Owner profile default_redirect_view ('dashboard:reg_on' vs 'dashboard:reg_off').
 */
export async function syncRegistrationSettingFromCloud(forceRefresh = false): Promise<boolean> {
  if (!supabase) return isRegistrationAllowedSync();

  try {
    const config = await fetchOwnerCloudConfig(forceRefresh);
    if (!config || config.default_redirect_view === null) {
      return isRegistrationAllowedSync();
    }

    const redirectView = config.default_redirect_view || '';
    const isAllowed = redirectView.includes('reg_on');

    // Persist locally for instant zero-latency future reads
    if (typeof window !== 'undefined') {
      try {
        const currentLocal = isRegistrationAllowedSync();
        if (currentLocal !== isAllowed) {
          localStorage.setItem(STORAGE_KEY, String(isAllowed));
          window.dispatchEvent(new CustomEvent('ydo_registration_setting_changed', { detail: { enabled: isAllowed } }));
        }
      } catch {}
    }

    return isAllowed;
  } catch (err) {
    console.warn('Failed to sync registration setting from Supabase:', err);
    return isRegistrationAllowedSync();
  }
}

/**
 * Updates the user registration setting.
 * ONLY Shop Owner Nikhil Sakhare (role === 'Owner') is authorized to change this setting!
 */
export async function setRegistrationSetting(
  enabled: boolean, 
  userRole?: string,
  userEmail?: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Strict Security Access Control: Only Owner can modify!
  const isOwner = 
    userRole === 'Owner' || 
    userEmail === 'yogeshwaridairy9896@gmail.com' ||
    userEmail?.includes('yogeshwari');

  if (!isOwner) {
    return {
      success: false,
      error: 'Security policy: Only Shop Owner Nikhil Sakhare can toggle operator registration.'
    };
  }

  // 2. Persist locally first for immediate UI response
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
      window.dispatchEvent(new CustomEvent('ydo_registration_setting_changed', { detail: { enabled } }));
    } catch (e) {
      console.warn('Error saving registration setting to localStorage:', e);
    }
  }

  // 3. Update Supabase Cloud database
  if (supabase) {
    try {
      const redirectTag = enabled ? 'dashboard:reg_on' : 'dashboard:reg_off';
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          default_redirect_view: redirectTag,
          updated_at: new Date().toISOString()
        })
        .eq('role', 'Owner');

      if (updateError) {
        console.warn('Failed to update registration setting in Supabase profiles:', updateError);
      } else {
        updateOwnerConfigCachePartial({ default_redirect_view: redirectTag });
      }

      // 4. Log security audit event in admin_audit_logs
      try {
        await supabase
          .from('admin_audit_logs')
          .insert({
            admin_name: userName || 'Nikhil Sakhare (Shop Owner)',
            admin_email: userEmail || 'yogeshwaridairy9896@gmail.com',
            admin_role: 'Owner',
            action_type: 'PRODUCT_UPDATED',
            title: enabled 
              ? 'New Operator Registration Enabled' 
              : 'New Operator Registration Disabled & Hidden',
            details: enabled
              ? 'Shop Owner Nikhil Sakhare enabled new user registration on the login page.'
              : 'Shop Owner Nikhil Sakhare disabled and hid new user registration on the login page.',
            counter_name: 'Owner Master Counter'
          });
      } catch (logErr) {
        console.warn('Audit log write error:', logErr);
      }
    } catch (err: any) {
      console.warn('Cloud sync error for registration setting:', err);
    }
  }

  return { success: true };
}

/**
 * Subscribes to changes in the registration setting across tabs and components.
 */
export function subscribeToRegistrationSetting(callback: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: any) => {
    if (e.detail && typeof e.detail.enabled === 'boolean') {
      callback(e.detail.enabled);
    } else {
      callback(isRegistrationAllowedSync());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(e.newValue === 'true');
    }
  };

  window.addEventListener('ydo_registration_setting_changed', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('ydo_registration_setting_changed', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
