import { ProductCategory, ProductUnit } from '../types';
import { translateProductNameSync, translateProductName } from './productTranslator';

// Check if browser supports Web Speech API
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

// Detect Android / iOS mobile browsers where continuous=true causes duplicated or dropped transcripts
export function isMobileVoiceDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent || '');
}

export type VoiceLanguage = 'mr-IN' | 'hi-IN' | 'en-IN';

export interface ProcessedVoiceProduct {
  englishName: string;
  marathiName: string;
  hindiName: string;
  detectedCategory?: ProductCategory;
  detectedUnit?: ProductUnit;
  packSize?: string;
  detectedBrand?: string;
  matchedRule?: boolean;
  originalTranscript: string;
}

const INTENTIONAL_DOUBLED_TOKENS = new Set(['happy', 'hapi', 'हॅपी', 'हैप्पी', '20', '50', 'yum', 'choco']);

/**
 * Deduplicates consecutive repeated words/phrases that Android Chrome Web Speech API
 * frequently emits (e.g., "Parle G Parle G 50g" -> "Parle G 50g"),
 * while preserving intentional doubled product names like "Happy Happy", "20 20", "50 50".
 */
export function dedupeVoiceTranscript(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  // Remove immediate repeated 2-to-4 word phrases first (case-insensitive)
  let result = cleaned;
  for (let pass = 0; pass < 2; pass++) {
    result = result.replace(/\b(\S+\s+\S+(?:\s+\S+){0,2})\s+\1\b/giu, '$1');
  }

  // Collapse consecutive identical single tokens EXCEPT intentional doubled product tokens
  const tokens = result.split(' ');
  const deduped: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    const prev = deduped[deduped.length - 1];
    const prevPrev = deduped[deduped.length - 2];
    const lower = curr.toLowerCase();
    const isIntentionalPair =
      INTENTIONAL_DOUBLED_TOKENS.has(lower) &&
      prev?.toLowerCase() === lower &&
      prevPrev?.toLowerCase() !== lower;

    if (!prev || prev.toLowerCase() !== lower || isIntentionalPair) {
      deduped.push(curr);
    }
  }
  return deduped.join(' ').trim();
}

/**
 * Normalizes common Android/iOS Indian-accent Speech-to-Text phonetic mishearings
 * for high-frequency Dairy & FMCG barcode products before rule matching.
 */
