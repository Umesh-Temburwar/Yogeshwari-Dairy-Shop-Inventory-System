import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  Copy,
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
  Compass,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Bike,
  RefreshCw,
  Info,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Yogeshwari Dairy default anchor coordinates (Ambajogai store)
const SHOP_LOCATION: [number, number] = [18.7289, 76.3824];

export interface DeliveryAddressData {
  recipient_name?: string;
  name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  delivery_instructions?: string;
  instructions?: string;
}

export interface DeliveryMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  orderStatus: string;
  deliveryAddress: DeliveryAddressData | any;
  customerPhone?: string;
  customerName?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryPartnerVehicle?: string;
  onStartDelivery?: () => void;
  onMarkDelivered?: () => void;
}

// Custom Leaflet DivIcon for Customer Destination (High-vis Red & Gold Target Pin)
const createDestinationIcon = () =>
  L.divIcon({
    className: 'custom-customer-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <span style="position: absolute; width: 40px; height: 40px; border-radius: 9999px; background: rgba(239, 68, 68, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: #dc2626; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
          📍
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 34],
    popupAnchor: [0, -32],
  });

// Custom Leaflet DivIcon for Rider / Live GPS (Emerald Pulse Pin)
const createRiderIcon = () =>
  L.divIcon({
    className: 'custom-rider-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <span style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: rgba(16, 185, 129, 0.4); animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: #059669; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
          🛵
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });

// Component to adjust map bounds when route or markers change
const MapBoundsAdjuster: React.FC<{ bounds: [number, number][] }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch {}
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }
  }, [map, bounds]);
  return null;
};

