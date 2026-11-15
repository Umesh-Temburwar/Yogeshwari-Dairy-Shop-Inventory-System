// Test GS1 Checksum and Candidate generation
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

function validateUPCA(code) {
  if (!/^\d{12}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit * 1;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[11], 10);
}

function validateEAN8(code) {
  if (!/^\d{8}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit * 1;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[7], 10);
}

function extractCandidateBarcodeFromText(text) {
  if (!text) return null;
  const digitsOnly = text.replace(/[^0-9]/g, '');
  const ean13Matches = digitsOnly.match(/\d{13}/g);
  if (ean13Matches) {
    for (const match of ean13Matches) {
      if (validateEAN13(match)) return match;
    }
  }
  const upcMatches = digitsOnly.match(/\d{12}/g);
  if (upcMatches) {
    for (const match of upcMatches) {
      if (validateUPCA(match)) return match;
    }
  }
  const ean8Matches = digitsOnly.match(/\d{8}/g);
  if (ean8Matches) {
    for (const match of ean8Matches) {
      if (validateEAN8(match)) return match;
    }
  }
  const indiaMatch = digitsOnly.match(/890\d{10}/);
  if (indiaMatch) return indiaMatch[0];
  return null;
}

// Real Indian FMCG barcodes
const testCases = [
  { name: 'Parle-G Biscuit (130g)', code: '8901719101038', expected: true, type: 'EAN13' },
  { name: 'Amul Taaza Milk', code: '8901262010054', expected: true, type: 'EAN13' },
  { name: 'Maggi 2-Minute Noodles', code: '8901058852899', expected: true, type: 'EAN13' },
  { name: 'Corrupted Checkdigit', code: '8901719101039', expected: false, type: 'EAN13' },
  { name: 'Valid EAN-8', code: '96385074', expected: true, type: 'EAN8' },
  { name: 'Valid UPC-A', code: '012345678905', expected: true, type: 'UPCA' },
];

console.log('--- GS1 Checksum Validation Tests ---');
let passed = 0;
for (const tc of testCases) {
  let res = false;
  if (tc.type === 'EAN13') res = validateEAN13(tc.code);
  else if (tc.type === 'EAN8') res = validateEAN8(tc.code);
  else if (tc.type === 'UPCA') res = validateUPCA(tc.code);

  const ok = res === tc.expected;
  if (ok) passed++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${tc.name} (${tc.code}) -> result: ${res}, expected: ${tc.expected}`);
}

console.log('\n--- OCR String Extraction Tests ---');
const ocrTests = [
  { raw: 'NET WT. 100g \n 8 901719 101038 \n MRP Rs 10', expected: '8901719101038' },
  { raw: 'BARCODE: 8901262010054 BATCH A-12', expected: '8901262010054' },
  { raw: 'INVALID SCRAWL ABC XYZ', expected: null }
];

for (const ot of ocrTests) {
  const extracted = extractCandidateBarcodeFromText(ot.raw);
  const ok = extracted === ot.expected;
  if (ok) passed++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] OCR Raw: "${ot.raw.replace(/\n/g, ' ')}" -> Extracted: ${extracted}`);
}

console.log(`\nTotal Tests: ${testCases.length + ocrTests.length}, Passed: ${passed}`);
if (passed === testCases.length + ocrTests.length) {
  console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
}

module.exports = {
  validateEAN13,
  validateUPCA,
  validateEAN8,
  extractCandidateBarcodeFromText
};
