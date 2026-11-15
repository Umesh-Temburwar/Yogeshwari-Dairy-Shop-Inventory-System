import type { ProductCategory, ProductUnit } from '../types';
import { translateProductNameSync, translateProductName } from './productTranslator';

// Check if browser supports Web Speech API
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export type VoiceLanguage = 'mr-IN' | 'hi-IN' | 'en-IN';

export interface ProcessedVoiceProduct {
  englishName: string;
  marathiName: string;
  hindiName: string;
  detectedCategory?: ProductCategory;
  detectedUnit?: ProductUnit;
  packSize?: string;
  originalTranscript: string;
  confidence?: number;
}

/**
 * Trained Spoken Quantity & Measurement Units Dictionary
 * Converts spoken Marathi, Hindi, and English numbers & measurements to standard pack sizes.
 */
interface SpokenMeasurement {
  patterns: RegExp[];
  canonical: string;
  unit: ProductUnit;
}

const SPOKEN_MEASUREMENTS: SpokenMeasurement[] = [
  // 500ml / Half Litre
  {
    patterns: [
      /(अर्धा\s*लिटर|अर्धा\s*लीटर|आधा\s*लीटर|half\s*litre|half\s*liter|half\s*l)/i,
      /(पाचशे\s*मिली|पाच\s*शे\s*मिली|पाँच\s*सौ\s*मिली|पांच\s*सौ\s*मिली|५००\s*मिली|500\s*ml|500ml|500\s*मिली)/i
    ],
    canonical: '500ml',
    unit: 'Pouch'
  },
  // 1 Litre
  {
    patterns: [
      /(एक\s*लिटर|१\s*लिटर|एक\s*लीटर|1\s*लीटर|one\s*litre|one\s*liter|1\s*litre|1\s*liter|1\s*l|1l)/i
    ],
    canonical: '1L',
    unit: 'Litre'
  },
  // 250ml / Quarter Litre
  {
    patterns: [
      /(पाव\s*लिटर|पाव\s*लीटर|quarter\s*litre|quarter\s*liter)/i,
      /(अडीचशे\s*मिली|ढाई\s*सौ\s*मिली|२५०\s*मिली|250\s*ml|250ml|250\s*मिली)/i
    ],
    canonical: '250ml',
    unit: 'Pouch'
  },
  // 2 Litre
  {
    patterns: [
      /(दोन\s*लिटर|२\s*लिटर|दो\s*लीटर|2\s*लीटर|two\s*litre|two\s*liter|2\s*litre|2\s*liter|2\s*l|2l)/i
    ],
    canonical: '2L',
    unit: 'Litre'
  },
  // 5 Litre
  {
    patterns: [
      /(पाच\s*लिटर|५\s*लिटर|पाँच\s*लीटर|पांच\s*लीटर|5\s*लीटर|five\s*litre|five\s*liter|5\s*litre|5\s*liter|5\s*l|5l)/i
    ],
    canonical: '5L',
    unit: 'Litre'
  },
  // 200ml
  {
    patterns: [
      /(दोनशे\s*मिली|दो\s*सौ\s*मिली|२००\s*मिली|200\s*ml|200ml|200\s*मिली)/i
    ],
    canonical: '200ml',
    unit: 'Pouch'
  },
  // 100ml
  {
    patterns: [
      /(शंभर\s*मिली|सौ\s*मिली|१००\s*मिली|100\s*ml|100ml|100\s*मिली)/i
    ],
    canonical: '100ml',
    unit: 'Pouch'
  },
  // 1 kg
  {
    patterns: [
      /(एक\s*किलो|१\s*किलो|एक\s*केजी|1\s*केजी|one\s*kg|one\s*kilo|1\s*kg|1kg|1\s*kilo|1\s*kilogram)/i
    ],
    canonical: '1kg',
    unit: 'Kg'
  },
  // 500g / Half Kg
  {
    patterns: [
      /(अर्धा\s*किलो|आधा\s*किलो|half\s*kg|half\s*kilo)/i,
      /(पाचशे\s*ग्रॅम|पाचशे\s*ग्राम|पाँच\s*सौ\s*ग्राम|५००\s*ग्रॅम|500\s*g|500g|500\s*gm|500\s*gram|500\s*grams)/i
    ],
    canonical: '500g',
    unit: 'Kg'
  },
  // 250g / Quarter Kg
  {
    patterns: [
      /(पाव\s*किलो|quarter\s*kg|quarter\s*kilo)/i,
      /(अडीचशे\s*ग्रॅम|ढाई\s*सौ\s*ग्राम|२५०\s*ग्रॅम|250\s*g|250g|250\s*gm|250\s*gram|250\s*grams)/i
    ],
    canonical: '250g',
    unit: 'Kg'
  },
  // 200g
  {
    patterns: [
      /(दोनशे\s*ग्रॅम|दोनशे\s*ग्राम|दो\s*सौ\s*ग्राम|२००\s*ग्रॅम|200\s*g|200g|200\s*gm|200\s*gram|200\s*grams)/i
    ],
    canonical: '200g',
    unit: 'Packet'
  },
  // 100g
  {
    patterns: [
      /(शंभर\s*ग्रॅम|शंभर\s*ग्राम|सौ\s*ग्राम|१००\s*ग्रॅम|100\s*g|100g|100\s*gm|100\s*gram|100\s*grams)/i
    ],
    canonical: '100g',
    unit: 'Packet'
  },
  // 2 kg
  {
    patterns: [
      /(दोन\s*किलो|२\s*किलो|दो\s*किलो|2\s*केजी|two\s*kg|2\s*kg|2kg|2\s*kilo)/i
    ],
    canonical: '2kg',
    unit: 'Kg'
  },
  // 5 kg
  {
    patterns: [
      /(पाच\s*किलो|५\s*किलो|पाँच\s*किलो|five\s*kg|5\s*kg|5kg|5\s*kilo)/i
    ],
    canonical: '5kg',
    unit: 'Kg'
  },
  // 400g
  {
    patterns: [
      /(चारशे\s*ग्रॅम|चार\s*सौ\s*ग्राम|४००\s*ग्रॅम|400\s*g|400g|400\s*gm|400\s*gram|400\s*grams)/i
    ],
    canonical: '400g',
    unit: 'Packet'
  }
];