const PHONETIC_CORRECTIONS: Array<[RegExp, string]> = [
  [/\bparley[\s-]*g\b|\bparle[\s-]*ji\b|\bparli[\s-]*g\b|\bparle[\s-]*g\b/gi, 'Parle-G'],
  [/\bparley\b|\bparli\b/gi, 'Parle'],
  [/\bmonako\b|\bmonaco\b/gi, 'Monaco'],
  [/\bkrack[\s-]*jack\b|\bcrack[\s-]*jack\b/gi, 'Krackjack'],
  [/\bhide\s*(?:and|&|n)\s*seek\b/gi, 'Hide & Seek'],
  [/\bgood\s*day\b|\bgoodday\b|\bgud\s*day\b/gi, 'Good Day'],
  [/\bbritania\b|\bbritaniya\b|\bbritannia\b/gi, 'Britannia'],
  [/\bmari\s*gold\b|\bmarie\s*gold\b|\bmerry\s*gold\b/gi, 'Marie Gold'],
  [/\bborbon\b|\bbourbon\b/gi, 'Bourbon'],
  [/\bmilk\s*bikis\b|\bmilk\s*bikkis\b|\bmilk\s*biskis\b/gi, 'Milk Bikis'],
  [/\bcadbury\s*short(?:s)?\b|\bcadbury\s*shot(?:s)?\b|\bkadbury\s*short(?:s)?\b/gi, 'Cadbury Shots'],
  [/\bkadbury\b|\bcadberry\b|\bcadbury\b/gi, 'Cadbury'],
  [/\b5\s*star\b|\bfive\s*star\b/gi, '5 Star'],
  [/\bkit\s*kat\b|\bkitkat\b/gi, 'KitKat'],
  [/\bmilky\s*bar\b|\bmilkybar\b/gi, 'Milkybar'],
  [/\bkinder\s*joy\b/gi, 'Kinder Joy'],
  [/\bcamper\s*cola\b|\bkampa\s*cola\b|\bcampa\s*cola\b|\bcampus\s*cola\b/gi, 'Campa Cola'],
  [/\bcamper\s*lemon\b|\bkampa\s*lemon\b|\bcampa\s*lemon\b/gi, 'Campa Lemon'],
  [/\bcamper\s*orange\b|\bkampa\s*orange\b|\bcampa\s*orange\b/gi, 'Campa Orange'],
  [/\bcamper\b|\bkampa\b/gi, 'Campa'],
  [/\bthumbs\s*up\b|\bthums\s*up\b|\bthumps\s*up\b/gi, 'Thums Up'],
  [/\bcoca[\s-]*cola\b|\bcoke\b/gi, 'Coca-Cola'],
  [/\bsprite\b|\bsprait\b/gi, 'Sprite'],
  [/\bmaaza\b|\bmaza\b|\bmazza\b/gi, 'Maaza'],
  [/\bfrooti\b|\bfruity\b|\bfruti\b/gi, 'Frooti'],
  [/\bappy\s*fizz\b|\bhappy\s*fizz\b/gi, 'Appy Fizz'],
  [/\bbislery\b|\bbisleri\b|\bbisleri\b/gi, 'Bisleri'],
  [/\bmaggie\b|\bmagi\b|\bmaggi\b/gi, 'Maggi'],
  [/\byippee\b|\byippie\b|\byipi\b/gi, 'YiPPee'],
  [/\bkurkura\b|\bkurkure\b|\bkur\s*kure\b/gi, 'Kurkure'],
  [/\blays\b|\blay's\b|\blace\b/gi, "Lay's"],
  [/\bbalaji\b|\bbala\s*ji\b/gi, 'Balaji'],
  [/\bhaldirams?\b|\bhaldi\s*ram\b/gi, 'Haldiram'],
  [/\bpatanjli\b|\bpatanjali\b|\bpatan\s*jali\b/gi, 'Patanjali'],
  [/\bamool\b|\bamul\b/gi, 'Amul'],
  [/\bgokool\b|\bgokul\b/gi, 'Gokul'],
  [/\bchital\b|\bchitale\b|\bchitle\b/gi, 'Chitale'],
  [/\bgovardhan\b|\bgowardhan\b/gi, 'Gowardhan'],
  [/\bkatraj\b|\bkatraz\b/gi, 'Katraj'],
  [/\bwarana\b|\bwarna\b/gi, 'Warana'],
  [/\bnescafe\b|\bnes\s*cafe\b/gi, 'Nescafe'],
  [/\bbru\s*(?:instant\s*)?coffee\b|\bbrew\s*coffee\b/gi, 'Bru Instant Coffee'],
  [/\bbourn\s*vita\b|\bbornvita\b|\bbournvita\b/gi, 'Bournvita'],
  [/\bhorlicks\b|\bhorlix\b/gi, 'Horlicks'],
  [/\bsunfeast\b|\bsun\s*feast\b/gi, 'Sunfeast'],
  [/\bdark\s*fantasy\b/gi, 'Dark Fantasy'],
  [/\boreo\b|\borio\b/gi, 'Oreo'],
  [/\bnesle\b|\bnestle\b/gi, 'Nestle'],
  // Real Yogeshwari Dairy Shop brands & common mobile speech mishearings
  [/\bram\s*bandu\b|\brambandhu\b|\bram\s*bandhu\b/gi, 'Ram Bandhu'],
  [/\bsubhana\b|\bsuhana\b|\bsuvana\b/gi, 'Suhana'],
  [/\btempting\b|\btemptin\b|\btemtin\b/gi, 'Temptin'],
  [/\bparale\b|\bparle\b/gi, 'Parle'],
  [/\bcadbuary\b|\bcadbery\b/gi, 'Cadbury'],
  [/\bamul\s*ya\b|\bamulya\b/gi, 'Amulya'],
  [/\bchoco\s*minis?\b|\bchocominis?\b/gi, 'Chocominis'],
  [/\bjim\s*jam\b|\bjimjam\b/gi, 'Jim Jam'],
  [/\bmagix\b|\bparle\s*magic\b/gi, 'Magix'],
  [/\bhappy\s*happy\b|\bhapi\s*hapi\b/gi, 'Happy Happy'],
  [/\bunibik\b|\bunibic\b|\byunibic\b/gi, 'Unibic'],
  [/\bkarias?\b|\bkaria'?s\b/gi, "Karia's"],
  [/\bchiki\b|\bchikki\b/gi, 'Chikki'],
  [/\bshezwan\b|\bschezwan\b|\bshejwan\b/gi, 'Schezwan'],
  [/\bbiriyani\b|\bbiryani\b/gi, 'Biryani'],
  [/\bgrevy\b|\bgravy\b/gi, 'Gravy'],
  [/\bmatan\b|\bmatton\b|\bmutton\b/gi, 'Mutton'],
  [/\bkitechen\b|\bkichan\b|\bkitchen\b/gi, 'Kitchen'],
  [/\bmsala\b|\bmasla\b/gi, 'Masala'],
  [/\bzeera\b|\bjeera\b/gi, 'Jeera'],
  [/\bvalina\b|\bvanila\b|\bvanilla\b/gi, 'Vanilla'],
  [/\bchoclate\b|\bchocolat\b/gi, 'Chocolate'],
  [/\bchiwda\b|\bchivda\b/gi, 'Chivda'],
  [/\bchakali\b|\bchakli\b/gi, 'Chakli'],
  [/\bambari\b|\bambhari\b/gi, 'Ambari'],
  [/\bchatpat\b|\bchatpata\b/gi, 'Chatpat'],
  [/\b20\s*20\b|\btwenty\s*twenty\b|\b20-20\b/gi, '20-20'],
  [/\b50\s*50\b|\bfifty\s*fifty\b|\b50-50\b/gi, '50-50'],
  [/\bkissan\b|\bkisan\b/gi, 'Kissan'],
  [/\beverest\b/gi, 'Everest'],
  [/\baashirvaad\b|\bashirwad\b|\bashirvaad\b/gi, 'Aashirvaad'],
  [/\bsonai\b|\bsonayi\b/gi, 'Sonai'],
  [/\bmahanand\b|\bmahananda\b/gi, 'Mahanand'],
  [/\bnandini\b|\bnandani\b/gi, 'Nandini'],
  [/\bprabhat\b|\bprabat\b/gi, 'Prabhat']
];

/**
 * Strips spoken filler phrases that shopkeepers say before/around product names
 * (e.g. "add product Parle G", "नवीन उत्पादन अमूल दूध", "ek packet Maggi").
 */
export function stripSpokenFillers(text: string): string {
  return text
    .replace(
      /^(?:add\s+(?:new\s+)?product|new\s+product|product\s+name|add\s+item|register|नवीन\s+उत्पादन|नवीन\s+माल|उत्पादनाचे\s+नाव|नया\s+उत्पाद|प्रोडक्ट\s+नेम|ऐड\s+करो|जोडो|टाका)\s*[:,-]?\s*/iu,
      ''
    )
    .replace(/^(?:ek|one|1)\s+(?:packet|pack|piece|pcs|bottle|box|pouch|पॅकेट|पैकेट|नग)\s+/iu, '')
    .replace(/\s+(?:आहे|टाका|सेव्ह\s*करा|जोड़ो|सेव\s*करो|please|plz)$/iu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function applyPhoneticCorrections(text: string): string {
  let out = stripSpokenFillers(dedupeVoiceTranscript(text));
  for (const [pattern, replacement] of PHONETIC_CORRECTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Full Devanagari -> Roman English phonetic transliterator for custom/local
 * Marathi & Hindi product names not in the hardcoded dictionary.
 */
const DEVANAGARI_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'ळ': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f'
};

const DEVANAGARI_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ॲ': 'a'
};

const DEVANAGARI_MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'a'
};

export function transliterateDevanagariWord(word: string): string {
  if (!/[\u0900-\u097F]/.test(word)) return word;
  const chars = Array.from(word);
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    // Nukta combinations
    const withNukta = next === '़' ? ch + next : null;
    if (withNukta && DEVANAGARI_CONSONANTS[withNukta]) {
      const base = DEVANAGARI_CONSONANTS[withNukta];
      i += 1;
      const afterNukta = chars[i + 1];
      if (afterNukta === '्') {
        out += base;
        i += 1;
      } else if (afterNukta && DEVANAGARI_MATRAS[afterNukta] !== undefined) {
        out += base + DEVANAGARI_MATRAS[afterNukta];
        i += 1;
      } else {
        out += i === chars.length - 1 ? base : base + 'a';
      }
      continue;
    }

    if (DEVANAGARI_CONSONANTS[ch]) {
      const base = DEVANAGARI_CONSONANTS[ch];
      if (next === '्') {
        // Virama / Halant suppresses inherent vowel
        out += base;
        i += 1;
      } else if (next && DEVANAGARI_MATRAS[next] !== undefined) {
        out += base + DEVANAGARI_MATRAS[next];
        i += 1;
      } else {
        // Schwa deletion at word end (e.g., सोनाई, सागर, राजाराम)
        const isWordEnd = i === chars.length - 1;
        out += isWordEnd ? base : base + 'a';
      }
    } else if (DEVANAGARI_VOWELS[ch]) {
      out += DEVANAGARI_VOWELS[ch];
    } else if (ch === 'ं' || ch === 'ँ') {
      out += 'n';
    } else if (ch === 'ः') {
      out += 'h';
    } else if (ch === '़' || ch === '्') {
      // already handled
    } else {
      out += ch;
    }
  }

  return out ? out.charAt(0).toUpperCase() + out.slice(1) : word;
}

/**
 * Brand detector for 45+ Indian Dairy, Masala, Sauce, Biscuit & Beverage brands
 */
const BRAND_PATTERNS: Array<[RegExp, string]> = [
  [/\bamulya\b|अमुल्या/i, 'Amulya'],
  [/\bamul\b|अमुल|अमूल/i, 'Amul'],
  [/\bram\s*bandhu\b|राम\s*बंधू|रामबंधू/i, 'Ram Bandhu'],
  [/\bsuhana\b|सुहाना/i, 'Suhana'],
  [/\btemptin\b|टेम्प्टिन/i, 'Temptin'],
  [/\bparle\b|पार्ले|पारले/i, 'Parle'],
  [/\bbritannia\b|ब्रिटानिया/i, 'Britannia'],
  [/\bcadbury\b|\boreo\b|कॅडबरी|कैडबरी/i, 'Cadbury'],
  [/\bnestle\b|\bmaggi\b|\bkitkat\b|\bnescafe\b|नेस्ले|मॅगी|मैगी/i, 'Nestle'],
  [/\bcampa\b|कॅम्पा|कैम्पा/i, 'Campa'],
  [/\bunibic\b|युनिबिक/i, 'Unibic'],
  [/\bkaria'?s\b/i, "Karia's"],
  [/\bpatanjali\b|पतंजली|पतंजलि/i, 'Patanjali'],
  [/\bbru\b|ब्रू/i, 'BRU'],
  [/\bchitale\b|चितळे|चितले/i, 'Chitale'],
  [/\bgokul\b|गोकुळ|गोकुल/i, 'Gokul'],
  [/\bgowardhan\b|\bgovardhan\b|गोवर्धन/i, 'Gowardhan'],
  [/\bkatraj\b|कात्रज/i, 'Katraj'],
  [/\bwarana\b|वारणा/i, 'Warana'],
  [/\bprabhat\b|प्रभात/i, 'Prabhat'],
  [/\bsonai\b|सोनाई/i, 'Sonai'],
  [/\bmahanand\b|महानंद/i, 'Mahanand'],
  [/\bmother\s*dairy\b|मदर\s*डेअरी|मदर\s*डेयरी/i, 'Mother Dairy'],
  [/\bnandini\b|नंदिनी/i, 'Nandini'],
  [/\bhaldiram\b|हल्दीराम/i, 'Haldiram'],
  [/\bbalaji\b|बालाजी/i, 'Balaji'],
  [/\bsunfeast\b|\byippee\b|\bdark\s*fantasy\b|सनफीस्ट/i, 'Sunfeast'],
  [/\blays\b|\blay's\b|\bkurkure\b|\bsting\b|कुरकुरे|लेझ/i, 'PepsiCo'],
  [/\bcoca[\s-]*cola\b|\bthums\s*up\b|\bsprite\b|\bfanta\b|\blimca\b|\bmaaza\b|स्प्राईट|माझा/i, 'Coca-Cola'],
  [/\bfrooti\b|\bappy\s*fizz\b|फ्रूटी/i, 'Parle Agro'],
  [/\bbisleri\b|बिस्लेरी|बिसलेरी/i, 'Bisleri'],
  [/\beverest\b|एव्हरेस्ट/i, 'Everest'],
  [/\bkissan\b|किसान/i, 'Kissan'],
  [/\btata\b|टाटा/i, 'Tata'],
  [/\bhorlicks\b|हॉर्लिक्स/i, 'Horlicks']
];

export function detectBrandFromText(text: string): string | undefined {
  for (const [pat, brand] of BRAND_PATTERNS) {
    if (pat.test(text)) return brand;
  }
  return undefined;
}

/**
 * Lightweight Levenshtein similarity (0..1) for fuzzy voice product matching
 */
function tokenSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;
  if (Math.abs(s1.length - s2.length) > 3) return 0;

  const prev = new Array<number>(s2.length + 1);
  const curr = new Array<number>(s2.length + 1);
  for (let j = 0; j <= s2.length; j++) prev[j] = j;

  for (let i = 1; i <= s1.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= s2.length; j++) prev[j] = curr[j];
  }
  return 1 - prev[s2.length] / Math.max(s1.length, s2.length);
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
  // 500ml / Half Litre (Unicode-safe boundaries so Devanagari matches reliably)
  {
    patterns: [
      /(?:^|[\s,.-])(अर्धा\s*लिटर|अर्धा\s*लीटर|आधा\s*लीटर|half\s*litre|half\s*liter|half\s*l|half\s*ltr)(?=$|[\s,.-])/i,
      /(?:^|[\s,.-])(पाचशे\s*मिली|पाच\s*शे\s*मिली|पाँच\s*सौ\s*मिली|पांच\s*सौ\s*मिली|500\s*ml|500ml|500\s*मिली|500\s*मिलीलीटर)(?=$|[\s,.-])/i
    ],
    canonical: '500ml',
    marathiPack: '५०० मिली',
    hindiPack: '500 मिली',
    unit: 'Packet (500ml)'
  },
  // 1 Litre
  {
    patterns: [
      /(?:^|[\s,.-])(एक\s*लिटर|एक\s*लीटर|one\s*litre|one\s*liter|1\s*लिटर|1\s*लीटर|1\s*litre|1\s*liter|1\s*l|1l|1\s*ltr|1ltr)(?=$|[\s,.-])/i
    ],
    canonical: '1L',
    marathiPack: '१ लिटर',
    hindiPack: '1 लीटर',
    unit: 'Packet (1L)'
  },
  // 250ml / Quarter Litre
  {
    patterns: [
      /(?:^|[\s,.-])(पाव\s*लिटर|पाव\s*लीटर|quarter\s*litre|quarter\s*liter)(?=$|[\s,.-])/i,
      /(?:^|[\s,.-])(अडीचशे\s*मिली|ढाई\s*सौ\s*मिली|250\s*ml|250ml|250\s*मिली|250\s*मिलीलीटर)(?=$|[\s,.-])/i
    ],
    canonical: '250ml',
    marathiPack: '२५० मिली',
    hindiPack: '250 मिली',
    unit: 'Piece'
  },
  // 2 Litre
  {
    patterns: [
      /(?:^|[\s,.-])(दोन\s*लिटर|दो\s*लीटर|two\s*litre|two\s*liter|2\s*लिटर|2\s*लीटर|2\s*litre|2\s*liter|2\s*l|2l|2\s*ltr)(?=$|[\s,.-])/i
    ],
    canonical: '2L',
    marathiPack: '२ लिटर',
    hindiPack: '2 लीटर',
    unit: 'Litre'
  },
  // 5 Litre
  {
    patterns: [
      /(?:^|[\s,.-])(पाच\s*लिटर|पाँच\s*लीटर|पांच\s*लीटर|five\s*litre|five\s*liter|5\s*लिटर|5\s*लीटर|5\s*litre|5\s*liter|5\s*l|5l)(?=$|[\s,.-])/i
    ],
    canonical: '5L',
    marathiPack: '५ लिटर',
    hindiPack: '5 लीटर',
    unit: 'Litre'
  },
  // 200ml
  {
    patterns: [
      /(?:^|[\s,.-])(दोनशे\s*मिली|दो\s*सौ\s*मिली|200\s*ml|200ml|200\s*मिली|200\s*मिलीलीटर)(?=$|[\s,.-])/i
    ],
    canonical: '200ml',
    marathiPack: '२०० मिली',
    hindiPack: '200 मिली',
    unit: 'Piece'
  },
  // 100ml
  {
    patterns: [
      /(?:^|[\s,.-])(शंभर\s*मिली|सौ\s*मिली|100\s*ml|100ml|100\s*मिली|100\s*मिलीलीटर)(?=$|[\s,.-])/i
    ],
    canonical: '100ml',
    marathiPack: '१०० मिली',
    hindiPack: '100 मिली',
    unit: 'Piece'
  },
  // 1 kg
  {
    patterns: [
      /(?:^|[\s,.-])(एक\s*किलो|एक\s*केजी|one\s*kg|one\s*kilo|1\s*किलो|1\s*केजी|1\s*kg|1kg|1\s*kilo|1\s*kilogram|1\s*किलोग्राम)(?=$|[\s,.-])/i
    ],
    canonical: '1kg',
    marathiPack: '१ किलो',
    hindiPack: '1 किलो',
    unit: 'Kg'
  },
  // 500g / Half Kg
  {
    patterns: [
      /(?:^|[\s,.-])(अर्धा\s*किलो|आधा\s*किलो|half\s*kg|half\s*kilo)(?=$|[\s,.-])/i,
      /(?:^|[\s,.-])(पाचशे\s*ग्रॅम|पाचशे\s*ग्राम|पाँच\s*सौ\s*ग्राम|पांच\s*सौ\s*ग्राम|500\s*g|500g|500\s*gm|500\s*gram|500\s*grams|500\s*ग्रॅम|500\s*ग्राम)(?=$|[\s,.-])/i
    ],
    canonical: '500g',
    marathiPack: '५०० ग्रॅम',
    hindiPack: '500 ग्राम',
    unit: 'Gram'
  },
  // 250g / Quarter Kg
  {
    patterns: [
      /(?:^|[\s,.-])(पाव\s*किलो|quarter\s*kg|quarter\s*kilo)(?=$|[\s,.-])/i,
      /(?:^|[\s,.-])(अडीचशे\s*ग्रॅम|ढाई\s*सौ\s*ग्राम|250\s*g|250g|250\s*gm|250\s*gram|250\s*grams|250\s*ग्रॅम|250\s*ग्राम)(?=$|[\s,.-])/i
    ],
    canonical: '250g',
    marathiPack: '२५० ग्रॅम',
    hindiPack: '250 ग्राम',
    unit: 'Gram'
  },
  // 200g
  {
    patterns: [
      /(?:^|[\s,.-])(दोनशे\s*ग्रॅम|दोनशे\s*ग्राम|दो\s*सौ\s*ग्राम|200\s*g|200g|200\s*gm|200\s*gram|200\s*grams|200\s*ग्रॅम|200\s*ग्राम)(?=$|[\s,.-])/i
    ],
    canonical: '200g',
    marathiPack: '२०० ग्रॅम',
    hindiPack: '200 ग्राम',
    unit: 'Gram'
  },
  // 100g
  {
    patterns: [
      /(?:^|[\s,.-])(शंभर\s*ग्रॅम|शंभर\s*ग्राम|सौ\s*ग्राम|100\s*g|100g|100\s*gm|100\s*gram|100\s*grams|100\s*ग्रॅम|100\s*ग्राम)(?=$|[\s,.-])/i
    ],
    canonical: '100g',
    marathiPack: '१०० ग्रॅम',
    hindiPack: '100 ग्राम',
    unit: 'Gram'
  },
  // 2 kg
  {
    patterns: [
      /(?:^|[\s,.-])(दोन\s*किलो|दो\s*किलो|two\s*kg|2\s*किलो|2\s*केजी|2\s*kg|2kg|2\s*kilo)(?=$|[\s,.-])/i
    ],
    canonical: '2kg',
    marathiPack: '२ किलो',
    hindiPack: '2 किलो',
    unit: 'Kg'
  },
  // 5 kg
  {
    patterns: [
      /(?:^|[\s,.-])(पाच\s*किलो|पाँच\s*किलो|five\s*kg|5\s*किलो|5\s*केजी|5\s*kg|5kg|5\s*kilo)(?=$|[\s,.-])/i
    ],
    canonical: '5kg',
    marathiPack: '५ किलो',
    hindiPack: '5 किलो',
    unit: 'Kg'
  },
  // 400g
  {
    patterns: [
      /(?:^|[\s,.-])(चारशे\s*ग्रॅम|चार\s*सौ\s*ग्राम|400\s*g|400g|400\s*gm|400\s*gram|400\s*grams|400\s*ग्रॅम|400\s*ग्राम)(?=$|[\s,.-])/i
    ],
    canonical: '400g',
    marathiPack: '४०० ग्रॅम',
    hindiPack: '400 ग्राम',
    unit: 'Gram'
  },
  // 1.5 Litre (Deed Litre / Dedh Litre)
  {
    patterns: [
      /(?:^|[\s,.-])(दीड\s*लिटर|दीड\s*लीटर|डेढ़\s*लीटर|डेढ\s*लीटर|1\.5\s*l|1\.5l|1\.5\s*litre|1\.5\s*liter|1\.5\s*लिटर|1\.5\s*लीटर)(?=$|[\s,.-])/i
    ],
    canonical: '1.5L',
    marathiPack: '१.५ लिटर',
    hindiPack: '1.5 लीटर',
    unit: 'Litre'
  },
  // 750g (Paun Kilo)
  {
    patterns: [
      /(?:^|[\s,.-])(पाऊण\s*किलो|पौन\s*किलो|सातशे\s*पन्नास\s*ग्रॅम|750\s*g|750g|750\s*gm|750\s*gram|750\s*ग्रॅम|750\s*ग्राम)(?=$|[\s,.-])/i
    ],
    canonical: '750g',
    marathiPack: '७५० ग्रॅम',
    hindiPack: '750 ग्राम',
    unit: 'Gram'
  },
  // 1.25 kg (Savva Kilo)
  {
    patterns: [
      /(?:^|[\s,.-])(सव्वा\s*किलो|सवा\s*किलो|1\.25\s*kg|1\.25kg)(?=$|[\s,.-])/i
    ],
    canonical: '1.25kg',
    marathiPack: '१.२५ किलो',
    hindiPack: '1.25 किलो',
    unit: 'Kg'
  },
  // 50g
  {
    patterns: [
      /(?:^|[\s,.-])(पन्नास\s*ग्रॅम|पचास\s*ग्राम|50\s*g|50g|50\s*gm|50\s*gram|50\s*ग्रॅम|50\s*ग्राम)(?=$|[\s,.-])/i
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
      /चितळे\s*दूध|चितले\s*दूध|चितळे\s*म्हैस|चितले\s*भैंस|chitale\s*milk|chitale\s*buffalo/i
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
      /(?:^|[\s,.-])(चीज|चीझ|cheese|processed\s*cheese)(?=$|[\s,.-])/i
    ],
    canonicalEnglish: 'Processed Cheese',
    marathiName: 'प्रोसेस चीज',
    hindiName: 'प्रोसेस चीज़',
    category: 'Paneer & Butter',
    defaultUnit: 'Piece'
  },
  // =========================================================================
  // TRAINED BARCODE FMCG, BEVERAGES, BISCUITS, CHOCOLATES & SNACKS RULES
  // =========================================================================
  {
    patterns: [/पार्ले\s*जी|पारले\s*जी|parle[\s-]*g/i],
    canonicalEnglish: 'Parle-G Biscuit',
    marathiName: 'पार्ले-जी बिस्कीट',
    hindiName: 'पारले-जी बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/पार्ले\s*मोनाको|मोनाको|parle\s*monaco|monaco/i],
    canonicalEnglish: 'Parle Monaco Biscuit',
    marathiName: 'पार्ले मोनाको बिस्कीट',
    hindiName: 'पारले मोनाको बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/क्रॅकजॅक|क्रैकजैक|krackjack|crack\s*jack/i],
    canonicalEnglish: 'Parle Krackjack Biscuit',
    marathiName: 'पार्ले क्रॅकजॅक बिस्कीट',
    hindiName: 'पारले क्रैकजैक बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/हाईड\s*अँड\s*सीक|हाइड\s*एंड\s*सीक|hide\s*(?:&|and)\s*seek/i],
    canonicalEnglish: 'Parle Hide & Seek',
    marathiName: 'पार्ले हाईड अँड सीक',
    hindiName: 'पारले हाइड एंड सीक',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/गुड\s*डे|गुड्डे|good\s*day/i],
    canonicalEnglish: 'Britannia Good Day',
    marathiName: 'ब्रिटानिया गुड डे बिस्कीट',
    hindiName: 'ब्रिटानिया गुड डे बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मॅरी\s*गोल्ड|मैरी\s*गोल्ड|marie\s*gold/i],
    canonicalEnglish: 'Britannia Marie Gold',
    marathiName: 'ब्रिटानिया मॅरी गोल्ड',
    hindiName: 'ब्रिटानिया मैरी गोल्ड',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/बॉर्बन|बोरबॉन|bourbon/i],
    canonicalEnglish: 'Britannia Bourbon',
    marathiName: 'ब्रिटानिया बॉर्बन बिस्कीट',
    hindiName: 'ब्रिटानिया बॉर्बन बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मिल्क\s*बिकीज|milk\s*bikis/i],
    canonicalEnglish: 'Britannia Milk Bikis',
    marathiName: 'ब्रिटानिया मिल्क बिकीज',
    hindiName: 'ब्रिटानिया मिल्क बिकीज़',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/टायगर\s*बिस्कीट|टाइगर\s*बिस्कुट|tiger\s*(?:biscuit|krunch)/i],
    canonicalEnglish: 'Britannia Tiger Biscuit',
    marathiName: 'ब्रिटानिया टायगर बिस्कीट',
    hindiName: 'ब्रिटानिया टाइगर बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/लिटिल\s*हार्ट्स|little\s*hearts/i],
    canonicalEnglish: 'Britannia Little Hearts',
    marathiName: 'ब्रिटानिया लिटिल हार्ट्स',
    hindiName: 'ब्रिटानिया लिटिल हार्ट्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/ओरियो|oreo/i],
    canonicalEnglish: 'Cadbury Oreo Biscuit',
    marathiName: 'ओरियो बिस्कीट',
    hindiName: 'ओरियो बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/डार्क\s*फॅन्टसी|डार्क\s*फैंटेसी|dark\s*fantasy/i],
    canonicalEnglish: 'Sunfeast Dark Fantasy',
    marathiName: 'सनफीस्ट डार्क फॅन्टसी',
    hindiName: 'सनफीस्ट डार्क फैंटेसी',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/पतंजली\s*(?:दूध|दुध)?\s*बिस्कीट|पतंजलि\s*बिस्कुट|patanjali\s*(?:doodh\s*)?biscuit/i],
    canonicalEnglish: 'Patanjali Doodh Biscuit',
    marathiName: 'पतंजली दूध बिस्कीट',
    hindiName: 'पतंजलि दूध बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/कॅडबरी\s*शॉट्स|कैडबरी\s*शॉट्स|cadbury\s*shots/i],
    canonicalEnglish: 'Cadbury Shots',
    marathiName: 'कॅडबरी शॉट्स',
    hindiName: 'कैडबरी शॉट्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/फाईव्ह\s*स्टार|फाइव\s*स्टार|5\s*star/i],
    canonicalEnglish: 'Cadbury 5 Star',
    marathiName: 'कॅडबरी ५ स्टार',
    hindiName: 'कैडबरी 5 स्टार',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/पर्क|cadbury\s*perk|(?:^|\s)perk(?=$|\s)/i],
    canonicalEnglish: 'Cadbury Perk',
    marathiName: 'कॅडबरी पर्क',
    hindiName: 'कैडबरी पर्क',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/जेम्स|cadbury\s*gems|(?:^|\s)gems(?=$|\s)/i],
    canonicalEnglish: 'Cadbury Gems',
    marathiName: 'कॅडबरी जेम्स',
    hindiName: 'कैडबरी जेम्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/किटकॅट|किटकैट|kitkat/i],
    canonicalEnglish: 'Nestle KitKat',
    marathiName: 'नेस्ले किटकॅट',
    hindiName: 'नेस्ले किटकैट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मंच|nestle\s*munch|(?:^|\s)munch(?=$|\s)/i],
    canonicalEnglish: 'Nestle Munch',
    marathiName: 'नेस्ले मंच',
    hindiName: 'नेस्ले मंच',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मिल्कीबार|मिल्की\s*बार|milkybar/i],
    canonicalEnglish: 'Nestle Milkybar',
    marathiName: 'नेस्ले मिल्कीबार',
    hindiName: 'नेस्ले मिल्कीबार',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/किंडर\s*जॉय|kinder\s*joy/i],
    canonicalEnglish: 'Kinder Joy',
    marathiName: 'किंडर जॉय',
    hindiName: 'किंडर जॉय',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/कॅम्पा\s*कोला|कैम्पा\s*कोला|campa\s*cola/i],
    canonicalEnglish: 'Campa Cola',
    marathiName: 'कॅम्पा कोला',
    hindiName: 'कैम्पा कोला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/कॅम्पा\s*लेमन|कैम्पा\s*लेमन|campa\s*lemon/i],
    canonicalEnglish: 'Campa Lemon Flavour',
    marathiName: 'कॅम्पा लेमन',
    hindiName: 'कैम्पा लेमन',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/कॅम्पा\s*ऑरेंज|कैम्पा\s*ऑरेंज|campa\s*orange/i],
    canonicalEnglish: 'Campa Orange Flavour',
    marathiName: 'कॅम्पा ऑरेंज',
    hindiName: 'कैम्पा ऑरेंज',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/कोका\s*कोला|कोक|coca[\s-]*cola/i],
    canonicalEnglish: 'Coca-Cola',
    marathiName: 'कोका-कोला',
    hindiName: 'कोका-कोला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/थम्स\s*अप|थम्ब्स\s*अप|thums\s*up/i],
    canonicalEnglish: 'Thums Up',
    marathiName: 'थम्स अप',
    hindiName: 'थम्स अप',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/स्प्राईट|स्प्राइट|sprite/i],
    canonicalEnglish: 'Sprite',
    marathiName: 'स्प्राईट',
    hindiName: 'स्प्राइट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/फॅन्टा|फैंटा|fanta/i],
    canonicalEnglish: 'Fanta Orange',
    marathiName: 'फॅन्टा ऑरेंज',
    hindiName: 'फैंटा ऑरेंज',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/लिम्का|limca/i],
    canonicalEnglish: 'Limca',
    marathiName: 'लिम्का',
    hindiName: 'लिम्का',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/माझा|माज़ा|maaza/i],
    canonicalEnglish: 'Maaza Mango Drink',
    marathiName: 'माझा मँगो ड्रिंक',
    hindiName: 'माज़ा मैंगो ड्रिंक',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/फ्रूटी|frooti/i],
    canonicalEnglish: 'Frooti Mango Drink',
    marathiName: 'फ्रूटी मँगो ड्रिंक',
    hindiName: 'फ्रूटी मैंगो ड्रिंक',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/ॲपी\s*फिझ|ऐपी\s*फिज़|appy\s*fizz/i],
    canonicalEnglish: 'Appy Fizz',
    marathiName: 'ॲपी फिझ',
    hindiName: 'ऐपी फिज़',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/स्टिंग|sting\s*(?:energy)?/i],
    canonicalEnglish: 'Sting Energy Drink',
    marathiName: 'स्टिंग एनर्जी ड्रिंक',
    hindiName: 'स्टिंग एनर्जी ड्रिंक',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/बिस्लेरी|बिसलेरी|bisleri/i],
    canonicalEnglish: 'Bisleri Mineral Water',
    marathiName: 'बिस्लेरी पाणी बॉटल',
    hindiName: 'बिसलेरी मिनरल वॉटर',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मॅगी\s*मसाला\s*मॅजिक|मैगी\s*मसाला\s*मैजिक|maggi\s*masala[\s-]*(?:ae[\s-]*)?magic/i],
    canonicalEnglish: 'Maggi Masala-ae-Magic',
    marathiName: 'मॅगी मसाला-ए-मॅजिक',
    hindiName: 'मैगी मसाला-ए-मैजिक',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मॅगी\s*(?:मसाला)?|मैगी\s*(?:मसाला)?|maggi(?:\s*masala)?/i],
    canonicalEnglish: 'Maggi Masala Noodles',
    marathiName: 'मॅगी मसाला नूडल्स',
    hindiName: 'मैगी मसाला नूडल्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/यिप्पी|yippee/i],
    canonicalEnglish: 'Sunfeast YiPPee Noodles',
    marathiName: 'यिप्पी नूडल्स',
    hindiName: 'यिप्पी नूडल्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/कुरकुरे|kurkure/i],
    canonicalEnglish: 'Kurkure Masala Munch',
    marathiName: 'कुरकुरे मसाला मंच',
    hindiName: 'कुरकुरे मसाला मंच',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/लेझ|लेज़|lay's/i],
    canonicalEnglish: "Lay's Potato Chips",
    marathiName: 'लेझ चिप्स',
    hindiName: 'लेज़ चिप्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/बालाजी\s*(?:वेफर्स|चिप्स|नमकीन)?|balaji\s*(?:wafers|chips|namkeen)?/i],
    canonicalEnglish: 'Balaji Wafers',
    marathiName: 'बालाजी वेफर्स',
    hindiName: 'बालाजी वेफर्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/हल्दीराम\s*भुजिया|haldiram\s*(?:aloo\s*)?bhujia/i],
    canonicalEnglish: 'Haldiram Bhujia Sev',
    marathiName: 'हल्दीराम भुजिया शेव',
    hindiName: 'हल्दीराम भुजिया सेव',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/ब्रू\s*(?:इन्स्टंट\s*)?कॉफी|ब्रू\s*कॉफी|bru\s*instant\s*coffee|instant\s*coffee/i],
    canonicalEnglish: 'Bru Instant Coffee',
    marathiName: 'ब्रू इन्स्टंट कॉफी',
    hindiName: 'ब्रू इंस्टेंट कॉफी',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/नेस्कॅफे|नेस्कैफे|nescafe/i],
    canonicalEnglish: 'Nescafe Classic Coffee',
    marathiName: 'नेस्कॅफे कॉफी',
    hindiName: 'नेस्कैफे कॉफी',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/बोर्नव्हिटा|बॉर्नविटा|bournvita/i],
    canonicalEnglish: 'Cadbury Bournvita',
    marathiName: 'कॅडबरी बोर्नव्हिटा',
    hindiName: 'कैडबरी बॉर्नविटा',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/हॉर्लिक्स|horlicks/i],
    canonicalEnglish: 'Horlicks Health Drink',
    marathiName: 'हॉर्लिक्स',
    hindiName: 'हॉर्लिक्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/चितळे\s*बाकरवडी|बाकरवडी|चितले\s*बाकरवड़ी|bakarwadi|bhakarwadi/i],
    canonicalEnglish: 'Chitale Bakarwadi',
    marathiName: 'चितळे बाकरवडी',
    hindiName: 'चितले बाकरवड़ी',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/कात्रज\s*दूध|katraj\s*milk/i],
    canonicalEnglish: 'Katraj Milk',
    marathiName: 'कात्रज दूध',
    hindiName: 'कात्रज दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  {
    patterns: [/वारणा\s*दूध|warana\s*milk/i],
    canonicalEnglish: 'Warana Milk',
    marathiName: 'वारणा दूध',
    hindiName: 'वारणा दूध',
    category: 'Milk',
    defaultUnit: 'Packet (500ml)'
  },
  // =========================================================================
  // YOGESHWARI DAIRY SHOP REAL CATALOGUE RULES (RAM BANDHU, SUHANA, TEMPTIN, PARLE, AMULYA, CHIKKI)
  // =========================================================================
  {
    patterns: [/अमुल\s*चोकोमिनी|अमूल\s*चोकोमिनी|amul\s*chocominis?|chocominis?/i],
    canonicalEnglish: 'Amul Chocominis',
    marathiName: 'अमुल चोकोमिनी चॉकलेट',
    hindiName: 'अमूल चोकोमिनी चॉकलेट',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/अमुल्या|अमूल्या|amulya(?:\s*dairy\s*whitener|\s*milk\s*powder)?/i],
    canonicalEnglish: 'Amulya Dairy Whitener',
    marathiName: 'अमुल्या डेअरी व्हाइटनर',
    hindiName: 'अमूल्या डेयरी व्हाइटनर',
    category: 'Milk',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/जिम\s*जॅम|जिम\s*जैम|jim\s*jam/i],
    canonicalEnglish: 'Britannia Jim Jam',
    marathiName: 'ब्रिटानिया जिम जॅम बिस्कीट',
    hindiName: 'ब्रिटानिया जिम जैम बिस्कुट',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मोनाको\s*जिरा|मोनाको\s*जीरा|monaco\s*jeera/i],
    canonicalEnglish: 'Parle Monaco Jeera',
    marathiName: 'पार्ले मोनाको जिरा बिस्कीट',
    hindiName: 'पारले मोनाको जीरा बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/हॅपी\s*हॅपी\s*केक|हैप्पी\s*हैप्पी\s*केक|happy\s*happy\s*cake/i],
    canonicalEnglish: 'Parle Happy Happy Cake',
    marathiName: 'पार्ले हॅपी हॅपी केक',
    hindiName: 'पारले हैप्पी हैप्पी केक',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/हॅपी\s*हॅपी|हैप्पी\s*हैप्पी|happy\s*happy/i],
    canonicalEnglish: 'Parle Happy Happy Biscuit',
    marathiName: 'पार्ले हॅपी हॅपी बिस्कीट',
    hindiName: 'पारले हैप्पी हैप्पी बिस्कुट',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/पार्ले\s*20-20|पारले\s*20-20|parle\s*20-20|20-20\s*biscuit/i],
    canonicalEnglish: 'Parle 20-20 Biscuit',
    marathiName: 'पार्ले २०-२० बिस्कीट',
    hindiName: 'पारले 20-20 बिस्कुट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/फॅब\s*बॉर्बन|fab\s*bourbon/i],
    canonicalEnglish: 'Parle Fab Bourbon',
    marathiName: 'पार्ले फॅब बॉर्बन',
    hindiName: 'पारले फैब बॉर्बन',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/फॅब\s*व्हॅनिला|fab\s*vanilla/i],
    canonicalEnglish: 'Parle Fab Vanilla Creme',
    marathiName: 'पार्ले फॅब व्हॅनिला क्रीम',
    hindiName: 'पारले फैब वैनिला क्रीम',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मॅजिक्स\s*ऑरेंज|magix\s*orange/i],
    canonicalEnglish: 'Parle Magix Orange',
    marathiName: 'पार्ले मॅजिक्स ऑरेंज',
    hindiName: 'पारले मैजिक्स ऑरेंज',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मॅजिक्स\s*चॉकलेट|magix\s*chocolate/i],
    canonicalEnglish: 'Parle Magix Chocolate',
    marathiName: 'पार्ले मॅजिक्स चॉकलेट',
    hindiName: 'पारले मैजिक्स चॉकलेट',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मॅजिक्स\s*ग्रीन\s*ॲपल|magix\s*green\s*apple/i],
    canonicalEnglish: 'Parle Magix Green Apple',
    marathiName: 'पार्ले मॅजिक्स ग्रीन ॲपल',
    hindiName: 'पारले मैजिक्स ग्रीन एप्पल',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मिलानो|milano/i],
    canonicalEnglish: 'Parle Hide & Seek Milano',
    marathiName: 'पार्ले हाईड अँड सीक मिलानो',
    hindiName: 'पारले हाइड एंड सीक मिलानो',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/युनिबिक|unibic/i],
    canonicalEnglish: 'Unibic Choco Chip Cookies',
    marathiName: 'युनिबिक चोको चिप कुकीज',
    hindiName: 'युनिबिक चोको चिप कुकीज़',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/शेंगदाणा\s*चिक्की|मूंगफली\s*चिक्की|peanut\s*chikki|crushed\s*peanut\s*chikki/i],
    canonicalEnglish: 'Peanut Chikki',
    marathiName: 'शेंगदाणा चिक्की',
    hindiName: 'मूंगफली चिक्की',
    category: 'Sweets/Mithai',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/पीनट\s*बटर\s*बार|peanut\s*butter\s*bar/i],
    canonicalEnglish: 'Peanut Butter Bar',
    marathiName: 'पीनट बटर बार',
    hindiName: 'पीनट बटर बार',
    category: 'Paneer & Butter',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/राम\s*बंधू\s*लोणचे|रामबंधू\s*आंबा\s*लोणचे|ram\s*bandhu\s*mango\s*pickle|mango\s*pickle/i],
    canonicalEnglish: 'Ram Bandhu Mango Pickle',
    marathiName: 'राम बंधू आंबा लोणचे',
    hindiName: 'राम बंधु आम का अचार',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/चकली\s*मसाला|chakli\s*masala/i],
    canonicalEnglish: 'Ram Bandhu Chakli Masala',
    marathiName: 'राम बंधू चकली मसाला',
    hindiName: 'राम बंधु चकली मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/चिवडा\s*मसाला|chivda\s*masala/i],
    canonicalEnglish: 'Ram Bandhu Chivda Masala',
    marathiName: 'राम बंधू चिवडा मसाला',
    hindiName: 'राम बंधु चिवड़ा मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/शेव\s*मसाला|shev\s*masala|sev\s*masala/i],
    canonicalEnglish: 'Ram Bandhu Shev Masala',
    marathiName: 'राम बंधू शेव मसाला',
    hindiName: 'राम बंधु सेव मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/चिकन\s*बिर्याणी|चिकन\s*बिरयानी|chicken\s*biryani\s*(?:mix|masala)?/i],
    canonicalEnglish: 'Ram Bandhu Chicken Biryani Mix',
    marathiName: 'राम बंधू चिकन बिर्याणी मिक्स',
    hindiName: 'राम बंधु चिकन बिरयानी मिक्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मटण\s*बिर्याणी|मटन\s*बिरयानी|mutton\s*biryani\s*(?:mix|masala)?/i],
    canonicalEnglish: 'Ram Bandhu Mutton Biryani Mix',
    marathiName: 'राम बंधू मटण बिर्याणी मिक्स',
    hindiName: 'राम बंधु मटन बिरयानी मिक्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/व्हेज\s*बिर्याणी|वेज\s*बिरयानी|veg\s*biryani\s*(?:mix|masala)?/i],
    canonicalEnglish: 'Ram Bandhu Veg Biryani Mix',
    marathiName: 'राम बंधू व्हेज बिर्याणी मिक्स',
    hindiName: 'राम बंधु वेज बिरयानी मिक्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/चिकन\s*ग्रेव्ही|चिकन\s*ग्रेवी|chicken\s*gravy\s*(?:mix|masala)?/i],
    canonicalEnglish: 'Ram Bandhu Chicken Gravy Mix',
    marathiName: 'राम बंधू चिकन ग्रेव्ही मिक्स',
    hindiName: 'राम बंधु चिकन ग्रेवी मिक्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मटण\s*ग्रेव्ही|मटन\s*ग्रेवी|mutton\s*gravy\s*(?:mix|masala)?/i],
    canonicalEnglish: 'Ram Bandhu Mutton Gravy Mix',
    marathiName: 'राम बंधू मटण ग्रेव्ही मिक्स',
    hindiName: 'राम बंधु मटन ग्रेवी मिक्स',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/शाही\s*पनीर\s*(?:मसाला|मिक्स)|shahi\s*paneer\s*(?:spice\s*)?(?:mix|masala)/i],
    canonicalEnglish: 'Ram Bandhu Shahi Paneer Spice Mix',
    marathiName: 'राम बंधू शाही पनीर मसाला',
    hindiName: 'राम बंधु शाही पनीर मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/पनीर\s*बटर\s*मसाला|paneer\s*butter\s*masala/i],
    canonicalEnglish: 'Ram Bandhu Paneer Butter Masala Mix',
    marathiName: 'राम बंधू पनीर बटर मसाला',
    hindiName: 'राम बंधु पनीर बटर मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/पालक\s*पनीर\s*(?:मसाला|मिक्स)|palak\s*paneer\s*(?:spice\s*)?(?:mix|masala)/i],
    canonicalEnglish: 'Ram Bandhu Palak Paneer Spice Mix',
    marathiName: 'राम बंधू पालक पनीर मसाला',
    hindiName: 'राम बंधु पालक पनीर मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मटर\s*पनीर\s*(?:मसाला|मिक्स)|mutter\s*paneer|matar\s*paneer/i],
    canonicalEnglish: 'Ram Bandhu Mutter Paneer Spice Mix',
    marathiName: 'राम बंधू मटर पनीर मसाला',
    hindiName: 'राम बंधु मटर पनीर मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/सांबर\s*मसाला|सांभर\s*मसाला|sambar\s*masala/i],
    canonicalEnglish: 'Suhana Sambar Masala',
    marathiName: 'सुहाना सांबर मसाला',
    hindiName: 'सुहाना सांभर मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/किचन\s*किंग|kitchen\s*king/i],
    canonicalEnglish: 'Suhana Kitchen King Masala',
    marathiName: 'सुहाना किचन किंग मसाला',
    hindiName: 'सुहाना किचन किंग मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/सुहाना\s*बिर्याणी|suhana\s*biryani/i],
    canonicalEnglish: 'Suhana Biryani Masala',
    marathiName: 'सुहाना बिर्याणी मसाला',
    hindiName: 'सुहाना बिरयानी मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/अंबारी\s*चटपट|ambari\s*chatpat/i],
    canonicalEnglish: 'Suhana Ambari Chatpat Masala',
    marathiName: 'सुहाना अंबारी चटपट मसाला',
    hindiName: 'सुहाना अंबारी चटपट मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/ग्रीन\s*चिली\s*सॉस|green\s*chilli\s*sauce/i],
    canonicalEnglish: 'Temptin Green Chilli Sauce',
    marathiName: 'टेम्प्टिन ग्रीन चिली सॉस',
    hindiName: 'टेम्प्टिन ग्रीन चिली सॉस',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/रेड\s*चिली\s*सॉस|red\s*chilli\s*sauce/i],
    canonicalEnglish: 'Temptin Red Chilli Sauce',
    marathiName: 'टेम्प्टिन रेड चिली सॉस',
    hindiName: 'टेम्प्टिन रेड चिली सॉस',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/टोमॅटो\s*केचप|टोमैटो\s*केचप|tomato\s*ketchup|temptin\s*ketchup/i],
    canonicalEnglish: 'Temptin Tomato Ketchup',
    marathiName: 'टेम्प्टिन टोमॅटो केचप',
    hindiName: 'टेम्प्टिन टोमैटो केचप',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/पिझ्झा\s*(?:अँड|आणि)?\s*पास्ता\s*सॉस|pizza\s*(?:&|and)?\s*pasta\s*sauce/i],
    canonicalEnglish: 'Temptin Pizza & Pasta Sauce',
    marathiName: 'टेम्प्टिन पिझ्झा व पास्ता सॉस',
    hindiName: 'टेम्प्टिन पिज़्ज़ा और पास्ता सॉस',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/शेजवान\s*फ्राईड\s*राईस|schezwan\s*fried\s*rice/i],
    canonicalEnglish: 'Temptin Schezwan Fried Rice Masala',
    marathiName: 'टेम्प्टिन शेजवान फ्राईड राईस मसाला',
    hindiName: 'टेम्प्टिन शेज़वान फ्राइड राइस मसाला',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/शेजवान\s*(?:चटणी|डीप|सॉस)|schezwan\s*(?:dip|spread|chutney|sauce)/i],
    canonicalEnglish: 'Temptin Schezwan Dip & Spread',
    marathiName: 'टेम्प्टिन शेजवान डीप',
    hindiName: 'टेम्प्टिन शेज़वान डिप',
    category: 'Bakery & Extras',
    defaultUnit: 'Piece'
  },
  {
    patterns: [/मॅगी\s*मसाला\s*मॅजिक|मैगी\s*मसाला\s*मैजिक|maggi\s*masala[\s-]*(?:ae[\s-]*)?magic/i],
    canonicalEnglish: 'Maggi Masala-ae-Magic',
    marathiName: 'मॅगी मसाला-ए-मॅजिक',
    hindiName: 'मैगी मसाला-ए-मैजिक',
    category: 'Bakery & Extras',
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
  'नेस्ले': 'Nestle',
  'पार्ले': 'Parle',
  'पतंजली': 'Patanjali',
  'पतंजलि': 'Patanjali',
  'कॅम्पा': 'Campa',
  'कैम्पा': 'Campa',
  'कोला': 'Cola',
  'लेमन': 'Lemon',
  'ऑरेंज': 'Orange',
  'मसाला': 'Masala',
  'मॅगी': 'Maggi',
  'मैगी': 'Maggi',
  'कॉफी': 'Coffee',
  'चहा': 'Tea',
  'चाय': 'Tea',
  'कुरकुरे': 'Kurkure',
  'बालाजी': 'Balaji',
  'बिस्लेरी': 'Bisleri',
  'पाणी': 'Water',
  'पानी': 'Water',
  'कात्रज': 'Katraj',
  'वारणा': 'Warana',
  'प्रभात': 'Prabhat',
  'नंदिनी': 'Nandini',
  'रुपये': 'Rs.',
  'रुपयांचा': 'Rs.',
  'रुपयाचे': 'Rs.',
  'रुपयेवाला': 'Rs.',
  'वाला': ''
};

