import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useLanguage } from '../../context/LanguageContext';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { tr } = useLanguage();

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
          <span>
            {tr(
              'Internet connection restored (Back Online)',
              'इंटरनेट कनेक्शन बहाल हो गया है (Back Online)',
              'इंटरनेट कनेक्शन पूर्ववत झाले आहे (Back Online)'
            )}
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            {tr(
              'Internet disconnected — Working Offline',
              'इंटरनेट डिस्कनेक्ट हो गया है — ऑफ़लाइन मोड चालू है',
              'इंटरनेट डिस्कनेक्ट झाले आहे — ऑफलाइन मोड सुरू आहे'
            )}
          </span>
        </>
      )}
    </div>
  );
};
