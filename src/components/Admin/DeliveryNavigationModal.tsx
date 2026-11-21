import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X,
  Navigation,
  Phone,
  Compass,
  MapPin,
  Clock,
  ExternalLink,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Truck,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import { EcommerceOrder, EcommerceOrderStatus } from '@/types';

interface DeliveryNavigationModalProps {
  order: EcommerceOrder;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: EcommerceOrderStatus, paymentStatus?: 'PAID' | 'PENDING') => Promise<void>;
}

// Store Coordinates: Mandi Bazar, Mangalwar Peth Road, Ambajogai
const STORE_COORDINATES = {
  lat: 18.7304,
  lng: 76.3879,
  name: 'Yogeshwari Dairy Products (Store)',
};

// Available Store Delivery Riders
const DELIVERY_RIDERS = [
  { name: 'Sunil Rao', phone: '+91 98765 43210', vehicle: 'MH-31-DY-1008' },
  { name: 'Ganesh Pawar', phone: '+91 94221 88990', vehicle: 'MH-44-AB-2020' },
  { name: 'Store Express Fleet', phone: '+91 93708 69896', vehicle: 'Store E-Bike' },
];

export const DeliveryNavigationModal: React.FC<DeliveryNavigationModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);

  // Address & Coordinate extraction
  const addr = (order.delivery_address || {}) as any;
  const destLat = typeof addr.latitude === 'number' && !isNaN(addr.latitude) ? addr.latitude : 18.7304;
  const destLng = typeof addr.longitude === 'number' && !isNaN(addr.longitude) ? addr.longitude : 76.3879;
  const hasExactGps = Boolean(addr.latitude && addr.longitude);

  // State
  const [isNavigating, setIsNavigating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: string; durationMins: string } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState(DELIVERY_RIDERS[0].name);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [destLat, destLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // 1. Store Origin Pin (Blue/Emerald)
      const storeIcon = L.divIcon({
        className: 'custom-store-pin',
        html: `
          <div style="width: 32px; height: 32px; background: #0F766E; border: 2.5px solid #FFFFFF; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
            <span style="transform: rotate(45deg); font-size: 14px;">🥛</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([STORE_COORDINATES.lat, STORE_COORDINATES.lng], { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<b>${STORE_COORDINATES.name}</b><br/>Origin / Dispatch Counter`);

      // 2. Customer Destination Pin (Red/Rose)
      const custIcon = L.divIcon({
        className: 'custom-customer-dest-pin',
        html: `
          <div style="width: 36px; height: 36px; background: #E11D48; border: 3px solid #FFFFFF; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.45);">
            <span style="transform: rotate(45deg); font-size: 16px;">🏠</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      L.marker([destLat, destLng], { icon: custIcon })
        .addTo(map)
        .bindPopup(`<b>Delivery Destination:</b><br/>${order.customer_name}<br/>${addr.street || ''}`)
        .openPopup();

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [destLat, destLng]);

  // Request OSRM Driving Route
  const fetchAndDrawRoute = async (originLat: number, originLng: number) => {
    if (!mapInstanceRef.current) return;
    setIsRouting(true);
    setGpsError(null);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Routing service returned error');
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No driving route found to this location');
      }

      const route = data.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMins = Math.ceil(route.duration / 60);

      setRouteInfo({
        distanceKm: `${distanceKm} km`,
        durationMins: `${durationMins} mins`,
      });

      // Clear previous route
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
      }

      // Draw road polyline
      const routeLayer = L.geoJSON(route.geometry, {
        style: {
          color: '#0C831F',
          weight: 5,
          opacity: 0.85,
          dashArray: '1, 6',
          lineCap: 'round',
        },
      }).addTo(mapInstanceRef.current);

      routeLayerRef.current = routeLayer;

      // Fit map bounds to encompass full route
      mapInstanceRef.current.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
      setIsNavigating(true);
    } catch (err: any) {
      console.warn('Routing error:', err);
      setGpsError('Could not calculate real road route. Using direct view.');
    } finally {
      setIsRouting(false);
    }
  };

  // Start In-App Live Navigation with Rider GPS
  const handleStartInAppNavigation = () => {
    if (!navigator.geolocation) {
      // Fallback: draw route from Store to Customer
      fetchAndDrawRoute(STORE_COORDINATES.lat, STORE_COORDINATES.lng);
      return;
    }

    setIsRouting(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const riderLat = pos.coords.latitude;
        const riderLng = pos.coords.longitude;

        if (mapInstanceRef.current) {
          // Add or update rider marker
          if (!riderMarkerRef.current) {
            const riderIcon = L.divIcon({
              className: 'custom-rider-pin',
              html: `
                <div style="width: 30px; height: 30px; background: #2563EB; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(37, 99, 235, 0.6);">
                  <span style="font-size: 14px;">🛵</span>
                </div>
              `,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });

            riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup('<b>Current Delivery Rider Position</b>');
          } else {
            riderMarkerRef.current.setLatLng([riderLat, riderLng]);
          }
        }

        fetchAndDrawRoute(riderLat, riderLng);
      },
      (_err) => {
        // Geolocation denied or unavailable -> Route from Store
        setGpsError('GPS permission not granted. Showing route from Yogeshwari Dairy store counter.');
        fetchAndDrawRoute(STORE_COORDINATES.lat, STORE_COORDINATES.lng);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Open external Google Maps / Apple Maps fallback
  const handleOpenExternalMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Status transitions
  const handleSetOutForDelivery = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, 'OUT_FOR_DELIVERY');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetDelivered = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, 'DELIVERED', 'PAID');
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#131F1B] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#24352F] overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1E3029] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Delivery Map & Turn Navigation
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  #{order.order_no}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {hasExactGps ? '📍 Customer Confirmed GPS Pin' : '⚠️ Street Address (Ambajogai)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#1A2A25] flex items-center justify-center text-slate-500 hover:text-black dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[280px] sm:min-h-[340px]">
          <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '300px' }} />

          {/* Route Distance & ETA Pill */}
          {routeInfo && (
            <div className="absolute top-3 left-3 z-[400] bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-xs p-2.5 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-lg flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400">
                <Navigation className="w-4 h-4" />
                <span>{routeInfo.distanceKm}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-white">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>ETA {routeInfo.durationMins}</span>
              </div>
            </div>
          )}

          {/* External Map Trigger */}
          <button
            type="button"
            onClick={handleOpenExternalMaps}
            className="absolute bottom-3 right-3 z-[400] bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#24352F] shadow-md text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Details & Action Controls */}
        <div className="p-4 bg-slate-50 dark:bg-[#16231E] border-t border-slate-100 dark:border-[#1E3029] space-y-3 shrink-0 overflow-y-auto max-h-[40vh] pb-safe">
          {gpsError && (
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Destination Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F]">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{order.customer_name}</span>
                <a
                  href={`tel:${order.customer_phone}`}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call {order.customer_phone}</span>
                </a>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                {addr.houseNo ? `${addr.houseNo}, ` : ''}
                {addr.street || addr.address_line1 || 'Main Road'}
                {addr.area ? `, ${addr.area}` : ''}
                {addr.landmark ? `, Near ${addr.landmark}` : ''}
              </p>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {addr.city || 'Ambajogai'} - {addr.pincode || '431517'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Cash / Payment Due</div>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  ₹{order.total_amount}{' '}
                  <span className="text-[10px] font-normal text-slate-500">
                    ({order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online / UPI'})
                  </span>
                </div>
              </div>
              {order.delivery_notes && (
                <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1 rounded mt-1">
                  <b>Note:</b> {order.delivery_notes}
                </div>
              )}
            </div>
          </div>

          {/* Rider Assignment & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Rider:</span>
              <select
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="text-xs font-bold p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2A25] text-slate-800 dark:text-white focus:outline-none"
              >
                {DELIVERY_RIDERS.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name} ({r.vehicle})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Live Navigation Route Trigger */}
              <button
                type="button"
                disabled={isRouting}
                onClick={handleStartInAppNavigation}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {isRouting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>{isNavigating ? 'Recalculate Route' : 'Show Driving Route'}</span>
              </button>

              {/* Status Update to OUT_FOR_DELIVERY */}
              {order.order_status !== 'OUT_FOR_DELIVERY' && order.order_status !== 'DELIVERED' && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSetOutForDelivery}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Start Delivery</span>
                </button>
              )}

              {/* Status Update to DELIVERED */}
              {order.order_status === 'OUT_FOR_DELIVERY' && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSetDelivered}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Delivered</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
