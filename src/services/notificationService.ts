// ============================================================================
// YOGESHWARI DAIRY SHOP - NOTIFICATION & REALTIME SOUND/PUSH SERVICE
// File: src/services/notificationService.ts
// ============================================================================

import { playNewOrderChime, safeVibrate } from '../utils/audioChime';
import { supabase } from '../lib/supabase';

const BACKEND_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1').replace(/\/$/, '');

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

type PermissionListener = (status: NotificationStatus) => void;
const permissionListeners: Set<PermissionListener> = new Set();

/**
 * Subscribe to notification permission changes
 */
export const onNotificationPermissionChange = (listener: PermissionListener): (() => void) => {
  permissionListeners.add(listener);
  return () => {
    permissionListeners.delete(listener);
  };
};

const notifyPermissionListeners = (status: NotificationStatus) => {
  permissionListeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.warn('Notification listener error:', e);
    }
  });
};

/**
 * Checks whether Browser/OS Notifications are supported.
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Checks whether ServiceWorker is supported.
 */
export const isServiceWorkerSupported = (): boolean => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
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
 * Triggered on button click to guarantee browser permission prompt pop-up.
 */
export const requestNotificationPermission = async (): Promise<NotificationStatus> => {
  if (!isNotificationSupported()) {
    notifyPermissionListeners('unsupported');
    return 'unsupported';
  }

  // Pre-unlock audio & vibration on user touch
  try {
    playNewOrderChime();
    safeVibrate([200, 100, 200]);
  } catch {}

  try {
    const permission = await Notification.requestPermission();
    notifyPermissionListeners(permission as NotificationStatus);

    if (permission === 'granted') {
      // 1. Immediately send confirmation notification to verify device display
      try {
        const title = '🥛 Yogeshwari Dairy Alerts Active';
        const body = 'Order notifications are enabled! You will be alerted when new orders arrive.';
        const options: NotificationOptions = {
          body,
          icon: '/YDO_logo.png',
          badge: '/YDO_logo.png',
          tag: 'ydo-alerts-active',
          vibrate: [200, 100, 200] as any,
        };

        if (isServiceWorkerSupported()) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      } catch (confirmErr) {
        console.warn('Initial test notification note:', confirmErr);
      }

      // 2. Subscribe to ServiceWorker PushManager for background notifications
      await registerPushSubscription();
    }

    return permission as NotificationStatus;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    notifyPermissionListeners('denied');
    return 'denied';
  }
};

/**
 * Subscribes Service Worker PushManager and saves staff push subscription endpoint.
 */
export const registerPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isServiceWorkerSupported()) return null;

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
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZ_WJJPz520rqqxnqAEfINb250G_6n395kW85zk'
          ),
        });
      } catch (subErr) {
        console.warn('PushManager subscription registration note:', subErr);
      }
    }

    if (subscription) {
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

    // 1. Save in Supabase staff_push_subscriptions table
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
      // Table may be created or offline
    }

    // 2. Save in Backend
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
  // Always trigger audio chime & vibration
  try {
    playNewOrderChime();
  } catch {}
  try {
    safeVibrate([400, 150, 400, 150, 400, 600]);
  } catch {}

  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    console.warn(`System notification skipped (permission is ${permission}). Sound was played.`);
    return;
  }

  const title = `🔔 New Online Order #${order.orderNo}`;
  const body = `${order.customerName} • ₹${order.amount}\nTap to open, pack & accept order`;
  const options: NotificationOptions = {
    body,
    icon: '/YDO_logo.png',
    badge: '/YDO_logo.png',
    tag: `order-${order.orderNo}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 400, 600] as any,
    data: {
      url: `/#view=ecommerce-orders`,
      orderNo: order.orderNo,
      orderId: order.orderId,
    },
  };

  try {
    if (isServiceWorkerSupported()) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
    } else if (typeof Notification !== 'undefined') {
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