/**
 * Extracts spoken Indian retail MRP price pack (e.g. "5 rupees", "10 wala", "दहा रुपये", "Rs 10")
 */
function extractSpokenPricePack(text: string): { priceTag: string; marathiTag: string; hindiTag: string } | null {
  const numWordMap: Record<string, string> = {
    'पाच': '5', 'पांच': '5', 'पाँच': '5', 'five': '5',
    'दहा': '10', 'दस': '10', 'ten': '10',
    'पंधरा': '15', 'पंद्रह': '15', 'fifteen': '15',
    'वीस': '20', 'बीस': '20', 'twenty': '20',
    'तीस': '30', 'thirty': '30',
    'चाळीस': '40', 'चालीस': '40', 'forty': '40',
    'पन्नास': '50', 'पचास': '50', 'fifty': '50',
    'शंभर': '100', 'सौ': '100', 'hundred': '100'
  };

  let normalized = text;
  for (const [word, digit] of Object.entries(numWordMap)) {
    normalized = normalized.replace(new RegExp(`(?:^|\\s)${word}(?=\\s*(?:रुपये|रुपया|रुपयांचा|रुपयाचे|रुपयाचा|वाला|rupee|rupees|rs))`, 'gi'), ` ${digit}`);
  }

  const m =
    normalized.match(/(?:rs\.?|₹)\s*(\d{1,4})/i) ||
    normalized.match(/(\d{1,4})\s*(?:rs\.?|rupees?|rupee|wala|walla|रुपये|रुपयांचा|रुपयाचे|रुपयाचा|रुपया|वाला|वालं)/i);

  if (!m) return null;
  const val = m[1];
  return {
    priceTag: `Rs.${val}`,
    marathiTag: `₹${val}`,
    hindiTag: `₹${val}`
  };
}

