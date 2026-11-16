/**
 * Intelligent Trilingual Product Name Translation & Transliteration Engine
 * Translates and transliterates English product names into authentic Marathi and Hindi.
 * Designed specifically for Indian Dairy, Bakery, Beverage & Retail Grocery products.
 *
 * Architecture:
 * 1. Dairy & Grocery Domain Dictionary (High priority phrases & terms)
 * 2. Online Google Translate GTX Fetch (with timeout & network error resilience)
 * 3. Dairy Post-Processor (ensures dairy-correct words like 'दूध' instead of 'मिल्क', 'तूप' instead of 'घी' in Marathi)
 * 4. Rule-Based Phonetic Transliteration Engine (offline fallback for unknown brand names & words)
 */

// 1. Phrasal & Word Dictionary for Dairy, Bakery, Confectionery & Grocery
interface TranslationPair {
  mr: string;
  hi: string;
}

const PHRASE_DICTIONARY: Record<string, TranslationPair> = {
  // Milk types
  'buffalo milk': { mr: 'म्हशीचे दूध', hi: 'भैंस का दूध' },
  'cow milk': { mr: 'गायीचे दूध', hi: 'गाय का दूध' },
  'fresh milk': { mr: 'ताजे दूध', hi: 'ताज़ा दूध' },
  'full cream milk': { mr: 'फुल क्रीम दूध', hi: 'फुल क्रीम दूध' },
  'toned milk': { mr: 'टोन्ड दूध', hi: 'टोंड दूध' },
  'double toned milk': { mr: 'डबल टोन्ड दूध', hi: 'डबल टोंड दूध' },
  'standardized milk': { mr: 'स्टँडर्ड दूध', hi: 'मानकीकृत दूध' },
  'standardised milk': { mr: 'स्टँडर्ड दूध', hi: 'मानकीकृत दूध' },
  'skimmed milk': { mr: 'स्किम्ड दूध', hi: 'स्किम्ड दूध' },
  'skim milk': { mr: 'स्किम्ड दूध', hi: 'स्किम्ड दूध' },
  'raw milk': { mr: 'कच्चे दूध', hi: 'कच्चा दूध' },
  'boiled milk': { mr: 'उकळलेले दूध', hi: 'उबला दूध' },
  'pasteurized milk': { mr: 'पाश्चराइज्ड दूध', hi: 'पाश्चुरीकृत दूध' },
  'homogenized milk': { mr: 'होमोजिनाइज्ड दूध', hi: 'होमोजिनाइज्ड दूध' },
  'homogenised milk': { mr: 'होमोजिनाइज्ड दूध', hi: 'होमोजिनाइज्ड दूध' },
  'tea special milk': { mr: 'चहा स्पेशल दूध', hi: 'चाय स्पेशल दूध' },
  'chai special milk': { mr: 'चहा स्पेशल दूध', hi: 'चाय स्पेशल दूध' },

  // Ghee & Butter
  'cow ghee': { mr: 'गाय तूप', hi: 'गाय का घी' },
  'buffalo ghee': { mr: 'म्हशीचे तूप', hi: 'भैंस का घी' },
  'desi ghee': { mr: 'देशी तूप', hi: 'देसी घी' },
  'pure ghee': { mr: 'शुद्ध तूप', hi: 'शुद्ध घी' },
  'fresh ghee': { mr: 'ताजे तूप', hi: 'ताज़ा घी' },
  'white butter': { mr: 'पांढरे लोणी', hi: 'सफेद मक्खन' },
  'yellow butter': { mr: 'पिवळे बटर', hi: 'पीला मक्खन' },
  'table butter': { mr: 'टेबल बटर', hi: 'टेबल बटर' },
  'salted butter': { mr: 'खारट लोणी', hi: 'नमकीन मक्खन' },
  'unsalted butter': { mr: 'बिनमिठाचे लोणी', hi: 'बिना नमक मक्खन' },

  // Paneer, Curd & Chaas
  'fresh paneer': { mr: 'ताजे पनीर', hi: 'ताज़ा पनीर' },
  'malai paneer': { mr: 'मलाई पनीर', hi: 'मलाई पनीर' },
  'cottage cheese': { mr: 'पनीर', hi: 'पनीर' },
  'sweet dahi': { mr: 'गोड दही', hi: 'मीठा दही' },
  'sweet curd': { mr: 'गोड दही', hi: 'मीठा दही' },
  'plain dahi': { mr: 'साधे दही', hi: 'सादा दही' },
  'plain curd': { mr: 'साधे दही', hi: 'सादा दही' },
  'masala chaas': { mr: 'मसाला ताक', hi: 'मसाला छाछ' },
  'masala buttermilk': { mr: 'मसाला ताक', hi: 'मसाला छाछ' },
  'jeera chaas': { mr: 'जिरा ताक', hi: 'जीरा छाछ' },
  'jeera buttermilk': { mr: 'जिरा ताक', hi: 'जीरा छाछ' },
  'mango lassi': { mr: 'मँगो लस्सी', hi: 'मैंगो लस्सी' },
  'sweet lassi': { mr: 'गोड लस्सी', hi: 'मीठी लस्सी' },
  'rose lassi': { mr: 'गुलाब लस्सी', hi: 'गुलाब लस्सी' },

  // Shrikhand & Sweets
  'kesar pista shrikhand': { mr: 'केसर पिस्ता श्रीखंड', hi: 'केसर पिस्ता श्रीखंड' },
  'elaichi shrikhand': { mr: 'वेलची श्रीखंड', hi: 'इलायची श्रीखंड' },
  'mango shrikhand': { mr: 'आम्रखंड', hi: 'आम्रखंड' },
  'amrakhand': { mr: 'आम्रखंड', hi: 'आम्रखंड' },
  'fresh khawa': { mr: 'ताजा खवा', hi: 'ताज़ा मावा' },
  'fresh mawa': { mr: 'ताजा खवा', hi: 'ताज़ा मावा' },
  'fresh khoa': { mr: 'ताजा खवा', hi: 'ताज़ा मावा' },
  'sitaphal basundi': { mr: 'सीताफळ बासुंदी', hi: 'सीताफल बासुंदी' },
  'kaju katli': { mr: 'काजू कतली', hi: 'काजू कतली' },
  'gulab jamun': { mr: 'गुलाबजामुन', hi: 'गुलाब जामुन' },
  'milk cake': { mr: 'मिल्क केक', hi: 'मिल्क केक' },
  'motichoor laddu': { mr: 'मोतीचूर लाडू', hi: 'मोतीचूर लड्डू' },
  'motichoor ladoo': { mr: 'मोतीचूर लाडू', hi: 'मोतीचूर लड्डू' },
  'besan laddu': { mr: 'बेसन लाडू', hi: 'बेसन लड्डू' },
  'besan ladoo': { mr: 'बेसन लाडू', hi: 'बेसन लड्डू' },
  'malai peda': { mr: 'मलाई पेढा', hi: 'मलाई पेड़ा' },
  'kesar peda': { mr: 'केसर पेढा', hi: 'केसर पेड़ा' },
  'kandi peda': { mr: 'कांडी पेढा', hi: 'कांडी पेड़ा' },

  // Sweets, Bakery & Confectionery brands
  'good day': { mr: 'गुड डे', hi: 'गुड डे' },
  'parle-g': { mr: 'पारले-जी', hi: 'पारले-जी' },
  'parle g': { mr: 'पारले-जी', hi: 'पारले-जी' },
  'marie gold': { mr: 'मेरी गोल्ड', hi: 'मैरी गोल्ड' },
  'dark fantasy': { mr: 'डार्क फँटसी', hi: 'डार्क फैंटेसी' },
  'hide & seek': { mr: 'हाईड अँड सीक', hi: 'हाइड एंड सीक' },
  'hide and seek': { mr: 'हाईड अँड सीक', hi: 'हाइड एंड सीक' },
  'krackjack': { mr: 'क्रॅकजॅक', hi: 'क्रैकजैक' },
  'monaco': { mr: 'मोनाको', hi: 'मोनाको' },
  'bourbon': { mr: 'बर्बन', hi: 'बर्बन' },
  'jim jam': { mr: 'जिम जॅम', hi: 'जिम जैम' },
  'milk bikis': { mr: 'मिल्क बिकिस', hi: 'मिल्क बिकिस' },
  'dairy milk': { mr: 'डेअरी मिल्क', hi: 'डेयरी मिल्क' },
  '5 star': { mr: 'फाइव्ह स्टार', hi: 'फाइव स्टार' },
  'five star': { mr: 'फाइव्ह स्टार', hi: 'फाइव स्टार' },
  'kitkat': { mr: 'किटकेट', hi: 'किटकेट' },
  'kit kat': { mr: 'किटकेट', hi: 'किटकेट' },
  'amul kool': { mr: 'अमुल कूल', hi: 'अमुल कूल' },
  'bakarwadi': { mr: 'बाकरवडी', hi: 'बाकरवड़ी' },
  'farsan': { mr: 'फरसाण', hi: 'फरसाण' },
  'chivda': { mr: 'चिवडा', hi: 'चिवड़ा' },
  'bhujia': { mr: 'भुजिया', hi: 'भुजिया' },
  'aloo bhujia': { mr: 'आलू भुजिया', hi: 'आलू भुजिया' },
  'sev': { mr: 'शेव', hi: 'सेव' },
  'ratlami sev': { mr: 'रतलामी शेव', hi: 'रतलामी सेव' },
  'soan papdi': { mr: 'सोनपापडी', hi: 'सोन पापड़ी' },

  // Bakery & Extras
  'white bread': { mr: 'व्हाईट ब्रेड', hi: 'व्हाइट ब्रेड' },
  'brown bread': { mr: 'ब्राऊन ब्रेड', hi: 'ब्राउन ब्रेड' },
  'wheat bread': { mr: 'गहू ब्रेड (आटा)', hi: 'आटा ब्रेड' },
  'sandwich bread': { mr: 'सँडविच ब्रेड', hi: 'सैंडविच ब्रेड' },
  'ladi pav': { mr: 'लादी पाव', hi: 'लादी पाव' },
  'burger bun': { mr: 'बर्गर बन', hi: 'बर्गर बन' },
  'milk toast': { mr: 'मिल्क टोस्ट', hi: 'मिल्क टोस्ट' },
  'butter khari': { mr: 'बटर खारी', hi: 'बटर खारी' },
  'jeera khari': { mr: 'जिरा खारी', hi: 'जीरा खारी' },
  'methi khari': { mr: 'मेथी खारी', hi: 'मेथी खारी' },
  'cream roll': { mr: 'क्रीम रोल', hi: 'क्रीम रोल' },
  'green peas': { mr: 'हिरवे मटार', hi: 'हरी मटर' },
  'frozen peas': { mr: 'फ्रोजन मटार', hi: 'फ्रोजन मटर' },
  'ice cream': { mr: 'आईस्क्रीम', hi: 'आइसक्रीम' },
  'cheese slice': { mr: 'चीज स्लाईस', hi: 'चीज स्लाइस' },
  'cheese cube': { mr: 'चीज क्यूब', hi: 'चीज क्यूब' },
  'cheese spread': { mr: 'चीज स्प्रेड', hi: 'चीज स्प्रेड' },
  'fresh cream': { mr: 'फ्रेश क्रीम', hi: 'ताज़ी क्रीम' },

  // Popular Brands & Flagship Products
  'amul taaza': { mr: 'अमुल ताझा', hi: 'अमुल ताज़ा' },
  'amul gold': { mr: 'अमुल गोल्ड', hi: 'अमुल गोल्ड' },
  'amul cow milk': { mr: 'अमुल गाय दूध', hi: 'अमुल गाय का दूध' },
  'amul buffalo milk': { mr: 'अमुल म्हैस दूध', hi: 'अमुल भैंस का दूध' },
  'amul shakti': { mr: 'अमुल शक्ती', hi: 'अमुल शक्ति' },
  'amul diamond': { mr: 'अमुल डायमंड', hi: 'अमुल डायमंड' },
  'amul butter': { mr: 'अमुल बटर', hi: 'अमुल बटर' },
  'amul paneer': { mr: 'अमुल पनीर', hi: 'अमुल पनीर' },
  'amul ghee': { mr: 'अमुल तूप', hi: 'अमुल घी' },
  'amul masti dahi': { mr: 'अमुल मस्ती दही', hi: 'अमुल मस्ती दही' },
  'amul cheese slice': { mr: 'अमुल चीज स्लाईस', hi: 'अमुल चीज स्लाइस' },
  'amul cheese cube': { mr: 'अमुल चीज क्यूब', hi: 'अमुल चीज क्यूब' },
  'gokul milk': { mr: 'गोकुळ दूध', hi: 'गोकुल दूध' },
  'gokul special': { mr: 'गोकुळ स्पेशल', hi: 'गोकुल स्पेशल' },
  'gokul cow milk': { mr: 'गोकुळ गाय दूध', hi: 'गोकुल गाय दूध' },
  'chitale milk': { mr: 'चितळे दूध', hi: 'चितले दूध' },
  'chitale doodh': { mr: 'चितळे दूध', hi: 'चितले दूध' },
  'chitale bakarwadi': { mr: 'चितळे बाकरवडी', hi: 'चितले बाकरवड़ी' },
  'chitale dahi': { mr: 'चितळे दही', hi: 'चितले दही' },
  'mother dairy milk': { mr: 'मदर डेअरी दूध', hi: 'मदर डेयरी दूध' },
  'warana milk': { mr: 'वारणा दूध', hi: 'वारणा दूध' },
  'mahanand milk': { mr: 'महानंद दूध', hi: 'महानंद दूध' },

  // Additional Traditional Sweets & Dairy Specialties
  'rabdi': { mr: 'रबडी', hi: 'रबड़ी' },
  'angoor rabdi': { mr: 'अंगूर रबडी', hi: 'अंगूर रबड़ी' },
  'cham cham': { mr: 'चमचम', hi: 'चमचम' },
  'rajbhog': { mr: 'राजभोग', hi: 'राजभोग' },
  'kaju barfi': { mr: 'काजू बर्फी', hi: 'काजू बर्फी' },
  'coconut barfi': { mr: 'नारळ बर्फी', hi: 'नारियल बर्फी' },
  'anjeer barfi': { mr: 'अंजीर बर्फी', hi: 'अंजीर बर्फी' },
  'mysore pak': { mr: 'म्हैसूर पाक', hi: 'मैसूर पाक' },
  'dink laddu': { mr: 'डिंकाचे लाडू', hi: 'गोंद के लड्डू' },
  'dink ladoo': { mr: 'डिंकाचे लाडू', hi: 'गोंद के लड्डू' },
  'methi laddu': { mr: 'मेथी लाडू', hi: 'मेथी के लड्डू' },
  'methi ladoo': { mr: 'मेथी लाडू', hi: 'मेथी के लड्डू' },
  'boondi laddu': { mr: 'बुंदी लाडू', hi: 'बूंदी लड्डू' },
  'boondi ladoo': { mr: 'बुंदी लाडू', hi: 'बूंदी लड्डू' },
  'rava laddu': { mr: 'रवा लाडू', hi: 'रवा लड्डू' },
  'rava ladoo': { mr: 'रवा लाडू', hi: 'रवा लड्डू' },
  'paneer bhurji': { mr: 'पनीर भुर्जी', hi: 'पनीर भुर्जी' },
  'paneer tikka': { mr: 'पनीर टिक्का', hi: 'पनीर टिक्का' }
};

