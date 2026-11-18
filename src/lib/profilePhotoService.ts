import {
  supabase,
  isInvalidRefreshTokenError,
  clearStaleSupabaseAuthSession
} from './supabase';
import {
  PRODUCT_IMAGES_BUCKET,
  formatFileSize,
  calculateSavedPercent
} from './productImageService';

/** Strict 20 KB hard upload cap (20,480 bytes) regardless of original image size */
export const MAX_AVATAR_UPLOAD_BYTES = 20 * 1024;
const AVATAR_STORAGE_KEY = 'ydo_profile_avatars_v1';
const AVATAR_DIMENSIONS = [512, 384, 320, 256, 192, 160, 128, 96, 64] as const;

export interface CompressedProfilePhoto {
  blob: Blob;
  mimeType: 'image/webp' | 'image/jpeg';
  extension: 'webp' | 'jpg';
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  savedPercent: number;
  qualityUsed: number;
}

export interface ProfilePhotoUploadResult {
  avatarUrl: string;
  compressed: CompressedProfilePhoto;
  storedInCloud: boolean;
  syncedAcrossDevices: boolean;
}

type AvatarCacheMap = Record<string, string>;

const readAvatarCache = (): AvatarCacheMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as AvatarCacheMap;
    }
  } catch {
    // Ignore storage read errors
  }
  return {};
};

const writeAvatarCache = (map: AvatarCacheMap): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
};

export const normalizeAvatarKey = (email?: string | null, role?: string | null): string => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) return cleanEmail;
  return role === 'Admin' ? 'role:admin' : 'role:owner';
};

export const getCachedProfileAvatar = (email?: string | null, role?: string | null): string | null => {
  const cache = readAvatarCache();
  const key = normalizeAvatarKey(email, role);
  if (cache[key]) return cache[key];
  const roleKey = role === 'Admin' ? 'role:admin' : 'role:owner';
  return cache[roleKey] || null;
};

export const getCachedOwnerAvatar = (): string | null => {
  const cache = readAvatarCache();
  return cache['yogeshwaridairy9896@gmail.com'] || cache['role:owner'] || null;
};

export const setCachedProfileAvatar = (
  url: string | null,
  email?: string | null,
  role?: string | null
): void => {
  const cache = readAvatarCache();
  const key = normalizeAvatarKey(email, role);
  const roleKey = role === 'Admin' ? 'role:admin' : 'role:owner';

  if (url) {
    cache[key] = url;
    cache[roleKey] = url;
  } else {
    delete cache[key];
    delete cache[roleKey];
  }
  writeAvatarCache(cache);
};

interface DecodedImageSource {
  drawable: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

const decodeImageFile = async (file: File): Promise<DecodedImageSource> => {
  // Prefer createImageBitmap (memory-efficient for very large camera photos & honors EXIF orientation)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          drawable: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => {
            try {
              bitmap.close();
            } catch {
              // ignore
            }
          }
        };
      }
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  return new Promise<DecodedImageSource>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read image dimensions.'));
        return;
      }
      resolve({
        drawable: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        cleanup: () => URL.revokeObjectURL(objectUrl)
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Selected file is not a supported image.'));
    };
    img.src = objectUrl;
  });
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: 'image/webp' | 'image/jpeg',
  quality: number
): Promise<Blob | null> => {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    } catch {
      resolve(null);
    }
  });
};

const supportsWebpEncode = async (): Promise<boolean> => {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('canvas');
  probe.width = 4;
  probe.height = 4;
  const blob = await canvasToBlob(probe, 'image/webp', 0.8);
  return Boolean(blob && blob.type === 'image/webp');
};

const drawSquareCenterCrop = (
  source: DecodedImageSource,
  side: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available in this browser.');
  }

  // Crisp white fill for transparent PNGs
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, side, side);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const minSide = Math.min(source.width, source.height);
  const sx = Math.round((source.width - minSide) / 2);
  const sy = Math.round((source.height - minSide) / 2);

  ctx.drawImage(source.drawable, sx, sy, minSide, minSide, 0, 0, side, side);
  return canvas;
};

