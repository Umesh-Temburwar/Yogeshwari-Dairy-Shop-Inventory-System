# Yogeshwari Dairy Inventory - Android Device Testing Checklist

This document provides a comprehensive test plan to verify that the native Android APK behaves reliably, securely, and seamlessly across various real-world hardware, screen sizes, and operating conditions.

---

## Test Environment Details

- **Application Name:** Yogeshwari Dairy Inventory
- **Package ID:** `com.yogeshwari.dairyinventory`
- **Target OS:** Android 7.0 (API 24) to Android 15 / 16 (API 36)
- **Primary Tested Form Factors:**
  - Compact Android Phone (360px - 380px width, e.g. Redmi / Realme)
  - Standard Android Phone (390px - 414px width, e.g. Samsung Galaxy / OnePlus)
  - Tablet / Counter Terminal (600px - 1024px width, e.g. Samsung Tab)

---

## 1. Installation & Boot Experience

| Test Item | Verification Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **APK Sideload** | Copy `app-debug.apk` or `app-release.apk` to phone and install. | Android Package Installer installs cleanly without parse errors. | [ ] |
| **App Icon** | Inspect phone home screen and app drawer. | Yogeshwari Dairy circular branded logo displays crisply on both square and round launchers. | [ ] |
| **Splash Screen** | Tap app icon to launch from cold start. | Brand splash screen (`#0B1210` dark green background with centered logo) displays smoothly without flicker before main app mounts. | [ ] |
| **Status Bar** | Observe Android status bar (top). | Status bar is styled dark (`#0B1210`) with white icons matching the dark theme. | [ ] |

---

## 2. Authentication, RLS & Session Persistence

| Test Item | Verification Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Cloud Login** | Log in with Owner or Counter Admin credentials. | Connects to Supabase, authenticates GoTrue session, and unlocks counter. | [ ] |
| **Passcode Unlock** | Lock counter and enter 4-digit Master Passcode. | Unlocks smoothly with unlock animation overlay. | [ ] |
| **App Restart / Process Death** | Force stop app from Android Settings, then re-launch. | User session remains intact; does not log out unexpectedly. | [ ] |
| **RLS Isolation** | Test Admin vs Owner role restricted views. | Owner Control Center and Master Passcode change remain role-guarded by Supabase RLS. | [ ] |

---

## 3. POS Counter & Barcode Scanning

| Test Item | Verification Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Camera Permission Prompt** | Tap Barcode icon in POS Billing Counter for the first time. | Android native permission dialog appears ("Allow Yogeshwari Dairy to take pictures and record video?"). | [ ] |
| **Live Camera Feed** | Grant camera permission. | Rear camera opens with high-speed 30fps viewport; laser scanning guide displays. | [ ] |
| **Crinkled / Dairy Pouch Scan** | Scan a real milk pouch, curd cup, or biscuit packet (e.g. Parle-G, Amul, Mother Dairy). | Google ML Kit / ZXing recognizes barcode in < 50ms, plays beep sound, and adds item to cart. | [ ] |
| **Torch / Flashlight** | Tap flashlight toggle in low light. | Hardware flash activates and illuminates barcode cleanly. | [ ] |
| **Camera Switch** | Tap switch camera button. | Toggles seamlessly between rear and front cameras. | [ ] |

---

## 4. Hardware & Gesture Back Button Handling

| Test Item | Verification Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Modal Dismissal** | Open "Add Product" or "Barcode Scanner", then press Android Back button. | Modal closes smoothly; app does NOT exit and does NOT navigate back to login. | [ ] |
| **Drawer Dismissal** | Open mobile sidebar menu, then press Android Back button. | Sidebar drawer slides back closed. | [ ] |
| **Sub-View Navigation** | Navigate to "Stock Need Alert" or "Analytics", then press Back. | Returns to Home Dashboard. | [ ] |
| **Accidental Exit Guard** | On Home Dashboard, tap Android Back once. | Toast notification appears: *"Press back again to exit Yogeshwari Dairy"*. | [ ] |
| **Double-Tap Exit** | Tap Back twice within 2 seconds on Home Dashboard. | Application closes cleanly. | [ ] |

---

## 5. Exports (PDF & CSV / Excel)

| Test Item | Verification Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Profit & Loss PDF** | Navigate to Reports > Profit & Loss > Tap "PDF". | Generates A4 PDF with Marathi/Hindi and English fonts, writes to cache, and opens native Android Share sheet. | [ ] |
| **Share to WhatsApp** | Select WhatsApp from Share sheet. | Report PDF is attached directly and can be sent to Shop Owner. | [ ] |
| **Save to Downloads** | Select "Save to Files" or "Downloads" from Share sheet. | PDF saves to device storage with proper filename and date. | [ ] |
| **Catalogue CSV Export** | Go to Inventory > More > Export CSV. | Generates UTF-8 CSV with BOM and opens native share sheet. | [ ] |

---

## 6. Network Disconnection & Offline Handling

| Test Item | Verification Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Airplane Mode** | Turn on Airplane Mode while browsing items. | Amber banner appears immediately: *"Internet disconnected — Working Offline"*. | [ ] |
| **Offline Cash Billing** | Complete a cash sale while offline. | Sale is recorded in local cache; transaction succeeds without crash. | [ ] |
| **Reconnection** | Turn off Airplane Mode. | Green banner appears: *"Internet connection restored (Back Online)"*, and background sync resumes. | [ ] |

---

## 7. Touchscreen, Keyboard & Soft Input

| Test Item | Verification Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Soft Keyboard Resizing** | Tap billing search input or numeric quantity input. | View resizes (`adjustResize`); input remains visible above keyboard without being hidden. | [ ] |
| **Touch Targets** | Tap 44px min-touch buttons (`+`, `−`, "Log Loss", "Order Qty"). | Buttons respond with tactile active scaling without lag or missed taps. | [ ] |
| **Horizontal Scrolling** | Scroll period filter pills (`All`, `Today`, `Week`, `Month`, `Year`). | Smooth inertia snap scroll; no horizontal cut-off at 360px screen width. | [ ] |
