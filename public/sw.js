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

// ============================================================================
// BACKGROUND PUSH NOTIFICATION HANDLERS (When App/Browser is Closed)
// ============================================================================
self.addEventListener('push', (event) => {
  let title = '🥛 नया ऑनलाइन ऑर्डर प्राप्त हुआ!';
  let options = {
    body: 'योगेश्वरी डेयरी में नया ऑर्डर आया है। तुरंत चेक करें।',
    icon: '/assets/YDO_logo-B6fE-ZjE.jpg',
    badge: '/assets/YDO_logo-B6fE-ZjE.jpg',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'ydo-new-order',
    renotify: true,
    requireInteraction: true,
    data: {
      url: '/#view=ecommerce-orders',
    },
    actions: [
      { action: 'open_order', title: '📦 ऑर्डर देखें' },
      { action: 'close', title: 'बंद करें' },
    ],
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.title) title = payload.title;
      if (payload.body) options.body = payload.body;
      if (payload.data) options.data = payload.data;
      if (payload.orderNo) {
        title = `🔔 नया ऑर्डर #${payload.orderNo} मिला!`;
        options.body = `${payload.customerName || 'ग्राहक'} (₹${payload.amount || ''}) - तुरंत पैक करें`;
      }
    } catch {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/#view=ecommerce-orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it, post navigation message, and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('postMessage' in client) {
            client.postMessage({ type: 'NAVIGATE_VIEW', view: 'ecommerce-orders' });
          }
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new window pointing to Online Orders
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