/**
 * Compress ANY image file (no matter how large: 1 MB, 15 MB, 50 MB+) into a
 * crisp 1:1 square WebP/JPEG strictly <= 20 KB (20,480 bytes).
 */
export const compressProfilePhotoTo20KB = async (
  file: File
): Promise<CompressedProfilePhoto> => {
  if (!file || file.size <= 0) {
    throw new Error('Selected image file is empty.');
  }
  const mime = (file.type || '').toLowerCase();
  const hasImageExt = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name || '');
  if (mime && !mime.startsWith('image/') && !hasImageExt) {
    throw new Error('Please choose a valid image file (JPG, PNG, WebP, etc.).');
  }

  const decoded = await decodeImageFile(file);
  try {
    const useWebp = await supportsWebpEncode();
    const mimeType: 'image/webp' | 'image/jpeg' = useWebp ? 'image/webp' : 'image/jpeg';
    const extension: 'webp' | 'jpg' = useWebp ? 'webp' : 'jpg';

    let smallestCandidate: { blob: Blob; side: number; quality: number } | null = null;

    for (const targetSide of AVATAR_DIMENSIONS) {
      const side = Math.min(targetSide, Math.max(64, Math.min(decoded.width, decoded.height)));
      const canvas = drawSquareCenterCrop(decoded, side);

      // Quick high-quality check first
      const highBlob = await canvasToBlob(canvas, mimeType, 0.85);
      if (highBlob && highBlob.size <= MAX_AVATAR_UPLOAD_BYTES) {
        return {
          blob: highBlob,
          mimeType,
          extension,
          width: side,
          height: side,
          originalBytes: file.size,
          compressedBytes: highBlob.size,
          savedPercent: calculateSavedPercent(file.size, highBlob.size),
          qualityUsed: 0.85
        };
      }

      // Check lowest acceptable quality at this resolution before binary searching
      const minQ = 0.28;
      const lowBlob = await canvasToBlob(canvas, mimeType, minQ);
      if (lowBlob) {
        if (!smallestCandidate || lowBlob.size < smallestCandidate.blob.size) {
          smallestCandidate = { blob: lowBlob, side, quality: minQ };
        }
      }

      if (lowBlob && lowBlob.size <= MAX_AVATAR_UPLOAD_BYTES) {
        // Binary search [minQ .. 0.85] for the HIGHEST quality that stays strictly <= 20 KB
        let lo = minQ;
        let hi = 0.85;
        let bestBlob = lowBlob;
        let bestQuality = minQ;

        for (let iter = 0; iter < 6; iter++) {
          const mid = Number(((lo + hi) / 2).toFixed(3));
          const midBlob = await canvasToBlob(canvas, mimeType, mid);
          if (midBlob && midBlob.size <= MAX_AVATAR_UPLOAD_BYTES) {
            bestBlob = midBlob;
            bestQuality = mid;
            lo = mid;
          } else {
            hi = mid;
          }
        }

        return {
          blob: bestBlob,
          mimeType,
          extension,
          width: side,
          height: side,
          originalBytes: file.size,
          compressedBytes: bestBlob.size,
          savedPercent: calculateSavedPercent(file.size, bestBlob.size),
          qualityUsed: bestQuality
        };
      }
    }

    // Extreme fallback: 64x64 at lowest quality (guaranteed << 20 KB)
    const fallbackCanvas = drawSquareCenterCrop(decoded, 64);
    const tinyBlob = await canvasToBlob(fallbackCanvas, mimeType, 0.2);
    const finalBlob =
      tinyBlob && (!smallestCandidate || tinyBlob.size < smallestCandidate.blob.size)
        ? tinyBlob
        : smallestCandidate?.blob;

    if (!finalBlob || finalBlob.size <= 0) {
      throw new Error('Could not compress the selected photo.');
    }

    return {
      blob: finalBlob,
      mimeType,
      extension,
      width: smallestCandidate?.side || 64,
      height: smallestCandidate?.side || 64,
      originalBytes: file.size,
      compressedBytes: finalBlob.size,
      savedPercent: calculateSavedPercent(file.size, finalBlob.size),
      qualityUsed: smallestCandidate?.quality || 0.2
    };
  } finally {
    decoded.cleanup();
  }
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode image locally.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to encode image locally.'));
    reader.readAsDataURL(blob);
  });
};

