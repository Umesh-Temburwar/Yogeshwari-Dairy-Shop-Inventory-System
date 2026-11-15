function validateEAN13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[12], 10);
}

function findValidGS1InNoisyText(text) {
  if (!text) return null;
  // Common OCR character substitutions
  const clean = text
    .replace(/[B]/g, '8')
    .replace(/[OD]/g, '0')
    .replace(/[Il|!]/g, '1')
    .replace(/[S]/g, '5')
    .replace(/[Z]/g, '2');
  
  const digits = clean.replace(/[^0-9]/g, '');
  console.log('Digits after substitution:', digits);

  // Sliding window of 13 digits (EAN-13)
  for (let i = 0; i <= digits.length - 13; i++) {
    const sub = digits.substring(i, i + 13);
    if (validateEAN13(sub)) {
      return { barcode: sub, format: 'EAN_13' };
    }
  }

  // Fallback: If 13 digits starting with 890 exists (India GS1 prefix)
  const indiaMatch = digits.match(/890\d{10}/);
  if (indiaMatch) {
    return { barcode: indiaMatch[0], format: 'EAN_13_INFERRED' };
  }

  return null;
}

const testNoise = 'T iH HR i\n8 9017191003694 "\n';
console.log('Result on test noise:', findValidGS1InNoisyText(testNoise));
