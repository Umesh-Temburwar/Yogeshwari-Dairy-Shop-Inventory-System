import { supabase } from './supabase';

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
export async function syncRegistrationSettingFromCloud(): Promise<boolean> {
  if (!supabase) return isRegistrationAllowedSync();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('default_redirect_view')
      .eq('role', 'Owner')
      .limit(1);

    if (error || !data || data.length === 0) {
      return isRegistrationAllowedSync();
    }

    const redirectView = data[0].default_redirect_view || '';
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
      error: 'सुरक्षा धोरण: फक्त दुकान मालक निखिल सखारे (Shop Owner) ही नोंदणी सेटिंग चालू/बंद करू शकतात.'
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
      }

      // 4. Log security audit event in admin_audit_logs
      try {
        await supabase
          .from('admin_audit_logs')
          .insert({
            admin_name: userName || 'निखिल सखारे (दुकान मालक)',
            admin_email: userEmail || 'yogeshwaridairy9896@gmail.com',
            admin_role: 'Owner',
            action_type: 'PRODUCT_UPDATED',
            title: enabled 
              ? 'नवीन ऑपरेटर नोंदणी सुरू केली (Registration Enabled)' 
              : 'नवीन ऑपरेटर नोंदणी बंद व लपवली (Registration Disabled & Hidden)',
            details: enabled
              ? 'दुकान मालक निखिल सखारे यांनी लॉगिन पेजवर नवीन वापरकर्ता नोंदणी पर्याय चालू केला.'
              : 'दुकान मालक निखिल सखारे यांनी लॉगिन पेजवरून नवीन वापरकर्ता नोंदणी पर्याय पूर्णपणे बंद व सुरक्षित केला.',
            counter_name: 'मुख्य मालक काऊंटर'
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
