/**
 * Offline Sync Service
 * Queues offline sales, stock inward/adjustments, expenses, and returns
 * Automatically synchronizes with Supabase when network connectivity returns
 */

import { supabase } from '../lib/supabase';

export interface QueuedMutation {
  id: string;
  type: 'CREATE_SALE' | 'STOCK_ADJUST' | 'STOCK_INWARD' | 'CREATE_EXPENSE' | 'CREATE_RETURN' | 'DELETE_RETURN';
  payload: any;
  createdAt: string;
}

const SYNC_QUEUE_KEY = 'yd_offline_sync_queue';

export const getOfflineQueue = (): QueuedMutation[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const enqueueOfflineMutation = (type: QueuedMutation['type'], payload: any): void => {
  if (typeof window === 'undefined') return;
  try {
    const queue = getOfflineQueue();
    const item: QueuedMutation = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString()
    };
    queue.push(item);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('offline-queue-changed'));
  } catch (err) {
    console.error('Failed to enqueue offline mutation:', err);
  }
};

export const clearOfflineQueue = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SYNC_QUEUE_KEY);
  window.dispatchEvent(new Event('offline-queue-changed'));
};

export const processOfflineSyncQueue = async (): Promise<{
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}> => {
  if (typeof window === 'undefined' || !navigator.onLine || !supabase) {
    return { success: false, syncedCount: 0, failedCount: 0, errors: ['Network offline or Supabase unavailable'] };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  const remaining: QueuedMutation[] = [];
  const errors: string[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'CREATE_SALE') {
        const { error } = await supabase.from('sales').insert([item.payload]);
        if (error) throw error;
      } else if (item.type === 'STOCK_ADJUST') {
        const { error } = await supabase.from('products').update({
          stock_quantity: item.payload.newStock
        }).eq('id', item.payload.productId);
        if (error) throw error;
      } else if (item.type === 'STOCK_INWARD') {
        const { error } = await supabase.from('product_batches').insert(item.payload.batches);
        if (error) throw error;
      } else if (item.type === 'CREATE_EXPENSE') {
        const { error } = await supabase.from('expenses').insert([item.payload]);
        if (error) throw error;
      } else if (item.type === 'CREATE_RETURN') {
        const { error } = await supabase.from('product_returns').insert([item.payload]);
        if (error) throw error;
      } else if (item.type === 'DELETE_RETURN') {
        const { error } = await supabase.from('product_returns').delete().eq('id', item.payload.id);
        if (error) throw error;
      }
      syncedCount++;
    } catch (err: any) {
      console.warn(`Failed to sync queued mutation ${item.id}:`, err);
      errors.push(err?.message || String(err));
      remaining.push(item);
    }
  }

  if (typeof window !== 'undefined') {
    if (remaining.length === 0) {
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } else {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
    }
    window.dispatchEvent(new Event('offline-queue-changed'));
  }

  return {
    success: remaining.length === 0,
    syncedCount,
    failedCount: remaining.length,
    errors
  };
};