/**
 * Synchronous Voice Product Processor
 * Instant zero-latency processing of voice transcript.
 */
export function processVoiceTranscriptSync(
  rawTranscript: string,
  _spokenLang: VoiceLanguage = 'mr-IN'
): ProcessedVoiceProduct {
  const cleanInput = applyPhoneticCorrections(normalizeDevanagariNumerals(rawTranscript.trim()));
  if (!cleanInput) {
    return {
      englishName: '',
      marathiName: '',
      hindiName: '',
      matchedRule: false,
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

  // Fallback generic measurement check (Unicode-safe, works for Devanagari & Latin)
  if (!detectedPackSize) {
    const mlMatch = cleanInput.match(/(\d+)\s*(?:मिलीलीटर|मिली|ml)(?=$|[\s,.-])/i);
    if (mlMatch) {
      const mlVal = parseInt(mlMatch[1], 10);
      detectedPackSize = `${mlVal}ml`;
      marathiPackText = `${mlVal} मिली`;
      hindiPackText = `${mlVal} मिली`;
      detectedUnit = mlVal === 500 ? 'Packet (500ml)' : 'Piece';
    } else {
      const litMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:लिटर|लीटर|litre|liter|ltr|l)(?=$|[\s,.-])/i);
      if (litMatch) {
        const litVal = litMatch[1];
        detectedPackSize = `${litVal}L`;
        marathiPackText = `${litVal} लिटर`;
        hindiPackText = `${litVal} लीटर`;
        detectedUnit = litVal === '1' ? 'Packet (1L)' : 'Litre';
      } else {
        const kgMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:किलोग्राम|किलो|केजी|kg|kilo)(?=$|[\s,.-])/i);
        if (kgMatch) {
          detectedPackSize = `${kgMatch[1]}kg`;
          marathiPackText = `${kgMatch[1]} किलो`;
          hindiPackText = `${kgMatch[1]} किलो`;
          detectedUnit = 'Kg';
        } else {
          const gmMatch = cleanInput.match(/(\d+)\s*(?:ग्रॅम|ग्राम|grams|gram|gm|g)(?=$|[\s,.-])/i);
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

  const pricePack = extractSpokenPricePack(cleanInput);

  // 2. Match Trained Product Rules (Exact regex first, then fuzzy token similarity for noisy mobile audio)
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

  // Fuzzy fallback against canonical English names for noisy mobile speech (e.g. "britania borban", "suhana kichan king")
  if (!matchedRule && /[a-zA-Z]{3,}/.test(cleanInput)) {
    const cleanedForFuzzy = cleanInput
      .replace(/(?:rs\.?|₹)\s*\d+|\d+\s*(?:rs\.?|rupees?|wala|ml|l|ltr|kg|g|gm|gram|grams)/gi, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const inputTokens = cleanedForFuzzy.toLowerCase().split(' ').filter((t) => t.length >= 3);

    if (inputTokens.length >= 2) {
      let bestScore = 0;
      let bestCandidate: TrainedProductRule | null = null;
      for (const rule of TRAINED_PRODUCT_RULES) {
        const ruleTokens = rule.canonicalEnglish
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length >= 3);
        if (ruleTokens.length === 0) continue;

        let matchedWeight = 0;
        for (const it of inputTokens) {
          let bestTokenSim = 0;
          for (const rt of ruleTokens) {
            const sim = tokenSimilarity(it, rt);
            if (sim > bestTokenSim) bestTokenSim = sim;
          }
          if (bestTokenSim >= 0.78) {
            matchedWeight += bestTokenSim;
          }
        }
        const coverage = matchedWeight / Math.max(inputTokens.length, ruleTokens.length);
        if (coverage >= 0.72 && coverage > bestScore) {
          bestScore = coverage;
          bestCandidate = rule;
        }
      }
      if (bestCandidate) {
        matchedRule = bestCandidate;
      }
    }
  }

  const detectedBrand = detectBrandFromText(matchedRule ? matchedRule.canonicalEnglish : cleanInput);

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

    if (pricePack && !englishName.toLowerCase().includes(pricePack.priceTag.toLowerCase())) {
      englishName = `${englishName} ${pricePack.priceTag}`;
      marathiName = `${marathiName} ${pricePack.marathiTag}`;
      hindiName = `${hindiName} ${pricePack.hindiTag}`;
    }
  } else {
    // Strip already-extracted measurement/price tokens so fallback name never duplicates them
    let baseText = cleanInput;
    if (detectedPackSize) {
      for (const m of SPOKEN_MEASUREMENTS) {
        if (m.canonical === detectedPackSize) {
          for (const pat of m.patterns) {
            baseText = baseText.replace(pat, ' ');
          }
        }
      }
      baseText = baseText.replace(
        /\d+(?:\.\d+)?\s*(?:मिलीलीटर|मिली|लिटर|लीटर|किलोग्राम|किलो|केजी|ग्रॅम|ग्राम|ml|litre|liter|ltr|l|kg|kilo|grams|gram|gm|g)(?=$|[\s,.-])/gi,
        ' '
      );
    }
    if (pricePack) {
      baseText = baseText
        .replace(/(?:rs\.?|₹)\s*\d{1,4}/gi, ' ')
        .replace(
          /(?:\d{1,4}|पाच|पांच|पाँच|दहा|दस|वीस|बीस|पन्नास|पचास|शंभर|सौ)\s*(?:rs\.?|rupees?|rupee|wala|walla|रुपये|रुपयांचा|रुपयाचे|रुपयाचा|रुपया|वाला|वालं)/gi,
          ' '
        );
    }

    // Translate known Devanagari tokens and phonetically transliterate any remaining Devanagari word to clean English
    const words = baseText.replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const convertedWords = words
      .map((w) => {
        if (DEVANAGARI_WORD_MAP[w] !== undefined) return DEVANAGARI_WORD_MAP[w];
        if (/[\u0900-\u097F]/.test(w)) return transliterateDevanagariWord(w);
        return w;
      })
      .filter(Boolean);

    englishName = convertedWords
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());

    if (detectedPackSize && !englishName.toLowerCase().includes(detectedPackSize.toLowerCase())) {
      englishName = `${englishName} ${detectedPackSize}`.trim();
    }
    if (pricePack && !englishName.toLowerCase().includes(pricePack.priceTag.toLowerCase())) {
      englishName = `${englishName} ${pricePack.priceTag}`.trim();
    }

    // Infer category from English/Devanagari words
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
      lower.includes('kaju') || lower.includes('peda') || lower.includes('pedha') || lower.includes('jamun') ||
      lower.includes('chikki') || lower.includes('sweet') || lower.includes('mithai')
    ) {
      detectedCategory = 'Sweets/Mithai';
    } else {
      detectedCategory = 'Bakery & Extras';
    }

    // Generate authentic translations
    const syncTranslation = translateProductNameSync(englishName);
    marathiName = /[\u0900-\u097F]/.test(cleanInput) ? cleanInput : syncTranslation.marathi || cleanInput;
    hindiName = syncTranslation.hindi || cleanInput;
  }

  return {
    englishName,
    marathiName,
    hindiName,
    detectedCategory,
    detectedUnit,
    packSize: detectedPackSize || undefined,
    detectedBrand,
    matchedRule: Boolean(matchedRule),
    originalTranscript: cleanInput
  };
}

