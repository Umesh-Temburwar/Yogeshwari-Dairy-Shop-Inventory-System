import type { ProductCategory, ProductUnit } from '../types';

export type VoiceCommand = 
  | 'next'
  | 'previous'
  | 'repeat'
  | 'skip'
  | 'stop'
  | 'resume'
  | 'cancel'
  | 'save'
  | 'yes'
  | 'no';

// Devanagari to ASCII digit conversion map
const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

export function normalizeDevanagariDigits(text: string): string {
  return text.replace(/[०-९]/g, d => DEVANAGARI_DIGITS[d] || d);
}

// Spoken Word to Number Table for Marathi, Hindi & English
const WORD_TO_NUMBER: Record<string, number> = {
  // English
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'twenty one': 21, 'twenty two': 22, 'twenty three': 23, 'twenty four': 24, 'twenty five': 25,
  'twenty six': 26, 'twenty seven': 27, 'twenty eight': 28, 'twenty nine': 29, 'thirty': 30,
  'thirty five': 35, 'forty': 40, 'forty five': 45, 'fifty': 50, 'fifty five': 55,
  'fifty eight': 58, 'sixty': 60, 'sixty five': 65, 'seventy': 70, 'seventy five': 75,
  'eighty': 80, 'eighty five': 85, 'ninety': 90, 'hundred': 100, 'one hundred': 100,
  'two hundred': 200, 'two hundred fifty': 250, 'four hundred': 400, 'five hundred': 500,
  'one thousand': 1000, 'thousand': 1000,

  // Marathi / Hindi Numbers
  'शून्य': 0, 'एक': 1, 'दोन': 2, 'दो': 2, 'तीन': 3, 'चार': 4,
  'पाच': 5, 'पांच': 5, 'पाँच': 5, 'सहा': 6, 'छह': 6, 'सात': 7,
  'आठ': 8, 'नऊ': 9, 'नौ': 9, 'दहा': 10, 'दस': 10,
  'अकरा': 11, 'ग्यारह': 11, 'बारा': 12, 'बारह': 12, 'तेरा': 13, 'तेरह': 13,
  'चौदा': 14, 'चौदह': 14, 'पंधरा': 15, 'पंद्रह': 15, 'सोळा': 16, 'सोलह': 16,
  'सतरा': 17, 'सत्रह': 17, 'अठरा': 18, 'अट्ठारह': 18, 'एकोणीस': 19, 'उन्नीस': 19,
  'वीस': 20, 'बीस': 20, 'एकवीस': 21, 'इक्कीस': 21, 'पंचवीस': 25, 'पच्चीस': 25,
  'तीस': 30, 'पस्तीस': 35, 'पैंतीस': 35, 'चाळीस': 40, 'चालीस': 40,
  'पंचेचाळीस': 45, 'पैंतालीस': 45, 'पन्नास': 50, 'पचास': 50,
  'पंचावन्न': 55, 'पचपन': 55, 'अठ्ठावन्न': 58, 'अट्ठावन': 58,
  'साठ': 60, 'पासष्ट': 65, 'पैंसठ': 65, 'सत्तर': 70, 'पंच्याहत्तर': 75, 'पचहत्तर': 75,
  'ऐंशी': 80, 'अस्सी': 80, 'पंच्याऐंशी': 85, 'पचासी': 85, 'नव्वद': 90, 'नब्बे': 90,
  'शंभर': 100, 'सौ': 100, 'एक सौ': 100, 'एकशे': 100,
  'दोनशे': 200, 'दो सौ': 200, 'अडीचशे': 250, 'ढाई सौ': 250,
  'चारशे': 400, 'चार सौ': 400, 'पाचशे': 500, 'पाँच सौ': 500, 'पांच सौ': 500,
  'हजार': 1000, 'एक हजार': 1000,

  // Spoken fractions / fractions terms
  'अर्धा': 0.5, 'आधा': 0.5, 'half': 0.5,
  'पाव': 0.25, 'quarter': 0.25,
  'सव्वा': 1.25, 'दीड': 1.5, 'डेढ़': 1.5, 'अडीच': 2.5, 'ढाई': 2.5
};

