export type SupplierDocType = 'purchase_invoice' | 'product_catalogue';

export interface ExtractedSupplierItem {
  id: string;
  name: string;
  brand: string;
  description?: string;
  hsn: string;
  barcode: string; // Stored as STRING to preserve leading zeros
  hasManufacturerBarcode: boolean;
  generatedCode?: string; // QR / internal Code 128 identifier
  category: string;
  quantity: number;
  unit: string;
  purchase_rate: number;
  selling_rate: number;
  gst_percent: number; // 0, 5, 12, 18
  gst_amount: number;
  total_amount: number;
  batch_no?: string;
  expiry_date?: string;
  mfg_date?: string;
  // Matching & Validation Flags
  isExistingProduct: boolean;
  matchedProductId?: string;
  isDuplicateBarcode: boolean;
  isVerified: boolean;
  notes?: string;
}

export interface SupplierInvoiceMetadata {
  supplier_name: string;
  supplier_gstin?: string;
  supplier_phone?: string;
  invoice_number: string;
  invoice_date: string; // YYYY-MM-DD
  doc_type: SupplierDocType;
  total_invoice_amount: number;
  total_tax_amount: number;
  total_items_count: number;
  raw_pdf_name: string;
  raw_pdf_data_url?: string; // Base64 PDF data for reference
  import_timestamp: string;
}

export interface SupplierImportRecord {
  id: string;
  invoice: SupplierInvoiceMetadata;
  items: ExtractedSupplierItem[];
  status: 'draft' | 'verified' | 'stock_entered' | 'tally_exported';
  stock_entry_date?: string;
  tally_export_date?: string;
  created_at: string;
}

export interface TallyCompanyConfig {
  companyName: string;
  purchaseLedgerName: string;
  cgstLedgerName: string;
  sgstLedgerName: string;
  igstLedgerName: string;
  defaultGodownName: string;
}
