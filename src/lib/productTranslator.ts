/**
 * English-only product name normalizer.
 * Legacy translation exports are preserved as no-op pass-throughs for API compatibility.
 */

export function toDevanagariDigits(str: string): string {
  return str;
}

export function phoneticTransliterate(word: string, _isMarathi: boolean = true): string {
  return word.trim();
}

export function translateProductNameSync(_englishName: string): { marathi: string; hindi: string } {
  return { marathi: '', hindi: '' };
}

export async function translateProductName(
  _englishName: string
): Promise<{ marathi: string; hindi: string }> {
  return { marathi: '', hindi: '' };
}
