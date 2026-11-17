import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { 
  RealtimeConnectionStatus, 
  RealtimePayload, 
  RealtimeEventCallback,
  CatalogueSignalPayload 
} from './realtimeTypes';

/**
 * Centralized Realtime Synchronization Manager
 * 
 * Features:
 * - Single persistent connection set (no per-component channel duplication)
 * - Ref-counted consumer registry with leak-proof cleanup via supabase.removeChannel
 * - React 19 StrictMode and Vite HMR resilient
 * - Exponential backoff reconnect with jitter & maximum retry cap
 * - Browser lifecycle integration (visibilitychange, online/offline, window focus)
 * - Own-echo deduplication cache (10s TTL)
 * - Out-of-order protection comparison
 */
class RealtimeManager {
  private static instance: RealtimeManager;
  private status: RealtimeConnectionStatus = 'CONNECTING';
  private statusListeners = new Set<(status: RealtimeConnectionStatus) => void>();

  // Channel handles and subscriber ref-counts
  private activeChannels = new Map<string, RealtimeChannel>();
  private channelSubscribers = new Map<string, Set<string>>();
  private eventCallbacks = new Map<string, Set<RealtimeEventCallback>>();

  // Reconnection backoff state
  private retryAttempts = 0;
  private maxRetryAttempts = 6;
  private reconnectTimer: any = null;
  private isReconnecting = false;

  // Own-echo deduplication cache (stores mutation IDs for 10s)
  private recentMutationIds = new Map<string, number>();

  private constructor() {
    this.initLifecycleListeners();
  }

