import { useState, useEffect } from 'react';
import { realtimeManager } from '../services/realtime/realtimeManager';
import { RealtimeConnectionStatus } from '../services/realtime/realtimeTypes';

/**
 * Custom hook to monitor Supabase Realtime synchronization status
 * Returns: 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'OFFLINE' | 'ERROR'
 */
export function useRealtimeStatus(): RealtimeConnectionStatus {
  const [status, setStatus] = useState<RealtimeConnectionStatus>(() => realtimeManager.getStatus());

  useEffect(() => {
    const unsubscribe = realtimeManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
