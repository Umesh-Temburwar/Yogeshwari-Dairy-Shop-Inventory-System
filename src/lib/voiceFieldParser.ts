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

export function normalizeDevanagariDigits(text: string): string {
  return text;
}

// Spoken English Word to Number Table
const WORD_TO_NUMBER: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  'twenty one': 21, 'twenty two': 22, 'twenty three': 23, 'twenty four': 24, 'twenty five': 25,
  'twenty six': 26, 'twenty seven': 27, 'twenty eight': 28, 'twenty nine': 29, thirty: 30,
  'thirty five': 35, forty: 40, 'forty five': 45, fifty: 50, 'fifty five': 55,
  'fifty eight': 58, sixty: 60, 'sixty five': 65, seventy: 70, 'seventy five': 75,
  eighty: 80, 'eighty five': 85, ninety: 90, hundred: 100, 'one hundred': 100,
  'two hundred': 200, 'two hundred fifty': 250, 'four hundred': 400, 'five hundred': 500,
  'one thousand': 1000, thousand: 1000,
  half: 0.5, quarter: 0.25
};

/**
 * Parses spoken numbers in English or digits (e.g. "fifty eight rupees", "₹58", "58").
 */
export function parseSpokenNumber(input: string): number | null {
  if (!input || !input.trim()) return null;
  const normalized = input.trim().toLowerCase();

  const digitMatch = normalized.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (digitMatch && digitMatch[1]) {
    const val = parseFloat(digitMatch[1]);
    if (!isNaN(val) && val >= 0) return val;
  }

  const cleanWords = normalized
    .replace(/[₹.,/\\!?;:()[\]"']/g, ' ')
    .replace(/\b(rupees|rupee|rs|litres|litre|liters|liter|kg|kilo|gram|grams|gm|piece|pieces|bottle|packet)\b/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (WORD_TO_NUMBER[cleanWords] !== undefined) {
    return WORD_TO_NUMBER[cleanWords];
  }

  const tokens = cleanWords.split(' ');
  let total = 0;
  let matchedAny = false;

  for (let i = 0; i < tokens.length; i++) {
    const twoWord = i < tokens.length - 1 ? `${tokens[i]} ${tokens[i + 1]}` : '';
    if (twoWord && WORD_TO_NUMBER[twoWord] !== undefined) {
      total += WORD_TO_NUMBER[twoWord];
      matchedAny = true;
      i++;
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

  if (/(milk|doodh)/i.test(clean)) return 'Milk';
  if (/(curd|chaas|dahi|taak|chhas|mattha|lassi|buttermilk)/i.test(clean)) return 'Curd & Chaas';
  if (/(paneer|butter|loni|cheese)/i.test(clean)) return 'Paneer & Butter';
  if (/(ghee|toop|tup)/i.test(clean)) return 'Ghee';
  if (/(sweet|mithai|peda|katli|jamun|khawa|mawa|khoa|shrikhand|basundi|laddu|ladoo)/i.test(clean)) {
    return 'Sweets/Mithai';
  }
  if (/(bakery|toast|khari|bread|biscuit|wafers|namkeen|chocolate|snack)/i.test(clean)) {
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

  if (/(packet\s*500|pouch\s*500|500ml\s*packet)/i.test(clean)) return 'Packet (500ml)';
  if (/(packet\s*1l|pouch\s*1l|1l\s*packet)/i.test(clean)) return 'Packet (1L)';
  if (/\b(litre|liter|l|ltr)\b/i.test(clean)) return 'Litre';
  if (/\b(kg|kilogram|kilo)\b/i.test(clean)) return 'Kg';
  if (/\b(gram|grams|gm|g)\b/i.test(clean)) return 'Gram';
  if (/(piece|pieces|pc|pcs|packet|box|bottle)/i.test(clean)) return 'Piece';

  return null;
}

/**
 * Parses spoken Barcode digits.
 */
export function parseSpokenBarcode(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/[^0-9]/g, '');
  if (digits.length >= 6) return digits;
  return null;
}

/**
 * Parses global English voice commands during session.
 */
export function parseVoiceCommand(input: string): VoiceCommand | null {
  if (!input) return null;
  const clean = input.toLowerCase().trim();

  if (/\bnext\b/i.test(clean)) return 'next';
  if (/\b(previous|back)\b/i.test(clean)) return 'previous';
  if (/\b(repeat|again)\b/i.test(clean)) return 'repeat';
  if (/\bskip\b/i.test(clean)) return 'skip';
  if (/\b(stop|pause)\b/i.test(clean)) return 'stop';
  if (/\b(resume|start)\b/i.test(clean)) return 'resume';
  if (/\bcancel\b/i.test(clean)) return 'cancel';
  if (/\b(save|save\s*product)\b/i.test(clean)) return 'save';
  if (/\b(yes|confirm|ok|done)\b/i.test(clean)) return 'yes';
  if (/\b(no|reject)\b/i.test(clean)) return 'no';

  return null;
}