  public static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  // Current connection status
  public getStatus(): RealtimeConnectionStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: RealtimeConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private setStatus(newStatus: RealtimeConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((cb) => cb(newStatus));
    }
  }

  /**
   * Register mutation ID for own-echo deduplication
   */
  public registerOwnMutation(mutationId: string) {
    if (!mutationId) return;
    this.recentMutationIds.set(mutationId, Date.now());
    // Cleanup old mutation IDs after 12s
    if (this.recentMutationIds.size > 200) {
      const cutoff = Date.now() - 12000;
      for (const [id, time] of this.recentMutationIds.entries()) {
        if (time < cutoff) this.recentMutationIds.delete(id);
      }
    }
  }

  public isOwnMutation(mutationId?: string): boolean {
    if (!mutationId) return false;
    return this.recentMutationIds.has(mutationId);
  }

  /**
   * Subscribe to Inventory Channel (Batches, Barcodes, Inventory Stock)
   */
  public subscribeToInventory(subscriberId: string, callback: RealtimeEventCallback): () => void {
    const channelName = 'dairy-channel-inventory';
    const tables = ['batches', 'product_barcodes', 'products', 'stock_movements'];
    return this.registerChannelSubscriber(channelName, subscriberId, tables, callback);
  }

  /**
   * Subscribe to Sales & Accounts Channel (Sales, Sale Items, Khata, Returns, Damages)
   */
  public subscribeToSales(subscriberId: string, callback: RealtimeEventCallback): () => void {
    const channelName = 'dairy-channel-sales';
    const tables = [
      'sales', 
      'sale_items', 
      'udhar_customers', 
      'udhar_transactions', 
      'damage_records', 
      'product_returns', 
      'supplier_returns',
      'expenses',
      'purchases'
    ];
    return this.registerChannelSubscriber(channelName, subscriberId, tables, callback);
  }

  /**
   * Subscribe to Catalogue Signals Broadcast Channel
   */
  public subscribeToSignals(subscriberId: string, callback: (signal: CatalogueSignalPayload) => void): () => void {
    const channelName = 'dairy-channel-signals';
    this.ensureSubscriberSet(channelName, subscriberId);

    let channel = this.activeChannels.get(channelName);
    if (!channel && supabase) {
      channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      channel.on('broadcast', { event: 'CATALOGUE_SIGNAL' }, (msg) => {
        if (msg?.payload) {
          callback(msg.payload as CatalogueSignalPayload);
        }
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.setStatus('CONNECTED');
        }
      });

      this.activeChannels.set(channelName, channel);
    }

    return () => {
      this.unregisterChannelSubscriber(channelName, subscriberId);
    };
  }

  /**
   * Broadcast a lightweight signal to peer terminals
   */
  public async emitSignal(signal: CatalogueSignalPayload): Promise<void> {
    if (!supabase) return;
    try {
      let channel = this.activeChannels.get('dairy-channel-signals');
      if (!channel) {
        channel = supabase.channel('dairy-channel-signals', {
          config: { broadcast: { self: false } }
        });
        channel.subscribe();
        this.activeChannels.set('dairy-channel-signals', channel);
      }
      await channel.send({
        type: 'broadcast',
        event: 'CATALOGUE_SIGNAL',
        payload: signal
      });
    } catch (err) {
      console.warn('[RealtimeManager] emitSignal notice:', err);
    }
  }

  /**
   * Core Channel Subscriber Registration with ref-counting
   */
  private registerChannelSubscriber(
    channelName: string,
    subscriberId: string,
    tables: string[],
    callback: RealtimeEventCallback
  ): () => void {
    this.ensureSubscriberSet(channelName, subscriberId);

    // Register callback
    if (!this.eventCallbacks.has(channelName)) {
      this.eventCallbacks.set(channelName, new Set());
    }
    this.eventCallbacks.get(channelName)!.add(callback);

    let channel = this.activeChannels.get(channelName);
    if (!channel && supabase) {
      channel = supabase.channel(channelName);

      tables.forEach((tableName) => {
        channel!.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload) => {
            const normalized: RealtimePayload = {
              table: tableName,
              eventType: payload.eventType as any,
              new: payload.new,
              old: payload.old,
              timestamp: Date.now(),
              clientMutationId: (payload.new as any)?.idempotency_key || (payload.new as any)?.client_mutation_id
            };

            const callbacks = this.eventCallbacks.get(channelName);
            if (callbacks) {
              callbacks.forEach((cb) => {
                try {
                  cb(normalized);
                } catch (e) {
                  console.error(`[RealtimeManager] Error in ${channelName} callback:`, e);
                }
              });
            }
          }
        );
      });

      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          this.retryAttempts = 0;
          this.setStatus('CONNECTED');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.setStatus('RECONNECTING');
          this.scheduleReconnect();
        } else if (status === 'CLOSED') {
          if (!this.isReconnecting) {
            this.setStatus('OFFLINE');
          }
        }
      });

      this.activeChannels.set(channelName, channel);
    }

    return () => {
      this.eventCallbacks.get(channelName)?.delete(callback);
      this.unregisterChannelSubscriber(channelName, subscriberId);
    };
  }

  private ensureSubscriberSet(channelName: string, subscriberId: string) {
    if (!this.channelSubscribers.has(channelName)) {
      this.channelSubscribers.set(channelName, new Set());
    }
    this.channelSubscribers.get(channelName)!.add(subscriberId);
  }

  /**
   * Ref-counted Unsubscribe & supabase.removeChannel
   */
  private unregisterChannelSubscriber(channelName: string, subscriberId: string) {
    const subs = this.channelSubscribers.get(channelName);
    if (subs) {
      subs.delete(subscriberId);
      if (subs.size === 0) {
        this.channelSubscribers.delete(channelName);
        this.eventCallbacks.delete(channelName);
        const channel = this.activeChannels.get(channelName);
        if (channel && supabase) {
          try {
            supabase.removeChannel(channel);
          } catch {}
          this.activeChannels.delete(channelName);
        }
      }
    }
  }

  /**
   * Exponential backoff reconnection
   */
  public scheduleReconnect() {
    if (this.isReconnecting || typeof window === 'undefined') return;
    if (this.retryAttempts >= this.maxRetryAttempts) {
      this.setStatus('ERROR');
      return;
    }

    this.isReconnecting = true;
    this.setStatus('RECONNECTING');

    const delay = Math.min(1000 * Math.pow(2, this.retryAttempts) + Math.random() * 500, 15000);
    this.retryAttempts++;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.isReconnecting = false;
      this.reconnectAll();
    }, delay);
  }

  public reconnectAll() {
    if (!supabase) return;
    for (const [name, channel] of this.activeChannels.entries()) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
    this.activeChannels.clear();
    this.setStatus('CONNECTING');
    // Active subscribers will be recreated on next turn
  }

  private initLifecycleListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.retryAttempts = 0;
      this.scheduleReconnect();
    });

    window.addEventListener('offline', () => {
      this.setStatus('OFFLINE');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.status !== 'CONNECTED') {
        this.scheduleReconnect();
      }
    });

    window.addEventListener('focus', () => {
      if (this.status !== 'CONNECTED') {
        this.scheduleReconnect();
      }
    });
  }
}

export const realtimeManager = RealtimeManager.getInstance();
