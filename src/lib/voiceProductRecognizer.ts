import { ProductCategory, ProductUnit } from '../types';
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
}

/**
 * Normalizes Devanagari numerals (०-९) to standard Arabic digits (0-9).
 */
export function normalizeDevanagariNumerals(text: string): string {
  const devanagariDigits: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  return text.replace(/[०-९]/g, d => devanagariDigits[d] || d);
}

/**
 * Trained Spoken Quantity & Measurement Units Dictionary
 * Converts spoken Marathi, Hindi, and English numbers & measurements to standard pack sizes.
 */
interface SpokenMeasurement {
  patterns: RegExp[];
  canonical: string;
  marathiPack: string;
  hindiPack: string;
  unit: ProductUnit;
}

const SPOKEN_MEASUREMENTS: SpokenMeasurement[] = [
  // 500ml / Half Litre
  {
    patterns: [
      /\b(अर्धा\s*लिटर|अर्धा\s*लीटर|आधा\s*लीटर|half\s*litre|half\s*liter|half\s*l|half\s*ltr)\b/i,
      /\b(पाचशे\s*मिली|पाच\s*शे\s*मिली|पाँच\s*सौ\s*मिली|पांच\s*सौ\s*मिली|500\s*ml|500ml|500\s*मिली|500\s*मिलीलीटर)\b/i
    ],
    canonical: '500ml',
    marathiPack: '५०० मिली',
    hindiPack: '500 मिली',
    unit: 'Packet (500ml)'
  },
  // 1 Litre
  {
    patterns: [
      /\b(एक\s*लिटर|एक\s*लीटर|one\s*litre|one\s*liter|1\s*लिटर|1\s*लीटर|1\s*litre|1\s*liter|1\s*l|1l|1\s*ltr|1ltr)\b/i
    ],
    canonical: '1L',
    marathiPack: '१ लिटर',
    hindiPack: '1 लीटर',
    unit: 'Packet (1L)'
  },
  // 250ml / Quarter Litre
  {
    patterns: [
      /\b(पाव\s*लिटर|पाव\s*लीटर|quarter\s*litre|quarter\s*liter)\b/i,
      /\b(अडीचशे\s*मिली|ढाई\s*सौ\s*मिली|250\s*ml|250ml|250\s*मिली|250\s*मिलीलीटर)\b/i
    ],
    canonical: '250ml',
    marathiPack: '२५० मिली',
    hindiPack: '250 मिली',
    unit: 'Piece'
  },
  // 2 Litre
  {
    patterns: [
      /\b(दोन\s*लिटर|दो\s*लीटर|two\s*litre|two\s*liter|2\s*लिटर|2\s*लीटर|2\s*litre|2\s*liter|2\s*l|2l|2\s*ltr)\b/i
    ],
    canonical: '2L',
    marathiPack: '२ लिटर',
    hindiPack: '2 लीटर',
    unit: 'Litre'
  },
  // 5 Litre
  {
    patterns: [
      /\b(पाच\s*लिटर|पाँच\s*लीटर|पांच\s*लीटर|five\s*litre|five\s*liter|5\s*लिटर|5\s*लीटर|5\s*litre|5\s*liter|5\s*l|5l)\b/i
    ],
    canonical: '5L',
    marathiPack: '५ लिटर',
    hindiPack: '5 लीटर',
    unit: 'Litre'
  },
  // 200ml
  {
    patterns: [
      /\b(दोनशे\s*मिली|दो\s*सौ\s*मिली|200\s*ml|200ml|200\s*मिली|200\s*मिलीलीटर)\b/i
    ],
    canonical: '200ml',
    marathiPack: '२०० मिली',
    hindiPack: '200 मिली',
    unit: 'Piece'
  },
  // 100ml
  {
    patterns: [
      /\b(शंभर\s*मिली|सौ\s*मिली|100\s*ml|100ml|100\s*मिली|100\s*मिलीलीटर)\b/i
    ],
    canonical: '100ml',
    marathiPack: '१०० मिली',
    hindiPack: '100 मिली',
    unit: 'Piece'
  },
  // 1 kg
  {
    patterns: [
      /\b(एक\s*किलो|एक\s*केजी|one\s*kg|one\s*kilo|1\s*किलो|1\s*केजी|1\s*kg|1kg|1\s*kilo|1\s*kilogram|1\s*किलोग्राम)\b/i
    ],
    canonical: '1kg',
    marathiPack: '१ किलो',
    hindiPack: '1 किलो',
    unit: 'Kg'
  },
  // 500g / Half Kg
  {
    patterns: [
      /\b(अर्धा\s*किलो|आधा\s*किलो|half\s*kg|half\s*kilo)\b/i,
      /\b(पाचशे\s*ग्रॅम|पाचशे\s*ग्राम|पाँच\s*सौ\s*ग्राम|पांच\s*सौ\s*ग्राम|500\s*g|500g|500\s*gm|500\s*gram|500\s*grams|500\s*ग्रॅम|500\s*ग्राम)\b/i
    ],
    canonical: '500g',
    marathiPack: '५०० ग्रॅम',
    hindiPack: '500 ग्राम',
    unit: 'Gram'
  },
  // 250g / Quarter Kg
  {
    patterns: [
      /\b(पाव\s*किलो|quarter\s*kg|quarter\s*kilo)\b/i,
      /\b(अडीचशे\s*ग्रॅम|ढाई\s*सौ\s*ग्राम|250\s*g|250g|250\s*gm|250\s*gram|250\s*grams|250\s*ग्रॅम|250\s*ग्राम)\b/i
    ],
    canonical: '250g',
    marathiPack: '२५० ग्रॅम',
    hindiPack: '250 ग्राम',
    unit: 'Gram'
  },
  // 200g
  {
    patterns: [
      /\b(दोनशे\s*ग्रॅम|दोनशे\s*ग्राम|दो\s*सौ\s*ग्राम|200\s*g|200g|200\s*gm|200\s*gram|200\s*grams|200\s*ग्रॅम|200\s*ग्राम)\b/i
    ],
    canonical: '200g',
    marathiPack: '२०० ग्रॅम',
    hindiPack: '200 ग्राम',
    unit: 'Gram'
  },
  // 100g
  {
    patterns: [
      /\b(शंभर\s*ग्रॅम|शंभर\s*ग्राम|सौ\s*ग्राम|100\s*g|100g|100\s*gm|100\s*gram|100\s*grams|100\s*ग्रॅम|100\s*ग्राम)\b/i
    ],
    canonical: '100g',
    marathiPack: '१०० ग्रॅम',
    hindiPack: '100 ग्राम',
    unit: 'Gram'
  },
  // 2 kg
  {
    patterns: [
      /\b(दोन\s*किलो|दो\s*किलो|two\s*kg|2\s*किलो|2\s*केजी|2\s*kg|2kg|2\s*kilo)\b/i
    ],
    canonical: '2kg',
    marathiPack: '२ किलो',
    hindiPack: '2 किलो',
    unit: 'Kg'
  },
  // 5 kg
  {
    patterns: [
      /\b(पाच\s*किलो|पाँच\s*किलो|five\s*kg|5\s*किलो|5\s*केजी|5\s*kg|5kg|5\s*kilo)\b/i
    ],
    canonical: '5kg',
    marathiPack: '५ किलो',
    hindiPack: '5 किलो',
    unit: 'Kg'
  },
  // 400g
  {
    patterns: [
      /\b(चारशे\s*ग्रॅम|चार\s*सौ\s*ग्राम|400\s*g|400g|400\s*gm|400\s*gram|400\s*grams|400\s*ग्रॅम|400\s*ग्राम)\b/i
    ],
    canonical: '400g',
    marathiPack: '४०० ग्रॅम',
    hindiPack: '400 ग्राम',
    unit: 'Gram'
  },
  // 50g
  {
    patterns: [
      /\b(पन्नास\s*ग्रॅम|पचास\s*ग्राम|50\s*g|50g|50\s*gm|50\s*gram|50\s*ग्रॅम|50\s*ग्राम)\b/i
    ],
    canonical: '50g',
    marathiPack: '५० ग्रॅम',
    hindiPack: '50 ग्राम',
    unit: 'Gram'
  }
];

