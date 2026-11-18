/**
 * YOGESHWARI DAIRY PRODUCTS - ZERO-DEPENDENCY NATIVE EXCEL (.xlsx) WORKBOOK GENERATOR
 *
 * Generates genuine ISO/IEC 29500 OOXML (.xlsx) files with:
 * - 100% English headers & data (no Marathi/Hindi mixed columns, emojis stripped)
 * - Auto-fitted column widths so no headers or names are truncated
 * - Explicit text storage for Barcodes (never turns into 8.9E+12 scientific notation)
 * - Emerald-styled frozen header row, AutoFilter dropdowns, zebra striping, red-tinted LOW/OUT rows
 * - Live Excel formulas (=ROUND(F5*I5,2), =SUM(...)) with cached values for instant opening
 * - Zero Excel CSV/extension warning banners
 */

import { abbreviateUnitForPDF, stripEmojisForPDF } from './exportUtils';

export interface ExcelInventoryProduct {
  name: string;
  brand?: string;
  category: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  barcode?: string;
}

export interface InventoryExcelOptions {
  products: ExcelInventoryProduct[];
  scopeLabel?: string; // e.g. "Current Stock", "Low Stock Items", "Category: Milk"
  filenamePrefix?: string;
}

const xmlEscape = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const stripXmlControlChars = (input: string): string => {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code === 0x09 || code === 0x0a || code === 0x0d || code >= 0x20) {
      out += input[i];
    }
  }
  return out;
};

const cleanEnglishText = (value: string | undefined | null, fallback = ''): string => {
  const cleaned = stripXmlControlChars(stripEmojisForPDF(value || '')).trim();
  return cleaned || fallback;
};

const formatDateLabel = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hours = date.getHours();
  const mins = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
};