/**
 * Parses spoken numbers in Marathi, Hindi, English or digits.
 * Extracts amounts like "fifty eight rupees", "₹58", "58 रुपये", "अठ्ठावन्न".
 */
export function parseSpokenNumber(input: string): number | null {
  if (!input || !input.trim()) return null;
  const normalized = normalizeDevanagariDigits(input.trim().toLowerCase());

  // 1. Direct Regex for numbers: e.g. "58", "58.5", "₹58", "58 rupees", "58rs"
  const digitMatch = normalized.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (digitMatch && digitMatch[1]) {
    const val = parseFloat(digitMatch[1]);
    if (!isNaN(val) && val >= 0) return val;
  }

  // 2. Check compound number phrases like "fifty eight"
  const cleanWords = normalized
    .replace(/[₹.,/\\!?;:()[\]"']/g, ' ')
    .replace(/(rupees|rupee|rs|रुपये|रुपया|रू|litres|litre|liters|liter|लिटर|लीटर|किलो|kg|kilo|ग्रॅम|ग्राम|gram|grams|gm|नग|पीस|होल|बॉटल|पिशवी)/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (WORD_TO_NUMBER[cleanWords] !== undefined) {
    return WORD_TO_NUMBER[cleanWords];
  }

  // 3. Check individual tokens
  const tokens = cleanWords.split(' ');
  let total = 0;
  let matchedAny = false;

  for (let i = 0; i < tokens.length; i++) {
    const twoWord = i < tokens.length - 1 ? `${tokens[i]} ${tokens[i+1]}` : '';
    if (twoWord && WORD_TO_NUMBER[twoWord] !== undefined) {
      total += WORD_TO_NUMBER[twoWord];
      matchedAny = true;
      i++; // skip next
      continue;
    }

    const single = tokens[i];
    if (WORD_TO_NUMBER[single] !== undefined) {
      total += WORD_TO_NUMBER[single];
      matchedAny = true;
    }
  }

  if (matchedAny) return total;

  return null;
}

/**
 * Parses spoken Category and maps strictly to existing ProductCategory options.
 */
export function parseSpokenCategory(input: string): ProductCategory | null {
  if (!input) return null;
  const clean = input.toLowerCase().trim();

  // 1. Milk
  if (/(milk|दूध|doodh|दुध)/i.test(clean)) {
    return 'Milk';
  }

  // 2. Curd & Chaas
  if (/(curd|chaas|dahi|दही|ताक|छाछ|taak|chhas|mattha|मठ्ठा|lassi|लस्सी)/i.test(clean)) {
    return 'Curd & Chaas';
  }

  // 3. Paneer & Butter
  if (/(paneer|butter|पनीर|बटर|लोणी|मक्खन|loni|cheese|चीज)/i.test(clean)) {
    return 'Paneer & Butter';
  }

  // 4. Ghee
  if (/(ghee|तूप|घी|toop|tup)/i.test(clean)) {
    return 'Ghee';
  }

  // 5. Sweets/Mithai
  if (/(sweet|mithai|मिठाई|पेढा|पेड़ा|peda|katli|कतली|jamun|जामुन|khawa|मावा|mawa|khoa|श्रीखंड|shrikhand|बासुंदी|basundi|laddu|लाडू|लड्डू)/i.test(clean)) {
    return 'Sweets/Mithai';
  }

  // 6. Bakery & Extras
  if (/(bakery|toast|khari|bread|biscuit|टोस्ट|खारी|ब्रेड|बिस्कीट|wafers|वेफर्स|नमकीन|namkeen|चॉकलेट|chocolate)/i.test(clean)) {
    return 'Bakery & Extras';
  }

  return null;
}

/**
 * Parses spoken Unit and maps strictly to existing ProductUnit options.
 */
export function parseSpokenUnit(input: string): ProductUnit | null {
  if (!input) return null;
  const clean = input.toLowerCase().trim();

  // Packet 500ml
  if (/(packet\s*500|pouch\s*500|500ml\s*packet|पाचशे\s*मिली\s*(पिशवी|पाकीट)|500\s*ml\s*पिशवी|५००\s*मिली)/i.test(clean)) {
    return 'Packet (500ml)';
  }

  // Packet 1L
  if (/(packet\s*1l|pouch\s*1l|1l\s*packet|एक\s*लिटर\s*(पिशवी|पाकीट)|1\s*लीटर\s*थैली|१\s*लिटर\s*पिशवी)/i.test(clean)) {
    return 'Packet (1L)';
  }

  // Litre
  if (/(litre|liter|लिटर|लीटर|l|ltr)/i.test(clean)) {
    return 'Litre';
  }

  // Kilogram / Kg
  if (/(kg|kilogram|kilo|किलो|किलोग्राम|केजी)/i.test(clean)) {
    return 'Kg';
  }

  // Gram
  if (/(gram|grams|gm|g|ग्रॅम|ग्राम)/i.test(clean)) {
    return 'Gram';
  }

  // Piece
  if (/(piece|pieces|pc|pcs|नग|पीस|संख्या|packet|पॅकेट|पाकीट|box|बॉटल|bottle)/i.test(clean)) {
    return 'Piece';
  }

  return null;
}

/**
 * Parses spoken Barcode digit by digit or string.
 */
export function parseSpokenBarcode(input: string): string | null {
  if (!input) return null;
  const norm = normalizeDevanagariDigits(input);

  // Extract all contiguous digits or single digits
  const digits = norm.replace(/[^0-9]/g, '');
  if (digits.length >= 6) {
    return digits;
  }

  return null;
}

/**
 * Parses global voice commands during session.
 */
export function parseVoiceCommand(input: string): VoiceCommand | null {
  if (!input) return null;
  const clean = input.toLowerCase().trim();

  // Next
  if (/(next|पुढे|पुढील|पुढचे|आगे|अगला)/i.test(clean)) {
    return 'next';
  }

  // Previous
  if (/(previous|back|मागे|मागील|पीछे|पिछला)/i.test(clean)) {
    return 'previous';
  }

  // Repeat
  if (/(repeat|again|पुन्हा|पुन्हा\s*सांगा|फिर\s*से|दोहराएं)/i.test(clean)) {
    return 'repeat';
  }

  // Skip
  if (/(skip|सोडा|पुढचे|छोड़ें|छोडो|स्किप)/i.test(clean)) {
    return 'skip';
  }

  // Stop / Pause
  if (/(stop|pause|थांबा|रुको|रोको|स्टॉप)/i.test(clean)) {
    return 'stop';
  }

  // Resume / Start
  if (/(resume|start|सुरू\s*करा|चालू\s*करा|शुरू\s*करें|रिज्यूम)/i.test(clean)) {
    return 'resume';
  }

  // Cancel
  if (/(cancel|रद्द\s*करा|रद्द|कैंसिल|बंद\s*करा)/i.test(clean)) {
    return 'cancel';
  }

  // Save / Save Product
  if (/(save|save\s*product|सेव्ह|सेव|जतन\s*करा|सेव\s*करें)/i.test(clean)) {
    return 'save';
  }

  // Yes / Confirm
  if (/(yes|confirm|हो|होय|बरोबर|ठीक|हाँ|हा|कन्फर्म|ओके|ok|done)/i.test(clean)) {
    return 'yes';
  }

  // No / Reject
  if (/(no|reject|नाही|नको|नहीं|गलत)/i.test(clean)) {
    return 'no';
  }

  return null;
}
