import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  RealtimeConnectionStatus,
  RealtimePayload,
  RealtimeEventCallback,
  CatalogueSignalPayload,
  SignalEventCallback,
  TableSubscriptionSpec,
  PostgresChangeEvent
} from './realtimeTypes';

type ChannelSpec =
  | { kind: 'postgres'; tables: TableSubscriptionSpec[] }
  | { kind: 'signals' };

const SIGNALS_CHANNEL_NAME = 'dairy-channel-signals';
const INVENTORY_CHANNEL_NAME = 'dairy-channel-inventory';
const SALES_CHANNEL_NAME = 'dairy-channel-sales';

/**
 * Audited Inventory Channel Subscriptions:
 * - batches: INSERT/UPDATE/DELETE (FEFO expiry & stock accuracy across counters)
 * - products: INSERT/UPDATE/DELETE (creation, editing, price, barcode, stock, active status)
 * - product_barcodes: INSERT/DELETE (barcode mappings & counts)
 * - stock_movements REMOVED: confirmed 0 UI/store consumers (eliminated pure dead traffic)
 */
const INVENTORY_TABLES: TableSubscriptionSpec[] = [
  { table: 'batches', events: ['*'] },
  { table: 'products', events: ['*'] },
  { table: 'product_barcodes', events: ['INSERT', 'DELETE'] }
];

/**
 * Audited Sales & Accounts Channel Subscriptions (event-scoped to actual consumers):
 * - sales: INSERT/UPDATE/DELETE
 * - sale_items: INSERT/UPDATE/DELETE
 * - udhar_customers: INSERT/UPDATE
 * - udhar_transactions: INSERT only (append-only ledger)
 * - damage_records: INSERT only (append-only)
 * - product_returns: INSERT/DELETE
 * - supplier_returns: INSERT/UPDATE/DELETE
 * - expenses: INSERT/DELETE
 * - purchases: INSERT only (append-only)
 */
const SALES_TABLES: TableSubscriptionSpec[] = [
  { table: 'sales', events: ['*'] },
  { table: 'sale_items', events: ['*'] },
  { table: 'udhar_customers', events: ['INSERT', 'UPDATE'] },
  { table: 'udhar_transactions', events: ['INSERT'] },
  { table: 'damage_records', events: ['INSERT'] },
  { table: 'product_returns', events: ['INSERT', 'DELETE'] },
  { table: 'supplier_returns', events: ['*'] },
  { table: 'expenses', events: ['INSERT', 'DELETE'] },
  { table: 'purchases', events: ['INSERT'] }
];

/**
 * Centralized Realtime Synchronization Manager
 *
 * Features:
 * - Single persistent shared connection set (zero per-component or per-mutation channel leaks)
 * - Event-scoped postgres_changes subscriptions matching actual consumers
 * - Ref-counted consumer registry with leak-proof cleanup via supabase.removeChannel
 * - React 19 StrictMode and Vite HMR resilient
 * - Real channel re-subscription on network recovery (fixes dead reconnectAll)
 * - Own-echo deduplication cache (12s TTL) + rapid broadcast signal coalescing (300ms)
 */
class RealtimeManager {
  private static instance: RealtimeManager;
  private status: RealtimeConnectionStatus = 'CONNECTING';
  private statusListeners = new Set<(status: RealtimeConnectionStatus) => void>();

  // Channel handles, specs (for genuine reconnect), subscriber ref-counts, and callbacks
  private activeChannels = new Map<string, RealtimeChannel>();
  private channelSpecs = new Map<string, ChannelSpec>();
  private channelSubscribers = new Map<string, Set<string>>();
  private eventCallbacks = new Map<string, Set<RealtimeEventCallback>>();
  private signalCallbacks = new Set<SignalEventCallback>();

  // Reconnection backoff state
  private retryAttempts = 0;
  private maxRetryAttempts = 6;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isReconnecting = false;