/**
 * Given multiple Web Speech API alternatives (maxAlternatives = 3),
 * picks the best alternative that matches a trained Indian Dairy / FMCG product rule.
 */
export function pickBestVoiceAlternative(
  alternatives: string[],
  spokenLang: VoiceLanguage = 'en-IN'
): ProcessedVoiceProduct {
  const cleaned = alternatives.map((a) => a.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return processVoiceTranscriptSync('', spokenLang);
  }

  let best: ProcessedVoiceProduct | null = null;
  for (const candidate of cleaned) {
    const processed = processVoiceTranscriptSync(candidate, spokenLang);
    if (processed.matchedRule) {
      return processed;
    }
    if (!best) {
      best = processed;
    }
  }
  return best || processVoiceTranscriptSync(cleaned[0], spokenLang);
}

/**
 * Localized, actionable voice recognition error messages (especially for Mobile Chrome/Safari).
 */
export function getVoiceErrorMessage(errorCode: string, uiLang: 'mr' | 'hi' | 'en'): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return uiLang === 'mr'
        ? 'मायक्रोफोन परवानगी बंद आहे. ब्राउझर सेटिंगमध्ये Microphone Allow करा.'
        : uiLang === 'hi'
        ? 'माइक्रोफ़ोन अनुमति बंद है। ब्राउज़र सेटिंग में Microphone Allow करें।'
        : 'Microphone permission denied. Please allow microphone access in browser settings.';
    case 'no-speech':
      return uiLang === 'mr'
        ? 'आवाज ऐकू आला नाही. कृपया मायक्रोफोनजवळ स्पष्ट बोला.'
        : uiLang === 'hi'
        ? 'आवाज़ सुनाई नहीं दी। कृपया माइक के पास स्पष्ट बोलें।'
        : 'No speech detected. Please speak clearly closer to the mic.';
    case 'audio-capture':
      return uiLang === 'mr'
        ? 'मायक्रोफोन उपलब्ध नाही किंवा दुसऱ्या ॲपमध्ये वापरला जात आहे.'
        : uiLang === 'hi'
        ? 'माइक्रोफ़ोन उपलब्ध नहीं है या किसी अन्य ऐप में उपयोग हो रहा है।'
        : 'Microphone unavailable or busy in another app.';
    case 'network':
      return uiLang === 'mr'
        ? 'व्हॉइससाठी इंटरनेट आवश्यक आहे. नेटवर्क तपासा.'
        : uiLang === 'hi'
        ? 'वॉयस के लिए इंटरनेट आवश्यक है। नेटवर्क जांचें।'
        : 'Network error during voice recognition. Check your internet connection.';
    case 'insecure-context':
      return uiLang === 'mr'
        ? 'मोबाईलवर व्हॉइससाठी HTTPS लिंक आवश्यक आहे (किंवा कीबोर्डवरील 🎤 माइक वापरा).'
        : uiLang === 'hi'
        ? 'मोबाइल पर वॉयस के लिए HTTPS ज़रूरी है (या कीबोर्ड का 🎤 माइक उपयोग करें)।'
        : 'Mobile voice requires HTTPS (or use your mobile keyboard 🎤 mic button).';
    case 'unsupported':
      return uiLang === 'mr'
        ? 'या ब्राउझरमध्ये थेट व्हॉइस उपलब्ध नाही. Chrome वापरा किंवा कीबोर्डवरील 🎤 माइक दाबा.'
        : uiLang === 'hi'
        ? 'इस ब्राउज़र में सीधा वॉयस उपलब्ध नहीं है। Chrome उपयोग करें या कीबोर्ड का 🎤 माइक दबाएं।'
        : 'Voice input is not supported in this browser. Use Chrome or your keyboard 🎤 mic.';
    default:
      return uiLang === 'mr'
        ? 'व्हॉइस ओळखता आला नाही. पुन्हा प्रयत्न करा.'
        : uiLang === 'hi'
        ? 'आवाज़ पहचानी नहीं जा सकी। पुनः प्रयास करें।'
        : 'Voice recognition failed. Please tap mic and try again.';
  }
}

