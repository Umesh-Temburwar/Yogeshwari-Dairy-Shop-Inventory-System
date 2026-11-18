import { ProductCategory, ProductUnit } from '../types';

// Check if browser supports Web Speech API
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

// Detect Android / iOS mobile browsers where continuous=true causes duplicated or dropped transcripts
export function isMobileVoiceDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent || '');
}

export type VoiceLanguage = 'en-IN';

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

const INTENTIONAL_DOUBLED_TOKENS = new Set(['happy', 'hapi', '20', '50', 'yum', 'choco']);

/**
 * Deduplicates consecutive repeated words/phrases that Android Chrome Web Speech API
 * frequently emits (e.g., "Parle G Parle G 50g" -> "Parle G 50g"),
 * while preserving intentional doubled product names like "Happy Happy", "20 20", "50 50".
 */
export function dedupeVoiceTranscript(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  let result = cleaned;
  for (let pass = 0; pass < 2; pass++) {
    result = result.replace(/\b(\S+\s+\S+(?:\s+\S+){0,2})\s+\1\b/giu, '$1');
  }

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
 * Normalizes common Indian-English Speech-to-Text phonetic mishearings
 * for high-frequency Dairy & FMCG barcode products.
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
  [/\bbislery\b|\bbisleri\b/gi, 'Bisleri'],
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

export function stripSpokenFillers(text: string): string {
  return text
    .replace(/^(?:add\s+(?:new\s+)?product|new\s+product|product\s+name|add\s+item|register)\s*[:,-]?\s*/i, '')
    .replace(/^(?:ek|one|1)\s+(?:packet|pack|piece|pcs|bottle|box|pouch)\s+/i, '')
    .replace(/\s+(?:please|plz)$/i, '')
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

export function transliterateDevanagariWord(word: string): string {
  return word;
}

export function normalizeDevanagariNumerals(text: string): string {
  return text;
}

const BRAND_PATTERNS: Array<[RegExp, string]> = [
  [/\bamulya\b/i, 'Amulya'],
  [/\bamul\b/i, 'Amul'],
  [/\bram\s*bandhu\b/i, 'Ram Bandhu'],
  [/\bsuhana\b/i, 'Suhana'],
  [/\btemptin\b/i, 'Temptin'],
  [/\bparle\b/i, 'Parle'],
  [/\bbritannia\b/i, 'Britannia'],
  [/\bcadbury\b|\boreo\b/i, 'Cadbury'],
  [/\bnestle\b|\bmaggi\b|\bkitkat\b|\bnescafe\b/i, 'Nestle'],
  [/\bcampa\b/i, 'Campa'],
  [/\bunibic\b/i, 'Unibic'],
  [/\bkaria'?s\b/i, "Karia's"],
  [/\bpatanjali\b/i, 'Patanjali'],
  [/\bbru\b/i, 'BRU'],
  [/\bchitale\b/i, 'Chitale'],
  [/\bgokul\b/i, 'Gokul'],
  [/\bgowardhan\b|\bgovardhan\b/i, 'Gowardhan'],
  [/\bkatraj\b/i, 'Katraj'],
  [/\bwarana\b/i, 'Warana'],
  [/\bprabhat\b/i, 'Prabhat'],
  [/\bsonai\b/i, 'Sonai'],
  [/\bmahanand\b/i, 'Mahanand'],
  [/\bmother\s*dairy\b/i, 'Mother Dairy'],
  [/\bnandini\b/i, 'Nandini'],
  [/\bhaldiram\b/i, 'Haldiram'],
  [/\bbalaji\b/i, 'Balaji'],
  [/\bsunfeast\b|\byippee\b|\bdark\s*fantasy\b/i, 'Sunfeast'],
  [/\blays\b|\blay's\b|\bkurkure\b|\bsting\b/i, 'PepsiCo'],
  [/\bcoca[\s-]*cola\b|\bthums\s*up\b|\bsprite\b|\bfanta\b|\blimca\b|\bmaaza\b/i, 'Coca-Cola'],
  [/\bfrooti\b|\bappy\s*fizz\b/i, 'Parle Agro'],
  [/\bbisleri\b/i, 'Bisleri'],
  [/\beverest\b/i, 'Everest'],
  [/\bkissan\b/i, 'Kissan'],
  [/\btata\b/i, 'Tata'],
  [/\bhorlicks\b/i, 'Horlicks']
];

export function detectBrandFromText(text: string): string | undefined {
  for (const [pat, brand] of BRAND_PATTERNS) {
    if (pat.test(text)) return brand;
  }
  return undefined;
}

function extractSpokenPricePack(text: string): string | null {
  const m = text.match(/(?:rs\.?|₹)\s*(\d{1,4})|(\d{1,4})\s*(?:rs\.?|rupees?|rupee|wala|pack)/i);
  if (!m) return null;
  const amount = m[1] || m[2];
  return amount ? `Rs.${amount}` : null;
}

export function processVoiceTranscriptSync(
  rawTranscript: string,
  _spokenLang: VoiceLanguage = 'en-IN'
): ProcessedVoiceProduct {
  const cleanInput = applyPhoneticCorrections(rawTranscript.trim());
  if (!cleanInput) {
    return {
      englishName: '',
      marathiName: '',
      hindiName: '',
      matchedRule: false,
      originalTranscript: ''
    };
  }

  let detectedPackSize = '';
  let detectedUnit: ProductUnit | undefined;

  const mlMatch = cleanInput.match(/(\d+)\s*ml(?=$|[\s,.-])/i);
  const litMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l)(?=$|[\s,.-])/i);
  const kgMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*(?:kilogram|kg|kilo)(?=$|[\s,.-])/i);
  const gmMatch = cleanInput.match(/(\d+)\s*(?:grams|gram|gm|g)(?=$|[\s,.-])/i);

  if (mlMatch) {
    const mlVal = parseInt(mlMatch[1], 10);
    detectedPackSize = `${mlVal}ml`;
    detectedUnit = mlVal === 500 ? 'Packet (500ml)' : 'Piece';
  } else if (litMatch) {
    const litVal = litMatch[1];
    detectedPackSize = `${litVal}L`;
    detectedUnit = litVal === '1' ? 'Packet (1L)' : 'Litre';
  } else if (kgMatch) {
    detectedPackSize = `${kgMatch[1]}kg`;
    detectedUnit = 'Kg';
  } else if (gmMatch) {
    detectedPackSize = `${gmMatch[1]}g`;
    detectedUnit = 'Gram';
  }

  const priceTag = extractSpokenPricePack(cleanInput);
  const detectedBrand = detectBrandFromText(cleanInput);

  let baseText = cleanInput;
  if (detectedPackSize) {
    baseText = baseText.replace(
      /\d+(?:\.\d+)?\s*(?:ml|litre|liter|ltr|l|kilogram|kg|kilo|grams|gram|gm|g)(?=$|[\s,.-])/gi,
      ' '
    );
  }
  if (priceTag) {
    baseText = baseText
      .replace(/(?:rs\.?|₹)\s*\d{1,4}/gi, ' ')
      .replace(/\d{1,4}\s*(?:rs\.?|rupees?|rupee|wala)/gi, ' ');
  }

  let englishName = baseText
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());

  if (detectedPackSize && !englishName.toLowerCase().includes(detectedPackSize.toLowerCase())) {
    englishName = `${englishName} ${detectedPackSize}`.trim();
  }
  if (priceTag && !englishName.toLowerCase().includes(priceTag.toLowerCase())) {
    englishName = `${englishName} ${priceTag}`.trim();
  }

  const lower = englishName.toLowerCase();
  let detectedCategory: ProductCategory = 'Bakery & Extras';
  if (lower.includes('milk') || lower.includes('doodh')) {
    detectedCategory = 'Milk';
  } else if (lower.includes('ghee')) {
    detectedCategory = 'Ghee';
  } else if (lower.includes('paneer') || lower.includes('butter') || lower.includes('cheese')) {
    detectedCategory = 'Paneer & Butter';
  } else if (lower.includes('curd') || lower.includes('dahi') || lower.includes('chaas') || lower.includes('buttermilk') || lower.includes('lassi')) {
    detectedCategory = 'Curd & Chaas';
  } else if (
    lower.includes('shrikhand') || lower.includes('basundi') || lower.includes('khawa') ||
    lower.includes('mawa') || lower.includes('kaju') || lower.includes('peda') ||
    lower.includes('jamun') || lower.includes('chikki') || lower.includes('sweet') || lower.includes('mithai')
  ) {
    detectedCategory = 'Sweets/Mithai';
  }

  return {
    englishName,
    marathiName: '',
    hindiName: '',
    detectedCategory,
    detectedUnit,
    packSize: detectedPackSize || undefined,
    detectedBrand,
    matchedRule: Boolean(detectedBrand),
    originalTranscript: cleanInput
  };
}

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
    if (processed.matchedRule) return processed;
    if (!best) best = processed;
  }
  return best || processVoiceTranscriptSync(cleaned[0], spokenLang);
}