const WORD_DICTIONARY: Record<string, TranslationPair> = {
  // Brands
  'amul': { mr: 'अमुल', hi: 'अमुल' },
  'gokul': { mr: 'गोकुळ', hi: 'गोकुल' },
  'chitale': { mr: 'चितळे', hi: 'चितले' },
  'mother': { mr: 'मदर', hi: 'मदर' },
  'dairy': { mr: 'डेअरी', hi: 'डेयरी' },
  'mahanand': { mr: 'महानंद', hi: 'महानंद' },
  'katraj': { mr: 'कात्रज', hi: 'कात्रज' },
  'warana': { mr: 'वारणा', hi: 'वारणा' },
  'nandini': { mr: 'नंदिनी', hi: 'नंदिनी' },
  'britannia': { mr: 'ब्रिटानिया', hi: 'ब्रिटानिया' },
  'parle': { mr: 'पारले', hi: 'पारले' },
  'nestle': { mr: 'नेस्ले', hi: 'नेस्ले' },
  'cadbury': { mr: 'कॅडबरी', hi: 'कैडबरी' },
  'haldiram': { mr: 'हल्दीराम', hi: 'हल्दीराम' },
  'haldirams': { mr: 'हल्दीराम', hi: 'हल्दीराम' },
  'bikaji': { mr: 'बिकाजी', hi: 'बिकाजी' },
  'patanjali': { mr: 'पतंजली', hi: 'पतंजलि' },
  'tata': { mr: 'टाटा', hi: 'टाटा' },
  'fortune': { mr: 'फॉर्च्यून', hi: 'फॉर्च्यून' },
  'saffola': { mr: 'सफोला', hi: 'सफोला' },
  'gemini': { mr: 'जेमिनी', hi: 'जेमिनी' },
  'maggi': { mr: 'मॅगी', hi: 'मैगी' },
  'knorr': { mr: 'नॉर', hi: 'नॉर' },
  'kissan': { mr: 'किसान', hi: 'किसान' },
  'sunfeast': { mr: 'सनफीस्ट', hi: 'सनफीस्ट' },
  'cadburys': { mr: 'कॅडबरी', hi: 'कैडबरी' },
  'priyagold': { mr: 'प्रियागोल्ड', hi: 'प्रियागोल्ड' },
  'bournvita': { mr: 'बोर्नव्हिटा', hi: 'बॉर्नविटा' },
  'horlicks': { mr: 'हॉर्लिक्स', hi: 'हॉर्लिक्स' },
  'complan': { mr: 'कॉम्प्लॅन', hi: 'कॉम्प्लान' },
  'frooti': { mr: 'फ्रूटी', hi: 'फ्रूटी' },
  'maaza': { mr: 'माझा', hi: 'माज़ा' },
  'sprite': { mr: 'स्प्राइट', hi: 'स्प्राइट' },
  'thums': { mr: 'थम्स', hi: 'थम्स' },
  'up': { mr: 'अप', hi: 'अप' },
  'pepsi': { mr: 'पेप्सी', hi: 'पेप्सी' },
  'coke': { mr: 'कोक', hi: 'कोक' },

  // Dairy Core
  'milk': { mr: 'दूध', hi: 'दूध' },
  'curd': { mr: 'दही', hi: 'दही' },
  'dahi': { mr: 'दही', hi: 'दही' },
  'paneer': { mr: 'पनीर', hi: 'पनीर' },
  'ghee': { mr: 'तूप', hi: 'घी' },
  'butter': { mr: 'लोणी', hi: 'मक्खन' },
  'chaas': { mr: 'ताक', hi: 'छाछ' },
  'buttermilk': { mr: 'ताक', hi: 'छाछ' },
  'lassi': { mr: 'लस्सी', hi: 'लस्सी' },
  'shrikhand': { mr: 'श्रीखंड', hi: 'श्रीखंड' },
  'basundi': { mr: 'बासुंदी', hi: 'बासुंदी' },
  'khawa': { mr: 'खवा', hi: 'मावा' },
  'khoa': { mr: 'खवा', hi: 'मावा' },
  'mawa': { mr: 'खवा', hi: 'मावा' },
  'peda': { mr: 'पेढा', hi: 'पेड़ा' },
  'pede': { mr: 'पेढे', hi: 'पेड़े' },
  'barfi': { mr: 'बर्फी', hi: 'बर्फी' },
  'burfi': { mr: 'बर्फी', hi: 'बर्फी' },
  'cheese': { mr: 'चीज', hi: 'चीज' },
  'cream': { mr: 'क्रीम', hi: 'क्रीम' },
  'malai': { mr: 'मलाई', hi: 'मलाई' },
  'kulfi': { mr: 'कुल्फी', hi: 'कुल्फी' },
  'rasgulla': { mr: 'रसगुल्ला', hi: 'रसगुल्ला' },
  'rasmalai': { mr: 'रसमलाई', hi: 'रसमलाई' },
  'kalakand': { mr: 'कलाकंद', hi: 'कलाकंद' },
  'sweets': { mr: 'मिठाई', hi: 'मिठाई' },
  'mithai': { mr: 'मिठाई', hi: 'मिठाई' },

  // Animal / Nature
  'cow': { mr: 'गाय', hi: 'गाय' },
  'buffalo': { mr: 'म्हैस', hi: 'भैंस' },

  // Quality & Type
  'fresh': { mr: 'ताजे', hi: 'ताज़ा' },
  'pure': { mr: 'शुद्ध', hi: 'शुद्ध' },
  'special': { mr: 'स्पेशल', hi: 'विशेष' },
  'organic': { mr: 'सेंद्रिय', hi: 'जैविक' },
  'natural': { mr: 'नैसर्गिक', hi: 'प्राकृतिक' },
  'sweet': { mr: 'गोड', hi: 'मीठा' },
  'salted': { mr: 'खारट', hi: 'नमकीन' },
  'plain': { mr: 'साधे', hi: 'सादा' },
  'premium': { mr: 'प्रीमियम', hi: 'प्रीमियम' },
  'gold': { mr: 'गोल्ड', hi: 'गोल्ड' },
  'taaza': { mr: 'ताझा', hi: 'ताज़ा' },
  'taza': { mr: 'ताझा', hi: 'ताज़ा' },
  'moti': { mr: 'मोती', hi: 'मोती' },
  'lite': { mr: 'लाईट', hi: 'लाइट' },
  'light': { mr: 'लाईट', hi: 'लाइट' },
  'diet': { mr: 'डाएट', hi: 'डाइट' },
  'classic': { mr: 'क्लासिक', hi: 'क्लासिक' },
  'delight': { mr: 'डिलाईट', hi: 'डिलाइट' },
  'tasty': { mr: 'चवदार', hi: 'स्वादिष्ट' },

  // Flavours & Ingredients
  'mango': { mr: 'आंबा', hi: 'आम' },
  'kesar': { mr: 'केसर', hi: 'केसर' },
  'pista': { mr: 'पिस्ता', hi: 'पिस्ता' },
  'badam': { mr: 'बदाम', hi: 'बादाम' },
  'almond': { mr: 'बदाम', hi: 'बादाम' },
  'kaju': { mr: 'काजू', hi: 'काजू' },
  'cashew': { mr: 'काजू', hi: 'काजू' },
  'elaichi': { mr: 'वेलची', hi: 'इलायची' },
  'cardamom': { mr: 'वेलची', hi: 'इलायची' },
  'chocolate': { mr: 'चॉकलेट', hi: 'चॉकलेट' },
  'strawberry': { mr: 'स्ट्रॉबेरी', hi: 'स्ट्रॉबेरी' },
  'vanilla': { mr: 'व्हॅनिला', hi: 'वेनिला' },
  'rose': { mr: 'गुलाब', hi: 'गुलाब' },
  'jeera': { mr: 'जिरा', hi: 'जीरा' },
  'cumin': { mr: 'जिरा', hi: 'जीरा' },
  'masala': { mr: 'मसाला', hi: 'मसाला' },
  'ginger': { mr: 'आले', hi: 'अदरक' },
  'garlic': { mr: 'लसूण', hi: 'लहसुन' },
  'chilli': { mr: 'मिरची', hi: 'मिर्च' },
  'chili': { mr: 'मिरची', hi: 'मिर्च' },
  'matar': { mr: 'मटार', hi: 'मटर' },
  'peas': { mr: 'मटार', hi: 'मटर' },
  'frozen': { mr: 'फ्रोजन', hi: 'फ्रोजन' },

  // Bakery
  'bread': { mr: 'ब्रेड', hi: 'ब्रेड' },
  'pav': { mr: 'पाव', hi: 'पाव' },
  'paav': { mr: 'पाव', hi: 'पाव' },
  'bun': { mr: 'बन', hi: 'बन' },
  'toast': { mr: 'टोस्ट', hi: 'टोस्ट' },
  'rusk': { mr: 'रस्क', hi: 'रस्क' },
  'khari': { mr: 'खारी', hi: 'खारी' },
  'biscuit': { mr: 'बिस्कीट', hi: 'बिस्कुट' },
  'biscuits': { mr: 'बिस्कीट', hi: 'बिस्कुट' },
  'cookies': { mr: 'कुकीज', hi: 'कूकीज' },
  'cake': { mr: 'केक', hi: 'केक' },
  'pastry': { mr: 'पेस्ट्री', hi: 'पेस्ट्री' },
  'roll': { mr: 'रोल', hi: 'रोल' },

  // Packaging & Measurement Units
  'litre': { mr: 'लिटर', hi: 'लीटर' },
  'liter': { mr: 'लिटर', hi: 'लीटर' },
  'ltr': { mr: 'लिटर', hi: 'लीटर' },
  'l': { mr: 'लिटर', hi: 'लीटर' },
  'ml': { mr: 'मिली', hi: 'मिली' },
  'millilitre': { mr: 'मिली', hi: 'मिली' },
  'milliliter': { mr: 'मिली', hi: 'मिली' },
  'kg': { mr: 'किलो', hi: 'किलो' },
  'kilo': { mr: 'किलो', hi: 'किलो' },
  'kilogram': { mr: 'किलो', hi: 'किलो' },
  'g': { mr: 'ग्रॅम', hi: 'ग्राम' },
  'gm': { mr: 'ग्रॅम', hi: 'ग्राम' },
  'gms': { mr: 'ग्रॅम', hi: 'ग्राम' },
  'gram': { mr: 'ग्रॅम', hi: 'ग्राम' },
  'grams': { mr: 'ग्रॅम', hi: 'ग्राम' },
  'pouch': { mr: 'पाऊच', hi: 'पाउच' },
  'packet': { mr: 'पाकीट', hi: 'पैकेट' },
  'pack': { mr: 'पॅक', hi: 'पैक' },
  'bottle': { mr: 'बाटली', hi: 'बोतल' },
  'can': { mr: 'कॅन', hi: 'कैन' },
  'box': { mr: 'बॉक्स', hi: 'डिब्बा' },
  'cup': { mr: 'कप', hi: 'कप' },
  'tub': { mr: 'टब', hi: 'टब' },
  'tin': { mr: 'टीन', hi: 'टिन' },
  'piece': { mr: 'नग', hi: 'पीस' },
  'pcs': { mr: 'नग', hi: 'पीस' },
  'pc': { mr: 'नग', hi: 'पीस' }
};

