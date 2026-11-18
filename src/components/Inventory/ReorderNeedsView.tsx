import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  AlertTriangle,
  Printer,
  Copy,
  Check,
  Truck,
  CheckCircle2,
  FileText,
  Download,
  TrendingUp,
  Sparkles,
  RotateCcw,
  Eye
} from 'lucide-react';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { computeExpiryStatus } from '../../lib/shelfLifeUtils';
import { CompactPageHeader, CompactStatStrip } from '../Common/CompactPageHeader';

export const ReorderNeedsView: React.FC = () => {
  const { products, batches, sales, returns, supplierReturns, metrics, setActiveView } = useStore();
  const { t, language, tr } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Train & Analyze inventory based on sales velocity, customer returns, supplier defects, and shelf life
  const itemsNeedingRestock = useMemo(() => {
    // Pre-aggregate metrics in O(N) Map lookups to eliminate quadratic nested loops
    const salesByProduct = new Map<string, number>();
    sales.forEach(s => {
      s.items?.forEach(it => {
        salesByProduct.set(it.product_id, (salesByProduct.get(it.product_id) || 0) + it.quantity);
      });
    });

    const returnsByProduct = new Map<string, number>();
    returns.forEach(r => {
      returnsByProduct.set(r.product_id, (returnsByProduct.get(r.product_id) || 0) + r.quantity);
    });

    const supplierReturnsByProduct = new Map<string, { qty: number; pendingRefund: number }>();
    supplierReturns.forEach(sr => {
      const curr = supplierReturnsByProduct.get(sr.product_id) || { qty: 0, pendingRefund: 0 };
      curr.qty += sr.quantity;
      if (sr.refund_status === 'Pending') {
        curr.pendingRefund += sr.total_refund_amount;
      }
      supplierReturnsByProduct.set(sr.product_id, curr);
    });

    const nearExpiryProducts = new Set<string>();
    batches.forEach(b => {
      if (b.qty_remaining > 0 && ['EXPIRING_TODAY', 'EXPIRING_TOMORROW'].includes(computeExpiryStatus(b.expiry_date).status)) {
        nearExpiryProducts.add(b.product_id);
      }
    });

    // Only actual shop products (in-stock or active store items) with stock <= min_stock_alert
    return products
      .filter(p => {
        const isTrackedShopProduct = p.stock_quantity > 0 || (salesByProduct.get(p.id) || 0) > 0 || p.source === 'SHOP';
        return isTrackedShopProduct && p.stock_quantity <= p.min_stock_alert;
      })
      .map(p => {
        // Fast O(1) lookups
        const totalSold = salesByProduct.get(p.id) || 0;
        const totalReturned = returnsByProduct.get(p.id) || 0;
        const supplierInfo = supplierReturnsByProduct.get(p.id);
        const vendorReturnedQty = supplierInfo?.qty || 0;
        const vendorPendingRefund = supplierInfo?.pendingRefund || 0;
        const hasNearExpiryBatch = nearExpiryProducts.has(p.id);

        // Dynamic demand-trained reorder recommendation
        const demandBuffer = totalSold > 0 ? Math.max(p.min_stock_alert * 1.5, totalSold * 1.2) : p.min_stock_alert * 2.5;
        const recommendedOrderQty = Math.max(
          p.min_stock_alert,
          Number((demandBuffer - p.stock_quantity).toFixed(1))
        );
        const estimatedCost = Number((recommendedOrderQty * p.purchase_price).toFixed(2));

        return {
          ...p,
          recommendedOrderQty,
          estimatedCost,
          isCritical: p.stock_quantity <= 0,
          totalSold,
          totalReturned,
          vendorReturnedQty,
          vendorPendingRefund,
          hasNearExpiryBatch,
          isFastMover: totalSold >= (p.min_stock_alert * 2)
        };
      })
      .sort((a, b) => (a.isCritical === b.isCritical ? 0 : a.isCritical ? -1 : 1));
  }, [products, batches, sales, returns, supplierReturns]);

  const totalEstimatedCost = itemsNeedingRestock.reduce((acc, it) => acc + it.estimatedCost, 0);

  const getDisplayName = (it: any) => {
    if (language === 'mr' && it.marathi_name) return it.marathi_name;
    if (language === 'hi' && it.hindi_name) return it.hindi_name;
    return it.name;
  };

  // Copy WhatsApp format procurement list based on active language
  const handleCopyWhatsAppList = () => {
    const locale = 'en-IN';
    const dateStr = new Date().toLocaleDateString(locale);

    let text = `🥛 *Yogeshwari Dairy Farm - Reorder Requirement Sheet* 🥛\nDate: ${dateStr}\n\n`;
    itemsNeedingRestock.forEach((it, idx) => {
      text += `${idx + 1}. *${it.name}*\n   👉 Reorder Quantity: *${it.recommendedOrderQty} ${it.unit}* (Current Stock: ${it.stock_quantity})\n\n`;
    });
    text += `Total Estimated Cost: ₹${totalEstimatedCost.toLocaleString('en-IN')}\nPlease deliver as early as possible. Thank you!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getReorderPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: 'Procurement & Reorder Requirements Sheet',
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: 'Immediate Restock Requirements',
      language,
      kpis: [
        { label: 'Total Items Needed', value: `${itemsNeedingRestock.length}`, color: 'rose' },
        { label: 'Out of Stock Items', value: `${itemsNeedingRestock.filter(i => i.isCritical).length}`, color: 'rose' },
        { label: 'Estimated Restock Budget', value: `₹${totalEstimatedCost.toLocaleString('en-IN')}`, color: 'amber' }
      ],
      table: {
        headers: ['Sr.No.', 'Product Name', 'Category', 'Current Stock', 'Min Alert', 'Order Qty', 'Unit Price (₹)', 'Est. Total (₹)'],
        alignments: ['center', 'left', 'center', 'right', 'right', 'right', 'right', 'right'] as ('center' | 'left' | 'center' | 'right' | 'right' | 'right' | 'right' | 'right')[],
        rows: itemsNeedingRestock.length > 0 ? itemsNeedingRestock.map((it, idx) => [
          idx + 1,
          getDisplayName(it),
          it.category,
          `${it.stock_quantity} ${it.unit}`,
          `${it.min_stock_alert} ${it.unit}`,
          `${it.recommendedOrderQty} ${it.unit}`,
          `₹${it.purchase_price}`,
          `₹${it.estimatedCost.toLocaleString('en-IN')}`
        ]) : [
          [1, 'All products are sufficiently stocked (Safe inventory)', '—', '—', '—', '—', '—', '₹0']
        ],
        summaryRow: [
          'Total',
          `${itemsNeedingRestock.length} ${'Products'}`,
          '',
          '',
          '',
          '',
          '',
          `₹${totalEstimatedCost.toLocaleString('en-IN')}`
        ]
      },
      notes: itemsNeedingRestock.length > 0 
        ? ('Please issue purchase orders for these items to suppliers promptly.')
        : ('All dairy inventory is currently at safe stock levels. No immediate procurement needed.')
    };
  };

  const handleViewReorderPDF = () => {
    viewReportPDF(getReorderPayload());
  };

  const handlePrintReorderPDF = () => {
    printReport(getReorderPayload());
  };

  const handleDownloadReorderPDF = () => {
    downloadReportPDF(getReorderPayload());
  };

  return (
    <div className="space-y-3 max-w-5xl mx-auto pb-28 lg:pb-8">

      {/* 1. Compact Header + Overflow Export Sheet */}
      <CompactPageHeader
        icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        title={t('reorderTitle')}
        subtitle={t('reorderDesc')}
        primaryAction={{
          label: 'Purchase',
          icon: <Truck className="w-4 h-4" />,
          onClick: () => setActiveView('purchases'),
          ariaLabel: 'Record Purchase',
        }}
        moreTitle={'Reorder Actions'}
        moreActions={[
          {
            id: 'whatsapp-copy',
            label: copied ? t('orderCopied') : t('copyWhatsAppOrder'),
            description: 'Copy restock list for WhatsApp',
            icon: copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
            onClick: handleCopyWhatsAppList,
          },
          {
            id: 'view-pdf',
            label: 'View Order PDF',
            description: 'Preview reorder sheet',
            icon: <Eye className="w-4 h-4 text-amber-500" />,
            onClick: handleViewReorderPDF,
          },
          {
            id: 'print',
            label: 'Print Order Sheet',
            description: 'Send order sheet to printer',
            icon: <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />,
            onClick: handlePrintReorderPDF,
          },
          {
            id: 'download-pdf',
            label: 'Download PDF',
            description: 'Save reorder PDF sheet',
            icon: <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
            onClick: handleDownloadReorderPDF,
          },
        ]}
      />

      {/* 2. Slim 2-Stat Summary Strip */}
      <CompactStatStrip
        columns={2}
        items={[
          {
            label: 'Low / Out of Stock',
            value: `${itemsNeedingRestock.length}`,
            sublabel: `${itemsNeedingRestock.filter(i => i.isCritical).length} ${'empty'}`,
            tone: 'rose',
          },
          {
            label: 'Estimated Budget',
            value: `₹${totalEstimatedCost.toLocaleString('en-IN')}`,
            sublabel: 'Wholesale rate',
            tone: 'amber',
          },
        ]}
      />

      {/* Pending Supplier Refund Recovery Alert Banner */}
      {metrics.pendingSupplierRefundAmount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {'💰 Pending Supplier Refund: '}
                <span className="text-rose-600 dark:text-rose-400">₹{metrics.pendingSupplierRefundAmount.toLocaleString('en-IN')}</span>
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-[#8FA69C]">
                {'Refund is pending for damaged/expired stock from previous deliveries. Deduct this amount from your next supplier bill!'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveView('returns')}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 shadow-xs transition active:scale-95"
          >
            {'View Refund Ledger'}
          </button>
        </div>
      )}

      {/* Procurement Items Table */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>
              {"Today's Restock Order Sheet"}
            </span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {'Products below minimum alert threshold'}
          </span>
        </div>

        {itemsNeedingRestock.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3 text-center">{t('currentStockCol')}</th>
                  <th className="px-3 py-3 text-center">{'Min Alert'}</th>
                  <th className="px-3 py-3 text-center">{t('recommendedOrderQty')}</th>
                  <th className="px-3 py-3 text-right">{t('costPriceCol')}</th>
                  <th className="px-3 py-3 text-right">{'Est Cost'}</th>
                  <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {itemsNeedingRestock.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{getDisplayName(item)}</span>
                        {item.isFastMover && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                            🔥 {'Fast Mover'}
                          </span>
                        )}
                        {item.hasNearExpiryBatch && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            ⚠️ {'Sell batch first'}
                          </span>
                        )}
                        {item.totalReturned > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            ↩️ {item.totalReturned} {item.unit} {'returned'}
                          </span>
                        )}
                        {item.vendorReturnedQty > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" title={'Damaged/expired stock received from supplier!'}>
                            🚚 {'Supplier Defect'} ({item.vendorReturnedQty} {item.unit})
                          </span>
                        )}
                      </div>
                      {getDisplayName(item) !== item.name && (
                        <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">{item.name}</div>
                      )}
                    </td>

                    <td className="px-3 py-3 font-semibold text-slate-600 dark:text-[#8FA69C]">
                      {item.category}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${item.isCritical ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                        }`}>
                        {item.stock_quantity} {item.unit}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center font-bold text-slate-500 dark:text-[#8FA69C]">
                      {item.min_stock_alert} {item.unit}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200 dark:border-emerald-800/60">
                        +{item.recommendedOrderQty} {item.unit}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-medium text-slate-600 dark:text-[#8FA69C]">
                      ₹{item.purchase_price}
                    </td>

                    <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">
                      ₹{item.estimatedCost.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setActiveView('purchases')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs"
                      >
                        + {'Buy Stock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              {'All dairy items are well stocked!'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C] max-w-sm mx-auto">
              {'Fresh milk, paneer, curd, ghee, and sweets are available in sufficient quantities.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
