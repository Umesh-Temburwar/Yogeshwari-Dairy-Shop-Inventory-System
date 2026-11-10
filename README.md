# 🥛 योगेश्वरी डेरी फार्म & स्वीट्स - इन्वेंटरी & शॉप ERP सिस्टम
### Yogeshwari Dairy Shop - Enterprise Inventory & Management System
> Built with **React 19**, **Node.js (Express)**, **Supabase PostgreSQL**, **Tailwind CSS**, and **Recharts**.

---

## 🌟 मुख्य विशेषताएं (Core Features)

1. **दूध & माल इन्वेंट्री (Add Maal, Edit, Update & Delete)**:
   - ताज़ा भैंस दूध, देसी गाय दूध, मलाई पनीर, देसी दही, छाछ, शुद्ध घी, मावा/खोया, काजू कतली आदि का पूर्ण प्रबंधन।
   - खरीद भाव (Cost Price) vs बिक्री भाव (Selling Price) और स्वचालित मार्जिन (% Profit) गणना।
   - न्यूनतम स्टॉक अलर्ट (Low Stock Alert Threshold)।
   - त्वरित स्टॉक समायोजन (+ / - बटन सीधे रो पर)।

2. **दैनिक काउंटर बिलिंग & बिक्री (Daily Maal Kitta Gya / POS)**:
   - तेज़ काउंटर बिलिंग: दूध लीटर में या सीधे ₹ रुपये में (उदा. "₹50 का पनीर" / "₹40 का दूध" कनवर्टर)।
   - थर्मल रसीद प्रिंटिंग (80mm Thermal Receipt Generator)।
   - एक-क्लिक बिल भुगतान और लाइव स्टॉक अपडेट।

3. **रोकड़ (Cash) & ऑनलाइन (UPI / QR) ट्रैकिंग (Daily, Weekly, Monthly, Yearly)**:
   - रोकड़ (Cash Rokad) कितना आया vs ऑनलाइन (PhonePe, GPay, Paytm) कितना आया।
   - स्प्लिट पेमेंट (आधा कैश + आधा ऑनलाइन)।
   - दैनिक (Today), साप्ताहिक (Week), मासिक (Month), और वार्षिक (Year) फिल्टर व चार्ट।

4. **खराब व डैमेज माल ट्रैकर (Damage Maal Kitta Aya)**:
   - फटा हुआ दूध (Curdled milk), पाउच लीकेज, एक्सपायरी व हैंडलिंग खराबी का हिसाब।
   - नुकसान की वित्तीय राशि (Financial Loss) की स्वतः गणना।
   - सीधे नेट प्रॉफिट से नुकसान का समायोजन।

5. **स्टॉक की ज़रूरत & रीऑर्डर अलर्ट (Need Kya Hai Maal Ki)**:
   - दुकान में कौनसा माल खत्म होने वाला है उसका अलर्ट।
   - "आज का आर्डर मांग पत्र": किसानों व सप्लायरों से कितना माल मंगाना है उसका अनुमान।
   - 1-क्लिक **WhatsApp आर्डर लिस्ट कॉपी** फीचर।

6. **बेस्ट सेलर विश्लेषण (Konsa Maal Jada Bikata Hai)**:
   - बिक्री मात्रा (Liters/Kg) और कमाई (₹ Revenue) के आधार पर टॉप उत्पाद लीडरबोर्ड।
   - विजुअल चार्ट्स व रैंकिंग।

7. **खरीद ट्रैकिंग (Daily Ka Kitna Kharida)**:
   - किसानों व सप्लायरों से कच्चा दूध व सामान खरीद की एंट्री।
   - प्रति लीटर/किलो खरीद दर, फैट स्तर, व इनवॉइस नंबर।
   - दैनिक खरीद vs बिक्री का लाइव अनुपात।

8. **शुद्ध मुनाफा रिपोर्ट (Profit Apane Ko Kitta Mila)**:
   - कुल बिक्री - माल खरीद लागत = **सकल लाभ (Gross Profit)**।
   - सकल लाभ - (दुकान किराया + बिजली बिल + पेट्रोल + डैमेज) = **शुद्ध लाभ (Net Profit)**।
   - दैनिक, साप्ताहिक, मासिक व वार्षिक P&L स्टेटमेंट।

9. **उधारी खाता लेजर (Udhari Khata Book)**:
   - हलवाइयों, चाय वालों और नियमित ग्राहकों का उधारी खाता।
   - उधारी दी (Credit Given) vs जमा की (Payment Received / Jama)।
   - **1-Click WhatsApp तकादा (Payment Reminder)**: ग्राहक को सीधे हिंदी में बकाया रकम का WhatsApp संदेश भेजें।

10. **दुकान खर्च & पूंजी निवेश (Rent, Light Bill, Petrol & Capital Investments)**:
    - दुकान किराया (Shop Rent), चिलर का लाइट बिल (Electricity Bill), गाड़ी व डिलीवरी पेट्रोल।
    - **Shop Capital Investment**: नया डीप फ्रीजर, कमर्शियल भट्टी, डिजिटल तराजू आदि पूंजीगत संपत्तियों का अलग हिसाब।

---

## 🚀 शुरू करने का तरीका (Quick Start)

### 1. प्रोजेक्ट रन करें (Development Mode)
```bash
npm run dev
```
ब्राउज़र में खोलें: `http://localhost:5173`

### 2. Node.js सर्वर चलाएं (Production Server)
```bash
npm run build
npm run server
```
एप्लिकेशन लाइव होगा: `http://localhost:5000`

---

## 🗄️ Supabase डेटाबेस सेटअप (Supabase Cloud Setup)

1. [Supabase.com](https://supabase.com) पर नया फ्री प्रोजेक्ट बनाएं।
2. लेफ्ट साइडबार में **SQL Editor** खोलें।
3. `supabase/schema.sql` फाइल का पूरा कोड पेस्ट करके **Run** दबाएं।
4. प्रोजेक्ट सेटिंग्स से **Project URL** और **Anon Public API Key** कॉपी करें।
5. ऐप में ऊपर दाईं ओर **"Offline / Local"** बटन पर क्लिक करें और अपनी चाबी पेस्ट करके **Save & Connect** दबाएं।
*(नोट: यदि आप Supabase नहीं जोड़ना चाहते, तो ऐप अपने आप ब्राउज़र LocalStorage में 100% काम करता है!)*

---

## ⌨️ कीबोर्ड शॉर्टकट (Fast Keyboard Shortcuts)
- **F2**: तुरंत नया बिलिंग काउंटर खोलें
- **F3**: नया माल जोड़ने का फॉर्म खोलें
- **F4**: उधारी खाता लेजर खोलें
