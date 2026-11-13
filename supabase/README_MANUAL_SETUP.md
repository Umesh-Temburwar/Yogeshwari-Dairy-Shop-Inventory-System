# 🥛 योगेश्वरी डेअरी ERP — Supabase मॅन्युअल सेटअप मार्गदर्शक (Phase-Wise Guide)

या डिरेक्टरीमध्ये Supabase PostgreSQL डेटाबेस मॅन्युअली आणि टप्प्याटप्प्याने (Phase-wise) सेटअप करण्यासाठी **१५ स्वतंत्र SQL फाइल्स** तयार केल्या आहेत. 

प्रत्येक फाइल प्रोजेक्टच्या विशिष्ट फिचर्सनुसार डिझाइन केलेली आहे, जेणेकरून तुम्ही कोणत्याही गोंधळाशिवाय व त्रुटीविना (Error-free) तुमचा संपूर्ण डेटाबेस तयार करू शकाल.

---

## 📋 सर्व १५ टप्पे व फाइल्सची यादी (Phase-Wise Execution Order)

तुम्हाला तुमच्या **Supabase Dashboard -> SQL Editor** मध्ये जाऊन खालील क्रमाने (Phase 1 ते Phase 15) या फाइल्स रन करायच्या आहेत:

| क्र. | फाइलचे नाव (File Name) | टप्प्याचे नाव (Phase Title) | काय तयार होते? (Tables / Functions / Views) |
|:---:|:---|:---|:---|
| **Phase 1** | [`01_phase1_extensions_and_catalog.sql`](./01_phase1_extensions_and_catalog.sql) | **एक्सटेंशन्स व प्रॉडक्ट कॅटलॉग** | `uuid-ossp`, `pgcrypto`, `categories`, `units`, `brands`, `products` (मराठी/हिंदी नाव, बारकोड, SKU, मिनिमम स्टॉक अलर्ट) |
| **Phase 2** | [`02_phase2_suppliers_and_purchases.sql`](./02_phase2_suppliers_and_purchases.sql) | **सप्लायर व खरेदी नोंद** | शेतकरी/सप्लायर्स (`suppliers`), खरेदी लेजर (`purchases` - दूध लिटर, दर, पेमेंट मोड) |
| **Phase 3** | [`03_phase3_batches_and_fefo_stock.sql`](./03_phase3_batches_and_fefo_stock.sql) | **बॅचेस, शेल्फ-लाईफ व FEFO साठा** | प्रॉडक्ट बॅचेस (`batches`), स्टॉक हालचाल ऑडिट लेजर (`stock_movements`) |
| **Phase 4** | [`04_phase4_damages_and_spoilage.sql`](./04_phase4_damages_and_spoilage.sql) | **खराब व नासलेला माल (Damages)** | नासलेले दूध, लिक पाकिटे व मुदत संपलेला माल नोंद (`damage_records`) |
| **Phase 5** | [`05_phase5_udhar_customers_and_khata.sql`](./05_phase5_udhar_customers_and_khata.sql) | **उधारी खाते व लेजर (Khata Book)** | उधारी ग्राहक (`udhar_customers`), जमा-नावे व्यवहार लेजर (`udhar_transactions`) |
| **Phase 6** | [`06_phase6_sales_and_pos_billing.sql`](./06_phase6_sales_and_pos_billing.sql) | **काऊंटर विक्री व POS बिलिंग** | दैनंदिन बिले (`sales`), बिलातील वस्तू (`sale_items`), बॅच वाटप (`sale_batch_allocations` - अचूक COGS व नफ्यासाठी) |
| **Phase 7** | [`07_phase7_returns_and_refunds.sql`](./07_phase7_returns_and_refunds.sql) | **माल परतावा व सप्लायर रिफंड** | ग्राहक परतावा (`product_returns`), सप्लायर खरेदी परतावा व डेबिट नोट (`supplier_returns`) |
| **Phase 8** | [`08_phase8_expenses_and_investments.sql`](./08_phase8_expenses_and_investments.sql) | **दुकान खर्च व भांडवली गुंतवणूक** | भाडे, चिलर दुरुस्ती, वीज बिल, पगार व नवीन उपकरणे (`expenses`) |
| **Phase 9** | [`09_phase9_stored_procedures_and_functions.sql`](./09_phase9_stored_procedures_and_functions.sql) | **डेटाबेस फंक्शन्स व स्टोअर प्रोसिजर्स** | `fn_inward_stock_batch`, `fn_fefo_deduct_and_allocate`, `fn_record_damage_loss`, `fn_remove_expired_batches`, `fn_record_udhar_transaction` |
| **Phase 10** | [`10_phase10_indexes_and_performance.sql`](./10_phase10_indexes_and_performance.sql) | **हाय-स्पीड इंडेक्सिंग (Zero Lag)** | Foreign Keys, तारखा व सर्चसाठी सुपरफास्ट B-Tree व Partial Indexes |
| **Phase 11** | [`11_phase11_rls_security_and_views.sql`](./11_phase11_rls_security_and_views.sql) | **सुरक्षा (RLS) व अहवाल व्ह्यूज** | RLS सुरक्षितता, API परवानग्या, आणि `v_inventory_valuation`, `v_product_stock`, `v_expiring_batches_alert`, `v_batch_expiry_status`, `v_daily_sales_summary`, `v_supplier_returns_pending` |
| **Phase 12** | [`12_phase12_owner_admin_roles_and_auth.sql`](./12_phase12_owner_admin_roles_and_auth.sql) | **१ मालक व १ ॲडमिन (Roles & Redirection)** | १ मालक व १ ॲडमिन (निलेश सखारे) निर्बंध (`profiles` टेबल), लॉगिननंतर भूमिकेनुसार स्वयंचलित रिडायरेक्ट (`dashboard`, `pos`) |
| **Phase 13** | [`13_phase13_admin_audit_and_counter_tracking.sql`](./13_phase13_admin_audit_and_counter_tracking.sql) | **ॲडमिन तपासणी वही व काऊंटर ट्रॅकिंग** | दुकान मालक नियंत्रण कक्ष — ॲडमिनने काऊंटरवरून काय विकले व काय अपडेट केले याचा संपूर्ण रिअल-टाइम ऑडिट लेजर (`admin_audit_logs`, `v_owner_admin_counter_summary`, `v_owner_recent_admin_activities`) |
| **Phase 14** | [`14_phase14_admin_profiles_and_activity_audit.sql`](./14_phase14_admin_profiles_and_activity_audit.sql) | **अधिकृत Gmail प्रोफाइल्स व इन्व्हेंटरी बदल ट्रॅकिंग** | अधिकृत Gmail प्रोफाइल्स: मालक (`yogeshwaridairy9896@gmail.com` -> `dashboard`), ॲडमिन निलेश सखारे (`nilusakhare2003@gmail.com` -> `pos`), आणि मालकासाठी इन्व्हेंटरी बदल व काऊंटर विक्री तपशील व्ह्यूज (`v_owner_admin_inventory_changes`, `v_owner_admin_counter_sales_details`) |
| **Phase 15** | [`15_phase15_supabase_auth_and_user_registration.sql`](./15_phase15_supabase_auth_and_user_registration.sql) | **Supabase Auth व युझर रजिस्ट्रेशन** | Supabase Auth (`auth.users`) व युझर प्रोफाइल्स (`public.profiles`) ऑटो-लिंक ट्रिगर (`on_auth_user_created`), खात्यांचे स्वयंचलित कन्फर्मेशन, RLS सुरक्षितता, आणि डायग्नोस्टिक व्ह्यू (`v_auth_profiles_status`) |
| **Phase 17** | [`17_phase17_consolidated_master_update.sql`](./17_phase17_consolidated_master_update.sql) | **एकात्मिक मास्टर सिंक व रिअल-टाइम** | संपूर्ण सेंट्रल डेटाबेस अपडेट, Realtime WebSocket रेप्लिकेशन व सिक्युरिटी सुधारणा |
| **Phase 18** | [`18_phase18_central_sales_and_net_profit_fix.sql`](./18_phase18_central_sales_and_net_profit_fix.sql) | **सेंट्रल विक्री, नफा व काऊंटर सिंक फिक्स** | Collision-free इन्व्हॉइस, Realtime सेल्स ब्रॉडकास्ट, आणि Today Net Profit अचूक गणना |
| **Phase 19** | [`19_phase19_rename_owner_nikhil_and_admin_nilesh.sql`](./19_phase19_rename_owner_nikhil_and_admin_nilesh.sql) | **युझर नावे मानकीकरण (Nikhil Sakhare & Nilesh Sakhare)** | मालकाचे नाव `Nikhil Sakhare` आणि ॲडमिनचे नाव `Nilesh Sakhare` डेटाबेस, ऑडिट लॉग, सेल्स व व्ह्यूजमध्ये अद्ययावत |
| **Phase 20** | [`20_phase20_customer_returns_and_refunds_sync.sql`](./20_phase20_customer_returns_and_refunds_sync.sql) | **ग्राहक माल परतावा, संपूर्ण व आंशिक बिल वजावट सिंक** | संपूर्ण परतावा (पावती हटवणे व परतावा वहीत नोंद), आंशिक परतावा (शिल्लक माल पावतीत ठेवून बिल अपडेट), रिअल-टाइम सिंक व अहवाल व्ह्यू |
| **Phase 21** | [`21_phase21_sales_return_ledger_and_invoice_sync.sql`](./21_phase21_sales_return_ledger_and_invoice_sync.sql) | **दैनिक विक्री व रोकड लेजर रिअल-टाइम परतावा वजावट** | आंशिक परताव्यावर पावती कट, डेली लेजरमध्ये मूळ व सुधारित रक्कम अपडेट, v_daily_sales_and_returns_ledger व्ह्यू व रिअल-टाइम सिंक |
| **Phase 22** | [`22_phase22_customer_gender_agegroup_sales_analytics.sql`](./22_phase22_customer_gender_agegroup_sales_analytics.sql) | **ग्राहक लिंग व वयोगट विक्री विश्लेषण** | POS बिलिंगमध्ये Gender (पुरुष/महिला/इतर) व Age Group (<18, 18-25, 26-45, 45+) फील्ड्स; `v_sales_customer_demographics` व `v_daily_gender_revenue` ॲनालिटिक्स व्ह्यूज; udhar_customers address/notes कॉलम; Realtime सक्षम |
| **Phase 23** | [`23_phase23_fix_agegroup_filter_mismatch.sql`](./23_phase23_fix_agegroup_filter_mismatch.sql) | **वयोगट फिल्टर मिसमॅच फिक्स** | जुन्या 'Kids/Teens (<18)' व 'Seniors (45+)' डेटा → 'Kids (<18)' व 'Senior (45+)' मध्ये सुधारणा; CHECK constraint अपडेट; ॲनालिटिक्स व्ह्यूज पुन्हा तयार |
| **Phase 24** | [`24_phase24_kpi_cards_demographic_filter.sql`](./24_phase24_kpi_cards_demographic_filter.sql) | **KPI कार्ड्स डेमोग्राफिक फिल्टर** | Gender व Age Group फिल्टरनुसार Total Sales, Cash Inflow, Online UPI, Credit Given KPI कार्ड्स अपडेट; `v_sales_kpi_by_demographics` व्ह्यू; composite index |
| **Phase 25** | [`25_phase25_sale_items_and_product_details_fix.sql`](./25_phase25_sale_items_and_product_details_fix.sql) | **बिलातील वस्तू व इनव्हॉइस लेजर तपशील फिक्स** | `sale_items` टेबलसाठी RLS, UUID, ON DELETE SET NULL, Realtime पब्लिकेशन आणि बिलातील वस्तू दर्शवणारा `v_owner_admin_counter_sales_details` व्ह्यू |
| **Phase 26** | [`26_phase26_invoices_ledger_edit_delete_support.sql`](./26_phase26_invoices_ledger_edit_delete_support.sql) | **इनव्हॉइस लेजर बिल संपादन (Edit) व डिलीट (Delete) सपोर्ट** | बिलांचे संपादन आणि डिलीट करण्यासाठी RLS, `ON DELETE CASCADE`, `SALE_UPDATED` ऑडिट लॉग ट्रिगर आणि Realtime ब्राॅडकास्ट |
| **Phase 27** | [`27_phase27_advanced_customer_returns_workflow.sql`](./27_phase27_advanced_customer_returns_workflow.sql) | **प्रगत ग्राहक माल परतावा (100% संपूर्ण बिल किंवा निवडक माल वापसी)** | १. ⚡ संपूर्ण बिल वापसी (100% Full Return - पावती रद्द व पूर्ण रिफंड), २. ✂️ निवडक/आंशिक माल वापसी (Partial Return - शिल्लक माल पावतीत ठेवून सुधारित बिल), ३. 📦 थेट परतावा; `product_returns.return_type`, फॉरेन की सुरक्षा, ॲनालिटिक्स व्ह्यूज व Realtime |

