# 📦 YOGESHWARI DAIRY SHOP - ALL BARCODE DATABASE (संपूर्ण बारकोड डेटाबेस)
**Project:** Yogeshwari Dairy Shop & Inventory Management System  
**Updated:** 15 November 2026  
**Total Unique Barcodes:** 22,397 Barcodes

---

## 📁 फोल्डरमधील फायलींची माहिती (Files in this Folder)

| File Name | Format | Rows / Size | Description |
|---|---|---|---|
| **`master_barcode_database.csv`** | CSV | **22,397 Barcodes** | सर्व उत्पादनांचा मुख्य डेटाबेस (Excel किंवा Google Sheets मध्ये उघडता येतो). |
| **`master_barcode_database.json`** | JSON | **22,397 Barcodes** | संपूर्ण डेटाबेस JSON फॉरमॅटमध्ये (APIs किंवा ॲपमध्ये वापरण्यासाठी). |
| **`yogeshwari_dairy_shop_barcodes.csv`** | CSV | **424 Items** | योगेश्वरी डेअरीच्या खास वस्तू (दूध, दही, पनीर, खवा, तूप, बिस्किटे, स्नॅक्स) मराठी व हिंदी नावांसह. |
| **`yogeshwari_dairy_shop_barcodes.json`** | JSON | **424 Items** | योगेश्वरी डेअरीच्या वस्तूंचा JSON डेटा. |
| **`fmcg_groceries_barcode_catalog.csv`** | CSV | **21,967 Items** | पॅकेज्ड फूड, बिस्किटे, वेफर्स, शीतपेये, मसाल्यांचा मोठा कॅटलॉग. |
| **`supabase_product_catalogue_insert.sql`** | SQL | Schema + RPC | Supabase / PostgreSQL मध्ये डेटाबेस टेबल व RPC फंक्शन्स तयार करणारी स्क्रिप्ट. |
| **`search_barcode.py`** | Python | CLI Utility | कोणताही बारकोड किंवा वस्तूचे नाव क्षणात शोधण्याचे टूल. |
| **`barcode_database_summary.json`** | JSON | Metadata | ब्रँड्स, कॅटेगरी आणि एकूण आकड्यांचे संपूर्ण विश्लेषण. |

---

## 📊 मुख्य आकडेवारी (Statistics)

- **एकूण युनिक बारकोड्स (Total Unique Barcodes):** `22,397`
- **योगेश्वरी डेअरी क्युरेटेड उत्पादने:** `424`
- **FMCG ग्रॉसरी उत्पादने:** `21,967`

### प्रमुख ब्रँड्स (Top Brands)
- **Generic / Unbranded:** 5,151 उत्पादने
- **Amul:** 455 उत्पादने
- **Britannia:** 361 उत्पादने
- **Yogeshwari Dairy:** 243 उत्पादने
- **Parle:** 231 उत्पादने
- **Cadbury:** 197 उत्पादने
- **Haldiram's:** 193 उत्पादने
- **Maggi:** 157 उत्पादने
- **Good Life:** 145 उत्पादने
- **Sunfeast:** 133 उत्पादने

### प्रमुख वर्ग (Top Categories)
- **Groceries & FMCG:** 12,076 उत्पादne
- **Beverages:** 5,416 उत्पादne
- **Snacks & Confectionery:** 2,864 उत्पादne
- **Dairy & Milk Products:** 1,449 उत्पादne
- **Bakery & Extras:** 294 उत्पादne
- **Staples & Groceries:** 145 उत्पादne

---

## 🚀 कसा वापरायचा? (How to Use)

### १. बारकोड शोधणे (Search by Barcode or Product Name via CLI)
कमांड लाईन किंवा टर्मिनलवर खालील कमांड चालवा:
```bash
# बारकोड नंबरने शोधणे:
python barcode_database/search_barcode.py 8901719100369

# वस्तूच्या नावाने शोधणे:
python barcode_database/search_barcode.py "Amul Butter"

# ब्रँडनुसार शोधणे:
python barcode_database/search_barcode.py "Parle"
```

### २. Excel किंवा Google Sheets मध्ये उघडणे
- `barcode_database/master_barcode_database.csv` किंवा `yogeshwari_dairy_shop_barcodes.csv` फाईलवर डबल-क्लिक करून थेट Excel मध्ये उघडू शकता.
- सर्व बारकोड्स सुरक्षित टेक्स्ट फॉरमॅटमध्ये असल्यामुळे `0` (leading zero) गायब होत नाही.

### ३. Supabase मध्ये इंपोर्ट करणे
1. Supabase Dashboard वर जा: [https://supabase.com](https://supabase.com)
2. **SQL Editor** उघडा आणि `barcode_database/supabase_product_catalogue_insert.sql` मधील कोड रन करा.
3. **Table Editor** -> `product_catalogue` वर क्लिक करा -> **Insert** -> **Import data from CSV** निवडा -> `master_barcode_database.csv` फाईल निवडून इंपोर्ट करा.

---

## 🛒 ॲपमधील वापर (Application Integration)
- योगेश्वरी डेअरीच्या **POS Billing Counter** आणि **Stock-In Scanner** मध्ये हा डेटाबेस थेट जोडलेला आहे.
- जेव्हा तुम्ही मोबाईल कॅमेऱ्याने कोणताही बारकोड स्कॅन करता किंवा फोन हलवता (**Shake-to-Scan**), तेव्हा सिस्टीम सर्वप्रथम या डेटाबेसमधून ० सेकंदात (0ms) वस्तू शोधून थेट बिलात किंवा गोदामात जमा करते!
