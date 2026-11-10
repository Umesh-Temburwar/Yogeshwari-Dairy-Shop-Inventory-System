import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Calculator, X, Sparkles, Check, ArrowRight } from 'lucide-react';

interface MilkFatCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRate?: (calculatedRate: number, liters: number, notes: string) => void;
}

export const MilkFatCalculator: React.FC<MilkFatCalculatorProps> = ({ 
  isOpen, 
  onClose, 
  onApplyRate 
}) => {
  const { language } = useLanguage();

  const [milkType, setMilkType] = useState<'buffalo' | 'cow'>('buffalo');
  const [liters, setLiters] = useState<string>('50');
  const [fat, setFat] = useState<string>('7.0');
  const [clr, setClr] = useState<string>('29'); // Lactometer reading
  const [ratePerFatPoint, setRatePerFatPoint] = useState<string>('8.50'); // e.g. ₹8.50 per point of fat

  if (!isOpen) return null;

  const numFat = parseFloat(fat) || 0;
  const numClr = parseFloat(clr) || 0;
  const numLiters = parseFloat(liters) || 0;
  const numRatePerPoint = parseFloat(ratePerFatPoint) || 0;

  // Richmond's formula: SNF = (CLR / 4) + (0.25 * Fat) + 0.35
  const calculatedSNF = Number(((numClr / 4) + (0.25 * numFat) + 0.35).toFixed(2));

  // Calculated rate per liter
  const ratePerLiter = Number((numFat * numRatePerPoint).toFixed(2));

  // Total payout
  const totalAmount = Number((ratePerLiter * numLiters).toFixed(2));

  const handleApply = () => {
    if (onApplyRate && ratePerLiter > 0) {
      const typeLabel = milkType === 'buffalo' 
        ? (language === 'mr' ? 'म्हैस दूध' : 'भैंस दूध') 
        : (language === 'mr' ? 'गाय दूध' : 'गाय दूध');
      const note = `${typeLabel} - Fat: ${numFat}%, CLR: ${numClr}, SNF: ${calculatedSNF}%`;
      onApplyRate(ratePerLiter, numLiters, note);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-800">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {language === 'mr' ? 'दूध फॅट & SNF दर कॅल्क्युलेटर' : language === 'hi' ? 'दूध फैट & SNF रेट कैलकुलेटर' : 'Milk Fat & SNF Rate Calculator'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'mr' ? 'शेतकऱ्यांना देण्यासाठी दुधाचा अचूक भाव' : 'डेरी टेस्टिंग व दूध भाव निर्धारण'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buffalo / Cow selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMilkType('buffalo');
              setFat('7.2');
              setClr('29');
              setRatePerFatPoint('8.30');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              milkType === 'buffalo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'mr' ? 'म्हैशीचे दूध (Buffalo)' : 'भैंस का दूध (Buffalo)'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMilkType('cow');
              setFat('4.2');
              setClr('28');
              setRatePerFatPoint('11.00');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              milkType === 'cow'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'mr' ? 'गाईचे दूध (Cow)' : 'गाय का दूध (Cow)'}
          </button>
        </div>

        {/* Inputs Grid */}
        <div className="space-y-3">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'mr' ? 'दूध प्रमाण (लिटर)' : 'दूध मात्रा (लीटर)'}
              </label>
              <input
                type="number"
                step="0.5"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'mr' ? 'फॅट % (Fat Testing)' : 'फैट % (Fat Testing)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-sky-900 focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                लॅक्टोमीटर (CLR रीडिंग)
              </label>
              <input
                type="number"
                step="0.5"
                value={clr}
                onChange={(e) => setClr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'mr' ? 'प्रति फॅट पॉईंट दर (₹)' : 'प्रति फैट पॉइंट दर (₹)'}
              </label>
              <input
                type="number"
                step="0.05"
                value={ratePerFatPoint}
                onChange={(e) => setRatePerFatPoint(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-sky-500 text-emerald-800"
              />
            </div>
          </div>

        </div>

        {/* Calculation Result Card */}
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 p-4 rounded-2xl border border-sky-200 space-y-2">
          
          <div className="flex justify-between items-center text-xs text-slate-600">
            <span>एस.एन.एफ. (Calculated SNF):</span>
            <span className="font-extrabold text-slate-800">{calculatedSNF}% {calculatedSNF >= 8.5 ? '✅ (उत्तम)' : '⚠️ (कमी)'}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-600">
            <span>{language === 'mr' ? 'प्रति लिटर खरेदी भाव:' : 'प्रति लीटर खरीद दर:'}</span>
            <span className="text-lg font-black text-sky-900">₹{ratePerLiter} / लिटर</span>
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-sky-200 text-slate-900 font-bold">
            <span className="text-xs">{language === 'mr' ? 'शेतकऱ्याला द्यावयाची एकूण रक्कम:' : 'किसान को कुल देय भुगतान:'}</span>
            <span className="text-2xl font-black text-emerald-700">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>

        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
          >
            {language === 'mr' ? 'रद्द' : 'बंद'}
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{language === 'mr' ? 'हा दर खरेदी फॉर्मवर भरा' : 'यह भाव खरीद फॉर्म पर लगाएं'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

