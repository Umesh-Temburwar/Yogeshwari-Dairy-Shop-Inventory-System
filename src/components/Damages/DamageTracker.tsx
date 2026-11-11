import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { DamageReason } from '../../types';
import { exportReportToPDF } from '../../lib/exportUtils';
import {
  PackageX,
  Plus,
  X,
  FileText
} from 'lucide-react';

export const DamageTracker: React.FC = () => {
  const { products, filteredDamages, recordDamage, metrics } = useStore();
  const { t, language } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<DamageReason>('Doodh Fat Gya (Curdled)');
  const [notes, setNotes] = useState('');

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

  const handleDownloadDamagePDF = () => {
    const totalLoss = filteredDamages.reduce((acc, d) => acc + d.estimated_loss_amount, 0);
    const curdledCount = filteredDamages.filter(d => d.reason.includes('Curdled') || d.reason.includes('Fat Gya')).length;
    const leakedCount = filteredDamages.filter(d => d.reason.includes('Leaked') || d.reason.includes('Phat Gayi')).length;
    const expiredCount = filteredDamages.filter(d => d.reason.includes('Expiry')).length;

    exportReportToPDF({
      title: language === 'mr' ? 'दूध नासणे व नुकसान अहवाल (Damages & Spoilage)' : language === 'hi' ? 'दूध खराबी व नुकसान रिपोर्ट (Damages & Spoilage)' : 'Dairy Damages, Spoilage & Loss Report',
      subtitle: 'Yogeshwari Dairy Farm & Sweets ERP — Quality & Spoilage Ledger',
      periodText: language === 'mr' ? 'निवडलेला नुकसान कालावधी' : 'चुनी गई नुकसान अवधि',
      kpis: [
        { label: 'एकूण नुकसान रक्कम (Loss)', value: `₹${totalLoss.toLocaleString('en-IN')}`, color: 'rose' },
        { label: 'एकूण नुकसान नोंदी', value: `${filteredDamages.length} घटना`, color: 'amber' },
        { label: 'नासलेले दूध नोंदी', value: `${curdledCount} वेळा`, color: 'purple' },
        { label: 'लिकेज / एक्सपायरी', value: `${leakedCount + expiredCount} वेळा`, color: 'blue' }
      ],
      table: {
        headers: ['तारीख', 'उत्पादनाचे नाव (Product)', 'नुकसान प्रमाण (Qty)', 'नुकसानीचे कारण (Reason)', 'अंदाजे नुकसान मूल्य (₹)', 'तपशील / नोंद'],
        alignments: ['center', 'left', 'right', 'left', 'right', 'left'],
        rows: filteredDamages.map(d => [
          d.damage_date,
          d.product_name,
          `${d.quantity} ${d.unit}`,
          d.reason,
          `₹${d.estimated_loss_amount.toLocaleString('en-IN')}`,
          d.notes || '—'
        ]),
        summaryRow: [
          'एकूण (Total)',
          `${filteredDamages.length} नोंदी`,
          '',
          '',
          `₹${totalLoss.toLocaleString('en-IN')}`,
          ''
        ]
      },
      notes: 'नासलेल्या दुधाचे कारण शोधून शीतकरण (Chilling) व हाताळणी (Handling) सुधारावी.'
    });
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131F1B] p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <PackageX className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <span>{t('damageTitle')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr'
              ? 'नासलेले दूध, लिकेज, मुदत संपलेली उत्पादने व आर्थिक नुकसानीचा हिशोब'
              : language === 'hi'
                ? 'फटा दूध, पाउच लीकेज, दही की एक्सपायरी व नुकसान का वित्तीय हिसाब'
                : 'Curdled milk, packet leakage, expired goods, and financial loss tracking'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadDamagePDF}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 text-xs font-bold transition-all"
            title="Download Spoilage & Loss PDF Report"
          >
            <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{language === 'mr' ? 'नुकसान PDF' : language === 'hi' ? 'नुकसान PDF' : 'Damages PDF'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('logDamage')}</span>
          </button>
        </div>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {language === 'mr' ? 'एकूण झालेले नुकसान (Financial Loss)' : language === 'hi' ? 'कुल डैमेज नुकसान (Financial Loss)' : 'Total Spoilage Loss'}
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
            ₹{metrics.totalDamagesLoss.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {language === 'mr' ? 'थेट नफ्यामधून वजा केलेले नुकसान' : language === 'hi' ? 'सीधे लाभ (Net Profit) में से घटाया गया नुकसान' : 'Directly deducted from net profit'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {language === 'mr' ? 'नुकसान घटना (Incidents)' : language === 'hi' ? 'डैमेज घटनाएं (Total Incidents)' : 'Damage Incidents'}
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {filteredDamages.length} {language === 'mr' ? 'वेळा' : language === 'hi' ? 'बार' : 'times'}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {language === 'mr' ? 'कालावधीतील एकूण नासाडी नोंदी' : language === 'hi' ? 'चुनी गई अवधि में दर्ज कुल खराबी' : 'Total recorded spoilage incidents'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {language === 'mr' ? 'खरेदीवर नासाडीचे प्रमाण' : language === 'hi' ? 'खरीद पर खराबी का प्रतिशत' : 'Spoilage % on Purchases'}
          </span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 block">
            {((metrics.totalDamagesLoss / (metrics.totalPurchasesAmount || 1)) * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {language === 'mr' ? '(1% ते 2% सामान्य मानले जाते)' : language === 'hi' ? '(1% से 2% सामान्य माना जाता है)' : '(1% to 2% is industry normal)'}
          </span>
        </div>
      </div>

      {/* Damage History Table */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {language === 'mr' ? 'खराब / नासलेला माल नोंद वही' : language === 'hi' ? 'खराब / डैमेज माल हिस्ट्री' : 'Damages & Spoilage Log'}
          </h3>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {filteredDamages.length} {language === 'mr' ? 'नोंदी' : language === 'hi' ? 'रिकॉर्ड' : 'records'}
          </span>
        </div>

        {filteredDamages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">{language === 'mr' ? 'तारीख' : language === 'hi' ? 'दिनांक' : 'Date'}</th>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'खराब प्रमाण' : language === 'hi' ? 'खराब मात्रा' : 'Damaged Qty'}</th>
                  <th className="px-3 py-3">{language === 'mr' ? 'नासाडीचे कारण' : language === 'hi' ? 'खराबी का कारण' : 'Reason'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'अंदाजे नुकसान' : language === 'hi' ? 'अनुमानित नुकसान' : 'Est. Loss'}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'तपशील / शेरा' : language === 'hi' ? 'विवरण / नोट्स' : 'Notes / Remarks'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {filteredDamages.map((dmg) => (
                  <tr key={dmg.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-[#8FA69C] whitespace-nowrap">
                      {dmg.damage_date}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{dmg.product_name}</div>
                    </td>

                    <td className="px-3 py-3 text-center font-black text-rose-700 dark:text-rose-400">
                      {dmg.quantity} {dmg.unit}
                    </td>

                    <td className="px-3 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-transparent dark:border-amber-800/40">
                        {dmg.reason}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-black text-rose-600 dark:text-rose-400">
                      -₹{dmg.estimated_loss_amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-slate-500 dark:text-[#8FA69C] italic max-w-sm truncate">
                      {dmg.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 dark:text-[#8FA69C] text-xs">
            {language === 'mr' ? 'या कालावधीत कोणताही माल खराब झालेला नाही.' : language === 'hi' ? 'इस अवधि में कोई डैमेज माल दर्ज नहीं है।' : 'No damaged goods recorded for this period.'}
          </div>
        )}
      </div>

      {/* LOG DAMAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-transparent dark:border-[#24352F]">

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                  <PackageX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {language === 'mr' ? 'खराब / नासलेला माल नोंदवा' : language === 'hi' ? 'खराब / डैमेज माल दर्ज करें' : 'Record Damaged / Spoiled Stock'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                    {language === 'mr' ? 'शिल्लक साठ्यामधून प्रमाण आपोआप कमी होईल' : language === 'hi' ? 'स्टॉक से मात्रा अपने आप घट जाएगी' : 'Quantity will automatically be deducted from inventory'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'कोणता माल खराब झाला?' : language === 'hi' ? 'कौनसा माल खराब हुआ?' : 'Select Damaged Item'} *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? `खराब प्रमाण (${selectedProduct?.unit}) *` : language === 'hi' ? `खराब मात्रा (${selectedProduct?.unit}) *` : `Damaged Quantity (${selectedProduct?.unit}) *`}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="2.5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'नासाडीचे कारण *' : language === 'hi' ? 'खराबी का कारण *' : 'Reason for Spoilage *'}
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as DamageReason)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {reasonsList.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated Loss preview */}
              <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 flex justify-between items-center text-xs font-bold text-rose-950 dark:text-rose-300">
                <span>{language === 'mr' ? 'अंदाजे आर्थिक नुकसान (Loss):' : language === 'hi' ? 'अनुमानित वित्तीय नुकसान:' : 'Estimated Financial Loss:'}</span>
                <span className="text-base font-black text-rose-700 dark:text-rose-400">
                  ₹{estimatedLoss.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'तपशील किंवा शेरा' : language === 'hi' ? 'विस्तार से कारण या नोट्स' : 'Detailed Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'mr' ? 'उदा. दुपारी वीज गेल्यामुळे २.५ लिटर दूध नासले (पनीर/छान्यामध्ये वापरले)' : language === 'hi' ? 'उदा. दोपहर में लाइट जाने के कारण दूध फट गया' : 'e.g. Electricity Bill outage caused 2.5L curdling'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] font-semibold text-xs text-slate-700 dark:text-[#8FA69C]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
                >
                  {t('save')} &amp; {language === 'mr' ? 'साठा वजा करा' : language === 'hi' ? 'स्टॉक घटाएं' : 'Deduct Stock'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