/**
 * Trained Dairy Product Voice Mappings
 * Identifies high-frequency dairy items spoken in Marathi, Hindi, or English.
 */
interface TrainedProductRule {
  patterns: RegExp[];
  canonicalEnglish: string;
  category: ProductCategory;
  defaultUnit?: ProductUnit;
}

const TRAINED_PRODUCT_RULES: TrainedProductRule[] = [
  // 1. Fresh Buffalo Milk
  {
    patterns: [
      /म्हशीचे\s*दूध|म्हैस\s*दूध|भैंस\s*का\s*दूध|भैंस\s*दूध|buffalo\s*milk|fresh\s*buffalo\s*milk/i
    ],
    canonicalEnglish: 'Fresh Buffalo Milk',
    category: 'Milk',
    defaultUnit: 'Litre'
  },
  // 2. Fresh Cow Milk
  {
    patterns: [
      /गायीचे\s*दूध|गाय\s*दूध|गाय\s*का\s*दूध|cow\s*milk|fresh\s*cow\s*milk|gai\s*doodh/i
    ],
    canonicalEnglish: 'Fresh Cow Milk',
    category: 'Milk',
    defaultUnit: 'Litre'
  },
  // 3. Amul Taaza Milk
  {
    patterns: [
      /अमुल\s*ताझा|अमूल\s*ताजा|amul\s*taaza|amul\s*taza/i
    ],
    canonicalEnglish: 'Amul Taaza Milk',
    category: 'Milk',
    defaultUnit: 'Pouch'
  },
  // 4. Amul Gold Milk
  {
    patterns: [
      /अमुल\s*गोल्ड|अमूल\s*गोल्ड|amul\s*gold/i
    ],
    canonicalEnglish: 'Amul Gold Milk',
    category: 'Milk',
    defaultUnit: 'Pouch'
  },
  // 5. Gokul Special Milk
  {
    patterns: [
      /गोकुळ\s*स्पेशल|गोकुल\s*स्पेशल|gokul\s*special/i
    ],
    canonicalEnglish: 'Gokul Special Milk',
    category: 'Milk',
    defaultUnit: 'Pouch'
  },
  // 6. Chitale Buffalo Milk
  {
    patterns: [
      /चितळे\s*दूध|चितले\s*दूध|चितळे\s*म्हैस|chitale\s*milk|chitale\s*buffalo/i
    ],
    canonicalEnglish: 'Chitale Buffalo Milk',
    category: 'Milk',
    defaultUnit: 'Pouch'
  },
  // 7. Pure Cow Ghee
  {
    patterns: [
      /गाय\s*तूप|गायीचे\s*तूप|गाय\s*का\s*घी|cow\s*ghee|pure\s*cow\s*ghee|gowardhan\s*ghee|गोवर्धन\s*तूप/i
    ],
    canonicalEnglish: 'Pure Cow Ghee',
    category: 'Ghee',
    defaultUnit: 'Kg'
  },
  // 8. Pure Buffalo Ghee
  {
    patterns: [
      /म्हशीचे\s*तूप|म्हैस\s*तूप|भैंस\s*का\s*घी|buffalo\s*ghee|pure\s*buffalo\s*ghee/i
    ],
    canonicalEnglish: 'Pure Buffalo Ghee',
    category: 'Ghee',
    defaultUnit: 'Kg'
  },
  // 9. Fresh Malai Paneer
  {
    patterns: [
      /मलाई\s*पनीर|ताजे\s*पनीर|ताज़ा\s*पनीर|पनीर|fresh\s*paneer|malai\s*paneer|cottage\s*cheese/i
    ],
    canonicalEnglish: 'Fresh Malai Paneer',
    category: 'Paneer',
    defaultUnit: 'Kg'
  },
  // 10. Amul Pasteurized Butter
  {
    patterns: [
      /अमुल\s*बटर|टेबल\s*बटर|बटर|मक्खन|amul\s*butter|table\s*butter|salted\s*butter/i
    ],
    canonicalEnglish: 'Amul Pasteurized Butter',
    category: 'Butter',
    defaultUnit: 'Packet'
  },
  // 11. White Butter / Loni
  {
    patterns: [
      /पांढरे\s*लोणी|घरचे\s*लोणी|सफेद\s*मक्खन|white\s*butter/i
    ],
    canonicalEnglish: 'Fresh White Butter (Loni)',
    category: 'Butter',
    defaultUnit: 'Kg'
  },
  // 12. Fresh Curd / Dahi
  {
    patterns: [
      /ताजे\s*दही|ताज़ा\s*दही|दही|मदर\s*डेअरी\s*दही|fresh\s*curd|fresh\s*dahi|plain\s*dahi/i
    ],
    canonicalEnglish: 'Fresh Curd Dahi',
    category: 'Curd',
    defaultUnit: 'Packet'
  },
  // 13. Masala Buttermilk / Chaas
  {
    patterns: [
      /मसाला\s*ताक|जिरा\s*ताक|ताक|मसाला\s*छाछ|छाछ|मठ्ठा|masala\s*chaas|masala\s*buttermilk|chaas/i
    ],
    canonicalEnglish: 'Masala Buttermilk (Chaas)',
    category: 'Buttermilk',
    defaultUnit: 'Pouch'
  },
  // 14. Fresh Mango Lassi / Sweet Lassi
  {
    patterns: [
      /मॅंगो\s*लस्सी|मँगो\s*लस्सी|आम\s*लस्सी|mango\s*lassi/i
    ],
    canonicalEnglish: 'Fresh Mango Lassi',
    category: 'Lassi',
    defaultUnit: 'Pouch'
  },
  {
    patterns: [
      /गोड\s*लस्सी|मीठी\s*लस्सी|लस्सी|sweet\s*lassi|lassi/i
    ],
    canonicalEnglish: 'Fresh Sweet Lassi',
    category: 'Lassi',
    defaultUnit: 'Pouch'
  },
  // 15. Shrikhand Variants
  {
    patterns: [
      /आम्रखंड|मॅंगो\s*श्रीखंड|mango\s*shrikhand|amrakhand/i
    ],
    canonicalEnglish: 'Amrakhand (Mango Shrikhand)',
    category: 'Shrikhand',
    defaultUnit: 'Packet'
  },
  {
    patterns: [
      /इलायची\s*श्रीखंड|वेलची\s*श्रीखंड|केसर\s*पिस्ता\s*श्रीखंड|श्रीखंड|shrikhand/i
    ],
    canonicalEnglish: 'Elaichi Kesar Shrikhand',
    category: 'Shrikhand',
    defaultUnit: 'Packet'
  },
  // 16. Basundi
  {
    patterns: [
      /बासुंदी|सीताफळ\s*बासुंदी|basundi/i
    ],
    canonicalEnglish: 'Fresh Creamy Basundi',
    category: 'Basundi',
    defaultUnit: 'Litre'
  },
  // 17. Khawa / Mawa
  {
    patterns: [
      /ताजा\s*खवा|खवा|ताज़ा\s*मावा|मावा|fresh\s*khawa|fresh\s*mawa|khoa/i
    ],
    canonicalEnglish: 'Fresh Khawa (Mawa)',
    category: 'Khawa',
    defaultUnit: 'Kg'
  },
  // 18. Kaju Katli
  {
    patterns: [
      /काजू\s*कतली|काजू\s*कतरी|kaju\s*katli|kaju\s*barfi/i
    ],
    canonicalEnglish: 'Kaju Katli Special',
    category: 'Sweets',
    defaultUnit: 'Kg'
  },
  // 19. Gulab Jamun
  {
    patterns: [
      /गुलाब\s*जामुन|गुलाबजामुन|gulab\s*jamun/i
    ],
    canonicalEnglish: 'Fresh Gulab Jamun',
    category: 'Sweets',
    defaultUnit: 'Kg'
  },
  // 20. Malai Peda
  {
    patterns: [
      /मलाई\s*पेढा|कांडी\s*पेढा|पेढा|पेड़ा|malai\s*peda|doodh\s*peda/i
    ],
    canonicalEnglish: 'Fresh Malai Peda',
    category: 'Sweets',
    defaultUnit: 'Kg'
  },
  // 21. Milk Cake
  {
    patterns: [
      /मिल्क\s*केक|कलाकंद|milk\s*cake|kalakand/i
    ],
    canonicalEnglish: 'Special Milk Cake',
    category: 'Sweets',
    defaultUnit: 'Kg'
  },
  // 22. Toast & Khari
  {
    patterns: [
      /बटर\s*टोस्ट|टोस्ट|रस्क|toast\s*rusk|rusk/i
    ],
    canonicalEnglish: 'Crispy Butter Toast Rusk',
    category: 'Bakery',
    defaultUnit: 'Packet'
  },
  {
    patterns: [
      /बटर\s*खारी|खारी|butter\s*khari|khari/i
    ],
    canonicalEnglish: 'Crispy Butter Khari',
    category: 'Bakery',
    defaultUnit: 'Packet'
  },
  {
    patterns: [
      /ब्रेड|पाव|bread|pav|sandwich\s*bread/i
    ],
    canonicalEnglish: 'Fresh Daily Bread',
    category: 'Bakery',
    defaultUnit: 'Packet'
  },
  // 23. Popular Biscuits
  {
    patterns: [
      /गुड\s*डे\s*बटर|गुड\s*डे|good\s*day\s*butter|good\s*day/i
    ],
    canonicalEnglish: 'Britannia Good Day Butter Cookies',
    category: 'Biscuits',
    defaultUnit: 'Packet'
  },
  {
    patterns: [
      /पारले\s*जी|parle\s*g|parle-g/i
    ],
    canonicalEnglish: 'Parle-G Gold Biscuits',
    category: 'Biscuits',
    defaultUnit: 'Packet'
  },
  {
    patterns: [
      /ओरिओ\s*बिस्कीट|ओरिओ|oreo\s*biscuit|oreo/i
    ],
    canonicalEnglish: 'Cadbury Oreo Vanilla Biscuits',
    category: 'Biscuits',
    defaultUnit: 'Packet'
  },
  {
    patterns: [
      /कॅडबरी\s*डेअरी\s*मिल्क|डेअरी\s*मिल्क|dairy\s*milk\s*silk|dairy\s*milk/i
    ],
    canonicalEnglish: 'Cadbury Dairy Milk Chocolate',
    category: 'Chocolates',
    defaultUnit: 'Pieces'
  },
  {
    patterns: [
      /बालाजी\s*वेफर्स|वेफर्स|balaji\s*wafers|wafers/i
    ],
    canonicalEnglish: 'Balaji Wafers Namkeen',
    category: 'Namkeen',
    defaultUnit: 'Packet'
  },
  {
    patterns: [
      /ग्रीन\s*पीस|हिरवे\s*वाटाणे|वाटाणा|मटर|green\s*peas|frozen\s*peas/i
    ],
    canonicalEnglish: 'Amul Frozen Green Peas',
    category: 'Frozen Foods',
    defaultUnit: 'Packet'
  }
];

