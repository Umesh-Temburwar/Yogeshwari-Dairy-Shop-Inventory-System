// Yogeshwari Dairy Shop POS — Persistent Product Image Cache Service Worker
// Caches product & UI images on disk (Cache-First) so loaded images never reload repeatedly.
// Does NOT intercept HTML, JS, CSS, or Supabase API/Auth requests so app updates always stay live.

const IMAGE_CACHE_NAME = 'ydo-product-images-v1';
const MAX_CACHED_IMAGES = 1500;

const IMAGE_EXT_REGEX = /\.(?:png|jpe?g|webp|gif|avif|svg)(?:$|[?#])/i;

function isCacheableImageRequest(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  // Never cache Supabase REST/Auth/Realtime/Functions API calls
  if (
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/functions/v1/') ||
    url.pathname.includes('/realtime/v1/')
  ) {
    return false;
  }

  // Always cache Supabase Storage public product images
  if (url.pathname.includes('/storage/v1/object/public/product-images/')) {
    return true;
  }

  // Cache browser image fetches & known image extensions
  if (request.destination === 'image') return true;
  return IMAGE_EXT_REGEX.test(url.pathname);
}

async function trimCacheIfNeeded(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length > MAX_CACHED_IMAGES) {
      const overflow = keys.length - MAX_CACHED_IMAGES;
      for (let i = 0; i < overflow; i += 1) {
        await cache.delete(keys[i]);
      }
    }
  } catch {
    // Non-fatal cache trim error
  }
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('ydo-product-images-') && name !== IMAGE_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheableImageRequest(request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      try {
        const networkResponse = await fetch(request);
        // Cache both CORS 200 responses and opaque cross-origin CDN image responses
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const clone = networkResponse.clone();
          event.waitUntil(
            cache.put(request, clone).then(() => trimCacheIfNeeded(cache)).catch(() => {})
          );
        }
        return networkResponse;
      } catch (err) {
        const fallback = await cache.match(request);
        if (fallback) return fallback;
        throw err;
      }
    })()
  );
});
