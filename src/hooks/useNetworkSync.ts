import { useState, useEffect, useCallback } from 'react';
import { getOfflineQueue, processOfflineSyncQueue } from '../services/offlineSyncService';

export function useNetworkSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [pendingCount, setPendingCount] = useState<number>(() => {
    return getOfflineQueue().length;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    syncedCount: number;
    failedCount: number;
    error?: string;
  } | null>(null);

  const refreshQueueCount = useCallback(() => {
    setPendingCount(getOfflineQueue().length);
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const res = await processOfflineSyncQueue();
      setLastSyncResult({
        syncedCount: res.syncedCount,
        failedCount: res.failedCount,
        error: res.errors.length > 0 ? res.errors[0] : undefined
      });
      refreshQueueCount();
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshQueueCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncNow();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleQueueChange = () => {
      refreshQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
    };
  }, [syncNow, refreshQueueCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    syncNow,
    refreshQueueCount
  };
}
