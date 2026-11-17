/**
 * Realtime Synchronization Types
 * Yogeshwari Dairy Shop Inventory / ERP System
 */

export type RealtimeConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'ERROR';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | 'BROADCAST';

export interface RealtimePayload<T = any> {
  table: string;
  eventType: RealtimeEventType;
  new?: T;
  old?: Partial<T>;
  timestamp: number;
  clientMutationId?: string;
}

export type RealtimeEventCallback<T = any> = (payload: RealtimePayload<T>) => void;

export interface CatalogueSignalPayload {
  type: 'CATALOGUE_ITEM_CHANGED' | 'CATALOGUE_BULK_CHANGED' | 'IMAGE_UPDATED';
  id?: string;
  updated_at?: string;
  batch_count?: number;
}