export function getVoiceErrorMessage(errorCode: string, _uiLang?: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return isMobileVoiceDevice()
        ? 'Microphone permission blocked. Tap the site settings / lock icon in your browser address bar → Permissions → Microphone → Allow, then tap Mic again.'
        : 'Microphone permission denied. Please allow microphone access in your browser address bar and try again.';
    case 'no-speech':
      return 'No speech detected. Please speak clearly closer to the mic.';
    case 'audio-capture':
      return 'Microphone unavailable or busy in another app.';
    case 'network':
      return 'Network error during voice recognition. Check your internet connection.';
    case 'insecure-context':
      return 'Mobile voice requires HTTPS (or use your mobile keyboard mic button).';
    case 'unsupported':
      return 'Voice input is not supported in this browser. Use Chrome or your keyboard mic.';
    default:
      return 'Voice recognition failed. Please tap mic and try again.';
  }
}

export type MicPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

let cachedMicPermissionGranted = false;

/** Check current microphone permission without triggering a browser prompt */
export async function queryMicrophonePermission(): Promise<MicPermissionState> {
  if (typeof navigator === 'undefined') return 'unsupported';
  try {
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      const status = await navigator.permissions.query({
        name: 'microphone' as PermissionName
      });
      if (status.state === 'granted') {
        cachedMicPermissionGranted = true;
        return 'granted';
      }
      if (status.state === 'denied') {
        cachedMicPermissionGranted = false;
        return 'denied';
      }
      return 'prompt';
    }
  } catch {
    // Safari / older WebViews throw on 'microphone' permission query — fall through to prompt
  }
  return cachedMicPermissionGranted ? 'granted' : 'prompt';
}