const formatINR = (num: number): string => {
  const rounded = Math.round(num * 100) / 100;
  return rounded.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const colLetter = (indexZeroBased: number): string => {
  let n = indexZeroBased + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
};

const makeInlineStrCell = (ref: string, styleIdx: number, text: string): string => {
  return `<c r="${ref}" s="${styleIdx}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
};

const makeNumberCell = (ref: string, styleIdx: number, num: number): string => {
  const safeNum = Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
  return `<c r="${ref}" s="${styleIdx}" t="n"><v>${safeNum}</v></c>`;
};

const makeFormulaNumberCell = (
  ref: string,
  styleIdx: number,
  formula: string,
  cachedValue: number
): string => {
  const safeVal = Number.isFinite(cachedValue) ? Number(cachedValue.toFixed(2)) : 0;
  return `<c r="${ref}" s="${styleIdx}" t="n"><f>${xmlEscape(formula)}</f><v>${safeVal}</v></c>`;
};

// Standard IEEE 802.3 CRC-32 lookup table for PKWARE ZIP
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const computeCrc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

interface ZipEntryInput {
  name: string;
  content: string;
}

/**
 * Builds a standards-compliant uncompressed (STORE) ZIP archive Uint8Array.
 */
const buildZipArchive = (entries: ZipEntryInput[]): Uint8Array => {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((Math.floor(now.getSeconds() / 2) & 0x1f));
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = computeCrc32(dataBytes);
    const size = dataBytes.length;

    // Local File Header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed (2.0)
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, 0, true); // compression: STORE
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    // Central Directory Header (46 bytes + name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // STORE
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra
    cv.setUint16(32, 0, true); // comment
    cv.setUint16(34, 0, true); // disk start
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, offset, true); // relative offset
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const part of centralParts) {
    centralSize += part.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralStart, true);
  ev.setUint16(20, 0, true);

  const totalBytes = centralStart + centralSize + eocd.length;
  const output = new Uint8Array(totalBytes);
  let cursor = 0;
  for (const p of localParts) {
    output.set(p, cursor);
    cursor += p.length;
  }
  for (const p of centralParts) {
    output.set(p, cursor);
    cursor += p.length;
  }
  output.set(eocd, cursor);

  return output;
};

const buildStylesXml = (): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="#,##0.##"/>
    <numFmt numFmtId="165" formatCode="#,##0.00"/>
    <numFmt numFmtId="166" formatCode="#,##0"/>
  </numFmts>
  <fonts count="7">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF334155"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF065F46"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFDC2626"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF065F46"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF064E3B"/></left>
      <right style="thin"><color rgb="FF064E3B"/></right>
      <top style="thin"><color rgb="FF064E3B"/></top>
      <bottom style="medium"><color rgb="FF064E3B"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="medium"><color rgb="FF065F46"/></top>
      <bottom style="medium"><color rgb="FF065F46"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="26">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Title Banner -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <!-- 2: Subtitle Summary Strip -->
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <!-- 3: Header Left -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <!-- 4: Header Center -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <!-- 5: Header Right -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>

    <!-- Odd Row (White, fill 6): 6=TextLeft, 7=TextCenter, 8=QtyRight, 9=CurrencyRight, 10=BoldCurrencyRight, 11=StatusOK -->
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="4" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>

    <!-- Even Row (Zebra Slate-50, fill 4): 12=TextLeft, 13=TextCenter, 14=QtyRight, 15=CurrencyRight, 16=BoldCurrencyRight, 17=StatusOK -->
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>

    <!-- Low/Out Stock Row (Red-50, fill 5): 18=TextLeft, 19=TextCenter, 20=QtyRight, 21=CurrencyRight, 22=BoldCurrencyRight, 23=StatusLOW -->
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="6" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>

    <!-- Grand Total Row (Emerald-50, fill 3, border 3): 24=TotalLeft, 25=TotalCurrencyRight -->
    <xf numFmtId="0" fontId="4" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="165" fontId="4" fillId="3" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;

/**
 * Generates the binary Uint8Array for an English-only, cleanly arranged Inventory Excel (.xlsx) workbook.
 */
export const buildInventoryExcelBytes = (options: InventoryExcelOptions): Uint8Array => {
  const { products, scopeLabel = 'Current Stock' } = options;
  const now = new Date();
  const generatedLabel = formatDateLabel(now);

  const headers = [
    'Sr. No.',
    'Product Name',
    'Brand',
    'Category',
    'Barcode',
    'Current Stock',
    'Unit',
    'Min Alert',
    'Purchase Rate (Rs)',
    'Selling Rate (Rs)',
    'Cost Value (Rs)',
    'Retail Value (Rs)',
    'Status'
  ];

  const headerAlignStyles = [4, 3, 3, 3, 4, 5, 4, 5, 5, 5, 5, 5, 4];

  // Track max text lengths for crisp auto-fitted Excel column widths
  const maxLengths = headers.map((h) => h.length + 3);
  maxLengths[0] = 9; // Sr. No.
  maxLengths[1] = 26; // Product Name min
  maxLengths[2] = 15; // Brand min
  maxLengths[3] = 17; // Category min
  maxLengths[4] = 18; // Barcode (13-digit EAN fits cleanly without ####)
  maxLengths[5] = 14; // Current Stock
  maxLengths[6] = 9; // Unit
  maxLengths[7] = 11; // Min Alert
  maxLengths[8] = 19; // Purchase Rate (Rs)
  maxLengths[9] = 18; // Selling Rate (Rs)
  maxLengths[10] = 17; // Cost Value (Rs)
  maxLengths[11] = 17; // Retail Value (Rs)
  maxLengths[12] = 13; // Status

  let totalCostVal = 0;
  let totalRetailVal = 0;
  let totalStockQty = 0;
  let lowStockCount = 0;

  const preparedRows = products.map((p, index) => {
    const englishName = cleanEnglishText(p.name, `Product ${index + 1}`);
    const brand = cleanEnglishText(p.brand, 'Generic');
    const category = cleanEnglishText(p.category, 'General');
    const barcode = cleanEnglishText(p.barcode, '-');
    const unit = abbreviateUnitForPDF(cleanEnglishText(p.unit, 'Pc'));
    const stock = Number.isFinite(p.stock_quantity) ? p.stock_quantity : 0;
    const minAlert = Number.isFinite(p.min_stock_alert) ? p.min_stock_alert : 0;
    const purchaseRate = Number.isFinite(p.purchase_price) ? p.purchase_price : 0;
    const sellingRate = Number.isFinite(p.selling_price) ? p.selling_price : 0;
    const costValue = Math.round(stock * purchaseRate * 100) / 100;
    const retailValue = Math.round(stock * sellingRate * 100) / 100;
    const status = stock <= 0 ? 'OUT' : stock <= minAlert ? 'LOW' : 'OK';

    totalCostVal += costValue;
    totalRetailVal += retailValue;
    totalStockQty += stock;
    if (status !== 'OK') lowStockCount++;

    maxLengths[1] = Math.min(44, Math.max(maxLengths[1], englishName.length + 3));
    maxLengths[2] = Math.min(24, Math.max(maxLengths[2], brand.length + 3));
    maxLengths[3] = Math.min(24, Math.max(maxLengths[3], category.length + 3));
    maxLengths[4] = Math.min(22, Math.max(maxLengths[4], barcode.length + 3));

    return {
      srNo: index + 1,
      englishName,
      brand,
      category,
      barcode,
      stock,
      unit,
      minAlert,
      purchaseRate,
      sellingRate,
      costValue,
      retailValue,
      status
    };
  });

  const potentialProfit = Math.round((totalRetailVal - totalCostVal) * 100) / 100;
  const lastCol = colLetter(headers.length - 1); // 'M'

  const colsXml = maxLengths
    .map(
      (width, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`
    )
    .join('');

  const rowsXml: string[] = [];

  const makeMergedTrailingCells = (rowNum: number, styleIdx: number): string => {
    let trailing = '';
    for (let c = 1; c < headers.length; c++) {
      trailing += `<c r="${colLetter(c)}${rowNum}" s="${styleIdx}"/>`;
    }
    return trailing;
  };

  // Row 1: Title Banner (Merged A1:M1)
  rowsXml.push(
    `<row r="1" ht="28" customHeight="1">${makeInlineStrCell(
      'A1',
      1,
      'YOGESHWARI DAIRY PRODUCTS - INVENTORY STOCK & VALUATION REPORT'
    )}${makeMergedTrailingCells(1, 1)}</row>`
  );

  // Row 2: Clean English Summary & Metadata Strip (Merged A2:M2)
  const summaryMetaText =
    `Scope: ${cleanEnglishText(scopeLabel, 'Current Stock')}  |  ` +
    `Total SKUs: ${preparedRows.length}  |  ` +
    `Low/Out Stock: ${lowStockCount}  |  ` +
    `Cost Value: Rs ${formatINR(totalCostVal)}  |  ` +
    `Retail Value: Rs ${formatINR(totalRetailVal)}  |  ` +
    `Potential Profit: Rs ${formatINR(potentialProfit)}  |  ` +
    `Generated: ${generatedLabel}`;
  rowsXml.push(
    `<row r="2" ht="21" customHeight="1">${makeInlineStrCell(
      'A2',
      2,
      summaryMetaText
    )}${makeMergedTrailingCells(2, 2)}</row>`
  );

  // Row 3: Blank visual breathing row
  rowsXml.push(`<row r="3" ht="8" customHeight="1"/>`);

  // Row 4: Styled Header Row (Frozen + AutoFilter)
  const headerCells = headers
    .map((label, cIdx) => makeInlineStrCell(`${colLetter(cIdx)}4`, headerAlignStyles[cIdx], label))
    .join('');
  rowsXml.push(`<row r="4" ht="26" customHeight="1">${headerCells}</row>`);

  // Rows 5..N: Product Data Rows
  const firstDataRow = 5;
  preparedRows.forEach((item, idx) => {
    const r = firstDataRow + idx;
    const isLow = item.status !== 'OK';
    const isEven = idx % 2 === 1;

    // Style index offsets: Odd=6, Even=12, Low/Out=18
    const base = isLow ? 18 : isEven ? 12 : 6;
    const sTextLeft = base;
    const sTextCenter = base + 1;
    const sQtyRight = base + 2;
    const sCurrRight = base + 3;
    const sBoldCurrRight = base + 4;
    const sStatus = base + 5;

    const cells = [
      makeNumberCell(`A${r}`, sTextCenter, item.srNo),
      makeInlineStrCell(`B${r}`, sTextLeft, item.englishName),
      makeInlineStrCell(`C${r}`, sTextLeft, item.brand),
      makeInlineStrCell(`D${r}`, sTextLeft, item.category),
      makeInlineStrCell(`E${r}`, sTextCenter, item.barcode), // Text type prevents 8.9E+12!
      makeNumberCell(`F${r}`, sQtyRight, item.stock),
      makeInlineStrCell(`G${r}`, sTextCenter, item.unit),
      makeNumberCell(`H${r}`, sQtyRight, item.minAlert),
      makeNumberCell(`I${r}`, sCurrRight, item.purchaseRate),
      makeNumberCell(`J${r}`, sCurrRight, item.sellingRate),
      makeFormulaNumberCell(`K${r}`, sBoldCurrRight, `ROUND(F${r}*I${r},2)`, item.costValue),
      makeFormulaNumberCell(`L${r}`, sCurrRight, `ROUND(F${r}*J${r},2)`, item.retailValue),
      makeInlineStrCell(`M${r}`, sStatus, item.status)
    ].join('');

    rowsXml.push(`<row r="${r}" ht="21" customHeight="1">${cells}</row>`);
  });

  // Grand Total Row (with live Excel SUM formulas)
  const lastDataRow = Math.max(firstDataRow, firstDataRow + preparedRows.length - 1);
  const totalRowNum = firstDataRow + preparedRows.length;
  const totalCells = [
    makeInlineStrCell(`A${totalRowNum}`, 24, ''),
    makeInlineStrCell(`B${totalRowNum}`, 24, `GRAND TOTAL (${preparedRows.length} SKUs)`),
    makeInlineStrCell(`C${totalRowNum}`, 24, ''),
    makeInlineStrCell(`D${totalRowNum}`, 24, ''),
    makeInlineStrCell(`E${totalRowNum}`, 24, ''),
    preparedRows.length > 0
      ? makeFormulaNumberCell(`F${totalRowNum}`, 25, `SUM(F${firstDataRow}:F${lastDataRow})`, totalStockQty)
      : makeNumberCell(`F${totalRowNum}`, 25, 0),
    makeInlineStrCell(`G${totalRowNum}`, 24, ''),
    makeInlineStrCell(`H${totalRowNum}`, 24, ''),
    makeInlineStrCell(`I${totalRowNum}`, 24, ''),
    makeInlineStrCell(`J${totalRowNum}`, 24, ''),
    preparedRows.length > 0
      ? makeFormulaNumberCell(`K${totalRowNum}`, 25, `SUM(K${firstDataRow}:K${lastDataRow})`, totalCostVal)
      : makeNumberCell(`K${totalRowNum}`, 25, 0),
    preparedRows.length > 0
      ? makeFormulaNumberCell(`L${totalRowNum}`, 25, `SUM(L${firstDataRow}:L${lastDataRow})`, totalRetailVal)
      : makeNumberCell(`L${totalRowNum}`, 25, 0),
    makeInlineStrCell(`M${totalRowNum}`, 24, lowStockCount > 0 ? `${lowStockCount} LOW` : 'ALL OK')
  ].join('');
  rowsXml.push(`<row r="${totalRowNum}" ht="24" customHeight="1">${totalCells}</row>`);

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr>
    <pageSetUpPr fitToPage="1"/>
  </sheetPr>
  <dimension ref="A1:${lastCol}${totalRowNum}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A5" sqref="A5"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml.join('')}</sheetData>
  <autoFilter ref="A4:${lastCol}${lastDataRow}"/>
  <mergeCells count="2">
    <mergeCell ref="A1:${lastCol}1"/>
    <mergeCell ref="A2:${lastCol}2"/>
  </mergeCells>
  <pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.25" footer="0.25"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Inventory Stock" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return buildZipArchive([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: buildStylesXml() },
    { name: 'xl/worksheets/sheet1.xml', content: sheet1Xml }
  ]);
};

/**
 * Triggers download of a genuine Microsoft Excel (.xlsx) workbook with English-only inventory data.
 */
export const exportInventoryToExcel = (options: InventoryExcelOptions): void => {
  const bytes = buildInventoryExcelBytes(options);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  const prefix = (options.filenamePrefix || 'Yogeshwari_Dairy_Inventory').replace(/[^a-zA-Z0-9_-]/g, '_');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix}_${dateStr}.xlsx`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
