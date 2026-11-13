import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Calculator, Check } from 'lucide-react';
import { Modal, Button, Input, SegmentedControl } from '../ui';

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
  const { language, t } = useLanguage();

  const [milkType, setMilkType] = useState<'buffalo' | 'cow'>('buffalo');
  const [liters, setLiters] = useState<string>('50');
  const [fat, setFat] = useState<string>('7.0');
  const [clr, setClr] = useState<string>('29'); // Lactometer reading
  const [ratePerFatPoint, setRatePerFatPoint] = useState<string>('8.50'); // e.g. ₹8.50 per point of fat

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
        ? (language === 'mr' ? 'म्हैस दूध' : language === 'hi' ? 'भैंस दूध' : 'Buffalo Milk') 
        : (language === 'mr' ? 'गाय दूध' : language === 'hi' ? 'गाय दूध' : 'Cow Milk');
      const note = `${typeLabel} - Fat: ${numFat}%, CLR: ${numClr}, SNF: ${calculatedSNF}%`;
      onApplyRate(ratePerLiter, numLiters, note);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'mr' ? 'दूध फॅट & SNF दर कॅल्क्युलेटर' : language === 'hi' ? 'दूध फैट & SNF रेट कैलकुलेटर' : 'Milk Fat & SNF Rate Calculator'}
      description={language === 'mr' ? 'शेतकऱ्यांना देण्यासाठी दुधाचा अचूक भाव' : language === 'hi' ? 'डेरी टेस्टिंग व दूध भाव निर्धारण' : 'Accurate milk purchase rate testing for dairy farmers'}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            leftIcon={<Check className="w-4 h-4" />}
          >
            {language === 'mr' ? 'हा दर फॉर्मवर भरा' : language === 'hi' ? 'यह भाव लगाएं' : 'Apply Rate'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">
        {/* Buffalo / Cow selector */}
        <SegmentedControl
          className="w-full justify-center grid grid-cols-2"
          options={[
            { value: 'buffalo', label: language === 'mr' ? 'म्हैस दूध (Buffalo)' : language === 'hi' ? 'भैंस दूध (Buffalo)' : 'Buffalo Milk' },
            { value: 'cow', label: language === 'mr' ? 'गाय दूध (Cow)' : language === 'hi' ? 'गाय दूध (Cow)' : 'Cow Milk' },
          ]}
          value={milkType}
          onChange={(val) => {
            const type = val as 'buffalo' | 'cow';
            setMilkType(type);
            if (type === 'buffalo') {
              setFat('7.2');
              setClr('29');
              setRatePerFatPoint('8.30');
            } else {
              setFat('4.2');
              setClr('28');
              setRatePerFatPoint('11.00');
            }
          }}
        />

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'दूध प्रमाण (लिटर)' : language === 'hi' ? 'दूध मात्रा (लीटर)' : 'Milk Quantity (Litre)'}
            </label>
            <Input
              type="number"
              step="0.5"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
            />
          </div>

          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'फॅट % (Fat Testing)' : language === 'hi' ? 'फैट % (Fat Testing)' : 'Fat % (Fat Testing)'}
            </label>
            <Input
              type="number"
              step="0.1"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'लॅक्टोमीटर (CLR रीडिंग)' : language === 'hi' ? 'लैक्टोमीटर (CLR)' : 'Lactometer (CLR)'}
            </label>
            <Input
              type="number"
              step="0.5"
              value={clr}
              onChange={(e) => setClr(e.target.value)}
            />
          </div>

          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'प्रति फॅट दर (₹)' : language === 'hi' ? 'प्रति फैट दर (₹)' : 'Rate/Fat Point (₹)'}
            </label>
            <Input
              type="number"
              step="0.05"
              value={ratePerFatPoint}
              onChange={(e) => setRatePerFatPoint(e.target.value)}
            />
          </div>
        </div>

        {/* Calculation Result Card */}
        <div className="bg-surface-2 p-3.5 rounded-xl border border-line space-y-2">
          <div className="flex justify-between items-center text-xs text-ink-3">
            <span>{language === 'mr' ? 'एस.एन.एफ. (SNF):' : language === 'hi' ? 'एस.एन.एफ. (SNF):' : 'Calculated SNF:'}</span>
            <span className="font-medium text-ink">
              {calculatedSNF}% {calculatedSNF >= 8.5 ? '✅' : '⚠️'}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs text-ink-3">
            <span>{language === 'mr' ? 'प्रति लिटर खरेदी भाव:' : language === 'hi' ? 'प्रति लीटर खरीद दर:' : 'Rate per Litre:'}</span>
            <span className="text-sm font-semibold tabular-nums text-ink">
              ₹{ratePerLiter} / L
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-line text-ink font-semibold">
            <span className="text-xs">{language === 'mr' ? 'शेतकऱ्याला एकूण रक्कम:' : language === 'hi' ? 'कुल देय भुगतान:' : 'Total Payable:'}</span>
            <span className="text-lg font-semibold tabular-nums text-ink">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MilkFatCalculator;
