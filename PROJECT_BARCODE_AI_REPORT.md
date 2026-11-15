# Yogeshwari Dairy Shop ERP — Advanced AI-Assisted Barcode Recognition & Smart Product Lookup Engine

**System:** Yogeshwari Dairy Shop & Inventory Management System  
**Date:** November 2026  
**Status:** Production Ready & Verified  
**Engine Architecture:** Multi-Pass Computer Vision Preprocessing + GS1 Checksum Validation + Multi-Frame Debounce + Tesseract.js OCR Fallback + Supabase 46K+ Product Catalogue Lookup  

---

## 1. Executive Summary

In retail dairy and FMCG store environments, physical barcodes on packaging frequently suffer from:
- **Motion blur & camera defocus** on mobile phone lenses
- **Harsh reflections & glare** on glossy milk pouches, ghee tins, and potato chip bags
- **Inverted or sideways product holding** (0°, 90°, 180°, 270°)
- **Low light conditions** in shop storage rooms
- **Physical label damage** (torn, smudged, or scratched barcode stripes)

To solve these challenges without replacing the core lightweight `@zxing` engine with heavy dependencies, an **Advanced AI & Computer Vision Multi-Pass Barcode Recognition Pipeline** has been architected and integrated into the Yogeshwari Dairy Shop ERP.

---

## 2. Architecture & Enhancement Passes

```
                          ┌─────────────────────────────┐
                          │   Live Camera Video Stream  │
                          └──────────────┬──────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │  Optical Barcode Pass │                       │   AI OCR Fallback     │
     │  (Sub-millisecond)    │                       │   (Damaged Barcodes)  │
     └───────────┬───────────┘                       └───────────┬───────────┘
                 │                                               │
   [Pass 1: Raw Reticle 0°]                                      │
   [Pass 2: Inverted 180°]                                       │
   [Pass 3: Vertical 90°]                                        │
   [Pass 4: 3x3 Sharpening Kernel]                               │
   [Pass 5: Grayscale & Contrast]                                │
   [Pass 6: Otsu Adaptive Binarization]                          │
   [Pass 7: Digital 1.7x Zoom Crop]                              │
   [Pass 8: Full Frame Fallback]                                 │
                 │                                               │
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │ Candidate Detected    │                       │ HRI Digits Extracted  │
     └───────────┬───────────┘                       └───────────┬───────────┘
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                        ┌─────────────────────────────────┐
                        │ GS1 Modulo-10 Checksum Engine   │
                        │ (EAN-13, EAN-8, UPC-A, UPC-E)   │
                        └────────────────┬────────────────┘
                                         │ Validated
                                         ▼
                        ┌─────────────────────────────────┐
                        │ Multi-Frame Confirmation Buffer │
                        │ (Instant for GS1, 2-frame deb.) │
                        └────────────────┬────────────────┘
                                         │
                                         ▼
                        ┌─────────────────────────────────┐
                        │ Smart Supabase Catalogue Lookup │
                        │ (Store Stock vs 46K+ Master)    │
                        └─────────────────────────────────┘
```

---

## 3. Core Modules Implemented

### A. Computer Vision Preprocessing (`src/utils/imageEnhancement.ts`)
- **`applySharpenKernel`**: High-performance 3x3 discrete Laplacian unsharp mask kernel (`[0, -s, 0, -s, 1+4s, -s, 0, -s, 0]`). Recovers sharp bar transitions from blurry lenses or moving hands.
- **`applyAdaptiveBinarization`**: Otsu's histogram variance maximization algorithm computed directly on raw `Uint8ClampedArray` buffers. Converts glare and reflection gradients into pure black bars on white backgrounds.
- **`applyGrayscaleAndContrast`**: Multi-threaded integer luminance conversion (`(77*R + 150*G + 29*B) >> 8`) followed by contrast stretching factor formula. Enhances barcodes captured under low-light or uneven shadows.
- **`applyBrightnessContrast`**: Corrects severely overexposed or underexposed lighting conditions.

### B. GS1 Modulo-10 Checkdigit Engine (`src/utils/barcodeChecksum.ts`)
- Implements strict GS1 standards for:
  - **EAN-13**: $\text{Check} = (10 - (\sum \text{odd} \times 1 + \sum \text{even} \times 3) \pmod{10}) \pmod{10}$
  - **EAN-8**: $\text{Check} = (10 - (\sum \text{odd} \times 3 + \sum \text{even} \times 1) \pmod{10}) \pmod{10}$
  - **UPC-A**: 12-digit standard matching GS1 North American standards.