export interface MobileVoiceController {
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/**
 * Mobile-hardened Web Speech Recognition launcher.
 * - Uses `continuous = false` on Android/iOS to eliminate Chrome mobile duplication & silent stalls.
 * - Rebuilds results cleanly from `event.results` without `accumulated +=` duplication.
 * - Evaluates `maxAlternatives = 3` against trained Indian Dairy & FMCG rules.
 * - Starts synchronously inside the user tap gesture (required by iOS Safari & Android Chrome).
 */
export function startMobileVoiceRecognition(options: {
  lang: VoiceLanguage;
  uiLang: 'mr' | 'hi' | 'en';
  onStart?: () => void;
  onInterim?: (rawTranscript: string, processed: ProcessedVoiceProduct) => void;
  onFinal?: (rawTranscript: string, processed: ProcessedVoiceProduct) => void;
  onError?: (errorCode: string, message: string) => void;
  onEnd?: () => void;
}): MobileVoiceController | null {
  if (typeof window === 'undefined') return null;

  // Check HTTPS / secure context on mobile devices
  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (window.isSecureContext === false && !isLocalhost) {
    options.onError?.('insecure-context', getVoiceErrorMessage('insecure-context', options.uiLang));
    return null;
  }

  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstanceLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstanceLike;
  };
  const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (!SpeechCtor) {
    options.onError?.('unsupported', getVoiceErrorMessage('unsupported', options.uiLang));
    return null;
  }