/**
 * Trains and processes raw voice speech transcript into standardized
 * English, Marathi, and Hindi product names with category and unit auto-detection.
 */
export async function processVoiceTranscript(
  rawTranscript: string, 
  spokenLang: VoiceLanguage = 'mr-IN'
): Promise<ProcessedVoiceProduct> {
  const cleanInput = rawTranscript.trim();
  if (!cleanInput) {
    return {
      englishName: '',
      marathiName: '',
      hindiName: '',
      originalTranscript: ''
    };
  }

  // Step 1: Detect and Extract Measurement / Pack Size
  let detectedPackSize = '';
  let detectedUnit: ProductUnit | undefined;

  for (const m of SPOKEN_MEASUREMENTS) {
    for (const pat of m.patterns) {
      if (pat.test(cleanInput)) {
        detectedPackSize = m.canonical;
        detectedUnit = m.unit;
        break;
      }
    }
    if (detectedPackSize) break;
  }

  // Step 2: Match against Trained Dairy Domain Product Rules
  let matchedRule: TrainedProductRule | null = null;
  for (const rule of TRAINED_PRODUCT_RULES) {
    for (const pat of rule.patterns) {
      if (pat.test(cleanInput)) {
        matchedRule = rule;
        break;
      }
    }
    if (matchedRule) break;
  }

  // Step 3: Build Canonical Names
  let englishName = '';
  let detectedCategory: ProductCategory | undefined;

  if (matchedRule) {
    detectedCategory = matchedRule.category;
    if (!detectedUnit && matchedRule.defaultUnit) {
      detectedUnit = matchedRule.defaultUnit;
    }

    if (detectedPackSize) {
      // Avoid duplicate pack size if rule already ends with it
      if (!matchedRule.canonicalEnglish.toLowerCase().includes(detectedPackSize.toLowerCase())) {
        englishName = `${matchedRule.canonicalEnglish} ${detectedPackSize}`;
      } else {
        englishName = matchedRule.canonicalEnglish;
      }
    } else {
      englishName = matchedRule.canonicalEnglish;
    }
  } else {
    // If not in the pre-trained list, clean up the words
    // If input is mostly Devanagari, convert known brands / terms
    englishName = cleanInput;
    if (detectedPackSize && !englishName.includes(detectedPackSize)) {
      englishName = `${englishName} ${detectedPackSize}`;
    }
  }

  // Step 4: Generate Authentic Marathi and Hindi Names using productTranslator
  const syncTranslation = translateProductNameSync(englishName);
  let marathiName = syncTranslation.marathi;
  let hindiName = syncTranslation.hindi;

  // Try online enhancement if network is active
  try {
    const asyncTranslation = await translateProductName(englishName);
    if (asyncTranslation.marathi) marathiName = asyncTranslation.marathi;
    if (asyncTranslation.hindi) hindiName = asyncTranslation.hindi;
  } catch {}

  // If input was in Devanagari and wasn't mapped, preserve authentic input in marathiName
  const isDevanagari = /[\u0900-\u097F]/.test(cleanInput);
  if (isDevanagari && !matchedRule) {
    if (!marathiName) marathiName = cleanInput;
    if (!hindiName) hindiName = cleanInput;
  }

  return {
    englishName,
    marathiName,
    hindiName,
    detectedCategory,
    detectedUnit,
    packSize: detectedPackSize || undefined,
    originalTranscript: cleanInput
  };
}