// 2. Numbers Translation (Devanagari Digits for Marathi, Standard/Devanagari for Hindi)
const ENGLISH_TO_MARATHI_DIGITS: Record<string, string> = {
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
};

export function toDevanagariDigits(str: string): string {
  return str.replace(/[0-9]/g, d => ENGLISH_TO_MARATHI_DIGITS[d] || d);
}

// 3. Rule-Based Phonetic Transliteration Engine (English Syllables -> Devanagari)
// Handles unknown words like "Nandini", "Warana", "Saras", "Good Day", "Oreo", etc.
export function phoneticTransliterate(word: string, isMarathi: boolean = true): string {
  if (!word) return '';
  const clean = word.toLowerCase().trim();

  // Check direct word dictionary first
  if (WORD_DICTIONARY[clean]) {
    return isMarathi ? WORD_DICTIONARY[clean].mr : WORD_DICTIONARY[clean].hi;
  }

  // Common phonetic multi-character substitutions
  let res = clean;

  // Replace common multi-letter phonetic sequences
  const multiRules: [RegExp, string][] = [
    [/shri/g, 'श्री'],
    [/shree/g, 'श्री'],
    [/chha/g, 'छा'],
    [/chhi/g, 'छि'],
    [/chhu/g, 'छु'],
    [/chhe/g, 'छे'],
    [/chho/g, 'छो'],
    [/chhai/g, 'छै'],
    [/chhau/g, 'छौ'],
    [/ch/g, 'च'],
    [/sh/g, 'श'],
    [/kh/g, 'ख'],
    [/gh/g, 'घ'],
    [/jh/g, 'झ'],
    [/th/g, 'थ'],
    [/dh/g, 'ध'],
    [/ph/g, 'फ'],
    [/bh/g, 'भ'],
    [/ng/g, 'ंग'],
    [/ny/g, 'न्य'],
    [/gy/g, 'ज्ञ'],
    [/tr/g, 'त्र'],
    [/ksh/g, 'क्ष'],
    [/oo/g, 'ू'],
    [/ee/g, 'ी'],
    [/aa/g, 'ा'],
    [/ai/g, 'ै'],
    [/au/g, 'ौ'],
    [/ei/g, 'े'],
    [/ou/g, 'ौ']
  ];

  for (const [pattern, repl] of multiRules) {
    res = res.replace(pattern, repl);
  }

  // Consonant + Vowel combinations
  const consonantMap: Record<string, string> = {
    'k': 'क', 'g': 'ग',
    'c': 'क', 'j': 'ज', 'z': 'झ',
    't': 'ट', 'd': 'ड', 'n': 'न',
    'p': 'प', 'f': 'फ', 'b': 'ब', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': isMarathi ? 'ळ' : 'ल', 'v': 'व', 'w': 'व',
    's': 'स', 'h': 'ह', 'x': 'क्स', 'q': 'क'
  };

  const vowelMatra: Record<string, string> = {
    'a': 'ा', 'e': 'े', 'i': 'ि', 'o': 'ो', 'u': 'ु'
  };

  const independentVowels: Record<string, string> = {
    'a': 'अ', 'e': 'ए', 'i': 'इ', 'o': 'ओ', 'u': 'उ'
  };

  let out = '';
  let i = 0;
  while (i < res.length) {
    const ch = res[i];

    // Already Devanagari character
    if (/[\u0900-\u097F]/.test(ch)) {
      out += ch;
      i++;
      continue;
    }

    // Numbers & Punctuation
    if (/[0-9]/.test(ch)) {
      out += isMarathi ? (ENGLISH_TO_MARATHI_DIGITS[ch] || ch) : ch;
      i++;
      continue;
    }

    if (/[^a-zA-Z]/.test(ch)) {
      out += ch;
      i++;
      continue;
    }

    // Check consonant
    if (consonantMap[ch]) {
      const devConsonant = consonantMap[ch];
      const nextCh = i + 1 < res.length ? res[i + 1] : '';

      if (vowelMatra[nextCh]) {
        // Special case: 'a' at start of vowel could mean full consonant without extra aa matra
        // In Hindi/Marathi, e.g. "parle" -> 'p' + 'a' = 'प' (not 'पा')
        if (nextCh === 'a') {
          out += devConsonant;
        } else {
          out += devConsonant + vowelMatra[nextCh];
        }
        i += 2;
        continue;
      } else {
        // No vowel immediately follows -> half consonant or consonant
        // If at the end of word or followed by space/symbol
        if (!nextCh || /[^a-zA-Z]/.test(nextCh)) {
          out += devConsonant;
        } else {
          out += devConsonant;
        }
        i++;
        continue;
      }
    }

    // Independent vowel (at start of syllable)
    if (independentVowels[ch]) {
      out += independentVowels[ch];
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

// 4. Synchronous High-Accuracy Translation using Domain Rules & Transliteration
export function translateProductNameSync(englishName: string): { marathi: string; hindi: string } {
  if (!englishName || !englishName.trim()) {
    return { marathi: '', hindi: '' };
  }

  const raw = englishName.trim();

  // Normalize spaces and extract tokens
  let marathiResult = raw;
  let hindiResult = raw;

  // Step 1: Match multi-word phrases (longest first)
  const phrases = Object.keys(PHRASE_DICTIONARY).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    if (regex.test(marathiResult)) {
      marathiResult = marathiResult.replace(regex, PHRASE_DICTIONARY[phrase].mr);
      hindiResult = hindiResult.replace(regex, PHRASE_DICTIONARY[phrase].hi);
    }
  }

  // Step 2: Handle Units and Measurements attached to numbers (e.g., 500ml, 1L, 200g, 1kg)
  // 500ml -> ५०० मिली / 500 मिली
  marathiResult = marathiResult.replace(/(\d+)\s*ml\b/gi, (_, num) => `${toDevanagariDigits(num)} मिली`);
  hindiResult = hindiResult.replace(/(\d+)\s*ml\b/gi, (_, num) => `${num} मिली`);

  marathiResult = marathiResult.replace(/(\d+)\s*(?:l|ltr|litre|liter)\b/gi, (_, num) => `${toDevanagariDigits(num)} लिटर`);
  hindiResult = hindiResult.replace(/(\d+)\s*(?:l|ltr|litre|liter)\b/gi, (_, num) => `${num} लीटर`);

  marathiResult = marathiResult.replace(/(\d+)\s*(?:kg|kilo|kilogram)\b/gi, (_, num) => `${toDevanagariDigits(num)} किलो`);
  hindiResult = hindiResult.replace(/(\d+)\s*(?:kg|kilo|kilogram)\b/gi, (_, num) => `${num} किलो`);

  marathiResult = marathiResult.replace(/(\d+)\s*(?:g|gm|gms|gram|grams)\b/gi, (_, num) => `${toDevanagariDigits(num)} ग्रॅम`);
  hindiResult = hindiResult.replace(/(\d+)\s*(?:g|gm|gms|gram|grams)\b/gi, (_, num) => `${num} ग्राम`);

  marathiResult = marathiResult.replace(/(\d+)\s*(?:pcs|pc|piece|pieces)\b/gi, (_, num) => `${toDevanagariDigits(num)} नग`);
  hindiResult = hindiResult.replace(/(\d+)\s*(?:pcs|pc|piece|pieces)\b/gi, (_, num) => `${num} पीस`);

  marathiResult = marathiResult.replace(/(\d+)\s*(?:pack|packet|pouch)\b/gi, (_, num) => `${toDevanagariDigits(num)} पाकीट`);
  hindiResult = hindiResult.replace(/(\d+)\s*(?:pack|packet|pouch)\b/gi, (_, num) => `${num} पैकेट`);

  // Step 3: Match remaining single English words
  const words = Object.keys(WORD_DICTIONARY).sort((a, b) => b.length - a.length);
  for (const word of words) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(marathiResult)) {
      marathiResult = marathiResult.replace(regex, WORD_DICTIONARY[word].mr);
    }
    if (regex.test(hindiResult)) {
      hindiResult = hindiResult.replace(regex, WORD_DICTIONARY[word].hi);
    }
  }

  // Step 4: Transliterate any remaining English words
  marathiResult = marathiResult.replace(/[a-zA-Z]+/g, match => phoneticTransliterate(match, true));
  hindiResult = hindiResult.replace(/[a-zA-Z]+/g, match => phoneticTransliterate(match, false));

  // Step 5: Post-processing to clean up duplicate spaces and enforce dairy standards
  marathiResult = cleanDevanagariOutput(marathiResult, true);
  hindiResult = cleanDevanagariOutput(hindiResult, false);

  return {
    marathi: marathiResult,
    hindi: hindiResult
  };
}

