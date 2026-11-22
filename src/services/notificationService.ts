import { playNewOrderChime } from '../utils/audioChime';
import { supabase } from '../lib/supabase';

const BACKEND_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1').replace(/\/$/, '');

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks whether Browser/OS Notifications and Service Workers are supported.
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Returns current permission status ('granted', 'denied', 'default', or 'unsupported').
 */
export const getNotificationPermission = (): NotificationStatus => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Prompts user to enable OS/System push notifications for incoming orders.
 */
export const requestNotificationPermission = async (): Promise<NotificationStatus> => {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Subscribe to PushManager if ServiceWorker is active
      await registerPushSubscription();
    }
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
};

/**
 * Subscribes Service Worker PushManager and saves staff push subscription endpoint.
 */
export const registerPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      console.warn('PushManager not available on this browser');
      return null;
    }

    let subscription = await registration.pushManager.getSubscription();

    // If no existing subscription, register a new one
    if (!subscription) {
      try {
        // Fetch public VAPID key if provided by backend or use default
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZ_WJJPz520rqqxnqAEfINb250G_6n395kW85zk'
          ),
        });
      } catch (subErr) {
        // Local push subscriptions may fail if VAPID is untrusted on plain HTTP
        console.warn('PushManager subscription registration note:', subErr);
      }
    }

    if (subscription) {
      // Save subscription in Supabase or backend
      await savePushSubscriptionToStore(subscription);
    }

    return subscription;
  } catch (err) {
    console.warn('ServiceWorker push subscription error:', err);
    return null;
  }
};

/**
 * Stores push subscription so server can dispatch notifications even when app is closed.
 */
export const savePushSubscriptionToStore = async (subscription: PushSubscription): Promise<void> => {
  try {
    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    if (!endpoint) return;

    // 1. Try Supabase staff_push_subscriptions table
    try {
      await supabase.from('staff_push_subscriptions').upsert(
        {
          endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );
    } catch {
      // Table may be created in migration
    }

    // 2. Try Express Backend
    try {
      await fetch(`${BACKEND_BASE}/ecommerce/push-subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subJson }),
      });
    } catch {
      // Fallback
    }

    localStorage.setItem('ydo_push_subscribed', 'true');
  } catch (err) {
    console.warn('Could not save push subscription:', err);
  }
};

/**
 * Displays OS-level system push notification with sound and vibration.
 * Works even when the browser tab is minimized or in background!
 */
export const showOrderNotification = async (order: {
  orderNo: string;
  customerName: string;
  amount: number;
  orderId?: string;
}): Promise<void> => {
  // Always trigger sound alert
  playNewOrderChime();

  // Trigger vibration if device supports it (mobile devices)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 300]);
    } catch {}
  }

  if (getNotificationPermission() !== 'granted') return;

  const title = `🔔 नया ऑनलाइन ऑर्डर! #${order.orderNo}`;
  const body = `${order.customerName} • ₹${order.amount} - ऑर्डर देखने के लिए क्लिक करें`;
  const options: NotificationOptions = {
    body,
    icon: '/assets/YDO_logo-B6fE-ZjE.jpg',
    badge: '/assets/YDO_logo-B6fE-ZjE.jpg',
    tag: `order-${order.orderNo}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: `/#view=ecommerce-orders`,
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
    } else {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        try {
          window.focus();
        } catch {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('yd_navigate_view', { detail: 'ecommerce-orders' }));
          if (window.location.hash !== '#view=ecommerce-orders') {
            window.location.hash = '#view=ecommerce-orders';
          }
        }
      };
    }
  } catch (err) {
    console.warn('System Notification display error:', err);
  }
};

// Helper: Convert VAPID key URL base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