---

## 🚀 मॅन्युअल सेटअप करण्याची सोपी पद्धत (Step-by-Step Instructions)

### **पायरी १: Supabase Dashboard मध्ये जा**
1. [Supabase Dashboard](https://supabase.com/dashboard) उघडा.
2. तुमच्या **Yogeshwari Dairy** प्रोजेक्टवर क्लिक करा.

### **पायरी २: SQL Editor उघडा**
1. डाव्या बाजूच्या मेनूमधील **`SQL Editor`** (टर्मिनल आयकॉन) वर क्लिक करा.
2. हिरव्या **`+ New query`** बटणावर क्लिक करा.

### **पायरी ३: टप्प्याटप्प्याने फाइल्स चालवा (Run Phase by Phase)**
1. संगणकावरील `supabase/01_phase1_extensions_and_catalog.sql` फाइल उघडा आणि संपूर्ण कोड कॉपी करा.
2. Supabase SQL Editor मध्ये पेस्ट करा आणि **`Run`** (किंवा `Ctrl + Enter`) दाबा.
3. खाली **`Success. No rows returned`** असा हिरवा मेसेज येईल.
4. याचप्रमाणे **Phase 2 ते Phase 12** पर्यंतच्या सर्व फाइल्स एकामागोमाग एक रन करा.

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
3. तुम्ही काऊंटरवर नवीन बिल बनवल्यास, नवीन खरेदी नोंदवल्यास किंवा उधारी पावती दिल्यास ती माहिती थेट Supabase च्या **`Table Editor`** मध्ये रिअल-टाइम दिसेल!
