import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { DamageReason } from '../../types';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import {
  PackageX,
  Plus,
  Printer,
  Download,
  Truck,
  Eye
} from 'lucide-react';
import { SupplierReturnModal } from '../Returns/SupplierReturnModal';
import { SupplierReturnReason } from '../../types';
import { Card, KpiCard, Button, Input, Badge, StatusBadge, Modal } from '../ui';

export const DamageTracker: React.FC = () => {
  const { products, filteredDamages, recordDamage, metrics } = useStore();
  const { t, language } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<DamageReason>('Doodh Fat Gya (Curdled)');
  const [notes, setNotes] = useState('');

  const [isSupplierReturnOpen, setIsSupplierReturnOpen] = useState(false);
  const [selectedDmgForReturn, setSelectedDmgForReturn] = useState<{
    productId?: string;
    quantity?: number;
    reason?: SupplierReturnReason;
  }>({});

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const estimatedLoss = (parseFloat(quantity) || 0) * (selectedProduct?.purchase_price || 0);

  const getProductDisplayName = (prod: any) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || parseFloat(quantity) <= 0) return;

    const qty = parseFloat(quantity);
    const loss = qty * selectedProduct.purchase_price;

    await recordDamage({
      product_id: selectedProduct.id,
      product_name: getProductDisplayName(selectedProduct),
      quantity: qty,
      unit: selectedProduct.unit,
      estimated_loss_amount: loss,
      reason,
      damage_date: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined
    });

    setIsModalOpen(false);
    setQuantity('');
    setNotes('');
  };

  const reasonsList: Array<{ id: DamageReason; label: string }> = [
    { id: 'Doodh Fat Gya (Curdled)', label: t('curdledMilk') },
    { id: 'Theli Phat Gayi (Leaked)', label: t('leakedPouch') },
    { id: 'Expiry Date Over', label: t('expiredProduct') },
    { id: 'Handling Spoilage', label: t('handlingSpoilage') },
    { id: 'Other', label: language === 'mr' ? 'इतर कारण' : language === 'hi' ? 'अन्य कारण' : 'Other' }
  ];

  const getDamageReportPayload = () => {
    const totalLoss = filteredDamages.reduce((acc, d) => acc + d.estimated_loss_amount, 0);
    const curdledCount = filteredDamages.filter(d => d.reason.includes('Curdled') || d.reason.includes('Fat Gya')).length;
    const leakedCount = filteredDamages.filter(d => d.reason.includes('Leaked') || d.reason.includes('Phat Gayi')).length;
    const expiredCount = filteredDamages.filter(d => d.reason.includes('Expiry')).length;

    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'दूध नासणे व नुकसान अहवाल' : isHi ? 'दूध खराबी व नुकसान रिपोर्ट' : 'Dairy Damages, Spoilage & Loss Audit Report',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'निवडलेला नुकसान कालावधी' : isHi ? 'चुनी गई नुकसान अवधि' : 'Selected Spoilage & Loss Period',
      language,
      kpis: [
        { label: isMr ? 'एकूण नुकसान रक्कम' : isHi ? 'कुल नुकसान राशि' : 'Total Spoilage Loss', value: `₹${totalLoss.toLocaleString('en-IN')}`, color: 'rose' },
        { label: isMr ? 'एकूण नुकसान नोंदी' : isHi ? 'कुल नुकसान प्रविष्टियां' : 'Damage Incidents', value: `${filteredDamages.length}`, color: 'amber' },
        { label: isMr ? 'नासलेले दूध नोंदी' : isHi ? 'फटा दूध प्रविष्टियां' : 'Curdled Milk Entries', value: `${curdledCount}`, color: 'purple' },
        { label: isMr ? 'लिकेज / एक्सपायरी' : isHi ? 'लीकेज / एक्सपायरी' : 'Leakage / Expiry', value: `${leakedCount + expiredCount}`, color: 'blue' }
      ],
      table: {
        headers: isMr
          ? ['तारीख', 'उत्पादनाचे नाव', 'नुकसान प्रमाण', 'नुकसानीचे कारण', 'अंदाजे नुकसान मूल्य (₹)', 'तपशील']
          : isHi
          ? ['दिनांक', 'सामान का नाम', 'नुकसान मात्रा', 'नुकसान का कारण', 'अनुमानित नुकसान मूल्य (₹)', 'विवरण']
          : ['Date', 'Product Name', 'Damaged Qty', 'Reason', 'Estimated Loss (₹)', 'Notes'],
        alignments: ['center', 'left', 'right', 'left', 'right', 'left'] as ('center' | 'left' | 'right' | 'left' | 'right' | 'left')[],
        rows: filteredDamages.map(d => [
          d.damage_date,
          d.product_name,
          `${d.quantity} ${d.unit}`,
          d.reason,
          `₹${d.estimated_loss_amount.toLocaleString('en-IN')}`,
          d.notes || '—'
        ]),
        summaryRow: [
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          `${filteredDamages.length} ${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'Incidents'}`,
          '',
          '',
          `₹${totalLoss.toLocaleString('en-IN')}`,
          ''
        ]
      },
      notes: isMr 
        ? 'नासलेल्या दुधाचे कारण शोधून शीतकरण व हाताळणी सुधारावी.'
        : isHi
        ? 'दूध खराबी का कारण जांचकर चिलिंग व रखरखाव में सुधार करें।'
        : 'Quality audit report. Investigate cold-chain breaks, chiller calibration, and transit handling to minimize curdling and leakages.'
    };
  };

  const handleViewDamagePDF = () => {
    viewReportPDF(getDamageReportPayload());
  };

  const handlePrintDamagePDF = () => {
    printReport(getDamageReportPayload());
  };

  const handleDownloadDamagePDF = () => {
    downloadReportPDF(getDamageReportPayload());
  };

  return (
    <div className="space-y-5">

      {/* Header Banner */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <PackageX className="w-5 h-5 text-danger" />
            <span>{t('damageTitle')}</span>
          </h2>
          <p className="text-xs text-ink-3 font-medium mt-1">
            {language === 'mr'
              ? 'नासलेले दूध, लिकेज, मुदत संपलेली उत्पादने व आर्थिक नुकसानीचा हिशोब'
              : language === 'hi'
                ? 'फटा दूध, पाउच लीकेज, दही की एक्सपायरी व नुकसान का वित्तीय हिसाब'
                : 'Curdled milk, packet leakage, expired goods, and financial loss tracking'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewDamagePDF}
            leftIcon={<Eye className="w-4 h-4" />}
            title="View Spoilage & Loss Report PDF"
          >
            {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintDamagePDF}
            leftIcon={<Printer className="w-4 h-4" />}
            title="Print Spoilage & Loss Report"
          >
            {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadDamagePDF}
            leftIcon={<Download className="w-4 h-4" />}
            title="Download Spoilage & Loss PDF Report"
          >
            PDF
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t('logDamage')}
          </Button>
        </div>
      </Card>

      {/* Time Filter */}
      <PeriodFilter />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label={language === 'mr' ? 'झालेले नुकसान' : language === 'hi' ? 'कुल नुकसान' : 'Total Spoilage Loss'}
          value={`₹${metrics.totalDamagesLoss.toLocaleString('en-IN')}`}
          delta={language === 'mr' ? 'नफ्यामधून वजा' : language === 'hi' ? 'लाभ में से घटाया' : 'Deducted from profit'}
          deltaType="danger"
          icon={<PackageX className="w-4 h-4 text-danger" />}
        />

        <KpiCard
          label={language === 'mr' ? 'नुकसान घटना' : language === 'hi' ? 'डैमेज घटनाएं' : 'Damage Incidents'}
          value={`${filteredDamages.length} ${language === 'mr' ? 'वेळा' : language === 'hi' ? 'बार' : 'times'}`}
          delta={language === 'mr' ? 'नासाडी नोंदी' : language === 'hi' ? 'खराबी रिकॉर्ड' : 'Recorded incidents'}
          deltaType="neutral"
        />

        <KpiCard
          label={language === 'mr' ? 'खरेदीवर नासाडीचे प्रमाण' : language === 'hi' ? 'खरीद पर खराबी' : 'Spoilage %'}
          value={`${((metrics.totalDamagesLoss / (metrics.totalPurchasesAmount || 1)) * 100).toFixed(1)}%`}
          delta={language === 'mr' ? '1% ते 2% सामान्य' : language === 'hi' ? '1% - 2% सामान्य' : '1-2% industry normal'}
          deltaType="warn"
        />
      </div>

      {/* Damage History Table */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="font-semibold text-ink text-sm">
            {language === 'mr' ? 'खराब / नासलेला माल नोंद वही' : language === 'hi' ? 'खराब / डैमेज माल हिस्ट्री' : 'Damages & Spoilage Log'}
          </h3>
          <span className="text-xs text-ink-3 font-medium">
            {filteredDamages.length} {language === 'mr' ? 'नोंदी' : language === 'hi' ? 'रिकॉर्ड' : 'records'}
          </span>
        </div>

        {filteredDamages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-line text-ink-3 font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">{language === 'mr' ? 'तारीख' : language === 'hi' ? 'दिनांक' : 'Date'}</th>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'खराब प्रमाण' : language === 'hi' ? 'खराब मात्रा' : 'Damaged Qty'}</th>
                  <th className="px-3 py-3">{language === 'mr' ? 'नासाडीचे कारण' : language === 'hi' ? 'कारण' : 'Reason'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'अंदाजे नुकसान' : language === 'hi' ? 'नुकसान' : 'Est. Loss'}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'शेरा' : language === 'hi' ? 'नोट्स' : 'Notes'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'रिफंड' : 'रिफंड'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredDamages.map((dmg) => (
                  <tr key={dmg.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink-2 whitespace-nowrap">
                      {dmg.damage_date}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{dmg.product_name}</div>
                    </td>

                    <td className="px-3 py-3 text-center font-semibold text-danger tabular-nums">
                      {dmg.quantity} {dmg.unit}
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadge status="warn" className="text-[11px]">
                        {dmg.reason}
                      </StatusBadge>
                    </td>

                    <td className="px-3 py-3 text-right font-medium text-danger tabular-nums">
                      -₹{dmg.estimated_loss_amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-ink-3 italic max-w-sm truncate">
                      {dmg.notes || '-'}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          let mappedReason: SupplierReturnReason = 'Other';
                          if (dmg.reason.includes('Curdled') || dmg.reason.includes('Fat Gya')) {
                            mappedReason = 'Curdled / Spoiled Milk';
                          } else if (dmg.reason.includes('Leaked') || dmg.reason.includes('Phat Gayi')) {
                            mappedReason = 'Damaged / Leaked on Delivery';
                          } else if (dmg.reason.includes('Expiry')) {
                            mappedReason = 'Expired on Delivery';
                          } else if (dmg.reason.includes('Spoilage')) {
                            mappedReason = 'Poor Quality / Bad Taste';
                          }

                          setSelectedDmgForReturn({
                            productId: dmg.product_id,
                            quantity: dmg.quantity,
                            reason: mappedReason
                          });
                          setIsSupplierReturnOpen(true);
                        }}
                        className="h-7 px-2 text-ok hover:bg-ok/10 text-xs ml-auto"
                        title="सप्लायरला परत पाठवून रिफंड मागा"
                      >
                        <Truck className="w-3 h-3 mr-1" />
                        <span>{language === 'mr' ? 'रिफंड' : 'रिफंड'}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-ink-3 text-xs">
            {language === 'mr' ? 'या कालावधीत कोणताही माल खराब झालेला नाही.' : language === 'hi' ? 'इस अवधि में कोई डैमेज माल दर्ज नहीं है।' : 'No damaged goods recorded for this period.'}
          </div>
        )}
      </Card>

      {/* LOG DAMAGE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={language === 'mr' ? 'खराब / नासलेला माल नोंदवा' : language === 'hi' ? 'खराब / डैमेज माल दर्ज करें' : 'Record Damaged / Spoiled Stock'}
        description={language === 'mr' ? 'शिल्लक साठ्यामधून प्रमाण आपोआप कमी होईल' : language === 'hi' ? 'स्टॉक से मात्रा अपने आप घट जाएगी' : 'Quantity will automatically be deducted from inventory'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'कोणता माल खराब झाला?' : language === 'hi' ? 'कौनसा माल खराब हुआ?' : 'Select Damaged Item'} *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {getProductDisplayName(p)} ({p.name}) - Stock: {p.stock_quantity} {p.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? `खराब प्रमाण (${selectedProduct?.unit}) *` : language === 'hi' ? `खराब मात्रा (${selectedProduct?.unit}) *` : `Qty (${selectedProduct?.unit}) *`}
              </label>
              <Input
                type="number"
                step="0.1"
                required
                placeholder="2.5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'नासाडीचे कारण *' : language === 'hi' ? 'खराबी का कारण *' : 'Reason *'}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as DamageReason)}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                {reasonsList.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated Loss preview */}
          <div className="bg-surface-2 p-3.5 rounded-xl border border-line flex justify-between items-center text-xs font-medium text-ink">
            <span>{language === 'mr' ? 'अंदाजे आर्थिक नुकसान (Loss):' : language === 'hi' ? 'अनुमानित वित्तीय नुकसान:' : 'Estimated Financial Loss:'}</span>
            <span className="text-base font-semibold text-danger tabular-nums">
              ₹{estimatedLoss.toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'तपशील किंवा शेरा' : language === 'hi' ? 'विस्तार से कारण या नोट्स' : 'Detailed Notes / Remarks'}
            </label>
            <textarea
              rows={2}
              placeholder={language === 'mr' ? 'उदा. दुपारी वीज गेल्यामुळे २.५ लिटर दूध नासले' : language === 'hi' ? 'उदा. दोपहर में लाइट जाने के कारण दूध फट गया' : 'e.g. Electricity outage caused 2.5L curdling'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-line bg-surface text-ink placeholder:text-ink-3 text-xs shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="w-1/2"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="danger"
              className="w-1/2"
            >
              {t('save')} &amp; {language === 'mr' ? 'साठा वजा करा' : language === 'hi' ? 'स्टॉक घटाएं' : 'Deduct Stock'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* SUPPLIER RETURN MODAL */}
      {isSupplierReturnOpen && (
        <SupplierReturnModal
          onClose={() => setIsSupplierReturnOpen(false)}
          prefillProductId={selectedDmgForReturn.productId}
          prefillQuantity={selectedDmgForReturn.quantity}
          prefillReason={selectedDmgForReturn.reason}
        />
      )}

    </div>
  );
};

export default DamageTracker;
