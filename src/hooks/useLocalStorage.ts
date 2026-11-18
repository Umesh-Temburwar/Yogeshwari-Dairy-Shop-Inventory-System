import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_SYNC_EVENT = 'ydo-local-storage-sync';

interface LocalStorageSyncDetail {
  key: string;
  value: unknown;
}

/**
 * Custom hook to sync state to localStorage safely with same-tab & cross-tab reactivity.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (val: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Keep multiple hook instances across components (and browser tabs) in sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSameTabSync = (event: Event) => {
      const customEvent = event as CustomEvent<LocalStorageSyncDetail>;
      if (customEvent.detail?.key === key) {
        setStoredValue(customEvent.detail.value as T);
      }
    };

    const handleCrossTabSync = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        setStoredValue(
          event.newValue !== null ? (JSON.parse(event.newValue) as T) : initialValue
        );
      } catch {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, handleSameTabSync);
    window.addEventListener('storage', handleCrossTabSync);
    return () => {
      window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, handleSameTabSync);
      window.removeEventListener('storage', handleCrossTabSync);
    };
  }, [key, initialValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            window.dispatchEvent(
              new CustomEvent<LocalStorageSyncDetail>(LOCAL_STORAGE_SYNC_EVENT, {
                detail: { key, value: valueToStore }
              })
            );
          }
        } catch (err) {
          console.warn(`Error setting localStorage key "${key}":`, err);
        }
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
