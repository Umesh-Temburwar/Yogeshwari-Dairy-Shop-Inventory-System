import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[99999] py-1.5 px-4 text-xs font-bold text-center transition-all duration-300 flex items-center justify-center gap-2 shadow-md ${
        isOnline
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-600 text-white animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span>इंटरनेट कनेक्शन पूर्ववत झाले आहे (Back Online)</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>इंटरनेट डिस्कनेक्ट झाले आहे - ऑफलाइन मोड सुरू आहे (Working Offline)</span>
        </>
      )}
    </div>
  );
};
