const STORAGE_KEY = 'ydo_live_audit_stream_enabled';

/**
 * Checks whether the Live Audit Stream / Activity History is currently enabled.
 * Default is TRUE (ON).
 */
export function isAuditStreamEnabledSync(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === null) return true; // Default ON
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Updates the Live Audit Stream ON / OFF setting.
 * ONLY Shop Owner Nikhil Sakhare (role === 'Owner') is authorized to change this setting!
 */
export function setAuditStreamEnabled(
  enabled: boolean,
  userRole?: string
): { success: boolean; error?: string } {
  // Security: Only Owner can toggle audit stream
  if (userRole && userRole !== 'Owner') {
    return {
      success: false,
      error: 'सुरक्षा धोरण: फक्त दुकान मालक (Shop Owner) थेट तपासणी नोंदवही चालू/बंद करू शकतात.'
    };
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
      window.dispatchEvent(
        new CustomEvent('ydo_audit_stream_toggle', { detail: { enabled } })
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error updating setting' };
    }
  }

  return { success: true };
}

/**
 * Subscribes to changes in the Live Audit Stream setting for real-time reactivity.
 */
export function subscribeToAuditStreamSetting(
  callback: (enabled: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: any) => {
    if (e?.detail?.enabled !== undefined) {
      callback(e.detail.enabled);
    } else {
      callback(isAuditStreamEnabledSync());
    }
  };

  window.addEventListener('ydo_audit_stream_toggle', handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('ydo_audit_stream_toggle', handler);
    window.removeEventListener('storage', handler);
  };
}