// 5. Post-Processing to ensure authentic dairy terminology
function cleanDevanagariOutput(text: string, isMarathi: boolean): string {
  let cleaned = text.trim().replace(/\s{2,}/g, ' ');

  if (isMarathi) {
    // In Marathi, standard dairy word is 'दूध' (not 'मिल्क'), 'तूप' (not 'घी'), 'लोणी' (not 'बटर' when butter)
    cleaned = cleaned
      .replace(/\bमिल्क\b/g, 'दूध')
      .replace(/\bघी\b/g, 'तूप')
      .replace(/\bखोया\b/g, 'खवा')
      .replace(/\bछाछ\b/g, 'ताक')
      .replace(/\bलीटर\b/g, 'लिटर')
      .replace(/\bग्राम\b/g, 'ग्रॅम');
  } else {
    // In Hindi
    cleaned = cleaned
      .replace(/\bमिल्क\b/g, 'दूध')
      .replace(/\bतूप\b/g, 'घी')
      .replace(/\bखवा\b/g, 'मावा')
      .replace(/\bताक\b/g, 'छाछ')
      .replace(/\bलिटर\b/g, 'लीटर')
      .replace(/\bग्रॅम\b/g, 'ग्राम');
  }

  return cleaned;
}

// 6. In-Memory Cache for Online Translations
const translationCache = new Map<string, { marathi: string; hindi: string }>();

