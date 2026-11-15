const { extractCandidateBarcodeFromText } = require('./test_barcode_ai.cjs');

const raw = 'T iH HR i\n8 9017191003694 "\n';
console.log('Raw text:', JSON.stringify(raw));
console.log('Extracted:', extractCandidateBarcodeFromText(raw));