// Passively warm the permission flag so already-granted mobile devices start SpeechRecognition synchronously
if (typeof window !== 'undefined') {
  void queryMicrophonePermission();
}

/**
 * Explicitly request microphone permission via getUserMedia({ audio: true }) inside a user tap.
 * On Android Chrome & iOS Safari, this reliably triggers the native OS/browser Microphone popup
 * BEFORE SpeechRecognition starts, then immediately releases the audio track so the mic is free.
 */
export async function ensureMobileMicrophonePermission(): Promise<
  { granted: true } | { granted: false; errorCode: 'not-allowed' | 'audio-capture' | 'insecure-context' }
> {
  if (typeof window === 'undefined') {
    return { granted: false, errorCode: 'audio-capture' };
  }

  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (window.isSecureContext === false && !isLocalhost) {
    return { granted: false, errorCode: 'insecure-context' };
  }

  const current = await queryMicrophonePermission();
  if (current === 'granted') {
    cachedMicPermissionGranted = true;
    return { granted: true };
  }
  if (current === 'denied') {
    cachedMicPermissionGranted = false;
    return { granted: false, errorCode: 'not-allowed' };
  }

  if (!navigator?.mediaDevices?.getUserMedia) {
    // Browser lacks getUserMedia — let SpeechRecognition handle its own prompt
    return { granted: true };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    // Release mic immediately so SpeechRecognition has exclusive audio capture on Android/iOS
    stream.getTracks().forEach((track) => track.stop());
    cachedMicPermissionGranted = true;
    // Brief yield on mobile Android so OS audio hardware finishes releasing the stream
    if (isMobileVoiceDevice()) {
      await new Promise<void>((resolve) => setTimeout(resolve, 120));
    }
    return { granted: true };
  } catch (err: unknown) {
    cachedMicPermissionGranted = false;
    const name = err instanceof Error ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return { granted: false, errorCode: 'not-allowed' };
    }
    if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'AbortError') {
      return { granted: false, errorCode: 'audio-capture' };
    }
    return { granted: false, errorCode: 'not-allowed' };
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

