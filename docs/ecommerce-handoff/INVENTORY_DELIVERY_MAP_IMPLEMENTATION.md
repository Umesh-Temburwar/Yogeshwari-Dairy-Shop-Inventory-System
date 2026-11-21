# INVENTORY DELIVERY MAP & RIDER WORKFLOW IMPLEMENTATION

**Project:** Yogeshwari Dairy Shop Inventory Management System  
**Feature:** In-App Interactive Delivery Map, Turn-by-Turn Routing & Rider Dispatch  
**Environment:** Staging / Local Implementation (Production Deployments Gated)  
**Date:** November 2026

---

## 1. Overview & Architecture

When customers order from Yogeshwari Dairy (`https://yogeshwari-dairy-ecommerce.vercel.app/`), the counter staff in the Inventory app (`D:\Projects\Yogeshwari Dairy Shop Inventory System`) needs to inspect the customer's delivery destination, calculate realistic delivery drive times, assign a delivery rider, and track dispatch status without leaving the application or leaking unauthenticated location data.

### Architectural Highlights
- **In-App Interactive Map Modal (`DeliveryMapModal.tsx` & `DeliveryNavigationModal.tsx`):**
  Uses `leaflet` and `react-leaflet` with OpenStreetMap raster tiles (free, reliable, no API key exposure).
- **Legitimate Routing Engine (OSRM):**
  Integrates the Open Source Routing Machine (OSRM) driving API to compute true road trajectories between Yogeshwari Dairy Ambajogai (`18.7304° N, 76.3879° E`) and customer coordinates. It automatically plots the polyline route and calculates distance (in km) and drive time (in minutes).
- **Rider Assignment Workflow (`AssignRiderModal.tsx`):**
  Enables store managers to select vetted riders (e.g., Sunil Rao, Ganesh Pawar, or custom staff), attach contact details, log vehicle registration (`MH-31-DY-1008`), and append dispatch instructions.
- **Mobile-Responsive Protection:**
  Zero overlap with the mobile fixed 5-item bottom navigation bar (`pb-28 sm:pb-8`), touch-friendly 44px+ tap targets, and responsive modal viewports.

---

## 2. In-App Delivery Map Components

### 2.1 `DeliveryMapModal.tsx` (`src/components/Admin/DeliveryMapModal.tsx`)
A dedicated high-performance modal designed for both staff and delivery riders:
- **Leaflet DivIcons:** Custom SVG DivIcons for the store anchor (Emerald dairy pin with pulse) and customer destination (Crimson target pin with ping animation). Avoids Vite asset bundling issues with default Leaflet PNGs.
- **Live GPS Tracking:** Uses the Web Geolocation API (`navigator.geolocation.watchPosition`) to track rider location in real-time, showing a cyan directional bike icon on the map.
- **OSRM Road Route:** Fetches driving geometry from `https://router.project-osrm.org/route/v1/driving/{storeLng},{storeLat};{destLng},{destLat}?overview=full&geometries=geojson` and draws a high-visibility royal blue polyline with white borders.
- **Quick Actions:**
  - One-tap "Copy Address" with toast feedback.
  - Direct "Call Customer" (`tel:+91...`) and "WhatsApp Customer" deep links.
  - "Open in Google Maps" external link as an optional fallback for external navigation apps.
  - Action buttons to trigger "Start Delivery" (`OUT_FOR_DELIVERY`) and "Mark Delivered" (`DELIVERED`).

### 2.2 `DeliveryNavigationModal.tsx` (`src/components/Admin/DeliveryNavigationModal.tsx`)
Integrated directly into `EcommerceOrdersView.tsx` for fast counter-level dispatch inspections, supporting instant turn overview and quick rider reassignment.

### 2.3 `AssignRiderModal.tsx` (`src/components/Admin/AssignRiderModal.tsx`)
Modal component allowing counter cashiers and admins to:
1. Select from predefined dairy fleet personnel or enter custom rider details.
2. Record vehicle license plate and contact numbers.
3. Add delivery packing/handling notes (e.g., "Handle chilled paneer with ice packs").
4. Submit updates to backend endpoint `POST /api/v1/ecommerce/admin/orders/:id/assign-rider`.

---

## 3. Mobile Usability & Viewport Guarding

Dairy counter operations often use mobile phones or small tablet terminals. The interface is specifically hardened for these form factors:

| Feature | Desktop Implementation | Mobile Phone Implementation (<640px) |
| :--- | :--- | :--- |
| **Modal Dimensions** | Centered modal (92vw, max-w-4xl, 85vh) | Full viewport slide-up modal (100vw, 95vh) |
| **Touch Targets** | Standard buttons (36px-40px) | Touch-optimized (min 44px height & width) |
| **Bottom Bar Guard** | `pb-8` standard container padding | `pb-28` to ensure all actions remain above the 5-item bottom bar |
| **Map Height** | 420px interactive height | 280px-340px optimized for scrollable details below |
| **Address Breakdown** | Multi-column grid | Compact vertical stacking with high contrast chips |

---

## 4. Modified & Created Files Inventory

| File Path | Nature | Purpose / Description |
| :--- | :--- | :--- |
| `src/index.css` | Modified | Added `@import 'leaflet/dist/leaflet.css';` at line 1. |
| `src/components/Admin/DeliveryMapModal.tsx` | Created | Full Leaflet + OSRM routing interactive map modal with live rider GPS tracking. |
| `src/components/Admin/AssignRiderModal.tsx` | Created | Delivery personnel dispatch & vehicle assignment modal. |
| `src/components/Admin/DeliveryNavigationModal.tsx` | Hardened | Added copy address clipboard, coordinate validation banners, and rider selector. |
| `src/components/Admin/EcommerceOrdersView.tsx` | Modified | Hooked up `AssignRiderModal`, fixed `pb-28` bottom bar spacing, and added map controls. |
| `src/components/OnlineOrders/OnlineOrdersManager.tsx` | Modified | Integrated `DeliveryMapModal` trigger on address card and added modal mount. |
| `supabase/79_phase79_customer_addresses_and_delivery_dispatch.sql` | Created | Staging DDL for coordinates, spatial indexing, rider columns, and RLS policies. |
| `server/src/schemas/ecommerceSchemas.ts` | Modified | Zod bounds validation for latitude/longitude, rider assignment schema. |
| `server/src/services/ecommerceService.ts` | Modified | Secure address CRUD with ownership checks, rider assignment logic. |
| `server/src/controllers/ecommerceController.ts` | Modified | Address endpoints and rider assignment HTTP handlers. |
| `server/src/routes/ecommerceRoutes.ts` | Modified | Address routes and role-guarded `/admin/orders/:id/assign-rider` route. |
| `server/src/__tests__/ecommerce.test.ts` | Modified | Added 11 automated test cases for address security, coordinates bounds, and dispatch. |