export const DeliveryMapModal: React.FC<DeliveryMapModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  orderStatus,
  deliveryAddress,
  customerPhone,
  customerName,
  deliveryPartnerName,
  deliveryPartnerPhone,
  deliveryPartnerVehicle,
  onStartDelivery,
  onMarkDelivered,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [riderGps, setRiderGps] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // OSRM Routing states
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // Extract normalized fields
  const rawLat = deliveryAddress?.latitude ?? deliveryAddress?.lat;
  const rawLng = deliveryAddress?.longitude ?? deliveryAddress?.lng;
  const hasCoordinates =
    typeof rawLat === 'number' &&
    !isNaN(rawLat) &&
    typeof rawLng === 'number' &&
    !isNaN(rawLng) &&
    rawLat >= -90 &&
    rawLat <= 90 &&
    rawLng >= -180 &&
    rawLng <= 180;

  const destCoords: [number, number] = hasCoordinates
    ? [Number(rawLat), Number(rawLng)]
    : SHOP_LOCATION;

  const street =
    deliveryAddress?.address_line1 ||
    deliveryAddress?.street ||
    'Address not provided';
  const line2 = deliveryAddress?.address_line2 || '';
  const landmark = deliveryAddress?.landmark || '';
  const city = deliveryAddress?.city || 'Ambajogai';
  const state = deliveryAddress?.state || 'Maharashtra';
  const pincode = deliveryAddress?.pincode || '';
  const instructions =
    deliveryAddress?.delivery_instructions ||
    deliveryAddress?.instructions ||
    '';
  const phone = customerPhone || deliveryAddress?.phone || '';
  const name = customerName || deliveryAddress?.recipient_name || deliveryAddress?.name || 'Customer';

  const fullAddressString = [
    street,
    line2,
    landmark ? `Near ${landmark}` : '',
    `${city} ${pincode}`,
    state,
  ]
    .filter(Boolean)
    .join(', ');

  // Fetch legitimate OSRM Driving Route
  const fetchOsrmRoute = async (start: [number, number], end: [number, number]) => {
    setIsLoadingRoute(true);
    setRoutingError(null);
    try {
      // OSRM expects coordinates in lng,lat format
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Routing service responded with HTTP ${res.status}`);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // GeoJSON coordinates are [lng, lat], Leaflet needs [lat, lng]
        const latLngs: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        setRouteCoordinates(latLngs);
        // Distance from provider in meters -> km
        setRouteDistanceKm(Number((route.distance / 1000).toFixed(2)));
        // Duration from provider in seconds -> minutes
        setRouteDurationMin(Math.max(1, Math.round(route.duration / 60)));
      } else {
        throw new Error(data.message || 'No valid route found between locations');
      }
    } catch (err: any) {
      console.warn('OSRM Route fetch error:', err.message);
      setRoutingError('Unable to fetch road route from OpenStreetMap routing service. Showing straight distance marker.');
      // Direct polyline fallback
      setRouteCoordinates([start, end]);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Request device GPS location
  const requestCurrentLocation = (startTracking = false) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setRiderGps(coords);
        setIsLocating(false);

        if (hasCoordinates) {
          fetchOsrmRoute(coords, destCoords);
        }

        if (startTracking) {
          setIsLiveTracking(true);
          watchIdRef.current = navigator.geolocation.watchPosition(
            (updatedPos) => {
              const newCoords: [number, number] = [
                updatedPos.coords.latitude,
                updatedPos.coords.longitude,
              ];
              setRiderGps(newCoords);
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
          );
        }
      },
      (err) => {
        setIsLocating(false);
        setIsLiveTracking(false);
        if (err.code === 1) {
          setGpsError('GPS permission was denied. Please allow location access to view route directions.');
        } else if (err.code === 2) {
          setGpsError('GPS position unavailable. Please check device location settings.');
        } else {
          setGpsError('GPS request timed out.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Cleanup location tracking on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLiveTracking(false);
      setRouteCoordinates([]);
      setRouteDistanceKm(null);
      setRouteDurationMin(null);
      setGpsError(null);
      setRoutingError(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    try {
      navigator.clipboard.writeText(fullAddressString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const getGoogleMapsDirectionsUrl = () => {
    if (hasCoordinates) {
      return `https://www.google.com/maps/dir/?api=1&destination=${destCoords[0]},${destCoords[1]}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressString)}`;
  };

  // Compute map bounds
  const activeBounds: [number, number][] = [];
  if (riderGps) activeBounds.push(riderGps);
  if (hasCoordinates) activeBounds.push(destCoords);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div
        className={`bg-white dark:bg-[#131F1B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 w-full ${
          isFullscreen
            ? 'fixed inset-0 rounded-none z-50 h-full'
            : 'max-w-4xl max-h-[92vh] h-[850px]'
        }`}
      >
        {/* Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Delivery Destination Map
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                  #{orderNumber}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase">
                  {orderStatus.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                In-app OpenStreetMap route & customer location
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Map"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Warning / Notification Banners */}
        {!hasCoordinates && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>GPS Pin Unavailable:</strong> Customer placed order without GPS geolocation. Showing city center anchor and text address.
            </span>
          </div>
        )}

        {gpsError && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{gpsError}</span>
            </div>
            <button
              onClick={() => requestCurrentLocation(false)}
              className="text-[11px] underline font-bold hover:text-rose-900"
            >
              Retry GPS
            </button>
          </div>
        )}

        {routingError && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300 shrink-0">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{routingError}</span>
          </div>
        )}

        {/* Route Stats Ribbon (When calculated via OSRM) */}
        {routeDistanceKm !== null && routeDurationMin !== null && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold shadow-xs shrink-0">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                <span>Road Distance: {routeDistanceKm} km</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Estimated Drive: ~{routeDurationMin} mins</span>
              </span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
              OSRM Verified Route
            </span>
          </div>
        )}

        {/* Interactive Leaflet Map Container */}
        <div className="flex-1 relative min-h-[300px] w-full bg-slate-100 dark:bg-slate-900">
          <MapContainer
            center={destCoords}
            zoom={hasCoordinates ? 15 : 13}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%', minHeight: '300px' }}
          >
            {/* Free OpenStreetMap Standard Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {/* Adjust bounds if both rider & customer exist */}
            {activeBounds.length > 0 && <MapBoundsAdjuster bounds={activeBounds} />}

            {/* Destination Marker */}
            {hasCoordinates && (
              <Marker position={destCoords} icon={createDestinationIcon()}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-slate-900">📍 {name}</p>
                    <p className="text-slate-600">{street}</p>
                    {landmark && <p className="text-slate-500">Landmark: {landmark}</p>}
                    {instructions && (
                      <p className="text-emerald-700 font-semibold bg-emerald-50 p-1 rounded">
                        Note: {instructions}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Live Rider Marker */}
            {riderGps && (
              <Marker position={riderGps} icon={createRiderIcon()}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-emerald-800">🛵 Your Current Location</p>
                    <p className="text-slate-500 text-[10px]">
                      {riderGps[0].toFixed(5)}, {riderGps[1].toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Road Route Polyline */}
            {routeCoordinates.length > 1 && (
              <Polyline
                positions={routeCoordinates}
                color="#059669"
                weight={5}
                opacity={0.85}
                dashArray={routingError ? '8, 8' : undefined}
              />
            )}
          </MapContainer>

          {/* Quick Controls Floating Pill over Map */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => requestCurrentLocation(true)}
              disabled={isLocating}
              className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-2.5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Locate my position & compute driving route"
            >
              {isLocating ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Compass className={`w-4 h-4 ${isLiveTracking ? 'text-emerald-600' : 'text-slate-600'}`} />
              )}
              <span className="hidden sm:inline">
                {isLiveTracking ? 'Live GPS Active' : 'My GPS Route'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Details & Action Panel (Mobile Safe with Touch Padding) */}
        <div className="p-4 sm:p-5 bg-white dark:bg-[#131F1B] border-t border-slate-200 dark:border-slate-800 space-y-4 shrink-0 pb-safe">
          {/* Customer & Address Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-[#1A2A25] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-white mb-1.5">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Customer Destination</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="text-emerald-600 hover:text-emerald-700 text-[11px] font-bold flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {fullAddressString}
              </p>

              {instructions && (
                <div className="mt-2 text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-2 rounded-xl border border-amber-200 dark:border-amber-800/40">
                  <span className="font-bold">Instructions: </span>
                  <span>{instructions}</span>
                </div>
              )}
            </div>

            {/* Recipient & Assigned Rider Card */}
            <div className="bg-slate-50 dark:bg-[#1A2A25] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Recipient Contact
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{phone || 'Phone not listed'}</p>
                  </div>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      title="Call Customer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Customer</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Rider Info if assigned */}
              {deliveryPartnerName && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {deliveryPartnerName}
                      </span>
                      {deliveryPartnerVehicle && (
                        <span className="text-slate-500 text-[10px] ml-1">
                          ({deliveryPartnerVehicle})
                        </span>
                      )}
                    </div>
                  </div>
                  {deliveryPartnerPhone && (
                    <a
                      href={`tel:${deliveryPartnerPhone}`}
                      className="text-emerald-600 font-bold text-[11px] hover:underline"
                    >
                      Call Rider
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <a
                href={getGoogleMapsDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Open External Navigation (Google Maps)</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              {orderStatus === 'CONFIRMED' && onStartDelivery && (
                <button
                  type="button"
                  onClick={onStartDelivery}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Bike className="w-4 h-4" />
                  <span>Start Quick Delivery</span>
                </button>
              )}

              {orderStatus === 'OUT_FOR_DELIVERY' && onMarkDelivered && (
                <button
                  type="button"
                  onClick={onMarkDelivered}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Delivered & Paid</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