const computeShortHash = async (blob: Blob): Promise<string> => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof blob.arrayBuffer === 'function') {
      const buf = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest).slice(0, 6))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below
  }
  return Date.now().toString(36);
};

/**
 * Compress any image strictly to <= 20 KB, upload to Supabase Storage (`product-images/avatars/...`),
 * and persist `avatar_url` to Supabase Auth metadata, `public.profiles`, and local cache.
 */
export const uploadUserProfilePhoto = async (params: {
  file: File;
  userEmail?: string | null;
  userRole: 'Owner' | 'Admin';
  userId?: string | null;
}): Promise<ProfilePhotoUploadResult> => {
  const compressed = await compressProfilePhotoTo20KB(params.file);

  if (compressed.compressedBytes > MAX_AVATAR_UPLOAD_BYTES) {
    throw new Error(
      `Compressed photo (${formatFileSize(compressed.compressedBytes)}) exceeded the 20 KB limit.`
    );
  }

  let finalUrl: string | null = null;
  let storedInCloud = false;

  if (supabase) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError && isInvalidRefreshTokenError(sessionError)) {
        await clearStaleSupabaseAuthSession();
      } else if (sessionData.session) {
        const safeKey = normalizeAvatarKey(params.userEmail, params.userRole)
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 48);
        const hash = await computeShortHash(compressed.blob);
        const storagePath = `avatars/${safeKey}_${hash}.${compressed.extension}`;

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(storagePath, compressed.blob, {
            contentType: compressed.mimeType,
            cacheControl: '31536000',
            upsert: true
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .getPublicUrl(storagePath);
          finalUrl = publicUrlData.publicUrl;
          storedInCloud = true;
        } else {
          console.warn('[ProfilePhoto] Cloud storage upload fallback:', uploadError.message);
        }
      }
    } catch (err) {
      console.warn('[ProfilePhoto] Storage upload skipped, using local fallback:', err);
    }
  }

  // Fallback for offline/local counter session: store the <= 20 KB compressed photo as data URL
  if (!finalUrl) {
    finalUrl = await blobToDataUrl(compressed.blob);
  }

  // Persist URL to Supabase Auth user_metadata & public.profiles (so ALL devices sync immediately)
  const syncRes = await persistProfileAvatarUrl({
    avatarUrl: finalUrl,
    userEmail: params.userEmail,
    userRole: params.userRole,
    userId: params.userId
  });

  setCachedProfileAvatar(finalUrl, params.userEmail, params.userRole);

  return {
    avatarUrl: finalUrl,
    compressed,
    storedInCloud,
    syncedAcrossDevices: storedInCloud && (syncRes.profileUpdated || syncRes.authMetaUpdated)
  };
};

