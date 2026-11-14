# 📋 Changelog — Yogeshwari Dairy ERP & Shop Inventory

All notable changes, architectural updates, and enhancements to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] - 2026-11-15
### Added
- **Web Audio Synthetic Sound Engine**: Zero-asset audio chime on checkout completion and crisp scanner beeps.
- **Universal CSV / Excel Exporters**: Instant 1-click UTF-8 BOM CSV downloads for both Product Catalog and Daily Sales Ledger.
- **Client-Side Test Suite (`testSuite.ts`)**: Unit assertions for date formats, relative time, shelf-life calculation, and Indian currency.
- **Network Status Banner & Hook (`useNetworkStatus`)**: Instant online/offline detection with polite bilingual alert banners.
- **Global Keyboard Shortcuts Guide (`KeyboardShortcutsModal`)**: Bound to `F1` key with instant overview of `F2`, `F3`, `F4`, `Esc`.
- **Zod Validation Schemas (`validations.ts`)**: Type-safe validation rules for product creation, customer sales, and expenses.
- **React ErrorBoundary (`ErrorBoundary.tsx`)**: Graceful crash prevention with reload and home recovery UI.
- **Reusable Hooks (`useDebounce`, `useLocalStorage`)**: Performance enhancements for high-speed POS search and safe storage.

### Changed
- **POS Search Performance**: Double-layered debouncing + deferred value rendering to guarantee zero input latency on long product catalogs.
- **Category Badges**: Added live real-time item counts directly in product category filter pills.
- **Shelf-life Status**: Refined urgency tags in `ExpiryDashboard` with pulsing badges on expiring items.
- **Status Bar Sync**: Automatically updates `<meta name="theme-color">` to match dark/light theme on mobile devices.

---

## [2.3.0] - 2026-11-14
### Added
- **Mobile Hardware Biometric Authentication**: WebAuthn platform integration for Counter 1 Admin (Nilesh Sakhare).
- **Exact Bill Creation Timestamp**: Integrated `created_at` clock time across POS invoices, sales ledger, and PDF reports.
- **Live Audit Stream Relative Time**: Human-friendly relative time (`५ मिनिटांपूर्वी`) for rapid shop activity monitoring.
- **Enhanced Profile Portraits**: Integrated high-resolution passport portrait for Owner (Nikhil Sakhare).

### Fixed
- **Mobile Fingerprint Flow**: Removed intermediate click buttons to directly trigger native Android Google Password Manager screen lock.
- **TypeScript Product Interface**: Added `brand?: string` to eliminate strict compiler warnings in `StoreContext`.

---

## [2.2.0] - 2026-11-13
### Added
- **FMCG Product Catalog**: Ingestion of Amul, Haldiram, Britannia, Cadbury, and local dairy brand inventories.
- **FEFO Batch Allocation Stored Procedure**: Automated Earliest-Expiry-First-Out stock deduction logic in Supabase PostgreSQL.
- **Khata WhatsApp Integration**: Direct `wa.me` payment reminder generator with localized polite Marathi/Hindi wording.

---

## [2.0.0] - 2026-11-12
### Added
- **Dual Role Security Architecture**: Dedicated Owner (`Nikhil Sakhare`) and Counter Admin (`Nilesh Sakhare`) profiles.
- **Admin Activity Audit Trail**: Real-time logging of all inventory updates, price adjustments, and cashier shifts.
- **Two-Step Master Security Passcode**: SHA-256 salted zero-knowledge PIN protection for administrative actions.
- **Thermal Receipt Printer Engine**: 80mm ESC/POS compatible thermal bill styling with FSSAI compliance.
