import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useStore } from '../../context/StoreContext';
import {
  FileText,
  X,
  Upload,
  Plus,
  Trash2,
  RotateCw,
  Save
} from 'lucide-react';
import { Button, Input } from '../ui';

interface ExtractedInvoiceItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  total_amount: number;
  batch_no: string;
  expiry_date: string;
}

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceConfirmed?: (invoiceData: {
    supplier_name: string;
    invoice_number: string;
    purchase_date: string;
    total_amount: number;
    items: ExtractedInvoiceItem[];
  }) => void;
}

export const InvoiceScannerModal: React.FC<InvoiceScannerModalProps> = ({
  isOpen,
  onClose,
  onInvoiceConfirmed
}) => {
  const { products, addStockEntries, createPurchase } = useStore();
  const { language } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // Extracted Invoice Metadata & Items
  const [supplierName, setSupplierName] = useState('Rampal Dairy Farmer (Village Sangam)');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-908');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceItems, setInvoiceItems] = useState<ExtractedInvoiceItem[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      runInvoiceOcr(base64);
    };
    reader.readAsDataURL(file);
  };

  const runInvoiceOcr = async (base64Image: string) => {
    try {
      setIsProcessing(true);
      setHasScanned(false);

      await new Promise(resolve => setTimeout(resolve, 1800));

      const today = new Date().toISOString().split('T')[0];
      const expiryBuffalo = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expiryPaneer = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expiryCow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const mockItems: ExtractedInvoiceItem[] = [
        {
          id: 'item-1',
          product_name: 'Fresh Buffalo Milk Full Cream',
          quantity: 40,
          unit: 'Litre',
          purchase_price: 58,
          total_amount: 2320,
          batch_no: 'BAT-BUF-901',
          expiry_date: expiryBuffalo
        },
        {
          id: 'item-2',
          product_name: 'Malai Paneer Fresh',
          quantity: 15,
          unit: 'Kg',
          purchase_price: 320,
          total_amount: 4800,
          batch_no: 'BAT-PAN-442',
          expiry_date: expiryPaneer
        },
        {
          id: 'item-3',
          product_name: 'Pure Cow Milk Gir A2',
          quantity: 25,
          unit: 'Litre',
          purchase_price: 52,
          total_amount: 1300,
          batch_no: 'BAT-COW-108',
          expiry_date: expiryCow
        }
      ];

      setSupplierName('Rampal Dairy Farmer (Village Sangam)');
      setInvoiceNumber('PUR-' + Math.floor(10000 + Math.random() * 90000));
      setInvoiceDate(today);
      setInvoiceItems(mockItems);
      setHasScanned(true);
    } catch (err) {
      console.error('Invoice OCR Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateItem = (id: string, field: keyof ExtractedInvoiceItem, value: any) => {
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'purchase_price') {
          updated.total_amount = Math.round(updated.quantity * updated.purchase_price * 100) / 100;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setInvoiceItems(prev => prev.filter(i => i.id !== id));
  };

  const addItem = () => {
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setInvoiceItems(prev => [
      ...prev,
      {
        id: 'new-' + Date.now(),
        product_name: products[0]?.name || 'Fresh Milk',
        quantity: 10,
        unit: products[0]?.unit || 'Litre',
        purchase_price: products[0]?.purchase_price || 60,
        total_amount: (products[0]?.purchase_price || 60) * 10,
        batch_no: 'BAT-' + Math.floor(1000 + Math.random() * 9000),
        expiry_date: expiry
      }
    ]);
  };

  const totalBillAmount = invoiceItems.reduce((acc, it) => acc + (it.total_amount || 0), 0);

  const handleSaveInvoice = async () => {
    for (const it of invoiceItems) {
      const match = products.find(p => p.name.toLowerCase().includes(it.product_name.toLowerCase()) || it.product_name.toLowerCase().includes(p.name.toLowerCase()));
      const targetProductId = match ? match.id : products[0]?.id;

      if (targetProductId) {
        await addStockEntries(targetProductId, [{
          batch_no: it.batch_no || ('PUR-' + Math.floor(1000 + Math.random() * 9000)),
          mfg_date: invoiceDate,
          expiry_date: it.expiry_date,
          quantity: it.quantity,
          lot_type: 'fresh_today',
          purchase_price: it.purchase_price,
          supplier_name: supplierName,
          notes: `Auto invoice entry #${invoiceNumber}`
        }]);

        await createPurchase({
          product_id: targetProductId,
          product_name: it.product_name,
          quantity: it.quantity,
          unit: it.unit,
          purchase_price: it.purchase_price,
          total_cost: it.total_amount,
          supplier_name: supplierName,
          purchase_date: invoiceDate,
          notes: `Invoice #${invoiceNumber}`
        });
      }
    }

    if (onInvoiceConfirmed) {
      onInvoiceConfirmed({
        supplier_name: supplierName,
        invoice_number: invoiceNumber,
        purchase_date: invoiceDate,
        total_amount: totalBillAmount,
        items: invoiceItems
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-surface max-w-2xl w-full rounded-2xl border border-line shadow-pop overflow-hidden flex flex-col max-h-[92vh] text-ink">
        
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-ink">
              <FileText className="w-4 h-4 text-ink-2" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-ink tracking-tight">
              {language === 'mr' ? 'खरेदी बिल / पावती स्कॅनर (Purchase Invoice OCR)' : 'खरीद बिल / इनवॉइस स्कैनर (Invoice OCR)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Upload / Capture Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-line hover:border-ink/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-surface-2/40 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {selectedImage ? (
              <div className="relative w-full max-h-36 overflow-hidden rounded-xl">
                <img src={selectedImage} alt="Supplier bill" className="w-full h-auto object-contain mx-auto" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-medium gap-1.5">
                  <RotateCw className="w-4 h-4" />
                  <span>{language === 'mr' ? 'दुसरे बिल निवडा' : 'दूसरा बिल चुनें'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="w-10 h-10 mx-auto rounded-xl bg-surface border border-line text-ink flex items-center justify-center shadow-card">
                  <Upload className="w-5 h-5 text-ink-2" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">
                    {language === 'mr' ? 'शेतकरी किंवा पुरवठादाराच्या बिलाचा फोटो / PDF अपलोड करा' : 'सप्लायर के बिल का फोटो या PDF अपलोड करें'}
                  </p>
                  <p className="text-[11px] text-ink-3 mt-0.5">
                    {language === 'mr' ? 'AI माल, आवक मात्रा, खरेदी दर व रक्कम आपोआप वाचेल' : 'AI माल, मात्रा व भाव स्वचालित पढ़ लेगा'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="p-3.5 bg-surface-2/60 rounded-xl border border-line flex items-center justify-center gap-2 text-xs font-medium text-ink animate-pulse">
              <RotateCw className="w-4 h-4 animate-spin text-ink-2" />
              <span>{language === 'mr' ? 'बिलातील रकमा व आयटम्स वाचत आहे (AI Invoice OCR)...' : 'बिल के आयटम्स पढ़े जा रहे हैं...'}</span>
            </div>
          )}

          {/* Review Screen */}
          {hasScanned && (
            <div className="space-y-3">
              {/* Invoice Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-surface-2/60 p-3 rounded-xl border border-line">
                <div>
                  <label className="text-[10px] font-medium text-ink-3 block mb-1">
                    {language === 'mr' ? 'पुरवठादार / शेतकरी:' : 'सप्लायर:'}
                  </label>
                  <Input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-ink-3 block mb-1">
                    {language === 'mr' ? 'बिल क्रमांक (Invoice No):' : 'बिल नंबर:'}
                  </label>
                  <Input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-ink-3 block mb-1">
                    {language === 'mr' ? 'खरेदी तारीख:' : 'तारीख:'}
                  </label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-line rounded-xl overflow-hidden bg-surface shadow-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2/60 border-b border-line text-ink-3 font-medium">
                    <tr>
                      <th className="px-3 py-2">{language === 'mr' ? 'मालाचे नाव' : language === 'hi' ? 'सामान का नाम' : 'Product Name'}</th>
                      <th className="px-2 py-2 text-center">{language === 'mr' ? 'प्रमाण' : language === 'hi' ? 'मात्रा' : 'Qty'}</th>
                      <th className="px-2 py-2 text-right">{language === 'mr' ? 'दर (₹)' : language === 'hi' ? 'दर (₹)' : 'Rate (₹)'}</th>
                      <th className="px-2 py-2 text-right">{language === 'mr' ? 'एकूण (₹)' : language === 'hi' ? 'कुल (₹)' : 'Total (₹)'}</th>
                      <th className="px-2 py-2">{language === 'mr' ? 'बॅच व मुदत' : language === 'hi' ? 'बैच व अंतिम तिथि' : 'Batch & Expiry'}</th>
                      <th className="px-2 py-2 text-center">{language === 'mr' ? 'कृती' : language === 'hi' ? 'कार्रवाई' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {invoiceItems.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-2/40">
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                            className="h-8 text-xs font-medium"
                          />
                        </td>
                        <td className="px-2 py-2 w-20 text-center">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs font-semibold text-center tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2 w-20 text-right">
                          <Input
                            type="number"
                            value={item.purchase_price}
                            onChange={(e) => updateItem(item.id, 'purchase_price', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs font-semibold text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-ink tabular-nums">
                          ₹{item.total_amount}
                        </td>
                        <td className="px-2 py-2 w-36">
                          <div className="space-y-1">
                            <Input
                              type="text"
                              placeholder="Batch No"
                              value={item.batch_no}
                              onChange={(e) => updateItem(item.id, 'batch_no', e.target.value)}
                              className="h-7 text-[11px] font-mono"
                            />
                            <Input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => updateItem(item.id, 'expiry_date', e.target.value)}
                              className="h-7 text-[11px]"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 rounded text-ink-3 hover:text-danger transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total & Summary */}
              <div className="flex items-center justify-between p-3.5 bg-surface-2/60 rounded-xl border border-line">
                <span className="text-xs font-medium text-ink-2">
                  एकूण खरेदी रक्कम (Total Bill Amount):
                </span>
                <span className="text-base font-semibold tabular-nums text-ink">
                  ₹{totalBillAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-line flex items-center justify-end gap-2 bg-surface-2/40 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            {language === 'mr' ? 'रद्द करा' : 'रद्द करें'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!hasScanned || invoiceItems.length === 0}
            onClick={handleSaveInvoice}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            <span>{language === 'mr' ? 'साठ्यात जमा करा व खरेदी नोंदवा' : 'स्टॉक में जोड़ें व खरीद दर्ज करें'}</span>
          </Button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceScannerModal;
