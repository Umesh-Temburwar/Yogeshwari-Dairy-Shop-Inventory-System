import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { DamageReason } from '../../types';
import { 
  PackageX, 
  Plus, 
  X
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
    { id: 'Other', label: language === 'mr' ? 'इतर कारण' : 'Other' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PackageX className="w-6 h-6 text-rose-600" />
            <span>{t('damageTitle')}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {language === 'mr' 
              ? 'नासलेले दूध, लिकेज, मुदत संपलेली उत्पादने व आर्थिक नुकसानीचा हिशोब' 
              : 'फटा दूध, पाउच लीकेज, दही की एक्सपायरी व नुकसान का वित्तीय हिसाब'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('logDamage')}</span>
        </button>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">
            {language === 'mr' ? 'एकूण झालेले नुकसान (Financial Loss)' : 'कुल डैमेज नुकसान (Financial Loss)'}
          </span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">
            ₹{metrics.totalDamagesLoss.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {language === 'mr' ? 'थेट नफ्यामधून वजा केलेले नुकसान' : 'सीधे लाभ (Net Profit) में से घटाया गया नुकसान'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">
            {language === 'mr' ? 'नुकसान घटना (Incidents)' : 'डैमेज घटनाएं (Total Incidents)'}
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {filteredDamages.length} {language === 'mr' ? 'वेळा' : 'बार'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {language === 'mr' ? 'कालावधीतील एकूण नासाडी नोंदी' : 'चुनी गई अवधि में दर्ज कुल खराबी'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">
            {language === 'mr' ? 'खरेदीवर नासाडीचे प्रमाण' : 'खरीद पर खराबी का प्रतिशत'}
          </span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            {((metrics.totalDamagesLoss / (metrics.totalPurchasesAmount || 1)) * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            (1% ते 2% सामान्य मानले जाते)
          </span>
        </div>
      </div>

      {/* Damage History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            {language === 'mr' ? 'खराब / नासलेला माल नोंद वही' : 'खराब / डैमेज माल हिस्ट्री'}
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {filteredDamages.length} {language === 'mr' ? 'नोंदी' : 'रिकॉर्ड'}
          </span>
        </div>

        {filteredDamages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">{language === 'mr' ? 'तारीख' : 'दिनांक'}</th>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'खराब प्रमाण' : 'खराब मात्रा'}</th>
                  <th className="px-3 py-3">{language === 'mr' ? 'नासाडीचे कारण' : 'खराबी का कारण'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'अंदाजे नुकसान' : 'अनुमानित नुकसान'}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'तपशील / शेरा' : 'विवरण / नोट्स'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDamages.map((dmg) => (
                  <tr key={dmg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      {dmg.damage_date}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{dmg.product_name}</div>
                    </td>

                    <td className="px-3 py-3 text-center font-black text-rose-700">
                      {dmg.quantity} {dmg.unit}
                    </td>

                    <td className="px-3 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                        {dmg.reason}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-black text-rose-600">
                      -₹{dmg.estimated_loss_amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-slate-500 italic max-w-sm truncate">
                      {dmg.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            {language === 'mr' ? 'या कालावधीत कोणताही माल खराब झालेला नाही.' : 'इस अवधि में कोई डैमेज माल दर्ज नहीं है।'}
          </div>
        )}
      </div>

      {/* LOG DAMAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
                  <PackageX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {language === 'mr' ? 'खराब / नासलेला माल नोंदवा' : 'खराब / डैमेज माल दर्ज करें'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'mr' ? 'शिल्लक साठ्यामधून प्रमाण आपोआप कमी होईल' : 'स्टॉक से मात्रा अपने आप घट जाएगी'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'mr' ? 'कोणता माल खराब झाला?' : 'कौनसा माल खराब हुआ?'} *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'mr' ? `खराब प्रमाण (${selectedProduct?.unit}) *` : `खराब मात्रा (${selectedProduct?.unit}) *`}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="2.5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'mr' ? 'नासाडीचे कारण *' : 'खराबी का कारण *'}
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as DamageReason)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {reasonsList.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated Loss preview */}
              <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 flex justify-between items-center text-xs font-bold text-rose-950">
                <span>{language === 'mr' ? 'अंदाजे आर्थिक नुकसान (Loss):' : 'अनुमानित वित्तीय नुकसान:'}</span>
                <span className="text-base font-black text-rose-700">
                  ₹{estimatedLoss.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'mr' ? 'तपशील किंवा शेरा' : 'विस्तार से कारण या नोट्स'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'mr' ? 'उदा. दुपारी वीज गेल्यामुळे २.५ लिटर दूध नासले (पनीर/छान्यामध्ये वापरले)' : 'उदा. दोपहर में लाइट जाने के कारण दूध फट गया'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
                >
                  {t('save')} &amp; {language === 'mr' ? 'साठा वजा करा' : 'स्टॉक घटाएं'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
