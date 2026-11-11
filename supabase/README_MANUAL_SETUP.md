# 🥛 योगेश्वरी डेअरी ERP — Supabase मॅन्युअल सेटअप मार्गदर्शक (Phase-Wise Guide)

या डिरेक्टरीमध्ये Supabase PostgreSQL डेटाबेस मॅन्युअली आणि टप्प्याटप्प्याने (Phase-wise) सेटअप करण्यासाठी **१० स्वतंत्र SQL फाइल्स** तयार केल्या आहेत. 

कोणत्याही त्रुटीविना (Error-free) तुमचा डेटाबेस तयार करण्यासाठी खालील सूचनांचे पालन करा.

---

## 📋 सर्व १० टप्पे व फाइल्सची यादी (Phase-Wise Execution Order)

तुम्हाला तुमच्या **Supabase Dashboard -> SQL Editor** मध्ये जाऊन खालील क्रमाने या फाइल्स रन करायच्या आहेत:

| क्र. | फाइलचे नाव (File Name) | टप्प्याचे नाव (Phase Title) | काय तयार होते? |
|:---:|:---|:---|:---|
| **Phase 1** | [`01_phase1_extensions_and_catalog.sql`](./01_phase1_extensions_and_catalog.sql) | **एक्सटेंशन्स व प्रॉडक्ट कॅटलॉग** | `uuid-ossp`, `pgcrypto`, `categories`, `units`, `products` टेबल्स |
| **Phase 2** | [`02_phase2_suppliers_and_purchases.sql`](./02_phase2_suppliers_and_purchases.sql) | **सप्लायर व खरेदी नोंद** | शेतकरी/सप्लायर्स (`suppliers`), खरेदी लेजर (`purchases`) टेबल्स |
| **Phase 3** | [`03_phase3_batches_and_fefo_stock.sql`](./03_phase3_batches_and_fefo_stock.sql) | **बॅचेस, शेल्फ-लाईफ व FEFO** | प्रॉडक्ट बॅचेस (`batches`), स्टॉक हालचाल ऑडिट (`stock_movements`) |
| **Phase 4** | [`04_phase4_damages_and_spoilage.sql`](./04_phase4_damages_and_spoilage.sql) | **खराब व नासलेला माल** | नासलेले दूध व नुकसान नोंद टेबल (`damage_records`) |
| **Phase 5** | [`05_phase5_udhar_customers_and_khata.sql`](./05_phase5_udhar_customers_and_khata.sql) | **उधारी खाते व लेजर** | उधारी ग्राहक (`udhar_customers`), जमा-नावे व्यवहार (`udhar_transactions`) |
| **Phase 6** | [`06_phase6_sales_and_pos_billing.sql`](./06_phase6_sales_and_pos_billing.sql) | **काऊंटर विक्री व बिलिंग** | दैनंदिन बिले (`sales`), बिलातील वस्तू (`sale_items`), बॅच वाटप (`sale_batch_allocations`) |
| **Phase 7** | [`07_phase7_returns_and_refunds.sql`](./07_phase7_returns_and_refunds.sql) | **माल परतावा व सप्लायर रिफंड** | ग्राहक परतावा (`product_returns`), सप्लायर खरेदी परतावा व डेबिट नोट (`supplier_returns`) |
| **Phase 8** | [`08_phase8_expenses_and_investments.sql`](./08_phase8_expenses_and_investments.sql) | **दुकान खर्च व भांडवली गुंतवणूक** | भाडे, लाईट बिल, पगार खर्च (`expenses`) |
| **Phase 9** | [`09_phase9_indexes_and_performance.sql`](./09_phase9_indexes_and_performance.sql) | **हाय-स्पीड इंडेक्सिंग** | Foreign Keys, तारखा व सर्चसाठी सुपरफास्ट B-Tree व Partial Indexes |
| **Phase 10** | [`10_phase10_rls_security_and_views.sql`](./10_phase10_rls_security_and_views.sql) | **सुरक्षा (RLS) व अहवाल व्ह्यूज** | RLS सुरक्षितता, API परवानग्या, आणि आपोआप हिशोब करणारे Views |

---

## 🚀 मॅन्युअल सेटअप करण्याची सोपी पद्धत (Step-by-Step Instructions)

### **पायरी १: Supabase Dashboard मध्ये जा**
1. [Supabase Dashboard](https://supabase.com/dashboard) उघडा.
2. तुमच्या प्रोजेक्टवर क्लिक करा.

### **पायरी २: SQL Editor उघडा**
1. डाव्या बाजूच्या मेनूमधील **`SQL Editor`** (टर्मिनल आयकॉन) वर क्लिक करा.
2. हिरव्या **`+ New query`** बटणावर क्लिक करा.

### **पायरी ३: टप्प्याटप्प्याने फाइल्स चालवा (Run Phase by Phase)**
1. संगणकावरील `supabase/01_phase1_extensions_and_catalog.sql` फाइल उघडा आणि संपूर्ण कोड कॉपी करा.
2. Supabase SQL Editor मध्ये पेस्ट करा आणि **`Run`** (किंवा `Ctrl + Enter`) दाबा.
3. खाली **`Success. No rows returned`** असा हिरवा मेसेज येईल.
4. याचप्रमाणे **Phase 2 ते Phase 10** पर्यंतच्या सर्व फाइल्स एकामागोमाग एक रन करा.

> 💡 **टीप**: जर तुम्हाला एकाच वेळी सर्व सेटअप करायचे असेल, तर तुम्ही [`complete_setup.sql`](./complete_setup.sql) ही मास्टर फाइल थेट १-क्लिकमध्ये देखील रन करू शकता.

---

## 🔑 Supabase चा URL आणि Key कसा मिळवाल?

1. Supabase मधील डाव्या मेनूच्या तळाशी **`Project Settings` (⚙️ Settings)** वर क्लिक करा.
2. **`API`** (किंवा **`Data API`**) टॅब निवडा.
3. तेथून खालील दोन गोष्टी कॉपी करा:
   - **Project URL** (उदा. `https://your-project.supabase.co`)
   - **anon / public Key** (उदा. `eyJhbGciOi...`)

### **प्रोजेक्टच्या `.env` फाईलमध्ये जोडणे:**
प्रोजेक्टच्या मुख्य फोल्डरमधील `.env` फाईल उघडून तेथे टाका:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ✅ सर्व काही व्यवस्थित सुरू आहे हे कसे तपासावे?

1. ब्राऊझरमध्ये Yogeshwari Dairy सॉफ्टवेअर रिफ्रेश करा.
2. वरती Navbar मध्ये किंवा सिस्टीम आपोआप क्लाऊड Supabase शी कनेक्ट होईल.
3. तुम्ही काऊंटरवर नवीन बिल बनवल्यास किंवा नवीन खरेदी नोंदवल्यास ती माहिती थेट Supabase च्या **`Table Editor`** मध्ये रिअल-टाइम दिसेल!