/**
 * Trained Dairy Product Voice Mappings
 * Identifies high-frequency dairy items spoken in Marathi, Hindi, or English.
 */
interface TrainedProductRule {
  patterns: RegExp[];
  canonicalEnglish: string;
  marathiName: string;
  hindiName: string;
  category: ProductCategory;
  defaultUnit?: ProductUnit;
}

const TRAINED_PRODUCT_RULES: TrainedProductRule[] = [
  // 1. Fresh Buffalo Milk
  {
    patterns: [
      /म्हशीचे\s*दूध|म्हैस\s*दूध|म्हशीच\s*दूध|ताजे\s*म्हशीचे\s*दूध|भैंस\s*का\s*दूध|भैंस\s*दूध|भैस\s*दूध|buffalo\s*milk|fresh\s*buffalo\s*milk|mhas\s*doodh|bhains\s*doodh|mhashiche\s*doodh/i
    ],
    canonicalEnglish: 'Fresh Buffalo Milk',
    marathiName: 'ताजे म्हशीचे दूध',
    hindiName: 'ताज़ा भैंस का दूध',
    category: 'Milk',
    defaultUnit: 'Litre'
  },
  // 2. Fresh Cow Milk
  {
    patterns: [
      /गायीचे\s*दूध|गाय\s*दूध|गायीच\s*दूध|ताजे\s*गायीचे\s*दूध|गाय\s*का\s*दूध|cow\s*milk|fresh\s*cow\s*milk|desi\s*cow\s*milk|gai\s*doodh|gaay\s*doodh/i
    ],
    canonicalEnglish: 'Fresh Cow Milk',
    marathiName: 'ताजे गायीचे दूध',
    hindiName: 'ताज़ा गाय का दूध',
    category: 'Milk',
    defaultUnit: 'Litre'
  },
  // 3. Amul Taaza Milk
  {
    patterns: [
      /अमुल\s*ताझा|अमूल\s*ताजा|अमुल\s*ताजा|amul\s*taaza|amul\s*taza/i
    ],
    canonicalEnglish: 'Amul Taaza Milk',
    marathiName: 'अमुल ताझा दूध',
    hindiName: 'अमूल ताजा दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 4. Amul Gold Milk
  {
    patterns: [
      /अमुल\s*गोल्ड|अमूल\s*गोल्ड|amul\s*gold/i
    ],
    canonicalEnglish: 'Amul Gold Milk',
    marathiName: 'अमुल गोल्ड दूध',
    hindiName: 'अमूल गोल्ड दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 5. Amul Cow Milk
  {
    patterns: [
      /अमुल\s*गाय|अमूल\s*गाय|अमुल\s*काऊ|amul\s*cow/i
    ],
    canonicalEnglish: 'Amul Cow Milk',
    marathiName: 'अमुल गाय दूध',
    hindiName: 'अमूल गाय दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 6. Amul Shakti Milk
  {
    patterns: [
      /अमुल\s*शक्ती|अमूल\s*शक्ति|amul\s*shakti/i
    ],
    canonicalEnglish: 'Amul Shakti Milk',
    marathiName: 'अमुल शक्ती दूध',
    hindiName: 'अमूल शक्ति दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 7. Gokul Special Milk
  {
    patterns: [
      /गोकुळ\s*स्पेशल|गोकुल\s*स्पेशल|gokul\s*special|गोकुळ\s*दूध|गोकुल\s*दूध/i
    ],
    canonicalEnglish: 'Gokul Special Milk',
    marathiName: 'गोकुळ स्पेशल दूध',
    hindiName: 'गोकुल स्पेशल दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 8. Gokul Cow Milk
  {
    patterns: [
      /गोकुळ\s*गाय|गोकुल\s*गाय|gokul\s*cow/i
    ],
    canonicalEnglish: 'Gokul Cow Milk',
    marathiName: 'गोकुळ गाय दूध',
    hindiName: 'गोकुल गाय दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 9. Chitale Buffalo Milk
  {
    patterns: [
      /चितळे\s*दूध|चितले\s*दूध|चितळे\s*म्हैस|chitale\s*milk|chitale\s*buffalo|chitale/i
    ],
    canonicalEnglish: 'Chitale Buffalo Milk',
    marathiName: 'चितळे म्हैस दूध',
    hindiName: 'चितले भैंस दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 10. Chitale Cow Milk
  {
    patterns: [
      /चितळे\s*गाय|चितले\s*गाय|chitale\s*cow/i
    ],
    canonicalEnglish: 'Chitale Cow Milk',
    marathiName: 'चितळे गाय दूध',
    hindiName: 'चितले गाय दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 11. Warna Milk
  {
    patterns: [
      /वारणा\s*दूध|वारना\s*दूध|warna\s*milk/i
    ],
    canonicalEnglish: 'Warna Milk',
    marathiName: 'वारणा दूध',
    hindiName: 'वारणा दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 12. Mother Dairy Milk
  {
    patterns: [
      /मदर\s*डेअरी\s*दूध|मदर\s*डेयरी\s*दूध|mother\s*dairy\s*milk/i
    ],
    canonicalEnglish: 'Mother Dairy Milk',
    marathiName: 'मदर डेअरी दूध',
    hindiName: 'मदर डेयरी दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // 13. Generic Fresh Milk
  {
    patterns: [
      /\b(ताजे\s*दूध|ताज़ा\s*दूध|दूध|दुध|doodh|dudh|fresh\s*milk|dairy\s*milk\s*pouch)\b/i
    ],
    canonicalEnglish: 'Fresh Dairy Milk',
    marathiName: 'ताजे डेअरी दूध',
    hindiName: 'ताज़ा डेरी दूध',
    category: 'Milk',
    defaultUnit: 'Litre'
  },
  // 14. Fresh Malai Paneer
  {
    patterns: [
      /मलाई\s*पनीर|ताजे\s*मलाई\s*पनीर|fresh\s*malai\s*paneer|malai\s*paneer/i
    ],
    canonicalEnglish: 'Fresh Malai Paneer',
    marathiName: 'ताजे मलाई पनीर',
    hindiName: 'ताज़ा मलाई पनीर',
    category: 'Paneer & Butter',
    defaultUnit: 'Kg'
  },
  // 15. Amul Malai Paneer
  {
    patterns: [
      /अमुल\s*पनीर|अमूल\s*पनीर|amul\s*paneer/i
    ],
    canonicalEnglish: 'Amul Malai Paneer',
    marathiName: 'अमुल मलाई पनीर',
    hindiName: 'अमूल मलाई पनीर',
    category: 'Paneer & Butter',
    defaultUnit: 'Piece'
  },
  // 16. Fresh Paneer (Generic)
  {
    patterns: [
      /\b(पनीर|ताजे\s*पनीर|ताज़ा\s*पनीर|fresh\s*paneer|paneer|cottage\s*cheese)\b/i
    ],
    canonicalEnglish: 'Fresh Paneer',
    marathiName: 'ताजे पनीर',
    hindiName: 'ताज़ा पनीर',
    category: 'Paneer & Butter',
    defaultUnit: 'Kg'
  },
  // 17. Pure Desi Cow Ghee
  {
    patterns: [
      /गायीचे\s*तूप|गाय\s*तूप|गाय\s*का\s*घी|साजूक\s*तूप|शुद्ध\s*गाय\s*का\s*घी|देशी\s*तूप|देसी\s*घी|cow\s*ghee|pure\s*cow\s*ghee|desi\s*ghee|sajuk\s*tup/i
    ],
    canonicalEnglish: 'Pure Desi Cow Ghee',
    marathiName: 'साजूक गायीचे तूप',
    hindiName: 'शुद्ध देसी गाय का घी',
    category: 'Ghee',
    defaultUnit: 'Kg'
  },
  // 18. Pure Buffalo Ghee
  {
    patterns: [
      /म्हशीचे\s*तूप|म्हैस\s*तूप|भैंस\s*का\s*घी|buffalo\s*ghee|pure\s*buffalo\s*ghee/i
    ],
    canonicalEnglish: 'Pure Buffalo Ghee',
    marathiName: 'म्हशीचे तूप',
    hindiName: 'भैंस का शुद्ध घी',
    category: 'Ghee',
    defaultUnit: 'Kg'
  },
  // 19. Gowardhan Cow Ghee
  {
    patterns: [
      /गोवर्धन\s*तूप|गोवर्धन\s*घी|gowardhan\s*ghee/i
    ],
    canonicalEnglish: 'Gowardhan Cow Ghee',
    marathiName: 'गोवर्धन गायीचे तूप',
    hindiName: 'गोवर्धन गाय का घी',
    category: 'Ghee',
    defaultUnit: 'Kg'
  },
  // 20. Amul Pure Ghee
  {
    patterns: [
      /अमुल\s*तूप|अमूल\s*घी|amul\s*ghee/i
    ],
    canonicalEnglish: 'Amul Pure Ghee',
    marathiName: 'अमुल शुद्ध तूप',
    hindiName: 'अमूल शुद्ध घी',
    category: 'Ghee',
    defaultUnit: 'Kg'
  },
  // 21. Patanjali Cow Ghee
  {
    patterns: [
      /पतंजली\s*तूप|पतंजलि\s*घी|patanjali\s*ghee/i
    ],
    canonicalEnglish: 'Patanjali Cow Ghee',
    marathiName: 'पतंजली गायीचे तूप',
    hindiName: 'पतंजलि गाय का घी',
    category: 'Ghee',
    defaultUnit: 'Kg'
  },
  // 22. Generic Ghee
  {
    patterns: [
      /\b(तूप|तूप\s*डबा|घी|ghee|pure\s*ghee)\b/i
    ],
    canonicalEnglish: 'Pure Dairy Ghee',
    marathiName: 'शुद्ध डेअरी तूप',
    hindiName: 'शुद्ध डेरी घी',
    category: 'Ghee',
    defaultUnit: 'Kg'
  },
  // 23. Amul Butter
  {
    patterns: [
      /अमुल\s*बटर|अमूल\s*बटर|अमुल\s*मक्खन|amul\s*butter/i
    ],
    canonicalEnglish: 'Amul Butter',
    marathiName: 'अमुल बटर',
    hindiName: 'अमूल बटर',
    category: 'Paneer & Butter',
    defaultUnit: 'Piece'
  },
  // 24. Fresh White Butter (Loni)
  {
    patterns: [
      /लोणी|पांढरे\s*लोणी|घरचे\s*लोणी|ताजा\s*मक्खन|सफेद\s*मक्खन|white\s*butter|fresh\s*butter|loni/i
    ],
    canonicalEnglish: 'Fresh White Butter (Loni)',
    marathiName: 'ताजे पांढरे लोणी',
    hindiName: 'ताज़ा सफेद मक्खन',
    category: 'Paneer & Butter',
    defaultUnit: 'Kg'
  },
  // 25. Table Butter (Generic)
  {
    patterns: [
      /\b(बटर|मक्खन|butter|table\s*butter)\b/i
    ],
    canonicalEnglish: 'Pasteurized Table Butter',
    marathiName: 'पाश्चराइज्ड बटर',
    hindiName: 'पाश्चुरीकृत मक्खन',
    category: 'Paneer & Butter',
    defaultUnit: 'Piece'
  },
  // 26. Fresh Curd (Dahi)
  {
    patterns: [
      /\b(दही|ताजे\s*दही|ताजा\s*दही|घरचे\s*दही|curd|fresh\s*curd|dahi)\b/i
    ],
    canonicalEnglish: 'Fresh Curd (Dahi)',
    marathiName: 'ताजे दही',
    hindiName: 'ताज़ा दही',
    category: 'Curd & Chaas',
    defaultUnit: 'Packet (500ml)'
  },
  // 27. Amul Masti Dahi
  {
    patterns: [
      /अमुल\s*मस्ती|अमूल\s*मस्ती|अमुल\s*दही|amul\s*masti|amul\s*dahi/i
    ],
    canonicalEnglish: 'Amul Masti Dahi',
    marathiName: 'अमुल मस्ती दही',
    hindiName: 'अमूल मस्ती दही',
    category: 'Curd & Chaas',
    defaultUnit: 'Packet (500ml)'
  },
  // 28. Masala Buttermilk (Taak / Chaas)
  {
    patterns: [
      /मसाला\s*ताक|मसाला\s*छास|मसाला\s*छाछ|masala\s*taak|masala\s*chaas|masala\s*buttermilk|spiced\s*buttermilk/i
    ],
    canonicalEnglish: 'Masala Buttermilk',
    marathiName: 'मसाला ताक',
    hindiName: 'मसाला छाछ',
    category: 'Curd & Chaas',
    defaultUnit: 'Packet (500ml)'
  },
  // 29. Fresh Plain Buttermilk
  {
    patterns: [
      /\b(ताक|छास|छाछ|taak|chaas|chhaas|buttermilk|fresh\s*buttermilk)\b/i
    ],
    canonicalEnglish: 'Fresh Buttermilk (Taak)',
    marathiName: 'ताजे ताक',
    hindiName: 'ताज़ा छाछ',
    category: 'Curd & Chaas',
    defaultUnit: 'Packet (500ml)'
  },
  // 30. Mango Lassi
  {
    patterns: [
      /मँगो\s*लस्सी|मॅंगो\s*लस्सी|आंबा\s*लस्सी|आम\s*लस्सी|mango\s*lassi/i
    ],
    canonicalEnglish: 'Mango Lassi',
    marathiName: 'आंबा लस्सी',
    hindiName: 'मैंगो लस्सी',
    category: 'Curd & Chaas',
    defaultUnit: 'Piece'
  },
  // 31. Fresh Sweet Lassi
  {
    patterns: [
      /\b(लस्सी|गोड\s*लस्सी|मीठी\s*लस्सी|lassi|sweet\s*lassi)\b/i
    ],
    canonicalEnglish: 'Fresh Sweet Lassi',
    marathiName: 'ताजी गोड लस्सी',
    hindiName: 'ताज़ी मीठी लस्सी',
    category: 'Curd & Chaas',
    defaultUnit: 'Piece'
  },
  // 32. Mango Amrakhand
  {
    patterns: [
      /आम्रखंड|मँगो\s*श्रीखंड|mango\s*shrikhand|amrakhand/i
    ],
    canonicalEnglish: 'Mango Amrakhand',
    marathiName: 'स्वादिष्ट आम्रखंड',
    hindiName: 'स्वादिष्ट आम्रखंड',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  // 33. Fresh Shrikhand
  {
    patterns: [
      /\b(श्रीखंड|वेलची\s*श्रीखंड|इलायची\s*श्रीखंड|shrikhand|fresh\s*shrikhand)\b/i
    ],
    canonicalEnglish: 'Fresh Elaichi Shrikhand',
    marathiName: 'ताजे वेलची श्रीखंड',
    hindiName: 'ताज़ा इलायची श्रीखंड',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  // 34. Fresh Basundi
  {
    patterns: [
      /बासुंदी|रबडी|रबड़ी|basundi|rabdi/i
    ],
    canonicalEnglish: 'Fresh Cream Basundi',
    marathiName: 'ताजी मलाई बासुंदी',
    hindiName: 'ताज़ी मलाई बासुंदी',
    category: 'Sweets/Mithai',
    defaultUnit: 'Kg'
  },
  // 35. Fresh Khawa (Mawa)
  {
    patterns: [
      /खवा|खोया|मावा|ताजा\s*खवा|ताजा\s*खोया|khawa|khoya|mawa|fresh\s*khawa/i
    ],
    canonicalEnglish: 'Fresh Khawa (Mawa)',
    marathiName: 'ताजा खवा (मावा)',
    hindiName: 'ताज़ा खोया (मावा)',
    category: 'Sweets/Mithai',
    defaultUnit: 'Kg'
  },
  // 36. Malai Pedha
  {
    patterns: [
      /पेढा|पेड़ा|मलई\s*पेढा|मलाई\s*पेड़ा|pedha|peda|malai\s*peda/i
    ],
    canonicalEnglish: 'Fresh Malai Peda',
    marathiName: 'ताजे मलाई पेढे',
    hindiName: 'ताज़ा मलाई पेड़ा',
    category: 'Sweets/Mithai',
    defaultUnit: 'Kg'
  },
  // 37. Kaju Katli
  {
    patterns: [
      /काजू\s*कतली|काजू\s*बर्फी|kaju\s*katli|kaju\s*barfi/i
    ],
    canonicalEnglish: 'Kaju Katli Sweets',
    marathiName: 'काजू कतली',
    hindiName: 'काजू कतली',
    category: 'Sweets/Mithai',
    defaultUnit: 'Kg'
  },
  // 38. Gulab Jamun
  {
    patterns: [
      /गुलाबजाम|गुलाब\s*जामुन|gulab\s*jamun/i
    ],
    canonicalEnglish: 'Fresh Gulab Jamun',
    marathiName: 'ताजे गुलाबजाम',
    hindiName: 'ताज़ा गुलाब जामुन',
    category: 'Sweets/Mithai',
    defaultUnit: 'Kg'
  },
  // 39. Rasgulla
  {
    patterns: [
      /रसगुल्ला|रसगुल्ले|rasgulla/i
    ],
    canonicalEnglish: 'Fresh Spongy Rasgulla',
    marathiName: 'ताजे रसगुल्ले',
    hindiName: 'ताज़ा रसगुल्ला',
    category: 'Sweets/Mithai',
    defaultUnit: 'Kg'
  },
  // 40. Belgaum Kunda
  {
    patterns: [
      /कुंदा|kunda|belgaum\s*kunda/i
    ],
    canonicalEnglish: 'Special Belgaum Kunda',
    marathiName: 'स्पेशल कुंदा',
    hindiName: 'स्पेशल कुंदा मिठाई',
    category: 'Sweets/Mithai',
    defaultUnit: 'Kg'
  },
  // 41. Crispy Toast Rusk
  {
    patterns: [
      /\b(टोस्ट|रस्क|मिल्क\s*टोस्ट|toast|rusk|milk\s*toast)\b/i
    ],
    canonicalEnglish: 'Crispy Toast Rusk',
    marathiName: 'कुरकुरीत टोस्ट रस्क',
    hindiName: 'खस्ता टोस्ट रस्क',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 42. Crispy Khari
  {
    patterns: [
      /\b(खारी|बटर\s*खारी|khari|butter\s*khari)\b/i
    ],
    canonicalEnglish: 'Crispy Butter Khari',
    marathiName: 'कुरकुरीत बटर खारी',
    hindiName: 'खस्ता बटर खारी',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 43. Fresh Ladi Pav
  {
    patterns: [
      /\b(पाव|लादी\s*पाव|ladi\s*pav|pav|bun)\b/i
    ],
    canonicalEnglish: 'Fresh Ladi Pav',
    marathiName: 'ताजे लादी पाव',
    hindiName: 'ताज़ा लादी पाव',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 44. Sandwich Bread
  {
    patterns: [
      /\b(ब्रेड|व्हाईट\s*ब्रेड|ब्राऊन\s*ब्रेड|bread|white\s*bread|brown\s*bread)\b/i
    ],
    canonicalEnglish: 'Fresh Sandwich Bread',
    marathiName: 'ताजा सँडविच ब्रेड',
    hindiName: 'ताज़ा सैंडविच ब्रेड',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 45. Parle-G Biscuits
  {
    patterns: [
      /पारले\s*जी|पारलेजी|parle\s*g|parle-g/i
    ],
    canonicalEnglish: 'Parle-G Glucose Biscuits',
    marathiName: 'पारले-जी ग्लुकोज बिस्किट',
    hindiName: 'पारले-जी ग्लूकोज बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 46. Marie Gold Biscuits
  {
    patterns: [
      /मारी\s*गोल्ड|marie\s*gold/i
    ],
    canonicalEnglish: 'Britannia Marie Gold Biscuits',
    marathiName: 'ब्रिटानिया मारी गोल्ड बिस्किट',
    hindiName: 'ब्रिटानिया मैरी गोल्ड बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 47. Good Day Biscuits
  {
    patterns: [
      /गुड\s*डे|good\s*day/i
    ],
    canonicalEnglish: 'Britannia Good Day Butter Biscuits',
    marathiName: 'गुड डे बटर बिस्किट',
    hindiName: 'गुड डे बटर बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 48. Dairy Milk Chocolate
  {
    patterns: [
      /डेअरी\s*मिल्क|डेयरी\s*मिल्क|dairy\s*milk\s*chocolate|cadbury\s*dairy\s*milk/i
    ],
    canonicalEnglish: 'Cadbury Dairy Milk Chocolate',
    marathiName: 'कॅडबरी डेअरी मिल्क चॉकलेट',
    hindiName: 'कैडबरी डेयरी मिल्क चॉकलेट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 49. Amul Kool Badam
  {
    patterns: [
      /अमुल\s*कुल|अमूल\s*कूल|amul\s*kool|amul\s*kool\s*badam/i
    ],
    canonicalEnglish: 'Amul Kool Badam Drink',
    marathiName: 'अमुल कुल बदाम ड्रिंक',
    hindiName: 'अमूल कूल बादाम ड्रिंक',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 50. Amul Fresh Cream
  {
    patterns: [
      /अमुल\s*फ्रेश\s*क्रीम|फ्रेश\s*क्रीम|amul\s*fresh\s*cream|fresh\s*cream/i
    ],
    canonicalEnglish: 'Amul Fresh Cream',
    marathiName: 'अमुल फ्रेश क्रीम',
    hindiName: 'अमूल फ्रेश क्रीम',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 51. Vanilla Ice Cream
  {
    patterns: [
      /व्हॅनिला|वैनिला|आईस्क्रीम|आइसक्रीम|vanilla\s*ice\s*cream|ice\s*cream/i
    ],
    canonicalEnglish: 'Vanilla Ice Cream',
    marathiName: 'व्हॅनिला आईस्क्रीम',
    hindiName: 'वैनिला आइसक्रीम',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 52. Matka Malai Kulfi
  {
    patterns: [
      /कुल्फी|मटका\s*कुल्फी|kulfi|matka\s*kulfi/i
    ],
    canonicalEnglish: 'Matka Malai Kulfi',
    marathiName: 'मटका मलाई कुल्फी',
    hindiName: 'मटका मलाई कुल्फी',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 53. Frozen Green Peas
  {
    patterns: [
      /फ्रोजन\s*मटार|हिरवे\s*मटार|मटार|हरी\s*मटर|frozen\s*peas|green\s*peas/i
    ],
    canonicalEnglish: 'Frozen Green Peas',
    marathiName: 'गोठवलेले हिरवे मटार',
    hindiName: 'फ्रोज़न हरी मटर',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  // 54. Amul Processed Cheese
  {
    patterns: [
      /अमुल\s*चीज|अमूल\s*चीज़|amul\s*cheese/i
    ],
    canonicalEnglish: 'Amul Processed Cheese',
    marathiName: 'अमुल प्रोसेस चीज',
    hindiName: 'अमूल प्रोसेस चीज़',
    category: 'Paneer & Butter',
    defaultUnit: 'Piece'
  },
  // 55. Cheese (Generic)
  {
    patterns: [
      /\b(चीज|चीझ|cheese|processed\s*cheese)\b/i
    ],
    canonicalEnglish: 'Processed Cheese',
    marathiName: 'प्रोसेस चीज',
    hindiName: 'प्रोसेस चीज़',
    category: 'Paneer & Butter',
    defaultUnit: 'Piece'
  }
];

/**
 * Word-by-word Devanagari to English phonetic mapping for unknown phrases
 */
const DEVANAGARI_WORD_MAP: Record<string, string> = {
  'दूध': 'Milk',
  'दुध': 'Milk',
  'तूप': 'Ghee',
  'घी': 'Ghee',
  'पनीर': 'Paneer',
  'दही': 'Curd',
  'ताक': 'Buttermilk',
  'छास': 'Buttermilk',
  'छाछ': 'Buttermilk',
  'लस्सी': 'Lassi',
  'खवा': 'Khawa',
  'खोया': 'Khoya',
  'मावा': 'Mawa',
  'पेढा': 'Pedha',
  'पेड़ा': 'Peda',
  'कुंदा': 'Kunda',
  'श्रीखंड': 'Shrikhand',
  'आम्रखंड': 'Amrakhand',
  'बासुंदी': 'Basundi',
  'बटर': 'Butter',
  'लोणी': 'Butter',
  'मक्खन': 'Butter',
  'चीज': 'Cheese',
  'चीझ': 'Cheese',
  'ब्रेड': 'Bread',
  'पाव': 'Pav',
  'टोस्ट': 'Toast Rusk',
  'रस्क': 'Toast Rusk',
  'खारी': 'Khari',
  'बिस्कीट': 'Biscuits',
  'बिस्कुट': 'Biscuits',
  'चॉकलेट': 'Chocolate',
  'वेफर्स': 'Wafers',
  'शेव': 'Sev',
  'फरसाण': 'Farsan',
  'अमुल': 'Amul',
  'अमूल': 'Amul',
  'ताझा': 'Taaza',
  'ताजा': 'Taaza',
  'गोल्ड': 'Gold',
  'गोवर्धन': 'Gowardhan',
  'मदर': 'Mother',
  'डेअरी': 'Dairy',
  'डेयरी': 'Dairy',
  'चितळे': 'Chitale',
  'गोकुळ': 'Gokul',
  'ब्रिटानिया': 'Britannia',
  'पारले': 'Parle',
  'हल्दीराम': 'Haldiram',
  'कॅडबरी': 'Cadbury',
  'नेस्ले': 'Nestle'
};

/**
 * Synchronous Voice Product Processor
 * Instant zero-latency processing of voice transcript.
 */
export function processVoiceTranscriptSync(
  rawTranscript: string,
  spokenLang: VoiceLanguage = 'mr-IN'
): ProcessedVoiceProduct {
  const cleanInput = normalizeDevanagariNumerals(rawTranscript.trim());
  if (!cleanInput) {
    return {
      englishName: '',
      marathiName: '',
      hindiName: '',
      originalTranscript: ''
    };
  }

  // 1. Detect Pack Size / Measurement
  let detectedPackSize = '';
  let marathiPackText = '';
  let hindiPackText = '';
  let detectedUnit: ProductUnit | undefined;

  for (const m of SPOKEN_MEASUREMENTS) {
    for (const pat of m.patterns) {
      if (pat.test(cleanInput)) {
        detectedPackSize = m.canonical;
        marathiPackText = m.marathiPack;
        hindiPackText = m.hindiPack;
        detectedUnit = m.unit;
        break;
      }
    }
    if (detectedPackSize) break;
  }

  // Fallback generic measurement check if not matched by standard table:
  if (!detectedPackSize) {
    const mlMatch = cleanInput.match(/(\d+)\s*(?:मिली|मिलीलीटर|ml)\b/i);
    if (mlMatch) {
      const mlVal = parseInt(mlMatch[1], 10);
      detectedPackSize = `${mlVal}ml`;
      marathiPackText = `${mlVal} मिली`;
      hindiPackText = `${mlVal} मिली`;
      detectedUnit = mlVal === 500 ? 'Packet (500ml)' : 'Piece';
    } else {
      const litMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:लिटर|लीटर|litre|liter|ltr|l)\b/i);
      if (litMatch) {
        const litVal = litMatch[1];
        detectedPackSize = `${litVal}L`;
        marathiPackText = `${litVal} लिटर`;
        hindiPackText = `${litVal} लीटर`;
        detectedUnit = litVal === '1' ? 'Packet (1L)' : 'Litre';
      } else {
        const kgMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:किलो|केजी|kg|kilo)\b/i);
        if (kgMatch) {
          detectedPackSize = `${kgMatch[1]}kg`;
          marathiPackText = `${kgMatch[1]} किलो`;
          hindiPackText = `${kgMatch[1]} किलो`;
          detectedUnit = 'Kg';
        } else {
          const gmMatch = cleanInput.match(/(\d+)\s*(?:ग्रॅम|ग्राम|gm|g|gram|grams)\b/i);
          if (gmMatch) {
            detectedPackSize = `${gmMatch[1]}g`;
            marathiPackText = `${gmMatch[1]} ग्रॅम`;
            hindiPackText = `${gmMatch[1]} ग्राम`;
            detectedUnit = 'Gram';
          }
        }
      }
    }
  }

  // 2. Match Trained Product Rules
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

  let englishName = '';
  let marathiName = '';
  let hindiName = '';
  let detectedCategory: ProductCategory | undefined;

  if (matchedRule) {
    detectedCategory = matchedRule.category;
    if (!detectedUnit && matchedRule.defaultUnit) {
      detectedUnit = matchedRule.defaultUnit;
    }

    englishName = matchedRule.canonicalEnglish;
    marathiName = matchedRule.marathiName;
    hindiName = matchedRule.hindiName;

    // Append pack size cleanly if detected and not already present
    if (detectedPackSize) {
      if (!englishName.toLowerCase().includes(detectedPackSize.toLowerCase())) {
        englishName = `${englishName} ${detectedPackSize}`;
      }
      if (marathiPackText && !marathiName.includes(marathiPackText)) {
        marathiName = `${marathiName} ${marathiPackText}`;
      }
      if (hindiPackText && !hindiName.includes(hindiPackText)) {
        hindiName = `${hindiName} ${hindiPackText}`;
      }
    }
  } else {
    // If not in pre-trained rule, try word-by-word Devanagari translation
    const words = cleanInput.split(/\s+/);
    const convertedWords = words.map(w => DEVANAGARI_WORD_MAP[w] || w);
    englishName = convertedWords.join(' ');

    if (detectedPackSize && !englishName.includes(detectedPackSize)) {
      englishName = `${englishName} ${detectedPackSize}`;
    }

    // Infer category from English words
    const lower = englishName.toLowerCase();
    if (lower.includes('milk') || lower.includes('दूध')) {
      detectedCategory = 'Milk';
    } else if (lower.includes('ghee') || lower.includes('तूप') || lower.includes('घी')) {
      detectedCategory = 'Ghee';
    } else if (
      lower.includes('paneer') || lower.includes('पनीर') ||
      lower.includes('butter') || lower.includes('लोणी') || lower.includes('बटर') ||
      lower.includes('cheese') || lower.includes('चीज')
    ) {
      detectedCategory = 'Paneer & Butter';
    } else if (
      lower.includes('curd') || lower.includes('dahi') || lower.includes('दही') ||
      lower.includes('chaas') || lower.includes('buttermilk') || lower.includes('ताक') ||
      lower.includes('lassi') || lower.includes('लस्सी')
    ) {
      detectedCategory = 'Curd & Chaas';
    } else if (
      lower.includes('shrikhand') || lower.includes('श्रीखंड') ||
      lower.includes('basundi') || lower.includes('बासुंदी') ||
      lower.includes('khawa') || lower.includes('mawa') || lower.includes('खवा') ||
      lower.includes('kaju') || lower.includes('peda') || lower.includes('jamun') ||
      lower.includes('sweet') || lower.includes('mithai')
    ) {
      detectedCategory = 'Sweets/Mithai';
    } else {
      detectedCategory = 'Bakery & Extras';
    }

    // Generate authentic translations
    const syncTranslation = translateProductNameSync(englishName);
    marathiName = syncTranslation.marathi || cleanInput;
    hindiName = syncTranslation.hindi || cleanInput;
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

/**
 * Asynchronous Voice Product Processor
 * Runs synchronous rules first, then enriches via online translator if network is available.
 */
export async function processVoiceTranscript(
  rawTranscript: string, 
  spokenLang: VoiceLanguage = 'mr-IN'
): Promise<ProcessedVoiceProduct> {
  const result = processVoiceTranscriptSync(rawTranscript, spokenLang);

  if (!result.englishName) return result;

  try {
    const asyncTranslation = await translateProductName(result.englishName);
    if (asyncTranslation.marathi && !result.marathiName) result.marathiName = asyncTranslation.marathi;
    if (asyncTranslation.hindi && !result.hindiName) result.hindiName = asyncTranslation.hindi;
  } catch {}

  return result;
}
