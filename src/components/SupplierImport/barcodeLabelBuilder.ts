import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { ExtractedSupplierItem } from './types';

export type LabelCodeType = 'BARCODE_128' | 'QR_CODE';
export type LabelSheetFormat = 'A4_24_LABELS' | 'A4_30_LABELS' | 'THERMAL_50x25';

export interface LabelPrintOptions {
  codeType: LabelCodeType;
  sheetFormat: LabelSheetFormat;
  includeShopName: boolean;
  includeRate: boolean;
  includeExpiry: boolean;
  copiesPerItem: number;
}

/**
 * Generate high-res base64 image of Code 128 barcode
 */
export async function generateCode128DataUrl(value: string): Promise<string> {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 48,
      displayValue: true,
      fontSize: 12,
      font: 'monospace',
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000'
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn(`Failed to generate Code 128 for "${value}", generating fallback barcode:`, err);
    // Fallback simple numeric barcode if value contains special chars
    const cleanNum = value.replace(/[^0-9A-Za-z]/g, '') || '00000000';
    JsBarcode(canvas, cleanNum, {
      format: 'CODE128',
      width: 2,
      height: 48,
      displayValue: true,
      fontSize: 12,
      font: 'monospace',
      margin: 4
    });
    return canvas.toDataURL('image/png');
  }
}

/**
 * Generate high-res base64 image of QR Code
 */
export async function generateQrCodeDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 200,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

/**
 * Generate Printable PDF Label Sheet (A4 or Thermal) using jsPDF
 */
export async function generatePrintableLabelsPdf(
  items: ExtractedSupplierItem[],
  options: LabelPrintOptions
): Promise<jsPDF> {
  // Expand items based on copiesPerItem
  const labelsToPrint: ExtractedSupplierItem[] = [];
  for (const item of items) {
    const count = Math.max(1, options.copiesPerItem || 1);
    for (let c = 0; c < count; c++) {
      labelsToPrint.push(item);
    }
  }

  // Pre-generate image data URLs for all items
  const imageMap = new Map<string, string>();
  for (const item of items) {
    const codeValue = item.barcode || item.generatedCode || 'YDO-001';
    if (!imageMap.has(codeValue)) {
      if (options.codeType === 'QR_CODE') {
        const qrData = await generateQrCodeDataUrl(codeValue);
        imageMap.set(codeValue, qrData);
      } else {
        const barData = await generateCode128DataUrl(codeValue);
        imageMap.set(codeValue, barData);
      }
    }
  }

  if (options.sheetFormat === 'THERMAL_50x25') {
    // 50mm x 25mm Thermal Label (1 label per page)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [50, 25]
    });

    for (let i = 0; i < labelsToPrint.length; i++) {
      if (i > 0) doc.addPage([50, 25], 'landscape');
      const item = labelsToPrint[i];
      const codeValue = item.barcode || item.generatedCode || 'YDO-001';
      const imgData = imageMap.get(codeValue);

      // Shop Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('YOGESHWARI DAIRY', 25, 3.5, { align: 'center' });

      // Product Name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      const shortName = item.name.length > 28 ? item.name.substring(0, 26) + '..' : item.name;
      doc.text(shortName, 25, 6.5, { align: 'center' });

      // Image
      if (imgData) {
        if (options.codeType === 'QR_CODE') {
          doc.addImage(imgData, 'PNG', 18, 7.5, 14, 14);
        } else {
          doc.addImage(imgData, 'PNG', 4, 7.5, 42, 12);
        }
      }

      // Details footer: MRP & Expiry
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      let footerText = `MRP: Rs.${item.selling_rate || item.purchase_rate}`;
      if (options.includeExpiry && item.expiry_date) {
        footerText += ` | Exp: ${item.expiry_date}`;
      }
      doc.text(footerText, 25, 23, { align: 'center' });
    }

    return doc;
  }

  // Standard A4 Layout: 24 labels (3 cols x 8 rows) or 30 labels (3 cols x 10 rows)
  const is30 = options.sheetFormat === 'A4_30_LABELS';
  const cols = 3;
  const rows = is30 ? 10 : 8;
  const labelsPerPage = cols * rows;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4' // 210mm x 297mm
  });

  const leftMargin = 7;
  const topMargin = 9;
  const labelWidth = (210 - leftMargin * 2) / cols; // ~65.3mm
  const labelHeight = (297 - topMargin * 2) / rows; // ~34.8mm or 27.9mm

  for (let i = 0; i < labelsToPrint.length; i++) {
    const pageIndex = Math.floor(i / labelsPerPage);
    const indexOnPage = i % labelsPerPage;

    if (i > 0 && indexOnPage === 0) {
      doc.addPage();
    }

    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);

    const x = leftMargin + col * labelWidth;
    const y = topMargin + row * labelHeight;

    // Outer label border (light gray for scissor cut guide)
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.rect(x + 1, y + 1, labelWidth - 2, labelHeight - 2);

    const centerX = x + labelWidth / 2;
    const item = labelsToPrint[i];
    const codeValue = item.barcode || item.generatedCode || 'YDO-001';
    const imgData = imageMap.get(codeValue);

    // Shop Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 20);
    doc.text('YOGESHWARI DAIRY', centerX, y + 4.5, { align: 'center' });

    // Product Title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const displayName = item.name.length > 32 ? item.name.substring(0, 30) + '...' : item.name;
    doc.text(displayName, centerX, y + 8, { align: 'center' });

    // Barcode / QR Code Image
    if (imgData) {
      if (options.codeType === 'QR_CODE') {
        const qrSize = Math.min(16, labelHeight - 16);
        doc.addImage(imgData, 'PNG', centerX - qrSize / 2, y + 9.5, qrSize, qrSize);
        doc.setFont('monospace', 'bold');
        doc.setFontSize(5.5);
        doc.text(codeValue, centerX, y + 10 + qrSize + 2, { align: 'center' });
      } else {
        const barW = labelWidth - 10;
        const barH = labelHeight - 16;
        doc.addImage(imgData, 'PNG', x + 5, y + 9, barW, barH);
      }
    }

    // Price and Details Footer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    let bottomText = `Rate: Rs.${item.selling_rate || item.purchase_rate}`;
    if (options.includeExpiry && item.expiry_date) {
      bottomText += ` | Exp: ${item.expiry_date}`;
    }
    doc.text(bottomText, centerX, y + labelHeight - 2.5, { align: 'center' });
  }

  return doc;
}
