import { ExtractedSupplierItem, SupplierInvoiceMetadata, TallyCompanyConfig } from './types';

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format YYYY-MM-DD to Tally's YYYYMMDD format
 */
function formatTallyDate(dateStr: string): string {
  if (!dateStr) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  return dateStr.replace(/[^0-9]/g, '');
}

/**
 * Map application unit to standard Tally unit symbol
 */
function mapTallyUnit(appUnit: string): string {
  const lower = (appUnit || '').toLowerCase();
  if (lower.includes('litre') || lower.includes('ltr')) return 'Ltr';
  if (lower.includes('kg') || lower.includes('kilo')) return 'Kgs';
  if (lower.includes('packet') || lower.includes('pkt')) return 'Pkt';
  if (lower.includes('piece') || lower.includes('pcs')) return 'Nos';
  if (lower.includes('gram') || lower.includes('gm')) return 'Gms';
  return 'Nos';
}

export const DEFAULT_TALLY_CONFIG: TallyCompanyConfig = {
  companyName: 'YOGESHWARI DAIRY',
  purchaseLedgerName: 'Purchase Account',
  cgstLedgerName: 'Input CGST',
  sgstLedgerName: 'Input SGST',
  igstLedgerName: 'Input IGST',
  defaultGodownName: 'Main Location'
};

/**
 * Build valid, production-ready TallyPrime Purchase Voucher XML
 */
export function buildTallyPurchaseVoucherXml(
  invoice: SupplierInvoiceMetadata,
  items: ExtractedSupplierItem[],
  config: TallyCompanyConfig = DEFAULT_TALLY_CONFIG
): string {
  const tallyDate = formatTallyDate(invoice.invoice_date);
  const supplierName = escapeXml(invoice.supplier_name || 'Dairy Supplier');
  const invoiceNumber = escapeXml(invoice.invoice_number || 'INV-001');
  const companyName = escapeXml(config.companyName);
  const purchaseLedger = escapeXml(config.purchaseLedgerName);
  const godownName = escapeXml(config.defaultGodownName);

  let totalTaxableAmount = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;

  // Build Inventory Allocation entries for each item
  const inventoryXml = items.map(item => {
    const itemName = escapeXml(item.name);
    const tallyUnit = mapTallyUnit(item.unit);
    const qty = item.quantity;
    const rate = item.purchase_rate;
    const taxableAmount = Number((qty * rate).toFixed(2));
    totalTaxableAmount += taxableAmount;

    // GST calculation
    const gstRate = item.gst_percent || 0;
    const gstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
    const cgst = Number((gstAmount / 2).toFixed(2));
    const sgst = Number((gstAmount / 2).toFixed(2));
    totalCgstAmount += cgst;
    totalSgstAmount += sgst;

    const batchName = escapeXml(item.batch_no || 'Primary Batch');
    const tallyAmount = (-taxableAmount).toFixed(2); // In Tally XML, inward inventory debits are represented with negative amount

    return `
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${itemName}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <RATE>${rate.toFixed(2)}/${tallyUnit}</RATE>
              <AMOUNT>${tallyAmount}</AMOUNT>
              <ACTUALQTY> ${qty} ${tallyUnit}</ACTUALQTY>
              <BILLEDQTY> ${qty} ${tallyUnit}</BILLEDQTY>
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>${godownName}</GODOWNNAME>
                <BATCHNAME>${batchName}</BATCHNAME>
                <AMOUNT>${tallyAmount}</AMOUNT>
                <ACTUALQTY> ${qty} ${tallyUnit}</ACTUALQTY>
                <BILLEDQTY> ${qty} ${tallyUnit}</BILLEDQTY>
              </BATCHALLOCATIONS.LIST>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${purchaseLedger}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                <AMOUNT>${tallyAmount}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>`;
  }).join('');

  const grandTotal = Number((totalTaxableAmount + totalCgstAmount + totalSgstAmount).toFixed(2));

  // Build Tax Ledgers
  let taxLedgersXml = '';
  if (totalCgstAmount > 0) {
    taxLedgersXml += `
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(config.cgstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${(-totalCgstAmount).toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`;
  }
  if (totalSgstAmount > 0) {
    taxLedgersXml += `
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(config.sgstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${(-totalSgstAmount).toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`;
  }

  // Tally Envelope
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${tallyDate}</DATE>
            <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <REFERENCE>${invoiceNumber}</REFERENCE>
            <VOUCHERNUMBER>${invoiceNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${supplierName}</PARTYLEDGERNAME>
            <PARTYNAME>${supplierName}</PARTYNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <!-- Supplier Creditor Ledger Entry -->
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${supplierName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${grandTotal.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <!-- Tax Ledger Entries (Debit) -->${taxLedgersXml}
            <!-- Stock Item Inward Entries -->${inventoryXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  return xml.trim();
}

/**
 * Generate Tally Stock Item Masters XML (for pre-creating items in TallyPrime if needed)
 */
export function buildTallyStockItemMastersXml(
  items: ExtractedSupplierItem[],
  config: TallyCompanyConfig = DEFAULT_TALLY_CONFIG
): string {
  const companyName = escapeXml(config.companyName);

  const stockItemsXml = items.map(item => {
    const itemName = escapeXml(item.name);
    const unitName = mapTallyUnit(item.unit);
    const hsn = escapeXml(item.hsn || '');
    const gstRate = item.gst_percent || 0;

    return `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="${itemName}" ACTION="Create">
            <NAME>${itemName}</NAME>
            <BASEUNITS>${unitName}</BASEUNITS>
            <ISBATCHWISEON>Yes</ISBATCHWISEON>
            <ISPERISHABLEON>Yes</ISPERISHABLEON>
            <GSTAPPLICABLE>&#4; Applicable</GSTAPPLICABLE>
            <HSNCODE>${hsn}</HSNCODE>
            <GSTRATE>${gstRate}</GSTRATE>
          </STOCKITEM>
        </TALLYMESSAGE>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>${stockItemsXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();
}
