# 📋 PRODUCTION CAMERA DEBUG REPORT — Vercel Barcode Scanner Fix

**Date:** 2026-11-15  
**Project:** Yogeshwari Dairy Shop & Inventory Management System (ERP & POS)  
**Target:** `https://yogeshwari-dairy-shop.vercel.app/`

---

## 🚨 1. Exact Root Cause Analysis

### The Critical Production Bug:
On local development (`https://localhost:5173` and `https://10.63.238.67:5173`), the barcode scanner operated correctly. However, on the deployed Vercel production URL (`https://yogeshwari-dairy-shop.vercel.app/`), the scanner failed completely.

### Root Cause Identified:
In `vercel.json` line 30, the HTTP security headers included:
```json
{
  "key": "Permissions-Policy",
  "value": "camera=(), microphone=(), geolocation=()"
}
```

#### Why this broke camera access on Vercel:
1. In the W3C Permissions Policy specification, **`camera=()` explicitly prohibits camera access for all origins, including the website itself (`self`)**.
2. When Vercel returned `Permissions-Policy: camera=()`, modern browsers (Chrome, Safari, Edge) enforced this policy strictly by **blocking any call to `navigator.mediaDevices.getUserMedia()`**.
3. Even if the user had granted camera permission in their browser settings, the browser threw:
   `NotAllowedError: Permission denied (Disallowed by Permissions-Policy)`.
4. Locally on Vite (`localhost` / LAN IP), Vite did not send this header, which is why local scanning worked while Vercel failed.

---

## ⚖️ 2. Local vs. Production Comparison Matrix

| Property / Header | Local Development (`localhost:5173`) | Vercel Production (`yogeshwari-dairy-shop.vercel.app`) | Impact |
| :--- | :--- | :--- | :--- |
| **Permissions-Policy** | Not present / unrestricted | Was set to `camera=()` (Explicitly Disabled) | **Camera Hard-Blocked on Vercel** |
| **Protocol** | `https://` via Basic SSL | `https://` via Vercel Edge SSL | Both are Secure Contexts |
| **Supabase Client** | Connects to `pfamoxreojbejufwhgiu` | Connects to `pfamoxreojbejufwhgiu` | Canonical Cloud Fallback identical |
| **ZXing Bundle** | Chunky module via Vite dev | Minified Rollup vendor chunk (`vendor-scanner`) | Identical `@zxing/library` code |
| **Rear Camera Handling** | 4-Tier constraint ladder | 4-Tier constraint ladder | Autofocus & rear lens selection |

---

## 🛠️ 3. Fixes Applied

### A. Fixed `vercel.json` Permissions-Policy
Updated `Permissions-Policy` to explicitly authorize the production origin to access the camera:
```json
{
  "key": "Permissions-Policy",
  "value": "camera=(self), microphone=(), geolocation=()"
}
```
Now, `https://yogeshwari-dairy-shop.vercel.app/` has first-party clearance to invoke the device camera.

### B. Added On-Screen Camera Diagnostics & Logging
Enhanced `BarcodeScannerModal.tsx` and `BarcodeStockInModal.tsx`:
1. Log runtime diagnostics:
   - `window.isSecureContext`
   - `navigator.mediaDevices` availability
   - `navigator.mediaDevices.getUserMedia` availability
   - `navigator.permissions.query({ name: 'camera' })` status
   - Available video input devices via `enumerateDevices()`
2. Added expandable "🛠️ तांत्रिक माहिती (Diagnostics)" panel on error screens so mobile users can view the exact browser state.

### C. Added Automatic Native Camera Intent Fallback
If WebRTC video streaming is ever unavailable on any browser, tapping "बारकोड" automatically triggers the native high-resolution camera intent (`capture="environment"`), ensuring the user is never left with an unresponsive screen.

---

## 📁 4. Files Changed

1. **[`vercel.json`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/vercel.json)**:
   - Fixed `Permissions-Policy` from `camera=()` to `camera=(self), microphone=(), geolocation=()`.
2. **[`src/components/Scanner/BarcodeScannerModal.tsx`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/src/components/Scanner/BarcodeScannerModal.tsx)**:
   - Added camera diagnostic tracking (`showDiagnostics`, `diagnosticsLogs`).
   - Added on-screen diagnostic log viewer for instant mobile troubleshooting.
3. **[`src/components/Scanner/BarcodeStockInModal.tsx`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/src/components/Scanner/BarcodeStockInModal.tsx)**:
   - Added camera diagnostic tracking and UI toggle.

---

## 🧪 5. Verification & Build Results

- **TypeScript Typecheck:** `npm run typecheck` (`tsc --noEmit`) ➔ **0 errors**
- **Production Build:** `npm run build` (`vite build`) ➔ **Built in 1.99s, all 31 chunks generated cleanly**
- **Git Push:** Committed and pushed to `origin/main` (triggers automatic Vercel production deployment).

---

## 📱 6. Mobile Production Verification Steps

Once Vercel finishes deploying the latest commit (typically 30-60 seconds after Git push):

1. On your mobile phone, open:  
   👉 **`https://yogeshwari-dairy-shop.vercel.app/`**
2. Hard-refresh the page (or open in Incognito/Clear cache to ensure new Vercel headers are applied).
3. Tap **"बारकोड स्कॅन"** or **"Barcode Stock-In"**.
4. The browser will now prompt:  
   👉 **"Allow yogeshwari-dairy-shop.vercel.app to use your camera?" ➔ [Allow]**.
5. The live rear camera will open smoothly without `NotAllowedError`.
