import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Barcode,
  Printer,
  Download,
  Building2,
  FileSpreadsheet,
  History,
  Trash2,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Info,
  ChevronRight,
  ShieldCheck,
  FileCode2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ExtractedSupplierItem,
  SupplierInvoiceMetadata,
  SupplierImportRecord,
  TallyCompanyConfig
} from './types';
import { parseSupplierPdf } from './pdfParser';
import {
  buildTallyPurchaseVoucherXml,
  buildTallyStockItemMastersXml,
  DEFAULT_TALLY_CONFIG
} from './tallyXmlBuilder';
import {
  generatePrintableLabelsPdf,
  generateCode128DataUrl,
  generateQrCodeDataUrl,
  LabelPrintOptions
} from './barcodeLabelBuilder';
import { supplierImportStorage } from './supplierImportStorage';
import { Product, ProductCategory, ProductUnit } from '../../types';

type TabType = 'upload' | 'verify' | 'labels' | 'stock' | 'tally' | 'history';

export const SupplierPdfImportView: React.FC = () => {
  const { products, addProduct, createPurchase } = useStore();
  const { t, tr } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload & Extraction State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Active Working Invoice & Items
  const [currentRecordId, setCurrentRecordId] = useState<string>('');
  const [metadata, setMetadata] = useState<SupplierInvoiceMetadata>({
    supplier_name: 'Amul Dairy Distributors',
    invoice_number: 'INV-2026-001',
    invoice_date: new Date().toISOString().split('T')[0],
    doc_type: 'purchase_invoice',
    total_invoice_amount: 0,
    total_tax_amount: 0,
    total_items_count: 0,
    raw_pdf_name: '',
    import_timestamp: new Date().toISOString()
  });

  const [items, setItems] = useState<ExtractedSupplierItem[]>([]);
  const [isScannedOcr, setIsScannedOcr] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  // Tally Config State
  const [tallyConfig, setTallyConfig] = useState<TallyCompanyConfig>(DEFAULT_TALLY_CONFIG);
  const [generatedXml, setGeneratedXml] = useState('');

  // Label Generation Options
  const [labelOptions, setLabelOptions] = useState<LabelPrintOptions>({
    codeType: 'BARCODE_128',
    sheetFormat: 'A4_24_LABELS',
    includeShopName: true,
    includeRate: true,
    includeExpiry: true,
    copiesPerItem: 1
  });
  const [sampleLabelPreview, setSampleLabelPreview] = useState<string>('');
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);

  // Stock Confirmation State
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockSuccessMsg, setStockSuccessMsg] = useState('');

  // Import History List
  const [historyList, setHistoryList] = useState<SupplierImportRecord[]>([]);

  // Load history on mount
  useEffect(() => {
    refreshHistory();
  }, []);

  const refreshHistory = () => {
    const list = supplierImportStorage.getAll();
    setHistoryList(list);
  };

  // Duplicate invoice check
  const isDuplicateInvoice = useMemo(() => {
    return supplierImportStorage.isInvoiceDuplicate(
      metadata.supplier_name,
      metadata.invoice_number,
      currentRecordId
    );
  }, [metadata.supplier_name, metadata.invoice_number, currentRecordId]);

  // Update sample label preview whenever items or options change
  useEffect(() => {
    if (items.length > 0) {
      const firstItem = items[0];
      const val = firstItem.barcode || firstItem.generatedCode || 'YDO-SAMPLE-01';
      if (labelOptions.codeType === 'QR_CODE') {
        generateQrCodeDataUrl(val).then(setSampleLabelPreview);
      } else {
        generateCode128DataUrl(val).then(setSampleLabelPreview);
      }
    }
  }, [items, labelOptions.codeType]);

  // Handle PDF file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    await processPdfFile(file);
  };

  const processPdfFile = async (file: File) => {
    setIsProcessing(true);
    setProgressStatus('Reading PDF...');
    setProgressPercent(5);

    try {
      const result = await parseSupplierPdf(file, products, (status, pct) => {
        setProgressStatus(status);
        setProgressPercent(pct);
      });

      const newRecordId = `rec-${Date.now()}`;
      setCurrentRecordId(newRecordId);
      setMetadata(result.metadata);
      setItems(result.items);
      setIsScannedOcr(result.isScannedOcr);

      // Auto save draft to history
      const record: SupplierImportRecord = {
        id: newRecordId,
        invoice: result.metadata,
        items: result.items,
        status: 'draft',
        created_at: new Date().toISOString()
      };
      supplierImportStorage.save(record);
      refreshHistory();

      // Automatically move to verification tab
      setActiveTab('verify');
    } catch (err) {
      console.error('Failed to parse supplier PDF:', err);
      alert('Failed to parse PDF. Please ensure file is a valid PDF invoice or catalogue.');
    } finally {
      setIsProcessing(false);
      setProgressPercent(0);
    }
  };

  // Modify individual item field
  const updateItem = (id: string, field: keyof ExtractedSupplierItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate totals if quantity, rate, or GST changed
        if (field === 'quantity' || field === 'purchase_rate' || field === 'gst_percent') {
          const qty = Number(updated.quantity) || 0;
          const rate = Number(updated.purchase_rate) || 0;
          const gst = Number(updated.gst_percent) || 0;
          const subtotal = Number((qty * rate).toFixed(2));
          updated.gst_amount = Number(((subtotal * gst) / 100).toFixed(2));
          updated.total_amount = Number((subtotal + updated.gst_amount).toFixed(2));
        }
        return updated;
      }
      return item;
    }));
  };

  // Approve all items
  const handleApproveAll = () => {
    setItems(prev => prev.map(i => ({ ...i, isVerified: true })));
  };

  // Add new blank item manually
  const handleAddNewItem = () => {
    const newItemId = `item-${Date.now()}`;
    const generatedCode = `YDO-${String(items.length + 1).padStart(4, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    const newItem: ExtractedSupplierItem = {
      id: newItemId,
      name: '',
      brand: 'Generic',
      description: '',
      hsn: '0401',
      barcode: '',
      hasManufacturerBarcode: false,
      generatedCode,
      category: 'Milk',
      quantity: 1,
      unit: 'Litre',
      purchase_rate: 0,
      selling_rate: 0,
      gst_percent: 0,
      gst_amount: 0,
      total_amount: 0,
      batch_no: `BAT-${new Date().getFullYear()}-${String(items.length + 1).padStart(3, '0')}`,
      expiry_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      isExistingProduct: false,
      isDuplicateBarcode: false,
      isVerified: true
    };
    setItems(prev => [newItem, ...prev]);
  };

  // Remove item
  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Filtered items for verification view
  const filteredItems = useMemo(() => {
    if (!filterSearch.trim()) return items;
    const q = filterSearch.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.barcode.toLowerCase().includes(q) ||
      (i.generatedCode && i.generatedCode.toLowerCase().includes(q)) ||
      i.hsn.toLowerCase().includes(q)
    );
  }, [items, filterSearch]);

  // Totals
  const totalQuantity = useMemo(() => items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0), [items]);
  const totalTaxable = useMemo(() => items.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.purchase_rate) || 0)), 0), [items]);
  const totalGst = useMemo(() => items.reduce((sum, i) => sum + (Number(i.gst_amount) || 0), 0), [items]);
  const grandTotal = useMemo(() => totalTaxable + totalGst, [totalTaxable, totalGst]);

  // Execute Stock Entry & Purchase Inward
  const handleConfirmStockEntry = async () => {
    if (metadata.doc_type === 'product_catalogue') {
      alert('Catalogue Mode is active. Stock inward is disabled for catalogue-only data.');
      return;
    }

    if (items.length === 0) {
      alert('No items to inward.');
      return;
    }

    setIsSavingStock(true);
    setStockSuccessMsg('');

    try {
      let createdCount = 0;

      for (const item of items) {
        let targetProd = products.find(p =>
          (item.barcode && p.barcode === item.barcode) ||
          p.name.toLowerCase() === item.name.toLowerCase()
        );

        // If product does not exist in inventory, create it
        if (!targetProd) {
          const newProd = await addProduct({
            name: item.name,
            brand: item.brand,
            category: (item.category as ProductCategory) || 'Milk',
            unit: (item.unit as ProductUnit) || 'Litre',
            purchase_price: Number(item.purchase_rate) || 0,
            selling_price: Number(item.selling_rate) || Number(item.purchase_rate) * 1.15,
            stock_quantity: 0,
            min_stock_alert: 5,
            barcode: item.barcode || item.generatedCode,
            is_active: true
          });
          targetProd = newProd;
        }

        // Record Purchase & Inward Batch
        await createPurchase({
          product_id: targetProd.id,
          product_name: targetProd.name,
          supplier_name: metadata.supplier_name,
          quantity: Number(item.quantity) || 1,
          unit: item.unit,
          purchase_price: Number(item.purchase_rate) || 0,
          total_amount: Number(item.total_amount) || 0,
          payment_mode: 'Cash',
          purchase_date: metadata.invoice_date,
          invoice_number: metadata.invoice_number,
          batch_no: item.batch_no,
          expiry_date: item.expiry_date,
          notes: `Supplier Invoice Import #${metadata.invoice_number} (HSN: ${item.hsn})`
        });

        createdCount++;
      }

      // Update record status in storage
      if (currentRecordId) {
        supplierImportStorage.updateStatus(currentRecordId, 'stock_entered');
        refreshHistory();
      }

      setStockSuccessMsg(`Successfully created purchase entry and updated stock for ${createdCount} products!`);
    } catch (err) {
      console.error('Error confirming stock entry:', err);
      alert('Failed to complete stock entry. Please check console for details.');
    } finally {
      setIsSavingStock(false);
    }
  };

  // Generate and Download Printable Labels PDF
  const handleDownloadLabelsPdf = async () => {
    if (items.length === 0) return;
    setIsGeneratingLabels(true);
    try {
      const doc = await generatePrintableLabelsPdf(items, labelOptions);
      const fileName = `Labels_${metadata.invoice_number || 'Sheet'}_${labelOptions.sheetFormat}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Failed to generate label PDF:', err);
      alert('Failed to generate printable labels.');
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  // Generate Tally XML
  const handleGenerateTallyXml = () => {
    const xml = buildTallyPurchaseVoucherXml(metadata, items, tallyConfig);
    setGeneratedXml(xml);
  };

  // Download Tally XML file
  const handleDownloadTallyXml = () => {
    const xml = generatedXml || buildTallyPurchaseVoucherXml(metadata, items, tallyConfig);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_Purchase_${metadata.invoice_number || 'Voucher'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (currentRecordId) {
      supplierImportStorage.updateStatus(currentRecordId, 'tally_exported');
      refreshHistory();
    }
  };

  // Download Tally Masters XML
  const handleDownloadTallyMastersXml = () => {
    const xml = buildTallyStockItemMastersXml(items, tallyConfig);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_StockItems_Masters_${metadata.invoice_number || 'List'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load a record from history
  const handleLoadRecord = (record: SupplierImportRecord) => {
    setCurrentRecordId(record.id);
    setMetadata(record.invoice);
    setItems(record.items);
    setActiveTab('verify');
  };

  // Delete a record from history
  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this import record?')) {
      supplierImportStorage.delete(id);
      refreshHistory();
      if (currentRecordId === id) {
        setCurrentRecordId('');
        setItems([]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-3 sm:p-6 transition-colors">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Supplier PDF Import & Tally Stock Entry
                <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  AI + TallyPrime
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                सप्लायर इनव्हॉइस PDF मधून स्टॉक थेट TallyPrime व इन्व्हेंटरीमध्ये जोडा
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-medium rounded-xl text-sm shadow-sm flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New PDF</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'upload', label: '1. PDF Upload', icon: Upload },
            { id: 'verify', label: `2. Review & Verify (${items.length})`, icon: CheckCircle2 },
            { id: 'labels', label: '3. QR & Barcode Labels', icon: QrCode },
            { id: 'stock', label: '4. Stock-In Entry', icon: Layers },
            { id: 'tally', label: '5. TallyPrime XML Export', icon: FileCode2 },
            { id: 'history', label: `6. History (${historyList.length})`, icon: History }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap shadow-sm border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="max-w-7xl mx-auto">
        {/* TAB 1: PDF UPLOAD */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-10 border-2 border-dashed border-slate-300 dark:border-slate-600 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">
                Upload Supplier Invoice or Product Catalogue PDF
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-6">
                Supports digital invoices from suppliers (Amul, Gowardhan, Chitale, Haldiram, etc.) and scanned paper bills via intelligent AI OCR.
              </p>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md inline-flex items-center gap-2 transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing ({progressPercent}%)...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Choose PDF File</span>
                  </>
                )}
              </button>

              {isProcessing && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{progressStatus}</p>
                </div>
              )}
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm mb-1">Dual Mode Safety</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Catalogue Price Lists are kept separate from purchase invoices. Stock is never increased without explicit user confirmation.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-3">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm mb-1">Code 128 & QR Labels</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Instant printable sticker sheets with shop branding. Preserves manufacturer barcodes and auto-generates internal IDs for missing ones.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mb-3">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm mb-1">TallyPrime XML Export</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Standard TallyPrime purchase voucher XML export with party ledger, inventory allocation, batch numbers, and GST.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VERIFICATION & REVIEW */}
        {activeTab === 'verify' && (
          <div className="space-y-4">
            {/* Invoice Metadata Banner */}
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-slate-900 dark:text-white">
                      Invoice Details
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isScannedOcr ? 'Scanned PDF (AI OCR Mode)' : 'Digital Text PDF (Native Parse)'}
                    </p>
                  </div>
                </div>

                {isDuplicateInvoice && (
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-xs px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Notice: An invoice with this number & supplier already exists in records.</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApproveAll}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve All</span>
                  </button>
                  <button
                    onClick={handleAddNewItem}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Editable Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={metadata.supplier_name}
                    onChange={e => setMetadata({ ...metadata, supplier_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={metadata.invoice_number}
                    onChange={e => setMetadata({ ...metadata, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={metadata.invoice_date}
                    onChange={e => setMetadata({ ...metadata, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Document Type</label>
                  <select
                    value={metadata.doc_type}
                    onChange={e => setMetadata({ ...metadata, doc_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                  >
                    <option value="purchase_invoice">Purchase Invoice (Allows Stock-In)</option>
                    <option value="product_catalogue">Product Catalogue (Review Only)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Search Filter & Table Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item, barcode, HSN..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Items: <strong className="text-emerald-600">{items.length}</strong></span>
                <span>Qty: <strong className="text-emerald-600">{totalQuantity}</strong></span>
                <span>Total: <strong className="text-emerald-600">₹{grandTotal.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Extracted Items Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 min-w-[200px]">Product Name & Brand</th>
                      <th className="p-3 min-w-[120px]">Barcode / Code</th>
                      <th className="p-3 w-24">HSN</th>
                      <th className="p-3 w-20">Qty</th>
                      <th className="p-3 w-24">Unit</th>
                      <th className="p-3 w-24">Rate (₹)</th>
                      <th className="p-3 w-20">GST %</th>
                      <th className="p-3 w-24">Total (₹)</th>
                      <th className="p-3 w-28">Batch No</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => updateItem(item.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent font-medium border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded outline-none"
                            placeholder="Product name"
                          />
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400">{item.brand || 'Generic'}</span>
                            {item.isExistingProduct && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 rounded font-semibold">
                                In Inventory
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.barcode || item.generatedCode || ''}
                            onChange={e => updateItem(item.id, 'barcode', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent font-mono text-[11px] border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded outline-none"
                            placeholder="Barcode"
                          />
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {item.hasManufacturerBarcode ? 'Manufacturer' : 'Auto Generated'}
                          </span>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.hsn}
                            onChange={e => updateItem(item.id, 'hsn', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent font-mono text-[11px] border-b border-transparent hover:border-slate-300 focus:border-emerald-500 rounded outline-none"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-1 bg-transparent font-semibold border-b border-transparent hover:border-slate-300 focus:border-emerald-500 rounded outline-none"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.unit}
                            onChange={e => updateItem(item.id, 'unit', e.target.value)}
                            className="w-full px-1 py-1 bg-transparent text-xs border-b border-transparent hover:border-slate-300 rounded outline-none"
                          >
                            <option value="Litre">Litre</option>
                            <option value="Kg">Kg</option>
                            <option value="Packet (500ml)">Pkt (500ml)</option>
                            <option value="Packet (1L)">Pkt (1L)</option>
                            <option value="Piece">Piece</option>
                            <option value="Gram">Gram</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.purchase_rate}
                            onChange={e => updateItem(item.id, 'purchase_rate', Number(e.target.value))}
                            className="w-full px-2 py-1 bg-transparent font-mono font-semibold border-b border-transparent hover:border-slate-300 focus:border-emerald-500 rounded outline-none"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.gst_percent}
                            onChange={e => updateItem(item.id, 'gst_percent', Number(e.target.value))}
                            className="w-full px-1 py-1 bg-transparent text-xs border-b border-transparent hover:border-slate-300 rounded outline-none"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                          </select>
                        </td>
                        <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          ₹{item.total_amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.batch_no || ''}
                            onChange={e => updateItem(item.id, 'batch_no', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent text-[11px] font-mono border-b border-transparent hover:border-slate-300 rounded outline-none"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredItems.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No items found matching the filter.
                </div>
              )}
            </div>

            {/* Bottom Step Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setActiveTab('upload')}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl"
              >
                Back to Upload
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('labels')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Generate Labels</span>
                </button>
                <button
                  onClick={() => setActiveTab('stock')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <span>Proceed to Stock Entry</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QR CODE & BARCODE LABELS */}
        {activeTab === 'labels' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">QR & Barcode Label Printing</h2>
                    <p className="text-xs text-slate-500">
                      Standard Code 128 & QR Code sticker sheets with shop branding
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadLabelsPdf}
                  disabled={isGeneratingLabels || items.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {isGeneratingLabels ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download Printable PDF Sheet</span>
                </button>
              </div>

              {/* Label Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs mb-6">
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Code Type</label>
                  <select
                    value={labelOptions.codeType}
                    onChange={e => setLabelOptions({ ...labelOptions, codeType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    <option value="BARCODE_128">Code 128 (Standard Barcode)</option>
                    <option value="QR_CODE">QR Code (2D Matrix)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-500 mb-1">Sheet Format</label>
                  <select
                    value={labelOptions.sheetFormat}
                    onChange={e => setLabelOptions({ ...labelOptions, sheetFormat: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    <option value="A4_24_LABELS">A4 Sticker Sheet (24 Labels - 3x8)</option>
                    <option value="A4_30_LABELS">A4 Sticker Sheet (30 Labels - 3x10)</option>
                    <option value="THERMAL_50x25">Thermal Roll (50mm x 25mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-500 mb-1">Copies per Product</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={labelOptions.copiesPerItem}
                    onChange={e => setLabelOptions({ ...labelOptions, copiesPerItem: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                  />
                </div>

                <div className="space-y-1.5 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labelOptions.includeRate}
                      onChange={e => setLabelOptions({ ...labelOptions, includeRate: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Print Selling Rate / MRP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labelOptions.includeExpiry}
                      onChange={e => setLabelOptions({ ...labelOptions, includeExpiry: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Print Expiry Date</span>
                  </label>
                </div>
              </div>

              {/* Sample Label Preview Box */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Live Label Preview
                </span>
                <div className="max-w-xs mx-auto bg-white text-slate-900 p-3 rounded-lg border border-slate-300 shadow-sm text-center">
                  <div className="text-[10px] font-bold tracking-tight">YOGESHWARI DAIRY</div>
                  <div className="text-[9px] font-medium text-slate-600 truncate mt-0.5">
                    {items[0]?.name || 'Sample Dairy Item'}
                  </div>
                  {sampleLabelPreview && (
                    <img
                      src={sampleLabelPreview}
                      alt="Sample Barcode"
                      className="mx-auto my-1.5 max-h-12 object-contain"
                    />
                  )}
                  <div className="text-[9px] font-bold text-slate-700">
                    Rate: Rs.{items[0]?.selling_rate || items[0]?.purchase_rate || '50'} | Exp: {items[0]?.expiry_date || '2026-11-25'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STOCK INWARD & PURCHASE CONFIRMATION */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base">Confirm Stock Inward & Purchase Voucher</h2>
                  <p className="text-xs text-slate-500">
                    Creates verified batch records and updates inventory stock balance
                  </p>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Items</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{items.length}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Inward Qty</span>
                  <span className="text-lg font-bold text-emerald-600">{totalQuantity}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Taxable Amount</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">₹{totalTaxable.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Grand Total</span>
                  <span className="text-lg font-bold text-emerald-600">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {stockSuccessMsg && (
                <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{stockSuccessMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('verify')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl"
                >
                  Review Items
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirmStockEntry}
                    disabled={isSavingStock || metadata.doc_type === 'product_catalogue' || items.length === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-md flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {isSavingStock ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating Stock...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Purchase & Update Stock</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('tally')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <FileCode2 className="w-4 h-4" />
                    <span>Export to Tally XML</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TALLYPRIME XML EXPORT */}
        {activeTab === 'tally' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <FileCode2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">TallyPrime XML Voucher Export</h2>
                    <p className="text-xs text-slate-500">
                      Standard XML import for TallyPrime purchase vouchers with batch allocations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadTallyMastersXml}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl"
                  >
                    Export Stock Masters XML
                  </button>
                  <button
                    onClick={handleDownloadTallyXml}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Purchase Voucher XML</span>
                  </button>
                </div>
              </div>

              {/* Tally Configuration Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Company Name in Tally</label>
                  <input
                    type="text"
                    value={tallyConfig.companyName}
                    onChange={e => setTallyConfig({ ...tallyConfig, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Purchase Ledger Name</label>
                  <input
                    type="text"
                    value={tallyConfig.purchaseLedgerName}
                    onChange={e => setTallyConfig({ ...tallyConfig, purchaseLedgerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Default Godown Name</label>
                  <input
                    type="text"
                    value={tallyConfig.defaultGodownName}
                    onChange={e => setTallyConfig({ ...tallyConfig, defaultGodownName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Instructions on how to import into TallyPrime */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-600" />
                  <span>How to Import into Windows TallyPrime</span>
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>Click <strong>Download Purchase Voucher XML</strong> to save the generated file to your computer.</li>
                  <li>Open <strong>TallyPrime</strong> and select your Company (e.g. <em>{tallyConfig.companyName}</em>).</li>
                  <li>Press <strong>Alt + O</strong> (Import) or go to <strong>Gateway of Tally &gt; Import &gt; Transactions</strong>.</li>
                  <li>Choose file format <strong>XML</strong>, select the downloaded XML file, and press Enter.</li>
                  <li>TallyPrime will instantly create the Purchase Voucher with Supplier Ledger, Stock Items, and Batches!</li>
                </ol>
              </div>

              {/* XML Preview Accordion */}
              <div>
                <button
                  onClick={handleGenerateTallyXml}
                  className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 mb-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Preview Generated XML Code</span>
                </button>

                {generatedXml && (
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-64 border border-slate-700">
                    {generatedXml}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: IMPORT HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">Supplier PDF Import History</h2>
                    <p className="text-xs text-slate-500">
                      View previous imports, re-print labels, or re-export Tally XML
                    </p>
                  </div>
                </div>

                <button
                  onClick={refreshHistory}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {historyList.map(record => {
                  const statusColors = {
                    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    verified: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
                    stock_entered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                    tally_exported: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                  };

                  return (
                    <div
                      key={record.id}
                      onClick={() => handleLoadRecord(record)}
                      className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl cursor-pointer transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold">{record.invoice.supplier_name}</strong>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[record.status]}`}>
                            {record.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Inv #{record.invoice.invoice_number} • Date: {record.invoice.invoice_date} • {record.items.length} Items • ₹{record.invoice.total_invoice_amount.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => handleDeleteRecord(record.id, e)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {historyList.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No supplier PDF import records found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