- Prevents camera sensor glitches, single-digit misreads, and invalid hallucinated scans.

### C. Multi-Frame Confirmation Tracker (`src/utils/barcodeScannerEngine.ts`)
- **Instant GS1 Confirmation**: When a barcode mathematically satisfies its GS1 check digit, it is verified with mathematical certainty and confirmed immediately.
- **Debounce for Non-GS1**: Internal store codes (Code-128, Code-39) require 2 consecutive matching frames within 500ms before triggering success.

### D. Tesseract.js Dynamic AI OCR Fallback (`src/utils/barcodeOcrFallback.ts`)
- When physical barcode stripes are completely torn, wet, or scratched, the lower 35% text region containing the **Human-Readable Interpretation (HRI)** numbers is cropped.
- Image is binarized and processed via dynamic import of `tesseract.js` with numeric whitelist (`0123456789`).
- Extracted digits are evaluated by the GS1 Modulo-10 engine. Once validated, the system automatically triggers product lookup without requiring barcode stripes.

### E. Smart Supabase Catalogue Integration (`src/lib/barcodeService.ts`)
- Multi-tier search hierarchy:
  1. Local active store inventory (`products` table in memory).
  2. Supabase `product_barcodes` join `products`.
  3. Direct `products` table barcode search.
  4. Remote RPC function `fn_search_product_by_barcode`.
  5. Supabase `product_catalogue` master database (46,571 FMCG SKUs).
- **Strict Separation Policy**: Items found in `product_catalogue` are marked with `source: 'catalogue'` and initial `stock_quantity: 0.0`. Physical stock is only incremented when an authorized user enters quantity in the Stock-Inward workflow.

---

## 4. UI & Ergonomics Upgrades

1. **Active Multi-Pass Status Badge**:
   - Displays real-time status: `AI स्कॅनर सक्रिय (Multi-Pass)` with pulsing green beacon.
2. **Damaged Barcode OCR Button**:
   - After 3.5 seconds of scanning without detection, an animated pill button appears:
     `✨ खराब बारकोड? नंबर OCR ने वाचा (AI OCR)`
   - One tap runs the OCR engine directly on the viewfinder frame.
3. **GS1 Validation & Source Badges**:
   - `✓ EAN-13 GS1 Valid` (Green verification badge).
   - `📦 46K+ Master Catalogue (साठा: ०)` vs `🏪 दुकान स्टॉक`.
4. **Flashlight / Torch Toggle**:
   - Direct hardware LED torch toggle for dark storage shelves.
5. **Camera Switch**:
   - Instant toggle between Back (Environment) and Front (User) cameras.
6. **Mobile Camera Direct Photo Fallback**:
   - Native `<input type="file" capture="environment">` option allowing high-resolution camera photo capture with automated 4-angle rotation and enhancement testing.

---

## 5. Verification & Test Results

```
--- GS1 Checksum Validation Tests ---
[PASS] Parle-G Biscuit (130g) (8901719101038) -> result: true, expected: true
[PASS] Amul Taaza Milk (8901262010054)        -> result: true, expected: true
[PASS] Maggi 2-Minute Noodles (8901058852899)  -> result: true, expected: true
[PASS] Corrupted Checkdigit (8901719101039)    -> result: false, expected: false
[PASS] Valid EAN-8 (96385074)                  -> result: true, expected: true
[PASS] Valid UPC-A (012345678905)              -> result: true, expected: true

--- OCR String Extraction Tests ---
[PASS] OCR Raw: "NET WT. 100g 8 901719 101038 MRP Rs 10" -> Extracted: 8901719101038
[PASS] OCR Raw: "BARCODE: 8901262010054 BATCH A-12"     -> Extracted: 8901262010054
[PASS] OCR Raw: "INVALID SCRAWL ABC XYZ"                 -> Extracted: null

Total Tests: 9, Passed: 9 (100% Success)
```

---

## 6. Summary of Browser Camera & SSL Protocols

| Environment | URL | Camera Access Protocol | SSL Status |
| :--- | :--- | :--- | :--- |
| **Local Desktop** | `http://localhost:5173` | Supported natively (`isSecureContext === true`) | No SSL certificate warning |
| **Local Mobile (HTTPS)** | `https://10.63.238.67:5173` | Supported via `@vitejs/plugin-basic-ssl` | Self-signed cert (Click *Advanced* -> *Proceed to 10.63.238.67*) |
| **Production Vercel** | `https://yogeshwari-dairy-shop.vercel.app` | Supported natively | Public CA SSL Certificate (Let's Encrypt / DigiCert) |