  // Own-echo deduplication cache (stores mutation IDs for 12s)
  private recentMutationIds = new Map<string, number>();

  // Rapid identical broadcast deduplication (300ms window)
  private recentSignals = new Map<string, number>();

  private constructor() {
    this.initLifecycleListeners();
  }

  public static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

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

  public registerOwnMutation(mutationId: string) {
    if (!mutationId) return;
    this.recentMutationIds.set(mutationId, Date.now());
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

  public subscribeToInventory(subscriberId: string, callback: RealtimeEventCallback): () => void {
    return this.registerChannelSubscriber(
      INVENTORY_CHANNEL_NAME,
      subscriberId,
      INVENTORY_TABLES,
      callback
    );
  }

  public subscribeToSales(subscriberId: string, callback: RealtimeEventCallback): () => void {
    return this.registerChannelSubscriber(
      SALES_CHANNEL_NAME,
      subscriberId,
      SALES_TABLES,
      callback
    );
  }

  /**
   * Subscribe to Shared Signals Broadcast Channel (`dairy-channel-signals`).
   * Uses a ref-counted callback Set so StrictMode remounts or multiple consumers
   * never leave stale closures or duplicate channels.
   */
  public subscribeToSignals(subscriberId: string, callback: SignalEventCallback): () => void {
    this.ensureSubscriberSet(SIGNALS_CHANNEL_NAME, subscriberId);
    this.channelSpecs.set(SIGNALS_CHANNEL_NAME, { kind: 'signals' });
    this.signalCallbacks.add(callback);

    if (!this.activeChannels.has(SIGNALS_CHANNEL_NAME) && supabase) {
      this.mountSignalsChannel();
    }

    return () => {
      this.signalCallbacks.delete(callback);
      this.unregisterChannelSubscriber(SIGNALS_CHANNEL_NAME, subscriberId);
    };
  }

  /**
   * Broadcast a lightweight invalidation signal over the EXISTING subscribed
   * `dairy-channel-signals` channel. Never creates orphan per-mutation channels
   * and coalesces duplicate signals fired within 300ms.
   */
  public async emitSignal(signal: CatalogueSignalPayload): Promise<void> {
    if (!supabase) return;

    const dedupeKey = `${signal.type}:${signal.entity || ''}:${signal.action || ''}:${signal.id || ''}`;
    const now = Date.now();
    const lastSent = this.recentSignals.get(dedupeKey);
    if (lastSent && now - lastSent < 300) {
      return;
    }
    this.recentSignals.set(dedupeKey, now);
    if (this.recentSignals.size > 100) {
      for (const [k, ts] of this.recentSignals.entries()) {
        if (now - ts > 5000) this.recentSignals.delete(k);
      }
    }

    const channel = this.activeChannels.get(SIGNALS_CHANNEL_NAME);
    if (!channel) {
      // No active shared signals channel subscribed — skip creating an orphan channel
      return;
    }

    try {
      await channel.send({
        type: 'broadcast',
        event: 'CATALOGUE_SIGNAL',
        payload: signal
      });
    } catch (err) {
      console.warn('[RealtimeManager] emitSignal notice:', err);
    }
  }

  private mountSignalsChannel(): void {
    if (!supabase || this.activeChannels.has(SIGNALS_CHANNEL_NAME)) return;

    const channel = supabase.channel(SIGNALS_CHANNEL_NAME, {
      config: { broadcast: { self: false } }
    });

    channel.on('broadcast', { event: 'CATALOGUE_SIGNAL' }, (msg) => {
      if (msg?.payload) {
        const payload = msg.payload as CatalogueSignalPayload;
        this.signalCallbacks.forEach((cb) => {
          try {
            cb(payload);
          } catch (e) {
            console.error('[RealtimeManager] Error in signal callback:', e);
          }
        });
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.retryAttempts = 0;
        this.setStatus('CONNECTED');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.setStatus('RECONNECTING');
        this.scheduleReconnect();
      }
    });

    this.activeChannels.set(SIGNALS_CHANNEL_NAME, channel);
  }

  private mountPostgresChannel(channelName: string, tables: TableSubscriptionSpec[]): void {
    if (!supabase || this.activeChannels.has(channelName)) return;

    const channel = supabase.channel(channelName);

    tables.forEach(({ table, events }) => {
      events.forEach((ev: PostgresChangeEvent) => {
        channel.on(
          'postgres_changes' as 'system',
          { event: ev, schema: 'public', table } as unknown as { event: string },
          (rawPayload: unknown) => {
            const payload = rawPayload as {
              eventType: RealtimePayload['eventType'];
              new?: Record<string, unknown>;
              old?: Record<string, unknown>;
            };

            const normalized: RealtimePayload = {
              table,
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              timestamp: Date.now(),
              clientMutationId:
                (typeof payload.new?.idempotency_key === 'string'
                  ? payload.new.idempotency_key
                  : undefined) ||
                (typeof payload.new?.client_mutation_id === 'string'
                  ? payload.new.client_mutation_id
                  : undefined)
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
    });

    channel.subscribe((status) => {
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

  private registerChannelSubscriber(
    channelName: string,
    subscriberId: string,
    tables: TableSubscriptionSpec[],
    callback: RealtimeEventCallback
  ): () => void {
    this.ensureSubscriberSet(channelName, subscriberId);
    this.channelSpecs.set(channelName, { kind: 'postgres', tables });

    if (!this.eventCallbacks.has(channelName)) {
      this.eventCallbacks.set(channelName, new Set());
    }
    this.eventCallbacks.get(channelName)!.add(callback);

    if (!this.activeChannels.has(channelName) && supabase) {
      this.mountPostgresChannel(channelName, tables);
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

  private unregisterChannelSubscriber(channelName: string, subscriberId: string) {
    const subs = this.channelSubscribers.get(channelName);
    if (subs) {
      subs.delete(subscriberId);
      if (subs.size === 0) {
        this.channelSubscribers.delete(channelName);
        this.eventCallbacks.delete(channelName);
        this.channelSpecs.delete(channelName);
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

  public scheduleReconnect() {
    if (this.isReconnecting || typeof window === 'undefined') return;
    if (this.channelSubscribers.size === 0) return;
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

  /**
   * Cleanly tears down broken channels AND re-mounts every channel that still
   * has active subscribers so multi-device sync genuinely resumes after drops.
   */
  public reconnectAll() {
    if (!supabase) return;
    for (const [, channel] of this.activeChannels.entries()) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
    this.activeChannels.clear();

    if (this.channelSubscribers.size === 0) {
      this.setStatus('OFFLINE');
      return;
    }

    this.setStatus('CONNECTING');
    for (const [channelName, subs] of this.channelSubscribers.entries()) {
      if (subs.size === 0) continue;
      const spec = this.channelSpecs.get(channelName);
      if (!spec) continue;
      if (spec.kind === 'signals') {
        this.mountSignalsChannel();
      } else {
        this.mountPostgresChannel(channelName, spec.tables);
      }
    }
  }

  private initLifecycleListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.retryAttempts = 0;
      if (this.status !== 'CONNECTED' && this.channelSubscribers.size > 0) {
        this.scheduleReconnect();
      }
    });

    window.addEventListener('offline', () => {
      this.setStatus('OFFLINE');
    });

    // Only reconnect on visibilitychange when actually disconnected (no redundant window focus listener)
    document.addEventListener('visibilitychange', () => {
      if (
        document.visibilityState === 'visible' &&
        navigator.onLine !== false &&
        this.status !== 'CONNECTED' &&
        this.channelSubscribers.size > 0
      ) {
        this.retryAttempts = 0;
        this.scheduleReconnect();
      }
    });
  }
}

export const realtimeManager = RealtimeManager.getInstance();
