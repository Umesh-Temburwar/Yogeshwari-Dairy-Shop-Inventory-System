import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { isNativePlatform } from '../services/capacitorService';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      const timer = setTimeout(() => setWasOffline(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capacitor Native Network Listener
    let nativeListenerPromise: Promise<{ remove: () => Promise<void> }> | null = null;
    if (isNativePlatform()) {
      void Network.getStatus().then((status) => {
        setIsOnline(status.connected);
      });
      nativeListenerPromise = Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
          handleOnline();
        } else {
          handleOffline();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (nativeListenerPromise) {
        void nativeListenerPromise.then((handle) => handle.remove());
      }
    };
  }, []);

  return { isOnline, wasOffline };
}