export const persistProfileAvatarUrl = async (params: {
  avatarUrl: string | null;
  userEmail?: string | null;
  userRole: 'Owner' | 'Admin';
  userId?: string | null;
}): Promise<{ profileUpdated: boolean; authMetaUpdated: boolean }> => {
  if (!supabase) return { profileUpdated: false, authMetaUpdated: false };

  let profileUpdated = false;
  let authMetaUpdated = false;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    const isHttpOrNull = !params.avatarUrl || /^https?:\/\//i.test(params.avatarUrl);

    // 1. Save in Supabase Auth user_metadata (works across devices even before Phase 75 SQL)
    if (sessionUser && isHttpOrNull) {
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { avatar_url: params.avatarUrl }
      });
      if (!metaErr) {
        authMetaUpdated = true;
      }
    }

    // 2. Save in public.profiles.avatar_url (case-insensitive email / auth_user_id / Owner role fallback)
    const cleanEmail = (params.userEmail || sessionUser?.email || '').trim().toLowerCase();
    const nowIso = new Date().toISOString();

    if (cleanEmail) {
      const { data: updatedRows, error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: params.avatarUrl, updated_at: nowIso })
        .ilike('email', cleanEmail)
        .select('id');

      if (!updErr && Array.isArray(updatedRows) && updatedRows.length > 0) {
        profileUpdated = true;
      }
    }

    if (!profileUpdated && (params.userId || sessionUser?.id)) {
      const targetUid = params.userId || sessionUser?.id;
      const { data: updatedById, error: idErr } = await supabase
        .from('profiles')
        .update({ avatar_url: params.avatarUrl, updated_at: nowIso })
        .eq('auth_user_id', targetUid)
        .select('id');

      if (!idErr && Array.isArray(updatedById) && updatedById.length > 0) {
        profileUpdated = true;
      }
    }

    if (!profileUpdated && params.userRole === 'Owner') {
      const { data: updatedOwner, error: ownerErr } = await supabase
        .from('profiles')
        .update({ avatar_url: params.avatarUrl, updated_at: nowIso })
        .eq('role', 'Owner')
        .select('id');

      if (!ownerErr && Array.isArray(updatedOwner) && updatedOwner.length > 0) {
        profileUpdated = true;
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return { profileUpdated, authMetaUpdated };
};

export const syncProfileAvatarsFromCloud = async (): Promise<{
  byEmail: Record<string, string>;
  ownerAvatar: string | null;
  authUserAvatar: string | null;
  authUserEmail: string | null;
}> => {
  const byEmail: Record<string, string> = {};
  let ownerAvatar: string | null = null;
  let authUserAvatar: string | null = null;
  let authUserEmail: string | null = null;

  if (!supabase) {
    return {
      byEmail,
      ownerAvatar: getCachedOwnerAvatar(),
      authUserAvatar: null,
      authUserEmail: null
    };
  }

  const cache = readAvatarCache();
  let changed = false;

  // 1. Fetch fresh Supabase Auth user metadata directly from server (avoids stale JWT cache across devices)
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      const { data: userData } = await supabase.auth.getUser();
      const freshUser = userData?.user;
      if (freshUser) {
        const email = (freshUser.email || '').trim().toLowerCase();
        authUserEmail = email || null;
        const metaUrl =
          typeof freshUser.user_metadata?.avatar_url === 'string'
            ? freshUser.user_metadata.avatar_url.trim()
            : '';
        if (metaUrl) {
          authUserAvatar = metaUrl;
          if (email) {
            byEmail[email] = metaUrl;
            if (cache[email] !== metaUrl) {
              cache[email] = metaUrl;
              changed = true;
            }
          }
          const isAdminEmail = email === 'nilusakhare2003@gmail.com' || email.includes('nilu');
          if (!isAdminEmail) {
            ownerAvatar = metaUrl;
            if (cache['role:owner'] !== metaUrl) {
              cache['role:owner'] = metaUrl;
              changed = true;
            }
          } else if (cache['role:admin'] !== metaUrl) {
            cache['role:admin'] = metaUrl;
            changed = true;
          }
        }
      }
    }
  } catch {
    // Non-blocking auth metadata fetch
  }

  // 2. Query public.profiles.avatar_url (source of truth across ALL devices when Phase 75 SQL is applied)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, role, avatar_url');

    if (!error && Array.isArray(data)) {
      for (const row of data as Array<{
        email?: string | null;
        role?: string | null;
        avatar_url?: string | null;
      }>) {
        const url = (row.avatar_url || '').trim();
        const email = (row.email || '').trim().toLowerCase();
        if (url) {
          if (email) {
            byEmail[email] = url;
            if (cache[email] !== url) {
              cache[email] = url;
              changed = true;
            }
          }
          if (row.role === 'Owner') {
            ownerAvatar = url;
            if (cache['role:owner'] !== url) {
              cache['role:owner'] = url;
              changed = true;
            }
          } else if (row.role === 'Admin') {
            if (cache['role:admin'] !== url) {
              cache['role:admin'] = url;
              changed = true;
            }
          }
        }
      }
    }
  } catch {
    // Graceful fallback if avatar_url column is not yet created
  }

  if (changed) {
    writeAvatarCache(cache);
  }

  return {
    byEmail,
    ownerAvatar: ownerAvatar || getCachedOwnerAvatar(),
    authUserAvatar,
    authUserEmail
  };
};