  const isMobile = isMobileVoiceDevice();
  const recognition = new SpeechCtor();
  recognition.lang = options.lang;
  // Critical mobile fix: continuous=false prevents Android Chrome repeated-phrase bugs & stalls
  recognition.continuous = !isMobile;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastBestRaw = '';
  let lastBestProcessed: ProcessedVoiceProduct | null = null;
  let hadError = false;
  let finished = false;
  let noSpeechRetries = 0;
  let pendingRetry = false;

  const clearTimers = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const resetSilenceTimer = () => {
    clearTimers();
    // On mobile, let OS VAD end naturally or auto-stop after 3.5s of silence
    silenceTimer = setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }, isMobile ? 3500 : 2500);
  };

  recognition.onstart = () => {
    pendingRetry = false;
    options.onStart?.();
    resetSilenceTimer();
  };

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    resetSilenceTimer();

    // Rebuild full utterance cleanly from results[0..length-1] (NEVER accumulate += from i=0!)
    const primaryParts: string[] = [];
    const alt2Parts: string[] = [];
    const alt3Parts: string[] = [];

    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (!res || res.length === 0) continue;
      const t0 = res[0]?.transcript?.trim();
      if (t0) primaryParts.push(t0);
      const t1 = res[1]?.transcript?.trim() || t0;
      if (t1) alt2Parts.push(t1);
      const t2 = res[2]?.transcript?.trim() || t0;
      if (t2) alt3Parts.push(t2);
    }

    const candidates = [
      dedupeVoiceTranscript(primaryParts.join(' ')),
      dedupeVoiceTranscript(alt2Parts.join(' ')),
      dedupeVoiceTranscript(alt3Parts.join(' '))
    ].filter(Boolean);

    if (candidates.length === 0) return;

    const processed = pickBestVoiceAlternative(candidates, options.lang);
    lastBestRaw = candidates[0];
    lastBestProcessed = processed;
    options.onInterim?.(lastBestRaw, processed);
  };

  recognition.onerror = (event: { error: string }) => {
    clearTimers();
    const code = event?.error || 'unknown';
    // 'aborted' happens when user intentionally taps Stop — don't show error
    if (code === 'aborted') return;
    // Give 1 silent auto-retry on 'no-speech' so mobile users have a comfortable pause before speaking
    if (code === 'no-speech' && !lastBestRaw && noSpeechRetries < 1) {
      noSpeechRetries += 1;
      pendingRetry = true;
      return;
    }
    hadError = true;
    options.onError?.(code, getVoiceErrorMessage(code, options.uiLang));
  };

  recognition.onend = () => {
    clearTimers();
    if (finished) return;

    if (pendingRetry && !hadError && !lastBestRaw) {
      pendingRetry = false;
      try {
        recognition.start();
        return;
      } catch {
        // Fall through to normal end if OS rejects retry
      }
    }

    finished = true;

    if (!hadError && lastBestProcessed && lastBestRaw) {
      options.onFinal?.(lastBestRaw, lastBestProcessed);
    }
    options.onEnd?.();
  };

  try {
    // Must be called synchronously within the user tap event on Android & iOS
    recognition.start();
  } catch {
    clearTimers();
    options.onError?.('audio-capture', getVoiceErrorMessage('audio-capture', options.uiLang));
    return null;
  }

  return {
    stop: () => {
      clearTimers();
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
    abort: () => {
      clearTimers();
      finished = true;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    }
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