// 7. Asynchronous Smart Translation (Calls public GTX Google Translate endpoint with timeout & offline fallback)
export async function translateProductName(
  englishName: string,
  timeoutMs: number = 2000
): Promise<{ marathi: string; hindi: string }> {
  if (!englishName || !englishName.trim()) {
    return { marathi: '', hindi: '' };
  }

  const query = englishName.trim();

  // Check cache first
  if (translationCache.has(query.toLowerCase())) {
    return translationCache.get(query.toLowerCase())!;
  }

  // Pre-calculate synchronous fallback
  const syncFallback = translateProductNameSync(query);

  // If query is very short or already has Devanagari, return sync
  if (/[\u0900-\u097F]/.test(query) || query.length < 2) {
    return syncFallback;
  }

  try {
    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) return null;
        const data = await response.json();
        // Google GTX response format: [[[translatedText, originalText, ...]]]
        if (Array.isArray(data) && Array.isArray(data[0])) {
          return data[0].map((item: any) => item?.[0] || '').join('');
        }
        return null;
      } catch (err) {
        clearTimeout(id);
        return null;
      }
    };

    // Parallel fetch for Marathi and Hindi
    const mrUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=mr&dt=t&q=${encodeURIComponent(query)}`;
    const hiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(query)}`;

    const [mrText, hiText] = await Promise.all([
      fetchWithTimeout(mrUrl),
      fetchWithTimeout(hiUrl)
    ]);

    let finalMarathi = mrText ? cleanDevanagariOutput(mrText, true) : syncFallback.marathi;
    let finalHindi = hiText ? cleanDevanagariOutput(hiText, false) : syncFallback.hindi;

    // Sanity check: Ensure dairy keywords are strictly converted
    if (finalMarathi.includes('मिल्क') && !query.toLowerCase().includes('milk cake') && !query.toLowerCase().includes('milk bikis') && !query.toLowerCase().includes('milk toast')) {
      finalMarathi = finalMarathi.replace(/\bमिल्क\b/g, 'दूध');
    }
    if (finalHindi.includes('मिल्क') && !query.toLowerCase().includes('milk cake') && !query.toLowerCase().includes('milk bikis') && !query.toLowerCase().includes('milk toast')) {
      finalHindi = finalHindi.replace(/\bमिल्क\b/g, 'दूध');
    }

    const result = {
      marathi: finalMarathi || syncFallback.marathi,
      hindi: finalHindi || syncFallback.hindi
    };

    translationCache.set(query.toLowerCase(), result);
    return result;
  } catch (e) {
    // Fail-safe offline fallback
    return syncFallback;
  }
}