export function startMobileVoiceRecognition(options: {
  lang: VoiceLanguage;
  uiLang?: 'en' | 'hi' | 'mr';
  onStart?: () => void;
  onInterim?: (rawTranscript: string, processed: ProcessedVoiceProduct) => void;
  onFinal?: (rawTranscript: string, processed: ProcessedVoiceProduct) => void;
  onError?: (errorCode: string, message: string) => void;
  onEnd?: () => void;
}): MobileVoiceController | null {
  if (typeof window === 'undefined') return null;

  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (window.isSecureContext === false && !isLocalhost) {
    options.onError?.('insecure-context', getVoiceErrorMessage('insecure-context'));
    return null;
  }

  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstanceLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstanceLike;
  };
  const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (!SpeechCtor) {
    options.onError?.('unsupported', getVoiceErrorMessage('unsupported'));
    return null;
  }

  const isMobile = isMobileVoiceDevice();
  const recognition = new SpeechCtor();
  recognition.lang = 'en-IN';
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

    const processed = pickBestVoiceAlternative(candidates, 'en-IN');
    lastBestRaw = candidates[0];
    lastBestProcessed = processed;
    options.onInterim?.(lastBestRaw, processed);
  };

  recognition.onerror = (event: { error: string }) => {
    clearTimers();
    const code = event?.error || 'unknown';
    if (code === 'aborted') return;
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      cachedMicPermissionGranted = false;
    }
    if (code === 'no-speech' && !lastBestRaw && noSpeechRetries < 1) {
      noSpeechRetries += 1;
      pendingRetry = true;
      return;
    }
    hadError = true;
    options.onError?.(code, getVoiceErrorMessage(code));
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
        // Fall through
      }
    }

    finished = true;

    if (!hadError && lastBestProcessed && lastBestRaw) {
      options.onFinal?.(lastBestRaw, lastBestProcessed);
    }
    options.onEnd?.();
  };

  let recognitionStarted = false;
  let abortedBeforeStart = false;

  const beginRecognition = () => {
    if (abortedBeforeStart || finished) return;
    try {
      recognitionStarted = true;
      recognition.start();
    } catch {
      clearTimers();
      finished = true;
      options.onError?.('audio-capture', getVoiceErrorMessage('audio-capture'));
      options.onEnd?.();
    }
  };

  if (isMobile && !cachedMicPermissionGranted) {
    // Request explicit microphone permission inside the user tap so Android Chrome / iOS Safari
    // reliably displays the native OS/browser Allow Microphone dialog before SpeechRecognition starts.
    void ensureMobileMicrophonePermission().then((perm) => {
      if (abortedBeforeStart || finished) return;
      if (!perm.granted) {
        hadError = true;
        finished = true;
        options.onError?.(perm.errorCode, getVoiceErrorMessage(perm.errorCode));
        options.onEnd?.();
        return;
      }
      beginRecognition();
    });
  } else {
    try {
      recognitionStarted = true;
      recognition.start();
    } catch {
      clearTimers();
      options.onError?.('audio-capture', getVoiceErrorMessage('audio-capture'));
      return null;
    }
  }

  return {
    stop: () => {
      clearTimers();
      if (!recognitionStarted) {
        abortedBeforeStart = true;
        finished = true;
        options.onEnd?.();
        return;
      }
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
    abort: () => {
      clearTimers();
      abortedBeforeStart = true;
      finished = true;
      if (!recognitionStarted) return;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    }
  };
}

export async function processVoiceTranscript(
  rawTranscript: string,
  spokenLang: VoiceLanguage = 'en-IN'
): Promise<ProcessedVoiceProduct> {
  return processVoiceTranscriptSync(rawTranscript, spokenLang);
}
