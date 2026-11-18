/**
 * Realtime Synchronization Types
 * Yogeshwari Dairy Shop Inventory / ERP System
 */

export type RealtimeConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'ERROR';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | 'BROADCAST';

export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface TableSubscriptionSpec {
  table: string;
  events: PostgresChangeEvent[];
}

export interface RealtimePayload<T = unknown> {
  table: string;
  eventType: RealtimeEventType;
  new?: T;
  old?: Partial<T>;
  timestamp: number;
  clientMutationId?: string;
}

export type RealtimeEventCallback<T = unknown> = (payload: RealtimePayload<T>) => void;

export interface CatalogueSignalPayload {
  type: 'CATALOGUE_ITEM_CHANGED' | 'CATALOGUE_BULK_CHANGED' | 'IMAGE_UPDATED' | 'STORE_MUTATION';
  entity?: string;
  action?: string;
  id?: string;
  updated_at?: string;
  batch_count?: number;
}

export type SignalEventCallback = (signal: CatalogueSignalPayload) => void;
